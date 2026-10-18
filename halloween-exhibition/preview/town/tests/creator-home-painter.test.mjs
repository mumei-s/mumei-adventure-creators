import test from 'node:test';
import assert from 'node:assert/strict';
import {CREATOR_HOMES} from '../creator-homes.js';
import {drawCreatorHome2D,drawCreatorQuarterGate2D,CREATOR_HOME_MOTIFS} from '../creator-home-painter.js';

function harness({cache=true}={}){
 const records=[];
 function createCanvas(){
  const calls=[],canvas={width:0,height:0};if(cache)canvas.ownerDocument={createElement:()=>createCanvas()};
  let depth=0;
  const context=new Proxy({canvas,save(){depth++;calls.push(['save']);},restore(){depth--;calls.push(['restore']);},createLinearGradient:()=>({addColorStop(){}})}, {
   get:(target,key)=>key in target?target[key]:(...args)=>calls.push([key,...args]),set:(target,key,value)=>{target[key]=value;return true;}
  });canvas.getContext=()=>context;records.push({canvas,context,calls,depth:()=>depth});return canvas;
 }
 const canvas=createCanvas();return {canvas,context:canvas.getContext('2d'),records};
}

test('all sixteen approved home themes have distinct native art, signs, and matching entry coordinates',()=>{
 assert.equal(CREATOR_HOMES.length,16);assert.deepEqual(new Set(CREATOR_HOMES.map(b=>b.motif)),new Set(CREATOR_HOME_MOTIFS));
 const signatures=new Set();
 for(const home of CREATOR_HOMES){
  const {context,records}=harness();assert.equal(drawCreatorHome2D(context,home),true);assert.equal(records.length,2);
  assert.deepEqual(records[0].calls[1],['translate',home.x*64,(home.z+home.h)*64]);assert.deepEqual(records[0].calls[2],['scale',home.w*64/320,home.w*64/320]);
  const paint=records[1].calls,text=paint.filter(call=>call[0]==='fillText');assert.deepEqual(text.map(call=>call[1]),[home.creatorName,home.homeLabel]);
  const localDoor=(home.door.x-home.x)*320/home.w,door=paint.find(call=>call[0]==='roundRect'&&call[2]===-80&&call[3]===50);
  assert.ok(door,'the house has a real entrance');assert.equal((door[1]+25)*home.w*64/320+home.x*64,home.door.x*64);
  assert.equal(records[0].depth(),0);assert.equal(records[1].depth(),0);
  for(const call of paint)for(const value of call.slice(1))if(typeof value==='number')assert.ok(Number.isFinite(value));
  assert.ok(paint.length<5000,'ornament is bounded');signatures.add(JSON.stringify(paint));
 }
 assert.equal(signatures.size,16);
});

test('creator identities change the architecture even when palette, sign, and emblem are identical',()=>{
 const signatures=new Set();
 for(const home of CREATOR_HOMES){
  const {context,records}=harness();
  drawCreatorHome2D(context,{...home,creatorId:'same',creatorName:'Same',homeLabel:'Same',motif:'lantern',homePalette:{wall:'#bcc4b7',roof:'#566875',trim:'#b79b6d'}});
  // Comparing drawing commands, rather than source strings, catches a return to
  // palette swaps and emblem-only differences on otherwise identical buildings.
  signatures.add(JSON.stringify(records[1].calls));
 }
 assert.equal(signatures.size,16,'each house has its own roof, windows, or facade construction');
});

test('the rendered entrance follows an off-center doorstep for every architecture',()=>{
 for(const home of CREATOR_HOMES){
  const b={...home,door:{x:home.x+2.25,z:home.z+home.h+.6}}, {context,records}=harness();
  drawCreatorHome2D(context,b);const calls=records[1].calls,door=calls.find(call=>call[0]==='roundRect'&&call[2]===-80&&call[3]===50);
  assert.equal((door[1]+25)*b.w/320+b.x,b.door.x);
  const step=calls.findLast(call=>call[0]==='roundRect'&&call[2]===-1&&call[3]===58);
  assert.equal((step[1]+29)*b.w/320+b.x,b.door.x,'front ornaments cannot move the playable entrance');
 }
});

test('static home art paints once and the cache bounds repeated palette/name edits',()=>{
 const {context,records}=harness(),home=CREATOR_HOMES[0];drawCreatorHome2D(context,home);const first=records[1].calls.length;
 for(let n=0;n<100;n++)drawCreatorHome2D(context,home);
 assert.equal(records.length,2);assert.equal(records[1].calls.length,first,'a rendered frame only composites the cached house');
 for(let n=0;n<30;n++)drawCreatorHome2D(context,{...home,creatorName:'Test '+n});const count=records.length;drawCreatorHome2D(context,home);assert.equal(records.length,count+1,'the original is evicted instead of keeping an unbounded edit history');
 const direct=harness({cache:false});assert.equal(drawCreatorHome2D(direct.context,home),true);assert.equal(direct.records.length,1);assert.ok(direct.records[0].calls.some(call=>call[0]==='fillText'));
});

test('quarter travel gates name both destinations while keeping the center passage open',()=>{
 for(const [to,label]of[['creator-quarter','参加者の住宅街 →'],['lantern-town','← 星灯りの街']]){
  const {context,records}=harness({cache:false}),portal={x:18.5,z:43.5,to};assert.equal(drawCreatorQuarterGate2D(context,portal),true);
  const calls=records[0].calls;assert.deepEqual(calls[1],['translate',portal.x*64,portal.z*64]);assert.equal(calls.find(call=>call[0]==='fillText')[1],label);
  let depth=0;const boxes=calls.filter(call=>{if(call[0]==='save')depth++;if(call[0]==='restore')depth--;return call[0]==='roundRect'&&depth===1;});assert.ok(boxes.every(call=>call[2]+call[4]<-20||call[1]>30||call[1]+call[3]<-30),'no solid sign or base blocks the travel point');assert.equal(records[0].depth(),0);
 }
 assert.equal(drawCreatorHome2D(harness().context,{x:0,z:0,w:0,h:5}),false);assert.equal(drawCreatorQuarterGate2D(harness().context,{x:NaN,z:0}),false);
});
