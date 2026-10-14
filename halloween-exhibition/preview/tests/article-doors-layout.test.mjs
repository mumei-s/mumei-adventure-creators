import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const css=await readFile(new URL('../article-doors.css',import.meta.url),'utf8');
// Structural and sizing-contract guards, not a substitute for browser rendering.
test('arrows occupy one flow navigation row between the image world and caption',()=>{
 const nav=html.match(/<nav class="stage-navigation"[\s\S]*?<\/nav>/)?.[0];assert.ok(nav);
 assert.match(nav,/id="previous"/);assert.match(nav,/id="next"/);assert.equal((html.match(/id="previous"/g)||[]).length,1);
 assert.ok(html.indexOf('id="room-world"')<html.indexOf(nav));assert.ok(html.indexOf(nav)<html.indexOf('class="stage-caption"'));
 assert.match(css,/stage-navigation \{[^}]*position:relative;inset:auto[^}]*display:flex/s);
 assert.match(css,/stage-navigation \.stage-arrow \{[^}]*position:relative;inset:auto;transform:none[^}]*min-height:44px/s);
 assert.match(html,/前の5扉/);assert.match(html,/次の5扉/);
});
test('article and profile images are contained inside bounded frames without hover enlargement',()=>{
 assert.match(css,/data-portrait=false[^}]*width:min\(82%,calc\(\(100cqh - 20px\) \* 1\.91\),820px\)[^}]*aspect-ratio:1\.91/s);
 assert.match(css,/\.artwork-mat img \{[^}]*object-fit:contain;object-position:center[^}]*clip-path:none;border-radius:0/s);
 assert.match(css,/artwork-frame:hover \.artwork-mat img \{transform:none\}/);
 assert.match(css,/transform:translateX\(-50%\)!important/);
 assert.match(css,/#detail \.detail-art \{object-fit:contain/);
 assert.ok(html.indexOf('article-doors.css?v=20261014-doors1')>html.indexOf('display-mode.css'));
});
test('400×606 and 333×619 minimum-room sizing reserves image space above 44px navigation',()=>{
 for(const [width,height] of [[400,606],[333,619],[320,606],[1180,758]]){
  const room=Math.max(width<=680?128:180,Math.min(width<=680?460:600,height-(width<=680?510:480)));
  const articleWidth=Math.min(width*.82,(room-20)*1.91,820),articleHeight=articleWidth/1.91;
  const portraitWidth=Math.min(width*.60,(room-20)*.85,280),portraitHeight=portraitWidth/.85;
  assert.ok(articleWidth<=width*.82);assert.ok(articleHeight<=room-20+.001);
  assert.ok(portraitHeight<=room-20+.001);assert.ok(112*2+24<=width);
 }
});
