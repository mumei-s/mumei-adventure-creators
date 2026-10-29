import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as THREE from '../vendor/three.module.js';
import {decodeOverlordQueen,QUEEN_BODY_SOURCE} from '../overlord-queen-data.js';
import {createOverlordBoss} from '../overlord-boss.js';

const names=['pelvis','spine','neck','head','right-shoulder','right-elbow','right-hand','right-hip','right-knee','right-ankle','left-shoulder','left-elbow','left-hand','left-hip','left-knee','left-ankle'];
const states=['idle','seated','stand','walk','attack','special','hit','defeat'];
const fixtures=[['idle',0,0,0],['seated',.6,1,0],['stand',.5,.5,0],['walk',.3,.3,.3],['attack',.6,.6,.5],['special',.6,.6,.5],['hit',.25,.25,.25],['defeat',1.4,1.4,1]];
function pose(model,[state,time,stateElapsed,attackProgress],motion=true){
 model.setState(state,{restart:true});model.update(0,{state,time,stateElapsed,attackProgress,motion});
 model.root.updateMatrixWorld(true);model.skeleton.update();
}
function vertex(model,index){return model.human.getVertexPosition(index,new THREE.Vector3()).applyMatrix4(model.human.matrixWorld);}
function minimumSkinY(model){let result=Infinity;for(let i=0;i<model.human.geometry.attributes.position.count;i++)result=Math.min(result,vertex(model,i).y);return result;}
function representative(model,name){
 const g=model.human.geometry,indices=g.attributes.skinIndex,weights=g.attributes.skinWeight,position=g.attributes.position;
 const bone=model.skeleton.bones.findIndex(b=>b.name===name),joint=model.joints.rest.get(model.skeleton.bones[bone]);let best=-1,distance=0;
 for(let i=0;i<position.count;i++)for(let k=0;k<4;k++)if(indices.getComponent(i,k)===bone&&weights.getComponent(i,k)>.98){
  const d=new THREE.Vector3().fromBufferAttribute(position,i).distanceToSquared(joint);if(d>distance){best=i;distance=d;}
 }
 assert(best>=0&&distance>.0006,'a real surface region must be weighted to '+name);return best;
}
function topologyDigest(indices){
 const triangles=[];for(let i=0;i<indices.length;i+=3){const t=Array.from(indices.slice(i,i+3)),j=t.indexOf(Math.min(...t));triangles.push(t.slice(j).concat(t.slice(0,j)).join(','));}
 return createHash('sha256').update(triangles.sort().join('\n')).digest('hex');
}

test('decoded queen preserves the recorded GLB topology, finite surfaces and complete UV groups',()=>{
 const d=decodeOverlordQueen(),count=d.positions.length/3;
 assert.equal(QUEEN_BODY_SOURCE.sourceGlbSha256,'e1626717a21f414519ccaf17066e7fd0c2b36d40e64fbf0269e67dc0547baf06');
 assert.equal(count,7831);assert.equal(d.indices.length/3,9008);assert.deepEqual(d.boneNames,names);
 // This connectivity digest was computed from the original downloaded GLB,
 // independent of material-group ordering in the compiled game asset.
 assert.equal(topologyDigest(d.indices),'b8a515da9a200712de236ed3ea9cf9bd1f2d8fa4637e9a23c645e68823ec8527');
 for(const key of ['positions','normals','uvs','sourceUVs','skinIndices','skinWeights'])assert(Array.from(d[key]).every(Number.isFinite),key);
 assert.equal(d.normals.length,count*3);assert.equal(d.uvs.length,count*2);assert.equal(d.sourceUVs.length,count*2);
 assert.equal(d.skinIndices.length,count*4);assert.equal(d.skinWeights.length,count*4);
 for(const uv of [...d.uvs,...d.sourceUVs])assert(uv>=0&&uv<=1,'both glTF UV sets stay inside their image');
 for(const index of d.indices)assert(index<count);
 let end=0;for(const group of d.groups){assert.equal(group.start,end);assert.equal(group.count%3,0);assert([0,1,2,3].includes(group.material));end+=group.count;}assert.equal(end,d.indices.length);
 const ys=Array.from(d.positions).filter((_,i)=>i%3===1);assert(Math.abs(Math.min(...ys))<.0002);
 assert(d.source.bunCleanup.preservedCentralFace);assert(Math.max(...ys)>2.13&&Math.max(...ys)<2.15,'temporary bun fits beneath the final long-hair scalp');
 for(let i=0;i<count;i++){
  const length=Math.hypot(...d.normals.slice(i*3,i*3+3));assert(Math.abs(length-1)<.0001,'decoded normal');
  let sum=0;for(let k=0;k<4;k++){const w=d.skinWeights[i*4+k];assert(w>=0&&w<=1);assert(d.skinIndices[i*4+k]<names.length);sum+=w;}
  assert(Math.abs(sum-1)<4/65535,'16-bit packed weights retain a unit sum within quantization');
 }
});

