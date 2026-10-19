import test from 'node:test';
import assert from 'node:assert/strict';
import {createTownSession} from '../controller.js';
import {initialTownState,getTownMap,isTownWalkable} from '../town-model.js';
import {CREATOR_HOMES,CREATOR_QUARTER_ID} from '../creator-homes.js';

function recordedSession(state=initialTownState()){
 const saved=[];const session=createTownSession({state,store:{save(next){saved.push(structuredClone(next));return {ok:true};}}});
 return {session,saved};
}

test('every listed house is reachable on a clear south doorstep facing its own facade',()=>{
 for(const home of CREATOR_HOMES){
  const {session,saved}=recordedSession(),result=session.visitCreatorHome(home.creatorId),state=session.snapshot().state;
  assert.equal(result?.transition,true,home.creatorId);assert.equal(result.state,state);assert.match(result.notice,new RegExp(home.creatorName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.equal(state.mapId,CREATOR_QUARTER_ID);assert.equal(state.position.x,home.door.x);assert.ok(state.position.z>home.door.z);
  assert.ok(Math.hypot(state.position.x-home.door.x,state.position.z-home.door.z)<=1.65,'the door is immediately available');
  assert.equal(state.facing,'up');assert.ok(isTownWalkable(state.mapId,state.position.x,state.position.z));
  assert.equal(session.target()?.creatorId,home.creatorId);assert.equal(saved.length,1);assert.deepEqual(saved[0].position,state.position);
 }
});

test('a house visit preserves progress, saves the destination once, and stops prior movement',()=>{
 const state=initialTownState();state.position={x:27,z:13.5};state.flags.intro=true;state.flags.maskStarted=true;state.inventory.tonic=4;state.coins=87;state.hp=31;
 const {session,saved}=recordedSession(state);for(let i=0;i<12;i++)session.tick(1/60,{x:1});assert.equal(session.snapshot().walking,true);
 const before=structuredClone(session.snapshot().state),home=CREATOR_HOMES[2];session.visitCreatorHome(home.creatorId);
 const after=session.snapshot();assert.equal(after.walking,false);assert.equal(after.walkPhase,0);
 for(const key of ['inventory','flags','coins','hp','energy','steps','checkpoint','battleReceipts'])assert.deepEqual(after.state[key],before[key],key);
 assert.deepEqual(state.inventory,{tonic:4});assert.equal(state.mapId,before.mapId,'the provided source state is not modified');
 assert.deepEqual(after.state.visited,[...before.visited,CREATOR_QUARTER_ID]);assert.equal(saved.length,1);
 const destination={...after.state.position};session.tick(1/60,{});assert.deepEqual(session.snapshot().state.position,destination,'old velocity cannot move the arrival');
 session.visitCreatorHome(CREATOR_HOMES[3].creatorId);assert.equal(session.snapshot().state.visited.filter(id=>id===CREATOR_QUARTER_ID).length,1);
});

test('unknown creators and active battles cannot mutate or save the journey',()=>{
 const {session,saved}=recordedSession();let before=session.snapshot();
 for(const id of ['missing-id','',null,undefined]){assert.equal(session.visitCreatorHome(id),null);assert.equal(session.snapshot().state,before.state);assert.equal(session.snapshot().revision,before.revision);}
 assert.equal(saved.length,0);session.beginBattle('canal-mist');before=session.snapshot();
 assert.equal(session.visitCreatorHome(CREATOR_HOMES[0].creatorId),null);assert.equal(session.snapshot().state,before.state);assert.equal(session.snapshot().battle,before.battle);assert.equal(saved.length,0);
});

test('a blocked arrival is rejected before any state or save changes',()=>{
 const {session,saved}=recordedSession(),home=CREATOR_HOMES[0],map=getTownMap(CREATOR_QUARTER_ID),tiles=map.tiles,before=session.snapshot();
 const row=Math.floor(home.door.z+.85),column=Math.floor(home.door.x);map.tiles=tiles.map((line,index)=>index===row?line.slice(0,column)+'#'+line.slice(column+1):line);
 try{assert.equal(session.visitCreatorHome(home.creatorId),null);assert.equal(session.snapshot().state,before.state);assert.equal(session.snapshot().revision,before.revision);assert.equal(saved.length,0);}
 finally{map.tiles=tiles;}
});
