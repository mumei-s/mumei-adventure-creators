import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {withOverlordBattle} from './helpers/overlord-battle-factory.mjs';

test('actual native factory keeps the continuous actor and pooled painted battle layers through complete actions',async()=>{
 await withOverlordBattle(async({battle,canvas,art,requests})=>{
  const state={status:'playing',spirit:26,maxSpirit:30},effect={type:'shine',started:10,damage:4,retaliation:5,counterSpecial:true};
  assert.equal(battle.boss.sprite.isSprite,true);assert.equal(battle.boss.sprite.geometry.index.count/3,60);
  assert(requests.some(url=>url.includes('queen-actions-v4.webp')));
  const actors=[];battle.scene.traverse(object=>actors.push(object));
  const energy=actors.filter(object=>object.isSprite&&object.name.startsWith('painted-'));assert.equal(energy.length,3);assert(energy.every(object=>!object.visible));
  const poseIndices=new Set();
  for(const size of [[390,518],[844,220],[280,420]]){
   [canvas.clientWidth,canvas.clientHeight]=size;
   for(let step=0;step<=66;step++){
    battle.render({battle:state,effect,time:10+step*.05,motion:true});poseIndices.add(battle.boss.rig.sample.frameIndex);
    assert(battle.boss.sprite.visible);assert([...battle.boss.sprite.geometry.attributes.position.array].every(Number.isFinite));
    assert(battle.camera.position.toArray().every(Number.isFinite));
   }
  }
  assert.deepEqual([...poseIndices].sort(),[0,1,2,5]);
  const background={width:1536,height:1024};art.images.battleEclipse=background;art.images.battleEnergy={width:1536,height:512};
  battle.render({battle:state,effect,time:11.65,motion:true});assert.equal(battle.scene.background.image,background);assert(energy.some(object=>object.visible),'optional painted energy reaches the actual native stage');
  const texture=battle.scene.background,versions=energy.map(object=>object.material.map.version),materialMaps=energy.map(object=>object.material.map);
  for(let step=0;step<60;step++)battle.render({battle:state,effect,time:11.65+step*.01,motion:true});
  assert.equal(battle.scene.background,texture);assert.deepEqual(energy.map(object=>object.material.map),materialMaps);assert.deepEqual(energy.map(object=>object.material.map.version),versions);
  const after=[];battle.scene.traverse(object=>after.push(object));assert.deepEqual(after,actors,'ordinary rendering retains the pooled scene graph');
  battle.render({battle:state,effect,time:11.65,motion:false});assert(energy.every(object=>!object.visible));
  const stopped=[...battle.boss.sprite.geometry.attributes.position.array];battle.render({battle:state,effect,time:100,motion:false});assert.deepEqual([...battle.boss.sprite.geometry.attributes.position.array],stopped);
  let disposed=0;for(const map of [texture,...materialMaps])map.addEventListener('dispose',()=>disposed++);battle.dispose();battle.dispose();assert.equal(disposed,4,'all optional painted texture resources are released once');
 });
});

test('Canvas and actual native stage agree on seated, rise, opposite steps, hit and held victory poses',async()=>{
 const {renderOverlordBattle2D}=await import('../overlord-battle-2d.js');
 const {OVERLORD_SPRITE_LAYOUT}=await import('../overlord-sprite-layout.js');
 await withOverlordBattle(async({battle,art})=>{
  const sheet={width:1344,height:1632},draws=[],gradient={addColorStop(){}};
  const context=new Proxy({globalAlpha:1,createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,drawImage(image,...args){if(image===sheet)draws.push(args.slice(0,4));}},{get:(object,key)=>key in object?object[key]:()=>{},set:(object,key,value)=>(object[key]=value,true)});
  const canvas={clientWidth:390,clientHeight:518,width:390,height:518,getContext:()=>context},canvasArt={images:{...art.images,overlordArtAtlas:sheet}};
  const state={status:'playing',spirit:26,maxSpirit:30},start=100;
  const check=(time,expected,{current=state,effect=null,motion=true}={})=>{
   draws.length=0;battle.render({battle:current,effect,time,motion});
   renderOverlordBattle2D({canvas,art:canvasArt,battle:current,effect,time,start,motion});
   assert(draws.length===60||(!motion&&draws.length===1));
   assert(draws.every(crop=>crop.every((value,index)=>value===OVERLORD_SPRITE_LAYOUT.frames[expected].frame[index])),'Canvas must draw only the expected complete source pose');
   assert.equal(battle.boss.rig.sample.frameIndex,expected,'native must select the same pose from the same action clock');
   const actor=battle.boss.sprite,origin=actor.getWorldPosition(new THREE.Vector3()).applyMatrix4(battle.camera.matrixWorldInverse),scale=actor.getWorldScale(new THREE.Vector3()),position=actor.geometry.attributes.position;
   for(let index=0;index<position.count;index++){
    const point=origin.clone();point.x+=(position.getX(index)-(actor.center.x-.5))*scale.x;point.y+=(position.getY(index)-(actor.center.y-.5))*scale.y;point.applyMatrix4(battle.camera.projectionMatrix);
    assert(Math.abs(point.x)<=1&&Math.abs(point.y)<=1&&point.z>-1&&point.z<1,`actual native pose ${expected} must fit at ${time}`);
   }
   assert.equal(battle.boss.metadata.animationAssetComplete,false);assert.equal(battle.boss.metadata.frontWalkArt,true);
   return battle.boss.group.position.z;
  };
  const seated=check(100,6);check(100.9,5);check(101.4,0);const firstStep=check(101.66,3),secondStep=check(102.1,4),arrived=check(102.65,0);
  assert(firstStep>seated&&secondStep>firstStep&&arrived>secondStep,'authored front steps must travel toward the hero during the entrance');
  check(110.6,5,{effect:{type:'shine',started:110,damage:4,retaliation:1}});
  const won={...state,status:'won',spirit:0},effect={type:'shine',started:120,damage:4,finished:true};
  check(120.9,0,{current:won,effect});check(121.2,5,{current:won,effect});check(121.7,6,{current:won,effect});check(999,6,{current:won,effect});
  check(120,6,{current:won,effect,motion:false});const held=[...battle.boss.sprite.geometry.attributes.position.array];
  check(999,6,{current:won,effect,motion:false});assert.deepEqual([...battle.boss.sprite.geometry.attributes.position.array],held);
 });
});
