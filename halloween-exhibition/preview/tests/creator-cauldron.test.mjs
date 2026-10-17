import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initCreatorCauldron, cauldronContains, edgeScrollSpeed, CREATOR_BREW_EVENT} from '../creator-cauldron.js';
import {initFestivalScene} from '../festival-scene.js';

class Element {
 constructor(tagName = 'div') {
  this.tagName = tagName.toUpperCase(); this.dataset = {}; this.children = []; this.handlers = new Map(); this.attributes = {};
  this.style = { setProperty: (key, value) => { this.style[key] = value; } }; this.isConnected = true;
  this.classes = new Set(); this.classList = { add: v => this.classes.add(v), remove: v => this.classes.delete(v), toggle: (v, yes) => yes ? this.classes.add(v) : this.classes.delete(v), contains: v => this.classes.has(v) };
  this.rect = {left:100,right:220,top:400,bottom:500,width:120,height:100};
 }
 addEventListener(type, fn, options) { const list = this.handlers.get(type) || []; list.push({fn, capture: options === true}); this.handlers.set(type,list); }
 removeEventListener(type, fn) { this.handlers.set(type,(this.handlers.get(type)||[]).filter(item=>item.fn!==fn)); }
 emit(type, data = {}) {
  const event = {type, target:this, cancelable:true, defaultPrevented:false, preventDefault(){this.defaultPrevented=true}, stopImmediatePropagation(){this.stopped=true}, ...data};
  for (const {fn} of [...this.handlers.get(type)||[]].sort((a,b)=>Number(b.capture)-Number(a.capture))) { fn(event); if(event.stopped)break; }
  return event;
 }
 dispatchEvent(event) { this.emit(event.type,event); }
 append(child) { child.parent = this; this.children.push(child); }
 remove() { this.isConnected = false; if(this.parent)this.parent.children=this.parent.children.filter(el=>el!==this); }
 replaceChildren() { for(const child of this.children)child.isConnected=false; this.children=[]; }
 setAttribute(key,value) { this.attributes[key]=value; }
 closest(selector) { return selector === '.face-dot' && this.classes.has('face-dot') ? this : null; }
 contains(el) { return this === el || this.children.some(child=>child.contains(el)); }
 querySelector(selector) { return this.selectors?.[selector] || null; }
 getBoundingClientRect() { return this.rect; }
 setPointerCapture(id) { this.capture=id; }
 hasPointerCapture(id) { return this.capture===id; }
 releasePointerCapture(id) { if(this.capture===id)this.capture=null; }
 scrollIntoView(options) { this.scrollOptions=options; }
 focus(options) { this.focusOptions=options; this.focused=true; }
 cloneNode() { return new Element(this.tagName); }
}
function fixture({motion = false, sceneController = false} = {}) {
 const root=new Element(), strip=new Element(), target=new Element('button'), scene=new Element(), source=new Element('button'), body=new Element(), doc=new Element(), win=new Element();
 root.dataset={mode:'halloween',palaceState:'gallery'}; source.classList.add('face-dot'); source.dataset={creatorName:'星の作り手',creatorColor:'#a7d4ee'}; strip.append(source); body.append(root);
 const tasks=new Map(),frames=new Map(),observers=[],scrolls=[],activity=[],brews=[]; let id=0;
 const media=new Element(); media.matches=motion;
 Object.assign(doc,{body,hidden:false,createElement:tag=>new Element(tag)});
 Object.assign(win,{innerHeight:700,matchMedia:()=>media,CustomEvent:class{constructor(type,{detail}){this.type=type;this.detail=detail;}},
  setTimeout:fn=>{tasks.set(++id,fn);return id},clearTimeout:id=>tasks.delete(id),requestAnimationFrame:fn=>{frames.set(++id,fn);return id},cancelAnimationFrame:id=>frames.delete(id),
  scrollBy:options=>scrolls.push(options),MutationObserver:class{constructor(fn){this.fn=fn;observers.push(this)}observe(){}disconnect(){this.disconnected=true}}
 });
 const effects=new Element(),status=new Element();scene.selectors={'.festival-effects':effects,'.festival-status':status};
 const stopScene=sceneController?initFestivalScene({scene,root,doc,win}):()=>{};
 scene.addEventListener(CREATOR_BREW_EVENT,event=>brews.push(event.detail));
 const dispose=initCreatorCauldron({strip,target,scene,root,doc,win,onActivity:value=>activity.push(value)});
 const pointer=(type,x,y,extra={})=>strip.emit(type,{target:source,pointerId:1,isPrimary:true,button:0,clientX:x,clientY:y,...extra});
 const runFrame=()=>{const current=[...frames.entries()]; frames.clear(); for(const [,fn]of current)fn(16)};
 const runTimers=()=>{const current=[...tasks.entries()];tasks.clear();for(const [,fn]of current)fn()};
 const ghost=()=>body.children.find(el=>el.className==='creator-drag-ghost');
 return {root,strip,target,scene,source,body,doc,win,media,tasks,frames,scrolls,observers,activity,brews,effects,status,pointer,runFrame,runTimers,ghost,dispose,stopScene};
}
test('drop geometry and bounded edge scroll cover phone edges',()=>{
 const rect={left:10,top:20,right:110,bottom:100,width:100,height:80};
 assert.equal(cauldronContains(rect,10,20),true);assert.equal(cauldronContains(rect,9,50),false);assert.equal(cauldronContains({...rect,width:0},50,50),false);
 assert.equal(edgeScrollSpeed(350,700),0);assert.equal(edgeScrollSpeed(0,700),-12);assert.equal(edgeScrollSpeed(900,700),12);assert(edgeScrollSpeed(660,700)>0);
});
test('ordinary taps remain native and capture stays on the source button',()=>{
 const f=fixture();f.pointer('pointerdown',25,25);assert.equal(f.source.capture,1);assert.equal(f.strip.capture,undefined);
 f.pointer('pointermove',29,29);f.pointer('pointerup',29,29);
 assert.equal(f.ghost(),undefined);assert.equal(f.brews.length,0);assert.deepEqual(f.activity,[true,false]);
 assert.equal(f.strip.emit('click',{target:f.source,detail:1}).defaultPrevented,false);f.dispose();
});
test('ghost drop is creator-colored, never removes the original, and suppresses only the synthetic drag click',()=>{
 const f=fixture({sceneController:true});f.pointer('pointerdown',25,25);f.pointer('pointermove',145,440);
 assert.equal(f.scene.dataset.creatorNear,'true');assert.equal(f.ghost().style['--creator-color'],'#a7d4ee');assert.equal(f.strip.children[0],f.source);
 f.pointer('pointerup',145,440);assert.deepEqual(f.brews,[{name:'星の作り手',color:'#a7d4ee'}]);assert.equal(f.source.isConnected,true);
 assert.equal(f.scene.dataset.magic,'creator');assert.equal(f.effects.children.length,26);assert.match(f.status.textContent,/星の作り手/);
 const click=f.strip.emit('click',{target:f.source,detail:1});assert.equal(click.defaultPrevented,true);assert.equal(click.stopped,true);
 assert.equal(f.strip.emit('click',{target:f.source,detail:0}).defaultPrevented,false);assert.equal(f.frames.size,0);
 f.runTimers();assert.equal(f.ghost(),undefined);assert.equal(f.effects.children.length,0);f.dispose();f.stopScene();
});
test('dropping outside clears without brewing or navigating',()=>{
 const f=fixture();f.pointer('pointerdown',25,25);f.pointer('pointermove',50,300);f.pointer('pointerup',50,300);
 assert.equal(f.brews.length,0);assert.equal(f.ghost(),undefined);assert.equal(f.strip.emit('click',{target:f.source,detail:1}).defaultPrevented,true);f.dispose();
});
test('pointer cancel, capture loss, escape and blur each release all drag state',()=>{
 for(const method of ['pointercancel','lostpointercapture','Escape','blur']){
  const f=fixture();f.pointer('pointerdown',25,25);f.pointer('pointermove',145,440);
  if(method==='Escape')f.doc.emit('keydown',{key:'Escape'});else if(method==='blur')f.win.emit('blur');else f.pointer(method,145,440);
  assert.equal(f.ghost(),undefined,method);assert.equal(f.frames.size,0,method);assert.equal(f.source.capture,null,method);assert.equal(f.brews.length,0,method);assert.equal(f.scene.dataset.creatorTarget,undefined,method);f.dispose();
 }
});
test('only the primary active pointer can move or end a gesture',()=>{
 const f=fixture();f.pointer('pointerdown',25,25,{isPrimary:false});assert.equal(f.source.capture,undefined);
 f.pointer('pointerdown',25,25);f.pointer('pointermove',145,440,{pointerId:2});assert.equal(f.ghost(),undefined);
 f.pointer('pointermove',145,440);f.pointer('pointerup',145,440,{pointerId:2});assert.equal(f.brews.length,0);assert(f.ghost());f.dispose();
});
test('active phone drags scroll at the viewport edge and stop scrolling on release',()=>{
 const f=fixture();f.pointer('pointerdown',25,25);f.pointer('pointermove',145,690);f.runFrame();assert.equal(f.scrolls.length,1);assert(f.scrolls[0].top>0);assert.equal(f.frames.size,1);
 f.pointer('pointerup',145,690);f.runFrame();assert.equal(f.scrolls.length,1);assert.equal(f.frames.size,0);f.dispose();
});
test('visual viewport is used for iOS edge scrolling',()=>{
 const f=fixture();f.win.visualViewport={height:500,offsetTop:40};f.pointer('pointerdown',25,25);f.pointer('pointermove',145,530);f.runFrame();assert(f.scrolls[0].top>0);f.dispose();
});
test('mode switches, removed source, and hidden documents cancel active drags',()=>{
 for(const change of [f=>f.root.dataset.mode='normal',f=>f.root.dataset.palaceState='entrance',f=>f.source.isConnected=false,f=>f.doc.hidden=true]){
  const f=fixture();f.pointer('pointerdown',25,25);f.pointer('pointermove',145,440);change(f);f.observers.forEach(o=>o.fn());assert.equal(f.ghost(),undefined);assert.equal(f.frames.size,0);assert.equal(f.brews.length,0);f.dispose();
 }
});
test('Shift+Enter reaches the pot; plain Enter retains navigation; reduced motion is static',()=>{
 const f=fixture({motion:true,sceneController:true});assert.equal(f.doc.emit('keydown',{key:'Enter',target:f.source}).defaultPrevented,false);
 const key=f.doc.emit('keydown',{key:'Enter',shiftKey:true,target:f.source});assert.equal(key.defaultPrevented,true);assert.equal(f.target.focused,true);assert.equal(f.target.scrollOptions.behavior,'instant');
 assert.equal(f.scene.dataset.still,'true');assert.equal(f.effects.children.length,9);assert.equal(f.effects.children.some(el=>el.className==='creator-brew-bat'),false);assert.equal(f.ghost(),undefined);
 assert.equal(f.doc.emit('keydown',{key:'Enter',shiftKey:true,repeat:true,target:f.source}).defaultPrevented,false);
 f.dispose();f.stopScene();
});
test('repeated drops leave one brew timer and one transient ghost, then dispose clears all',()=>{
 const f=fixture({sceneController:true});for(let i=0;i<30;i++){f.pointer('pointerdown',25,25);f.pointer('pointermove',145,440);f.pointer('pointerup',145,440);}
 assert.equal(f.body.children.length,2);assert.equal(f.effects.children.length,26);assert.equal(f.tasks.size,2);assert.equal(f.frames.size,0);
 f.dispose();f.dispose();f.stopScene();assert.equal(f.tasks.size,0);assert.equal(f.ghost(),undefined);assert(f.observers.every(o=>o.disconnected));
 for(const node of [f.strip,f.doc,f.win])assert.equal([...node.handlers.values()].flat().length,0);
});
test('bfcache clears drag but preserves working handlers after return',()=>{
 const f=fixture();f.pointer('pointerdown',25,25);f.pointer('pointermove',145,440);f.win.emit('pagehide',{persisted:true});assert.equal(f.ghost(),undefined);
 f.pointer('pointerdown',25,25);f.pointer('pointermove',145,440);f.pointer('pointerup',145,440);assert.equal(f.brews.length,1);f.dispose();
});
test('invalid color input uses the bounded fallback and creator text is never parsed as markup',()=>{
 const f=fixture({sceneController:true,motion:true});f.source.dataset.creatorName='<img src=x onerror=alert(1)>';f.source.dataset.creatorColor='red; background:url(https://invalid.example)';
 f.doc.emit('keydown',{key:'Enter',shiftKey:true,target:f.source});assert.equal(f.scene.style['--creator-color'],'#c8a8ed');assert.match(f.status.textContent,/<img src=x/);f.dispose();f.stopScene();
});
test('integration keeps horizontal touch scroll, pinch zoom, bigger portraits, hidden instructions and reduced motion',async()=>{
 const css=await readFile(new URL('../creator-cauldron.css',import.meta.url),'utf8');const theater=await readFile(new URL('../theater.js',import.meta.url),'utf8');
 assert.match(css,/--creator-icon:calc\(var\(--ui-icon,40px\) \+ 8px\)/);assert.match(css,/touch-action:pan-x pinch-zoom/);assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(theater,/aria-keyshortcuts','Shift\+Enter'/);assert.match(theater,/onActivity: active => slideshow\?\.setBlocked\('creator-drag', active\)/);assert.match(theater,/button.addEventListener\('click',\(\)=>navigateDoor/);
 assert.doesNotMatch(css,/content:[^;]*(?:ドラッグ|Shift)/);
});
