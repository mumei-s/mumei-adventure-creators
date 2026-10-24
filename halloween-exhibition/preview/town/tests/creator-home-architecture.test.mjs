import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../maze/vendor/three.module.js';
import {CREATOR_HOMES,createCreatorQuarter} from '../creator-homes.js';
import {creatorHomeEmblemGeometry,creatorHomeRoofGeometry} from '../creator-home-architecture.js';
import {createTownSceneGeometry} from '../world-3d.js';
import {getTownMap} from '../story-data.js';

const nameCanvas=(width,height)=>({width,height,getContext:()=>({fillRect(){},fillText(){},measureText:text=>({width:text.length*13})})});

test('seventeen homes have distinct raised motifs, authentic nameplates and their original entrances',()=>{
  const map=createCreatorQuarter(),before=JSON.stringify(map),town=createTownSceneGeometry(map,{makeCanvas:nameCanvas}),ray=new THREE.Raycaster();
  assert.equal(town.buildings.length,CREATOR_HOMES.length);assert.equal(town.buildings.length,17);
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
  assert.equal(JSON.stringify(map),before);assert.ok(town.root.children.length<380,'the seventeenth home adds no more than 28 primitive batches to the original 352-batch budget');
  let triangles=0;for(const item of town.root.children)if(item.geometry&&!item.name.startsWith('ground-'))triangles+=(item.geometry.index?.count||item.geometry.attributes.position.count)/3*(item.isInstancedMesh?item.count:1);assert.ok(triangles<45000,'non-ground architecture stays bounded independently of the wider walking map');
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

test('facade nameplates use the matching creator and fit long names inside the existing sign',()=>{
 const map=createCreatorQuarter();map.buildings[0].creatorName='長い名前🦁'.repeat(30);
 const makeCanvas=(width,height)=>{
  const calls=[],context={font:'',fillRect(){},fillText(...args){calls.push({font:this.font,args});},measureText:text=>({width:Array.from(text).length*13})};
  return{width,height,calls,getContext:()=>context};
 };
 const scene=createTownSceneGeometry(map,{makeCanvas});
 for(const home of map.buildings){
  const sign=scene.root.getObjectByName('creator-home-nameplate-'+home.creatorId),canvas=sign.material.map.image;
  assert.deepEqual(canvas.calls.map(call=>call.args[0]),[home.creatorName,home.homeLabel]);
  assert.equal(canvas.width,256);assert.equal(canvas.height,64,'readability does not multiply the texture budget');
  assert.ok(canvas.calls.every(call=>call.args[3]===242),'Canvas fits both rows even at the minimum font size');
 }
 scene.dispose();
});

test('real building surfaces share bounded offline relief textures and keep their own creator colors',()=>{
 const scene=createTownSceneGeometry(createCreatorQuarter());
 const textures=[...scene.resources].filter(item=>item.isDataTexture);
 assert.equal(textures.length,10,'five color/relief pairs are shared by all seventeen homes');
 assert.ok(textures.reduce((bytes,texture)=>bytes+texture.image.data.byteLength,0)<=256*1024);
 for(const texture of textures){assert.ok(new Set(texture.image.data).size>8,'texture carries material variation');assert.equal(texture.wrapS,THREE.RepeatWrapping);}
 for(const home of CREATOR_HOMES){
  const wall=[...scene.resources].find(item=>item.name==='wall-creator-home-'+home.creatorId),roof=scene.root.getObjectByName('roof-'+home.id),glass=[...scene.resources].find(item=>item.name==='glass-creator-home-'+home.creatorId);
  assert.equal(wall.userData.surface,home.homeConstruction);assert.ok(wall.map.isDataTexture&&wall.bumpMap.isDataTexture);assert.ok(wall.roughness>.9&&wall.bumpScale>0);
  assert.equal(roof.material.userData.surface,'slate');assert.ok(roof.material.bumpMap);assert.ok(glass.roughness<.3&&glass.emissiveIntensity<.2,'windows reflect light instead of glowing like lamps');
 }
 scene.dispose();
});

test('window openings have an inset glass plane behind their actual solid frame',()=>{
 const home=CREATOR_HOMES[0],scene=createTownSceneGeometry(createCreatorQuarter()),south=home.z+home.h,wx=home.x+home.w*.18,ray=new THREE.Raycaster(new THREE.Vector3(wx+.16,1.57,south+.8),new THREE.Vector3(0,0,-1),0,1.2);
 const glass=ray.intersectObjects(scene.root.children,false)[0];assert.equal(glass.object.material.name,'glass-creator-home-'+home.creatorId);
 ray.set(new THREE.Vector3(wx+.43,1.43,south+.8),new THREE.Vector3(0,0,-1));
 const frame=ray.intersectObjects(scene.root.children,false)[0];assert.match(frame.object.geometry.name,/recessed-frame/);
 assert.ok(frame.point.z-glass.point.z>.07,'the glass sits inside the frame, beyond a flat color swap');scene.dispose();
});

test('public creative activities receive physical studio bays while their character roof motifs remain',()=>{
 const scene=createTownSceneGeometry(createCreatorQuarter()),recording=scene.root.children.find(item=>item.geometry?.name==='creator-home-recessed-frame-recording'&&item.userData.bucket==='home-grand_daisy8632');
 assert.equal(recording.count,6,'CNA has two groups of three recording panes');
 for(const id of['n_kazumai55633','glossy_guppy6230','airoumu_rin']){
  const bay=scene.root.children.find(item=>item.geometry?.name==='creator-home-recessed-frame-studio'&&item.userData.bucket==='home-'+id);assert.equal(bay.count,2);
  const home=CREATOR_HOMES.find(item=>item.creatorId===id);assert.equal(scene.root.getObjectByName('roof-'+home.id).geometry.userData.motif,home.motif);
 }
 scene.dispose();
});

test('the seventeen architectural silhouettes stay different without colors, names or doorway emblems',()=>{
  const shapes=new Set();
  for(const home of CREATOR_HOMES){
    const roof=creatorHomeRoofGeometry(home.motif,7.64,5.62,1.6);roof.computeBoundingBox();
    assert.ok(roof.boundingBox.max.y>1&&roof.boundingBox.max.y<3.1);assert.ok([...roof.attributes.position.array].every(Number.isFinite));
    shapes.add(JSON.stringify([Array.from(roof.attributes.position.array),roof.index?Array.from(roof.index.array):null]));roof.dispose();
  }
  assert.equal(shapes.size,17,'changing a crest or color is not the only distinction between these houses');
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


test('Doyle has a pumpkin-hood dormer, library book bays, lantern and black-cat sculpture',()=>{
 const home=CREATOR_HOMES.find(item=>item.creatorId==='dandy_snake880');assert.ok(home);
 const scene=createTownSceneGeometry(createCreatorQuarter()),model=scene.buildings.find(item=>item.creatorId===home.creatorId),parts=scene.root.children.filter(item=>item.userData.bucket===home.id);
 assert.equal(model.architecture,'pumpkin-library');assert.equal(model.homeUse,'lantern-library');assert.equal(model.window,'book');
 assert.equal(parts.find(item=>item.material?.name==='pumpkin').count,3,'three solid lobes form the pumpkin hood');
 assert.equal(parts.find(item=>item.geometry?.name==='creator-home-recessed-frame-book').count,2);
 assert.equal(parts.find(item=>item.geometry?.name==='creator-home-recessed-frame-arch').count,1,'the hood has its own recessed window');
 for(const name of['bookGold','bookTeal','bookRed'])assert.ok(parts.some(item=>item.material?.name===name&&item.count>=6),'both library bays contain actual book volumes');
 assert.ok(parts.some(item=>item.geometry?.type==='IcosahedronGeometry'&&item.material?.name==='dark'&&item.count===4),'cat body, head and curled tail use shared solid primitives');
 assert.ok(parts.some(item=>item.geometry?.type==='ConeGeometry'&&item.material?.name==='dark'&&item.count===2),'cat ears are actual silhouette geometry');
 const catRay=new THREE.Raycaster(new THREE.Vector3(home.x+home.w*.84,.7,home.z+home.h+1.6),new THREE.Vector3(0,0,-1),0,1.4);
 assert.equal(catRay.intersectObjects(parts,false)[0]?.object.material.name,'dark','the cat sits in front of, not hidden inside, the window planter');
 assert.deepEqual(model.door,home.door);assert.deepEqual(model.footprint,{x:home.x,z:home.z,w:7,h:5});scene.dispose();
});
