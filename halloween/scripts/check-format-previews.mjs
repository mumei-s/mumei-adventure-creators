import assert from 'node:assert/strict';
import fs from 'node:fs';
import {questions} from '../catalog.js?v=23.0.0';
import {applyCollection} from '../collection.js?v=23.0.0';
import {sampleFor,typePreview} from '../examples.js?v=23.0.0';
import {formatPreviews} from '../format-preview-catalog.js?v=23.0.0';
const report=JSON.parse(fs.readFileSync(new URL('../verification/v21/format-previews.json',import.meta.url)));
const svg=fs.readFileSync(new URL('../japan-format-previews-v21.svg',import.meta.url),'utf8');
const covered=new Set([...Object.keys(formatPreviews),...report.preserved]);
assert.equal(covered.size,48);
assert.equal(new Set(report.replaced.map(s=>s.id)).size,41);
for(const row of report.replaced){
 assert.ok(svg.includes(`<view id="${row.id}" viewBox="`));
 assert.ok(svg.includes(`data-design="${row.value}"`));
 assert.equal(formatPreviews[row.value],row.src);
}
for(const mode of ['halloween','everyday']){
 applyCollection(mode);
 for(const value of questions.find(q=>q.key==='design').groups.flatMap(g=>g.values)){
  assert.ok(covered.has(value),'Missing Japanese layout preview: '+value);
  const sample=sampleFor('design',value);
  assert.equal(sample.kind,'image');
  assert.ok(fs.existsSync(new URL(sample.src,new URL('../examples.js',import.meta.url))));
  if(formatPreviews[value])assert.equal(sample.src,'./'+formatPreviews[value]);
  assert.match(sample.label,/生成の参照画像には使いません/);
 }
 assert.ok(sampleFor('design','おまかせ').srcs.some(s=>s.includes('japan-format-previews-v21.svg#')));
 assert.deepEqual(typePreview('文字を一切入れない').blocks,[]);
 for(const mode of ['映画ポスターのクレジット','広告の見出し','雑誌の組版']){
  const blocks=typePreview(mode).blocks.join('');
  assert.doesNotMatch(blocks,/[A-Za-z]/,'Default typography should use Japanese: '+mode);
 }
}
applyCollection('halloween');
assert.deepEqual(typePreview('HALLOWEENのみ').blocks,['HALLOWEEN']);
console.log('PASS all 48 design choices use Japanese layout previews; 41 individual SVG views; AUTO samples; Japanese typography and explicit English preserved.');
