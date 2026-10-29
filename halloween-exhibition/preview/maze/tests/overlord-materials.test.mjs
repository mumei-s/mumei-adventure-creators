import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {createOverlordMaterialSource,createOverlordGeneratedMaterialSource,attachOverlordMaterials} from '../overlord-materials.js';

test('native material requests share decoding, retry the failed source, and do not cache permanent failures',async()=>{
 let calls=0;
 const source=createOverlordMaterialSource({url:'atlas.webp',loadImage:async url=>{calls++;if(calls===1)throw Error('transient');return {url};}});
 const [a,b]=await Promise.all([source.load(),source.load()]);assert.equal(a,b);assert.equal(calls,2);assert.match(a.url,/material-retry/);
 let failed=0;const broken=createOverlordMaterialSource({loadImage:async()=>{failed++;throw Error('offline');}});
 await assert.rejects(broken.load(),/offline/);await assert.rejects(broken.load(),/offline/);assert.equal(failed,4);
});

test('late image completion cannot texture a disposed scene or another model',async()=>{
 let resolve,applied=0;const image=new Promise(r=>resolve=r),source={load:()=>image};
 const attachment=attachOverlordMaterials(THREE,{setTextures(){applied++;}},{source});attachment.dispose();attachment.dispose();resolve({width:2048,height:2048});assert.equal(await attachment.ready,false);assert.equal(applied,0);
});

test('atlas quadrants are independent transforms on one image source and disposal remains owned',async()=>{
 let textures;const states=[];
 const attachment=attachOverlordMaterials(THREE,{setTextures(next){textures=next;}},{source:{load:async()=>({width:2048,height:2048})},onState:s=>states.push(s)});
 assert.equal(await attachment.ready,true);assert.deepEqual(states,['loading','ready']);assert.equal(Object.keys(textures).length,4);
 assert.equal(textures.face.source,textures.armor.source);for(const [name,region]of Object.entries({face:[0,.5],armor:[.5,.5],hair:[0,0],cape:[.5,0]})){const map=textures[name];for(let axis=0;axis<2;axis++){const offset=map.offset.toArray()[axis],repeat=map.repeat.toArray()[axis];assert(offset>region[axis]);assert(offset+repeat<region[axis]+.5,'bilinear edge remains inside '+name);}}
 let disposed=0;for(const texture of Object.values(textures))texture.addEventListener('dispose',()=>disposed++);attachment.dispose();attachment.dispose();assert.equal(disposed,4);
});

const generatedImages=()=>Object.fromEntries(['generatedBase','generatedNormal','generatedFront'].map(name=>[name,{width:2048,height:2048,name}]));
const generatedBoss=setTextures=>({metadata:{surfaceSource:'queen-rigbase-v1'},setTextures});

test('generated surface retries only failed images and shares successful decoding between scenes',async()=>{
 const calls=new Map(),urls={generatedBase:'base.webp',generatedNormal:'normal.jpg',generatedFront:'front.webp'};
 const source=createOverlordGeneratedMaterialSource({urls,loadImage:async url=>{
  const key=url.split('?')[0],count=(calls.get(key)||0)+1;calls.set(key,count);
  if(key==='normal.jpg'&&count<3)throw Error('normal offline');return {width:2048,height:2048,key};
 }});
 const first=source.load();assert.equal(source.load(),first);await assert.rejects(first,/normal offline/);
 const [a,b]=await Promise.all([source.load(),source.load()]);assert.equal(a,b);
 assert.deepEqual(Object.fromEntries(calls),{'base.webp':1,'normal.jpg':3,'front.webp':1});
 assert.equal(a.generatedNormal.key,'normal.jpg');assert.equal(await source.load(),a);
});

