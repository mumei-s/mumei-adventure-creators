import test from 'node:test';
import assert from 'node:assert/strict';
import {createFrameLoop} from '../frame-loop.js';
function harness(){
  let serial=0,visible=true;const queued=new Map(),canceled=[],frames=[];
  const loop=createFrameLoop({request:callback=>{const id=++serial;queued.set(id,callback);return id;},cancel:id=>{canceled.push(id);queued.delete(id);},shouldRun:()=>visible,onFrame:(time,dt)=>frames.push({time,dt})});
  return {loop,queued,canceled,frames,show:value=>visible=value,flush(time){const [id,callback]=queued.entries().next().value;queued.delete(id);callback(time);}};
}
test('repeated start and BFCache restart own exactly one frame chain without resumed time jumps',()=>{
  const h=harness();h.loop.start();h.loop.start();assert.equal(h.queued.size,1);
  h.flush(100);h.flush(116);assert.equal(h.frames[1].dt,.016);
  h.loop.stop();assert.equal(h.queued.size,0);h.loop.start();h.loop.start();h.flush(999999);
  assert.equal(h.frames.at(-1).dt,0);assert.equal(h.queued.size,1);
});
test('a canceled callback delivered after stop/start cannot render or duplicate the new chain',()=>{
  const h=harness();h.loop.start();const obsolete=[...h.queued.values()][0];h.loop.stop();h.loop.start();
  obsolete(500);assert.deepEqual(h.frames,[]);assert.equal(h.queued.size,1);h.flush(501);assert.equal(h.frames.length,1);assert.equal(h.queued.size,1);
});
test('hidden or inactive pages stop before drawing and a first visible frame starts from zero',()=>{
  const h=harness();h.show(false);h.loop.start();assert.equal(h.queued.size,0);
  h.show(true);h.loop.start();h.flush(200);h.show(false);h.flush(400);assert.equal(h.frames.length,1);assert.equal(h.loop.running,false);assert.equal(h.queued.size,0);
  h.show(true);h.loop.start();h.flush(200000);assert.equal(h.frames.at(-1).dt,0);
});
test('backward, nonfinite and long timestamps cannot cause a large or negative game step',()=>{
  const h=harness();h.loop.start();for(const now of [100,90,NaN,Infinity,100000])h.flush(now);
  assert(h.frames.every(frame=>Number.isFinite(frame.time)&&frame.dt>=0&&frame.dt<=.05));assert.equal(h.frames.at(-1).dt,.05);
});
test('stopping from a frame callback does not queue another frame',()=>{
  const queued=new Map();let serial=0,loop;
  loop=createFrameLoop({request:cb=>{queued.set(++serial,cb);return serial;},cancel:id=>queued.delete(id),onFrame:()=>loop.stop()});
  loop.start();const cb=queued.get(1);queued.delete(1);cb(100);assert.equal(queued.size,0);assert.equal(loop.running,false);
});
