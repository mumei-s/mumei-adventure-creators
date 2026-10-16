import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {MONSTERS,ENCOUNTER_RULES,BATTLE_ACTIONS,newBattle,battleTurn,commandFor,prankFor,intentFor} from '../encounter-model.js';
import {STORY,STORY_MONSTER_IDS,encounterStory,chapterFor} from '../story-model.js';
import {battleLayout,renderBattleScene} from '../battle-scene.js';
import {eligibleForEnding,createRewardStore} from '../clear-reward.js';
function choose(b){const commands=BATTLE_ACTIONS.map(a=>commandFor(b,a));return commands.find(c=>c.finishing&&!c.disabled)||commands.find(c=>c.recommended&&!c.disabled)||commands.find(c=>c.action==='attack');}
function play(id){let b=newBattle(id);const actions=[];for(let i=0;i<30&&b.status==='playing';i++){const c=choose(b);actions.push(c.action);b=battleTurn(b,c.action);}return {battle:b,actions};}
test('all six residents have distinct complete fictional stories and six original memories',()=>{
  assert.deepEqual(MONSTERS.map(m=>m.id),STORY_MONSTER_IDS);
  const memories=new Set(),roles=new Set();
  for(const m of MONSTERS){const s=encounterStory(m.id);for(const key of ['title','role','location','temperament','intro','dialogue','advice','keepsake','memory','victory'])assert(s[key].length>3,`${m.id} ${key}`);for(const a of ['guard','attack','shine','weakness','rest'])assert(s.reactions[a].length>3);memories.add(s.memory);roles.add(s.role);}
  assert.equal(memories.size,6);assert.equal(roles.size,6);assert.equal(encounterStory('not-a-resident'),null);assert.match(STORY.fictionLabel,/フィクション/);assert.equal(STORY.protagonistRole,'宮殿の主');
  assert.equal(STORY.opening.length,3);assert(!JSON.stringify(STORY).includes('creatorId'));
});
test('telegraphs offer a readable repeating pattern without hidden damage or random rolls',()=>{
  for(const m of MONSTERS){const b=newBattle(m.id),rules=ENCOUNTER_RULES[m.id];assert.equal(rules.turns.length,3);assert(new Set(rules.turns.map(x=>x.name)).size===3);for(let i=0;i<9;i++){const p=prankFor({...b,turn:i});assert.equal(p.index,i%3);assert.equal(p.damage,rules.turns[i%3].damage);assert.match(intentFor({...b,turn:i}),new RegExp(`−${p.damage}`));assert(p.hint.length>8);assert(p.stance.length>3);}}
  assert(!fs.readFileSync(new URL('../encounter-model.js',import.meta.url),'utf8').includes('Math.random'));
});
test('every resident can be resolved through visible tactical recommendations in four to seven turns',()=>{
  const sequences=new Set();for(const m of MONSTERS){const {battle:b,actions}=play(m.id);assert.equal(b.status,'won',m.id);assert(b.energy>0);assert.equal(b.spirit,0);assert(actions.length>=4&&actions.length<=7);assert(new Set(actions).size===3,`${m.id} should use all three commands`);assert.equal(b.dialogue,encounterStory(m.id).victory);sequences.add(actions.join(','));}
  assert.equal(sequences.size,6);
});
test('one-button attack spam fails fairly, while light spam cannot bypass the focus resource',()=>{
  for(const m of MONSTERS){let b=newBattle(m.id);for(let t=0;t<25&&b.status==='playing';t++)b=battleTurn(b,'attack');assert.equal(b.status,'rest',m.id);assert.equal(b.energy,0);assert.equal(battleTurn(b,'guard'),b);
    let light=battleTurn(newBattle(m.id),'shine');assert.equal(light.focus,0);assert.equal(commandFor(light,'shine').disabled,true);assert.equal(battleTurn(light,'shine'),light);
  }
});
test('guard fully blocks, focus is capped, and charging never stacks across repeat guards',()=>{
  for(const m of MONSTERS){let b=newBattle(m.id);for(let i=0;i<20;i++){const original=b;b=battleTurn(b,'guard');assert.equal(b.energy,8);assert.equal(b.focus,3);assert.equal(b.charged,true);assert.notEqual(original,b);assert.equal(b.lastAction.blocked,prankFor(original).damage);}
    const prediction=commandFor(b,'attack');const next=battleTurn(b,'attack');assert.equal(next.charged,false);assert.equal(next.lastAction.damage,prediction.damage);assert(next.lastAction.damage<=4);
  }
});
test('action previews match actual damage, resource, and retaliation across reachable states',()=>{
  for(const m of MONSTERS){const queue=[newBattle(m.id)],seen=new Set();for(let i=0;i<queue.length;i++){const b=queue[i],key=[b.energy,b.spirit,b.focus,b.charged,b.turn%3,b.status].join(',');if(seen.has(key))continue;seen.add(key);for(const action of BATTLE_ACTIONS){const before=JSON.stringify(b),p=commandFor(b,action),next=battleTurn(b,action);assert.equal(JSON.stringify(b),before,'immutable input');if(p.disabled){assert.equal(next,b);continue;}assert.equal(b.spirit-next.spirit,p.damage);assert.equal(b.energy-next.energy,p.retaliation> b.energy?b.energy:p.retaliation);assert.equal(next.focus,p.focusAfter);assert(next.energy>=0&&next.energy<=next.maxEnergy);assert(next.spirit>=0&&next.spirit<=next.maxSpirit);assert(next.focus>=0&&next.focus<=next.maxFocus);assert.equal(next.turn,b.turn+1);if(next.status==='playing')queue.push(next);else assert.equal(battleTurn(next,'guard'),next);}}
  }
});
test('win ends retaliation, invalid commands cannot mutate, retries start deterministically',()=>{
  for(const m of MONSTERS){let b={...newBattle(m.id),spirit:1,energy:1,turn:1};const next=battleTurn(b,'attack');assert.equal(next.status,'won');assert.equal(next.energy,1);assert.equal(next.lastAction.retaliation,0);assert.equal(battleTurn(b,'bad-command'),b);assert.equal(commandFor(b,'unknown'),null);assert.deepEqual(newBattle(m.id),newBattle(m.id));}
  assert.throws(()=>newBattle('participant-name'));
});
test('story chapters follow progress without mutating flags or bypassing the key/vault gate',()=>{
  assert.equal(chapterFor().index,1);assert.equal(chapterFor({hasKey:true}).index,2);assert.equal(chapterFor({unlocked:true}).index,3);
  const complete={cleared:[...STORY_MONSTER_IDS],unlocked:true,reachedVault:true};const saved=JSON.stringify(complete);assert.equal(chapterFor(complete).id,'dawn');assert.equal(JSON.stringify(complete),saved);
  assert.equal(chapterFor({...complete,reachedVault:false}).id,'return');assert.equal(chapterFor({...complete,unlocked:false}).id,'return');assert.equal(chapterFor({cleared:['bat','bat','unknown']}).count,1);
});
test('real tactical clears still require the gate and arrival; ending issuance remains idempotent',async()=>{
  const cleared=MONSTERS.filter(m=>play(m.id).battle.status==='won').map(m=>m.id);const state={cleared,unlocked:true,reachedVault:true};assert(eligibleForEnding(state,STORY_MONSTER_IDS));assert(!eligibleForEnding({...state,unlocked:false},STORY_MONSTER_IDS));assert(!eligibleForEnding({...state,reachedVault:false},STORY_MONSTER_IDS));
  const data=new Map(),storage={get length(){return data.size},key:i=>[...data.keys()][i],getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};const store=createRewardStore({storage});const first=await store.issue({id:'story-run',completed:eligibleForEnding(state,STORY_MONSTER_IDS)}),repeat=await store.issue({id:'story-run',completed:true});assert.equal(first.number,repeat.number);assert.equal(first.number,1);
});
function fakeCanvas(w,h){const calls=[],gradient={addColorStop(){}};const c=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get(target,key){return key in target?target[key]:(...a)=>calls.push([key,...a]);},set(target,key,value){target[key]=value;return true;}});return {width:w,height:h,getContext:()=>c,calls};}
test('cinematic layout stays inside small/large canvases and sprites scale with the stage',()=>{
  for(const [w,h]of [[320,275],[390,340],[980,470],[1280,420]])for(const aspect of [.65,.9,1.1]){const l=battleLayout(w,h,{enemyAspect:aspect});assert(l.ex+l.enemySize*aspect*.5<w);assert(l.ex-l.enemySize*aspect*.5>0);assert(l.ey-l.enemySize>35);assert(l.py-l.heroSize>35);assert(l.heroSize>110);}
  assert(battleLayout(980,470).enemySize>300);
});
test('battle rendering has static reduced-motion output and no timers or audio side effects',()=>{
  const art={images:{battle:{width:1200,height:800},playerAtlas:{width:1024,height:1024}}};for(const id of STORY_MONSTER_IDS)art.images[id]={width:768,height:768};
  for(const id of STORY_MONSTER_IDS)for(const status of ['playing','won','rest']){const b={...newBattle(id),status},first=fakeCanvas(780,340),second=fakeCanvas(780,340);renderBattleScene({canvas:first,art,battle:b,time:1,motion:false});renderBattleScene({canvas:second,art,battle:b,time:100,motion:false});assert.deepEqual(first.calls,second.calls);for(const type of BATTLE_ACTIONS)renderBattleScene({canvas:fakeCanvas(390,290),art,battle:b,effect:{type,damage:3,retaliation:1,started:0},time:.8,motion:true});}
  const source=fs.readFileSync(new URL('../battle-scene.js',import.meta.url),'utf8');assert(!/setInterval|AudioContext|requestAnimationFrame/.test(source));
});
