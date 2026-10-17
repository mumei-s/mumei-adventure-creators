import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from '../../maze/vendor/three.module.js';
import {createTownWorld3D,createTownSceneGeometry,town3DCameraParameters,TOWN_3D_CAMERA_ELEVATION} from '../world-3d.js';
import {getTownMap,TOWN_MAPS} from '../story-data.js';
import {initialTownState} from '../town-model.js';

const manifest=JSON.parse(await fs.readFile(new URL('../assets/residents-manifest.json',import.meta.url),'utf8'));
function fakeCanvas(width=512,height=512){
  const listeners=new Map(),cv={width,height,clientWidth:width,clientHeight:height,addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:type=>listeners.delete(type),listeners};
  const context={drawImage(){},fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},bezierCurveTo(){},createRadialGradient:()=>({addColorStop(){}}),getImageData:()=>({width:cv.width,height:cv.height,data:new Uint8ClampedArray(cv.width*cv.height*4).fill(255)})};
  cv.getContext=()=>context;return cv;
}
function harness({width=420,height=600,onContextLost=()=>{},loadImage=async src=>src.includes('residents')?{width:1280,height:640}:{width:512,height:512},fetcher=async()=>({ok:true,json:async()=>manifest})}={}){
  const canvas=fakeCanvas(width,height),record={frames:0,disposed:0,losses:0},art={images:{playerAtlas:{width:1024,height:1024}},version:1};
  const world=createTownWorld3D({canvas,art,onContextLost,makeCanvas:fakeCanvas,loadImage,fetcher,rendererFactory:()=>({shadowMap:{},capabilities:{getMaxAnisotropy:()=>4},info:{render:{calls:10}},setPixelRatio(value){record.ratio=value;},setSize(w,h){record.size=[w,h];},render(scene,camera){record.frames++;record.scene=scene;record.camera=camera;},dispose(){record.disposed++;},forceContextLoss(){record.losses++;}})});
  return {world,canvas,record,art};
}

test('town is volumetric batched geometry with the exact story footprints and door coordinates',()=>{
  const map=getTownMap(),town=createTownSceneGeometry(map);
  assert.equal(town.buildings.length,map.buildings.length);assert.ok(town.root.children.length<320,'independently fading canopies keep batched geometry bounded');
  for(const building of map.buildings){
    const model=town.buildings.find(item=>item.id===building.id);assert.deepEqual(model.footprint,{x:building.x,z:building.z,w:building.w,h:building.h});assert.deepEqual(model.door,building.door);
    if(building.kind!=='castle'){
      const roof=town.root.getObjectByName('roof-'+building.id);assert.ok(roof?.isMesh);roof.geometry.computeBoundingBox();const bounds=roof.geometry.boundingBox;
      assert.ok(bounds.max.y-bounds.min.y>.8,'gable roof has real height');assert.ok(bounds.max.z-bounds.min.z>=building.h,'roof has real depth');
      assert.ok(roof.geometry.index.count>=24,'closed sloping roof includes gables');
    }
  }
  const instanced=town.root.children.filter(item=>item.isInstancedMesh);assert.ok(instanced.some(item=>item.count>100),'small details are instanced');let instanceDisposals=0;for(const mesh of instanced)mesh.addEventListener('dispose',()=>instanceDisposals++);
  const resources=[...town.resources];let released=0;for(const resource of resources)resource.addEventListener?.('dispose',()=>released++);town.dispose();assert.equal(town.root.children.length,0);assert.equal(town.resources.size,0);assert.equal(released,resources.length);assert.equal(instanceDisposals,instanced.length);
});

test('every enterable story room has raised furniture and keeps the original exit',()=>{
  for(const map of Object.values(TOWN_MAPS).filter(item=>item.id!=='lantern-town')){
    const room=createTownSceneGeometry(map),bounds=new THREE.Box3().setFromObject(room.root);assert.ok(bounds.max.y>=2.5);assert.ok(room.root.children.some(item=>item.isInstancedMesh));
    assert.deepEqual(map.portals[0].spawn,getTownMap().buildings.find(building=>building.id===map.id)?{x:getTownMap().buildings.find(building=>building.id===map.id).door.x,z:getTownMap().buildings.find(building=>building.id===map.id).door.z+.8}:null);room.dispose();
  }
});

