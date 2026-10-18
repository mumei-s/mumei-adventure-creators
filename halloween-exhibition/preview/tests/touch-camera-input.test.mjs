import test from 'node:test';
import assert from 'node:assert/strict';
import {bindDirectionPad} from '../maze/game-input.js';
import {PAD_MODE_KEY,normalizePadMode,readPadMode,savePadMode} from '../control-preferences.js';
import {bindPinchZoom,normalizeTouchZoom} from '../touch-camera.js';

class Target{
 constructor(){this.events=new Map();this.dataset={};this.capture=new Set();this.css=new Map();this.style={setProperty:(k,v)=>this.css.set(k,v),getPropertyValue:k=>this.css.get(k)||'',removeProperty:k=>this.css.delete(k)};}
 addEventListener(type,handler,options={}){const list=this.events.get(type)||[];list.push({handler,capture:options===true||!!options.capture});this.events.set(type,list);}
 removeEventListener(type,handler){this.events.set(type,(this.events.get(type)||[]).filter(item=>item.handler!==handler));}
 emit(type,values={}){const event={type,target:this,pointerType:'touch',pointerId:1,button:0,clientX:0,clientY:0,cancelable:true,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},stopImmediatePropagation(){this.stopped=true;},...values};for(const {handler}of[...(this.events.get(type)||[])].sort((a,b)=>Number(b.capture)-Number(a.capture))){handler(event);if(event.stopped)break;}return event;}
 setPointerCapture(id){if(this.captureError)throw Error('capture failed');this.capture.add(id);}
 hasPointerCapture(id){return this.capture.has(id);}
 releasePointerCapture(id){if(!this.capture.delete(id))return;this.emit('lostpointercapture',{pointerId:id});}
 closest(){return this.interactive?this:null;}
 contains(target){return target===this;}
 getBoundingClientRect(){return {left:10,top:20,width:128,height:128};}
 focus(){}
}
function lifecycle(target){const window=new Target(),document=new Target();document.defaultView=window;window.document=document;target.ownerDocument=document;return {window,document};}
function slide(){const pad=new Target(),life=lifecycle(pad),changes=[];let mode='slide';const binding=bindDirectionPad(pad,{mode:()=>mode,onChange:value=>changes.push(value)});return {pad,changes,...life,...binding,setMode:value=>mode=value};}
function pinch(options={}){const surface=new Target(),life=lifecycle(surface),changes=[];let zoom=1,starts=0,ends=0;const binding=bindPinchZoom(surface,{getZoom:()=>zoom,onChange:value=>{zoom=value;changes.push(value);},onStart:()=>starts++,onEnd:()=>ends++,...options});return {surface,changes,...life,...binding,get zoom(){return zoom;},get starts(){return starts;},get ends(){return ends;}};}
const down=(surface,pointerId,x,y=50)=>surface.emit('pointerdown',{pointerId,clientX:x,clientY:y});
const move=(surface,pointerId,x,y=50)=>surface.emit('pointermove',{pointerId,clientX:x,clientY:y});
const up=(surface,pointerId)=>surface.emit('pointerup',{pointerId});

