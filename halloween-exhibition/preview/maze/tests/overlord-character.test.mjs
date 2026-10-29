import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import {createOverlordCharacter} from '../overlord-character.js';
import {createArtLibrary,ART_FILES} from '../rpg-art.js';

const flush=()=>new Promise(resolve=>setImmediate(resolve));
const image={width:1024,height:1536},portraitUnavailable={load:async()=>{throw Error('portrait offline');}};

test('original art stays visible from the camera front without a skeleton or lighting-dependent materials',async()=>{
 const actor=createOverlordCharacter(THREE,{image,identitySource:portraitUnavailable});
 try{
  assert.equal(await actor.ready,true);assert(actor.sprite.isSprite);assert.equal(actor.sprite.material.map.image,image);
  assert.equal(actor.sprite.material.toneMapped,false);assert.equal(actor.sprite.material.depthTest,true);assert.equal(actor.sprite.material.depthWrite,false);
  assert.equal(actor.sprite.material.map.minFilter,THREE.LinearMipmapLinearFilter);assert.equal(actor.sprite.material.map.generateMipmaps,true,'whole-image mipmaps keep distant fine hair and gold details from shimmering');
  assert.deepEqual(actor.sprite.center.toArray(),[.5,0]);let skins=0;actor.group.traverse(node=>{if(node.isSkinnedMesh)skins++;});assert.equal(skins,0);assert.equal(actor.swords.length,0);
  for(const state of actor.metadata.states){actor.update(.05,{state,time:2,attackProgress:.5});assert(actor.sprite.visible);assert(actor.sprite.position.toArray().every(Number.isFinite));assert.equal(actor.sprite.material.map.image,image);}
  await flush();assert(actor.sprite.visible,'an unavailable portrait must not hide approved art');
 }finally{actor.dispose();}
});

test('embedded art preview appears before full network art and survives its failure',async()=>{
 let rejectFull;const full=new Promise((_,reject)=>rejectFull=reject),preview={width:128,height:192};
 const actor=createOverlordCharacter(THREE,{loadImage:async url=>{assert(url.startsWith('data:image/webp;'));return preview;},artSource:{load:()=>full},identitySource:portraitUnavailable});
 try{assert.equal(await actor.ready,true);assert.equal(actor.sprite.material.map.image,preview);rejectFull(Error('offline'));await flush();assert(actor.sprite.visible);assert.equal(actor.sprite.material.map.image,preview);}finally{actor.dispose();}
});

test('full art replaces the preview once and late completion cannot revive a disposed actor',async()=>{
 let finishFull;const full=new Promise(resolve=>finishFull=resolve),actor=createOverlordCharacter(THREE,{loadImage:async()=>({width:128,height:192}),artSource:{load:()=>full},identitySource:portraitUnavailable});
 await actor.ready;const old=actor.sprite.material.map;let disposed=0;old.addEventListener('dispose',()=>disposed++);finishFull(image);await flush();assert.equal(actor.sprite.material.map.image,image);assert.equal(disposed,1);
 const current=actor.sprite.material.map;let released=0;current.addEventListener('dispose',()=>released++);actor.setImage(image);assert.equal(actor.sprite.material.map,current,'same image cannot create a texture every frame');actor.dispose();actor.dispose();assert.equal(released,1);
 let late;const pending=createOverlordCharacter(THREE,{loadImage:()=>new Promise(resolve=>late=resolve),artSource:{load:()=>new Promise(()=>{})},identitySource:portraitUnavailable});pending.dispose();assert.equal(await pending.ready,false);late(image);await flush();assert.equal(pending.sprite.material.map,null);
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
