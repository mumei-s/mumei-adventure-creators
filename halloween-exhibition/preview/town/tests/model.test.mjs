import test from 'node:test';
import assert from 'node:assert/strict';
import {TOWN_MAPS,TOWN_LAMPS,TOWN_STAMPS,getTownMap,isTownWalkable,mapTargets} from '../story-data.js';
import {initialTownState,restoreTownState,moveTown,nearestTownTarget,interactTown,townJournal,townProgress,townInventory} from '../town-model.js';

test('a walking actor faces accepted travel when a wall rejects the dominant input axis',()=>{
 for(const dz of[-.2,.2]){
  const state={...initialTownState(),position:{x:30.7,z:23.5},facing:'left'},before=structuredClone(state);
  const moved=moveTown(state,.8,dz);
  assert.equal(moved.position.x,state.position.x,'the wall rejects eastward movement');
  assert.ok(Math.abs(moved.position.z-state.position.z)>.19,'the free north/south axis still moves');
  assert.equal(moved.facing,dz<0?'up':'down','the visible walk follows its actual path rather than the blocked axis');
  assert.deepEqual(state,before);
 }
});
import {startTownBattle,townBattleCommand,townBattleTurn,finishTownBattle} from '../battle-model.js';

function visit(state,id,choice){const entry=Object.values(TOWN_MAPS).flatMap(map=>mapTargets(map.id).map(target=>({map,target}))).find(e=>e.target.id===id);assert.ok(entry,`target ${id}`);const near={...state,mapId:entry.map.id,position:{x:entry.target.x,z:entry.target.z}};return interactTown(near,id,choice);}
function action(state,id,choice){return visit(state,id,choice).state;}
function win(state,id){let battle=startTownBattle(state,id);for(let i=0;i<100&&!['victory','defeat'].includes(battle.phase);i++){const command=battle.enemyIntent.id==='wave'?'guard':battle.energy>=2?'spark':battle.playerHp<20&&battle.tonics?'tonic':'attack';battle=townBattleCommand(battle,command);if(battle.phase==='enemy')battle=townBattleTurn(battle);}assert.equal(battle.phase,'victory');return finishTownBattle(state,battle).state;}
function actOne(){let s=initialTownState();for(const [id,choice]of [['keeper','accept'],['baker','bread'],['keeper','deliver'],['waxkeeper','wick'],...TOWN_LAMPS.map(id=>[id]),['keeper']])s=action(s,id,choice);return s;}
function actTwo(route='route-quiet'){let s=actOne();s=action(s,'archivist');for(const color of ['amber','blue','silver'])s=action(s,'gear-console',color);s=win(s,'canal-mist');s=action(s,'moon-pool');s=action(s,'sluice',route);return s;}

