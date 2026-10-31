import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as data from '../journey-data.js';
const valid='https://note.com/ss_yr/n/n603c26c01384';
test('clean article and actual anchor accepted without requiring fragment',()=>{assert.equal(data.validNoteReturn(valid),valid);assert.equal(data.validNoteReturn(valid+'#section'),valid+'#section');});
test('private previews, query credentials, profiles and foreign hosts rejected',()=>{for(const s of ['https://note.com/preview/n603c26c01384?prev_access_key=secret',valid+'?prev_access_key=secret','https://note.com/ss_yr','https://note.com.evil.test/ss_yr/n/n123','https://note.com/other/n/n123','https://note.com/ss_yr/n/n123','javascript:alert(1)','https://u:p@note.com/ss_yr/n/n123','https://note.com:8080/ss_yr/n/n123'])assert.equal(data.validNoteReturn(s),null,s);});
test('all scenes have honest null unconfigured return, never local manuscript',()=>{for(const n of [1,2,3]){assert.equal(data.returnTarget(n,''),null);assert.equal(data.returnTarget(n,'?return='+encodeURIComponent(valid)),valid);}});
const source=fs.readFileSync(new URL('../journey-app.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace("import('./town.js?v=20261031-cast-1')","loadTownStub()");
function boot(search){
 const nodes=new Map(); const events={};const assigned=[];
 function node(id){if(!nodes.has(id))nodes.set(id,{hidden:false,disabled:false,textContent:'',innerHTML:'',classList:{add(){}},querySelector(){return {focus(){}}},querySelectorAll(){return []},scrollIntoView(){}});return nodes.get(id);}
 const document={body:node('body'),getElementById:node,addEventListener(){},hidden:false};const window={addEventListener(k,f){events[k]=f}};
 const location={search,href:'https://example.test/?'+search,assign:x=>assigned.push(x)};
 const context=vm.createContext({...data,document,window,location,URL,URLSearchParams,console:{error(){}},setTimeout(){return 1},clearTimeout(){},COPY_VERSION:'test',loadTownStub:()=>Promise.reject(Error('offline'))}); vm.runInContext(source,context);return {node,assigned,events,window};
}
const settle=()=>new Promise(r=>setImmediate(r));
test('unconfigured scene3 displays real image and cannot falsely return',async()=>{const t=boot('?scene=3');await settle();t.node('primary-action').onclick();assert.match(t.node('scene-passage').innerHTML,/window-reflection.jpg/);assert.doesNotMatch(t.node('scene-passage').innerHTML,/〔挿絵②/);assert.ok(t.node('scene-passage').innerHTML.indexOf('window-reflection.jpg')<t.node('scene-passage').innerHTML.indexOf('黒い上着。'));assert.equal(t.node('primary-action').disabled,true);t.node('primary-action').onclick();assert.deepEqual(t.assigned,[]);});
test('direct/new-tab scenes use explicit note destination; repeated clicks and bfcache safe',async()=>{for(const n of [1,2,3]){const t=boot('?scene='+n+'&return='+encodeURIComponent(valid+'#section'));await settle();assert.match(t.node('app').innerHTML,/https:\/\/note.com/);assert.doesNotMatch(t.node('app').innerHTML,/reading.html/);t.node('primary-action').onclick();assert.equal(t.node('primary-action').disabled,false);t.node('primary-action').onclick();t.node('primary-action').onclick();assert.deepEqual(t.assigned,[valid+'#section']);t.events.pageshow({persisted:true});t.node('primary-action').onclick();assert.equal(t.assigned.length,2);}});
test('scene image exists and clean original has no crop',()=>{assert.ok(fs.statSync(new URL('../assets/window-reflection.jpg',import.meta.url)).size>100000);const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.doesNotMatch(html,/aspect-ratio:1122/);assert.match(html,/width:100%;height:auto/);});
