import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=name=>readFile(new URL('../'+name,import.meta.url),'utf8');
const [html,css,js,roster]=await Promise.all(['index.html','fate-roulette.css','theater.js','gallery-refinement.css'].map(read));
test('fate uses a carved gate control and a dedicated in-flow illustrated miniature palace',()=>{
 assert.match(html,/class="fate-button-gate"/);assert.doesNotMatch(html,/aria-hidden="true">✧<\/span> 運命のとびら/);
 assert.ok(html.indexOf('id="roulette-reel"')<html.indexOf('id="stage"'));
 assert.match(css,/roulette-reel\.fate-theatre\{position:relative/);assert.match(css,/palace-interior\.webp/);
 assert.match(css,/fate-gate-orbit/);assert.match(css,/perspective:700px/);assert.match(css,/fate-carving/);
 assert.match(html,/id="roulette-name"[^>]*role="status"/);
});
test('selection is bounded, no name flicker or crown spin; real creator opening is preserved',()=>{
 assert.match(js,/i<5;i\+\+/);assert.match(js,/dataset.phase='chosen'/);assert.match(js,/setTimeout\(finish,650\)/);
 assert.doesNotMatch(js,/pool\[beat%pool.length\]/);assert.match(css,/roulette-running \.portal-crown\{animation:none!important/);
 assert.match(js,/fromRoulette:true/);assert.match(js,/if\(token!==rouletteVersion\)return/);
});
test('motion has mobile bounds and disabled-motion safeguards, with no audio changes',()=>{
 assert.match(css,/@media\(max-width:480px\)/);assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/data-motion-paused=true/);assert.match(css,/not\(\[data-palace-state=gallery\]\)/);
 assert.match(js,/event.key==='Escape'&&rouletteRunning/);assert.match(js,/pagehide',\(\)=>\{cancelRoulette\(\)/);
 assert.match(js,/if\(reduced.matches\)cancelRoulette\(\)/);
});
test('only the pinned host entry is excluded and its compact project art cannot expand',()=>{
 assert.match(js,/!host\|\|e.doorId!==host.doorId/);assert.doesNotMatch(js,/!host\|\|e.creatorId!==host.creatorId/);
 assert.match(roster,/#roster \.roster-host-project>img\{width:82px;height:54px;max-width:82px;max-height:54px/);
 assert.match(roster,/#roster \.close\{position:relative;top:auto;right:auto;float:none/);
});
