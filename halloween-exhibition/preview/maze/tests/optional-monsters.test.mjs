import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {ALL_MONSTERS,MONSTERS,OPTIONAL_MONSTERS,REQUIRED_MONSTER_IDS,ENCOUNTER_RULES,BATTLE_ACTIONS,newBattle,battleTurn,commandFor,prankFor,intentFor,monsterAvailable,monsterPose,nearestMonster,guidePoint} from '../encounter-model.js';
import {STORY_MONSTER_IDS,encounterStory,chapterFor} from '../story-model.js';
import {eligibleForEnding} from '../clear-reward.js';
import {PATROL_ROUTES,createActorPatrol,samplePatrolPosition,patrolPointSafe,patrolSegmentSafe} from '../patrol-model.js';
import {CREATOR_SLOTS} from '../creator-runtime.js';
import {initialState,toWorld,move} from '../maze-model.js';
import {moveAroundFurniture} from '../rpg-model.js';

const originalSix=['pumpkin','ghost','zombie','vampire','franken','bat'];
const originalEight=[...originalSix,'witch','masked_wanderer'];
const addedIds=['werewolf','mummy'];
const added=addedIds.map(id=>ALL_MONSTERS.find(monster=>monster.id===id));
const open={unlocked:true,horrorAccepted:true};
const choose=battle=>{
  const commands=BATTLE_ACTIONS.map(action=>commandFor(battle,action));
  return commands.find(command=>command.finishing&&!command.disabled)||commands.find(command=>command.recommended&&!command.disabled)||commands.find(command=>command.action==='attack');
};
const play=id=>{
  let battle=newBattle(id);const actions=[];
  for(let i=0;i<20&&battle.status==='playing';i++){const command=choose(battle);actions.push(command.action);battle=battleTurn(battle,command.action);}
  return {battle,actions};
};

test('two new encounters extend the optional roster without replacing any existing identity',()=>{
  assert.deepEqual(MONSTERS.map(monster=>monster.id),originalSix);
  assert.deepEqual(REQUIRED_MONSTER_IDS,originalSix);
  assert.deepEqual(STORY_MONSTER_IDS,originalSix);
  assert.deepEqual(ALL_MONSTERS.map(monster=>monster.id),[...originalEight,...addedIds]);
  assert.deepEqual(OPTIONAL_MONSTERS.map(monster=>monster.id),['witch','masked_wanderer',...addedIds]);
  assert.equal(ALL_MONSTERS.length,10);assert.equal(OPTIONAL_MONSTERS.length,4);
  for(const monster of added){assert.equal(monster.optional,true);assert(Object.isFrozen(monster));assert(!monster.creatorId);}
  // Snapshot only the original eight definitions, stories, rules and lanes. New
  // content cannot silently change those previously approved encounters.
  const legacy=originalEight.map(id=>({monster:ALL_MONSTERS.find(monster=>monster.id===id),rules:ENCOUNTER_RULES[id],story:encounterStory(id),route:PATROL_ROUTES.monster[id]}));
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(legacy)).digest('hex'),'ee84165945092c9a3d48d396adc3e3d29c0e963a28f748b865e8d378075c3183');
});

test('optional victories never substitute for the original six or add a seventh ending requirement',()=>{
  const optional=OPTIONAL_MONSTERS.map(monster=>monster.id),complete={...open,reachedVault:true,cleared:originalSix};
  assert(eligibleForEnding(complete,REQUIRED_MONSTER_IDS));
  assert.equal(chapterFor(complete).id,'dawn');
  assert.deepEqual(chapterFor({...complete,cleared:[...originalSix,...optional,...optional]}),chapterFor(complete));
  for(const missing of originalSix){
    const state={...complete,cleared:[...originalSix.filter(id=>id!==missing),...optional]};
    assert.equal(eligibleForEnding(state,REQUIRED_MONSTER_IDS),false,missing);
    assert.equal(chapterFor(state).count,5);assert.notEqual(chapterFor(state).id,'dawn');
  }
  assert.equal(chapterFor({...complete,cleared:optional}).count,0);
  for(const gate of ['unlocked','reachedVault'])assert.equal(eligibleForEnding({...complete,[gate]:false,cleared:[...originalSix,...optional]},REQUIRED_MONSTER_IDS),false);
});

test('new stories are complete, distinct fictional characters with optional keepsakes',()=>{
  const seen={dialogue:new Set(),memory:new Set(),keepsake:new Set(),role:new Set()};
  for(const monster of ALL_MONSTERS){
    const story=encounterStory(monster.id);
    for(const key of Object.keys(seen)){assert(!seen[key].has(story[key])||key==='role',`${monster.id}: duplicate ${key}`);seen[key].add(story[key]);}
  }
  for(const monster of added){
    const story=encounterStory(monster.id);assert(Object.isFrozen(story));assert(Object.isFrozen(story.reactions));
    for(const key of ['title','role','location','temperament','intro','dialogue','advice','keepsake','memory','victory'])assert(story[key].length>3,`${monster.id}: ${key}`);
    for(const action of ['guard','shine','attack','weakness','rest'])assert(story.reactions[action].length>3);
    assert.match(story.victory,/六つ/);assert(!JSON.stringify(story).includes('creatorId'));
  }
  assert.notEqual(encounterStory('werewolf').role,encounterStory('mummy').role);
});

