import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
const css=readFileSync(new URL('../dark-interior-menu.css',import.meta.url),'utf8');
const svg=readFileSync(new URL('../assets/rpg/palace/menu-sconces.svg',import.meta.url),'utf8');
test('indoor ornament is a small local vector without external images or scripts',()=>{
 assert.ok(statSync(new URL('../assets/rpg/palace/menu-sconces.svg',import.meta.url)).size<16000);
 assert.doesNotMatch(svg,/<script|<image|https?:\/\/(?!www.w3.org)|<animate/);
 assert.match(svg,/id="damask"/);assert.match(svg,/translate\(47 165\)/);assert.match(svg,/translate\(753 165\)/);
});
test('decoration is scoped to exploration menu, not world or battles',()=>{
 assert.match(css,/#panel:has\(\.explore-menu\)/);
 assert.doesNotMatch(css,/#world|#fallback|brightness\(|backdrop-filter:|filter:/);
 assert.doesNotMatch(css,/max-height:|overflow:|position:fixed|100[sdv]*vh/);
});
test('menu is compact with readable paired touch targets and spanning status',()=>{
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/min-height:58px/);assert.match(css,/min-height:44px/);
 assert.match(css,/#menu-motion-status\{grid-column:1\/-1/);
 assert.match(css,/select\{[^}]*min-height:44px/);
});
test('motion is opt-in, open-menu only, opacity only and respects reduced motion',()=>{
 assert.match(css,/#panel\[open\]\[data-menu-motion=true\]/);
 assert.match(css,/@keyframes menu-lamplight\{0%,100%\{opacity:\.55\}50%\{opacity:1\}\}/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/animation:none!important;transition:none!important/);
});
test('keyboard focus and forced-color fallback remain explicit',()=>{
 assert.match(css,/:focus-visible\{outline:3px solid/);
 assert.match(css,/@media\(forced-colors:active\)/);
 assert.match(css,/background:ButtonFace;color:ButtonText/);
});

test('menu decoration is linked and explicit motion/rotation lifecycle stays wired',()=>{const app=readFileSync(new URL('../app.js',import.meta.url),'utf8'),html=readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.match(html,/dark-interior-menu\.css\?v=20261016-dark-menu1/);assert.match(html,/app\.js\?v=20261017-startup1/);assert.match(app,/panel\.dataset\.menuMotion=String\(enabled\)/);assert.match(app,/window\.addEventListener\('orientationchange',clearInput\)/);});
