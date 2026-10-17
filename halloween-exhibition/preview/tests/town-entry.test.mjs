import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const css=await readFile(new URL('../town-entry.css',import.meta.url),'utf8');
test('outdoor adventure keeps accessible same-tab routes for the palace panel and gallery',async()=>{
 const top=html.match(/<nav id="palace-world-links" class="palace-world-links"[\s\S]*?<\/nav>/)?.[0];assert.ok(top);
 assert.match(top,/id="palace-maze-entrance"[^>]*href="\.\/maze\/\?return=theatre"/);
 assert.match(top,/id="palace-town-entrance"[^>]*href="\.\/town\/\?return=theatre"[^>]*aria-label="宮殿から星灯りの街へ進む"/);
 assert.ok(html.indexOf(top)<html.indexOf('class="palace-composition"'));
 const row=html.match(/<div class="palace-return-row">[\s\S]*?<\/div>/)?.[0];assert.ok(row.indexOf('id="horror-entrance"')<row.indexOf('id="town-entrance"'));assert.match(row,/href="\.\/town\/\?return=theatre"/);
 assert.match(top,/>星灯りの街へ<\/a>/);assert.doesNotMatch(top,/target=|onclick=|work-review|admin/);await access(new URL('../town/index.html',import.meta.url));
});
test('routes have 44px targets, readable focus, and responsive columns without shrinking the palace',()=>{
 assert.match(css,/min-width:44px;min-height:44px/);assert.match(css,/:focus-visible\{outline:3px solid/);assert.match(css,/overflow-wrap:anywhere/);
 assert.match(css,/palace-world-links\{position:static/);assert.match(css,/width:fit-content;max-width:100%/);assert.doesNotMatch(css,/\.palace-entrance\{|height:calc|zoom:|scale\(/);
 assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);assert.match(css,/@media\(max-width:680px\).*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 for(const width of [280,320,333,390,680,820,1280])for(const safe of [0,16,28]){
  const columns=width<=680?2:4,rowCell=(width-24-8*(columns-1))/columns;
  const topCell=Math.min(220,width-2*Math.max(12,safe));
  assert.ok(rowCell>=44);assert.ok(topCell>=44);
 }
 assert.match(css,/castle-exit-panel>\.palace-world-links>a\{flex:0 1 auto;min-width:44px;min-height:44px/);
 assert.match(css,/data-mode=normal\].*town-entrance/);assert.match(css,/forced-colors:active/);
});

test('both basement labels are outside the painting and header moves the complete destination group',async()=>{
 const theater=await readFile(new URL('../theater.js',import.meta.url),'utf8');
 assert.ok(html.indexOf('id="palace-world-links"')<html.indexOf('</header>'));
 assert.equal((html.match(/>宮殿の地下に進む</g)||[]).length,2);
 assert.doesNotMatch(html,/宮殿の奥に進む/);
 assert.match(theater,/entranceControl:\$\('palace-world-links'\)/);
 assert.match(css,/grid-column:1\/-1;grid-row:2/);
 const maze=await readFile(new URL('../maze/index.html',import.meta.url),'utf8');
 const app=await readFile(new URL('../maze/app.js',import.meta.url),'utf8');
 assert.match(maze,/— 宮殿の地下<\/title>/);assert.match(app,/'宮殿の地下を探索'/);
});
