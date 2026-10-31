import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as data from '../journey-data.js';
import {prepareIllustration} from '../scene-illustration.js';
import * as returnNavigation from '../return-navigation.js';
const valid='https://note.com/ss_yr/n/n603c26c01384';
test('clean article and actual anchor accepted without requiring fragment',()=>{assert.equal(data.validNoteReturn(valid),valid);assert.equal(data.validNoteReturn(valid+'#section'),valid+'#section');});
test('private previews, query credentials, profiles and foreign hosts rejected',()=>{for(const s of ['https://note.com/preview/n603c26c01384?prev_access_key=secret',valid+'?prev_access_key=secret','https://note.com/ss_yr','https://note.com.evil.test/ss_yr/n/n123','https://note.com/other/n/n123','https://note.com/ss_yr/n/n123','javascript:alert(1)','https://u:p@note.com/ss_yr/n/n123','https://note.com:8080/ss_yr/n/n123'])assert.equal(data.validNoteReturn(s),null,s);});
test('all scenes have honest null unconfigured return, never local manuscript',()=>{for(const n of [1,2,3]){assert.equal(data.returnTarget(n,''),null);assert.equal(data.returnTarget(n,'?return='+encodeURIComponent(valid)),valid);}});
const source=fs.readFileSync(new URL('../journey-app.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace("import('./town.js?v=20261031-performance-1')","loadTownStub()");
function boot(search,{town,referrer='',historyLength=1,opener=null,backThrows=false,closeThrows=false,assignThrows=false,prepare=prepareIllustration}={}){
 const nodes=new Map(); const events={};const assigned=[],timers=[];let backs=0,closes=0;
 function node(id){if(!nodes.has(id))nodes.set(id,{hidden:false,disabled:false,textContent:'',innerHTML:'',classList:{add(){},remove(){},toggle(){}},closest(){return node('figure')},querySelector(selector){if(selector==='img')return node('image-placeholder');if(selector==='.image-fallback')return node('caption');if(selector==='.image-retry')return node('retry');return {focus(){}}},querySelectorAll(){return []},scrollIntoView(){}});return nodes.get(id);}
 const document={referrer,body:node('body'),getElementById:node,addEventListener(){},hidden:false};const window={opener,close(){closes++;if(closeThrows)throw Error('blocked');},addEventListener(k,f){events[k]=f}};
 const location={search,href:'https://example.test/?'+search,assign:x=>{if(assignThrows)throw Error("blocked");assigned.push(x)}};
 const context=vm.createContext({...data,...returnNavigation,prepareIllustration:prepare,history:{length:historyLength,back(){backs++;if(backThrows)throw Error('blocked');}},document,window,location,URL,URLSearchParams,console:{error(){}},setTimeout(fn,ms){const timer={fn,ms,cleared:false};timers.push(timer);return timer;},clearTimeout(timer){if(timer)timer.cleared=true;},COPY_VERSION:'test',loadTownStub:()=>town||Promise.reject(Error('offline'))}); vm.runInContext(source,context);return {node,assigned,events,window,backs:()=>backs,closes:()=>closes,fireTimer(ms){const timer=timers.findLast(t=>t.ms===ms&&!t.cleared);assert.ok(timer);timer.fn();}};
}
const settle=()=>new Promise(r=>setImmediate(r));
test('unconfigured scene3 displays real image and cannot falsely return',async()=>{const t=boot('?scene=3');await settle();t.node('primary-action').onclick();assert.match(t.node('scene-passage').innerHTML,/window-reflection-q94.webp/);assert.doesNotMatch(t.node('scene-passage').innerHTML,/〔挿絵②/);assert.ok(t.node('scene-passage').innerHTML.indexOf('window-reflection-q94.webp')<t.node('scene-passage').innerHTML.indexOf('黒い上着。'));assert.equal(t.node('primary-action').disabled,false);t.node('primary-action').onclick();assert.deepEqual(t.assigned,[]);});
test('direct/new-tab scenes use explicit note destination; repeated clicks and bfcache safe',async()=>{for(const n of [1,2,3]){const t=boot('?scene='+n+'&return='+encodeURIComponent(valid+'#section'));await settle();assert.match(t.node('app').innerHTML,/https:\/\/note.com/);assert.doesNotMatch(t.node('app').innerHTML,/reading.html/);t.node('primary-action').onclick();assert.equal(t.node('primary-action').disabled,false);t.node('primary-action').onclick();t.node('primary-action').onclick();assert.deepEqual(t.assigned,[valid+'#section']);t.events.pageshow({persisted:true});t.node('primary-action').onclick();assert.equal(t.assigned.length,2);}});
test('scene image exists and clean original has no crop',()=>{assert.ok(fs.statSync(new URL('../assets/window-reflection-q94.webp',import.meta.url)).size>100000);const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.doesNotMatch(html,/aspect-ratio:1122/);assert.match(html,/width:100%;height:auto/);});
test('reading is immediately available during town preparation, independent of note return',async()=>{for(const n of [1,2,3]){const t=boot('?scene='+n);assert.match(t.node('app').innerHTML,/id="read-now" type="button"/);assert.doesNotMatch(t.node('app').innerHTML,/id="read-now"[^>]*disabled/);t.node('read-now').onclick();assert.equal(t.node('scene-passage').hidden,false);assert.equal(t.node('read-now').hidden,true);assert.equal(t.node('primary-action').disabled,false);const passage=t.node('scene-passage').innerHTML;await settle();assert.equal(t.node('scene-passage').innerHTML,passage);assert.match(t.node('status').textContent,/読み込みを待つ必要はありません/);}});

test('reading during unresolved town creation survives late engine completion and repeated clicks',async()=>{let complete,destroyed=0;const town=new Promise(r=>complete=r);const t=boot('?scene=3',{town});t.node('read-now').onclick();const passage=t.node('scene-passage').innerHTML;t.node('read-now').onclick();complete({createStoryTown:()=>Promise.resolve({destroy(){destroyed++},pause(){}})});await settle();assert.equal(destroyed,1);assert.equal(t.node('scene-passage').innerHTML,passage);assert.equal(t.node('primary-action').disabled,false);});
test('watchdog survives stalled enter and late enter cannot overwrite reading',async()=>{let complete,destroyed=0;const engine={enter:()=>new Promise(r=>complete=r),destroy(){destroyed++},pause(){}};const t=boot('?scene=2',{town:Promise.resolve({createStoryTown:()=>Promise.resolve(engine)})});await settle();t.fireTimer(30000);assert.match(t.node('primary-action').textContent,/本文を読む/);t.node('primary-action').onclick();const passage=t.node('scene-passage').innerHTML;complete();await settle();assert.equal(destroyed,1);assert.equal(t.node('scene-passage').innerHTML,passage);assert.equal(t.node('primary-action').disabled,false);});

test('scene1 explains solo timer photo, then shows manga before anomaly prose; other imagery unchanged',async()=>{const t=boot('?scene=1');await settle();t.node('primary-action').onclick();const html=t.node('scene-passage').innerHTML;assert.match(html,/photo-anomaly-manga-q94.webp/);assert.doesNotMatch(html,/〔マンガ①/);assert.ok(html.indexOf('みんなで集合写真を撮り終えたあと')<html.indexOf('三脚のカメラのタイマーをもう一度かけて'));assert.ok(html.indexOf('photo-anomaly-manga-q94.webp')>html.indexOf('三脚のカメラのタイマーをもう一度かけて'));assert.ok(html.indexOf('photo-anomaly-manga-q94.webp')<html.indexOf('撮った写真を開いて、指が止まった'));assert.doesNotMatch(html,/とりあえずシャッタータイマーかけて/);assert.match(html,/width="1024" height="1536"/);assert.equal(data.SCENES[1].image.src,'./assets/empty-library-q94.webp');assert.equal(data.SCENES[2].image.src,'./assets/window-reflection-q94.webp');assert.ok(fs.statSync(new URL('../assets/photo-anomaly-manga-q94.webp',import.meta.url)).size>100000);});
test('browser Back is explicitly available across note, empty and ChatGPT referrers; never promises note',async()=>{for(const referrer of ['https://note.com/','https://note.com/preview/nabc?prev_access_key=private','','https://chatgpt.com/']){const t=boot('?scene=1',{referrer,historyLength:2});t.node('read-now').onclick();assert.equal(t.node('primary-action').disabled,false);assert.equal(t.node('primary-action').textContent,'前の画面へ戻る');assert.doesNotMatch(t.node('app').innerHTML,/prev_access_key|private/);t.node('primary-action').onclick();t.node('primary-action').onclick();assert.equal(t.backs(),1);assert.deepEqual(t.assigned,[]);}});
test('new tabs or direct entry without prior history show original-tab guidance, no back call',()=>{const t=boot('?scene=3',{referrer:'https://note.com/',historyLength:1,opener:{}});t.node('read-now').onclick();assert.equal(t.node('primary-action').disabled,false);t.node('primary-action').onclick();assert.equal(t.backs(),0);assert.match(t.node('app').innerHTML,/タブ一覧で閉じ/);assert.equal(t.closes(),1);});
test('no-op Back recovers and allows deliberate retry without automatic URL redirect',()=>{const t=boot('?scene=2&return='+encodeURIComponent(valid),{historyLength:2});t.node('read-now').onclick();t.node('primary-action').onclick();t.fireTimer(1800);assert.equal(t.node('primary-action').disabled,false);assert.match(t.node('status').textContent,/戻れませんでした/);assert.deepEqual(t.assigned,[]);t.node('primary-action').onclick();assert.equal(t.backs(),2);});
test('same-document back and bfcache forward restore a usable reading control',()=>{const t=boot('?scene=2',{historyLength:3});t.node('read-now').onclick();t.node('primary-action').onclick();t.events.popstate();assert.equal(t.node('primary-action').disabled,false);assert.match(t.node('status').textContent,/ページ内の履歴/);t.node('primary-action').onclick();t.events.pagehide();t.events.pageshow({persisted:true});assert.equal(t.node('primary-action').disabled,false);t.node('primary-action').onclick();assert.equal(t.backs(),3);});
test('reused/opened tab is labelled generic Back, and security rejection recovers',()=>{const t=boot('?scene=1',{historyLength:4,opener:{},backThrows:true});t.node('read-now').onclick();assert.equal(t.node('primary-action').textContent,'前の画面へ戻る');t.node('primary-action').onclick();assert.equal(t.node('primary-action').disabled,false);assert.match(t.node('status').textContent,/実行できませんでした/);});

test('close requires explicit click, double clicks are locked, refusal recovers without redirects',()=>{const t=boot('?scene=3',{historyLength:1});t.node('read-now').onclick();assert.equal(t.closes(),0);assert.equal(t.node('primary-action').textContent,'このゲームを閉じる');t.node('primary-action').onclick();t.node('primary-action').onclick();assert.equal(t.closes(),1);assert.equal(t.node('primary-action').disabled,true);t.fireTimer(1800);assert.equal(t.node('primary-action').disabled,false);assert.match(t.node('status').textContent,/タブ一覧/);assert.deepEqual(t.assigned,[]);});
test('close exception remains on readable passage with manual tab guidance',()=>{const t=boot('?scene=1',{historyLength:1,closeThrows:true});t.node('read-now').onclick();t.node('primary-action').onclick();assert.equal(t.node('primary-action').disabled,false);assert.match(t.node('status').textContent,/タブ一覧/);assert.equal(t.node('scene-passage').hidden,false);});

test('configured destination navigation rejection or no-op unlocks without automatic retry',()=>{
 for(const assignThrows of [true,false]){
  const t=boot('?scene=1&return='+encodeURIComponent(valid),{assignThrows});
  t.node('read-now').onclick();t.node('primary-action').onclick();
  if(!assignThrows)t.fireTimer(1800);
  assert.equal(t.node('primary-action').disabled,false);
  assert.match(t.node('status').textContent,/記事を開けませんでした/);
  assert.equal(t.assigned.length,assignThrows?0:1);
 }
});
test('unconfigured Back no-op never recommends a nonexistent configured link',()=>{
 const t=boot('?scene=1',{historyLength:2});t.node('read-now').onclick();t.node('primary-action').onclick();t.fireTimer(1800);
 assert.doesNotMatch(t.node('status').textContent,/設定済み/);
});

test('scene2 empty-library image appears before the outside voice and double',()=>{
 const t=boot('?scene=2');t.node('read-now').onclick();const html=t.node('scene-passage').innerHTML;
 assert.ok(html.indexOf('中には誰もいない。')<html.indexOf('empty-library-q94.webp'));
 assert.ok(html.indexOf('empty-library-q94.webp')<html.indexOf('返事は外から'));
 assert.equal(data.SCENES[1].image.width,1672);assert.equal(data.SCENES[1].image.height,941);
 assert.ok(fs.statSync(new URL('../assets/empty-library-q94.webp',import.meta.url)).size>100000);
});
test('passage geometry and orientation resize redraw the paused scene in order',async()=>{
 const calls=[];const engine={enter:async()=>{},pause(){calls.push('pause')},resize(){calls.push('resize')},revealCast(){calls.push('render')},destroy(){}};
 const t=boot('?scene=3',{town:Promise.resolve({createStoryTown:()=>Promise.resolve(engine)})});await settle();
 t.node('read-now').onclick();assert.deepEqual(calls.slice(-2),['resize','render']);
 calls.length=0;t.events.resize();assert.deepEqual(calls,['resize','render']);
});
test('compact shared controls remain in normal flow with collapsed help and 44px targets',()=>{
 const css=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(css,/\.game \.action-dock\{position:static/);
 assert.match(css,/\.game-moving #primary-action\{display:none\}/);
 assert.match(css,/min-height:44px/);assert.match(css,/safe-area-inset-left/);
 for(const n of [1,2,3]){const html=boot('?scene='+n).node('app').innerHTML;
 assert.match(html,/<details class="return-help"><summary>戻り方/);
 assert.doesNotMatch(html,/<details[^>]*open/);
 assert.match(html,/class="action-row"/);
 assert.equal((html.match(/読み終えたら/g)||[]).length,1);
 }
});

test('prepared illustration mount never blocks passage or return and early failure offers retry',()=>{
 let notify,retries=0,definition;
 const t=boot('?scene=2',{prepare:d=>{definition=d;return {mount(_placeholder,callback){notify=callback;notify('error')},retry(){retries++;notify('loading')}}}});
 assert.equal(definition.src,data.SCENES[1].image.src);t.node('read-now').onclick();
 assert.equal(t.node('scene-passage').hidden,false);assert.equal(t.node('primary-action').disabled,false);
 assert.doesNotMatch(t.node('scene-passage').innerHTML,/<img src=/);
 assert.equal(t.node('retry').hidden,false);assert.match(t.node('caption').textContent,/読み込めませんでした/);
 t.node('retry').onclick();assert.equal(retries,1);assert.equal(t.node('retry').hidden,true);
 notify('loaded');assert.equal(t.node('caption').hidden,true);
});
