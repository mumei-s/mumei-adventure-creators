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