test('elevated camera and screen picking roundtrip after portrait, landscape, resize and room changes',async()=>{
  const {world,canvas,record}=harness();await world.ready;const state=initialTownState();
  assert.equal(TOWN_3D_CAMERA_ELEVATION,55*Math.PI/180);
  for(const [width,height,mapId]of[[320,580,'lantern-town'],[920,320,'lantern-town'],[1280,720,'library']]){
    canvas.clientWidth=width;canvas.clientHeight=height;state.mapId=mapId;state.position={...getTownMap(mapId).spawn};world.render({state,pixelRatio:2,motion:false});assert.deepEqual(record.size,[width,height]);assert.ok(record.ratio<=1.8);
    for(const offset of[{x:0,z:0},{x:1.3,z:-1.8},{x:-.8,z:.6}]){
      const point={x:state.position.x+offset.x,z:state.position.z+offset.z},screen=world.worldToScreen(point),back=world.screenToWorld(screen);assert.ok(Math.abs(point.x-back.x)<1e-9);assert.ok(Math.abs(point.z-back.z)<1e-9);
    }
    const right=world.worldToScreen({x:state.position.x+1,z:state.position.z}),down=world.worldToScreen({x:state.position.x,z:state.position.z+1}),origin=world.worldToScreen(state.position);assert.ok(right.x>origin.x);assert.ok(down.y>origin.y);
    const params=town3DCameraParameters(width,height);assert.ok(params.top>0&&params.left<0);
  }
  world.destroy();
});

test('authored feet remain planted and visitors are selected through their visible sprite pixels',async()=>{
  const {world,record}=harness();await world.ready;const state=initialTownState();state.position={x:28,z:28};
  const actor={id:'approved-visitor',x:29.8,z:28,sprite:{image:{width:256,height:320},frame:[0,0,256,320],anchorX:.55,anchorY:.94,contentHeight:280},heightPx:76,interactive:true};
  world.render({state,creatorActors:[actor],motion:false});const sprite=record.scene.getObjectsByProperty('isSprite',true).find(item=>item.userData.actorId===actor.id);
  assert.ok(sprite);assert.equal(sprite.center.x,.55);assert.ok(Math.abs(sprite.center.y-.06)<1e-10);
  // The authored foot anchor lies at the 3D object's ground position, rather than putting its top at ground level.
  assert.ok(Math.abs(((1-actor.sprite.anchorY)-sprite.center.y)*sprite.scale.y)<1e-10);
  const foot=world.worldToScreen(actor),at={x:foot.x,y:foot.y-sprite.scale.y*.45*record.camera.projectionMatrix.elements[5]*600/2};
  assert.equal(world.pickVisitor(at.x,at.y),actor.id);assert.equal(world.pickVisitor(-200,-200),null);world.destroy();
});

test('visitor frame textures and removed actor materials stay bounded across changing groups',async()=>{
  const {world}=harness();await world.ready;const state=initialTownState();state.position={x:28,z:28};
  for(let group=0;group<30;group++){
    const visitors=Array.from({length:6},(_,n)=>({id:`visitor-${group}-${n}`,x:27+n*.25,z:28,sprite:{image:{width:768,height:768},frame:[0,0,768,768],anchorY:.95,contentHeight:700},heightPx:60}));world.render({state,creatorActors:visitors,motion:false});
    const status=world.status();assert.ok(status.actors<=13);assert.ok(status.spriteFrames<=80);assert.ok(status.spriteBytes<=32*1024*1024);
  }
  world.destroy();assert.equal(world.status().actors,0);assert.equal(world.status().spriteBytes,0);
});

test('context loss and destruction stop rendering and release the WebGL lifecycle once',async()=>{
  let losses=0;const {world,canvas,record}=harness({onContextLost:()=>losses++});await world.ready;const state=initialTownState();world.render({state});assert.equal(record.frames,1);
  canvas.listeners.get('webglcontextlost')({preventDefault(){}});assert.equal(losses,1);assert.equal(world.render({state}),false);world.destroy();world.destroy();assert.equal(record.disposed,1);assert.equal(record.losses,0);assert.equal(canvas.listeners.has('webglcontextlost'),false);
});

test('late asset completion after destroy cannot revive the released renderer',async()=>{
  let resolve;const pending=new Promise(done=>resolve=done),{world}=harness({loadImage:()=>pending});world.destroy();resolve({width:512,height:512});await assert.rejects(world.ready,/released/);assert.equal(world.status().ready,false);assert.deepEqual(world.status().loaded,[]);
});

