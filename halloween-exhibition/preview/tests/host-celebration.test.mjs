import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const bundledStyles=await readFile(new URL('../gallery-styles.css',import.meta.url),'utf8');
const css=await readFile(new URL('../host-celebration.css',import.meta.url),'utf8');
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const sw=await readFile(new URL('../sw.js',import.meta.url),'utf8');
test('host-only ceremony sits behind the untouched thumbnail with bounded decorations',()=>{
 assert.match(css,/\.host-coronation,\.host-caption-aurora \{display:none;pointer-events:none\}/);
 assert.match(css,/#theater\[data-mode=halloween\]\[data-entry-kind=introduction\] \.host-coronation/);
 assert.match(css,/z-index:9;overflow:hidden;pointer-events:none/);
 assert.match(css,/room-world>\.artwork-frame \{[^}]*border:2px solid #fff0b4/);
 assert.doesNotMatch(css,/artwork-mat|object-fit|filter:brightness/);
 assert.equal((html.match(/style="--n:/g)||[]).length,12);
 assert.match(html,/class="host-coronation" aria-hidden="true"/);
});
test('host motion stops for explicit pause and reduced motion, without rapid flashing',()=>{
 assert.match(css,/data-motion-paused=true/);assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/animation:none!important/);
 assert.doesNotMatch(css,/animation:[^;]*\s0\.[0-9]+s/);
 assert.match(css,/host-turn 52s/);
});
test('host release is isolated in the preview cache and follows existing styles',()=>{
 assert.ok(bundledStyles.indexOf('host-celebration.css')>bundledStyles.indexOf('gallery-refinement.css'));
 assert.match(bundledStyles,/host-celebration.css\?v=20261015-host3/);
 assert.match(sw,/gallery-styles\.css\?v=20261019-unified1/);
 assert.doesNotMatch(sw,/\["host-celebration\.css/);
 assert.match(html,/id="host-magazine"[^>]*href="https:\/\/note.com\/ss_yr\/m\/m642b82518aeb"/);
});

test("optional host collectible shares only the reserved arrow row",()=>{assert.match(css,/scene-seeds \{position:relative;inset:auto;grid-area:2\/1;height:48px/);assert.match(css,/scene-seed \{left:calc\(50% - 24px\);right:auto;top:0/);});

test('illustrated host signature is compact and reserves more space for the project article',()=>{
 assert.match(css,/host-invitation\.webp/);
 assert.match(css,/host-avatar\{width:50px;height:50px;min-width:50px/);
 assert.match(css,/stage-caption\{padding:12px 16px/);
 assert.match(css,/width:min\(92%,850px\)/);
 assert.match(sw,/assets\/palace\/host-invitation.webp/);
});
