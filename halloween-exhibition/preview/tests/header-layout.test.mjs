import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const css=await readFile(new URL('../gallery-controls.css',import.meta.url),'utf8');
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
// Static guards only. Browser QA must still check 320px and enlarged text.
test('flow-based header preserves navigation and actions inside the primary toolbar group',()=>{
 assert.match(css,/\.theater \.masthead\s*\{[^}]*position:relative;inset:auto;height:auto[^}]*display:grid/s);
 assert.match(css,/grid-template-areas:"brand actions" "navigation actions"/);
 assert.match(css,/grid-template-areas:"brand navigation" "actions actions"/);
 assert.match(css,/\.theater \.mode-switch,\.theater \.horror-entrance\s*\{[^}]*position:static;inset:auto;transform:none/s);
 assert.match(css,/\.theater \.header-actions\s*\{[^}]*flex-wrap:wrap/s);
 assert.match(html,/<div class="header-navigation"><div class="mode-switch"/);
 assert.match(html,/class="header-actions"><div class="toolbar-primary"><div class="header-navigation">/);
});

test('text enlargement grows reading and control rows instead of an 800px clipped canvas',()=>{
 assert.match(css,/height:auto;min-height:100svh/);
 assert.match(css,/\.theater \.stage-caption\s*\{position:relative;inset:auto/);
 assert.match(css,/\.theater \.stage-footer\s*\{[^}]*position:relative;inset:auto;height:auto/s);
 assert.match(css,/\.theater \.header-actions button\s*\{[^}]*min-width:44px;min-height:44px;height:auto[^}]*overflow-wrap:anywhere/s);
 assert.match(css,/\.theater \.mode-switch button\s*\{[^}]*overflow-wrap:anywhere/);
 assert.doesNotMatch(css,/min-height:800px/);
});

test('new controls replace duplicate CTA and use explicit labels, bounded speeds and reduced motion',()=>{
 assert.doesNotMatch(html,/id="story-open"|id="view-toggle"/);
 assert.match(html,/id="slideshow-toggle"[^>]*aria-pressed="false"[^>]*>自動送り OFF/);
 const options=[...html.matchAll(/<option value="(\d+)"(?: selected)?>(\d+)秒<\/option>/g)];assert.deepEqual(options.map(m=>Number(m[1])),[1,2,3,4,5,6,7,8,9,10]);assert.match(html,/<option value="5" selected>5秒/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/body\[data-mode=halloween\] \.roster-card/);
 assert.match(css,/body\[data-ambient-paused=true\] \.roster-card/);
 assert.match(css,/data-mode=normal\] \.scene-seeds\s*\{display:none!important/);
});