test('missing quest resident art rejects 3D readiness so the controller can keep working 2D NPCs',async()=>{
  const {world}=harness({loadImage:async src=>{if(src.includes('residents'))throw Error('offline');return {width:512,height:512};}});await assert.rejects(world.ready,/resident art/);world.destroy();
});

test('foreground cutaway changes only the covering building and resets after leaving',async()=>{
  const {world,record}=harness();await world.ready;const state=initialTownState(),building=getTownMap().buildings.find(b=>b.id==='bakery');state.position={x:building.x+building.w/2,z:building.z-.5};world.render({state,motion:false});
  const cover=record.scene.getObjectByName('roof-bakery'),other=record.scene.getObjectByName('roof-home-east');assert.equal(cover.material.opacity,.24);assert.equal(cover.castShadow,false);assert.equal(other.material.opacity,1);assert.notEqual(cover.material,other.material);
  state.position={x:32,z:28};world.render({state,motion:false});assert.equal(cover.material.opacity,1);assert.equal(cover.castShadow,true);world.destroy();
});

test('quest lantern glow and local lights follow imported and updated lamp flags',async()=>{
  const {world,record}=harness();await world.ready;const state=initialTownState();state.position={x:27.5,z:26.5};world.render({state,motion:false});
  const root=record.scene.getObjectByName('town-world-lantern-town'),bulb=root.children.find(item=>item.userData.bucket==='lamp-plaza'&&item.material?.name==='glass');assert.ok(bulb);assert.equal(bulb.material.emissiveIntensity,0);
  const questLight=()=>record.scene.children.filter(item=>item.isPointLight&&item.visible&&Math.abs(item.position.x-27.7)<.01&&Math.abs(item.position.z-26.5)<.01);assert.equal(questLight().length,0);
  state.flags.lamps=['lamp-plaza'];world.render({state,motion:false});assert.ok(bulb.material.emissiveIntensity>.4);assert.equal(questLight().length,1);
  state.flags.lamps=[];world.render({state,motion:false});assert.equal(bulb.material.emissiveIntensity,0);assert.equal(questLight().length,0);world.destroy();
});

test('reduced motion skips identical shadow frames while movement, settings, resize and invalidation redraw',async()=>{
  const {world,record,canvas}=harness();await world.ready;const state=initialTownState();assert.equal(world.render({state,motion:false}),true);assert.equal(world.render({state,motion:false,time:20}),false);assert.equal(record.frames,1);
  state.position.z+=.1;assert.equal(world.render({state,motion:false}),true);assert.equal(world.render({state,motion:false,brightness:80}),true);assert.equal(world.render({state,motion:false,brightness:80}),false);
  canvas.clientWidth+=10;assert.equal(world.render({state,motion:false,brightness:80}),true);world.invalidate();assert.equal(world.render({state,motion:false,brightness:80}),true);assert.equal(record.frames,5);world.destroy();
});

test('changing maps disposes every instance buffer from the previous map once',async()=>{
  const {world,record}=harness();await world.ready;const state=initialTownState();world.render({state});const town=record.scene.getObjectByName('town-world-lantern-town'),instances=town.children.filter(item=>item.isInstancedMesh);let released=0;for(const item of instances)item.addEventListener('dispose',()=>released++);
  state.mapId='library';state.position={...getTownMap('library').spawn};world.render({state});assert.equal(released,instances.length);world.destroy();assert.equal(released,instances.length);
});

test('only the foreground tree canopy fades and a reused surface is not forced into a lost context',async()=>{
 const {world,record}=harness();await world.ready;const state=initialTownState(),tree=getTownMap().decorations.find(item=>item.kind==='tree'||item.kind==='autumnTree');assert(tree);
 state.position={x:tree.x,z:tree.z-.8};world.render({state,motion:false});const root=record.scene.getObjectByName('town-world-lantern-town');
 const index=getTownMap().decorations.indexOf(tree),canopy=root.children.filter(item=>item.userData.bucket==='tree-'+index);assert(canopy.length);assert(canopy.every(item=>item.material.opacity===.24));
 const other=root.children.filter(item=>item.userData.bucket?.startsWith('tree-')&&item.userData.bucket!=='tree-'+index);assert(other.some(item=>item.material.opacity===1));
 state.position={x:32,z:28};world.render({state,motion:false});assert(canopy.every(item=>item.material.opacity===1));
 world.destroy();assert.equal(record.losses,0,'reusable canvas contexts must not be forcibly lost');assert.equal(record.disposed,1);
});

