import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {poseItems} from '../poses.js?v=28.4.4';
import {sampleFor} from '../examples.js?v=28.4.4';

// File checks protect shipped thumbnails and provenance. Actual pose, hands,
// support and clothing are reviewed visually; bytes cannot prove anatomy.
function jpegDimensions(bytes){
 assert.equal(bytes.readUInt16BE(0),0xffd8,'Preview is a real JPEG');
 for(let offset=2;offset<bytes.length-8;){
  assert.equal(bytes[offset],0xff,'Valid JPEG marker boundary');
  while(bytes[offset]===0xff)offset++;
  const marker=bytes[offset++];
  if(marker===0xd9||marker===0xda)break;
  if(marker===0x01||(marker>=0xd0&&marker<=0xd7))continue;
  const length=bytes.readUInt16BE(offset);
  if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker))return {width:bytes.readUInt16BE(offset+5),height:bytes.readUInt16BE(offset+3)};
  assert(length>=2,'Valid JPEG segment length');offset+=length;
 }
 throw new Error('JPEG must contain a supported image frame');
}
const added=poseItems.slice(48),hashes=new Set(),prompts=new Set();
assert.equal(added.length,24);
for(const [index,item] of added.entries()){
 const id='pose-'+String(index+49).padStart(3,'0');
 assert.equal(item.file,'pose-artwork-v28-4-2/'+id+'.jpg','Every added action uses its illustrated raster instead of old SVG');
 assert.equal(item.previewKind,'pose-illustration');
 const bytes=fs.readFileSync(new URL('../'+item.file,import.meta.url)),dimensions=jpegDimensions(bytes);
 assert(dimensions.width>=1024&&dimensions.height>=1024,'New preview retains its generated resolution');
 assert.equal(dimensions.width,dimensions.height,'Square pose thumbnail');
 assert(bytes.length>40000&&bytes.length<1000000,'Detailed but web-appropriate encoded image');
 const hash=crypto.createHash('sha256').update(bytes).digest('hex');hashes.add(hash);
 const metadata=JSON.parse(fs.readFileSync(new URL('../'+item.file.replace('.jpg','.json'),import.meta.url),'utf8'));
 assert.equal(metadata.id,id);assert.equal(metadata.label,item.value);assert.equal(metadata.asset,id+'.jpg');
 assert.equal(metadata.generator,'built-in image_gen');assert.equal(metadata.hash_sha256,hash);
 assert.deepEqual(metadata.dimensions,dimensions);assert.equal(metadata.visualQA.status,'accepted');
 assert(metadata.visualQA.observations.length>20,'Visual review is recorded separately from file checks');
 assert(metadata.prompt.length>500,'Each image keeps its actual generation prompt');prompts.add(metadata.prompt);
 const preview=sampleFor('pose',item.value);assert.equal(preview.kind,'image');assert(preview.src.endsWith(item.file));
}
assert.equal(hashes.size,24,'No repeated thumbnail bytes');assert.equal(prompts.size,24,'No reused generic action prompt');
for(const [index,item] of poseItems.slice(0,48).entries())assert.equal(item.file,'pose-'+String(index+1).padStart(3,'0')+'.jpg','Existing quality illustrations are retained');
console.log('PASS 24 original individual raster pose previews: real square JPEGs, preserved generation resolution, independent hashes/prompts, matching UI assets and per-image visual review records. Existing 48 illustration assets retained.');
