import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {createOverlordStageEffects} from '../overlord-stage-fx.js';

test('stage atmosphere uses bounded native geometry and owns each GPU resource once',()=>{
 const effects=createOverlordStageEffects(THREE),resources=new Set();let triangles=0,meshes=0,sprites=0;
 effects.group.traverse(object=>{if(object.isSprite){sprites++;assert.match(object.name,/^painted-(sword-wake|impact-flare|casting-aura)$/);assert.equal(object.visible,false);}else if(object.geometry)resources.add(object.geometry);if(object.material){resources.add(object.material);if(object.material.map)resources.add(object.material.map);}if(object.isMesh){meshes++;triangles+=(object.geometry.index?.count??object.geometry.attributes.position.count)/3;}});
 assert.equal(sprites,3,'three painted energy layers are pooled once');assert(meshes<40);assert(triangles<4000);
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


test('painted native energy upgrades pooled maps once, retains objects across frames and stops with motion OFF',()=>{
 const images={},effects=createOverlordStageEffects(THREE,{images});
 try{
  const layers=effects.group.children.filter(object=>object.isSprite),objects=[],textures=layers.map(layer=>layer.material.map);
  effects.group.traverse(object=>objects.push(object));
  const active={environment:{stream:1,flash:.8,pulse:.7,rift:1},boss:{x:1,y:0,z:2},target:{x:-1,y:0,z:3}};
  effects.update({...active,time:1});assert(layers.every(layer=>!layer.visible),'missing optional art never creates opaque substitute cards');
  const image={width:1536,height:512};images.battleEnergy=image;
  effects.update({...active,time:2});assert(layers.every(layer=>layer.visible));
  const versions=textures.map(texture=>texture.version);
  layers.forEach((layer,index)=>{assert.equal(layer.material.map,textures[index]);assert.equal(textures[index].image,image);assert.equal(textures[index].repeat.x,1/3);assert.equal(textures[index].offset.x,index/3);});
  for(let frame=0;frame<120;frame++)effects.update({...active,time:2+frame/60});
  const after=[];effects.group.traverse(object=>after.push(object));assert.deepEqual(after,objects,'rendering cannot allocate another effect object');
  assert.deepEqual(textures.map(texture=>texture.version),versions,'the same painted source cannot be uploaded every frame');
  effects.update({...active,time:9,motion:false});assert(layers.every(layer=>!layer.visible));
  let disposed=0;textures.forEach(texture=>texture.addEventListener('dispose',()=>disposed++));effects.dispose();effects.dispose();assert.equal(disposed,3);
 }finally{effects.dispose();}
});
