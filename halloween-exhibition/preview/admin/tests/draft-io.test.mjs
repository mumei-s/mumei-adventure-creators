import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fetchDraft} from '../draft-io.js';
const archive=JSON.parse(fs.readFileSync(new URL('../../data/archive.json',import.meta.url))),catalog=JSON.parse(fs.readFileSync(new URL('../../maze/data/catalog.json',import.meta.url)));
const response=(data)=>({ok:true,json:async()=>data});

test('public draft fetch reads the current independent JSONs without a cache or source mutation',async()=>{
 const requests=[];
 const result=await fetchDraft({fetch:async(path,options)=>{requests.push({path,options});return response(path.includes('archive')?archive:catalog);}});
 assert.deepEqual(requests.map(r=>r.path),['../data/archive.json','../maze/data/catalog.json']);
 assert.ok(requests.every(r=>r.options.cache==='no-store'&&r.options.signal));
 assert.deepEqual(result.archive,archive);assert.deepEqual(result.catalog,catalog);
 result.archive.creators[0].name='changed';assert.notEqual(archive.creators[0].name,'changed');
});

test('a stalled response body times out and aborts both requests',async()=>{
 const signals=[];
 await assert.rejects(fetchDraft({timeoutMs:15,fetch:async(path,{signal})=>{signals.push(signal);return {ok:true,json:()=>new Promise(()=>{})};}}),/時間内/);
 assert.equal(signals.length,2);assert.ok(signals.every(signal=>signal.aborted));
});

test('HTTP failure or invalid JSON cannot return a replacement state',async()=>{
 await assert.rejects(fetchDraft({fetch:async()=>({ok:false,status:503})}),/503/);
 await assert.rejects(fetchDraft({fetch:async()=>({ok:true,json:async()=>{throw new SyntaxError('broken JSON');}})}),/broken JSON/);
 await assert.rejects(fetchDraft({fetch:async path=>response(path.includes('archive')?{}:catalog)}),/archive.json/);
});

test('a late timed out request never becomes a successful replacement and a retry stays independent',async()=>{
 let finish;const old=fetchDraft({timeoutMs:15,fetch:async path=>path.includes('archive')?{ok:true,json:()=>new Promise(resolve=>finish=resolve)}:response(catalog)});
 await assert.rejects(old,/時間内/);
 const retried=await fetchDraft({fetch:async path=>response(path.includes('archive')?archive:catalog)});
 finish({schemaVersion:'stale'});await Promise.resolve();
 assert.deepEqual(retried.archive,archive);assert.deepEqual(retried.catalog,catalog);
});
