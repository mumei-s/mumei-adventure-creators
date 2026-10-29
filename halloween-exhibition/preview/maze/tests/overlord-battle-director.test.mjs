import test from 'node:test';
import assert from 'node:assert/strict';
import {overlordBattleDirector as direct,overlordActionDuration as duration} from '../overlord-battle-director.js';
const battle={status:'playing',maxSpirit:30,spirit:26};
const shine={type:'shine',started:10,damage:4,retaliation:1,blocked:0};
const at=(age,effect=shine,extra={})=>direct({battle,effect,time:10+age,...extra});
test('shared action timing gives ordinary actions their own pace and preserves blocked special attacks',()=>{
 assert.equal(duration({type:'guard'}),.9);
 assert(duration({type:'attack',retaliation:1})<duration({type:'shine',retaliation:1}));
 assert.equal(duration({type:'guard',blocked:5,counterSpecial:true}),3.2);
 assert.equal(duration({counterSpecial:true,retaliation:5,finished:true}),1.4);
 assert.equal(duration({counterSpecial:true,retaliation:5,motion:false}),.12);
});
test('a player attack travels and lands before the return strike, then every action settles by the shared duration',()=>{
 for(const type of ['shine','guard','attack']){
  const effect={...shine,type};const total=duration(effect);
  assert.equal(at(.1,effect).counter.active,false);
  const seen=new Set();for(let age=0;age<total;age+=.01)seen.add(at(age,effect).phase);
  assert(seen.has('player-charge'));assert(seen.has('cast'));assert(seen.has('impact'));
  const end=at(total+.01,effect);assert.equal(end.counter.active,false);assert.equal(end.phase,'idle');assert(end.blades.every(blade=>!blade.active));
 }
 const launch=at(.4);assert(launch.player.travel>0&&launch.player.travel<1);
 const impact=at(.65);assert(impact.player.impact>0);assert(impact.actors.bossRecoil>0);
});
test('five special blades launch in order and land separately on the shared target timeline',()=>{
 const effect={...shine,counterSpecial:true,retaliation:5};const first=Array(5).fill(null),peak=Array(5).fill(0),land=Array(5).fill(null);
 for(let age=0;age<duration(effect);age+=.005){const shot=at(age,effect);shot.blades.forEach((blade,i)=>{if(blade.active&&first[i]===null)first[i]=age;if(blade.impact>peak[i]){peak[i]=blade.impact;land[i]=age;}});}
 assert(first.every(Number.isFinite));assert(first.every((time,i)=>i===0||time>first[i-1]+.09));
 assert(peak.every(value=>value>.95));assert(land.every((time,i)=>i===0||time>land[i-1]+.09));
 assert(land.at(-1)<duration(effect));
 assert.equal(at(1.5,effect).phase,'charge');assert(at(2.4,effect).camera.pullback>0);
});
test('fully blocked strikes animate a shield impact; peaceful and finishing turns cannot launch swords',()=>{
 const blocked={...shine,type:'guard',retaliation:0,blocked:5,counterSpecial:true};
 const frames=Array.from({length:640},(_,i)=>at(i*.005,blocked));
 assert(frames.some(frame=>frame.counter.active&&frame.player.shield>.9&&frame.counter.impact>.5));
 assert(frames.some(frame=>frame.actors.heroRecoil>0));
 for(const effect of [{...shine,retaliation:0,blocked:0,counterSpecial:true},{...blocked,finished:true}]){
  for(let age=0;age<3.3;age+=.03)assert(at(age,effect).blades.every(blade=>!blade.active));
 }
});
test('the palace changes after the hit lands and victory closes its portal into warm light',()=>{
 const weak={status:'playing',maxSpirit:30,spirit:12},effect={...shine,damage:10};
 const before=at(.1,effect,{battle:weak}),after=at(.9,effect,{battle:weak});
 assert.equal(before.environment.rage,0);assert(after.environment.rage>.5);assert(after.environment.portal>0);
 const win={...weak,status:'won',spirit:0},finishing={...shine,finished:true,damage:12,retaliation:0};
 const early=at(.4,finishing,{battle:win}),late=at(2.1,finishing,{battle:win});
 assert(early.environment.portal>late.environment.portal);assert.equal(late.environment.gold,1);assert.equal(late.environment.portal,0);assert.equal(late.phase,'victory');
});
test('a dropped frame still completes the native victory pose on the encounter clock',async()=>{
 const THREE=await import('../vendor/three.module.js'),{createOverlordBoss}=await import('../overlord-boss.js');
 const actor=createOverlordBoss(THREE),effect={...shine,finished:true,damage:30,retaliation:0},won={...battle,status:'won',spirit:0};
 const early=at(.9,effect,{battle:won}),late=at(2.4,effect,{battle:won});
 actor.update(.01,{time:10.9,state:early.state,stateElapsed:early.stateElapsed,motion:true});
 actor.update(.01,{time:12.4,state:late.state,stateElapsed:late.stateElapsed,motion:true});
 assert.equal(late.state,'defeat');assert.ok(Math.abs(actor.joints.torso.rotation.x-.25)<1e-10);
 actor.dispose();
});
test('the last opposing strike completes before the resting result replaces its phase label',()=>{
 const resting={...battle,status:'rest'};
 assert.notEqual(at(1.1,shine,{battle:resting}).phase,'rest');
 assert.equal(at(duration(shine),shine,{battle:resting}).phase,'rest');
});
test('reduced motion is frame-identical with static battle-state colors and no movement or travelling effects',()=>{
 const args={battle:{...battle,spirit:8},effect:{...shine,retaliation:5,counterSpecial:true},motion:false};
 const a=direct({...args,time:10.3}),b=direct({...args,time:100.3});assert.deepEqual(a,b);
 assert(a.environment.rage>0);assert.deepEqual(a.camera,{push:0,orbit:0,pullback:0,shakeX:0,shakeY:0});
 assert.equal(a.environment.wind,0);assert.equal(a.environment.emberSpeed,0);assert(a.blades.every(blade=>!blade.active));
 assert.equal(a.player.shield,0);assert.equal(a.player.impact,0);
});
test('long fights and malformed optional values remain finite and bounded',()=>{
 const visit=value=>{if(typeof value==='number')assert(Number.isFinite(value));else if(value&&typeof value==='object')Object.values(value).forEach(visit);};
 for(const motion of [true,false])for(const time of [0,1e6,NaN,Infinity]){
  const frame=direct({battle:{maxSpirit:0,spirit:NaN},effect:{started:NaN,damage:Infinity},time,motion});visit(frame);
  assert(frame.environment.portal>=0&&frame.environment.portal<=1);assert(Math.abs(frame.camera.orbit)<=.014);
 }
});
