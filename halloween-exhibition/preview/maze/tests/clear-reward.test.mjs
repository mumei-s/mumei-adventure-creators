import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {issuePrompt,buildCardPrompt,eligibleForEnding,createRewardStore,REWARD_PREFIX} from '../clear-reward.js';
const ids=['pumpkin','ghost','zombie','vampire','franken','bat'];
const storage=()=>{const m=new Map();return {get length(){return m.size},key:i=>[...m.keys()][i],getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};};
test('requires six distinct residents, unlock and arrival',()=>{
 for(const missing of ids)assert.equal(eligibleForEnding({unlocked:true,reachedVault:true,cleared:ids.filter(x=>x!==missing)},ids),false);
 assert.equal(eligibleForEnding({unlocked:false,reachedVault:true,cleared:ids},ids),false);
 assert.equal(eligibleForEnding({unlocked:true,reachedVault:false,cleared:ids},ids),false);
 assert.equal(eligibleForEnding({unlocked:true,reachedVault:true,cleared:Array(6).fill('bat')},ids),false);
 assert.equal(eligibleForEnding({unlocked:true,reachedVault:true,cleared:ids},ids),true);
});
test('no reward before genuine completed flag; invalid scope rejected',()=>{
 assert.throws(()=>issuePrompt({id:'a',completed:false},{number:1,scope:'device'}));
 assert.throws(()=>issuePrompt({id:'a',completed:true},{number:1}));
});
test('same run across reload reuses number; new run increments',async()=>{
 const s=storage();s.setItem('unrelated-preferences','keep');
 const a=await createRewardStore({storage:s}).issue({id:'a',completed:true});
 const b=await createRewardStore({storage:s}).issue({id:'a',completed:true});
 const c=await createRewardStore({storage:s}).issue({id:'b',completed:true});
 assert.equal(a.number,1);assert.equal(b.number,1);assert.equal(c.number,2);assert.equal(s.getItem('unrelated-preferences'),'keep');
 assert.equal(s.length,3);
});
test('storage failure gives session-only receipt without repeated increments',async()=>{
 const r=createRewardStore({storage:{getItem(){throw Error()},setItem(){throw Error()},get length(){throw Error()}}});
 const a=await r.issue({id:'a',completed:true});assert.equal(a.persistent,false);assert.equal((await r.issue({id:'a',completed:true})).number,1);
 assert.equal((await r.issue({id:'b',completed:true})).number,2);
});
test('locks serialize allocation and simultaneous same-run issue',async()=>{
 const s=storage();let chain=Promise.resolve(),calls=0;const locks={request(name,fn){calls++;const next=chain.then(fn);chain=next.catch(()=>{});return next;}};
 const a=createRewardStore({storage:s,locks}),b=createRewardStore({storage:s,locks});
 const result=await Promise.all([a.issue({id:'a',completed:true}),b.issue({id:'b',completed:true}),a.issue({id:'a',completed:true})]);
 assert.deepEqual(result.map(x=>x.number),[1,2,1]);assert.equal(calls,3);
});
test('prompt uses ID only for name lookup, requested creative status, exact project/CLEAR',()=>{
 const p=buildCardPrompt('001','ss_yr');assert.match(p,/調査用。画像には絶対に印字しない/);assert.match(p,/創作ステータス/);assert.match(p,/Halloween Atelier/);assert.match(p,/CLEAR/);assert.match(p,/確認できない場合/);assert.match(p,/添付した好きなイラスト/);assert.match(p,/この端末のクリア No.001/);assert.throws(()=>buildCardPrompt('001','https://note.com/ss_yr'));
});
test('static sample explicitly marked and does not expose issuance or claim actual clear',()=>{
 const html=fs.readFileSync(new URL('../clear-gallery/index.html',import.meta.url),'utf8');assert.match(html,/見本/);assert.match(html,/実際のクリア記録や本人認証を示すものではありません/);assert.doesNotMatch(html,/fetch\(|iframe|<script/);
});
test('save preserves run/progress, no backend; maze-only assets present',()=>{
 const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');assert.match(app,/runId,reachedVault,cleared:\[\.\.\.cleared\]/);assert.match(app,/if\(!isAdventureComplete\(\)&&!rewardStore.read\(runId\)\)return/);assert.match(app,/clearGallery.href='\.\/clear-gallery\/'/);
 assert.ok(fs.statSync(new URL('../assets/clear-card-sample.webp',import.meta.url)).size>1000);
});
