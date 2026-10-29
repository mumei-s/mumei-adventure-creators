import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {createOverlordMaterialSource,attachOverlordMaterials} from '../overlord-materials.js';

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
