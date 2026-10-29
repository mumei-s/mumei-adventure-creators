import assert from 'node:assert/strict';
import * as THREE from '../halloween-exhibition/preview/maze/vendor/three.module.js';
import {createOverlordBoss} from '../halloween-exhibition/preview/maze/overlord-boss.js';
const model=createOverlordBoss(THREE);
assert.equal(model.swords.length,5);
let triangles=0,meshes=0;
model.group.traverse(o=>{if(!o.isMesh)return;meshes++;const a=o.geometry.attributes.position;triangles+=(o.geometry.index?.count??a.count)/3;for(const x of a.array)assert.ok(Number.isFinite(x));assert.ok(o.geometry.attributes.normal);assert.ok(!o.isSprite);});
assert.ok(triangles<50000);assert.ok(meshes<100);
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
model.update(NaN);model.update(-1);model.dispose();model.dispose();model.update(.1);
console.log(JSON.stringify({passed:true,meshes,triangles,states:model.metadata.states}));