test('default actor uses the reconstructed body with correctly sided, independently weighted head, hands and knees',()=>{
 const model=createOverlordBoss(THREE);try{
  assert.equal(model.human.name,'reconstructed-queen-skinned-body');assert(model.human.isSkinnedMesh);assert.deepEqual(model.skeleton.bones.map(b=>b.name),names);
  const probes=Object.fromEntries(['head','left-hand','right-hand','left-knee','right-knee'].map(name=>[name,representative(model,name)]));
  const p=model.human.geometry.attributes.position;
  for(const side of ['left','right'])for(const part of ['hand','knee'])assert((side==='left'?1:-1)*p.getX(probes[side+'-'+part])>.10,'bone names cannot be mirrored onto the opposite limb');
  for(const name of Object.keys(probes)){
   pose(model,fixtures[0],false);const before=Object.fromEntries(Object.entries(probes).map(([n,i])=>[n,vertex(model,i)]));
   model.skeleton.bones.find(b=>b.name===name).rotateX(.2);model.root.updateMatrixWorld(true);model.skeleton.update();
   assert(vertex(model,probes[name]).distanceTo(before[name])>.002,name+' must bend its actual mesh surface');
   for(const other of Object.keys(probes))if(other!==name)assert(vertex(model,probes[other]).distanceTo(before[other])<.000003,name+' cannot rigidly move '+other);
  }
 }finally{model.dispose();}
});

test('all eight full animation states keep actual skinned vertices finite and preserve raw controller motion amplitudes',()=>{
 const model=createOverlordBoss(THREE),legacy=createOverlordBoss(THREE,{legacy:true});try{
  assert.deepEqual(model.metadata.states,states);pose(model,fixtures[0],false);pose(legacy,fixtures[0],false);
  const generatedIdle=new Map(model.skeleton.bones.map(b=>[b.name,b.quaternion.clone()])),rawIdle=new Map(legacy.skeleton.bones.map(b=>[b.name,b.quaternion.clone()]));
  for(const fixture of fixtures){
   pose(model,fixture);pose(legacy,fixture);
   for(const bone of model.skeleton.bones){
    const raw=legacy.skeleton.bones.find(b=>b.name===bone.name),actual=generatedIdle.get(bone.name).clone().invert().multiply(bone.quaternion),expected=rawIdle.get(bone.name).clone().invert().multiply(raw.quaternion);
    assert(actual.angleTo(expected)<.000001,fixture[0]+' must preserve the full named-bone delta of '+bone.name);
   }
   for(let i=0;i<model.human.geometry.attributes.position.count;i++)assert(vertex(model,i).toArray().every(Number.isFinite),fixture[0]+' evaluated skin');
  }
  pose(model,fixtures.find(f=>f[0]==='special'));
  for(const side of ['left','right'])assert(generatedIdle.get(side+'-shoulder').angleTo(model.skeleton.bones.find(b=>b.name===side+'-shoulder').quaternion)>1,'the full casting arm motion must exceed one radian');
  pose(model,['walk',Math.PI/(2*6.2),.3,.5]);const first=model.joints.legs.map(l=>l.hip.quaternion.clone());
  pose(model,['walk',3*Math.PI/(2*6.2),.8,.5]);model.joints.legs.forEach((l,i)=>assert(first[i].angleTo(l.hip.quaternion)>.60,'opposite walking phases retain full leg swing'));
 }finally{model.dispose();legacy.dispose();}
});

