import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {townPalaceFraming} from '../palace-framing.js';
import {getTownMap} from '../story-data.js';
import {isInPalaceForecourt,palaceForecourtInfluence} from '../palace-forecourt.js';

test('shared palace camera math preserves its existing approach coordinates and clear-space envelope',()=>{
 const map=getTownMap(),elevation=55*Math.PI/180;
 const portrait=townPalaceFraming({x:32.5,z:8.5},map,elevation,390,844);
 assert.deepEqual(portrait,{influence:1,pixelsPerTile:21.91011235955056,targetX:32,targetZ:6.4,targetY:7.169094270413787});
 for(const [width,height]of[[320,580],[390,844],[920,320],[1280,720]])for(const x of[16,17,17.001,18,32,46.999,47,48])for(const z of[1,8.5,20,20.999,21,30]){
  const point={x,z},framing=townPalaceFraming(point,map,elevation,width,height);
  assert.equal(framing.influence>0,isInPalaceForecourt(point));assert.ok(Math.abs(framing.influence-palaceForecourtInfluence(point))<1e-12);
 }
 assert.deepEqual(townPalaceFraming({x:32,z:8.5},getTownMap('library'),elevation,390,844),{influence:0});
});

test('the fallback 2D town renderer never statically pulls in the optional Three.js scene',async()=>{
 const seen=new Set(),root=new URL('../renderer.js',import.meta.url);
 async function inspect(url){
  url=new URL(url);url.search='';url.hash='';if(seen.has(url.href))return;seen.add(url.href);
  assert.ok(!/\/(?:vendor\/three[^/]*|world-3d|palace-architecture|creator-home-architecture)\.js$/.test(url.pathname),'2D startup must not include '+url.pathname);
  const source=await readFile(url,'utf8');
  const references=[...source.matchAll(/\b(?:import|export)\s+(?:(?![;\n]).)*?\bfrom\s*['"]([^'"]+)['"]|\bimport\s*['"]([^'"]+)['"]/g)];
  await Promise.all(references.map(match=>{const target=match[1]||match[2];return target.startsWith('.')?inspect(new URL(target,url)):undefined;}));
 }
 await inspect(root);assert.ok(seen.has(new URL('../palace-framing.js',import.meta.url).href),'2D and optional 3D use the same lightweight framing helper');
 const source=await readFile(new URL('../palace-framing.js',import.meta.url),'utf8');assert.ok(!/\b(?:import|export)\s+[^;]*\bfrom\s*['"]/.test(source),'framing math has no module dependencies');
});
