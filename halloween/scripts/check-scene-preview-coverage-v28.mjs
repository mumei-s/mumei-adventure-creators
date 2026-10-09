import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {questions,visibleQuestions,AUTO} from '../catalog.js?v=28.4.5';
import {applyCollection} from '../collection.js?v=28.4.5';
import {sampleFor} from '../examples.js?v=28.4.5';
import {scenePreviews} from '../scene-preview-catalog.js?v=28.4.5';
import {canonicalSelectionLabel} from '../legacy-selection-aliases.js?v=28.4.5';

const allowedKinds=new Set(['image','reference','auto','type','line','size']);
function jpegDimensions(bytes){
 assert.equal(bytes.readUInt16BE(0),0xffd8,'Scene thumbnail is a real JPEG');
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
 throw new Error('JPEG must contain an actual image frame');
}
let options=0,visible=0,autoOptions=0;
try{
 for(const collection of ['halloween','everyday']){
  applyCollection(collection);
  for(const q of questions){
   const auto=sampleFor(q.key,AUTO);autoOptions++;
   assert.equal(auto.kind,'auto','Each automatic selection has an actual candidate montage');
   assert(auto.srcs.length>0,'Automatic candidate montage is not a title-only card');
   for(const src of auto.srcs)assert(fs.existsSync(new URL('../'+src.replace(/^\.\//,'').split('#')[0],import.meta.url)),q.key+' automatic preview candidate exists');
  }
  for(const q of questions)for(const group of q.groups)for(const value of group.values){
   const preview=sampleFor(q.key,value);options++;
   if(visibleQuestions.some(x=>x.key===q.key))visible++;
   assert(allowedKinds.has(preview.kind),collection+' '+q.key+' '+value+' must not be a title-only placeholder');
   for(const src of preview.kind==='image'?[preview.src]:preview.kind==='auto'?preview.srcs:[]){
    const [file,fragment]=src.replace(/^\.\//,'').split('#');
    const bytes=fs.readFileSync(new URL('../'+file,import.meta.url));
    assert(bytes.length>0,value+' has a real nonempty asset');
    if(fragment)assert(bytes.toString().includes('id="'+fragment+'"'),value+' has the actual SVG fragment');
   }
  }
 }
 applyCollection('everyday');
 const hashes=new Set();
 assert.equal(Object.keys(scenePreviews).length,21,'Missing scenery choices, mismatched scenes and the star-thread atelier have individual original images');
 for(const [value,item] of Object.entries(scenePreviews)){
  const preview=sampleFor('theme',value);assert.equal(preview.kind,'image');assert(preview.src.endsWith(item.file));
  assert(preview.label.includes(value),'Accessible preview keeps the selected scene name');
  const bytes=fs.readFileSync(new URL('../'+item.file,import.meta.url)),dimensions=jpegDimensions(bytes);
  const metadata=JSON.parse(fs.readFileSync(new URL('../'+item.file.replace('.jpg','.json'),import.meta.url),'utf8'));
  assert.equal(canonicalSelectionLabel('theme',metadata.title),value);assert.equal(metadata.file,item.file.split('/').at(-1));
  assert.equal(metadata.generator,'built-in image_gen');assert.equal(metadata.visualQA.status,'accepted');
  assert.deepEqual(metadata.dimensions,dimensions,'Recorded dimensions match the actual JPEG frame');
  assert(metadata.dimensions.width>=1024&&metadata.dimensions.height>=1024);
  assert.equal(metadata.dimensions.width,metadata.dimensions.height);
  assert(metadata.prompt.length>500);const hash=crypto.createHash('sha256').update(bytes).digest('hex');
  assert.equal(metadata.hash_sha256,hash);hashes.add(hash);
  const place=questions.find(q=>q.key==='place').groups.some(g=>g.values.includes(value));
  if(place)assert.equal(sampleFor('place',value).src,preview.src,'The same selected place shares its own actual environment image');
 }
 assert.equal(hashes.size,21,'No duplicate scene image files');
 assert.equal(sampleFor('theme','新しい自由指定の舞台').kind,'custom','Free text keeps its explicit custom preview');
 console.log('PASS '+options+' choices across both collections ('+visible+' visible), plus '+autoOptions+' automatic preview montages: every built-in choice has a genuine image, reference, automatic montage, typography, phrase or size preview; 12 original scenery illustrations replace title-only cards and eight original scenes replace mismatched previews and one distinct star-thread workshop replaces a shared skylight room. Byte checks are separate from recorded visual QA.');
}finally{applyCollection('halloween');}
