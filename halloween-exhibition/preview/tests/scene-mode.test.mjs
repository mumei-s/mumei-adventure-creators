import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../scene-motion.js',import.meta.url),'utf8');

function harness({mode='halloween',reduced=false}={}){
 class E{
  constructor(tag='div'){this.tagName=tag;this.children=[];this.dataset={};this.attrs={};this.style={};this.handlers={};this.hidden=false;}
  append(child){child.parentNode=this;this.children.push(child);}
  remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(c=>c!==this);}
  setAttribute(k,v){this.attrs[k]=String(v);}
  addEventListener(k,fn){(this.handlers[k]||=[]).push(fn);}
  dispatchEvent(e){for(const fn of this.handlers[e.type]||[])fn(e);}
  click(){for(const fn of this.handlers.click||[])fn({target:this});}
  getContext(){return null;}
  getBoundingClientRect(){return {left:0,top:0,width:400,height:606};}
  querySelectorAll(s){const out=[];const visit=e=>{for(const c of e.children){if(s.startsWith('.')&&(c.className||'').split(' ').includes(s.slice(1)))out.push(c);visit(c);}};visit(this);return out;}
  querySelector(s){return this.querySelectorAll(s)[0]||null;}
 }
 const root=new E();root.dataset={mode,creatorId:'ss_yr',sealRooms:'["ss_yr","other","third"]',seals:'[]'};
 const stage=new E();stage.className='stage';root.append(stage);const settings=new E();const body=new E();body.append(root);body.append(settings);
 const observers=[];const media={matches:reduced,addEventListener(){}};
 const doc={body,hidden:false,createElement:t=>new E(t),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}};
 const pending=new Map(),windowEvents={};let sequence=0;
 const context=vm.createContext({document:doc,window:{addEventListener(k,fn){windowEvents[k]=fn;}},matchMedia:()=>media,devicePixelRatio:1,AbortController,
  MutationObserver:class{constructor(fn){this.fn=fn;observers.push(this);}observe(){}disconnect(){}},ResizeObserver:class{observe(){}disconnect(){}},
  requestAnimationFrame:fn=>{const id=++sequence;pending.set(id,fn);return id;},cancelAnimationFrame:id=>pending.delete(id),localStorage:{getItem(){return null;},setItem(){}},
  CustomEvent:class{constructor(type,init){this.type=type;Object.assign(this,init);}}
 });
 vm.runInContext(source.replace('export function','function')+'\nglobalThis.start=initSceneMotion;',context);
 const api=context.start(root,{controlsParent:settings});
 const changeMode=value=>{root.dataset.mode=value;observers[0].fn([{attributeName:'data-mode'}]);};
 return {root,settings,body,api,changeMode,pending,windowEvents,observers,seeds:stage.querySelector('.scene-seeds')};
}

test('normal mode hides the light game and rejects collection even if a hidden button is invoked',()=>{
 const h=harness({mode:'normal'});assert.equal(h.seeds.hidden,true);assert.equal(h.seeds.children.every(b=>b.hidden),true);
 assert.equal(h.root.dataset.constellation,'false');assert.equal(h.settings.querySelector('.scene-count').textContent,'');
 h.seeds.children[0].click();assert.equal(h.root.dataset.seals,'[]');h.api.destroy();
});

test('retired light game stays hidden across modes and cannot change saved progress',()=>{
 const h=harness();assert.equal(h.seeds.hidden,true);assert.equal(h.seeds.children.every(b=>b.hidden),true);
 h.seeds.children[0].click();assert.equal(h.root.dataset.seals,'[]');
 h.root.dataset.seals='["light-1"]';h.changeMode('normal');h.changeMode('halloween');
 assert.equal(h.seeds.hidden,true);assert.equal(h.root.dataset.seals,'["light-1"]');assert.equal(h.root.dataset.constellation,'false');
 assert.equal(h.settings.querySelector('.scene-count').textContent,'');h.api.destroy();
});

test('clearly labelled ambience toggle lives in settings and respects reduced motion',()=>{
 const h=harness();const button=h.settings.querySelector('.scene-pause');assert.equal(button.textContent,'演出を止める');
 assert.equal(h.root.querySelector('.scene-controls'),null);button.click();assert.equal(button.textContent,'演出を動かす');assert.equal(h.body.dataset.ambientPaused,'true');h.api.destroy();
 const reduced=harness({reduced:true});assert.equal(reduced.settings.querySelector('.scene-pause').textContent,'演出は静止（端末設定）');assert.equal(reduced.settings.querySelector('.scene-pause').disabled,true);reduced.api.destroy();
});

test('temporary exit pause can restore the real user setting even under reduced motion',()=>{
 for(const reduced of [false,true]){
  const h=harness({reduced});assert.equal(h.api.isUserPaused(),false);
  const original=h.api.isUserPaused();h.api.setPaused(true);assert.equal(h.api.isUserPaused(),true);
  h.api.setPaused(original);assert.equal(h.api.isUserPaused(),false);h.api.destroy();
 }
 const h=harness();h.settings.querySelector('.scene-pause').click();assert.equal(h.api.isUserPaused(),true);
 const original=h.api.isUserPaused();h.api.setPaused(true);h.api.setPaused(original);assert.equal(h.api.isUserPaused(),true);h.api.destroy();
});

test('page suspension, hidden root and destruction cannot leave or restart background loops',()=>{
 const h=harness();assert.equal(h.pending.size,1);const stale=[...h.pending.values()][0];
 h.windowEvents.pagehide();assert.equal(h.pending.size,0);assert.equal(h.root.dataset.motionPaused,'true');
 h.api.setPaused(false);assert.equal(h.pending.size,0);stale(100000);assert.equal(h.pending.size,0);
 h.windowEvents.pageshow();assert.equal(h.pending.size,1);stale(100001);assert.equal(h.pending.size,1,'a queued pre-suspend callback cannot multiply the restored loop');h.windowEvents.pageshow();assert.equal(h.pending.size,1);
 h.root.hidden=true;h.observers[0].fn([{attributeName:'hidden'}]);assert.equal(h.pending.size,0);
 h.root.hidden=false;h.observers[0].fn([{attributeName:'hidden'}]);assert.equal(h.pending.size,1);
 h.api.destroy();assert.equal(h.pending.size,0);h.windowEvents.pageshow();assert.equal(h.pending.size,0);
});
