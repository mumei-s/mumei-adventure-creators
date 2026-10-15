import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const css=await readFile(new URL('../gallery-refinement.css',import.meta.url),'utf8');
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
test('last stylesheet prevents both header groups wrapping without clipping or shrinking touch targets',()=>{
 assert.ok(html.indexOf('gallery-refinement.css')>html.indexOf('palace-entrance.css'));
 for(const name of ['palace-toolbar','header-navigation','header-actions','mode-switch'])assert.match(css,new RegExp('\\.'+name+' \\{[^}]*flex-wrap:nowrap'));
 assert.match(css,/overflow-x:auto/);assert.match(css,/min-width:44px;min-height:44px/);
 assert.doesNotMatch(css,/text-size-adjust|font-size:[0-9]px|overflow-x:hidden/);
});
test('edge arrows reserve independent gutters beside contained artwork and leave the caption below',()=>{
 assert.match(css,/room-world \{grid-area:1\/1\}/);
 assert.match(css,/stage-navigation \{[^}]*grid-area:1\/1[^}]*justify-content:space-between/s);
 assert.match(css,/stage-caption \{grid-area:2\/1\}/);
 assert.match(css,/stage-arrow \{[^}]*width:44px;height:44px;min-width:44px;min-height:44px/s);
 assert.match(css,/max-width:calc\(100% - 112px\)/);
 for(const width of [333,400,770,1180])assert.ok((width-112)/2>0);
 assert.match(css,/touch-action:pan-y pinch-zoom/);
});
test('host avatar lives in a protected invitation caption rather than underneath scenery',()=>{
 assert.match(html,/<div class="stage-caption"><img id="host-avatar"/);
 assert.match(css,/data-entry-kind=introduction[^}]*atelier-mascot[^}]*display:none/s);
 assert.match(css,/stage-caption \.host-avatar \{[^}]*position:relative;inset:auto/s);
 assert.match(css,/host-avatar\[hidden\] \{display:none\}/);
});


test('artwork cannot inherit scenic brightness, saturation, screen sheen or foreground overlays',()=>{
 assert.match(css,/#theater \.room-world > \.artwork-frame \{filter:none!important;isolation:isolate;z-index:12\}/);
 assert.match(css,/artwork-mat:after \{display:none\}/);
 assert.match(css,/artwork-mat img \{filter:brightness\(var\(--art-brightness,1\)\);mix-blend-mode:normal/);
 assert.match(css,/#theater \.stage \{z-index:4\}/);
 assert.match(css,/chapter-index \{display:none\}/);
 assert.match(css,/stage-caption \{[^}]*background:#171b2cf5;color:#fff3de/s);
});


test('Halloween ornament owns a separate flow area and stops with reduced or paused motion',()=>{
 assert.match(html,/class="festival-coda" aria-hidden="true"/);
 assert.match(css,/festival-coda \{[^}]*position:relative[^}]*height:170px/s);
 assert.match(css,/data-mode=normal[^}]*festival-coda \{display:none\}/);
 assert.match(css,/data-motion-paused=true[^}]*festival-coda \* \{animation:none!important\}/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{\.festival-coda \* \{animation:none!important\}/);
});
