import test from 'node:test';import assert from 'node:assert/strict';
import {enemyRigEffect} from '../battle-rig-effects.js';
test('palace retaliation articulates only its existing counterattack interval',()=>{
 for(const [type,offset,duration]of[['attack',.68,.52],['shine',1.9,.5]]){
  const effect={type,started:10,retaliation:2};assert.equal(enemyRigEffect(effect,10+offset-.001),null);
  assert.deepEqual(enemyRigEffect(effect,10+offset+.05),{type:'attack',started:10+offset,duration});
  assert.equal(enemyRigEffect(effect,10+offset+duration+.001),null);assert.equal(enemyRigEffect(effect,10+offset+.05,{won:true}),null);
 }
 assert.equal(enemyRigEffect({type:'guard',started:0,retaliation:2},.7),null);
 assert.equal(enemyRigEffect({type:'attack',started:0,retaliation:0},.7),null);
});
test('town enemy turn maps its own duration without adding a player attack',()=>{
 const effect={type:'enemy',started:3,duration:.55,pending:true};assert.equal(enemyRigEffect(effect,2.99),null);
 assert.deepEqual(enemyRigEffect(effect,3.2),{...effect,type:'attack'});assert.equal(effect.type,'enemy');
 assert.equal(enemyRigEffect(effect,3.56),null);assert.equal(enemyRigEffect(null,0),null);
});
