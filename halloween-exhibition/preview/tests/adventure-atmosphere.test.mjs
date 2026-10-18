import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {initAdventureAtmosphere} from '../adventure-atmosphere.js';
const read=file=>fs.readFile(new URL('../'+file,import.meta.url),'utf8');
function eventTarget(){const events=new Map();return {addEventListener(type,fn){events.set(type,fn);},removeEventListener(type,fn){if(events.get(type)===fn)events.delete(type);},fire(type){events.get(type)?.();},events};}
test('ornaments pause on hidden/pagehide and resume correctly after pageshow; listeners release',()=>{
 const doc=Object.assign(eventTarget(),{hidden:false,documentElement:{dataset:{}}}),win=eventTarget(),art=initAdventureAtmosphere({document:doc,window:win});
 assert.equal(doc.documentElement.dataset.atmospherePaused,'false');doc.hidden=true;doc.fire('visibilitychange');assert.equal(doc.documentElement.dataset.atmospherePaused,'true');
 doc.hidden=false;doc.fire('visibilitychange');assert.equal(doc.documentElement.dataset.atmospherePaused,'false');win.fire('pagehide');assert.equal(doc.documentElement.dataset.atmospherePaused,'true');
 doc.fire('visibilitychange');assert.equal(doc.documentElement.dataset.atmospherePaused,'true');win.fire('pageshow');assert.equal(doc.documentElement.dataset.atmospherePaused,'false');
 art.destroy();assert.equal(doc.events.size,0);assert.equal(win.events.size,0);
});
test('town and basement have lightweight static art before boot and keep a real return link',async()=>{
 for(const file of['town/index.html','maze/index.html']){
  const game=file.split('/')[0],html=await read(file),manifest=JSON.parse(await read(`${game}/game-script-manifest.json`)),styles=JSON.parse(await read(`${game}/game-style-sources.json`));
  assert.ok(styles.some(source=>source.split('?')[0]==='../adventure-atmosphere.css'));
  for(const source of ['adventure-atmosphere.css','adventure-atmosphere.js'])assert.ok(manifest.inputs.some(input=>input.path===source),`${game} bundles ${source}`);
  assert.ok(html.includes(`href="./game-styles.css?v=20261019-game-fast1-${manifest.styles.sha256.slice(0,12)}"`));
  assert.ok(html.includes(`src="./game-entry.js?v=20261019-game-fast1-${manifest.output.sha256.slice(0,12)}"`));
  assert.match(html,/<div class="story-vignette" aria-hidden="true">/);assert.match(html,/lantern-story-vignette\.svg" width="640" height="300" alt=""/);
  const loading=html.slice(html.indexOf(file.startsWith('town')?'<div id="town-loading"':'<div id="loading"'));assert.match(loading,/href="\.\.\/\?return=palace"/);assert.match(loading,/role="status" aria-live="polite"/);
 }
 const town=await read('town/index.html');assert.match(town,/<button id="loading-retry" hidden>/);assert.doesNotMatch(town,/class="loading-ring"/);
 const svg=await read('assets/lantern-story-vignette.svg');assert.ok(Buffer.byteLength(svg)<7000);assert.doesNotMatch(svg,/<script|https?:\/\/(?!www\.w3\.org)|<animate|<image/);
});
test('theme is scoped to game overlays, suppresses combat header and honors every motion switch',async()=>{
 const css=await read('adventure-atmosphere.css');
 for(const state of['data-atmosphere-paused=true','data-transition-paused=true','data-motion=false','data-ambient-paused=true','prefers-reduced-motion:reduce'])assert.ok(css.includes(state));
 assert.match(css,/#panel\.battle-mode #panel-content::before/);assert.match(css,/#town-panel\.battle-mode #town-panel-content::before/);assert.match(css,/pointer-events:none/);assert.match(css,/max-height:480px/);assert.match(css,/forced-colors:active/);
 assert.doesNotMatch(css,/#town-pad|\.direction-pad|\.town-header|#world\b|#town-canvas|setTimeout|filter:blur/);
 const js=await read('adventure-atmosphere.js');assert.doesNotMatch(js,/setTimeout|setInterval|requestAnimationFrame|fetch\(|showModal|\.focus\(/);
});
