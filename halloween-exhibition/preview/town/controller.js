import {initialTownState,moveTown,nearestTownTarget,interactTown,isTownWalkable,getTownMap} from './town-model.js?v=20261019-homes2';
import {getCreatorHome,CREATOR_QUARTER_ID,CREATOR_QUARTER_CONNECTION} from './creator-homes.js?v=20261019-homes2';
import {startTownBattle,townBattleCommand,townBattleTurn,finishTownBattle} from './battle-model.js?v=20261019-homes2';
import {integrateVelocity,locomotionPhase} from '../maze/movement-runtime.js?v=20261017-review1';
const terminal=phase=>['victory','defeat','escaped'].includes(phase);
/** The town owns its state and receipts. It never reads labyrinth progress. */
export function createTownSession({store,state:provided,onChange=()=>{},onNotice=()=>{}}={}){
 const loaded=provided?{state:provided}:store?.load?.()||{state:initialTownState()};
 let state=loaded.state||initialTownState(),battle=null,effect=null,lastOutcome=null,velocity={x:0,z:0},distance=0,time=0,saveAge=0,revision=0,walking=false;
 const publish=()=>{revision++;onChange(snapshot());};
 function snapshot(){return {state,battle,effect,time,walking,walkPhase:locomotionPhase(distance,1.15),revision,notice:loaded.notice||''};}
 function save(){const result=store?.save?.(state)||{ok:false,notice:'この画面の記録は保存できません。'};onChange({...snapshot(),save:result});return result;}
 function stop(){velocity={x:0,z:0};walking=false;}
 function replace(next){state=next;stop();battle=null;effect=null;lastOutcome=null;distance=0;save();publish();}
 function visitCreatorHome(creatorId){
  if(battle)return null;const home=getCreatorHome(creatorId);if(!home)return null;
  // South-facing doors remain within interaction distance, with enough room
  // to see the facade and to walk away without crossing a building footprint.
  const position={x:home.door.x,z:home.door.z+.85};
  if(!isTownWalkable(CREATOR_QUARTER_ID,position.x,position.z))return null;
  const next={...state,mapId:CREATOR_QUARTER_ID,position,facing:'up',visited:[...new Set([...state.visited,CREATOR_QUARTER_ID])],updatedAt:Date.now()};
  replace(next);return {transition:true,state,notice:home.creatorName+'の家に着きました。玄関で「家の中へ入る」を選べます。'};
 }
 function returnToTown(){
  if(battle||(state.mapId!==CREATOR_QUARTER_ID&&!getTownMap(state.mapId).creatorHome))return null;
  const position={...CREATOR_QUARTER_CONNECTION.streetArrival};
  if(!isTownWalkable('lantern-town',position.x,position.z))return null;
  replace({...state,mapId:'lantern-town',position,facing:'down',visited:[...new Set([...state.visited,'lantern-town'])],updatedAt:Date.now()});
  return {transition:true,state,notice:'星灯りの町へ戻りました。家と作品の記録はそのままです。'};
 }
 function interact(targetId,choiceId){
  if(battle)return null;const target=targetId||nearestTownTarget(state)?.id;if(!target)return null;
  const result=interactTown(state,target,choiceId);if(result.state)state=result.state;stop();if(result.state){save();}if(result.notice)onNotice(result.notice);publish();return result;
 }
 function beginBattle(enemyId){if(battle)return battle;battle=startTownBattle(state,enemyId);effect=null;lastOutcome=null;stop();publish();return battle;}
 function commitBattle(){if(!battle||!terminal(battle.phase)||lastOutcome)return;lastOutcome=finishTownBattle(state,battle);state=lastOutcome.state;save();if(lastOutcome.notice)onNotice(lastOutcome.notice);}
 function battleBusy(){return !!effect?.pending;}
 function actBattle(action,{motion=true}={}){
  if(!battle||battle.phase!=='player'||battleBusy())return false;
  const next=townBattleCommand(battle,action);if(next===battle)return false;battle=next;
  if(battle.phase==='player'){onNotice(battle.message);publish();return false;}
  effect={type:action,started:time,duration:motion?(action==='spark'?1.6:.65):.18,pending:true};commitBattle();publish();return true;
 }
 function advanceBattle(motion){
  if(!battle||!effect?.pending)return;
  const duration=motion?effect.duration:Math.min(effect.duration,.18);if(time<effect.started+duration)return;
  effect.pending=false;
  if(battle.phase==='enemy'){battle=townBattleTurn(battle);effect={type:'enemy',started:time,duration:motion ? .55 : .18,pending:true};commitBattle();}
  publish();
 }
 function leaveBattle(){
  if(!battle)return null;if(!terminal(battle.phase))battle={...battle,phase:'escaped',message:'灯りを手元に戻し、街の道へ退いた。'};commitBattle();
  const outcome=lastOutcome;battle=null;effect=null;lastOutcome=null;stop();publish();return outcome;
 }
 function tick(dt,{x=0,z=0,paused=false,motion=true,speed=3.05}={}){
  const step=Math.max(0,Math.min(.05,Number.isFinite(dt)?dt:0));time+=step;
  if(battle){advanceBattle(motion);walking=false;return snapshot();}
  if(paused){stop();return snapshot();}
  const magnitude=Math.hypot(x,z),scale=magnitude>1?1/magnitude:1;
  const integrated=integrateVelocity(velocity,{x:x*scale*speed,z:z*scale*speed},step);
  const previous=state;state=moveTown(state,integrated.dx,integrated.dz);const dx=state.position.x-previous.position.x,dz=state.position.z-previous.position.z;
  velocity={x:Math.abs(dx-integrated.dx)>.000001?0:integrated.x,z:Math.abs(dz-integrated.dz)>.000001?0:integrated.z};
  const travelled=Math.hypot(dx,dz);walking=travelled>.00001;distance+=travelled;saveAge+=step;
  if(walking&&saveAge>=3){saveAge=0;save();}return snapshot();
 }
 return {snapshot,save,stop,replace,visitCreatorHome,returnToTown,interact,beginBattle,actBattle,battleBusy,leaveBattle,tick,target:()=>nearestTownTarget(state)};
}
