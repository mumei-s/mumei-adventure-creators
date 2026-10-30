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

test('actual exploration factory lazily frames one whole queen sprite in eye and both raised views',async()=>{
 await withMazeWorld(async({world,THREE,requests,settle})=>{
  world.render({...open,x:32,z:48,yaw:0,time:0,motion:false,cameraDistance:'normal'});
  let initialQueenSprites=0;world.scene.getObjectByName(OVERLORD_BOSS.name).traverse(node=>{if(node.isSprite&&node.name==='queen-whole-frame')initialQueenSprites++;});
  assert.equal(initialQueenSprites,0,'a distant queen does not construct an off-screen actor');
  assert(!requests.some(url=>/overlord|queen-/.test(url)),'a distant queen must not request images on scene startup');
  for(const cameraDistance of ['normal','wide','far']){
   const guide=guidePoint(OVERLORD_BOSS,open),state={...open,x:guide.x*4,z:guide.z*4,yaw:guide.yaw,time:0,motion:false,cameraDistance};
   world.render(state);await settle();world.render(state);
   const root=world.scene.getObjectByName(OVERLORD_BOSS.name),sprites=[],bodyParts=[];
   root.traverse(node=>{if(node.isSprite&&node.name==='queen-whole-frame')sprites.push(node);if(node.isMesh&&node.name.startsWith('queen-'))bodyParts.push(node);assert(!node.isSkinnedMesh,'exploration must not reconstruct the rejected polygon body');});
   assert(root.visible,'the queen encounter is visible');
   assert.equal(sprites.length,1,'the queen uses the same single whole-frame sprite representation as other maze actors');
   assert.equal(bodyParts.length,0,'no detached body-part planes remain in the actual world');
   const sprite=sprites[0],texture=sprite.material.map;
   assert(sprite.visible&&texture?.image,'whole-body art is installed after image decode');
   assert.equal(texture.image.width/texture.image.height,1344/1632,'the whole-pose atlas retains its compact padded source aspect');
   assert.equal(sprite.material.type,'SpriteMaterial','camera-facing orientation comes from the ordinary sprite renderer');
   assert(Math.abs(texture.repeat.x-416/1344)<1e-12,'idle UVs select one complete source column');
   assert(Math.abs(texture.repeat.y-512/1632)<1e-12,'idle crop excludes the next row of artwork');
   assert.equal(texture.offset.x,16/1344);assert.equal(texture.offset.y,1-528/1632);
   assert.equal(sprite.geometry.index.count/3,60,'the intact character uses one continuous bounded grid');
   // THREE.Sprite vertices face the camera in view space. Parent yaw does not
   // rotate their plane, so localToWorld on geometry vertices would test a
   // different surface. Project known opaque face/torso points in the selected
   // 416x512 drawing using its actual world scale, anchor and camera basis.
   const scale=sprite.getWorldScale(new THREE.Vector3()),origin=sprite.getWorldPosition(new THREE.Vector3()),cameraRotation=world.camera.getWorldQuaternion(new THREE.Quaternion());
   for(const [name,sourceX,sourceY]of[['face',219,79],['torso',219,200]]){
    const x=(sourceX/416-sprite.center.x)*scale.x,y=(1-sourceY/512-sprite.center.y)*scale.y,angle=sprite.material.rotation||0;
    const target=new THREE.Vector3(x*Math.cos(angle)-y*Math.sin(angle),x*Math.sin(angle)+y*Math.cos(angle),0).applyQuaternion(cameraRotation).add(origin);
    const projected=target.clone().project(world.camera);
    assert(Math.abs(projected.x)<1&&Math.abs(projected.y)<1&&projected.z>-1&&projected.z<1,cameraDistance+' must frame the queen '+name);
    const ray=new THREE.Raycaster(world.camera.position,target.clone().sub(world.camera.position).normalize());ray.camera=world.camera;
    const hits=ray.intersectObjects(world.scene.children,true).filter(hit=>{
     for(let node=hit.object;node;node=node.parent)if(!node.visible)return false;
     return hit.object===sprite||!hit.object.material?.transparent;
    });
    assert.equal(hits[0]?.object,sprite,cameraDistance+' cannot hide the queen '+name+' behind architecture');
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
