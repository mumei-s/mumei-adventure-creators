import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
import {compileResidents,RESIDENT_STORIES,RESIDENT_FICTION} from '../resident-model.js';
import {ALL_MONSTERS,MONSTERS,REQUIRED_MONSTER_IDS,OPTIONAL_MONSTERS,newBattle,battleTurn,commandFor,BATTLE_ACTIONS,monsterPose,nearestMonster,guidePoint} from '../encounter-model.js';
import {eligibleForEnding} from '../clear-reward.js';
import {creatorPose,buildCreatorActors,layoutProblem,CHARACTER_BUDGET} from '../creator-runtime.js';
import {initialState,blocked} from '../maze-model.js';
import {createActorPatrol,samplePatrolPosition,patrolPointSafe} from '../patrol-model.js';
const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
const manifest=JSON.parse(read('data/residents.json')),residents=compileResidents(manifest),flags={unlocked:true,horrorAccepted:true};
test('two original residents have distinct non-participant identities and validated ready walk assets',()=>{
 assert.equal(residents.length,2);assert(RESIDENT_FICTION.includes('参加者とは別'));assert.equal(new Set(residents.map(n=>n.id)).size,2);
 for(const npc of residents){assert.equal(npc.actorKind,'resident');assert(!npc.creatorId);assert(!ALL_MONSTERS.some(m=>m.id===npc.id));assert(RESIDENT_STORIES[npc.id].topics.length>=2);assert.equal(layoutProblem(npc.asset),null);const bytes=fs.readFileSync(new URL('../'+npc.asset.src,import.meta.url));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),npc.asset.sha256);assert.equal(bytes.length,npc.asset.bytes);}
 const bad=structuredClone(manifest);bad.residents[0].ready=false;assert.equal(compileResidents(bad).length,1);bad.residents[1].source.kind='article-art';assert.equal(compileResidents(bad).length,0);
});
test('residents render moving frames without increasing the shared character cache budget',()=>{
 const assets={get:()=>({width:1024,height:1024})};assert.equal(CHARACTER_BUDGET.active,5);assert.equal(CHARACTER_BUDGET.decodedBytes,32*1024*1024);
 for(const npc of residents){const poses=[];for(let t=0;t<30;t+=.25){const actor=buildCreatorActors([npc],assets,{state:flags,time:t,motion:true})[0];assert(actor?.sprite);assert.equal(actor.actorKind,'resident');assert(patrolPointSafe(actor,flags));poses.push(actor.x+','+actor.z);}
 assert(new Set(poses).size>20);assert.deepEqual(creatorPose(npc,10,false,flags),creatorPose(npc,40,false,flags));}
});
test('witch and masked wanderer are optional and cannot add requirements to existing completion',()=>{
 assert.equal(MONSTERS.length,6);assert.equal(ALL_MONSTERS.length,10);assert.equal(OPTIONAL_MONSTERS.length,4);assert.deepEqual(REQUIRED_MONSTER_IDS,MONSTERS.map(m=>m.id));
 assert.equal(eligibleForEnding({unlocked:true,reachedVault:true,cleared:[...REQUIRED_MONSTER_IDS]},REQUIRED_MONSTER_IDS),true);
 assert.equal(eligibleForEnding({unlocked:true,reachedVault:true,cleared:['witch','masked_wanderer']},REQUIRED_MONSTER_IDS),false);
 assert(read('app.js').includes('eligibleForEnding({unlocked:state.unlocked,cleared,reachedVault},REQUIRED_MONSTER_IDS)'));
});
test('both optional encounters have tactical wins and safe available guide locations',()=>{
 for(const monster of OPTIONAL_MONSTERS){let battle=newBattle(monster.id);for(let i=0;i<20&&battle.status==='playing';i++){const choices=BATTLE_ACTIONS.map(action=>commandFor(battle,action));const choice=choices.find(c=>c.finishing&&!c.disabled)||choices.find(c=>c.recommended&&!c.disabled)||choices.find(c=>c.action==='attack');battle=battleTurn(battle,choice.action);}assert.equal(battle.status,'won',monster.id);assert.equal(battleTurn(battle,'attack'),battle);
 const guide=guidePoint(monster,flags,15,true);assert(!blocked(guide.x*4,guide.z*4,flags));const pose=monsterPose(monster,15,true,flags);assert(Math.hypot(guide.x-pose.x,guide.z-pose.z)<=.71);assert.notEqual(nearestMonster({...flags,x:pose.x*4,z:pose.z*4},[monster.id],{time:15,motion:true})?.id,monster.id);}
});
test('context actions, direct resident picking and 2D/3D monster clocks share actual positions',()=>{
 const app=read('app.js'),world=read('world.js');assert(app.includes("for(const id of ['interact','creator-open','battle-open']){$(id).hidden=id!==buttonId;$(id).disabled=id!==buttonId;}"));assert(app.includes("if(k==='e')performContextAction()"));assert(app.includes('if(residents.some(npc=>npc.id===id))showResident(id)'));assert(world.includes('monsterPose(spirit.definition,seconds,motion'));assert(!read('stage-2d.js').includes('E · 書庫を調べる'));assert(!read('stage-2d.js').includes('B · 話しかける'));
 assert(!app.includes('6体すべての住人'));assert(!app.includes('Bで住人と対戦'));assert(app.includes("['宮殿の住人',showResidents]"));assert(app.includes("['モンスターと遊ぶ'"));
});
