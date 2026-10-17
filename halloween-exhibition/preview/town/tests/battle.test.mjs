import test from 'node:test';
import assert from 'node:assert/strict';
import {initialTownState} from '../town-model.js';
import {startTownBattle,townBattleCommand,townBattleTurn,finishTownBattle} from '../battle-model.js';

test('enemy animation phase rejects repeated commands and enemy resolution is exactly once',()=>{
  const b=startTownBattle(initialTownState(),'canal-mist'),before=structuredClone(b),command=townBattleCommand(b,'attack');
  assert.deepEqual(b,before);assert.equal(command.phase,'enemy');assert.equal(townBattleCommand(command,'attack'),command);
  const turned=townBattleTurn(command);assert.equal(turned.phase,'player');assert.equal(turned.turn,1);assert.equal(townBattleTurn(turned),turned);assert.ok(turned.playerHp<60);
});
test('guard counters a telegraphed wave; magic consumes energy and tonic consumes inventory once',()=>{
  const base=startTownBattle(initialTownState(),'clock-shadow');
  const wave={...base,enemyIntent:{id:'wave',label:'wave'}};
  const unguarded=townBattleTurn(townBattleCommand(wave,'attack'));
  const guarded=townBattleTurn(townBattleCommand(wave,'guard'));assert.ok(guarded.playerDamage<unguarded.playerDamage/2);
  const noEnergy={...base,energy:0};assert.equal(townBattleCommand(noEnergy,'spark').phase,'player');assert.equal(townBattleCommand(noEnergy,'spark').enemyHp,noEnergy.enemyHp);
  const magic=townBattleCommand({...base,energy:3},'spark');assert.equal(magic.energy,1);assert.equal(magic.lastDamage,25);
  const tonic=townBattleCommand({...base,playerHp:10},'tonic');assert.equal(tonic.playerHp,38);assert.equal(tonic.tonics,1);assert.equal(townBattleCommand(tonic,'tonic'),tonic);
});
test('victory rewards have a receipt and an enemy progression flag, so both duplicate paths cannot pay twice',()=>{
  const state=initialTownState();const b={...startTownBattle(state,'canal-mist'),phase:'victory',enemyHp:0};
  const first=finishTownBattle(state,b);assert.equal(first.state.coins,state.coins+14);assert.equal(first.state.flags.gardenVictory,true);
  assert.equal(finishTownBattle(first.state,b).state,first.state);
  const again={...b,id:`${b.id}-again`};assert.equal(finishTownBattle(first.state,again).state.coins,first.state.coins);
});
test('defeat returns to the latest checkpoint and escape preserves story without a victory reward',()=>{
  const state={...initialTownState(),checkpoint:{mapId:'inn',position:{x:9.5,z:12.5}}};
  const b=startTownBattle(state,'canal-mist');const defeat=finishTownBattle(state,{...b,phase:'defeat',playerHp:0});
  assert.equal(defeat.state.mapId,'inn');assert.equal(defeat.state.hp,state.maxHp);assert.equal(defeat.state.flags.gardenVictory,undefined);assert.equal(defeat.state.coins,state.coins);
  const escaped=townBattleCommand(b,'escape');assert.equal(escaped.phase,'escaped');assert.equal(finishTownBattle(state,escaped).state.coins,state.coins);
  assert.equal(finishTownBattle(state,b).state,state);assert.equal(startTownBattle(state,'missing'),null);
});
