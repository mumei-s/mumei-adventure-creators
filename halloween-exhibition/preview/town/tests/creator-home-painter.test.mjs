import test from 'node:test';
import assert from 'node:assert/strict';
import {CREATOR_HOMES} from '../creator-homes.js';
import {drawCreatorHome2D,drawCreatorQuarterGate2D,CREATOR_HOME_MOTIFS} from '../creator-home-painter.js';

function harness({cache=true}={}){
 const records=[];
 function createCanvas(){
  const calls=[],gradients=[],canvas={width:0,height:0};if(cache)canvas.ownerDocument={createElement:()=>createCanvas()};
  let depth=0;
  const context=new Proxy({canvas,save(){depth++;calls.push(['save']);},restore(){depth--;calls.push(['restore']);},createLinearGradient(...coordinates){const value={coordinates,stops:[],addColorStop(at,color){this.stops.push([at,color]);}};gradients.push(value);return value;}}, {
   get:(target,key)=>key in target?target[key]:(...args)=>calls.push([key,...args]),set:(target,key,value)=>{target[key]=value;return true;}
  });canvas.getContext=()=>context;records.push({canvas,context,calls,gradients,depth:()=>depth});return canvas;
 }
 const canvas=createCanvas();return {canvas,context:canvas.getContext('2d'),records};
}

