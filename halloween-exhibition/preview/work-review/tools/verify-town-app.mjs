#!/usr/bin/env node
/** Node integration test of the actual town application. No browser/layout/GPU claims.
 * Run: node town-app-integration.mjs /absolute/path/to/preview/town
 * Real: app event handlers, controllers, images, native Canvas, Three scene/math.
 * Simulated: DOM/dialog/layout measurements, RAF clock, WebGL renderer backend.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL,fileURLToPath} from 'node:url';

const base=path.resolve(process.argv[2]||fileURLToPath(new URL('../../town/',import.meta.url)))+'/';
const source=await fs.readFile(base+'app.js','utf8'),html=await fs.readFile(base+'index.html','utf8');
const imports={};
for(const match of source.matchAll(/^import \{([^}]+)\} from '([^']+)';/gm)){
  const module=await import(new URL(match[2],pathToFileURL(base+'app.js')));
  for(const name of match[1].split(',')){const key=name.trim();imports[key]=module[key];}
}
const runtime=createRequire(pathToFileURL(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/package.json'));
const {createCanvas,loadImage}=runtime('@napi-rs/canvas');
// Native Canvas accepts native images/canvases, whereas browser drawImage accepts
// our simulated DOM canvas. Unwrap that one adapter boundary for all native contexts.
const nativeContext=Object.getPrototypeOf(createCanvas(1,1).getContext('2d'));
const nativeDrawImage=nativeContext.drawImage;
nativeContext.drawImage=function(image,...args){return nativeDrawImage.call(this,image.native||image,...args);};
const worldModule=await import(pathToFileURL(base+'world-3d.js'));
const characterModule=await import(pathToFileURL(base+'../maze/creator-runtime.js'));

function matches(element,selector){
  return selector.split(',').some(value=>{
    const s=value.trim();
    if(s==='*')return true;
    if(s==='[data-move]')return Object.hasOwn(element.dataset,'move');
    if(s==='button:not(:disabled)')return element.tagName==='BUTTON'&&!element.disabled;
    if(s.startsWith('#'))return element.id===s.slice(1);
    if(s.startsWith('.'))return element.classList.contains(s.slice(1));
    if(s.startsWith('[contenteditable'))return element.attrs.contenteditable!==undefined&&element.attrs.contenteditable!=='false';
    return element.tagName===s.toUpperCase();
  });
}
class Element{
  constructor(tag,doc){
    this.tagName=tag.toUpperCase();this.doc=doc;this.children=[];this.attrs={};this.dataset={};this.handlers={};
    this.parentNode=null;this.hidden=false;this.disabled=false;this.open=false;this.value='';
    this.style={setProperty(k,v){this[k]=v;},getPropertyValue(k){return this[k]||'';}};
    this.classList={contains:c=>this.className.split(/\s+/).includes(c),add:(...cs)=>{this.className=[...new Set([...this.className.split(/\s+/).filter(Boolean),...cs])].join(' ');},remove:(...cs)=>{this.className=this.className.split(/\s+/).filter(c=>!cs.includes(c)).join(' ');},toggle:(c,force)=>{const on=force===undefined?!this.classList.contains(c):force;this.classList[on?'add':'remove'](c);return on;}};
  }
  get ownerDocument(){return this.doc;}
  get className(){return this.attrs.class||'';}set className(v){this.attrs.class=v;}
  get id(){return this.attrs.id||'';}set id(v){this.attrs.id=v;}
  get textContent(){return(this._text||'')+this.children.map(c=>c.textContent).join('');}
  set textContent(v){this._text=String(v);for(const c of this.children)c.parentNode=null;this.children=[];}
  get isConnected(){return this===this.doc.documentElement||Boolean(this.parentNode?.isConnected);}
  get clientWidth(){return this.getBoundingClientRect().width;}get clientHeight(){return this.getBoundingClientRect().height;}
  get width(){return this.native?.width??this._width??300;}set width(v){this._width=Number(v);if(this.native)this.native.width=Number(v);}
  get height(){return this.native?.height??this._height??150;}set height(v){this._height=Number(v);if(this.native)this.native.height=Number(v);}
  setAttribute(k,v){this.attrs[k]=String(v);if(k==='hidden')this.hidden=true;if(k==='disabled')this.disabled=true;if(k==='width'||k==='height')this[k]=Number(v);if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(v);}
  getAttribute(k){return this.attrs[k]??null;}hasAttribute(k){return Object.hasOwn(this.attrs,k);}removeAttribute(k){delete this.attrs[k];}
  contains(el){for(let n=el;n;n=n.parentNode)if(n===this)return true;return false;}
  append(...nodes){for(const node of nodes){node.remove();node.parentNode=this;this.children.push(node);}}
  replaceChildren(...nodes){this.textContent='';this.append(...nodes);}
  remove(){if(this.parentNode){this.parentNode.children=this.parentNode.children.filter(c=>c!==this);this.parentNode=null;}}
  matches(s){return matches(this,s);}closest(s){for(let n=this;n;n=n.parentNode)if(matches(n,s))return n;return null;}
  querySelectorAll(s){const out=[];for(const c of this.children){if(matches(c,s))out.push(c);out.push(...c.querySelectorAll(s));}return out;}
  querySelector(s){return this.querySelectorAll(s)[0]||null;}
  addEventListener(t,f){(this.handlers[t]||=[]).push(f);}removeEventListener(t,f){this.handlers[t]=(this.handlers[t]||[]).filter(x=>x!==f);}
  dispatch(t,event={}){const e={target:this,preventDefault(){},...event};this['on'+t]?.(e);for(const f of this.handlers[t]||[])f(e);}
  click(){if(!this.disabled)this.dispatch('click');}focus(){if(!this.disabled)this.doc.activeElement=this;}
  showModal(){this.open=true;this.querySelector('button')?.focus();}
  close(){if(!this.open)return;this.open=false;queueMicrotask(()=>this.dispatch('close'));}
  getBoundingClientRect(){const r=this.rect||{width:390,height:560};return{...r,left:0,top:0,right:r.width,bottom:r.height};}
  setPointerCapture(id){this.pointer=id;}releasePointerCapture(id){if(this.pointer===id)this.pointer=null;}hasPointerCapture(id){return this.pointer===id;}
  getContext(){if(!this.native)this.native=createCanvas(this._width||300,this._height||150);return this.native.getContext('2d');}
}
const doc={handlers:{},activeElement:null,hidden:false,createElement(tag){return new Element(tag,this);},createTextNode(text){const e=this.createElement('#text');e.textContent=text;return e;},addEventListener(t,f){(this.handlers[t]||=[]).push(f);},removeEventListener(t,f){this.handlers[t]=(this.handlers[t]||[]).filter(x=>x!==f);},dispatch(t,event={}){for(const f of this.handlers[t]||[])f({key:'',target:this.body,preventDefault(){},...event});}};
doc.documentElement=doc.createElement('html');const stack=[doc.documentElement],voids=new Set(['meta','link','input','img','br','hr']);
for(const token of html.matchAll(/<\/?([a-z][\w-]*)([^>]*)>/gi)){
  const[full,name,attrs]=token;if(name.toLowerCase()==='html')continue;
  if(full.startsWith('</')){if(stack.length>1)stack.pop();continue;}
  const element=doc.createElement(name);for(const a of attrs.matchAll(/([\w-]+)(?:="([^"]*)")?/g))element.setAttribute(a[1],a[2]??'');
  stack.at(-1).append(element);if(!voids.has(name.toLowerCase()))stack.push(element);
}
doc.querySelectorAll=s=>doc.documentElement.querySelectorAll(s);doc.querySelector=s=>doc.querySelectorAll(s)[0]||null;
doc.getElementById=id=>[doc.documentElement,...doc.querySelectorAll('*')].find(n=>n.id===id)||null;
doc.body=doc.querySelector('body');doc.activeElement=doc.body;
let rafId=0,stamp=0;const raf=new Map(),requestAnimationFrame=fn=>{raf.set(++rafId,fn);return rafId;},cancelAnimationFrame=id=>raf.delete(id);
const media={matches:false,addEventListener(){},removeEventListener(){}};
const win={innerWidth:390,innerHeight:844,handlers:{},document:doc,requestAnimationFrame,cancelAnimationFrame,addEventListener(t,f){(this.handlers[t]||=[]).push(f);},removeEventListener(t,f){this.handlers[t]=(this.handlers[t]||[]).filter(x=>x!==f);},dispatch(t){for(const f of this.handlers[t]||[])f({});},matchMedia:()=>media};doc.defaultView=win;
const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};
Object.assign(globalThis,{document:doc,window:win,localStorage:storage,requestAnimationFrame,cancelAnimationFrame,devicePixelRatio:1});
const localURL=input=>new URL(String(input),pathToFileURL(base+'app.js'));
const localImage=async input=>loadImage(fileURLToPath(localURL(input)));
const fetcher=async input=>({ok:true,json:async()=>JSON.parse(await fs.readFile(localURL(input),'utf8'))});
globalThis.fetch=fetcher;
const makeCanvas=(w,h)=>createCanvas(w,h);let actual2d,actualArt;const worlds=[],gpuRecords=[];
const makeWorld=options=>{
  const record={frames:0,disposed:0,size:null};gpuRecords.push(record);
  const world=worldModule.createTownWorld3D({...options,makeCanvas,loadImage:localImage,fetcher,rendererFactory:()=>({shadowMap:{},capabilities:{getMaxAnisotropy:()=>4},info:{render:{calls:0}},setPixelRatio(v){record.ratio=v;},setSize(w,h){record.size=[w,h];},render(scene,camera){record.frames++;record.scene=scene;record.camera=camera;},dispose(){record.disposed++;}})});
  worlds.push(world);return world;
};
const context=vm.createContext({console,AbortController,URL,URLSearchParams,Promise,Date,Blob,setTimeout,clearTimeout,performance,structuredClone,...imports,document:doc,window:win,localStorage:storage,innerWidth:390,innerHeight:844,devicePixelRatio:1,matchMedia:()=>media,requestAnimationFrame,cancelAnimationFrame,navigator:{clipboard:{writeText:async()=>{}}},ResizeObserver:class{observe(){}},__worldModule:{createTownWorld3D:makeWorld},
  createTownCharacterArt:options=>(actualArt=imports.createTownCharacterArt({...options,fetcher:async input=>(await fetcher(input)).json(),assets:characterModule.createCharacterAssets({loadImage:async input=>{const image=await localImage(input);if(Math.max(image.width,image.height)<=1024)return image;const scale=1024/Math.max(image.width,image.height),cv=createCanvas(Math.round(image.width*scale),Math.round(image.height*scale));cv.getContext('2d').drawImage(image,0,0,cv.width,cv.height);return cv;}}),loadMonsterImage:localImage})),
  createTownRenderer:options=>(actual2d=imports.createTownRenderer({...options,makeCanvas,loadImage:localImage,fetcher}))
});
const instrumented=source.replace(/^import[^\n]+\n/gm,'').replace(/import\('\.\/world-3d\.js[^']*'\)/,'Promise.resolve(__worldModule)')+'\nglobalThis.api={get ready(){return ready;},get view(){return viewController.snapshot();},get session(){return session;},get loop(){return loop;},get settings(){return settings;},tick,resize,scheduleResize,showSettings,showMenu,closePanel,renderBattle,prepareBattleArt,actBattle};';
vm.runInContext(instrumented,context,{filename:'actual-town-app.js'});const api=context.api,$=doc.getElementById;
async function settle(){for(let i=0;i<15;i++)await Promise.resolve();await new Promise(done=>setTimeout(done,3));}
async function until(check,label){for(let i=0;i<300;i++){if(check())return;await settle();}throw Error('Timeout: '+label);}
async function frame(ms=16){stamp+=ms;const work=[...raf.values()];raf.clear();for(const fn of work)fn(stamp);await settle();}
const results=[];function pass(message){results.push(message);console.log('PASS '+message);}
try{
  await until(()=>api.ready&&api.view.active==='3d','default 3D startup');
  assert.equal($('town-loading').hidden,true);assert.equal($('town-canvas').hidden,true);assert.equal($('town-webgl').hidden,false);
  pass('Default3D startup uses decoded local hero/cat/scenery and switches current canvas only when ready');
  api.closePanel();await settle();await frame();await frame();assert.ok(gpuRecords.at(-1).frames>0);
  pass('Actual app RAF reaches real Three scene renderer with mock GPU backend');
  const start={...api.session.snapshot().state.position};doc.dispatch('keydown',{key:'d'});for(let n=0;n<20;n++)await frame();doc.dispatch('keyup',{key:'d'});assert.ok(api.session.snapshot().state.position.x>start.x);
  pass('Real keydown/keyup handlers move the actual session');
  $('town-main').rect={width:568,height:320};for(const id of['town-canvas','town-webgl'])$(id).rect={width:568,height:214};
  api.scheduleResize();await frame();assert.equal($('town-main').dataset.townOrientation,'landscape');assert.equal(api.session.snapshot().walking,false);assert.deepEqual(gpuRecords.at(-1).size,[568,214]);
  pass('Resize clears held movement, selects landscape and resizes the current Three renderer');
  const checkpoint=JSON.stringify(api.session.snapshot().state);
  api.showSettings();$('town-view-mode').value='2d';$('town-view-mode').onchange();await settle();assert.equal(api.view.active,'2d');assert.equal($('town-canvas').hidden,false);assert.equal($('town-webgl').hidden,true);assert.equal(JSON.stringify(api.session.snapshot().state),checkpoint);api.closePanel();await settle();await frame();
  pass('Settings 3D-to-Canvas switch preserves the exact session and draws through the real Canvas renderer');
  api.showSettings();$('town-view-mode').value='3d';$('town-view-mode').onchange();await until(()=>api.view.active==='3d','cached3D switch');api.closePanel();await settle();await frame();$('town-webgl').dispatch('webglcontextlost');await settle();assert.equal(api.view.active,'2d');assert.equal(api.view.status,'failed');assert.equal($('town-canvas').hidden,false);assert.equal(gpuRecords[0].disposed,1);
  pass('Real webglcontextlost event returns to playable Canvas and releases the failed renderer once');
  api.showSettings();$('town-view-retry').click();await until(()=>api.view.active==='3d','explicit3D retry');assert.equal(worlds.length,2);assert.equal(JSON.stringify(api.session.snapshot().state),checkpoint);api.closePanel();await settle();await frame();
  pass('Explicit retry creates a fresh ready Three world without resetting progress');
  api.session.beginBattle('canal-mist');api.renderBattle();await api.prepareBattleArt();assert.equal($('town-battle-attack').disabled,false);api.actBattle('attack');assert.equal($('town-battle-attack').disabled,true);for(let n=0;n<100;n++)await frame();assert.equal(api.session.snapshot().battle.phase,'player');assert.equal($('town-battle-attack').disabled,false);api.closePanel();await settle();assert.equal(api.session.snapshot().battle,null);assert.ok(values.has('mumei:lantern-town:rpg:v1'));
  pass('Battle decodes real enemy art, locks commands for effects, resolves enemy turn, closes and saves');
  win.dispatch('pagehide');assert.equal(api.loop.running,false);win.dispatch('pageshow');await frame();assert.equal(api.loop.running,true);
  pass('Real pagehide/pageshow handlers suspend and resume the RAF lifecycle');
  console.log(JSON.stringify({checks:results.length,source:base,results,articulatedAssets:actualArt?.art?.rigs?.status?.()||null,limitation:'Simulated DOM/layout/dialogs/clock and mock GPU backend. Real application/controller/assets/native Canvas/Three scene math. No browser, GPU or device QA.'},null,2));
}finally{api.loop.stop();for(const world of worlds)world.destroy();actualArt?.destroy();actual2d?.destroy();}
