import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const css=await readFile(new URL('../town-entry.css',import.meta.url),'utf8');
test('outdoor adventure has accessible same-tab routes beside the indoor path on TOP and gallery',async()=>{
 const top=html.match(/<nav class="palace-world-links"[\s\S]*?<\/nav>/)?.[0];assert.ok(top);
 assert.match(top,/id="palace-maze-entrance"[^>]*href="\.\/maze\/\?return=theatre"/);
 assert.match(top,/id="palace-town-entrance"[^>]*href="\.\/town\/\?return=theatre"[^>]*aria-label="城の外を歩く。城下町の冒険へ"/);
 assert.ok(html.indexOf(top)<html.indexOf('class="palace-composition"'));
 const row=html.match(/<div class="palace-return-row">[\s\S]*?<\/div>/)?.[0];assert.ok(row.indexOf('id="horror-entrance"')<row.indexOf('id="town-entrance"'));assert.match(row,/href="\.\/town\/\?return=theatre"/);
 assert.match(top,/>城の外を歩く<\/a>/);assert.doesNotMatch(top,/target=|onclick=|work-review|admin/);await access(new URL('../town/index.html',import.meta.url));
});
test('routes have 44px targets, readable focus, and responsive columns without shrinking the palace',()=>{
 assert.match(css,/min-width:44px;min-height:44px/);assert.match(css,/:focus-visible\{outline:3px solid/);assert.match(css,/overflow-wrap:anywhere/);
 assert.match(css,/palace-world-links\{position:absolute/);assert.match(css,/max-width:430px/);assert.doesNotMatch(css,/\.palace-entrance\{|height:calc|zoom:|scale\(/);
 assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);assert.match(css,/@media\(max-width:680px\).*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 for(const width of [280,320,333,390,680,820,1280])for(const safe of [0,16,28]){
  const columns=width<=680?2:4,rowCell=(width-24-8*(columns-1))/columns;
  const topCell=(Math.min(430,width-2*Math.max(12,safe))-(width<=360?6:8))/2;
  assert.ok(rowCell>=44);assert.ok(topCell>=44);
 }
 assert.match(css,/data-mode=normal\].*town-entrance/);assert.match(css,/forced-colors:active/);
});
