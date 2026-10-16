// Real Three scene/resource objects with network and renderer boundaries stubbed.
// This verifies ownership and disposal, not GPU allocation or browser behavior.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../vendor/three.module.js';
const source=fs.readFileSync(new URL('../world.js',import.meta.url),'utf8');
const exhibits=source.slice(source.indexOf('  const textureLoader=new THREE.TextureLoader();'),source.indexOf('  function creatorNameTexture('));
const dispose=source.match(/  function dispose\(\)\{[^\n]+\}/)[0];
function harness(){
 const created=[],requests=[],resources=new Set(),scene=new THREE.Scene(),exhibitGroup=new THREE.Group();scene.add(exhibitGroup);let rendererDisposals=0;
 const track=resource=>{let count=0;resource.addEventListener('dispose',()=>count++);created.push({resource,disposals:()=>count});return resource;};
 const sharedBox=track(new THREE.BoxGeometry(1,1,1)),sharedGold=track(new THREE.MeshBasicMaterial()),actorGeometry=track(new THREE.PlaneGeometry(1,1)),actorTexture=track(new THREE.Texture()),actorMaterial=track(new THREE.MeshBasicMaterial({map:actorTexture}));
 for(const resource of [sharedBox,sharedGold,actorGeometry,actorMaterial,actorTexture])resources.add(resource);
 const actor=new THREE.Mesh(actorGeometry,actorMaterial);scene.add(actor);
 const dependencies={...THREE,TextureLoader:class{load(url,onLoad){requests.push({url,onLoad});}},MeshBasicMaterial:class extends THREE.MeshBasicMaterial{constructor(options){super(options);track(this);}},PlaneGeometry:class extends THREE.PlaneGeometry{constructor(...args){super(...args);track(this);}}};
 const context=vm.createContext({THREE:dependencies,exhibitGroup,resources,FEATURES:{article:{x:8,z:8}},gold:sharedGold,point:f=>f,renderer:{dispose:()=>rendererDisposals++},
  box(w,h,d,x,y,z,material,parent){const mesh=new THREE.Mesh(sharedBox,material);mesh.scale.set(w,h,d);mesh.position.set(x,y,z);parent.add(mesh);return mesh;},
  mesh(geometry,material,x,y,z,parent){resources.add(geometry);const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);parent.add(mesh);return mesh;},
  textTexture(){const texture=track(new THREE.Texture());resources.add(texture);return texture;},
 });
 vm.runInContext(`let disposed=false,sceneryVersion=0;${exhibits}${dispose};globalThis.api={setExhibits,dispose,version:()=>sceneryVersion}`,context);
 return {api:context.api,created,resources,scene,exhibitGroup,actor,shared:[sharedBox,sharedGold,actorGeometry,actorMaterial,actorTexture],requests,texture:()=>track(new THREE.Texture()),rendererDisposals:()=>rendererDisposals};
}
test('100 exhibit replacements retain one shared frame geometry and a constant set of owned resources',()=>{
 const h=harness(),baseline=h.resources.size;
 for(let index=0;index<100;index++){
  h.api.setExhibits([{title:`Article ${index}`,position:{x:8,z:8}}]);
  assert.equal(h.exhibitGroup.children.length,1);assert.equal(h.resources.size,baseline+3);
  const frame=h.exhibitGroup.children[0].children[0];assert.equal(frame.geometry,h.shared[0]);assert.equal(frame.material,h.shared[1]);
  assert.equal(h.scene.children.includes(h.actor),true);
 }
 for(const record of h.created){assert.equal(record.disposals(),h.resources.has(record.resource)?0:1);}
 h.api.setExhibits([]);assert.equal(h.resources.size,baseline);assert.equal(h.exhibitGroup.children.length,0);
 for(const resource of h.shared)assert.equal(h.created.find(record=>record.resource===resource).disposals(),0);
 h.api.dispose();h.api.dispose();assert.equal(h.rendererDisposals(),1);assert.equal(h.resources.size,0);
 for(const record of h.created)assert.equal(record.disposals(),1);
});
test('stale image callbacks are disposed, current placeholder textures are replaced once, and late loads after world disposal stay detached',()=>{
 const h=harness(),baseline=h.resources.size;
 h.api.setExhibits([{title:'First',image:'first.webp'}]);h.api.setExhibits([{title:'Second',image:'second.webp'}]);
 const obsolete=h.texture();h.requests[0].onLoad(obsolete);assert.equal(h.resources.has(obsolete),false);
 const current=h.texture();h.requests[1].onLoad(current);assert.equal(h.resources.size,baseline+3);assert.equal(h.exhibitGroup.children[0].children[1].material.map,current);
 h.api.setExhibits([{title:'Third',image:'third.webp'}]);h.api.dispose();const late=h.texture();h.requests[2].onLoad(late);
 assert.equal(h.resources.size,0);assert.equal(h.resources.has(late),false);assert.equal(h.rendererDisposals(),1);
 for(const record of h.created)assert.equal(record.disposals(),1);
 const nodes=h.exhibitGroup.children.length;h.api.setExhibits([{title:'After disposal'}]);assert.equal(h.exhibitGroup.children.length,nodes);assert.equal(h.resources.size,0);
});