test('werewolf and mummy use distinct readable four-step deterministic tactical patterns',()=>{
  assert.deepEqual(ENCOUNTER_RULES.werewolf.turns.map(turn=>turn.weakness),['attack',null,'shine',null]);
  assert.deepEqual(ENCOUNTER_RULES.mummy.turns.map(turn=>turn.weakness),['shine',null,'attack','attack']);
  for(const id of addedIds){
    const rules=ENCOUNTER_RULES[id];assert(Object.isFrozen(rules));assert(Object.isFrozen(rules.turns));
    assert.equal(rules.turns.length,4);assert.equal(new Set(rules.turns.map(turn=>turn.name)).size,4);
    for(let turn=0;turn<16;turn++){
      const battle={...newBattle(id),turn},prank=prankFor(battle);assert.equal(prank.index,turn%4);assert.equal(prank.total,4);
      assert.deepEqual(prank,prankFor({...battle,turn:turn+4}));assert.match(intentFor(battle),new RegExp(`−${prank.damage}`));
      assert(prank.hint.length>8);assert(prank.stance.length>3);
    }
  }
});

test('visible recommendations resolve both new encounters without a hidden roll or timer',()=>{
  const sequences=[];
  for(const id of addedIds){
    const first=play(id),second=play(id);assert.deepEqual(first,second);sequences.push(first.actions.join(','));
    assert.equal(first.battle.status,'won',id);assert.equal(first.battle.spirit,0);assert(first.battle.energy>0);
    assert(first.actions.length>=7&&first.actions.length<=9);assert.equal(new Set(first.actions).size,3);
    assert.equal(first.battle.dialogue,encounterStory(id).victory);assert.equal(battleTurn(first.battle,'attack'),first.battle);
    let spam=newBattle(id);for(let i=0;i<20&&spam.status==='playing';i++)spam=battleTurn(spam,'attack');
    assert.equal(spam.status,'rest',id);assert.equal(spam.energy,0);
    const light=battleTurn(newBattle(id),'shine');assert.equal(light.focus,0);assert.equal(battleTurn(light,'shine'),light);
  }
  assert.notEqual(sequences[0],sequences[1]);
});

test('action previews and immutable transitions agree across every reachable new battle state',()=>{
  for(const id of addedIds){
    const queue=[newBattle(id)],seen=new Set();
    for(let index=0;index<queue.length;index++){
      const battle=queue[index],key=[battle.energy,battle.spirit,battle.focus,battle.charged,battle.turn%4,battle.status].join(',');
      if(seen.has(key))continue;seen.add(key);
      for(const action of BATTLE_ACTIONS){
        const before=JSON.stringify(battle),preview=commandFor(battle,action),next=battleTurn(battle,action);
        assert.equal(JSON.stringify(battle),before);
        if(preview.disabled){assert.equal(next,battle);continue;}
        assert.equal(battle.spirit-next.spirit,preview.damage);assert.equal(battle.energy-next.energy,Math.min(battle.energy,preview.retaliation));
        assert.equal(next.focus,preview.focusAfter);assert.equal(next.turn,battle.turn+1);
        assert(next.energy>=0&&next.energy<=next.maxEnergy);assert(next.focus>=0&&next.focus<=next.maxFocus);
        if(next.status==='playing')queue.push(next);else assert.equal(battleTurn(next,'guard'),next);
      }
    }
    assert(seen.size>100,'covers branching play rather than one scripted win');
    const start=newBattle(id);assert.equal(battleTurn(start,'unknown'),start);
    let guarded=start;for(let i=0;i<20;i++)guarded=battleTurn(guarded,'guard');
    assert.equal(guarded.energy,8);assert.equal(guarded.focus,3);assert.equal(guarded.charged,true);
  }
});

test('new rooms preserve access gates and both species are explicitly discoverable and clearable',()=>{
  const werewolf=added[0],mummy=added[1];assert(monsterAvailable(werewolf,{}));assert(!monsterAvailable(mummy,{}));
  assert(monsterAvailable(mummy,{unlocked:true}));assert.equal(guidePoint(mummy,{}).z,7.4);
  assert.equal(nearestMonster({...initialState(),...toWorld(monsterPose(mummy,0,false))}),null);
  for(const monster of added)for(let time=0;time<=60;time+=.5){
    const pose=monsterPose(monster,time,true,open),state={...open,...toWorld(pose)};
    assert.equal(nearestMonster(state,[],{time,motion:true})?.id,monster.id);
    assert.notEqual(nearestMonster(state,[monster.id],{time,motion:true})?.id,monster.id);
    const guide=guidePoint(monster,open,time,true);assert(patrolPointSafe(guide,open));assert(patrolSegmentSafe(pose,guide,open));
    assert(Math.hypot(guide.x-pose.x,guide.z-pose.z)<=.71);
  }
});

