import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {sampleOverlordSprite} from '../overlord-sprite.js';
import {OVERLORD_SPRITE_LAYOUT} from '../overlord-sprite-layout.js';
import {sampleOverlordDeformation,createOverlordDeformGeometry,updateOverlordDeformGeometry} from '../overlord-deform.js';
const atlas={width:1248,height:544};
const pose=(index,state='idle')=>sampleOverlordSprite(atlas,{...OVERLORD_SPRITE_LAYOUT,idleFrame:index},{motion:false,state});
const area=(points,[a,b,c])=>(points[b].x-points[a].x)*(points[c].y-points[a].y)-(points[b].y-points[a].y)*(points[c].x-points[a].x);

test('continuous pose geometry keeps every painted triangle connected, finite and uninverted',()=>{
 for(let index=0;index<3;index++){
  const sprite=pose(index),rest=sampleOverlordDeformation(sprite,{motion:false});
  assert.equal(rest.points.length,42);assert.equal(rest.triangles.length,60);
  for(const state of ['idle','attack','special','hit','walk','defeat'])for(let frame=0;frame<=90;frame++){
   const sampled=sampleOverlordDeformation(sprite,{state,time:frame/15,attackProgress:frame/90});
   assert(sampled.points.every(point=>[point.x,point.y,point.dx,point.dy].every(Number.isFinite)));
   for(const indices of sampled.triangles){const ratio=area(sampled.points,indices)/area(rest.points,indices);assert(ratio>.5&&ratio<1.5,'painted cloth cannot fold over or collapse its original surface');for(let i=0;i<3;i++){const a=indices[i],b=indices[(i+1)%3],distance=points=>Math.hypot(points[a].x-points[b].x,points[a].y-points[b].y),length=distance(sampled.points)/distance(rest.points);assert(length>.5&&length<1.5,'adjacent painted vertices cannot tear or stretch apart');}}
   assert(sampled.points.every(point=>Math.hypot(point.dx,point.dy)<.10),'continuous follow-through stays inside the reserved ten-percent action envelope');
   for(const point of sampled.points.filter(point=>point.v===1&&point.u>=.4&&point.u<=.6))assert(Math.hypot(point.dx,point.dy)<1e-12,'the two planted central sole vertices stay fixed');
  }
 }
});

test('motion OFF restores the same intact resting drawing at any clock or action',()=>{
 for(let index=0;index<3;index++){
  const sprite=pose(index),rest=sampleOverlordDeformation(sprite,{motion:false,time:0});
  for(const state of ['idle','special','hit','walk'])assert.deepEqual(sampleOverlordDeformation(sprite,{motion:false,state,time:999,attackProgress:.8}),rest);
  const a=sampleOverlordDeformation(sprite,{time:1}),b=sampleOverlordDeformation(sprite,{time:2});assert.notDeepEqual(a.points,b.points,'idle hair and cloth actually change across time');
 }
});

test('native Sprite grid uses the same continuous points as Canvas2D without replacing GPU buffers',()=>{
 const geometry=createOverlordDeformGeometry(THREE),attribute=geometry.attributes.position,indices=geometry.index;
 try{
  for(let index=0;index<3;index++)for(const state of ['idle','special','hit']){
   const sprite=pose(index),input={state,time:2.3,attackProgress:.6},sampled=updateOverlordDeformGeometry(geometry,sprite,input);
   sampled.points.forEach((point,at)=>{
    const x=(attribute.getX(at)+.5)*sampled.aspect-sprite.anchorX*sampled.aspect;
    const y=(.5-attribute.getY(at))*sampled.vertical-sprite.anchorY*sampled.vertical;
    assert(Math.abs(x-point.x)<1e-7&&Math.abs(y-point.y)<1e-7,'native and Canvas paint positions must remain identical');
   });
   assert.equal(geometry.attributes.position,attribute);assert.equal(geometry.index,indices);
  }
  let disposed=0;geometry.addEventListener('dispose',()=>disposed++);geometry.dispose();assert.equal(disposed,1);
 }finally{geometry.dispose();}
});
