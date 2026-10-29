import assert from 'node:assert/strict';
import * as THREE from '../halloween-exhibition/preview/maze/vendor/three.module.js';
import {createOverlordBoss,overlordFaceUV} from '../halloween-exhibition/preview/maze/overlord-boss.js';
const model=createOverlordBoss(THREE);
assert.equal(model.swords.length,5);
let triangles=0,meshes=0;
model.group.traverse(o=>{if(!o.isMesh)return;meshes++;const a=o.geometry.attributes.position;triangles+=(o.geometry.index?.count??a.count)/3;for(const x of a.array)assert.ok(Number.isFinite(x));assert.ok(o.geometry.attributes.normal);assert.ok(!o.isSprite);assert.equal(o.geometry.attributes.uv.count,a.count,'surface UV survives rigid-joint batching');for(const x of o.geometry.attributes.uv.array){assert.ok(Number.isFinite(x));assert.ok(x>=-1e-6&&x<=1+1e-6,'local surface UV cannot bleed into an adjacent atlas quadrant');}});
// Sculpted face, continuous hair and full-depth armour have a deliberate mobile
// budget. This remains one articulated actor, with merged rigid materials.
assert.ok(triangles<100000);assert.ok(meshes<130);
const cape=model.group.getObjectByName('animated-crimson-cape');
const before=Array.from(cape.geometry.attributes.position.array);
for(const state of model.metadata.states){model.setState(state);for(let i=0;i<180;i++)model.update(1/60,{time:i/60});model.group.traverse(o=>{for(const x of [...o.position.toArray(),...o.rotation.toArray().slice(0,3)])assert.ok(Number.isFinite(x),state);});}
assert.notDeepEqual(Array.from(cape.geometry.attributes.position.array),before);
model.setState('walk');model.update(.1,{time:1});assert.notEqual(model.joints.legs[0].hip.rotation.x,model.joints.legs[1].hip.rotation.x);
model.setState('seated');model.update(0);assert.ok(model.joints.legs[0].hip.rotation.x< -1);
model.setState('stand');for(let i=0;i<20;i++)model.update(.1);assert.ok(Math.abs(model.joints.legs[0].hip.rotation.x)<1e-8);
model.setState('special');model.update(0,{attackProgress:.5});assert.ok(model.swords.every(s=>s.position.z>1));
for(const state of model.metadata.states){model.setState(state);model.update(.01,{motion:false});model.group.updateMatrixWorld(true);const matrices=JSON.stringify(model.group.toJSON());model.update(.1,{motion:false});model.group.updateMatrixWorld(true);assert.equal(JSON.stringify(model.group.toJSON()),matrices,'reduced motion '+state);}
assert.throws(()=>model.setState('unknown'),/Unknown/);
const face=model.group.getObjectByName('sculpted-face-surface'),details=model.group.getObjectByName('procedural-facial-details');assert(face&&details);
const positions=face.geometry.attributes.position,faceUV=face.geometry.attributes.uv;
let minZ=Infinity,maxZ=-Infinity;
for(let i=0;i<positions.count;i++){const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);const [u,v]=overlordFaceUV(x,y);assert.ok(Math.abs(faceUV.getX(i)-u)<1e-6);assert.ok(Math.abs(faceUV.getY(i)-v)<1e-6);assert.ok(u>=0&&u<=1&&v>=0&&v<=1);}
// Independent measured landmark targets from the generated facial quadrant.
for(const [top,target]of[[.46,.31],[.62,.60],[.74,.78]])assert.ok(Math.abs(overlordFaceUV(0,.16-top*.33)[1]-(1-target))<1e-6);
assert.ok(Math.abs(overlordFaceUV(-.047,.008)[0]-.255)<.002);assert.ok(Math.abs(overlordFaceUV(.047,.008)[0]-.745)<.002);
assert.ok(Math.abs(overlordFaceUV(0,.16-.43*.33)[1]-.75)<1e-6);assert.ok(Math.abs(overlordFaceUV(0,.16-.49*.33)[1]-.62)<1e-6,'eyelid span stays anatomical');
assert.ok(Math.abs(overlordFaceUV(0,.16-.72*.33)[1]-.30)<1e-6);assert.ok(Math.abs(overlordFaceUV(0,.16-.77*.33)[1]-.14)<1e-6,'lip boundary is not stretched across the lower face');
assert.ok(maxZ-minZ>.1,'face is a sculpted half-head, never an image plane');
const textures=Object.fromEntries(['face','armor','hair','cape'].map(name=>[name,new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1)]));let externalDisposals=0;for(const texture of Object.values(textures))texture.addEventListener('dispose',()=>externalDisposals++);
assert.equal(model.setTextures(textures),true);assert.equal(face.material.map,textures.face);assert.equal(details.visible,false);
for(const name of ['face','armor','hair','red'])assert.equal(model.materials[name].color.getHex(),0xffffff,'atlas colour is not multiplied by dark base tint');
model.setTextures({face:null});assert.equal(details.visible,true);assert.equal(model.materials.face.map,null);assert.equal(model.materials.face.color.getHex(),0xf0bea5);
model.setState('idle');model.update(0,{motion:false,swordSpread:1});const fullWidth=Math.abs(model.swords[0].position.x);model.update(0,{motion:false,swordSpread:.68});assert.ok(Math.abs(model.swords[0].position.x)<fullWidth*.7);
model.update(NaN);model.update(-1);model.dispose();model.dispose();model.update(.1);
assert.equal(externalDisposals,0,'caller-owned textures outlive the model');assert.equal(model.setTextures(textures),false);Object.values(textures).forEach(texture=>texture.dispose());assert.equal(externalDisposals,4);
console.log(JSON.stringify({passed:true,meshes,triangles,states:model.metadata.states}));
