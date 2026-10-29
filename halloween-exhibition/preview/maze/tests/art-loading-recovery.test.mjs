import test from 'node:test';
import assert from 'node:assert/strict';
import {createArtLibrary,RPG_ART_CONCURRENT,RPG_ART_TIMEOUT,PALACE_ART} from '../rpg-art.js';
import {MONSTER_MOTION_DATA} from '../monster-motion-data.js';
const turn=()=>new Promise(resolve=>setImmediate(resolve));
const image={width:512,height:512};

test('scene and optional image work share a mobile-sized request budget instead of timing out in one burst',async()=>{
 let active=0,maximum=0,finished=false;const release=[],requests=[];
 const art=createArtLibrary({loadPlayer:false,loadImage:(src,options)=>{requests.push({src,options});active++;maximum=Math.max(maximum,active);return new Promise(resolve=>release.push(()=>{active--;resolve(image);}));}});
 art.ready.then(()=>finished=true);
 await turn();assert.equal(active,RPG_ART_CONCURRENT);assert.equal(requests.length,RPG_ART_CONCURRENT);
 for(let pass=0;pass<20&&!finished;pass++){for(const resolve of release.splice(0))resolve();await turn();}
 await art.ready;assert.equal(active,0);assert.equal(maximum,RPG_ART_CONCURRENT);assert.equal(art.failures.length,0);
 assert(requests.every(({options})=>options.timeout===RPG_ART_TIMEOUT));assert.equal(art.status().failed,0);
});

test('a transient monster or background failure retries only that source and does not leave a permanent missing-art warning',async()=>{
 const calls=new Map(),urls=[];
 const art=createArtLibrary({loadPlayer:false,loadImage:async src=>{const url=new URL(src),path=url.pathname;urls.push(url);const count=(calls.get(path)||0)+1;calls.set(path,count);if(count===1&&(/pumpkin-walk|battle-library/.test(path)))throw Error('temporary decode timeout');return image;}});
 await art.ready;assert.deepEqual(art.failures,[]);assert.equal(Object.keys(art.monsterLayouts).length,10);
 const retried=[...calls].filter(([,count])=>count===2).map(([path])=>path);assert.equal(retried.length,2);assert(retried.some(path=>path.endsWith('pumpkin-walk.webp')));assert(retried.some(path=>path.endsWith('battle-library.webp')));
 assert.equal(urls.filter(url=>url.searchParams.get('art-retry')==='1').length,2);assert(!urls.some(url=>url.pathname.endsWith('pumpkin-story-v2.webp')));
});

test('explicit retry repairs unresolved art, rebuilds shared prop crops, and retains successful decodes',async()=>{
 let offline=true;const calls=new Map();
 const art=createArtLibrary({loadPlayer:false,motionData:{},loadImage:async src=>{const path=new URL(src).pathname;calls.set(path,(calls.get(path)||0)+1);if(offline&&path.endsWith('props-atlas.webp'))throw Error('offline props');return image;}});
 await art.ready;assert.deepEqual(art.failures,['palaceAtlas']);assert.equal(art.images.cabinet,undefined);
 const before=new Map(calls);const failure=art.status().failures[0];assert.equal(failure.key,'palaceAtlas');assert.match(failure.url,/props-atlas\.webp/);assert.equal(failure.reason,'offline props');assert.equal(failure.attempts,2);
 offline=false;const result=await art.retry();assert.equal(result.failed,0);assert.deepEqual(art.failures,[]);
 for(const [path,count]of before)assert.equal(calls.get(path),count+(path.endsWith('props-atlas.webp')?1:0));
 for(const name of Object.keys(PALACE_ART)){assert(art.images[name],name);assert.equal(art.images[name].image,art.images.palaceAtlas);}
});

test('a repaired motion atlas supersedes a failed static fallback without late fallback corruption',async()=>{
 let offline=true;const motion={pumpkin:MONSTER_MOTION_DATA.pumpkin};
 const art=createArtLibrary({loadPlayer:false,motionData:motion,loadImage:async src=>{if(offline&&/pumpkin-(walk|story)/.test(src))throw Error('offline');return image;}});
 await art.ready;assert(art.failures.includes('pumpkin-motion'));assert(art.failures.includes('pumpkin'));assert.equal(art.images.pumpkin,undefined);
 offline=false;await art.retry();assert.deepEqual(art.failures,[]);assert(art.monsterLayouts.pumpkin);assert.equal(art.images.pumpkin.image,image);assert.deepEqual(art.images.pumpkin.frame,[0,0,256,256]);
});

test('a direct encounter can request its transparent boss cutout before scene startup without decoding it twice',async()=>{
 const calls=[];const art=createArtLibrary({loadPlayer:false,deferOptional:true,deferScene:true,loadImage:async src=>{calls.push(src);return image;}});
 const first=await art.ensure('nameless_overlord');assert.equal(first,image);assert.equal(art.images.nameless_overlord,image);assert.equal(art.monsterLayouts.nameless_overlord,undefined);
 await art.startScene();await art.loadRemaining();await art.ready;
 assert.equal(calls.filter(src=>src.includes('/assets/overlord/overlord-2d-v2.webp')).length,1);
 const {monsterSprite}=await import('../monster-motion.js');assert.equal(monsterSprite(art,'nameless_overlord'),image);
 assert.equal(await art.ensure('not-an-approved-source'),null);assert.equal(Object.keys(art.monsterLayouts).length,10);
});
