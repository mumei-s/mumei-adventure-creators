import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {createSafeReload} from '../safe-page-reload.js';
test('reload saves before stopping and refreshes only once on repeated presses',async()=>{
 const calls=[];let finish;const action=createSafeReload({save:()=>{calls.push('save');return new Promise(resolve=>finish=resolve)},beforeReload:()=>calls.push('stop'),reload:()=>calls.push('reload')});
 const first=action.run();assert.equal(await action.run(),false);finish({ok:true});assert.equal(await first,true);assert.deepEqual(calls,['save','stop','reload']);assert.equal(await action.run(),false);
});
test('failed or thrown save leaves the current page running and permits explicit retry',async()=>{
 for(const failure of [false,undefined,{ok:false,notice:'保存不可'},Error('denied')]){
  let allowed=false,reloads=0,stops=0,last;const action=createSafeReload({save:()=>{if(allowed)return true;if(failure instanceof Error)throw failure;return failure},beforeReload:()=>stops++,reload:()=>reloads++,onState:value=>last=value});
  assert.equal(await action.run(),false);assert.equal(reloads,0);assert.equal(stops,0);assert.equal(last.busy,false);assert.ok(last.message);allowed=true;assert.equal(await action.run(),true);assert.equal(reloads,1);
 }
});
test('refresh failure is visible without a retry loop',async()=>{
 let attempts=0,last;const action=createSafeReload({reload:()=>{attempts++;throw Error('navigation blocked')},onState:value=>last=value});assert.equal(await action.run(),false);assert.equal(attempts,1);assert.equal(last.message,'navigation blocked');assert.equal(action.busy,false);
});
test('three settings menus use persistent reload controls and existing save APIs',async()=>{
 const read=name=>readFile(new URL('../'+name,import.meta.url),'utf8');const [gallery,town,maze,module]=await Promise.all(['theater.js','town/app.js','maze/app.js','safe-page-reload.js'].map(read));
 assert.match(gallery,/createReloadControl\(\{save:persist\}\)/);assert.match(gallery,/visitor-preferences'\)\?\.append\(pageReload.element\)/);
 assert.match(town,/session.save\(\),beforeReload/);assert.match(town,/content.append\(pageReload.element\)/);
 assert.match(maze,/content.append\(padPositionPreferences.element\);content.append\(pageReload.element\)/);assert.match(maze,/:save\(\),beforeReload/);
 assert.doesNotMatch(module,/localStorage|\.clear\(|removeItem|caches\.|setTimeout|setInterval/);assert.match(module,/globalThis.location.reload\(\)/);
});
