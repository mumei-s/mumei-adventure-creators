import test from 'node:test';
import assert from 'node:assert/strict';
import {overlordBattleCue} from '../overlord-battle-scene.js';
const battle={status:'playing'};
const cue=(effect,extra={})=>overlordBattleCue({battle,effect:{started:2,...effect},time:4,start:0,...extra});
test('a peaceful bow never becomes a counterattack, but a fully blocked strike remains visible',()=>{
 assert.equal(cue({retaliation:0,blocked:0}).counter,false);
 assert.equal(cue({retaliation:0,blocked:0}).state,'idle');
 assert.equal(cue({retaliation:0,blocked:5,counterSpecial:true}).state,'special');
 assert.equal(cue({retaliation:1,blocked:0}).state,'attack');
});
test('a finishing blow cannot launch a late attack, even on a special telegraph',()=>{
 const pose=cue({retaliation:0,blocked:0,counterSpecial:true,finished:true},{battle:{status:'won'}});
 assert.equal(pose.counter,false);assert.equal(pose.state,'defeat');
});
test('the boss reacts to the player strike before its return strike, with no intro delay for reduced motion',()=>{
 const hit=cue({damage:4,retaliation:1},{time:2.6});
 assert.equal(hit.state,'hit');assert.equal(hit.counter,false);
 const still=overlordBattleCue({battle,effect:null,time:0,start:0,motion:false});
 assert.equal(still.intro,1);assert.equal(still.state,'idle');
});

test('the entrance sits, stands and walks forward, while the first chosen action skips the entrance',()=>{
 const pose=time=>overlordBattleCue({battle,effect:null,time,start:0});
 assert.equal(pose(0).state,'seated');assert.equal(pose(.7).state,'stand');assert.equal(pose(2).state,'walk');assert.equal(pose(3).state,'idle');
 assert.equal(pose(.7).walkProgress,0);assert(pose(2).walkProgress>0&&pose(2).walkProgress<1);assert.equal(pose(3).walkProgress,1);
 const immediate=overlordBattleCue({battle,effect:{started:.05,damage:4,retaliation:0},time:.6,start:0});
 assert.equal(immediate.intro,1);assert.equal(immediate.state,'hit');
});

test('special attacks have a readable charge, cast and impact sequence without flashing when motion is reduced',()=>{
 const effect={started:0,retaliation:5,blocked:0,counterSpecial:true};
 const pose=progress=>overlordBattleCue({battle,effect,time:1.4+progress*1.5,start:0});
 assert.equal(pose(.1).phase,'charge');assert.equal(pose(.5).phase,'cast');assert.equal(pose(.9).phase,'impact');
 assert.equal(pose(.5).state,'special');assert.equal(pose(.5).counter,true);
 const still=overlordBattleCue({battle,effect,time:2,start:0,motion:false});assert.equal(still.intro,1);
});
