import test from 'node:test';
import assert from 'node:assert/strict';
import {bindDirectionPad} from '../maze/game-input.js';
import {mazeWideCamera} from '../camera-distance.js';

function padFixture(){
 const events=new Map(),changes=[],pad={dataset:{},style:{setProperty(){}},addEventListener(type,handler){events.set(type,handler);},setPointerCapture(){},hasPointerCapture(){return true;},releasePointerCapture(){},getBoundingClientRect(){return{left:10,top:20,width:128,height:128};}};
 bindDirectionPad(pad,{mode:'slide',onChange:direction=>changes.push(direction)});
 const emit=(type,x,y,target=pad)=>events.get(type)?.({pointerId:1,button:0,target,clientX:x,clientY:y,cancelable:true,preventDefault(){}});
 return {pad,changes,emit};
}

test('holding an arrow stays in its direction through ordinary thumb drift, while deliberate slides can turn',()=>{
 for(const [direction,x,y] of [['forward',74,28],['back',74,140],['left',18,84],['right',130,84]]){
  const f=padFixture(),arrow={dataset:{move:direction},focus(){},closest(){return this;}};
  f.emit('pointerdown',x,y,arrow);
  for(const [dx,dy] of [[8,2],[-9,3],[6,-4],[-7,-3],[0,0]])f.emit('pointermove',x+dx,y+dy);
  assert.deepEqual(f.changes,[direction],`${direction} cannot turn from a few pixels of drift`);
  f.emit('pointermove',x+100,y);
  assert.equal(f.changes.at(-1),'right','intentional drag remains available');
  f.emit('pointerup',x+100,y);assert.equal(f.changes.at(-1),null,'release stops immediately');
 }
});

test('a neutral touch still chooses directions from its own origin and reverses outside the pad',()=>{
 const f=padFixture();f.emit('pointerdown',74,84);
 assert.deepEqual(f.changes,[]);
 f.emit('pointermove',90,84);assert.equal(f.changes.at(-1),'right');
 f.emit('pointermove',74,62);assert.equal(f.changes.at(-1),'forward');
 f.emit('pointermove',350,84);assert.equal(f.changes.at(-1),'right');
 f.emit('pointermove',310,84);assert.equal(f.changes.at(-1),'left');
});

test('rear-camera wall clearance follows small walking steps continuously without crossing the wall',()=>{
 const wall=(_x,z)=>z>=3;
 for(const mode of ['wide','far']){
  let previous;
  for(let step=0;step<=100;step++){
   const state={x:0,z:step*.01,yaw:0},camera=mazeWideCamera(state,wall,mode);
   assert(Math.abs(camera.distance-(3-.32-state.z))<.00025,'clearance resolves the actual boundary');
   for(const dx of[-.32,.32])for(const dz of[-.32,.32])assert.equal(wall(camera.x+dx,camera.z+dz),false);
   if(previous){assert(Math.abs(camera.distance-previous.distance)<.0103,'no quarter-unit camera jump');assert(Math.abs(camera.y-previous.y)<.0042,'no stepped camera height');}
   previous=camera;
  }
 }
});
