import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import * as model from '../model.js';
import * as story from '../story.js';
const html=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');
const code=(await fs.readFile(new URL('../main.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replace("import('./town.js?v=1')","loadTown()");
class Node {
 constructor(id=''){this.id=id;this.hidden=false;this.disabled=false;this.open=false;this.textContent='';this.dataset={};this.style={};this.children=[];this.listeners={};this.classList={add(){},remove(){}};}
 append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this.children=nodes;}
 addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}emit(type,event={}){for(const fn of this.listeners[type]||[])fn(event);}
 setAttribute(k,v){this[k]=v;}removeAttribute(k){delete this[k];}focus(){}setPointerCapture(){}
 showModal(){this.open=true;}close(){this.open=false;this.emit('close');}
 querySelectorAll(){return this.children;}
}
function boot({search='',saved=null,rejectLoad=false}={}){
 const nodes=new Map([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Node(m[1])]));
 for(const [dx,dz]of [[0,-1],[-1,0],[1,0],[0,1]]){const b=new Node();b.dataset={dx,dz};nodes.get('pad').append(b);}
 const intro=new Node(),actions=new Node(),writes=[];let options,paused=true,entered=0;
 const engine={pause(){paused=true;},resume(){paused=false;},enter(){entered++;paused=false;return Promise.resolve();},stop(){},resize(){},setMuted(){},destroy(){},toggleAuto(){return true;},switchView(){return Promise.resolve();},capture(){return 'data:image/jpeg;base64,eA==';},direction(){}};
 const storage={getItem:()=>saved,setItem:(k,v)=>writes.push([k,v])};
 const document={hidden:false,referrer:'',body:new Node(),getElementById:id=>nodes.get(id),querySelector:s=>s==='.intro-caption'?intro:actions,createElement:()=>new Node(),addEventListener(){}};
 const window={addEventListener(){},scrollTo(){}};
 const context=vm.createContext({...model,...story,document,window,localStorage:storage,location:{search},console:{error(){}},setTimeout:()=>1,clearTimeout(){},loadTown:()=>rejectLoad?Promise.reject(Error('offline')):Promise.resolve({createStoryTown:o=>{options=o;return Promise.resolve(engine);}})});
 vm.runInContext(code,context);
 return {nodes,window,actions,writes,engine,snapshot:()=>window.__HALLOWEEN_READING_NIGHT__.snapshot(),options:()=>options,paused:()=>paused,entered:()=>entered};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('reading opens safely without loading the town',()=>{const t=boot();assert.equal(t.snapshot().chapter,0);assert.equal(t.nodes.get('reading').hidden,false);assert.equal(t.nodes.get('exploration').hidden,true);assert.equal(t.entered(),0);assert.equal(t.nodes.get('paragraphs').children.length,story.CHAPTERS[0].paragraphs.length);});
test('text-only readers can finish all four chapters',()=>{const t=boot();for(let i=1;i<=3;i++){t.nodes.get('read-next').onclick();assert.equal(t.snapshot().chapter,i);}assert.equal(t.nodes.get('ending').hidden,false);assert.equal(t.actions.hidden,true);});
test('walk, event, and prose alternate without losing the chapter',async()=>{const t=boot();for(let i=0;i<3;i++){await t.nodes.get('enter').onclick();assert.equal(t.snapshot().mode,'walk');assert.equal(t.nodes.get('loading').hidden,true);t.nodes.get('skip-scene').onclick();assert.equal(t.nodes.get('event-dialog').open,true);t.nodes.get('event-next').onclick();assert.equal(t.snapshot().chapter,i+1);assert.equal(t.snapshot().mode,'read');assert.equal(t.snapshot().position,null);}assert.equal(t.entered(),3);});
test('returning to prose preserves exploration location',async()=>{const t=boot();await t.nodes.get('enter').onclick();t.options().onPosition({x:28,z:24});t.nodes.get('back-reading').onclick();assert.equal(t.snapshot().chapter,0);assert.equal(t.snapshot().position.x,28);assert.equal(t.paused(),true);});
test('failed town loading always offers a way to continue',async()=>{const t=boot({rejectLoad:true});await t.nodes.get('enter').onclick();assert.equal(t.nodes.get('retry').hidden,false);t.nodes.get('fallback-read').onclick();t.nodes.get('event-next').onclick();assert.equal(t.snapshot().chapter,1);});
test('direct scene link enters the correct stage',async()=>{const t=boot({search:'?scene=2'});await settle();assert.equal(t.snapshot().chapter,1);assert.equal(t.snapshot().mode,'walk');assert.equal(t.entered(),1);});
test('late town loading cannot replace the prose after an exit',async()=>{const t=boot();const pending=t.nodes.get('enter').onclick();t.nodes.get('back-reading').onclick();await pending;assert.equal(t.snapshot().mode,'read');assert.equal(t.nodes.get('exploration').hidden,true);assert.equal(t.entered(),0);});
test('escape in event dialog advances exactly once',async()=>{const t=boot();await t.nodes.get('enter').onclick();t.nodes.get('skip-scene').onclick();t.nodes.get('event-dialog').emit('cancel',{preventDefault(){}});assert.equal(t.snapshot().chapter,1);t.nodes.get('event-next').onclick();assert.equal(t.snapshot().chapter,1);});
test('all UI writes stay isolated from the ordinary town',async()=>{const t=boot();await t.nodes.get('enter').onclick();t.options().onPosition({x:27,z:25});t.nodes.get('sound').onclick();t.nodes.get('back-reading').onclick();assert.ok(t.writes.length>2);assert.ok(t.writes.every(([key])=>key===model.SAVE_KEY));});
test('restart and chapter selection clear old positions',()=>{const t=boot({search:'?chapter=3'});t.nodes.get('restart').onclick();assert.equal(t.snapshot().chapter,0);t.nodes.get('chapter-nav').children[2].onclick();assert.equal(t.snapshot().chapter,2);assert.equal(t.snapshot().position,null);});
