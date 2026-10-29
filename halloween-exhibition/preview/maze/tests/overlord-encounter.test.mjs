import test from 'node:test';
import assert from 'node:assert/strict';
import {ALL_MONSTERS,OVERLORD_BOSS,REQUIRED_MONSTER_IDS,ENCOUNTER_RULES,BATTLE_ACTIONS,newBattle,battleTurn,commandFor,prankFor,monsterAvailable} from '../encounter-model.js';
import {OVERLORD_STORY,STORY_MONSTER_IDS,encounterStory,chapterFor} from '../story-model.js';
import {eligibleForEnding} from '../clear-reward.js';
const id='nameless_overlord';
const choose=b=>BATTLE_ACTIONS.map(a=>commandFor(b,a)).find(c=>!c.disabled&&(c.finishing||c.recommended)).action;
const play=()=>{let b=newBattle(id);const actions=[];while(b.status==='playing'&&b.turn<30){const a=choose(b);actions.push(a);b=battleTurn(b,a);}return {b,actions};};

test('native boss is an independent optional identity, not a participant or seventh required clear',()=>{
  assert.equal(ALL_MONSTERS.filter(m=>m.id===id).length,1);
  assert.equal(OVERLORD_BOSS.nativeModel,true);assert.equal(OVERLORD_BOSS.optional,true);
  assert.equal(OVERLORD_BOSS.name,'無名から頂点へ至る覇王 S');
  assert.equal(OVERLORD_BOSS.signatureSkill,'無名神話・覇天絶滅斬');
  assert(!OVERLORD_BOSS.creatorId);assert(Object.isFrozen(OVERLORD_BOSS));
  assert.equal(REQUIRED_MONSTER_IDS.length,6);assert.deepEqual(REQUIRED_MONSTER_IDS,STORY_MONSTER_IDS);
  const complete={cleared:[...REQUIRED_MONSTER_IDS],unlocked:true,reachedVault:true};
  assert(eligibleForEnding(complete,REQUIRED_MONSTER_IDS));
  assert.deepEqual(chapterFor(complete),chapterFor({...complete,cleared:[...complete.cleared,id,id]}));
  assert(!eligibleForEnding({...complete,cleared:[id,...complete.cleared.slice(1)]},REQUIRED_MONSTER_IDS));
});

test('Halloween trial tells sealed-door, throne, standing, and return-to-stories sequence',()=>{
  assert.equal(encounterStory(id),OVERLORD_STORY);
  for(const field of ['intro','dialogue','advice','keepsake','memory','victory','gate','throne','departure','epilogue'])assert(OVERLORD_STORY[field].length>5,field);
  assert.match(OVERLORD_STORY.intro,/ハロウィーン/);assert.match(OVERLORD_STORY.gate,/封印扉/);
  assert.match(OVERLORD_STORY.throne,/玉座から立ち上がる/);
  assert.match(OVERLORD_STORY.departure,/作者/);assert.match(OVERLORD_STORY.epilogue,/物語/);
  assert.match(OVERLORD_STORY.advice,/設定上/);assert.equal(newBattle(id).maxSpirit,30);
  assert.equal(OVERLORD_BOSS.titleHP,999999);assert.equal(OVERLORD_BOSS.titleLevel,999);
});

test('signature strike is fully telegraphed and fully blockable without a timer',()=>{
  const start={...newBattle(id),turn:1},intent=prankFor(start);
  assert.equal(intent.name,OVERLORD_BOSS.signatureSkill);assert.match(intent.hint,/守/);
  const guarded=battleTurn(start,'guard');assert.equal(guarded.energy,start.energy);
  assert.equal(guarded.lastAction.blocked,intent.damage);assert(guarded.charged);
  assert.equal(ENCOUNTER_RULES[id].turns.length,4);
});