const allRoutes=[
  ...CREATOR_SLOTS.flatMap(slot=>(slot.capacity===3?[-.55,-.3,0,.3,.55]:[-.3,0,.3]).map(offset=>({id:`creator:${slot.id}:${offset}`,route:createActorPatrol({...slot,slotId:slot.id,x:slot.x+offset})}))),
  ...['monster','resident'].flatMap(role=>Object.keys(PATROL_ROUTES[role]).map(id=>({id:`${role}:${id}`,route:createActorPatrol({id},{role})}))),
];
const pointDistance=(point,a,b)=>{
  const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.z-a.z)*dz)/(dx*dx+dz*dz)));
  return Math.hypot(point.x-a.x-t*dx,point.z-a.z-t*dz);
};
const cross=(a,b,c)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
const segmentDistance=(a,b,c,d)=>{
  const intersects=cross(a,b,c)*cross(a,b,d)<=0&&cross(c,d,a)*cross(c,d,b)<=0&&Math.max(Math.min(a.x,b.x),Math.min(c.x,d.x))<=Math.min(Math.max(a.x,b.x),Math.max(c.x,d.x))&&Math.max(Math.min(a.z,b.z),Math.min(c.z,d.z))<=Math.min(Math.max(a.z,b.z),Math.max(c.z,d.z));
  return intersects?0:Math.min(pointDistance(a,c,d),pointDistance(b,c,d),pointDistance(c,a,b),pointDistance(d,a,b));
};

test('new room-local routes clear all full creator, resident and monster lanes independent of phase',()=>{
  for(const id of addedIds){
    const route=createActorPatrol({id},{role:'monster'});assert(route.points.every(point=>id==='mummy'?point.x>=9.9&&point.x<=10.7&&point.z===5.2:point.x>=14.4&&point.x<=15.15&&point.z===12.2));
    assert(route.segments[0].distance>=.75);assert(Object.isFrozen(route));
    for(const segment of route.segments){
      for(const state of [{},{unlocked:true},{horrorAccepted:true},open])assert(patrolSegmentSafe(segment.a,segment.b,state));
      for(const other of allRoutes)if(other.id!==`monster:${id}`)for(const lane of other.route.segments){
        const clearance=segmentDistance(segment.a,segment.b,lane.a,lane.b);assert(clearance>=.79,`${id}/${other.id}: ${clearance}`);
      }
    }
  }
});

test('new monsters stay separated from all actors over four minutes including nearby ghost and archive groups',()=>{
  let minimum=Infinity;
  for(let time=0;time<=240;time+=.25){
    const poses=allRoutes.map(actor=>({id:actor.id,...samplePatrolPosition(actor.route,time,{state:open})}));
    for(const id of addedIds){
      const pose=poses.find(actor=>actor.id===`monster:${id}`);assert(patrolPointSafe(pose,open));
      for(const other of poses)if(other.id!==pose.id){const distance=Math.hypot(pose.x-other.x,pose.z-other.z);minimum=Math.min(minimum,distance);assert(distance>=.79,`${id}/${other.id}: ${distance} at ${time}`);}
    }
  }
  assert(minimum<1,'includes the neighboring ghost and archive creator lanes');
});

test('new patrols really travel, pause, and freeze under reduced motion without player tracking',()=>{
  for(const monster of added){
    const route=createActorPatrol(monster,{role:'monster'}),positions=[],walking=new Set();
    for(let time=-10;time<60;time+=.17){
      const pose=monsterPose(monster,time,true,open),next=monsterPose(monster,time+.01,true,open);positions.push(pose.x);walking.add(pose.walking);
      assert(Math.hypot(next.x-pose.x,next.z-pose.z)<=route.speed*.010001);
      assert.deepEqual(pose,monsterPose(monster,time,true,{...open,x:100,z:-100}));
      assert.deepEqual(monsterPose(monster,time,false,open),monsterPose(monster,0,false,open));
    }
    assert(Math.max(...positions)-Math.min(...positions)>=.74);assert.deepEqual([...walking].sort(),[false,true]);
  }
});

test('both new patrol homes have traversable player approach routes in 2D and 3D movement models',()=>{
  for(const movement of [move,moveAroundFurniture])for(const monster of added){
    const start={...initialState(),...open},target=toWorld(monsterPose(monster,0,false,open)),queue=[start],seen=new Set([`${start.x},${start.z}`]);let found=false;
    for(let index=0;index<queue.length&&!found;index++){
      const state=queue[index];if(Math.hypot(state.x-target.x,state.z-target.z)<.51){found=true;break;}
      for(const [dx,dz]of [[.5,0],[-.5,0],[0,.5],[0,-.5]]){const next=movement(state,dx,dz),key=`${next.x},${next.z}`;if(!seen.has(key)){seen.add(key);queue.push(next);}}
    }
    assert(found,monster.id);
  }
});
