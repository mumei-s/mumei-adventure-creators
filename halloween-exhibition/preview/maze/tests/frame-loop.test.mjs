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

test('an uncaught frame failure stops before propagation and an explicit restart owns one fresh chain',()=>{
  const queued=new Map();let serial=0,calls=0;const failure=Error('one interrupted draw'),frames=[];
  const loop=createFrameLoop({request:cb=>{queued.set(++serial,cb);return serial;},cancel:id=>queued.delete(id),onFrame:(time,dt)=>{if(++calls===1)throw failure;frames.push({time,dt});}});
  loop.start();const failed=queued.get(1);queued.delete(1);assert.throws(()=>failed(100),error=>error===failure);
  assert.equal(loop.running,false);assert.equal(queued.size,0);
  loop.start();loop.start();assert.equal(queued.size,1);failed(999);assert.equal(calls,1,'stale failed callback cannot reenter the restarted chain');
  const next=queued.get(2);queued.delete(2);next(100000);assert.deepEqual(frames,[{time:100000,dt:0}]);assert.equal(queued.size,1);loop.stop();
});
test('a failure reports once in stopped state without an automatic retry, even if the reporter throws',()=>{
  for(const reporterThrows of [false,true]){
    const queued=new Map();let serial=0,reports=0,loop;const failure=Error('draw failed'),reportError=Error('report failed');
    loop=createFrameLoop({request:cb=>{queued.set(++serial,cb);return serial;},cancel:id=>queued.delete(id),onFrame:()=>{throw failure;},onError:error=>{reports++;assert.equal(error,failure);assert.equal(loop.running,false);assert.equal(queued.size,0);if(reporterThrows)throw reportError;}});
    loop.start();const frame=queued.get(1);queued.delete(1);if(reporterThrows)assert.throws(()=>frame(100),error=>error===reportError);else frame(100);
    assert.equal(reports,1);assert.equal(loop.running,false);assert.equal(queued.size,0);frame(200);assert.equal(reports,1);
  }
});
test('a failing active-state check cannot strand a running loop',()=>{
  const queued=new Map();let serial=0,broken=false,reports=0;
  const loop=createFrameLoop({request:cb=>{queued.set(++serial,cb);return serial;},cancel:id=>queued.delete(id),shouldRun:()=>{if(broken)throw Error('state check failed');return true;},onFrame:()=>assert.fail('must not render'),onError:()=>reports++});
  loop.start();broken=true;const frame=queued.get(1);queued.delete(1);frame(100);assert.equal(loop.running,false);assert.equal(queued.size,0);assert.equal(reports,1);
});
test('a frame that restarts and then throws cancels its replacement generation before reporting',()=>{
  const queued=new Map();let serial=0,loop,reports=0;
  loop=createFrameLoop({request:cb=>{queued.set(++serial,cb);return serial;},cancel:id=>queued.delete(id),onFrame:()=>{loop.stop();loop.start();throw Error('failure after restart');},onError:()=>reports++});
  loop.start();const frame=queued.get(1);queued.delete(1);frame(100);assert.equal(loop.running,false);assert.equal(queued.size,0);assert.equal(reports,1);
});