test('mutable actor poses upload one live texture and refresh alpha picking without growing the static cache',async()=>{
 const {world,record}=harness();await world.ready;const state=initialTownState();state.position={x:28,z:28};
 const image=fakeCanvas(256,320),context=image.getContext('2d');image.alpha=255;context.getImageData=()=>({width:image.width,height:image.height,data:new Uint8ClampedArray(image.width*image.height*4).fill(image.alpha)});
 const sprite={image,frame:[0,0,256,320],anchorX:.5,anchorY:.94,contentHeight:280,poseVersion:0},actor={id:'live-owner',x:29.8,z:28,heightPx:76,sprite};
 world.render({state,motion:false,creatorActors:[actor]});const node=record.scene.getObjectsByProperty('isSprite',true).find(item=>item.userData.actorId===actor.id),texture=node.material.map,initialVersion=texture.version,staticFrames=world.status().spriteFrames;let disposals=0;texture.addEventListener('dispose',()=>disposals++);
 assert.equal(texture.image,image);assert.equal(world.status().liveSprites,1);
 const foot=world.worldToScreen(actor),at={x:foot.x,y:foot.y-node.scale.y*.45*record.camera.projectionMatrix.elements[5]*600/2};assert.equal(world.pickVisitor(at.x,at.y),actor.id);
 for(let poseVersion=1;poseVersion<=100;poseVersion++){image.alpha=poseVersion===100?0:255;actor.sprite={...sprite,poseVersion};assert.equal(world.render({state,motion:false,creatorActors:[actor]}),true);assert.equal(node.material.map,texture);assert.equal(world.status().spriteFrames,staticFrames);assert.equal(world.status().liveSprites,1);}
 assert.equal(texture.version,initialVersion+100);assert.equal(world.pickVisitor(at.x,at.y),null,'old opaque pixels cannot intercept a transparent new pose');
 assert.equal(world.render({state,motion:false,creatorActors:[actor]}),false);assert.equal(texture.version,initialVersion+100);assert.equal(disposals,0);
 world.render({state,motion:false,creatorActors:[]});assert.equal(world.status().liveSprites,0);assert.equal(disposals,1);world.destroy();assert.equal(disposals,1);
});

test('switching live actor canvases or returning to a static atlas disposes the previous live texture once',async()=>{
 const {world,record}=harness();await world.ready;const state=initialTownState(),actor={id:'mutable',x:30,z:28,sprite:{image:fakeCanvas(256,320),frame:[0,0,256,320],contentHeight:280,poseVersion:0}};state.position={x:28,z:28};
 world.render({state,creatorActors:[actor]});const node=record.scene.getObjectsByProperty('isSprite',true).find(item=>item.userData.actorId===actor.id),first=node.material.map;let firstDisposals=0;first.addEventListener('dispose',()=>firstDisposals++);
 actor.sprite={...actor.sprite,image:fakeCanvas(256,320)};world.render({state,creatorActors:[actor]});const second=node.material.map;assert.notEqual(first,second);assert.equal(firstDisposals,1);let secondDisposals=0;second.addEventListener('dispose',()=>secondDisposals++);
 actor.sprite={...actor.sprite,poseVersion:undefined};world.render({state,creatorActors:[actor]});assert.equal(secondDisposals,1);assert.equal(world.status().liveSprites,0);world.destroy();assert.equal(firstDisposals,1);assert.equal(secondDisposals,1);
});

