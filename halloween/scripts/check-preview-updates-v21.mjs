import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {questions} from '../catalog.js?v=28.4.4';
import {applyCollection} from '../collection.js?v=28.4.4';
import {sampleFor} from '../examples.js?v=28.4.4';
import {japanPreviews} from '../japan-preview-catalog.js?v=28.4.4';
import {scenePreviews} from '../scene-preview-catalog.js?v=28.4.4';

const inventory=JSON.parse(fs.readFileSync(new URL('../verification/v21/preview-inventory.json',import.meta.url)));
const formats=JSON.parse(fs.readFileSync(new URL('../verification/v21/format-previews.json',import.meta.url)));
assert.equal(inventory.artworkChoices,350);assert.equal(inventory.paletteChoices,49);assert.equal(Object.keys(japanPreviews).length,406);
const replacements=new Map([
 ['costume\u0000ユニコーン','assets/costume-unicorn-original-v28-4-3.png'],
 ['costume\u0000エイリアン','assets/costume-alien-original-v28-4-3.png'],
 ...['鏡の向こうの自分','死神の休日','雨上がりの怪談'].map(value=>['theme\u0000'+value,scenePreviews[value].file])
]);
try{
 const old=[];
 for(const mode of ['halloween','everyday']){
  applyCollection(mode);
  for(const q of questions)for(const g of q.groups)for(const value of g.values){
   const sample=sampleFor(q.key,value);
   for(const src of [sample.src,...sample.srcs||[]].filter(Boolean)){
    assert.ok(fs.existsSync(new URL(src.split('#')[0],new URL('../',import.meta.url))),value+': missing file');
    if(/\/sample-\d|^\.\/pose-\d/.test(src))old.push({mode,key:q.key,value,src});
   }
  }
 }
 assert.deepEqual(old,[],'Selectable artwork still uses legacy sources');
 const illustrated=formats.replaced.filter(r=>r.asset);
 assert.equal(illustrated.length,38);assert.equal(new Set(illustrated.map(r=>r.asset)).size,38,'Illustrated formats must have independent primary artwork');
 for(const row of inventory.entries){
  const key=row.key+'\u0000'+row.value,replacement=replacements.get(key);
  assert.equal(japanPreviews[key],replacement||row.file,'Reviewed legacy samples remain stable except explicit semantic corrections');
  if(!replacement)continue;
  const bytes=fs.readFileSync(new URL('../'+replacement,import.meta.url));
  const metadata=JSON.parse(fs.readFileSync(new URL('../'+replacement.replace(/\.(jpg|png)$/u,'.json'),import.meta.url),'utf8'));
  assert.equal(metadata.title,row.value);assert.match(metadata.generator,/image_gen/);
  assert.equal(metadata.hash_sha256,crypto.createHash('sha256').update(bytes).digest('hex'));
  assert.equal(metadata.visualQA.status,'accepted');assert(metadata.prompt.length>500);
  assert.equal(sampleFor(row.key,row.value).src,'./'+replacement,'The corrected original image is actually shown by the chooser');
  if(replacement.endsWith('.png')){
   assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
   const actual=[bytes.readUInt32BE(16),bytes.readUInt32BE(20)];
   const recorded=Array.isArray(metadata.dimensions)?metadata.dimensions:[metadata.dimensions.width,metadata.dimensions.height];
   assert.deepEqual(recorded,actual,'Actual PNG dimensions agree with provenance');
   assert(actual.every(size=>size>=1024),'Corrected costume sample retains generated detail');
  }
 }
 console.log('PASS reviewed v21 artwork/palette inventory, both current collections, 38 independent illustrated formats and five declared original scene/costume corrections. All corrected previews have matching UI paths and provenance; optical/anatomical quality is assessed separately by individual visual review.');
}finally{applyCollection('halloween');}
