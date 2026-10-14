import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {previewThumbnailFor} from '../preview-thumbnails.js';
import {readRasterDimensions} from '../image-resources.js';
const root=new URL('../',import.meta.url),manifest=JSON.parse(fs.readFileSync(new URL('assets/preview-thumbnails-v28-4-16/manifest.json',root)));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
for(const row of manifest.items){
 assert.equal(row.originalSource,row.source,'Every thumbnail keeps its exact original');
 const original=fs.readFileSync(new URL(row.source,root)),thumbnail=fs.readFileSync(new URL(row.thumbnail,root));
 assert.equal(hash(original),row.sourceSha256,row.source+' original changed');
 assert.equal(hash(thumbnail),row.thumbnailSha256,row.thumbnail+' bytes changed');
 const size=await readRasterDimensions(new File([thumbnail],'preview.webp',{type:'image/webp'}));
 assert.equal(size.format,'webp');assert.deepEqual([size.width,size.height],row.thumbnailDimensions);
 assert(Math.max(size.width,size.height)<=384,'Display previews remain bounded');
 assert(thumbnail.length<original.length,'Optimized preview reduces transfer');
 assert.equal(previewThumbnailFor('./'+row.source),'./'+row.thumbnail);
 assert.equal(previewThumbnailFor('./'+row.source+'?v=test'),'./'+row.thumbnail);
 assert.equal(previewThumbnailFor('./'+row.source+'#fragment'),'./'+row.source+'#fragment','Fragment views are never silently replaced');
}
assert.equal(manifest.items.length,73);
assert.equal(previewThumbnailFor('blob:local'),'blob:local');
assert.equal(previewThumbnailFor('./unregistered.jpg'),'./unregistered.jpg');
console.log('PASS 73 display thumbnails: exact original bindings and hashes, valid bounded WebP dimensions, byte savings, stable URL lookup and untouched custom/fragment paths.');
