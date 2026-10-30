import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import {createOverlordCharacter,OVERLORD_CHARACTER_URL} from '../overlord-character.js';
import {OVERLORD_SPRITE_PREVIEW} from '../overlord-sprite-preview.js';
import {createOverlordArtSource} from '../overlord-art-source.js';
import {createArtLibrary,ART_FILES} from '../rpg-art.js';
import {sampleOverlordSprite} from '../overlord-sprite.js';
import {OVERLORD_SPRITE_LAYOUT,OVERLORD_SPRITE_BOUNDS} from '../overlord-sprite-layout.js';

const flush=()=>new Promise(resolve=>setImmediate(resolve));
const atlas={width:1344,height:1632},preview={width:448,height:544};

test('the queen uses one ordinary whole-frame Sprite and retains one texture while selecting poses and deforming its intact geometry',async()=>{
 const actor=createOverlordCharacter(THREE,{atlas});
 try{
  assert.equal(await actor.ready,true);assert(actor.sprite.isSprite);assert.equal(actor.parts.size,0);assert.equal(actor.group.children.length,1);
  const {material,texture}=actor.rig;assert.equal(texture.image,atlas);assert.equal(material.map,texture);
  assert.equal(material.toneMapped,false);assert.equal(material.depthTest,true);assert.equal(material.depthWrite,false);assert.equal(material.isSpriteMaterial,true);
  assert.equal(texture.minFilter,THREE.LinearMipmapLinearFilter);assert.equal(texture.generateMipmaps,true,'atlas mipmaps keep distant fine hair and gold details from shimmering');
  assert.equal(actor.sprite.material,material);assert.equal(actor.sprite.frustumCulled,false);
  assert.equal(actor.swords.length,0);assert.equal(actor.metadata.embeddedSwords,0);
  assert.equal(actor.sprite.geometry.index.count/3,60);assert.equal(actor.sprite.geometry.attributes.position.count,42);
  const version=texture.version,idle=actor.update(.05,{state:'idle',time:2,attackProgress:0}),cast=actor.update(.05,{state:'special',time:2,attackProgress:.4});
  assert.equal(idle.frameIndex,0);assert.equal(cast.frameIndex,2);assert.notDeepEqual(cast.frame,idle.frame);
  assert.equal(actor.metadata.style,'whole-frame-sprite');assert.equal(actor.metadata.authoredPoseCount,7);
  assert.equal(actor.metadata.animationAssetComplete,false);assert(actor.metadata.animationLimitations.includes('missing-authored-directional-walk'));
  for(const state of actor.metadata.states){
   const pose=actor.update(.05,{state,time:2,stateElapsed:.6,attackProgress:.5});assert(actor.group.visible);assert.equal(pose.state,state);
   assert(actor.sprite.position.toArray().every(Number.isFinite));assert(actor.sprite.scale.toArray().every(Number.isFinite));
   assert.equal(texture.image,atlas);assert.equal(texture.version,version,'animation must not upload a new texture every frame');
  }
 }finally{actor.dispose();}
});

