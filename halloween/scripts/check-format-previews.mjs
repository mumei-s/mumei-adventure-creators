import assert from 'node:assert/strict';
import fs from 'node:fs';
import {questions} from '../catalog.js?v=28.4.6';
import {applyCollection} from '../collection.js?v=28.4.6';
import {sampleFor,typePreview} from '../examples.js?v=28.4.6';
import {formatPreviews} from '../format-preview-catalog.js?v=28.4.6';
const report=JSON.parse(fs.readFileSync(new URL('../audit/layout-distinction-v28.json',import.meta.url)));
const svg=fs.readFileSync(new URL('../layout-previews-v28.svg',import.meta.url),'utf8');
const covered=new Set(Object.keys(formatPreviews));
assert.equal(covered.size,48);
assert.equal(new Set(report.design.map(s=>s.id)).size,48);
assert.doesNotMatch(svg,/<image|data:image/,'Layout references must not import characters or another art medium.');
for(const row of report.design){
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
  assert.match(sample.label,/選択条件の比較見本/);
  assert.match(sample.label,/画像枠・文字枠・余白だけを参照/,'Format previews must retain their narrow geometric role');
  assert.doesNotMatch(sample.label,/見本シートに添付し/,'A common preview label must not promise a sheet in a delivery that omits it');
 }
 assert.ok(sampleFor('design','おまかせ').srcs.every(s=>s.includes('layout-previews-v28.svg#')));
 assert.deepEqual(typePreview('文字を一切入れない').blocks,[]);
 for(const mode of ['映画ポスターのクレジット','広告の見出し','雑誌の組版']){
  const blocks=typePreview(mode).blocks.join('');
  assert.doesNotMatch(blocks,/[A-Za-z]/,'Default typography should use Japanese: '+mode);
 }
}
applyCollection('halloween');
assert.deepEqual(typePreview('HALLOWEENのみ').blocks,['HALLOWEEN']);
console.log('PASS all 48 design choices use distinct personless layout diagrams; 48 individual SVG views and AUTO samples; Japanese typography and explicit English preserved.');
