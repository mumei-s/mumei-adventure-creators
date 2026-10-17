import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const base=new URL('../',import.meta.url);
function webpSize(buffer){
 assert.equal(buffer.toString('ascii',0,4),'RIFF');assert.equal(buffer.toString('ascii',8,12),'WEBP');
 for(let at=12;at+8<buffer.length;){const tag=buffer.toString('ascii',at,at+4),length=buffer.readUInt32LE(at+4),data=at+8;
  if(tag==='VP8X')return[1+buffer.readUIntLE(data+4,3),1+buffer.readUIntLE(data+7,3)];
  if(tag==='VP8L'){const bits=buffer.readUInt32LE(data+1);return[1+(bits&16383),1+((bits>>>14)&16383)];}
  if(tag==='VP8 ')return[buffer.readUInt16LE(data+6)&16383,buffer.readUInt16LE(data+8)&16383];
  at=data+length+(length%2);
 }throw Error('Missing WebP dimensions');
}
test('every approved animation sidecar resolves its exact identity and nonempty calibrated art',async()=>{
 const registry=JSON.parse(await readFile(new URL('data/character-rigs.json',base)));const ids=new Set();
 for(const row of registry.rigs){
  assert.ok(!ids.has(row.id),'Duplicate rig identity '+row.id);ids.add(row.id);if(!row.approved)continue;
  const url=new URL(row.manifestURL,base),manifest=JSON.parse(await readFile(url));
  assert.equal(manifest.id,row.id,'An animation must never substitute another resident or creator');
  assert.equal(manifest.review.passed,true);
  const sizes={};for(const[key,file]of Object.entries(manifest.atlases)){const bytes=await readFile(new URL(file,url));assert.ok(bytes.length>100);sizes[key]=webpSize(bytes);}
  for(const view of [manifest,...Object.values(manifest.views||{})])for(const part of Object.values(view.parts||{})){
   if(part.visible===false)continue;const size=sizes[part.atlas||view.atlas||manifest.atlas];assert.ok(size,row.id+' missing atlas');
   const [x,y,w,h]=part.rect||part.frame;assert.ok([x,y,w,h,...part.pivot].every(Number.isFinite));
   assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=size[0]+1e-6&&y+h<=size[1]+1e-6,row.id+' part is outside its actual atlas');
  }
 }
 assert.ok(ids.has('resident:archivist')&&ids.has('resident-archivist'));
 assert.notEqual(registry.rigs.find(r=>r.id==='resident:archivist').manifestURL,registry.rigs.find(r=>r.id==='resident-archivist').manifestURL);
});
