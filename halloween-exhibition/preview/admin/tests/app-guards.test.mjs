// Node contract tests execute the real event handlers against a small DOM stub.
// They do not claim browser dialog, layout, accessibility or device verification.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as model from '../model.js';
const archive=JSON.parse(fs.readFileSync(new URL('../../data/archive.json',import.meta.url))),catalog=JSON.parse(fs.readFileSync(new URL('../../maze/data/catalog.json',import.meta.url)));
const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/\ninit\(\);\s*$/,'\n');
function harness(){
 const elements=new Map(),listeners=new Map(),saved=new Map();
 const node=()=>({value:'',files:[],disabled:false,hidden:false,textContent:'',attributes:new Map(),classList:{toggle(){}},addEventListener(){},setAttribute(k,v){this.attributes.set(k,v);},removeAttribute(k){this.attributes.delete(k);},replaceChildren(){},append(){},reset(){},scrollIntoView(){},focus(){}});
 const get=id=>{if(!elements.has(id))elements.set(id,node());return elements.get(id);};
 const context=vm.createContext({...model,document:{getElementById:get,querySelectorAll:()=>[],createElement:node,createTextNode:text=>text,body:node()},window:{addEventListener:(name,callback)=>listeners.set(name,callback)},localStorage:{getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)},confirm:()=>true,Option:function(text,value){this.text=text;this.value=value;},fetchDraft:async()=>model.createState(archive,catalog),URL,Date,JSON});
 vm.runInContext(source,context);
 vm.runInContext('download=()=>{};',context);
 context.initial=model.createState(archive,catalog);vm.runInContext('state=initial;',context);
 return {context,get,listeners,saved,run:code=>vm.runInContext(code,context)};
}
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
function unload(h){const event={prevented:false,preventDefault(){this.prevented=true;}};h.listeners.get('beforeunload')(event);return event;}

test('page exit requests a warning for unsaved input and for a storage failure',()=>{
 const h=harness();assert.equal(unload(h).prevented,false);
 h.run('dirty=true');assert.equal(unload(h).prevented,true);
 h.run('dirty=false;storageOK=false');assert.equal(unload(h).prevented,true);
 h.run('storageOK=true');assert.equal(unload(h).prevented,false);
});

test('reload locks editing and ignores a duplicate request; a failure retains the exact draft',async()=>{
 const h=harness(),load=deferred();let calls=0;
 h.context.fetchDraft=()=>{calls++;return load.promise;};
 const before=h.run('JSON.stringify(state)'),first=h.get('reload-public').onclick();
 assert.equal(h.get('workspace').disabled,true);assert.equal(h.get('workspace').attributes.get('aria-busy'),'true');
 await h.get('reload-public').onclick();assert.equal(calls,1);
 assert.equal(h.run('JSON.stringify(state)'),before);
 load.reject(Error('offline'));await first;
 assert.equal(h.get('workspace').disabled,false);assert.equal(h.get('workspace').attributes.has('aria-busy'),false);
 assert.equal(h.run('JSON.stringify(state)'),before);assert.match(h.get('status').textContent,/元の下書きは保持/);
});

test('a delayed file import locks editing and invalid JSON leaves its old draft intact',async()=>{
 const h=harness(),read=deferred(),before=h.run('JSON.stringify(state)');
 h.get('import-file').files=[{size:12,text:()=>read.promise}];
 const result=h.get('import-file').onchange();assert.equal(h.get('workspace').disabled,true);
 read.resolve('{invalid');await result;
 assert.equal(h.get('workspace').disabled,false);assert.equal(h.run('JSON.stringify(state)'),before);assert.match(h.get('status').textContent,/元の下書きは保持/);
});

test('corrupt draft recovery preserves the original raw storage if fetching or writing replacement fails',async()=>{
 const h=harness(),raw='{broken draft';h.saved.set(model.STORAGE_KEY,raw);h.run('corruptDraft=localStorage.getItem(STORAGE_KEY)');h.get('workspace').disabled=true;
 h.context.fetchDraft=async()=>{throw Error('offline');};await h.get('recover-draft').onclick();
 assert.equal(h.saved.get(model.STORAGE_KEY),raw);assert.equal(h.get('workspace').disabled,true);assert.equal(h.run('corruptDraft'),raw);
 h.context.fetchDraft=async()=>model.createState(archive,catalog);h.context.localStorage.setItem=()=>{throw Error('quota');};
 await h.get('recover-draft').onclick();assert.equal(h.saved.get(model.STORAGE_KEY),raw);assert.equal(h.run('corruptDraft'),raw);assert.match(h.get('status').textContent,/元のまま保護/);
});

test('a corrupt trash record enters the protected raw-draft recovery path before any write',async()=>{
 const h=harness(),invalid=model.createState(archive,catalog);invalid.trash=[null];const raw=JSON.stringify(invalid);h.saved.set(model.STORAGE_KEY,raw);h.get('workspace').disabled=true;
 await h.run('init()');assert.equal(h.get('recover-draft').hidden,false);assert.equal(h.get('workspace').disabled,true);assert.equal(h.saved.get(model.STORAGE_KEY),raw);assert.match(h.get('load-error-text').textContent,/自動で上書きせず保護/);
});

test('successful corrupt recovery replaces only the editor key after validated data is ready',async()=>{
 const h=harness(),load=deferred(),raw='{broken draft';h.saved.set(model.STORAGE_KEY,raw);h.saved.set('unrelated-app','keep');h.run('corruptDraft=localStorage.getItem(STORAGE_KEY)');h.get('workspace').disabled=true;h.context.fetchDraft=()=>load.promise;
 const pending=h.get('recover-draft').onclick();assert.equal(h.saved.get(model.STORAGE_KEY),raw);
 load.resolve(model.createState(archive,catalog));await pending;
 assert.deepEqual(JSON.parse(h.saved.get(model.STORAGE_KEY)),model.createState(archive,catalog));assert.equal(h.saved.get('unrelated-app'),'keep');assert.equal(h.run('corruptDraft'),null);assert.equal(h.get('workspace').disabled,false);assert.equal(h.get('recover-draft').hidden,true);
});

test('a failed ordinary persistence keeps the in-memory draft and requests exit protection',()=>{
 const h=harness(),before=h.run('JSON.stringify(state)');h.context.localStorage.setItem=()=>{throw Error('quota');};h.run('persist()');
 assert.equal(h.run('JSON.stringify(state)'),before);assert.equal(unload(h).prevented,true);assert.match(h.get('status').textContent,/編集バックアップ/);
});
