import assert from 'node:assert/strict';
import * as THREE from '../halloween-exhibition/preview/maze/vendor/three.module.js';
import {createOverlordBoss,overlordFaceUV} from '../halloween-exhibition/preview/maze/overlord-boss.js';
const model=createOverlordBoss(THREE);
assert.equal(model.swords.length,5);
assert(model.human.isSkinnedMesh,'body must be continuous anatomical skin, not assembled spheres');
assert.equal(model.metadata.source.license,'CC0-1.0');assert.equal(model.human.geometry.index.count/3,26756);
const g=model.human.geometry,p=g.attributes.position,weights=g.attributes.skinWeight,indices=g.attributes.skinIndex;
assert(p.count>13000&&p.count<16000);assert.equal(weights.count,p.count);
for(let i=0;i<p.count;i++){
 let sum=0;for(let j=0;j<4;j++){const w=weights.getComponent(i,j);assert(w>=0&&w<=1);sum+=w;assert(indices.getComponent(i,j)<model.skeleton.bones.length);}
 assert(Math.abs(sum-1)<1e-6);
}
let meshes=0,triangles=0;
model.root.traverse(o=>{
 if(!o.isMesh)return;meshes++;assert(!o.isSprite);const a=o.geometry.attributes.position;triangles+=(o.geometry.index?.count??a.count)/3;
 for(const x of a.array)assert(Number.isFinite(x));assert(o.geometry.attributes.normal);assert.equal(o.geometry.attributes.uv.count,a.count);
 const textured=(Array.isArray(o.material)?o.material:[o.material]).some(m=>[model.materials.face,model.materials.hair,model.materials.hairLight,model.materials.red].includes(m));
 for(const x of o.geometry.attributes.uv.array){assert(Number.isFinite(x));if(textured)assert(x>=-1e-6&&x<=1+1e-6,'atlas-local coordinates stay in the intended material region');}
});
assert(triangles<120000,`mobile actor triangle budget: ${triangles}`);assert(meshes<150,`mobile actor draw budget: ${meshes}`);
// The complete sculpt has actual eyelids, lips and nose depth before any map loads.
const face=[];for(let i=0;i<p.count;i++)if(p.getY(i)>1.955&&p.getY(i)<2.19&&Math.abs(p.getX(i))<.10&&p.getZ(i)>.10)face.push([p.getX(i),p.getY(i),p.getZ(i)]);
assert(face.length>300);assert(Math.max(...face.map(v=>v[2]))-Math.min(...face.map(v=>v[2]))>.1);
for(const [x,y,u,v]of[[-.04039,2.097872,.255,.69],[.04039,2.097872,.745,.69],[0,2.058266,.5,.40],[0,2.0123,.5,.22]]){
 const out=overlordFaceUV(x,y);assert(Math.abs(out[0]-u)<.001);assert(Math.abs(out[1]-v)<1e-6);
}
const cape=model.root.getObjectByName('animated-crimson-cape');assert(cape);const capeStart=Array.from(cape.geometry.attributes.position.array);const point=new THREE.Vector3();
for(const state of model.metadata.states){
 model.setState(state);for(let n=0;n<90;n++)model.update(1/60,{time:n/60});model.root.updateMatrixWorld(true);model.skeleton.update();
 for(let i=0;i<p.count;i+=117){model.human.getVertexPosition(i,point);assert(point.toArray().every(Number.isFinite),state+' posed skin');}
}
assert.notDeepEqual(Array.from(cape.geometry.attributes.position.array),capeStart);
model.setState('walk');model.update(.1,{time:1});assert.notEqual(model.joints.legs[0].hip.rotation.x,model.joints.legs[1].hip.rotation.x);
model.setState('seated');model.update(0);assert(model.joints.legs.every(a=>a.hip.rotation.x< -1));
model.setState('stand');for(let i=0;i<20;i++)model.update(.1);assert(model.joints.legs.every(a=>Math.abs(a.hip.rotation.x)<.1));
for(const state of model.metadata.states){
 model.setState(state);model.update(.01,{motion:false});model.root.updateMatrixWorld(true);
 const matrix=model.skeleton.bones.map(b=>b.matrixWorld.toArray()),cloth=Array.from(cape.geometry.attributes.position.array);
 model.update(.1,{motion:false});model.root.updateMatrixWorld(true);
 assert.deepEqual(model.skeleton.bones.map(b=>b.matrixWorld.toArray()),matrix,'reduced motion bones: '+state);assert.deepEqual(Array.from(cape.geometry.attributes.position.array),cloth,'reduced motion cloth: '+state);
}
const textures=Object.fromEntries(['face','armor','hair','cape'].map(name=>[name,new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1)]));let externalDisposals=0;
for(const t of Object.values(textures))t.addEventListener('dispose',()=>externalDisposals++);
assert.equal(model.setTextures(textures),true);assert.equal(model.materials.face.map,textures.face);assert.equal(model.materials.armor.map,null,'sculpted gilt must not turn into repeated texture wallpaper');
for(const name of['face','hair','red'])assert.equal(model.materials[name].color.getHex(),0xffffff);
assert.throws(()=>model.setState('unknown'),/Unknown/);model.update(NaN);model.update(-1);model.dispose();model.dispose();model.update(.1);assert.equal(externalDisposals,0);assert.equal(model.setTextures(textures),false);
Object.values(textures).forEach(t=>t.dispose());assert.equal(externalDisposals,4);
console.log(JSON.stringify({passed:true,meshes,triangles,anatomicalVertices:p.count,states:model.metadata.states}));
