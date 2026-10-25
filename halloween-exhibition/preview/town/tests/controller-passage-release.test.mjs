import test from 'node:test';
import assert from 'node:assert/strict';
import {createTownSession} from '../controller.js';
import {CREATOR_AREA_ROUTES,getCreatorHome} from '../creator-homes.js';
import {initialTownState,isTownWalkable} from '../town-model.js';

const vector={up:{z:-1},down:{z:1},left:{x:-1},right:{x:1}};
const opposite={up:'down',down:'up',left:'right',right:'left'};
const mako=getCreatorHome('koakumako');

function crossPassage(route,fromQuarter){
 const mapId=fromQuarter?'creator-quarter':'lantern-town',saved=[];
 const position={...(fromQuarter?route.quarterArrival:route.streetArrival)};
 const session=createTownSession({state:{...initialTownState(),mapId,position,coins:83},store:{save(state){saved.push(structuredClone(state));return {ok:true};}}});
 const input=vector[opposite[fromQuarter?route.toQuarterFacing:route.toStreetFacing]];
 for(let n=0;n<150&&session.snapshot().state.mapId===mapId;n++)session.tick(.05,input);
 const arrived=session.snapshot();assert.notEqual(arrived.state.mapId,mapId,route.id);
 for(let n=0;n<10;n++)session.tick(.05,input);
 assert.deepEqual(session.snapshot().state.position,arrived.state.position,'the original held gesture stays blocked');
 assert.equal(saved.length,1,'an arrival saves once without bouncing');
 return {session,saved};
}

function assertFirstGestureMoves(session,input){
 const before=structuredClone(session.snapshot().state);
 // Deliberately supply the next gesture before any idle animation frame.
 // The application can stop its loop for a dialog, blur or hidden page.
 session.tick(0,input);
 for(let n=0;n<8;n++)session.tick(.05,input);
 const after=session.snapshot().state;
 assert.equal(after.mapId,before.mapId);
 assert.ok(Math.hypot(after.position.x-before.position.x,after.position.z-before.position.z)>.1,'the new gesture moves without requiring a second release');
 assert.ok(isTownWalkable(after.mapId,after.position.x,after.position.z));
 for(const key of ['coins','inventory','flags','checkpoint','battleReceipts'])assert.deepEqual(after[key],before[key],key);
}

test('all six passage locks end when explicit input cleanup or pause ends the old gesture',()=>{
 for(const route of CREATOR_AREA_ROUTES)for(const fromQuarter of [false,true])for(const interruption of ['stop','pause']){
  const {session,saved}=crossPassage(route,fromQuarter),input=vector[session.snapshot().state.facing];
  if(interruption==='stop')session.stop();else session.tick(0,{paused:true});
  assertFirstGestureMoves(session,input);assert.equal(saved.length,1,'input cleanup does not create a save');
 }
});

test('all six passage locks cannot follow explicit travel or restored state to Mako or the plaza',()=>{
 for(const route of CREATOR_AREA_ROUTES)for(const fromQuarter of [false,true])for(const destination of ['mako','plaza','replace']){
  const {session,saved}=crossPassage(route,fromQuarter);
  if(destination==='mako')assert.equal(session.visitCreatorHome(mako.creatorId)?.transition,true);
  else if(destination==='plaza')assert.equal(session.visitCreatorQuarter()?.transition,true);
  else session.replace({...session.snapshot().state,mapId:'creator-quarter',position:{x:mako.door.x,z:mako.door.z+.85},facing:'up'});
  assert.equal(saved.length,2,'explicit travel persists its destination once');
  assertFirstGestureMoves(session,destination==='plaza'?vector.up:vector.down);
 }
});

test('return to town clears each pending inbound passage lock before the next gesture',()=>{
 for(const route of CREATOR_AREA_ROUTES){
  const {session,saved}=crossPassage(route,false);
  assert.equal(session.returnToTown()?.transition,true);assert.equal(saved.length,2);
  assertFirstGestureMoves(session,vector.down);
 }
});
