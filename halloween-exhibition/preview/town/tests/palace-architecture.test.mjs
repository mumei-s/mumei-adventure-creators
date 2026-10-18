import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../maze/vendor/three.module.js';
import {createTownSceneGeometry,TOWN_3D_CAMERA_ELEVATION,town3DCameraParameters} from '../world-3d.js';
import {animateTownPalace,townPalaceFraming,TOWN_PALACE_COLORS} from '../palace-architecture.js';
import {getTownMap} from '../story-data.js';

test('the whole palace has its own violet spires, gold entrance and stained glass while preserving its collision footprint',()=>{
  const town=createTownSceneGeometry(),palace=town.buildings.find(b=>b.palace),story=getTownMap().buildings.find(b=>b.kind==='castle');
  assert.deepEqual(palace.footprint,{x:story.x,z:story.z,w:story.w,h:story.h});assert.deepEqual(palace.door,story.door);
  const meshes=town.root.children.filter(item=>item.userData.bucket==='castle'),names=new Set(meshes.map(item=>item.material.name));
  for(const name of['palace-stone','palace-roof','palace-gold','palace-door','palace-glass-teal','palace-glass-rose'])assert(names.has(name));
  assert.equal(TOWN_PALACE_COLORS.roof,'#462c70');assert.equal(town.palaceEffects.filter(item=>item.kind==='banner').length,5);
  const bounds=new THREE.Box3();for(const mesh of meshes)bounds.expandByObject(mesh);
  assert(bounds.max.y>13,'multiple raised spires are a full palace above the entrance');assert(bounds.max.z-bounds.min.z>6,'the side walls and entrance have real depth');assert(town.root.children.length<320);town.dispose();
});

test('the palace flags deform continuously without moving their poles, and reduced motion is stable',()=>{
  const town=createTownSceneGeometry(),effect=town.palaceEffects.find(item=>item.kind==='banner'),positions=effect.object.geometry.attributes.position;
  animateTownPalace(town.palaceEffects,1,true);const first=positions.array.slice();animateTownPalace(town.palaceEffects,1.016,true);const next=positions.array.slice();
  assert(first.some((v,i)=>Math.abs(v-next[i])>1e-5));assert(Math.max(...first.map((v,i)=>Math.abs(v-next[i])))<.02,'movement advances by a small amount at each frame');
  for(let n=0;n<positions.count;n++)if(effect.rest[n*3]===0){assert.equal(positions.array[n*3+1],effect.rest[n*3+1]);assert.equal(positions.array[n*3+2],0);}
  animateTownPalace(town.palaceEffects,20,false);const frozen=positions.array.slice();animateTownPalace(town.palaceEffects,40,false);assert.deepEqual(positions.array,frozen);town.dispose();
});

test('palace approach framing keeps its highest tower, both facades and the player in portrait and landscape views',()=>{
  const map=getTownMap(),elevation=TOWN_3D_CAMERA_ELEVATION,position={x:32.5,z:8.5};
  for(const [width,height]of[[320,580],[390,600],[920,320],[1280,720]]){
    const framing=townPalaceFraming(position,map,elevation,width,height),params=town3DCameraParameters(width,height),pixels=Math.min(params.pixelsPerTile,framing.pixelsPerTile);
    assert.equal(framing.influence,1);const camera=new THREE.OrthographicCamera(-width/pixels/2,width/pixels/2,height/pixels/2,-height/pixels/2,.1,100),target={x:position.x+(framing.targetX-position.x)*.78,y:framing.targetY,z:framing.targetZ};
    camera.position.set(target.x,target.y+Math.sin(elevation)*34,target.z+Math.cos(elevation)*34);camera.lookAt(target.x,target.y,target.z);camera.updateMatrixWorld(true);
    for(const point of[[25,0,6],[39,0,6],[32,14,2.25],[position.x,0,position.z]]){
      const projected=new THREE.Vector3(...point).project(camera);assert(Math.abs(projected.x)<.99,`${width}×${height}: facade fits horizontally`);assert(Math.abs(projected.y)<.99,`${width}×${height}: tower and player fit vertically`);
    }
  }
  assert.equal(townPalaceFraming({x:32,z:30},map,elevation,390,600).influence,0);assert.equal(townPalaceFraming(position,getTownMap('library'),elevation,390,600).influence,0);
});

test('palace masonry and slate arrive with the geometry and ornament stays inside the mobile draw budget',()=>{
  const town=createTownSceneGeometry(),castle=town.root.children.filter(item=>item.userData.bucket==='castle'),textures=[...town.resources].filter(item=>item.isTexture);
  assert.ok(castle.length<45,'stone courses and ornament share instanced batches');
  const materials=castle.map(item=>item.material),stone=materials.find(item=>item.name==='palace-stone'),roof=materials.find(item=>item.name==='palace-roof');
  for(const material of[stone,roof]){
    assert.ok(material.map?.isDataTexture,'local material detail does not wait for an image download');
    assert.ok(material.bumpMap?.isTexture&&material.bumpScale>0,'stone and slate have a physical surface');
    assert.ok(material.map.image.width<=128&&material.map.image.height<=128);
  }
  assert.equal(textures.length,2,'only two small shared texture allocations');
  assert.ok(castle.some(item=>item.name==='palace-sculpted-stone-arch'),'the threshold has a separate sculpted stone depth');
  let released=0;for(const texture of textures)texture.addEventListener('dispose',()=>released++);town.dispose();assert.equal(released,textures.length);
});

test('royal additions have physical arcades and multicolour glass without raising the castle silhouette or downloading textures',()=>{
  const town=createTownSceneGeometry(),meshes=town.root.children.filter(item=>item.userData.bucket==='castle'),bounds=new THREE.Box3();for(const mesh of meshes)bounds.expandByObject(mesh);
  assert.ok(bounds.max.y<=14.2,'new ornament fits under the authored tallest spire');
  const mosaic=meshes.find(item=>item.name==='palace-royal-rose-glass');assert.ok(mosaic?.isInstancedMesh&&mosaic.material.vertexColors);
  const colors=mosaic.geometry.attributes.color,unique=new Set();for(let i=0;i<colors.count;i++)unique.add([colors.getX(i),colors.getY(i),colors.getZ(i)].join(':'));assert.ok(unique.size>=4,'the window is coloured glass instead of a flat gold disk');
  const arcade=meshes.find(item=>item.name==='palace-royal-arcade');assert.equal(arcade.count,4);arcade.geometry.computeBoundingBox();assert.ok(arcade.geometry.boundingBox.max.z-arcade.geometry.boundingBox.min.z>=.12,'sculpted arches have real depth');
  const gold=meshes.find(item=>item.material.name==='palace-gold').material;assert.ok(gold.metalness>.5&&gold.roughness<.4,'raised gold contrasts with matte masonry');
  let triangles=0;for(const mesh of meshes)triangles+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3*(mesh.isInstancedMesh?mesh.count:1);assert.ok(triangles<80000,'the richer palace stays inside a modest geometry budget');
  assert.equal([...town.resources].filter(item=>item.isTexture).length,2);town.dispose();
});