test('new players receive slide mode and a fixed-pad preference survives storage round trips',()=>{
 const values=new Map(),storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};
 assert.equal(readPadMode(storage),'slide');assert.deepEqual(savePadMode('fixed',storage),{ok:true,mode:'fixed'});assert.equal(values.get(PAD_MODE_KEY),'fixed');assert.equal(readPadMode(storage),'fixed');
 assert.equal(normalizePadMode('bad'),'slide');assert.deepEqual(savePadMode('slide',null),{ok:false,mode:'slide'});assert.equal(readPadMode({getItem(){throw Error();}}),'slide');
});
test('slide mode starts from the pressed arrow and ignores tiny thumb jitter',()=>{
 const {pad,changes}=slide(),button=new Target();button.dataset.move='right';button.closest=()=>button;
 down(pad,1,70,30).defaultPrevented;
 // An actual arrow button remains an immediate directional target.
 pad.emit('pointercancel');changes.length=0;
 pad.emit('pointerdown',{target:button,pointerId:2,clientX:126,clientY:84});
 assert.deepEqual(changes,['right']);move(pad,2,128,86);assert.deepEqual(changes,['right']);
 assert.equal(pad.dataset.padMode,'slide');assert.equal(pad.dataset.padActive,'true');up(pad,2);assert.equal(changes.at(-1),null);
});
test('slide mode follows the initial touch position rather than a fixed screen center',()=>{
 const {pad,changes}=slide();down(pad,1,74,84);assert.deepEqual(changes,[]);
 move(pad,1,90,84);assert.equal(changes.at(-1),'right');move(pad,1,74,62);assert.equal(changes.at(-1),'forward');move(pad,1,74,84);assert.equal(changes.at(-1),null);
});
test('an overextended captured thumb can reverse with a short slide outside the pad',()=>{
 const {pad,changes,isActive}=slide();down(pad,1,74,84);move(pad,1,350,84);assert(isActive());assert.equal(changes.at(-1),'right');
 move(pad,1,310,84);assert.equal(changes.at(-1),'left');assert(pad.hasPointerCapture(1));up(pad,1);assert(!isActive());assert.equal(changes.at(-1),null);
});
test('slide-pad hysteresis stabilizes diagonals and rejects a second pointer',()=>{
 const {pad,changes}=slide();down(pad,1,74,84);move(pad,1,96,84);move(pad,1,94,62);assert.equal(changes.at(-1),'right');down(pad,2,10,84);up(pad,2);assert.equal(changes.at(-1),'right');move(pad,1,74,40);assert.equal(changes.at(-1),'forward');
});
test('slide pad stops on cancellation, lost capture, page hiding, focus loss and rotation',()=>{
 for(const action of ['pointercancel','lostpointercapture','blur','pagehide','orientationchange','visibilitychange']){
  const fixture=slide();down(fixture.pad,1,74,28);assert(fixture.isActive());
  if(action==='lostpointercapture')fixture.pad.releasePointerCapture(1);
  else if(action==='visibilitychange'){fixture.document.hidden=true;fixture.document.emit(action);}
  else (['blur','pagehide','orientationchange'].includes(action)?fixture.window:fixture.pad).emit(action);
  assert(!fixture.isActive(),action);assert.equal(fixture.changes.at(-1),null,action);assert(!fixture.pad.hasPointerCapture(1),action);
 }
});
test('mode changes preserve the original fixed-pad directions and destroy removes input listeners',()=>{
 const fixture=slide();fixture.setMode('fixed');fixture.refresh();assert.equal(fixture.pad.dataset.padMode,'fixed');down(fixture.pad,1,74,28);move(fixture.pad,1,130,84);assert.equal(fixture.changes.at(-1),'right');fixture.destroy();const count=fixture.changes.length;down(fixture.pad,2,74,28);assert.equal(fixture.changes.length,count);
});

