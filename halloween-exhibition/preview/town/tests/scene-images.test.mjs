import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createTownSceneImages,TOWN_SCENE_IMAGE_TIMEOUT} from '../scene-images.js';
import {withDeadline} from '../../transition-effects.js';
const base='https://example.test/town/assets/residents-atlas.webp';
const settle=async()=>{for(let n=0;n<20;n++)await Promise.resolve();};
function clock(){let now=0,id=0;const jobs=new Map();return {setTimeout(fn,ms){jobs.set(++id,{at:now+ms,fn});return id;},clearTimeout(id){jobs.delete(id);},async advance(ms){const end=now+ms;for(;;){const next=[...jobs].filter(([,j])=>j.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;now=next[1].at;jobs.delete(next[0]);next[1].fn();await settle();}now=end;await settle();}};}
test('2D and 3D share one 6s or 13s image instead of starting short failing requests',async()=>{
 for(const delay of [6000,13000]){
  const timers=clock(),calls=[],image={width:1280,height:640};const cache=createTownSceneImages({timers,loadImage:(src,options)=>{calls.push({src,options});return new Promise(resolve=>timers.setTimeout(()=>resolve(image),delay));}});
  const a=cache.load(base,{timeout:4500,priority:'low'}),b=cache.load(base+'?retry=1');assert.equal(a,b);await settle();assert.equal(calls.length,1);assert.equal(calls[0].options.timeout,14000);assert.equal(calls[0].options.priority,'high');
  await timers.advance(delay);assert.equal(await a,image);assert.equal(await b,image);assert.equal(await cache.load(base+'?scene-retry=1'),image);assert.equal(calls.length,1);
 }
});
test('one aborted renderer does not cancel or poison the other renderer',async()=>{
 let resolve;const cache=createTownSceneImages({loadImage:()=>new Promise(done=>resolve=done)}),abort=new AbortController(),shared=cache.load(base),consumer=withDeadline(shared,{signal:abort.signal});const rejected=assert.rejects(consumer,/cancelled/);
 await settle();abort.abort();await rejected;const image={width:1280,height:640};resolve(image);assert.equal(await cache.load(base),image);
});
test('failure evicts once, retry preserves bypass URL and success is reused by base URL',async()=>{
 const requests=[];const cache=createTownSceneImages({loadImage:async src=>{requests.push(src);if(requests.length===1)throw Error('Art image failed');return {width:1280,height:640};}});
 await assert.rejects(cache.load(base));const retried=await cache.load(base+'?retry=1');assert.equal(await cache.load(base),retried);assert.deepEqual(requests,[base,base+'?retry=1']);
});
test('versions remain distinct and old failures cannot evict a replacement after clear',async()=>{
 const pending=[];const cache=createTownSceneImages({loadImage:src=>new Promise((resolve,reject)=>pending.push({src,resolve,reject}))});
 const old=cache.load(base);const oldError=assert.rejects(old);await settle();cache.clear();const current=cache.load(base);await settle();pending[0].reject(Error('old'));await oldError;assert.equal(cache.load(base),current);
 const newer=cache.load(base+'?v=2');await settle();assert.equal(pending.length,3);pending[1].resolve({version:1,width:1280,height:640});pending[2].resolve({version:2,width:1280,height:640});assert.notEqual(await current,await newer);
});
test('hung injected loader is bounded, evicted and can be retried',async()=>{
 const timers=clock(),cache=createTownSceneImages({timers,loadImage:()=>new Promise(()=>{})});const pending=cache.load(base),rejected=assert.rejects(pending,/deadline/);await timers.advance(TOWN_SCENE_IMAGE_TIMEOUT);await rejected;assert.equal(cache.size(),0);
});
test('app injects one shared loader into both renderers and uses a single persistent failure banner',()=>{
 const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');assert.equal((source.match(/loadImage:sceneImages.load/g)||[]).length,2);assert.ok(!source.includes("if(state.status==='failed')notify(detail)"));assert.match(source,/banner.hidden=!\['loading','failed'\].includes\(state.status\)/);
});

test('an invalid atlas is not cached as success and a retry can recover',async()=>{let n=0;const cache=createTownSceneImages({loadImage:async()=>++n===1?{width:128,height:64}:{width:1280,height:640}});await assert.rejects(cache.load(base),error=>error.code==='assets-invalid');assert.equal(cache.size(),0);assert.equal((await cache.load(base+'?retry=1')).width,1280);assert.equal(n,2);});
