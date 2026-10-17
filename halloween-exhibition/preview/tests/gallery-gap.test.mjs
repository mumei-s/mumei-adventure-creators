import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const bundledStyles=await readFile(new URL('../gallery-styles.css',import.meta.url),'utf8');

const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const css=await readFile(new URL('../gallery-gap.css',import.meta.url),'utf8');
const layout=await readFile(new URL('../gallery-refinement.css',import.meta.url),'utf8');
const motion=await readFile(new URL('../scene-motion.js',import.meta.url),'utf8');
const nav=html.match(/<nav class="stage-navigation"[^>]*>([\s\S]*?)<\/nav>/)?.[1];

test('the illustrated procession uses the existing navigation gap, never another stage row',()=>{
 assert.ok(nav);
 assert.match(nav,/<span class="gallery-gap-scene" aria-hidden="true">/);
 assert.equal((nav.match(/<button /g)||[]).length,2);
 assert.equal((nav.match(/class="gap-spirit /g)||[]).length,4);
 for(const name of ['gap-ghost','gap-pumpkin','gap-bat-left','gap-bat-right'])assert.ok(nav.includes(name));
 assert.doesNotMatch(nav,/<(?:img|a|input|canvas)|tabindex=|data-magic=/);
 assert.match(css,/position:absolute;inset:0 62px/);
 assert.match(css,/overflow:hidden;contain:layout paint;isolation:isolate;pointer-events:none/);
 assert.match(css,/\.gallery-gap-scene \*\{pointer-events:none\}/);
 assert.doesNotMatch(css,/grid-template|grid-area|min-height|padding-bottom|margin-block/);
 assert.match(layout,/stage \{grid-template-rows:auto 48px auto auto\}/);
 assert.match(layout,/stage-navigation \{grid-area:2\/1/);
 assert.match(layout,/stage-caption \{grid-area:3\/1/);
 // The fixed decoration inset leaves 10px beyond each existing arrow target.
 for(const width of [320,333,400,768,1180]){
  assert.equal(62-(8+44),10);
  assert.ok(width-62*2>=196);
 }
});

test('ornament is Halloween-only and its SVGs are decorative with unique definitions',()=>{
 assert.match(css,/\.gallery-gap-scene\{display:none\}/);
 assert.match(css,/#theater\[data-mode=halloween\] \.gallery-gap-scene\{\s*display:block/);
 assert.doesNotMatch(css,/\[data-mode=normal\]/);
 assert.equal((nav.match(/<svg /g)||[]).length,5);
 assert.equal((nav.match(/focusable="false"/g)||[]).length,5);
 const ids=[...nav.matchAll(/\bid="(gap-[^"]+)"/g)].map(match=>match[1]);
 assert.equal(new Set(ids).size,ids.length);
 for(const reference of nav.matchAll(/url\(#([^)]+)\)/g))assert.ok(ids.includes(reference[1]));
 assert.match(bundledStyles,/gallery-gap\.css\?v=20261017-gap1/);
 assert.ok(bundledStyles.indexOf('gallery-gap.css')>bundledStyles.indexOf('gallery-refinement.css'));
});

test('translucency affects the Halloween surface without dimming the glyph or shrinking targets',()=>{
 const arrowRules=[...css.matchAll(/([^{}]+stage-arrow[^{}]*)\{([^}]+)\}/g)];
 assert.equal(arrowRules.length,3);
 for(const [,selector,body] of arrowRules){
  assert.match(selector,/\[data-mode=halloween\]/);
  assert.doesNotMatch(body,/\b(?:opacity|width|height|min-width|min-height|padding|pointer-events)\s*:/);
 }
 assert.match(arrowRules[0][2],/background:rgba\(19,28,45,\.36\)/);
 assert.match(arrowRules[0][2],/border-color:rgba\(242,203,147,\.55\)/);
 assert.match(arrowRules[0][2],/color:#ffe0ab/);
 assert.match(layout,/width:44px;height:44px;min-width:44px;min-height:44px/);
 assert.match(css,/:focus-visible/);
});

test('slow seamless motion freezes for existing pause, dialog, visibility and reduced-motion state',()=>{
 assert.match(css,/@keyframes gap-spirit-glide\{0%,100%/);
 assert.match(css,/@keyframes gap-pumpkin-glide\{0%,100%/);
 assert.match(css,/gap-spirit-glide 9s/);
 assert.match(css,/gap-pumpkin-glide 11s/);
 assert.match(css,/gap-beads-flow 18s linear infinite/);
 for(const name of ['data-motion-paused','data-ambient-paused','data-page-hidden'])assert.ok(css.includes(`[${name}=true] .gallery-gap-scene *`));
 assert.match(css,/animation-play-state:paused!important/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{\.gallery-gap-scene \*\{animation:none!important\}\}/);
 assert.match(motion,/const stopped = staticMotion\(\) \|\| document.hidden \|\| !!document.querySelector\('dialog\[open\]'\)/);
 assert.match(motion,/root.dataset.motionPaused = String\(stopped\)/);
 assert.doesNotMatch(css,/animation[^;{}]*steps\(|transition:all|will-change/);
});