test('generated glTF surfaces wait for all required images and use their own UV channels and color spaces',async()=>{
 let resolve,applied=0,textures;const pending=new Promise(r=>resolve=r),states=[],visibility=[];
 const boss={...generatedBoss(next=>{textures=next;applied++;}),setSurfaceReady:ready=>visibility.push(ready)};
 const attachment=attachOverlordMaterials(THREE,boss,{
  source:{load:async()=>({width:2048,height:2048})},generatedSource:{load:()=>pending},onState:state=>states.push(state)
 });
 await Promise.resolve();assert.equal(applied,0);assert.deepEqual(states,['loading']);assert.deepEqual(visibility,[false]);
 const images=generatedImages();resolve(images);assert.equal(await attachment.ready,true);assert.equal(applied,1);assert.deepEqual(states,['loading','ready']);assert.deepEqual(visibility,[false,true]);
 assert.deepEqual(Object.keys(textures).sort(),['cape','generatedBase','generatedFront','generatedNormal','hair']);
 for(const name of ['generatedBase','generatedNormal','generatedFront']){
  const map=textures[name];assert.equal(map.image,images[name]);assert.equal(map.flipY,false);assert.deepEqual(map.repeat.toArray(),[1,1]);assert.deepEqual(map.offset.toArray(),[0,0]);
  assert.equal(map.channel,name==='generatedFront'?1:0);assert.equal(map.colorSpace,name==='generatedNormal'?THREE.NoColorSpace:THREE.SRGBColorSpace);
 }
 assert.equal(textures.hair.flipY,true);assert.equal(textures.cape.flipY,true);
 let disposed=0;for(const texture of Object.values(textures))texture.addEventListener('dispose',()=>disposed++);
 attachment.dispose();attachment.dispose();assert.equal(disposed,5);assert.deepEqual(visibility,[false,true,false]);
});

test('missing generated images cannot install a legacy face or report a ready model',async()=>{
 for(const generatedSource of [{load:async()=>{throw Error('required front failed');}},{load:async()=>({generatedBase:{},generatedNormal:{}})}]){
  let applied=0;const states=[],visibility=[],attachment=attachOverlordMaterials(THREE,{...generatedBoss(()=>applied++),setSurfaceReady:ready=>visibility.push(ready)},{
   source:{load:async()=>({width:2048,height:2048})},generatedSource,onState:state=>states.push(state)
  });
  assert.equal(await attachment.ready,false);assert.equal(applied,0);assert.deepEqual(states,['loading','error']);assert(visibility.every(ready=>ready===false));attachment.dispose();
 }
});

test('generated completion after disposal cannot install textures or notify readiness',async()=>{
 let resolve,applied=0;const states=[],pending=new Promise(r=>resolve=r);
 const attachment=attachOverlordMaterials(THREE,generatedBoss(()=>applied++),{
  source:{load:async()=>({width:2048,height:2048})},generatedSource:{load:()=>pending},onState:state=>states.push(state)
 });
 attachment.dispose();resolve(generatedImages());assert.equal(await attachment.ready,false);assert.equal(applied,0);assert.deepEqual(states,['loading']);
});

test('two generated attachments own separate textures over the same decoded images',async()=>{
 const images=generatedImages(),source={load:async()=>({width:2048,height:2048})},generatedSource={load:async()=>images};let a,b;
 const first=attachOverlordMaterials(THREE,generatedBoss(next=>a=next),{source,generatedSource}),second=attachOverlordMaterials(THREE,generatedBoss(next=>b=next),{source,generatedSource});
 assert.deepEqual(await Promise.all([first.ready,second.ready]),[true,true]);let secondDisposals=0;
 for(const name of Object.keys(images)){assert.notEqual(a[name],b[name]);assert.equal(a[name].image,b[name].image);b[name].addEventListener('dispose',()=>secondDisposals++);}
 first.dispose();assert.equal(secondDisposals,0);second.dispose();assert.equal(secondDisposals,3);
});

test('a rejected generated material installation releases its textures and keeps the surface hidden',async()=>{
 let disposed=0;const visibility=[],states=[];
 const boss={...generatedBoss(textures=>{for(const texture of Object.values(textures))texture.addEventListener('dispose',()=>disposed++);throw Error('install failed');}),setSurfaceReady:ready=>visibility.push(ready)};
 const attachment=attachOverlordMaterials(THREE,boss,{source:{load:async()=>({width:2048,height:2048})},generatedSource:{load:async()=>generatedImages()},onState:state=>states.push(state)});
 assert.equal(await attachment.ready,false);assert.equal(disposed,5);assert(visibility.every(ready=>ready===false));assert.deepEqual(states,['loading','error']);attachment.dispose();assert.equal(disposed,5);
});
