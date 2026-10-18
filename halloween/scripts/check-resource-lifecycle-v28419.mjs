import assert from 'node:assert/strict';
import fs from 'node:fs';
import {File} from 'node:buffer';
import {createSampleImage,disposeSampleImages} from '../sample-image.js';
import {createBlobCache,ORIGINAL_CACHE_LIMITS} from '../blob-cache.js';
import {loadSelectionImage} from '../selection-references.js';

function preview(){
 const timers=new Map(),requests=[],events={};let sequence=0;
 const img={dataset:{},isConnected:true,addEventListener:(type,fn)=>events[type]=fn,removeAttribute(name){if(name==='src')this.removed=true;},set src(value){requests.push(value);}};
 createSampleImage(()=>img,'./thumb.webp',{fallbackSrc:'./original.png',setTimer:fn=>{timers.set(++sequence,fn);return sequence;},clearTimer:id=>timers.delete(id)});
 return {img,timers,requests,events};
}
const closed=preview();disposeSampleImages({querySelectorAll:()=>[closed.img]});
assert.equal(closed.timers.size,0);assert.equal(closed.img.removed,true);
closed.events.error();closed.events.load();
assert.equal(closed.requests.length,1,'Closing must not retry or promote to the full original');
assert.equal(closed.img.dataset.previewState,'cancelled');
const final=preview();for(let i=0;i<3;i++){const callback=[...final.timers.values()][0];assert.ok(callback);callback();}
assert.equal(final.requests.length,3);assert.equal(final.img.dataset.previewState,'failed');assert.equal(final.img.removed,true,'Final timeout must release the request');
const detached=preview();detached.img.isConnected=false;detached.events.error();assert.equal(detached.requests.length,1);assert.equal(detached.img.removed,true);
// Reopening renders new images rather than reviving disposed request handlers.
const reopened=preview();reopened.events.load();assert.equal(reopened.img.dataset.previewState,'ready');assert.equal(reopened.timers.size,0);
const picker=fs.readFileSync(new URL('../picker.js',import.meta.url),'utf8');
assert.match(picker,/addEventListener\('close',\(\)=>\{cancelGesture\(\);disposeSampleImages\(\$\('picker'\)\)/);
assert.match(picker,/stopInspectorPan\(\);disposeSampleImages\(\$\('inspector-art'\)\)/);
assert.match(picker,/function render\(\)\{if\(!question\)return;disposeSampleImages/);

let instances=[];
class ImageDouble{
 constructor(){instances.push(this);}
 set src(value){this.source=value;}
 removeAttribute(name){if(name==='src'){this.source='';this.removed=true;}}
}
await assert.rejects(loadSelectionImage('./slow.jpg',ImageDouble,2),/時間内/);
assert.equal(instances.at(-1).removed,true);assert.equal(instances.at(-1).onload,null);
const controller=new AbortController(),pending=loadSelectionImage('./slow.jpg',ImageDouble,1000,controller.signal);controller.abort();await assert.rejects(pending,{name:'AbortError'});assert.equal(instances.at(-1).removed,true);
const pre=new AbortController();pre.abort();await assert.rejects(loadSelectionImage('./slow.jpg',ImageDouble,1000,pre.signal),{name:'AbortError'});assert.equal(instances.at(-1).source,'');
const success=loadSelectionImage('./original.svg#view',ImageDouble,1000);const loaded=instances.at(-1);loaded.onload();assert.equal(await success,loaded);assert.ok(loaded.source.endsWith('original.svg#view'),'Preserve native SVG view fragments');

const cache=createBlobCache({maxEntries:2,maxBytes:6});let loads=0;
const get=key=>cache.get(key,()=>{loads++;return new Blob([key.repeat(3)]);});
const a=await get('a'),owned=new File([a],'original.png');await get('b');await get('a');await get('c');assert.equal(loads,3);assert.deepEqual(cache.info(),{entries:2,bytes:6,pending:0,maxEntries:2,maxBytes:6});await get('b');assert.equal(loads,4,'Evict the least recently used entry');assert.equal(await owned.text(),'aaa','Eviction must not mutate active result Files');
const concurrent=createBlobCache();let resolve;const one=concurrent.get('same',()=>new Promise(r=>{resolve=r;})),two=concurrent.get('same',()=>{throw Error('duplicate');});assert.equal(one,two);await Promise.resolve();resolve(new Blob(['original bytes']));assert.equal(await one,await two);
const large=createBlobCache({maxEntries:2,maxBytes:2});const oversized=await large.get('large',()=>new Blob(['123']));assert.equal(oversized.size,3);assert.equal(large.info().bytes,0,'Oversized originals are delivered unchanged without retention');
const retry=createBlobCache();await assert.rejects(retry.get('x',()=>Promise.reject(Error('offline'))));assert.equal(retry.info().pending,0);assert.equal((await retry.get('x',()=>new Blob(['ok']))).size,2);
assert.equal(ORIGINAL_CACHE_LIMITS.maxEntries,6);assert.equal(ORIGINAL_CACHE_LIMITS.maxBytes,12*1024*1024);
console.log('PASS resource lifecycle: closed/replaced/disconnected previews, terminal timeout cleanup, image timeout/abort and preserved SVG fragments, byte/entry bounded LRU, concurrent deduplication, retry, and active File preservation.');
