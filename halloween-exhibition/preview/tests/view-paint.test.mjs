import test from 'node:test';
import assert from 'node:assert/strict';
import {afterViewPaint} from '../view-paint.js';
function scheduler(){let id=0;const frames=new Map();return {frames,requestFrame:fn=>{frames.set(++id,fn);return id;},cancelFrame:id=>frames.delete(id),frame(){const [id,fn]=frames.entries().next().value;frames.delete(id);fn();}};}
test('a construction boundary spans two real animation frames, not a timer',async()=>{
 const clock=scheduler();let ready=false;const request=afterViewPaint(undefined,clock).then(()=>ready=true);
 await Promise.resolve();assert.equal(ready,false);clock.frame();await Promise.resolve();assert.equal(ready,false);clock.frame();await request;assert.equal(ready,true);assert.equal(clock.frames.size,0);
});
for(const completedFrames of [0,1])test('cancelling after '+completedFrames+' frames releases the frame and rejects preparation',async()=>{
 const clock=scheduler(),abort=new AbortController(),request=afterViewPaint(abort.signal,clock);if(completedFrames)clock.frame();abort.abort();await assert.rejects(request,/cancelled/);assert.equal(clock.frames.size,0);
});
test('an already-cancelled request schedules no work',async()=>{const clock=scheduler(),abort=new AbortController();abort.abort();await assert.rejects(afterViewPaint(abort.signal,clock),/cancelled/);assert.equal(clock.frames.size,0);});
