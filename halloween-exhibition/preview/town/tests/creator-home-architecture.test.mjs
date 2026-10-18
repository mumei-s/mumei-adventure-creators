import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../maze/vendor/three.module.js';
import {CREATOR_HOMES,createCreatorQuarter} from '../creator-homes.js';
import {creatorHomeEmblemGeometry,creatorHomeRoofGeometry} from '../creator-home-architecture.js';
import {createTownSceneGeometry} from '../world-3d.js';
import {getTownMap} from '../story-data.js';

const nameCanvas=(width,height)=>({width,height,getContext:()=>({fillRect(){},fillText(){},measureText:text=>({width:text.length*13})})});

test('sixteen homes have distinct raised motifs, authentic nameplates and their original entrances',()=>{
  const map=createCreatorQuarter(),before=JSON.stringify(map),town=createTownSceneGeometry(map,{makeCanvas:nameCanvas}),ray=new THREE.Raycaster();
  assert.equal(town.buildings.length,CREATOR_HOMES.length);assert.equal(town.buildings.length,16);
  for(const home of CREATOR_HOMES){
    const model=town.buildings.find(item=>item.creatorId===home.creatorId),emblem=town.root.getObjectByName('creator-home-emblem-'+home.creatorId),sign=town.root.getObjectByName('creator-home-nameplate-'+home.creatorId);
    assert.deepEqual(model.footprint,{x:home.x,z:home.z,w:home.w,h:home.h});assert.deepEqual(model.door,home.door);
    assert.equal(model.motif,home.motif);assert.equal(emblem.userData.motif,home.motif);assert.equal(emblem.geometry.type,'ExtrudeGeometry');assert.ok(sign.material.map?.isCanvasTexture);
    const wall=[...town.resources].find(item=>item.name==='wall-creator-home-'+home.creatorId);assert.equal('#'+wall.color.getHexString(),home.homePalette.wall);
    ray.set(new THREE.Vector3(home.door.x+.9,1.85,home.door.z+.4),new THREE.Vector3(0,0,-1));ray.near=0;ray.far=1;
    assert.equal(ray.intersectObjects(town.root.children,false)[0]?.object.material,wall,'the facade shows its own wall color between the timber beams');
    // There is space for the same .19-unit player radius in front of every door.
    for(let direction=0;direction<8;direction++){
      const angle=direction*Math.PI/4;ray.set(new THREE.Vector3(home.door.x,.85,home.door.z),new THREE.Vector3(Math.cos(angle),0,Math.sin(angle)));ray.near=0;ray.far=.19;
      assert.equal(ray.intersectObjects(town.root.children,false).length,0,home.id+' threshold is clear');
    }
  }
  assert.equal(JSON.stringify(map),before);assert.ok(town.root.children.length<340,'per-house primitive batches keep the complete district bounded');
  let triangles=0;for(const item of town.root.children)if(item.geometry)triangles+=(item.geometry.index?.count||item.geometry.attributes.position.count)/3*(item.isInstancedMesh?item.count:1);assert.ok(triangles<45000);
  const resources=[...town.resources],instances=town.root.children.filter(item=>item.isInstancedMesh);let resourceDisposals=0,instanceDisposals=0;
  for(const item of resources)item.addEventListener('dispose',()=>resourceDisposals++);for(const item of instances)item.addEventListener('dispose',()=>instanceDisposals++);
  town.dispose();assert.equal(resourceDisposals,resources.length);assert.equal(instanceDisposals,instances.length);assert.equal(town.resources.size,0);assert.equal(town.root.children.length,0);
});

test('each doorway motif has a unique finite three-dimensional silhouette',()=>{
  const signatures=new Set();
  for(const home of CREATOR_HOMES){
    const geometry=creatorHomeEmblemGeometry(home.motif);geometry.computeBoundingBox();const size=new THREE.Vector3();geometry.boundingBox.getSize(size);
    assert.ok(size.x>.3&&size.x<1.2&&size.y>.3&&size.y<1.2);assert.ok(size.z>=.05&&size.z<=.06);
    assert.ok([...geometry.attributes.position.array].every(Number.isFinite));signatures.add(Array.from(geometry.attributes.position.array).join(','));geometry.dispose();
  }
  assert.equal(signatures.size,CREATOR_HOMES.length);
});

test('the sixteen architectural silhouettes stay different without colors, names or doorway emblems',()=>{
  const shapes=new Set();
  for(const home of CREATOR_HOMES){
    const roof=creatorHomeRoofGeometry(home.motif,7.64,5.62,1.6);roof.computeBoundingBox();
    assert.ok(roof.boundingBox.max.y>1&&roof.boundingBox.max.y<3.1);assert.ok([...roof.attributes.position.array].every(Number.isFinite));
    shapes.add(JSON.stringify([Array.from(roof.attributes.position.array),roof.index?Array.from(roof.index.array):null]));roof.dispose();
  }
  assert.equal(shapes.size,16,'changing a crest or color is not the only distinction between these houses');
  // The hipped roof slopes face the sky, so a one-sided GPU material shows a solid roof.
  const roof=creatorHomeRoofGeometry('bread-loaf',7.64,5.62,1.6),flat=roof.toNonIndexed(),p=flat.attributes.position,a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),normal=new THREE.Vector3();
  for(let i=0;i<p.count;i+=3){a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1);c.fromBufferAttribute(p,i+2);const averageY=(a.y+b.y+c.y)/3;normal.crossVectors(b.sub(a),c.sub(a));assert.ok(averageY>.001?normal.y>=0:normal.y<=0);}
  flat.dispose();roof.dispose();
});

test('both outdoor ends have a named gate with an unobstructed portal',()=>{
  for(const map of[getTownMap(),createCreatorQuarter()]){
    const scene=createTownSceneGeometry(map,{makeCanvas:nameCanvas}),gate=scene.root.userData.creatorGates[0];assert.ok(gate);assert.ok(gate.clearWidth>2);
    assert.equal(gate.label,map.id==='creator-quarter'?'星灯りの街':'参加者の住宅街');
    const ray=new THREE.Raycaster(new THREE.Vector3(gate.x,1,gate.z+.4),new THREE.Vector3(0,0,-1),0,.8);assert.equal(ray.intersectObjects(scene.root.children,false).length,0);
    assert.ok(scene.root.getObjectByName('creator-home-nameplate-'+gate.id));scene.dispose();
  }
});
