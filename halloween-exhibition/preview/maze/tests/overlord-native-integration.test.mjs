import test from 'node:test';
import assert from 'node:assert/strict';
import {withOverlordBattle} from './helpers/overlord-battle-factory.mjs';

test('actual native factory keeps the continuous actor and pooled painted battle layers through complete actions',async()=>{
 await withOverlordBattle(async({battle,canvas,art,requests})=>{
  const state={status:'playing',spirit:26,maxSpirit:30},effect={type:'shine',started:10,damage:4,retaliation:5,counterSpecial:true};
  assert.equal(battle.boss.sprite.isSprite,true);assert.equal(battle.boss.sprite.geometry.index.count/3,60);
  assert(requests.some(url=>url.includes('queen-cast-poses-v3.webp')));
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
  assert.deepEqual([...poseIndices].sort(),[0,1,2]);
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
