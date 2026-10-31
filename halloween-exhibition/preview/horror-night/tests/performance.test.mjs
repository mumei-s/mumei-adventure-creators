import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {CAST_IMAGE_MAP,optimizedCastSource} from '../cast-image-map.js';
const source=fs.readFileSync(new URL('../required-art-cache.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export function','function');
test('derived required cache blocks unused visitor warmup but preserves owner/cat requests',async()=>{
 const requests=[],pins=[];const base={request:a=>{requests.push(a.src);return Promise.resolve(a.src)},setPinned:s=>pins.push(s),get:s=>s,status:()=>({}),dispose(){}};
 const ctx=vm.createContext({Set,Promise});vm.runInContext(source+';globalThis.make=createRequiredArtCache;',ctx);const cache=ctx.make(base);
 cache.setPinned(['owner','cat']);assert.equal(await cache.request({src:'owner'}),'owner');assert.equal(await cache.request({src:'cat'}),'cat');
 cache.setPinned(['owner','cat','guest']);assert.equal(await cache.request({src:'guest'}),null);
 assert.deepEqual(requests,['owner','cat']);assert.deepEqual([...pins.at(-1)],['owner','cat']);assert.equal(cache.get('owner'),'owner');
});
test('all21 same-source guest atlas derivatives exist; runtime map contains no manuscript metadata',()=>{
 assert.equal(Object.keys(CAST_IMAGE_MAP).length,21);
 for(const [source,entry] of Object.entries(CAST_IMAGE_MAP)){const target=entry.src.split('?')[0];
  assert.match(source,/^assets\/creator-npcs\/[a-z0-9-]+\.webp$/);assert.match(target,/^\.\/assets\/cast-512\/[a-z0-9-]+\.webp$/);
  const data=fs.readFileSync(new URL('../'+target.slice(2),import.meta.url));assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WEBP');
 }
 const map=fs.readFileSync(new URL('../cast-image-map.js',import.meta.url),'utf8');assert.doesNotMatch(map,/sourceSHA|upload|reference|note.com|description/);
});
test('HTML preloads only exact existing owner/cat originals before module startup',()=>{
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const links=[...html.matchAll(/<link rel="preload" as="image" href="([^"]+)" fetchpriority="high">/g)].map(m=>m[1]);
 assert.deepEqual(links,['../maze/assets/creator-npcs/owner-lantern-walk.webp?v=bfa859d95117','../maze/assets/creator-npcs/owner-black-cat-walk.webp?v=58daf1ef16de']);
 assert.ok(html.indexOf('rel="preload"')<html.indexOf('<script type="module"'));
});

test('changed canonical asset revision rejects stale pre-sized artwork',()=>{
 for(const [src,entry]of Object.entries(CAST_IMAGE_MAP)){
  assert.equal(optimizedCastSource({src,sha256:entry.revision}),entry.src);
  assert.equal(optimizedCastSource({src,sha256:'different'}),null);
 }
 assert.equal(optimizedCastSource({src:'unknown',sha256:'x'}),null);
});