test('all seventeen approved home themes have distinct native art, signs, and matching entry coordinates',()=>{
 assert.equal(CREATOR_HOMES.length,17);assert.deepEqual(new Set(CREATOR_HOMES.map(b=>b.motif)),new Set(CREATOR_HOME_MOTIFS));
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
 assert.equal(signatures.size,17);
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
 assert.equal(signatures.size,17,'each house has its own roof, windows, or facade construction');
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

test('every home bakes directional material light, window reflections, and contact shadows into the bounded cache',()=>{
 for(const home of CREATOR_HOMES){
  const {context,records}=harness();drawCreatorHome2D(context,home);const art=records[1];
  assert.equal(art.canvas.width,384);assert.equal(art.canvas.height,368,'material detail cannot expand mobile texture memory');
  assert.ok(art.gradients.some(g=>g.stops.length>=4&&g.coordinates[2]!==g.coordinates[0]),'the wall and wood have directional surface light');
  assert.ok(art.gradients.some(g=>g.stops.some(([,color])=>/^#[a-f0-9]{8}$/i.test(color)&&color.endsWith('00'))),'occlusion fades to transparent instead of making a hard black band');
  assert.ok(art.calls.filter(call=>call[0]==='clip').length>=5,'surface marks and reflected sky remain within their architecture');
  assert.equal(art.calls.filter(call=>call[0]==='drawImage').length,0,'realistic materials are local drawing, without external profile or artwork images');
  assert.ok(art.gradients.every(g=>g.coordinates.every(Number.isFinite)&&g.stops.every(([at])=>at>=0&&at<=1)));
 }
});

test('creator-specific material marks are stable across sessions and do not depend on the animation clock',()=>{
 const home=CREATOR_HOMES[0],paint=id=>{const {context,records}=harness();drawCreatorHome2D(context,{...home,creatorId:id});return records[1].calls;};
 assert.deepEqual(paint('same-creator'),paint('same-creator'));
 assert.notDeepEqual(paint('same-creator'),paint('another-creator'),'different public identities give the same construction its own stable plaster and wood grain');
});

test('public creative uses add distinct frontage without moving the door, and invalidate the static cache',()=>{
 const {context,records}=harness(),home=CREATOR_HOMES[2];
 drawCreatorHome2D(context,{...home,homeUse:'home-office'});const original=records[1].calls;
 for(const use of['illustration-studio','writing-garden','shop-atelier','recording-studio']){
  const count=records.length;drawCreatorHome2D(context,{...home,homeUse:use});assert.equal(records.length,count+1);
  const art=records.at(-1),door=art.calls.find(call=>call[0]==='roundRect'&&call[2]===-80&&call[3]===50);
  assert.equal((door[1]+25)*home.w/320+home.x,home.door.x);assert.ok(art.calls.length<5000);
  assert.notDeepEqual(art.calls,original,'the public creative use changes actual bay or shop construction');
  drawCreatorHome2D(context,{...home,homeUse:use});assert.equal(records.length,count+1,'the frontage is baked once');
 }
 const constructionSignatures=new Set();
 for(const homeConstruction of['brick','stone','plaster']){
  drawCreatorHome2D(context,{...home,homeUse:'material-study',homeConstruction});
  const art=records.at(-1);constructionSignatures.add(JSON.stringify(art.calls));const count=records.length;
  drawCreatorHome2D(context,{...home,homeUse:'material-study',homeConstruction});assert.equal(records.length,count,'each construction material has its own stable cache entry');
 }
 assert.equal(constructionSignatures.size,3,'brick joints, dressed blocks, and lime plaster are different physical surfaces');
});

test('a long creator name keeps whole characters and stays inside its facade sign',()=>{
 const {context,records}=harness(),home={...CREATOR_HOMES[0],creatorName:'あ'.repeat(16)+'🦁🦁🦁'};
 drawCreatorHome2D(context,home);
 const text=records[1].calls.find(call=>call[0]==='fillText');
 assert.equal(text[1],'あ'.repeat(16)+'🦁…');
 assert.equal(text[4],158,'the name is fitted to the original sign without expanding the house');
});

test('quarter travel gates name both destinations while keeping the center passage open',()=>{
 for(const [to,label]of[['creator-quarter','参加者の住宅街 →'],['lantern-town','← 星灯りの街']]){
  const {context,records}=harness({cache:false}),portal={x:18.5,z:43.5,to};assert.equal(drawCreatorQuarterGate2D(context,portal),true);
  const calls=records[0].calls;assert.deepEqual(calls[1],['translate',portal.x*64,portal.z*64]);assert.equal(calls.find(call=>call[0]==='fillText')[1],label);
  let depth=0;const boxes=calls.filter(call=>{if(call[0]==='save')depth++;if(call[0]==='restore')depth--;return call[0]==='roundRect'&&depth===1;});assert.ok(boxes.every(call=>call[2]+call[4]<-20||call[1]>30||call[1]+call[3]<-30),'no solid sign or base blocks the travel point');assert.equal(records[0].depth(),0);
 }
 assert.equal(drawCreatorHome2D(harness().context,{x:0,z:0,w:0,h:5}),false);assert.equal(drawCreatorQuarterGate2D(harness().context,{x:NaN,z:0}),false);
});


test('Doyle retains a distinct pumpkin-library fallback without textures, cached canvas or an explicit theme',()=>{
 const home=CREATOR_HOMES.find(item=>item.creatorId==='dandy_snake880');assert.ok(home);
 const direct=harness({cache:false}),fallback=harness({cache:false});
 assert.equal(drawCreatorHome2D(direct.context,home),true);
 assert.equal(drawCreatorHome2D(fallback.context,{...home,homeTheme:undefined}),true);
 assert.deepEqual(fallback.records[0].calls,direct.records[0].calls,'the pumpkin-book motif resolves to its dedicated architecture');
 assert.equal(direct.records[0].calls.filter(call=>call[0]==='drawImage').length,0,'the fallback needs no portrait or artwork texture');
 assert.deepEqual(direct.records[0].calls.filter(call=>call[0]==='fillText').map(call=>call[1]),['ドイル',home.homeLabel]);
 const plain=harness({cache:false});drawCreatorHome2D(plain.context,{...home,homeTheme:'story'});
 assert.notDeepEqual(direct.records[0].calls,plain.records[0].calls,'the hood, cape roof, book bays and black cat are not the existing story house');
 assert.equal(direct.records[0].depth(),0);
});
