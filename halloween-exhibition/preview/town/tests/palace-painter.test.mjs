import test from 'node:test';
import assert from 'node:assert/strict';
import {drawTownPalace2D} from '../palace-painter.js';

function harness(){
  const records=[];
  function canvas(){
    const calls=[],image={width:0,height:0,ownerDocument:{createElement:()=>canvas()}};
    const context=new Proxy({canvas:image,createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})}, {
      get:(target,key)=>key in target?target[key]:(...args)=>calls.push([key,...args]),set:(target,key,value)=>{target[key]=value;return true;}
    });
    image.getContext=()=>context;records.push({canvas:image,context,calls});return image;
  }
  const root=canvas();return {root,context:root.getContext('2d'),records};
}
const castle={x:25,z:1,w:14,h:5,door:{x:32.5,z:6.5}};

test('detailed 2D palace is cached once while flags and crest remain animated',()=>{
  const {context,records}=harness();drawTownPalace2D(context,castle,{time:1});
  assert.equal(records.length,2,'one offscreen facade and the existing world canvas');
  const painting=records[1],staticWork=painting.calls.length;assert.ok(staticWork>1000,'the stone, slate and window details are painted');
  const first=records[0].calls.slice();records[0].calls.length=0;
  drawTownPalace2D(context,castle,{time:1.02});
  assert.equal(painting.calls.length,staticWork,'detailed architecture is not repainted every animation frame');
  assert.ok(records[0].calls.length<160,'only the small moving flags and crest redraw');
  assert.notDeepEqual(records[0].calls,first,'time advances the flags without translating the palace');
  assert.equal(records[0].calls.filter(item=>item[0]==='drawImage').length,1);
});

test('reduced motion freezes palace flags and full facade stays available without an offscreen canvas',()=>{
  const {context,records}=harness();drawTownPalace2D(context,castle,{time:1,motion:false});records[0].calls.length=0;
  drawTownPalace2D(context,castle,{time:2,motion:false});const first=records[0].calls.slice();records[0].calls.length=0;
  drawTownPalace2D(context,castle,{time:40,motion:false});assert.deepEqual(records[0].calls,first);
  const direct=harness();delete direct.context.canvas.ownerDocument;
  drawTownPalace2D(direct.context,castle,{cache:false,motion:false});assert.ok(direct.records[0].calls.length>1000);
});
