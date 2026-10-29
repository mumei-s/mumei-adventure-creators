import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import {createOverlordCharacter} from '../overlord-character.js';
import {createOverlordArtSource} from '../overlord-art-source.js';
import {createArtLibrary,ART_FILES} from '../rpg-art.js';

const flush=()=>new Promise(resolve=>setImmediate(resolve));
const atlas={width:1254,height:1254},preview={width:256,height:256};

test('the queen has independently posed body parts sharing one unlit atlas texture',async()=>{
 const actor=createOverlordCharacter(THREE,{atlas});
 try{
  assert.equal(await actor.ready,true);assert(actor.rig.meshes instanceof Map);assert.equal(actor.rig.meshes.size,16);
  const {material,texture}=actor.rig;assert.equal(texture.image,atlas);assert.equal(material.map,texture);
  assert.equal(material.toneMapped,false);assert.equal(material.depthTest,true);assert.equal(material.depthWrite,false);assert.equal(material.side,THREE.DoubleSide);
  assert.equal(texture.minFilter,THREE.LinearMipmapLinearFilter);assert.equal(texture.generateMipmaps,true,'atlas mipmaps keep distant fine hair and gold details from shimmering');
  for(const part of actor.rig.meshes.values()){assert(part.isMesh);assert.equal(part.material,material);assert.equal(part.frustumCulled,false);}
  assert.equal(actor.swords.length,0);assert.equal(actor.metadata.embeddedSwords,0);
  const version=texture.version,idle=actor.update(.05,{state:'idle',time:2,attackProgress:0}),cast=actor.update(.05,{state:'special',time:2,attackProgress:.4});
  assert.notDeepEqual(cast.bones.forearmR,idle.bones.forearmR,'casting must move an elbow rather than only translate the picture');
  for(const state of actor.metadata.states){
   const pose=actor.update(.05,{state,time:2,stateElapsed:.6,attackProgress:.5});assert(actor.group.visible);assert.equal(pose.state,state);
   for(const part of actor.rig.meshes.values()){assert(part.position.toArray().every(Number.isFinite));assert(part.quaternion.toArray().every(Number.isFinite));}
   assert.equal(texture.image,atlas);assert.equal(texture.version,version,'animation must not upload a new texture every frame');
  }
 }finally{actor.dispose();}
});

test('embedded joint atlas appears before full network art and survives its failure',async()=>{
 let rejectFull;const full=new Promise((_,reject)=>rejectFull=reject),calls=[];
 const source=createOverlordArtSource({loadImage:async url=>{calls.push(url);return url.startsWith('data:image/webp;')?preview:full;}});
 const actor=createOverlordCharacter(THREE,{atlasSource:source});
 try{
  assert.equal(await actor.ready,true);assert.equal(actor.rig.texture.image,preview);assert(actor.group.visible);
  assert.equal(calls.length,2);assert(calls.some(url=>url.startsWith('data:image/webp;')));
  rejectFull(Error('offline'));await flush();assert(actor.group.visible);assert.equal(actor.rig.texture.image,preview);assert.equal(source.version,1);
 }finally{actor.dispose();}
});

test('full atlas upgrades the same texture once and disposal releases every GPU resource once',async()=>{
 let finishFull;const full=new Promise(resolve=>finishFull=resolve),source=createOverlordArtSource({loadImage:async url=>url.startsWith('data:image/webp;')?preview:full});
 const actor=createOverlordCharacter(THREE,{atlasSource:source});await actor.ready;
 const texture=actor.rig.texture,version=texture.version;finishFull(atlas);await flush();
 assert.equal(actor.rig.texture,texture);assert.equal(texture.image,atlas);assert.equal(texture.version,version+1);
 actor.setAtlas(atlas);assert.equal(texture.version,version+1,'the same atlas cannot be reuploaded');
 let textures=0,materials=0,geometries=0;texture.addEventListener('dispose',()=>textures++);actor.rig.material.addEventListener('dispose',()=>materials++);
 for(const part of actor.rig.meshes.values())part.geometry.addEventListener('dispose',()=>geometries++);
 actor.dispose();actor.dispose();assert.equal(textures,1);assert.equal(materials,1);assert.equal(geometries,16);assert.equal(actor.setAtlas(preview),false);
});

test('late preview decode cannot replace an already detailed atlas',async()=>{
 let finishPreview;const pendingPreview=new Promise(resolve=>finishPreview=resolve),source=createOverlordArtSource({loadImage:async url=>url.startsWith('data:image/webp;')?pendingPreview:atlas});
 const actor=createOverlordCharacter(THREE,{atlasSource:source});
 try{assert.equal(await actor.ready,true);assert.equal(actor.rig.texture.image,atlas);finishPreview(preview);await flush();assert.equal(actor.rig.texture.image,atlas);assert.equal(source.image,atlas);assert.equal(source.version,1);}finally{actor.dispose();}
});

test('late atlas completion cannot revive or upload into a disposed actor',async()=>{
 let finishPreview,finishFull;const pendingPreview=new Promise(resolve=>finishPreview=resolve),pendingFull=new Promise(resolve=>finishFull=resolve);
 const source=createOverlordArtSource({loadImage:async url=>url.startsWith('data:image/webp;')?pendingPreview:pendingFull}),actor=createOverlordCharacter(THREE,{atlasSource:source});
 actor.dispose();assert.equal(await actor.ready,false);finishPreview(preview);finishFull(atlas);await flush();
 assert.equal(actor.rig.texture.image,null);assert.equal(actor.rig.texture.version,0);assert.equal(actor.group.visible,false);assert.equal(actor.group.parent,null);
});

test('unavailable atlas sources settle readiness without leaving an endless loading state',async()=>{
 const source=createOverlordArtSource({loadImage:async()=>{throw Error('all art unavailable');}}),actor=createOverlordCharacter(THREE,{atlasSource:source});
 try{assert.equal(await actor.ready,false);assert.equal(actor.group.visible,false);assert.equal(source.image,null);}finally{actor.dispose();}
});

test('a whole-body roster portrait cannot overwrite the articulated joint atlas',async()=>{
 const actor=createOverlordCharacter(THREE,{atlas}),portrait={width:1024,height:1536};
 try{await actor.ready;const texture=actor.rig.texture,version=texture.version;assert.equal(actor.setImage(portrait),false);assert.equal(texture.image,atlas);assert.equal(texture.version,version);}finally{actor.dispose();}
});

test('deferred corridor art never fetches the optional queen until an explicit encounter request',async()=>{
 const calls=[],library=createArtLibrary({loadPlayer:false,deferOptional:true,deferScene:true,loadImage:async url=>(calls.push(url),{width:512,height:512})});
 await library.startScene();await library.loadRemaining();assert(!calls.some(url=>url.includes(ART_FILES.nameless_overlord.split('/').pop())));
 await library.ensure('nameless_overlord');assert.equal(calls.filter(url=>url.includes(ART_FILES.nameless_overlord.split('/').pop())).length,1);assert(library.images.nameless_overlord);
});

test('the shipped world stays within a small script budget and excludes archived queen models',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../game-script-manifest.json',import.meta.url),'utf8'));
 assert(manifest.world.bytes<220000,'optional world must not carry a megabyte of archived character geometry');
 for(const input of manifest.inputs)assert(!/overlord-(?:human-data|queen-data|boss|hair-cloth|regalia)\.js$/.test(input.path),input.path);
});