test('all story, housing and creator interior maps are rectangular; every target has a reachable interaction position',()=>{
  assert.equal(Object.keys(TOWN_MAPS).length,24);
  for(const map of Object.values(TOWN_MAPS)){
    assert.equal(map.tiles.length,map.height);assert.ok(map.tiles.every(row=>row.length===map.width));
    assert.ok(isTownWalkable(map,map.spawn.x,map.spawn.z),`spawn ${map.id}`);
    const queue=[[Math.floor(map.spawn.x),Math.floor(map.spawn.z)]],visited=new Set(queue.map(p=>p.join(',')));
    for(let i=0;i<queue.length;i++){const[x,z]=queue[i];for(const[dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,key=`${nx},${nz}`;if(!visited.has(key)&&isTownWalkable(map,nx+.5,nz+.5)){visited.add(key);queue.push([nx,nz]);}}}
    for(const target of mapTargets(map.id))assert.ok(queue.some(([x,z])=>Math.hypot(x+.5-target.x,z+.5-target.z)<1.6),`${map.id}/${target.id} unreachable`);
    if(map.id==='lantern-town')assert.ok(visited.size>1800,'substantial connected outdoor area');
    for(const portal of map.portals){assert.ok(TOWN_MAPS[portal.to]);assert.ok(isTownWalkable(portal.to,portal.spawn.x,portal.spawn.z),`arrival ${portal.id}`);}
  }
});
test('collision blocks water/buildings/props, sliding is continuous, and large movement cannot tunnel',()=>{
  const s={...initialTownState(),position:{x:30.5,z:22.5}};const before=structuredClone(s);
  let moved=moveTown(s,10,0);assert.ok(moved.position.x<31);assert.deepEqual(s,before);
  const tree=getTownMap().decorations.find(p=>p.kind==='tree');assert.ok(!isTownWalkable('lantern-town',tree.x,tree.z));
  const along=moveTown({...s,position:{x:30.5,z:23.5}},.2,.4);assert.ok(along.position.z>23.5);assert.ok(along.position.x<31);
  assert.equal(moveTown(s,NaN,0),s);
});
test('interaction requires proximity and the actual map; portal and exit results are explicit',()=>{
  const s=initialTownState();assert.match(interactTown(s,'baker','bread').notice,/近づいて/);assert.equal(s.flags.breadTaken,undefined);
  assert.ok(visit(s,'enter-candle-shop').transition);assert.equal(visit(s,'enter-candle-shop').state.mapId,'candle-shop');
  assert.equal(visit(s,'castle-exit').exit,true);assert.equal(visit(s,'enter-clocktower').state.mapId,'lantern-town');
  const keeper=mapTargets(s.mapId).find(target=>target.id==='keeper');assert.equal(nearestTownTarget({...s,position:{x:keeper.x,z:keeper.z}}).id,'keeper');
});
test('three-act story is playable with finite rewards and a real route and ending choice',()=>{
  let s=actOne();assert.equal(s.flags.act1Complete,true);assert.equal(s.flags.lamps.length,3);assert.equal(s.coins,50);assert.equal(s.inventory.bronzeKey,1);
  const repeat=action(s,'keeper');assert.equal(repeat.coins,s.coins);
  s=action(s,'archivist');assert.equal(s.flags.riverClue,true);
  s=action(s,'gear-console','blue');assert.deepEqual(s.flags.gearNotes,[]);
  for(const color of ['amber','blue','silver'])s=action(s,'gear-console',color);assert.equal(s.inventory.gear,1);
  assert.equal(action(s,'sluice','route-quiet').flags.sluiceRepaired,undefined);
  const battleOffer=visit(s,'moon-pool','mist-battle');assert.equal(battleOffer.battle,'canal-mist');s=win(s,battleOffer.battle);s=action(s,'moon-pool');
  s=action(s,'sluice','route-quiet');assert.equal(s.flags.route,'quiet');assert.equal(s.inventory.gear,undefined);assert.equal(s.inventory.moonwater,undefined);
  assert.equal(visit(s,'enter-clocktower').state.mapId,'clocktower');
  s=win(s,'clock-shadow');s=action(s,'clock-heart');assert.equal(s.flags.clockRestored,true);
  const endingOffer=visit(s,'keeper');assert.equal(endingOffer.dialogue.choices.length,2);
  s=action(s,'keeper','ending-river');assert.equal(s.flags.ending,true);assert.equal(s.flags.endingChoice,'river');
  assert.equal(action(s,'keeper','ending-lanterns').coins,s.coins);assert.equal(townProgress(s).completed,true);
  assert.ok(townJournal(s).slice(0,3).every(q=>q.status==='complete'));
  const restored=restoreTownState(s);assert.equal(restored.flags.ending,true);assert.equal(restored.flags.endingChoice,'river');assert.deepEqual(restored.flags.lamps,s.flags.lamps);assert.deepEqual(townProgress(restored),townProgress(s));
});
test('quiet and bright water choices change final battle aid',()=>{
  const quiet=actTwo('route-quiet'),bright=actTwo('route-bright');
  assert.equal(bright.energy,3);assert.equal(quiet.energy,1);
  assert.ok(startTownBattle(quiet,'clock-shadow').enemy.power<startTownBattle(bright,'clock-shadow').enemy.power);
});
test('side quests, shop and rest rewards are idempotent and preserve main progression',()=>{
  let s=initialTownState();s=action(s,'masked');s=action(s,'cat');assert.equal(s.inventory.ribbon,1);s=action(s,'masked','ribbon');assert.equal(s.coins,36);assert.equal(action(s,'masked','ribbon').coins,36);
  for(const id of TOWN_STAMPS)s=action(s,id);s=action(s,'archivist');assert.equal(s.maxHp,72);assert.equal(s.inventory.starCharm,1);assert.equal(action(s,'archivist').maxHp,72);
  const bought=action(s,'waxkeeper','buy');assert.equal(bought.coins,26);assert.equal(bought.inventory.tonic,3);
  const poor={...bought,coins:0};assert.equal(action(poor,'waxkeeper','buy').inventory.tonic,3);
  const rested=action({...bought,hp:2},'innkeeper','rest');assert.equal(rested.hp,72);assert.equal(rested.checkpoint.mapId,'inn');assert.ok(townInventory(rested).every(item=>item.count>0));
});
test('restore sanitizes invalid coordinates, items, flags and impossible gate/ending progress',()=>{
  const raw={...initialTownState(),mapId:'clocktower',position:{x:Infinity,z:NaN},hp:-200,maxHp:999999,coins:Infinity,inventory:{tonic:100000,evil:1,gear:1},flags:{ending:true,clockVictory:true,starComplete:true,lamps:['lamp-market','bad','lamp-market'],stamps:['bad']}};
  const restored=restoreTownState(raw);assert.equal(restored.mapId,'lantern-town');assert.ok(isTownWalkable(restored.mapId,restored.position.x,restored.position.z));assert.equal(restored.flags.ending,false);assert.equal(restored.maxHp,60);assert.equal(restored.inventory.tonic,99);assert.equal(restored.inventory.evil,undefined);assert.equal(restored.inventory.gear,undefined);assert.deepEqual(restored.flags.lamps,[]);
});
