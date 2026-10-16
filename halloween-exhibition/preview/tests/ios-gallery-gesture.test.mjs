import test from 'node:test';
import assert from 'node:assert/strict';
import {installGalleryGesture} from '../gallery-gesture.js';

class Target {
  listeners=new Map();
  addEventListener(type,fn){const listeners=this.listeners.get(type)||new Set();listeners.add(fn);this.listeners.set(type,listeners);}
  removeEventListener(type,fn){this.listeners.get(type)?.delete(fn);}
  emit(type,event={}){for(const fn of [...(this.listeners.get(type)||[])])fn(event);}
}
function fixture(){
  const document=new Target(),window=new Target(),stage=new Target(),navigation=[];
  document.defaultView=window;document.hidden=false;stage.ownerDocument=document;
  const cleanup=installGalleryGesture(stage,{onNavigate:value=>navigation.push(value)});
  const pointer=(id,x=0)=>({pointerId:id,pointerType:'touch',clientX:x,clientY:0,target:{closest:()=>null},preventDefault(){throw Error('Native scrolling must stay enabled');}});
  const down=id=>{document.emit('pointerdown',pointer(id));stage.emit('pointerdown',pointer(id));};
  const up=id=>document.emit('pointerup',pointer(id,-70));
  return {document,window,stage,navigation,down,up,cleanup};
}

for(const interruption of ['pagehide','orientationchange','visibilitychange','pageshow'])test(`gallery abandoned touch is cleared on ${interruption} without a phantom swipe`,()=>{
  const h=fixture();h.down(1);
  if(interruption==='visibilitychange'){h.document.hidden=true;h.document.emit(interruption);h.document.hidden=false;h.document.emit(interruption);}
  else h.window.emit(interruption,{persisted:true});
  h.up(1);assert.deepEqual(h.navigation,[]);h.down(2);h.up(2);assert.deepEqual(h.navigation,[1]);h.cleanup();
});

test('a visible visibilitychange or initial pageshow does not discard a real in-progress swipe',()=>{
  const h=fixture();h.down(1);h.document.emit('visibilitychange');h.window.emit('pageshow',{persisted:false});h.up(1);assert.deepEqual(h.navigation,[1]);h.cleanup();
});

test('gallery lifecycle cleanup removes every newly registered listener',()=>{
  const h=fixture();h.down(1);h.cleanup();
  for(const target of [h.document,h.window,h.stage])for(const handlers of target.listeners.values())assert.equal(handlers.size,0);
  h.window.emit('pageshow',{persisted:true});h.down(2);h.up(2);assert.deepEqual(h.navigation,[]);
});
