import test from 'node:test';
import assert from 'node:assert/strict';
import {withMazeWorld} from './helpers/maze-world-factory.mjs';
import {OVERLORD_BOSS,monsterPose,guidePoint,nearestMonster} from '../encounter-model.js';
import {mazeWideCamera} from '../../camera-distance.js';
import {blocked} from '../maze-model.js';

const open={unlocked:true,horrorAccepted:true,overlordUnlocked:true};
test('queen waits at the same approachable stage instead of walking behind the eye camera',()=>{
 const pose=monsterPose(OVERLORD_BOSS,0,true,open);
 for(const time of [0,1,10,30,60,180])for(const motion of [true,false]){
  assert.deepEqual(monsterPose(OVERLORD_BOSS,time,motion,open),pose);
  const guide=guidePoint(OVERLORD_BOSS,open,time,motion),state={...open,x:guide.x*4,z:guide.z*4,yaw:guide.yaw};
  assert.equal(nearestMonster(state,[],{time,motion})?.id,OVERLORD_BOSS.id);
  assert.equal(pose.walking,false);
 }
});

test('actual exploration factory lazily frames the articulated queen in eye and both raised views',async()=>{
 await withMazeWorld(async({world,THREE,requests,settle})=>{
  world.render({...open,x:32,z:48,yaw:0,time:0,motion:false,cameraDistance:'normal'});
  let initialQueenParts=0;world.scene.getObjectByName(OVERLORD_BOSS.name).traverse(node=>{if(node.isMesh&&node.material?.map)initialQueenParts++;});
  assert.equal(initialQueenParts,0,'a distant queen does not construct an off-screen actor');
  assert(!requests.some(url=>/overlord|queen-/.test(url)),'a distant queen must not request images on scene startup');
  for(const cameraDistance of ['normal','wide','far']){
   const guide=guidePoint(OVERLORD_BOSS,open),state={...open,x:guide.x*4,z:guide.z*4,yaw:guide.yaw,time:0,motion:false,cameraDistance};
   world.render(state);await settle();world.render(state);
   const root=world.scene.getObjectByName(OVERLORD_BOSS.name),parts=[];
   root.traverse(node=>{if(node.isMesh&&node.name.startsWith('queen-')&&node.material?.map&&node.geometry?.type==='PlaneGeometry')parts.push(node);assert(!node.isSkinnedMesh,'exploration must not reconstruct the rejected polygon body');});
   assert(root.visible,'the queen encounter is visible');
   assert.equal(parts.length,16,'the real world contains sixteen separate textured body parts');
   assert(parts.every(part=>part.visible&&part.material.map),'all body art is installed after image decode');
   const partSet=new Set(parts),body=parts.find(part=>/torso/i.test(part.name)),head=parts.find(part=>/head/i.test(part.name));
   assert(body&&head,'the scene exposes actual torso and head surfaces');
   for(const surface of [body,head]){
    surface.geometry.computeBoundingBox();const target=surface.localToWorld(surface.geometry.boundingBox.getCenter(new THREE.Vector3()));
    const projected=target.clone().project(world.camera);
    assert(Math.abs(projected.x)<1&&Math.abs(projected.y)<1&&projected.z>-1&&projected.z<1,cameraDistance+' must frame the '+surface.name);
    const normal=new THREE.Vector3(0,0,1).transformDirection(surface.matrixWorld),toCamera=world.camera.position.clone().sub(target).normalize();
    assert(normal.dot(toCamera)>.8,cameraDistance+' must face the '+surface.name+' toward its camera');
    const ray=new THREE.Raycaster(world.camera.position,target.clone().sub(world.camera.position).normalize());ray.camera=world.camera;
    const hits=ray.intersectObjects(world.scene.children,true).filter(hit=>{
     for(let node=hit.object;node;node=node.parent)if(!node.visible)return false;
     return partSet.has(hit.object)||!hit.object.material?.transparent;
    });
    assert(partSet.has(hits[0]?.object),cameraDistance+' cannot hide the '+surface.name+' behind architecture');
   }
   assert.equal(world.scene.getObjectByName('cutaway-overhead-architecture').visible,cameraDistance==='normal');
   assert.equal(world.scene.getObjectByName('native-dark-pointed-vault').visible,cameraDistance==='normal');
  }
  assert(!requests.some(url=>/queen-body-|material-atlas/.test(url)),'the queen needs neither reconstructed maps nor an environment atlas');
 });
});

test('actual raised camera eases outward only, remains collision-safe inward and snaps after explicit changes',async()=>{
 await withMazeWorld(async({world})=>{
  const initial={...open,x:92,z:42,yaw:0,time:1000,motion:true,cameraDistance:'far'};
  world.render(initial);const previous=world.camera.position.z-initial.z;
  const outward={...initial,z:41.8,time:1016};
  const desired=mazeWideCamera(outward,blocked,'far').distance;
  world.render(outward);const eased=world.camera.position.z-outward.z;
  assert(eased>previous&&eased<desired,'new free space must not snap the camera backwards');
  assert.equal(world.camera.position.x,outward.x,'smoothing cannot lag lateral player movement');
  world.render({...initial,time:1032});
  assert(Math.abs(world.camera.position.z-initial.z-previous)<1e-10,'an inward obstruction takes effect immediately');
  world.render({...initial,time:1048,cameraDistance:'normal'});
  assert.deepEqual(world.camera.position.toArray(),[92,1.65,42]);
  const teleport={...initial,z:18.8,time:1064};world.render(teleport);
  assert(Math.abs(world.camera.position.z-teleport.z-mazeWideCamera(teleport,blocked,'far').distance)<1e-10,'explicit viewpoint change and teleport have no trailing camera');
 });
});
