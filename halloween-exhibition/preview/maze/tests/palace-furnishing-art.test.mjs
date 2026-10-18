import test from 'node:test';
import assert from 'node:assert/strict';
import {drawFurnishingFallback,FURNISHING_KINDS} from '../palace-furnishing-art.js';
import {PALACE_FURNISHINGS} from '../stage-2d.js';

function context(){
  const calls=[];let depth=0;
  const canvas=new Proxy({save(){depth++;calls.push(['save']);},restore(){depth--;calls.push(['restore']);}},{
    get:(target,key)=>key in target?target[key]:(...args)=>calls.push([key,...args]),set:(target,key,value)=>{target[key]=value;return true;}
  });
  return {canvas,calls,depth:()=>depth};
}

test('every authored palace furnishing has an identifiable offline substitute at its sprite feet',()=>{
  assert.deepEqual(new Set(PALACE_FURNISHINGS.map(item=>item.kind)),new Set(FURNISHING_KINDS));
  for(const object of PALACE_FURNISHINGS){
    const {canvas,calls,depth}=context();assert.equal(drawFurnishingFallback(canvas,object),true,object.kind);
    assert.deepEqual(calls[1],['translate',object.x,object.y]);assert.deepEqual(calls[2],['scale',object.size/100,object.size/100]);
    assert.equal(depth(),0,'drawing never leaks a transformation into the next object');
    assert.ok(calls.some(item=>['fillRect','fill','stroke'].includes(item[0])),object.kind+' has visible furniture');
    assert.ok(calls.length<380,'offline furniture remains a bounded fallback');
    assert.ok(calls.every(item=>!['drawImage','createRadialGradient','roundRect','fillText'].includes(item[0])),'no network image, anonymous glowing capsule or invented work title');
    for(const call of calls)for(const arg of call.slice(1))if(typeof arg==='number')assert.ok(Number.isFinite(arg));
  }
});

test('furniture kinds do not all collapse to the same shape, and reduced artwork inputs are stable',()=>{
  const shapes=new Set();
  for(const kind of FURNISHING_KINDS){const {canvas,calls}=context();drawFurnishingFallback(canvas,{kind,x:0,y:0,size:100});shapes.add(JSON.stringify(calls));}
  assert.equal(shapes.size,FURNISHING_KINDS.length);
  for(const kind of ['column','window','pumpkins']){const {canvas}=context();assert.equal(drawFurnishingFallback(canvas,{kind,x:1,y:2,size:0}),true);}
  for(const object of [null,{kind:'unknown',x:0,y:0},{kind:'constructor',x:0,y:0},{kind:'palaceColumn',x:NaN,y:0}]){
    const {canvas,calls}=context();assert.equal(drawFurnishingFallback(canvas,object),false);assert.equal(calls.length,0);
  }
});