test('castle has a layered arched gold gate, cool masonry and lit entrance without changing the exit',()=>{
 const map=getTownMap(),story=JSON.stringify(map),town=createTownSceneGeometry(map),castle=map.buildings.find(item=>item.kind==='castle');
 const gate=town.root.getObjectByName('castle-arched-gate'),frame=town.root.getObjectByName('castle-gate-frame'),crest=town.root.getObjectByName('castle-gate-crest');
 assert.ok(gate?.geometry.type==='ExtrudeGeometry');assert.ok(frame?.geometry.type==='ExtrudeGeometry');
 assert.equal(gate.position.x,castle.door.x);assert.equal(frame.position.x,castle.door.x);assert.equal(crest.position.x,castle.door.x);
 assert.ok(frame.position.z>gate.position.z,'frame projects beyond the recessed gate');
 gate.geometry.computeBoundingBox();const bounds=gate.geometry.boundingBox;
 assert.ok(bounds.max.y>2.8&&bounds.max.x-bounds.min.x>2,'gate is a substantial arch, not the house doorway');
 assert.equal(frame.material.name,'gold');assert.equal(gate.material.name,'castlePlum');
 assert.ok(town.root.children.some(item=>item.userData.bucket==='castle'&&item.material?.name==='castleStone'));
 for(const side of[-1,1])assert.ok(town.root.getObjectByName('castle-banner-'+side));
 const lamps=town.lamps.filter(lamp=>Math.abs(lamp.z-(castle.z+castle.h+.44))<1e-9&&Math.abs(lamp.x-castle.door.x)<2);
 assert.equal(lamps.length,2);assert.ok(lamps.every(lamp=>lamp.lit&&!lamp.targetId),'entrance lights do not change quest lantern flags');
 assert.equal(JSON.stringify(map),story);assert.deepEqual(town.buildings.find(item=>item.id===castle.id).door,castle.door);
 assert.ok(town.root.children.length<320,'ornaments remain within the existing draw batch budget');town.dispose();
});

test('night library is dim with lantern off and uses a local facing light when on; town daylight restores',async()=>{
 const {world,record}=harness();await world.ready;const state=initialTownState();state.mapId='library';state.position={...getTownMap('library').spawn};
 world.render({state,motion:false,lantern:false,brightness:75});
 const sun=record.scene.children.find(item=>item.isDirectionalLight),ambient=record.scene.children.find(item=>item.isHemisphereLight),lamp=record.scene.getObjectByName('player-lantern');
 assert.equal(lamp.visible,false);assert.equal(sun.intensity,.12);assert.equal(ambient.intensity,.2);assert.ok(ambient.intensity>0,'room remains navigable without the lantern');
 for(const facing of['up','right','down','left']){
  world.render({state,motion:false,lantern:true,brightness:75,facing});assert.equal(lamp.visible,true);assert.equal(lamp.intensity,7.5);assert.equal(lamp.distance,4.8);assert.equal(ambient.intensity,.2);
  const delta={x:lamp.position.x-state.position.x,z:lamp.position.z-state.position.z};assert.ok(Math.abs(Math.hypot(delta.x,delta.z)-.55)<1e-9);assert.ok(facing==='up'?delta.z<0:facing==='down'?delta.z>0:facing==='left'?delta.x<0:delta.x>0);
 }
 world.render({state,motion:false,brightness:0,lantern:false});const low=ambient.intensity;assert.ok(low>0&&low<.2);
 world.render({state,motion:false,brightness:100,lantern:false});assert.ok(ambient.intensity>.2&&ambient.intensity<.3);
 state.mapId='lantern-town';world.render({state,motion:false,brightness:75});assert.equal(sun.intensity,3.05);assert.equal(ambient.intensity,2.55);assert.equal(lamp.intensity,1.4);assert.equal(lamp.distance,4);
 state.mapId='inn';world.render({state,motion:false,brightness:75});assert.equal(ambient.intensity,2.55);world.destroy();
});


test('non-library 3D preserves its original minimum brightness and window profile is applied only at map load',async()=>{
 const {world,record}=harness();await world.ready;const state=initialTownState();
 for(const mapId of ['lantern-town','inn']){
  state.mapId=mapId;
  for(const brightness of [0,10,19,20]){
   world.render({state,motion:false,brightness});
   assert.equal(record.scene.children.find(item=>item.isDirectionalLight).intensity,2.5);
   assert.equal(record.scene.children.find(item=>item.isHemisphereLight).intensity,1.78);
  }
 }
 state.mapId='library';world.render({state,motion:false,brightness:75});
 const glass=record.scene.getObjectsByProperty('isMesh',true).find(item=>item.material?.name==='glass').material;
 assert.equal(glass.emissiveIntensity,.07);let writes=0,value=.07;
 Object.defineProperty(glass,'emissiveIntensity',{configurable:true,get:()=>value,set:next=>{writes++;value=next;}});
 for(const facing of ['up','right','down','left'])world.render({state,motion:false,facing,brightness:75});
 assert.equal(writes,0,'unchanged library frames do not rewrite window materials');world.destroy();
});