test('readable recommendations win deterministically; rest, terminal state and retry remain safe',()=>{
  const first=play();assert.deepEqual(first,play());assert.equal(first.b.status,'won');
  assert(first.b.energy>0);assert.equal(first.b.spirit,0);assert(first.actions.length<=16);
  assert.equal(new Set(first.actions).size,3);assert.equal(battleTurn(first.b,'attack'),first.b);
  let failed=newBattle(id);while(failed.status==='playing'&&failed.turn<30)failed=battleTurn(failed,'attack');
  assert.equal(failed.status,'rest');assert.equal(battleTurn(failed,'guard'),failed);
  const retry=newBattle(id);assert.equal(retry.status,'playing');assert.equal(retry.energy,8);assert.equal(retry.spirit,30);
  assert.deepEqual(retry,newBattle(id));assert.equal(battleTurn(retry,'unknown'),retry);
});

test('every reachable boss action matches preview, preserves input, and respects resource bounds',()=>{
  const queue=[newBattle(id)],seen=new Set();
  for(let i=0;i<queue.length;i++){
    const b=queue[i],key=[b.energy,b.spirit,b.focus,b.charged,b.turn%4,b.status].join(',');
    if(seen.has(key))continue;seen.add(key);
    for(const a of BATTLE_ACTIONS){
      const before=JSON.stringify(b),preview=commandFor(b,a),next=battleTurn(b,a);
      assert.equal(JSON.stringify(b),before);
      if(preview.disabled){assert.equal(next,b);continue;}
      assert.equal(b.spirit-next.spirit,preview.damage);assert.equal(b.energy-next.energy,Math.min(b.energy,preview.retaliation));
      assert.equal(next.focus,preview.focusAfter);assert(next.energy>=0&&next.energy<=8);assert(next.focus>=0&&next.focus<=3);
      if(next.status==='playing')queue.push(next);else assert.equal(battleTurn(next,'guard'),next);
    }
  }
  assert(seen.size>100);
});

test('seal and archive gates cannot be bypassed by encounter availability or guide travel',async()=>{
  const {guidePoint,monsterPose,nearestMonster}=await import('../encounter-model.js');
  const {toWorld}=await import('../maze-model.js');
  assert.equal(Boolean(monsterAvailable(OVERLORD_BOSS,{})),false);
  assert.equal(Boolean(monsterAvailable(OVERLORD_BOSS,{unlocked:true})),false);
  const open={unlocked:true,overlordUnlocked:true,horrorAccepted:true};
  assert.equal(Boolean(monsterAvailable(OVERLORD_BOSS,open)),true);
  assert.equal(guidePoint(OVERLORD_BOSS,{}).z,7.4);
  const sealGuide=guidePoint(OVERLORD_BOSS,{unlocked:true});assert.equal(sealGuide.x,17);assert.match(sealGuide.hint,/666/);
  const p=monsterPose(OVERLORD_BOSS,0,false,open),state={...open,...toWorld(p)};
  assert.equal(nearestMonster(state)?.id,id);assert.notEqual(nearestMonster(state,[id])?.id,id);
  assert.notEqual(nearestMonster({...state,overlordUnlocked:false})?.id,id);
});

test('dedicated-room patrol walks safely, pauses, and freezes under reduced motion',async()=>{
  const {createActorPatrol,samplePatrolPosition,patrolPointSafe,patrolSegmentSafe}=await import('../patrol-model.js');
  const route=createActorPatrol(OVERLORD_BOSS,{role:'monster'}),open={unlocked:true,overlordUnlocked:true,horrorAccepted:true};
  assert(route.points.every(p=>p.x>18));
  for(const segment of route.segments)assert(patrolSegmentSafe(segment.a,segment.b,open));
  let walking=false,paused=false,minZ=Infinity,maxZ=-Infinity;
  for(let t=0;t<=60;t+=.1){const p=samplePatrolPosition(route,t,{state:open});assert(patrolPointSafe(p,open));walking ||= p.walking;paused ||= !p.walking;minZ=Math.min(minZ,p.z);maxZ=Math.max(maxZ,p.z);}
  assert(walking&&paused);assert(maxZ-minZ>1);
  assert.deepEqual(samplePatrolPosition(route,0,{state:open,motion:false}),samplePatrolPosition(route,100,{state:open,motion:false}));
});
