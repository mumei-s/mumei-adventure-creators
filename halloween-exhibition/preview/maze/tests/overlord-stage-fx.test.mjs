import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {createOverlordStageEffects} from '../overlord-stage-fx.js';

test('stage atmosphere uses bounded native geometry and owns each GPU resource once',()=>{
 const effects=createOverlordStageEffects(THREE),resources=new Set();let triangles=0,meshes=0;
 effects.group.traverse(object=>{assert(!object.isSprite);if(object.geometry)resources.add(object.geometry);if(object.material){resources.add(object.material);if(object.material.map)resources.add(object.material.map);}if(object.isMesh){meshes++;triangles+=(object.geometry.index?.count??object.geometry.attributes.position.count)/3;}});
 assert(meshes<40);assert(triangles<4000);
 let disposals=0;for(const resource of resources)resource.addEventListener('dispose',()=>disposals++);
 effects.dispose();assert.equal(disposals,resources.size);effects.dispose();assert.equal(disposals,resources.size);
});

test('the astral portal and rising stone respond to rage while victory warms the floor seal',()=>{
 const effects=createOverlordStageEffects(THREE);effects.update({time:2,environment:{rage:0,portal:0,floorGlow:0}});assert.equal(effects.portal.visible,false);
 const calmOpacity=effects.seal.material.opacity;
 effects.update({time:4,environment:{rage:1,portal:.9,floorGlow:.8,wind:.6,emberSpeed:.7,pulse:.6}});assert.equal(effects.portal.visible,true);assert(effects.seal.material.opacity>calmOpacity+.2);
 const shards=effects.group.children.filter(object=>object.name==='rising-marble-fragment');assert(shards.every(object=>object.visible));assert(shards.some(object=>object.position.y>.3));
 const red=effects.seal.material.color.clone();effects.update({time:5,environment:{rage:0,gold:1,portal:0,floorGlow:0}});assert.equal(effects.portal.visible,false);assert(effects.seal.material.color.g>red.g);assert(shards.every(object=>!object.visible));effects.dispose();
});

test('reduced motion leaves the same particle and geometry state across time',()=>{
 const effects=createOverlordStageEffects(THREE),input={motion:false,environment:{rage:.8,portal:.6,floorGlow:.5,wind:.6,emberSpeed:.7,pulse:.6}};
 const snapshot=()=>{const transforms=[];effects.group.traverse(object=>{transforms.push(...object.position,...object.rotation.toArray().slice(0,3),...object.scale);});return {transforms,embers:[...effects.embers.geometry.attributes.position.array],sealOpacity:effects.seal.material.opacity};};
 effects.update({...input,time:1});const first=snapshot();effects.update({...input,time:999});assert.deepEqual(snapshot(),first);assert(first.transforms.every(Number.isFinite));effects.dispose();
});
