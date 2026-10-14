import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { MONSTERS, nearestMonster, newBattle, battleTurn, intentFor } from '../encounter-model.js';
import { chooseView, movementVector } from '../view-model.js';
import { initialState, blocked, move, FEATURES, toWorld } from '../maze-model.js';
import { NIGHT_LIGHTING } from '../lighting-model.js';
test('three fictional monsters stand on walkable floor, first is discoverable from entry',()=>{
  assert.equal(MONSTERS.length,3);assert.equal(nearestMonster(initialState()).id,'pumpkin');
  for(const m of MONSTERS)assert(!blocked(m.x*4,m.z*4,{unlocked:true,horrorAccepted:true}));
  assert(!JSON.stringify(MONSTERS).includes('creatorId'));
});
test('cleared characters cannot be farmed; sealed archive creature requires gate',()=>{
  assert.equal(nearestMonster(initialState(),['pumpkin']),null);
  const s={...initialState(),...toWorld(FEATURES.vault)};
  assert.equal(nearestMonster(s),null);assert.equal(nearestMonster({...s,unlocked:true}).id,'bat');
});
test('simple three-hit victory is possible, yields bounded stats and cannot double-complete',()=>{
  const initial=newBattle('pumpkin');let b=initial;
  for(let i=0;i<3;i++)b=battleTurn(b,'shine');
  assert.equal(b.status,'won');assert.equal(b.spirit,0);assert.equal(b.energy,1);
  assert.deepEqual(initial,newBattle('pumpkin'));assert.equal(battleTurn(b,'shine'),b);
});
test('guard blocks damage, charges next light, and never stacks unbounded power',()=>{
  let b=newBattle('ghost');b=battleTurn(b,'guard');b=battleTurn(b,'guard');
  assert.equal(b.energy,4);assert.equal(b.charged,true);
  b=battleTurn(b,'shine');assert.equal(b.spirit,1);assert.equal(b.charged,false);assert.equal(b.energy,3);
  assert.equal(battleTurn(b,'shine').status,'won');
});
test('rest and restart are deterministic, invalid actions cannot mutate battle',()=>{
  let b=battleTurn({...newBattle('bat'),energy:1},'shine');assert.equal(b.status,'rest');assert.equal(b.energy,0);
  assert.equal(battleTurn(b,'guard'),b);assert.equal(newBattle('bat').energy,4);
  assert.throws(()=>newBattle('participant'));const fresh=newBattle('ghost');assert.equal(battleTurn(fresh,'unknown'),fresh);
  assert(intentFor(fresh).includes('−1'));assert(intentFor({...fresh,turn:1}).includes('−2'));
});
test('reduced motion defaults to 2D and explicit view choice remains functional',()=>{
  assert.equal(chooseView(null,true),'2d');assert.equal(chooseView(null,false),'3d');
  assert.equal(chooseView('2d',false),'2d');assert.equal(chooseView('3d',true),'3d');assert.equal(chooseView('bad',true),'2d');
});
test('2D arrows move cardinally regardless of camera yaw; 3D remains relative',()=>{
  assert.deepEqual(movementVector('2d',Math.PI/2,1,0,1),{dx:0,dz:-1});
  assert.deepEqual(movementVector('2d',Math.PI,0,1,1),{dx:1,dz:0});
  assert(Math.abs(movementVector('3d',Math.PI/2,1,0,1).dx+1)<1e-10);
  const d=movementVector('2d',0,1,1,1);assert(Math.abs(Math.hypot(d.dx,d.dz)-1)<1e-10);
  const s=initialState(),v=movementVector('2d',0,1,0,1);assert.equal(move(s,v.dx,v.dz).z,s.z-1);
});
test('night baseline is substantially below prior flood lights, lantern is a local source',()=>{
  assert(NIGHT_LIGHTING.ambient<.2);assert(NIGHT_LIGHTING.moon<.2);assert(NIGHT_LIGHTING.beam>50);
  const source=fs.readFileSync(new URL('../world.js',import.meta.url),'utf8');
  assert(source.includes('headlamp.visible=!!lantern;nearLamp.visible=!!lantern'));
  assert(source.includes('camera.position.set(x,1.65,z)'));assert(!source.includes('camera.position.y='));
});
test('2D, encounters, exit, and shared preferences remain first-class controls',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  for(const id of ['view-2d','view-3d','creatures-open','battle-open','lantern'])assert(html.includes(`id="${id}"`));
  assert.equal((html.match(/href="\.\.\/\?mode=halloween"/g)||[]).length,3);
  const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
  assert(app.includes("import { initVisitorPreferences } from '../visitor-preferences.js'"));
  assert(app.includes("if(view==='3d')world?.render"));assert(app.includes("else drawMap($('fallback'),true,true)"));
  assert(app.includes("battle=null;clearInput();returnFocus?.focus()"));
  assert(!app.includes('setInterval'));assert(!app.includes('AudioContext'));
});
