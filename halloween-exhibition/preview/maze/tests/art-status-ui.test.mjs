import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const source=app.slice(app.indexOf('let artRetrying=false;'),app.indexOf('const cameraButton=',app.indexOf('let artRetrying=false;')));
const turn=()=>new Promise(resolve=>setImmediate(resolve));
function harness(initial){
 let current=initial,resolveRetry;const notices=[],logs=[],record={retries:0,removed:0};
 const count={textContent:'未読込 2件'},button={disabled:false,querySelector:()=>count,remove(){record.removed++;}};
 const document={body:{dataset:{}}};const context=vm.createContext({document,console:{warn:(...args)=>logs.push(args)},notify:value=>notices.push(value),$:()=>button,rpgArt:{ready:Promise.resolve(),status:()=>current,retry(){record.retries++;return new Promise(resolve=>resolveRetry=resolve);}}});
 vm.runInContext(source+'\nglobalThis.actions={sync:syncRPGArtStatus,retry:retryRPGArt};',context);
 return{context,document,record,notices,logs,button,count,complete(status){current=status;resolveRetry();},status(status){current=status;}};
}
const failed={failed:2,failures:[{key:'pumpkin-motion',url:'https://site.test/maze/assets/rpg/animated/pumpkin-walk.webp?art-retry=1',reason:'Art image timed out',attempts:2},{key:'floor',url:'https://site.test/maze/assets/rpg/floor.webp?art-retry=1',reason:'Art image failed',attempts:2}]};

test('ready art has no missing-image warning; unresolved art announces current count and exact failure evidence',async()=>{
 const ready=harness({failed:0,failures:[]});await turn();assert.equal(ready.document.body.dataset.art,'ready');assert.deepEqual(ready.notices,[]);assert.deepEqual(ready.logs,[]);
 const partial=harness(failed);await turn();assert.equal(partial.document.body.dataset.art,'partial');assert.match(partial.notices[0],/2件/);assert.match(partial.notices[0],/イラストを読み込み直す/);const logged=JSON.parse(partial.logs[0][1]);assert.deepEqual(logged,failed.failures);
});

test('retry coalesces input and clears partial status only after unresolved images actually recover',async()=>{
 const h=harness(failed);await turn();const retry=h.context.actions.retry();const duplicate=h.context.actions.retry();await duplicate;
 assert.equal(h.record.retries,1);assert.equal(h.button.disabled,true);assert.equal(h.document.body.dataset.art,'partial');assert.equal(h.record.removed,0);
 h.complete({failed:0,failures:[]});await retry;assert.equal(h.document.body.dataset.art,'ready');assert.equal(h.record.removed,1);assert.equal(h.button.disabled,false);assert.match(h.notices.at(-1),/準備できました/);
});

test('a partially successful retry retains the warning and reports the remaining count rather than claiming success',async()=>{
 const h=harness(failed);await turn();const retry=h.context.actions.retry();h.complete({failed:1,failures:[failed.failures[1]]});await retry;
 assert.equal(h.document.body.dataset.art,'partial');assert.equal(h.record.removed,0);assert.equal(h.count.textContent,'未読込 1件');assert.match(h.notices.at(-1),/1件/);assert(!h.notices.at(-1).includes('準備できました'));
});