test('pinch lets one-finger taps through, then captures two scene fingers and zooms continuously',()=>{
 const f=pinch();let taps=0;f.surface.addEventListener('pointerup',()=>taps++);
 assert(!down(f.surface,1,10).defaultPrevented);assert(!f.isActive());assert(!up(f.surface,1).defaultPrevented);assert.equal(taps,1);
 down(f.surface,1,10);const second=down(f.surface,2,110);assert(second.defaultPrevented);assert(f.isActive());assert.equal(f.starts,1);assert(f.surface.hasPointerCapture(1));assert(f.surface.hasPointerCapture(2));
 move(f.surface,2,130);assert.equal(f.zoom,1.2);move(f.surface,2,80);assert.equal(f.zoom,.7);assert(f.consumesPointer(1));
 assert(up(f.surface,1).defaultPrevented);assert(f.isActive());const final=up(f.surface,2);assert(final.defaultPrevented);assert(f.consumesPointer(final));assert(!f.isActive());assert.equal(f.ends,1);assert.equal(taps,1);
});
test('pinch clamps continuous magnification without affecting saved zoom defaults',()=>{
 const f=pinch();down(f.surface,1,0);down(f.surface,2,100);move(f.surface,2,500);assert.equal(f.zoom,1.4);move(f.surface,2,10);assert.equal(f.zoom,.65);
 assert.equal(normalizeTouchZoom(NaN),1);assert.equal(normalizeTouchZoom(-Infinity),1);
});
test('pinch recognition clears old tap/look holds before reacquiring scene capture',()=>{
 const surface=new Target(),life=lifecycle(surface);let binding,starts=0;
 binding=bindPinchZoom(surface,{onStart(){starts++;binding.reset();surface.releasePointerCapture(1);}});
 down(surface,1,0);surface.setPointerCapture(1);down(surface,2,100);assert.equal(starts,1);assert(binding.isActive());assert(surface.hasPointerCapture(1));assert(surface.hasPointerCapture(2));
 // A queued old capture loss does not erase a currently captured pinch.
 surface.emit('lostpointercapture',{pointerId:1});assert(binding.isActive());up(surface,1);up(surface,2);assert(!binding.isActive());assert(life.window);
});
test('a HUD-origin touch or mouse cannot participate in scene pinch',()=>{
 const f=pinch(),button=new Target();button.interactive=true;
 f.surface.emit('pointerdown',{target:button,pointerId:1,clientX:0});down(f.surface,2,100);assert(!f.isActive());up(f.surface,2);
 f.surface.emit('pointerdown',{pointerType:'mouse',pointerId:1,clientX:0});down(f.surface,2,100);assert(!f.isActive());assert.equal(f.starts,0);
});
test('a remaining finger and an extra third finger cannot trigger a tap after pinch',()=>{
 const f=pinch();let taps=0;f.surface.addEventListener('pointerup',()=>taps++);down(f.surface,1,0);down(f.surface,2,100);down(f.surface,3,200);up(f.surface,2);move(f.surface,1,10);up(f.surface,1);assert(f.isActive());up(f.surface,3);assert(!f.isActive());assert.equal(taps,0);assert.equal(f.ends,1);
});
test('coincident fingers establish a safe distance baseline without jumping zoom',()=>{
 const f=pinch();down(f.surface,1,20);down(f.surface,2,20);move(f.surface,2,30);assert.deepEqual(f.changes,[]);move(f.surface,2,40);assert.deepEqual(f.changes,[]);move(f.surface,2,44);assert.equal(f.zoom,1.2);
});
test('cancel, focus loss, hidden pages and rotation reset all pinch captures',()=>{
 for(const action of ['pointercancel','lostpointercapture','blur','pagehide','orientationchange','visibilitychange']){
  const f=pinch();down(f.surface,1,0);down(f.surface,2,100);
  if(action==='lostpointercapture')f.surface.releasePointerCapture(1);
  else if(action==='visibilitychange'){f.document.hidden=true;f.document.emit(action);}
  else (['blur','pagehide','orientationchange'].includes(action)?f.window:f.surface).emit(action);
  assert(!f.isActive(),action);assert.equal(f.ends,1,action);assert.equal(f.surface.capture.size,0,action);assert.equal(f.surface.dataset.pinchActive,'false',action);
 }
});
test('blocked dialogs and failed capture cannot strand a gesture; destroy restores scene-only styling',()=>{
 let blocked=true;const f=pinch({blocked:()=>blocked});assert.equal(f.surface.css.get('touch-action'),'none');down(f.surface,1,0);down(f.surface,2,100);assert(!f.isActive());blocked=false;down(f.surface,1,0);f.surface.captureError=true;down(f.surface,2,100);assert(!f.isActive());f.surface.captureError=false;f.destroy();assert(!f.surface.css.has('touch-action'));assert.equal(f.surface.dataset.gameCamera,undefined);down(f.surface,1,0);down(f.surface,2,100);assert(!f.isActive());
});
