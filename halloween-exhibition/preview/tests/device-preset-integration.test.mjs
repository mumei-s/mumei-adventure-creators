import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {DISPLAY_MODE_KEY,DISPLAY_PROFILES,createDisplayModeController,initDisplayMode,migrateDisplayMode} from '../display-mode.js';
class Events{
 constructor(){this.events=new Map();}
 addEventListener(type,handler){if(!this.events.has(type))this.events.set(type,new Set());this.events.get(type).add(handler);}
 removeEventListener(type,handler){this.events.get(type)?.delete(handler);}
 dispatchEvent(event){for(const handler of this.events.get(event.type)||[])handler(event);}
 count(){return [...this.events.values()].reduce((sum,set)=>sum+set.size,0);}
}
class Element extends Events{
 constructor(){super();this.children=[];this.dataset={};this.attrs={};this.values=new Map();this.style={setProperty:(key,value)=>this.values.set(key,value)};}
 append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
 setAttribute(key,value){this.attrs[key]=String(value);}
 querySelector(selector){return this.children.find(node=>'.'+node.className===selector)||null;}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(node=>node!==this);}
}
const memory=()=>{const values=new Map();return {values,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};};
function withPage(page,storage,run){
 const names=['document','window','location','localStorage'],previous=names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]),document=new Events(),window=new Events(),body=new Element(),mount=new Element();
 document.body=body;document.createElement=()=>new Element();window.innerWidth=390;
 Object.assign(globalThis,{document,window,location:{pathname:`/repo/halloween-exhibition/preview/${page==='gallery'?'':page+'/'}`},localStorage:storage});
 try{return run({document,window,body,mount});}finally{for(const [name,descriptor]of previous){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}}
}
function selectMode(mount,mode){const section=mount.children[0],select=section.children[1];select.value=mode;select.dispatchEvent({type:'change'});return select;}

test('the real gallery, maze and town initializers apply three distinct readable presets on one phone viewport',()=>{
 for(const page of ['gallery','maze','town'])withPage(page,memory(),({body,mount,window})=>{
  const controller=initDisplayMode({page,controlsParent:mount});const dimensions=[];
  for(const mode of ['phone','tablet','desktop']){
   selectMode(mount,mode);const profile=DISPLAY_PROFILES[mode];assert.equal(body.dataset.layoutPage,page);assert.equal(body.dataset.layoutMode,mode);assert.equal(body.dataset.layout,mode);
   for(const [token,want]of [['font',profile.font],['target',profile.target],['content-max',profile.contentMax],['header-height',profile.header]])assert.equal(body.values.get('--profile-'+token),want+'px');
   assert(profile.target>=44);dimensions.push([profile.font,profile.target,profile.contentMax].join(':'));assert.equal(window.innerWidth,390,'presets fit the available viewport without changing browser dimensions');
  }
  assert.equal(new Set(dimensions).size,3);controller.destroy();
 });
});
test('a preset chosen in the gallery survives navigation to the maze, street and a fresh reload',()=>{
 const storage=memory();for(const page of ['gallery','maze','town','town'])withPage(page,storage,({body,mount})=>{
  const controller=initDisplayMode({page,controlsParent:mount});if(page==='gallery')selectMode(mount,'tablet');assert.equal(controller.getState().mode,'tablet');assert.equal(body.dataset.layout,'tablet');controller.destroy();
 });assert.deepEqual(JSON.parse(storage.getItem(DISPLAY_MODE_KEY)),{mode:'tablet'});
});
test('headless town presets and temporary settings stay synchronized without accumulating listeners',()=>withPage('town',memory(),({body,mount,window,document})=>{
 const applied=[],headless=initDisplayMode({page:'town',onChange:state=>applied.push(state.mode)}),baseWindow=window.count(),baseDocument=document.count();assert.equal(baseWindow,3);assert.equal(baseDocument,1);
 for(let open=0;open<5;open++){
  const ui=initDisplayMode({page:'town',controlsParent:mount});assert.equal(window.count(),baseWindow+3);assert.equal(document.count(),baseDocument+1);selectMode(mount,open%2?'desktop':'tablet');assert.equal(headless.getState().mode,open%2?'desktop':'tablet');assert.equal(body.dataset.layout,headless.getState().layout);ui.destroy();assert.equal(window.count(),baseWindow);assert.equal(document.count(),baseDocument);assert.equal(mount.children.length,0);
 }
 assert(applied.includes('tablet'));assert(applied.includes('desktop'));headless.destroy();assert.equal(window.count(),0);assert.equal(document.count(),0);
}));
test('legacy town choice migrates once and never overwrites an existing gallery or maze choice',()=>{
 const storage=memory();assert(migrateDisplayMode('desktop',storage));assert.equal(JSON.parse(storage.getItem(DISPLAY_MODE_KEY)).mode,'desktop');assert(!migrateDisplayMode('phone',storage));assert.equal(JSON.parse(storage.getItem(DISPLAY_MODE_KEY)).mode,'desktop');assert(!migrateDisplayMode('invalid',memory()));assert(!migrateDisplayMode('phone',{getItem(){throw Error('blocked');}}));
});
test('temporary blocked-storage choices survive a bfcache reload in the current session',()=>{
 const storage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}},controller=createDisplayModeController({storage});controller.setMode('tablet');controller.reload();assert.equal(controller.getState().mode,'tablet');assert.equal(controller.getState().saved,false);
});
test('actual town lantern and speed persistence cannot overwrite the canonical shared display mode',()=>withPage('town',memory(),({body})=>{
 const source=fs.readFileSync(new URL('../town/app.js',import.meta.url),'utf8');
 const functionSource=name=>{const start=source.indexOf(`function ${name}(`);assert(start>=0);return source.slice(start,source.indexOf('\n',start));};
 const controller=initDisplayMode({page:'town'}),settings={layout:'phone',lantern:true,speed:1,motion:true},nodes=new Map();
 controller.setMode('desktop');const context=vm.createContext({document:globalThis.document,settings,layoutPreferences:controller,renderer:{invalidate(){}},resize(){},motion:()=>true,notify(){},saveTownPreferences:value=>({ok:true,preferences:{...value}}),$:id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);}});
 vm.runInContext(`${functionSource('applySettings')}\n${functionSource('persistSettings')}\n${functionSource('toggleLantern')}\nglobalThis.run={toggleLantern,persistSettings};`,context);
 context.run.toggleLantern();assert.equal(body.dataset.layout,'desktop');context.settings.speed=2;context.run.persistSettings();assert.equal(body.dataset.layout,'desktop');assert.equal(controller.getState().mode,'desktop');assert.equal(body.values.get('--profile-font'),'14px');controller.destroy();
}));