test('seated calibration puts both boots at the floor and stand returns to the same neutral placement',()=>{
 const model=createOverlordBoss(THREE);try{
  pose(model,fixtures[0],false);const idleY=minimumSkinY(model);
  pose(model,fixtures.find(f=>f[0]==='seated'));const seatedY=minimumSkinY(model);
  assert(Math.abs(seatedY-idleY)<.005,'seated root correction must not float the boots or sink them below the floor');
  pose(model,['stand',1.2,1.2,0],false);assert(Math.abs(minimumSkinY(model)-idleY)<.0003);
 }finally{model.dispose();}
});

test('hair, cape, crown and five blades stay separate without a second body or duplicated armor',()=>{
 const model=createOverlordBoss(THREE);try{
  const hair=model.root.getObjectByName('sculpted-golden-hair-and-crown'),cape=model.root.getObjectByName('floorlength-crimson-cloak'),blades=model.root.getObjectByName('five-native-gilded-blades');
  assert(hair&&cape&&blades);assert.equal(hair.parent,model.joints.head);assert.equal(cape.parent,model.joints.torso);assert.equal(model.swords.length,5);
  assert.equal(new Set(model.swords).size,5);model.swords.forEach((s,i)=>{assert.equal(s.parent,blades);assert.equal(s.name,'native-floating-blade-'+(i+1));});
  const attachedTo=(node,parent)=>{for(let p=node;p;p=p.parent)if(p===parent)return true;return false;};let skinned=0;
  model.root.traverse(node=>{if(!node.isMesh)return;if(node.isSkinnedMesh)skinned++;if(node===model.human)return;assert([hair,cape,blades].some(parent=>attachedTo(node,parent)),'extra mesh must be an attachment, not duplicate fitted armor: '+node.name);});
  assert.equal(skinned,1);assert.equal(model.root.getObjectByName('anatomical-eyes'),undefined);
 }finally{model.dispose();}
});

test('disposing one actor releases its owned skin and attachments once while another actor and caller textures remain usable',()=>{
 const a=createOverlordBoss(THREE),b=createOverlordBoss(THREE),geometries=new Set(),materials=new Set(Object.values(a.materials));
 a.root.traverse(node=>{if(node.geometry)geometries.add(node.geometry);for(const material of node.material?Array.isArray(node.material)?node.material:[node.material]:[])materials.add(material);});
 const geometryEvents=new Map([...geometries].map(g=>[g,0])),materialEvents=new Map([...materials].map(m=>[m,0]));
 geometries.forEach(g=>g.addEventListener('dispose',()=>geometryEvents.set(g,geometryEvents.get(g)+1)));materials.forEach(m=>m.addEventListener('dispose',()=>materialEvents.set(m,materialEvents.get(m)+1)));
 const textures=Object.fromEntries(['generatedBase','generatedFront','generatedNormal','hair','cape'].map(name=>[name,new THREE.Texture()]));let externalDisposals=0;Object.values(textures).forEach(t=>t.addEventListener('dispose',()=>externalDisposals++));a.setTextures(textures);
 a.skeleton.computeBoneTexture();let boneTextureDisposals=0;a.skeleton.boneTexture.addEventListener('dispose',()=>boneTextureDisposals++);
 const before=b.human.geometry.attributes.position.getX(0);a.human.geometry.attributes.position.setX(0,999);assert.equal(b.human.geometry.attributes.position.getX(0),before,'instance geometry cannot mutate another actor or its cached decoded source');
 a.dispose();a.dispose();assert([...geometryEvents.values()].every(n=>n===1));assert([...materialEvents.values()].every(n=>n===1));assert.equal(boneTextureDisposals,1);assert.equal(externalDisposals,0);assert.equal(a.setTextures(textures),false);
 pose(b,fixtures.find(f=>f[0]==='special'));assert(vertex(b,0).toArray().every(Number.isFinite));b.dispose();Object.values(textures).forEach(t=>t.dispose());assert.equal(externalDisposals,5);
});