test('seven isolated full-body crops supply attacks, alternate steps, recoil and a held kneel',()=>{
 assert.deepEqual(OVERLORD_SPRITE_LAYOUT.frames.map(part=>part.frame),[[16,16,416,512],[464,16,416,512],[912,16,416,512],[16,560,416,512],[464,560,416,512],[912,560,416,512],[16,1104,416,512]]);
 assert.deepEqual(OVERLORD_SPRITE_LAYOUT.frames.map(part=>part.contentHeight),[491,489,489,491,491,491,491]);
 const sample=(state,progress)=>sampleOverlordSprite(atlas,OVERLORD_SPRITE_LAYOUT,{state,progress}).frameIndex;
 assert.deepEqual([0,.2,.5,.8,1].map(progress=>sample('attack',progress)),[0,1,2,1,0]);
 assert.deepEqual([0,.5,1].map(progress=>sample('stand',progress)),[6,5,0]);
 assert.deepEqual([0,.4,1].map(progress=>sample('hit',progress)),[0,5,0]);
 assert.deepEqual([0,.3,.6,1,9].map(progress=>sample('defeat',progress)),[0,5,6,6,6]);
 const steps=[0,.10,.36,.50,.72,.82].map(stateElapsed=>sampleOverlordSprite(atlas,OVERLORD_SPRITE_LAYOUT,{state:'walk',stateElapsed,attackProgress:.99}).frameIndex);
 assert.deepEqual(steps,[0,3,0,4,0,3],'authored loop duration and both different step drawings control the feet');
 assert.equal(sample('seated',0),6);
 for(const state of ['idle','walk','stand','seated','hit','attack']){
  const a=sampleOverlordSprite(atlas,OVERLORD_SPRITE_LAYOUT,{state,motion:false,time:0,progress:.1}),b=sampleOverlordSprite(atlas,OVERLORD_SPRITE_LAYOUT,{state,motion:false,time:100,progress:.8});
  assert.equal(a.frameIndex,0);assert.deepEqual(b,a);
 }
 for(const time of [0,1,100])assert.equal(sampleOverlordSprite(atlas,OVERLORD_SPRITE_LAYOUT,{state:'defeat',motion:false,time}).frameIndex,6,'reduced motion holds the earned final kneel');
 const info=sampleOverlordSprite(atlas,OVERLORD_SPRITE_LAYOUT,{state:'walk',stateElapsed:.2});
 assert.equal(info.authoredPoseCount,7);assert.equal(info.frontWalkArt,true);assert.equal(info.defeatArt,true);assert.equal(info.animationAssetComplete,false);
 assert(info.animationLimitations.includes('front-view-only'));assert(info.animationLimitations.includes('missing-authored-directional-walk'));assert(!info.animationLimitations.includes('missing-authored-defeat'));
});

test('measured crown heights and sole anchors stay aligned at detailed and embedded resolutions',()=>{
 for(const [index,part]of OVERLORD_SPRITE_LAYOUT.frames.entries()){
  const layout={...OVERLORD_SPRITE_LAYOUT,idleFrame:index},full=sampleOverlordSprite(atlas,layout),small=sampleOverlordSprite(preview,layout);
  assert.deepEqual(small.frame,full.frame.map(value=>value/3));assert.equal(small.contentHeight,full.contentHeight/3);
  assert.equal(small.anchorX,219.52/416);assert.equal(small.anchorY,full.anchorY);
  const [,,w,h]=part.frame,left=-w*part.anchorX/part.contentHeight,right=w*(1-part.anchorX)/part.contentHeight,top=1-h*part.anchorY/part.contentHeight,bottom=1+h*(1-part.anchorY)/part.contentHeight;
  assert(left>=OVERLORD_SPRITE_BOUNDS.left&&right<=OVERLORD_SPRITE_BOUNDS.right&&top>=OVERLORD_SPRITE_BOUNDS.top&&bottom<=OVERLORD_SPRITE_BOUNDS.bottom);
 }
});

test('embedded whole poses appear before full network art and survive its failure',async()=>{
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
 let textures=0,materials=0,geometries=0;actor.sprite.geometry.addEventListener('dispose',()=>geometries++);texture.addEventListener('dispose',()=>textures++);actor.rig.material.addEventListener('dispose',()=>materials++);
 actor.dispose();actor.dispose();assert.equal(textures,1);assert.equal(materials,1);assert.equal(geometries,1);assert.equal(texture.image,null);assert.equal(actor.setAtlas(preview),false);
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

test('a roster portrait cannot overwrite a sheet with different measured crops',async()=>{
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


test('the actual full atlas and embedded preview retain all seven registered crop coordinates',()=>{
 const dimensions=bytes=>{assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');assert.equal(bytes.toString('ascii',12,16),'VP8X');assert(bytes[20]&16,'authored poses must retain a real alpha channel');return [1+bytes.readUIntLE(24,3),1+bytes.readUIntLE(27,3)];};
 const full=readFileSync(new URL(OVERLORD_CHARACTER_URL)),small=Buffer.from(OVERLORD_SPRITE_PREVIEW.split(',')[1],'base64');
 assert.deepEqual(dimensions(full),[1344,1632]);assert.deepEqual(dimensions(small),[448,544]);assert(full.length<700000,'seven poses retain the mobile optional-art byte budget');
 for(let frame=0;frame<7;frame++){
  const layout={...OVERLORD_SPRITE_LAYOUT,idleFrame:frame},a=sampleOverlordSprite(atlas,layout,{motion:false}),b=sampleOverlordSprite(preview,layout,{motion:false});
  assert.deepEqual(a.frame,b.frame.map(value=>value*3));assert.equal(a.contentHeight,b.contentHeight*3);
 }
});
