import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {checkGameScripts,rebaseDynamicImport,sourceModuleURL,rebaseStyleURL} from '../scripts/build-game-scripts.mjs';

test('cross-directory source URLs retain their original image directory',()=>{
 const bundle='https://example.com/preview/town/game-entry.js?v=release';
 const relative=sourceModuleURL('/site/preview/maze/rpg-art.js','/site/preview/town');
 const expression=`new URL(${JSON.stringify(relative)}, ${JSON.stringify(bundle)}).href`;
 const original=vm.runInNewContext(expression,{URL});
 assert.equal(new URL('./assets/rpg/player.webp',original).href,'https://example.com/preview/maze/assets/rpg/player.webp');
 assert.equal(new URL('./assets/creator-npcs/owner.webp',original).href,'https://example.com/preview/maze/assets/creator-npcs/owner.webp');
});
test('optional imports are rebased from their original module and retain release queries',()=>{
 assert.equal(rebaseDynamicImport('./world.js?v=release','/site/preview/maze/app.js','/site/preview/town'),'../maze/world.js?v=release');
 assert.equal(rebaseDynamicImport('./world-3d.js?v=release','/site/preview/town/app.js','/site/preview/town'),'./world-3d.js?v=release');
 assert.equal(rebaseDynamicImport('https://example.com/world.js','/site/preview/town/app.js','/site/preview/town'),'https://example.com/world.js');
});
test('combined styles keep shared-file image URLs relative to their source stylesheet',()=>{
 assert.equal(rebaseStyleURL('./assets/castle.webp?v=one','/site/preview/adventure-atmosphere.css','/site/preview/town'),'../assets/castle.webp?v=one');
 assert.equal(rebaseStyleURL('assets/room.webp','/site/preview/maze/stage-2d.css','/site/preview/maze'),'./assets/room.webp');
 assert.equal(rebaseStyleURL('data:image/svg+xml;base64,AA==','/site/preview/game.css','/site/preview/town'),'data:image/svg+xml;base64,AA==');
 assert.equal(rebaseStyleURL('#clip','/site/preview/game.css','/site/preview/town'),'#clip');
});
test('committed game bundles are current, inline their data and preserve emitted asset bases',async()=>{
 const manifests=await checkGameScripts();
 for(const manifest of manifests){
  const script=await readFile(new URL(`../${manifest.output.path}`,import.meta.url),'utf8');
  const bundleURL=`https://example.com/preview/${manifest.output.path}`;
  assert.ok(manifest.imports.length>0);
  assert.ok(manifest.imports.every(item=>item.kind==='dynamic-import'&&item.external));
  assert.ok(manifest.contributions.every(item=>!item.path.includes('/vendor/')),'first playable scene excludes THREE');
  const worldScript=await readFile(new URL(`../${manifest.world.path}`,import.meta.url),'utf8');
  assert.ok(manifest.world.imports.every(item=>item.kind==='dynamic-import'||item.path.includes('/vendor/')));
  assert.ok(manifest.world.imports.some(item=>item.path.includes('/vendor/')));
  assert.ok(script.includes(`import("./game-world.js?v=20261019-game-fast1-${manifest.world.sha256.slice(0,12)}")`));
  const worldURL=`./game-world.js?v=20261019-game-fast1-${manifest.world.sha256.slice(0,12)}`;
  assert.ok(script.split(JSON.stringify(worldURL)).length>=3,'preload and dynamic import use the same exact versioned world URL');
  assert.doesNotMatch(script,/globalThis\.__ATELIER_GAME_WORLD_URL__/,'world URL is resolved at build time');
  assert.doesNotMatch(worldScript,/from["'][^"']*camera-distance/);
  assert.doesNotMatch(script,/^import\s/m);
  assert.match(script,/schemaVersion:1/);
  const html=await readFile(new URL(`../${manifest.game}/index.html`,import.meta.url),'utf8');
  assert.equal((html.match(/<link\b[^>]*rel="stylesheet"/g)||[]).length,1);
  assert.equal((html.match(/<script\b[^>]*type="module"/g)||[]).length,1);
  assert.deepEqual(manifest.styleSources,JSON.parse(await readFile(new URL(`../${manifest.game}/game-style-sources.json`,import.meta.url),'utf8')));
  const expressions=[...script.matchAll(/new URL\("([^\"]+\.js)",import\.meta\.url\)\.href/g)].map(match=>match[0]);
  assert.ok(expressions.length>0,'original module bases survive minification');
  for(const original of manifest.moduleURLs){
   const expression=expressions.find(value=>value.includes(JSON.stringify(original.relative)));
   assert.ok(expression,`emitted base for ${original.path}`);
   const emitted=vm.runInNewContext(expression.replace('import.meta.url',JSON.stringify(bundleURL)),{URL});
   assert.equal(emitted,`https://example.com/preview/${original.path}`);
  }
  for(const item of manifest.imports)assert.ok(script.includes(`import(${JSON.stringify(item.path)})`));
 }
});
