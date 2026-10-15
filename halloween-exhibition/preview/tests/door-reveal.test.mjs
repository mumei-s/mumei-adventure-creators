import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const css=await readFile(new URL('../door-reveal.css',import.meta.url),'utf8');const js=await readFile(new URL('../theater.js',import.meta.url),'utf8');const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
test('creator selection paints synchronously and never waits for an exit fade',()=>{const nav=js.slice(js.indexOf('async function navigate('),js.indexOf('function showDialog'));assert.doesNotMatch(nav,/await|setTimeout|busy=true/);assert.match(nav,/currentIndex=next;paint/);assert.match(nav,/!isCurrent\(\)/);});
test('closed leaves clear in 1.2 seconds before article visibility',()=>{assert.match(css,/article-after-door 1\.2s steps\(1,end\) both/);assert.match(css,/@keyframes article-after-door \{0%\{visibility:hidden\}100%\{visibility:visible\}\}/);assert.match(css,/quick-door-left 1\.2s/);assert.match(css,/quick-door-right 1\.2s/);});
test('six playful decorations fly outwards without capturing pointer input',()=>{assert.match(html,/class="door-burst" aria-hidden="true"/);assert.match(css,/door-burst \{[^}]*pointer-events:none/);assert.match(css,/--x:-24px/);assert.match(css,/--x:24px/);assert.match(css,/100%\{opacity:0;transform:translate/);});
test('paused and reduced motion reveal artwork immediately and suppress bursts',()=>{assert.match(css,/data-motion-paused=true[^}]*visibility:visible!important/);assert.match(css,/prefers-reduced-motion:reduce/);assert.match(css,/animation:none!important;opacity:0!important/);});
test('gilded leaves have carved ornament, seam light and post-opening depth without recoloring images',()=>{
 assert.match(html,/class="door-filigree"/);assert.match(html,/class="portal-seam-light"/);
 assert.match(css,/portal-seam-awaken 1.2s/);assert.match(css,/article-step-forward \.38s 1.2s/);assert.match(css,/backface-visibility:hidden/);
 assert.doesNotMatch(css,/artwork-mat>img[^}]*filter:/);
});
