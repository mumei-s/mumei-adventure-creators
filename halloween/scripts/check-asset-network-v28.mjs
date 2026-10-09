import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import {File} from 'node:buffer';
import {fetchAssetBlob} from '../asset-network.js?v=28.4.6';
import {loadStylePresets,stylePresetFor} from '../style-presets.js?v=28.4.6';
import {loadDrawingReferences,drawingReferenceFor} from '../drawing-references.js?v=28.4.6';
import {buildIndividualSelectionReferences} from '../selection-references.js?v=28.4.6';
import {applyCollection} from '../collection.js?v=28.4.6';
import {selectionAttachmentPolicy} from '../attachment-policy.js?v=28.4.6';

const root=new URL('../',import.meta.url),timeoutMs=8;
const responseFor=url=>new Response(fs.readFileSync(url),{headers:{'Content-Type':url.pathname.endsWith('.png')?'image/png':'image/jpeg'}});
const never=()=>new Promise(()=>{});
for(const bodyStall of [false,true]){
 let signal;
 const fetchImpl=async(url,options)=>{signal=options.signal;return bodyStall?{ok:true,blob:never}:never();};
 await assert.rejects(fetchAssetBlob(new URL('assets/style-solid-glow-anime-v28-4-5.png',root),{fetchImpl,timeoutMs}),/時間内/);
 assert.equal(signal.aborted,true,'The deadline must abort the request, including a stalled response body');
}
await assert.rejects(fetchAssetBlob('unused',{fetchImpl:async()=>{throw new TypeError('Failed to fetch');},timeoutMs}),/通信を確認/);
await assert.rejects(fetchAssetBlob('unused',{fetchImpl:async()=>new Response('missing',{status:404}),timeoutMs}),/読み込めません/);
const small=new Blob(['unchanged bytes'],{type:'image/png'});
assert.equal(await fetchAssetBlob('unused',{fetchImpl:async()=>({ok:true,blob:async()=>small}),timeoutMs}),small,'The network layer must preserve the original Blob');

// Exercise real fetch cancellation as well as injected clients. The server
// intentionally stops before headers or halfway through the response body.
const sockets=new Set(),closed=new Map();
const server=http.createServer((request,response)=>{
 closed.set(request.url,new Promise(resolve=>request.socket.once('close',resolve)));
 if(request.url==='/body'){response.writeHead(200,{'Content-Type':'image/png'});response.write('partial image');}
});
server.on('connection',socket=>{sockets.add(socket);socket.once('close',()=>sockets.delete(socket));});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try{
 for(const path of ['/headers','/body']){
  await assert.rejects(fetchAssetBlob('http://127.0.0.1:'+server.address().port+path,{timeoutMs:250}),/時間内/);
  assert.ok(closed.has(path),'The real test server must receive the request');
  let closeTimer;
  try{await Promise.race([closed.get(path),new Promise((resolve,reject)=>{closeTimer=setTimeout(()=>reject(new Error('Aborted asset connection remained open')),2000);})]);}finally{clearTimeout(closeTimer);}
 }
}finally{for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(resolve));}

for(const collection of ['halloween','everyday']){
 applyCollection(collection);
 for(const [loader,reference] of [[loadStylePresets,stylePresetFor('立体光彩アニメ')],[loadDrawingReferences,drawingReferenceFor('宝石光彩アニメ')]]){
  let calls=0,signal;
  const fetchImpl=async(url,options)=>{calls++;signal=options.signal;if(calls===1)return never();return responseFor(url);};
  const first=await Promise.allSettled([loader([reference],{fetchImpl,FileClass:File,timeoutMs}),loader([reference],{fetchImpl,FileClass:File,timeoutMs})]);
  assert.ok(first.every(result=>result.status==='rejected'&&/時間内/.test(result.reason.message)));
  assert.equal(calls,1,'Concurrent requests must share one transfer');assert.equal(signal.aborted,true);
  const retry=await loader([reference],{fetchImpl,FileClass:File,timeoutMs});assert.equal(calls,2,'A timeout must evict the failed cache entry');
  assert.deepEqual(Buffer.from(await retry[0].file.arrayBuffer()),fs.readFileSync(new URL(reference.file,root)));
  await loader([reference],{fetchImpl,FileClass:File,timeoutMs});assert.equal(calls,2,'A successful original asset must be reused');
  let otherCalls=0;await loader([reference],{fetchImpl:async url=>{otherCalls++;return responseFor(url);},FileClass:File,timeoutMs});
  assert.equal(otherCalls,1,'Caches must not share entries across different network clients');
  let bodyCalls=0,bodySignal;
  const bodyFetch=async(url,options)=>{bodyCalls++;bodySignal=options.signal;return bodyCalls===1?{ok:true,blob:never}:responseFor(url);};
  await assert.rejects(loader([reference],{fetchImpl:bodyFetch,FileClass:File,timeoutMs}),/時間内/);assert.equal(bodySignal.aborted,true);
  await loader([reference],{fetchImpl:bodyFetch,FileClass:File,timeoutMs});assert.equal(bodyCalls,2,'A stalled body must also remain retryable');
 }
 const reference=stylePresetFor('立体光彩アニメ'),condition={key:'theme',value:'ネットワーク検査',label:'世界観',selectionIndex:1,sample:{kind:'image',src:'./'+reference.file}},manifest={items:[condition]};
 let signal;
 await assert.rejects(buildIndividualSelectionReferences(manifest,{fetchImpl:async(url,options)=>{signal=options.signal;return {ok:true,blob:never};},FileClass:File,imageTimeoutMs:timeoutMs}),/時間内/);
 assert.equal(signal.aborted,true,'The individual-image route must abort stalled bodies');
 const individual=await buildIndividualSelectionReferences(manifest,{fetchImpl:async url=>responseFor(url),FileClass:File,imageTimeoutMs:timeoutMs});
 assert.deepEqual(Buffer.from(await individual[0].file.arrayBuffer()),fs.readFileSync(new URL(reference.file,root)));
 for(const mode of ['sheet','individual']){
  const policy=selectionAttachmentPolicy([{key:'medium',value:'立体光彩アニメ'}],{mode});
  assert.match(policy.decision,/立体光彩.*順に/);assert.doesNotMatch(policy.decision,/1回で完成作品/);
 }
}
applyCollection('halloween');
console.log('PASS asset network: bounded request AND response body, actual HTTP connections closed by Abort, shared concurrent transfer, failed-cache eviction/retry, client-isolated original-byte cache, individual references and consistent stage descriptions in both modes. Image generation acceptance is separate.');
