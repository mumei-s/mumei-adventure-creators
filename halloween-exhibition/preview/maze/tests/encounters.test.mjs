import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { MONSTERS, nearestMonster, newBattle, battleTurn, intentFor, monsterPose, guidePoint, commandFor, BATTLE_ACTIONS } from '../encounter-model.js';
import { chooseView, movementVector } from '../view-model.js';
import { initialState, blocked, move, FEATURES, toWorld } from '../maze-model.js';
import { NIGHT_LIGHTING } from '../lighting-model.js';
test('six fictional monsters stand on walkable floor, first is discoverable from entry',()=>{
  assert.equal(MONSTERS.length,6);assert(nearestMonster(initialState()));const pumpkin=MONSTERS.find(m=>m.id==='pumpkin'),p=monsterPose(pumpkin,0,false);assert.equal(nearestMonster({...initialState(),...toWorld(p)}).id,'pumpkin');
  for(const m of MONSTERS)assert(!blocked(m.x*4,m.z*4,{unlocked:true,horrorAccepted:true}));
  assert(!JSON.stringify(MONSTERS).includes('creatorId'));
});
test('cleared characters cannot be farmed; sealed archive creature requires gate',()=>{
  assert.notEqual(nearestMonster(initialState(),['pumpkin'])?.id,'pumpkin');
  const s={...initialState(),...toWorld(FEATURES.vault)};
  assert.equal(nearestMonster(s),null);assert.equal(nearestMonster({...s,unlocked:true}).id,'bat');
});
test('visible tactical commands yield bounded victory and cannot double-complete',()=>{
  const initial=newBattle('pumpkin');let b=initial;
  for(let i=0;i<20&&b.status==='playing';i++){const options=BATTLE_ACTIONS.map(a=>commandFor(b,a));const choice=options.find(c=>c.finishing&&!c.disabled)||options.find(c=>c.recommended&&!c.disabled)||options.find(c=>c.action==='attack');b=battleTurn(b,choice.action);}
  assert.equal(b.status,'won');assert.equal(b.spirit,0);assert(b.energy>0&&b.energy<=b.maxEnergy);
  assert.deepEqual(initial,newBattle('pumpkin'));assert.equal(battleTurn(b,'shine'),b);
});
test('guard blocks damage, charges next light, and never stacks unbounded power',()=>{
  let b=newBattle('ghost');b=battleTurn(b,'guard');b=battleTurn(b,'guard');
  assert.equal(b.energy,8);assert.equal(b.charged,true);assert.equal(b.focus,3);
  const predicted=commandFor(b,'shine');const before=b;b=battleTurn(b,'shine');assert.equal(before.spirit-b.spirit,predicted.damage);assert.equal(b.charged,false);assert.equal(b.energy,8);assert.equal(b.focus,1);
  assert.equal(battleTurn(b,'shine'),b,'insufficient focus must not advance a turn');
});
test('rest and restart are deterministic, invalid actions cannot mutate battle',()=>{
  let b=battleTurn({...newBattle('bat'),energy:1},'shine');assert.equal(b.status,'rest');assert.equal(b.energy,0);
  assert.equal(battleTurn(b,'guard'),b);assert.equal(newBattle('bat').energy,8);
  assert.throws(()=>newBattle('participant'));const fresh=newBattle('ghost');assert.equal(battleTurn(fresh,'unknown'),fresh);
  assert(intentFor(fresh).includes('−1'));assert(intentFor({...fresh,turn:1}).includes('−3'));
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
  assert(source.includes('headlamp.visible=!!lantern&&!wide;nearLamp.visible=!!lantern&&!wide'));
  assert(source.includes('camera.position.set(x,1.65,z)'));assert(!source.includes('camera.position.y='));
});
test('pulled-back exploration uses a traveller light instead of shining the camera beam into a nearby face',()=>{
  const source=fs.readFileSync(new URL('../world.js',import.meta.url),'utf8');
  const lighting=source.slice(source.indexOf('heldLantern.visible='),source.indexOf('for(const spirit of spirits){',source.indexOf('heldLantern.visible=')));
  function sample({wide,lantern,yaw=0}){
    const light=()=>({visible:true,position:{set(x,y,z){Object.assign(this,{x,y,z});}}});
    const context={x:12,z:20,yaw,wide,lantern,heldLantern:light(),headlamp:light(),nearLamp:light(),wideLantern:light()};
    vm.runInNewContext(lighting,context);return context;
  }
  for(const yaw of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
    const wide=sample({wide:true,lantern:true,yaw});
    assert.equal(wide.headlamp.visible,false);assert.equal(wide.nearLamp.visible,false);assert.equal(wide.heldLantern.visible,false);
    assert.equal(wide.wideLantern.visible,true);assert.equal(wide.wideLantern.position.y,.95);
    assert(Math.abs(Math.hypot(wide.wideLantern.position.x-12,wide.wideLantern.position.z-20)-.3)<1e-12,'light stays with the traveller, independently of the raised camera');
  }
  const eye=sample({wide:false,lantern:true});
  assert.equal(eye.headlamp.visible,true);assert.equal(eye.nearLamp.visible,true);assert.equal(eye.heldLantern.visible,true);assert.equal(eye.wideLantern.visible,false);
  for(const wide of [false,true]){
    const off=sample({wide,lantern:false});
    for(const name of ['headlamp','nearLamp','heldLantern','wideLantern'])assert.equal(off[name].visible,false,'OFF turns off '+name);
  }
  assert(source.includes('material.envMap=overlordReflection.texture;material.envMapIntensity=.58'));
  assert(!source.includes('scene.environment=overlordReflection.texture'),'queen reflections do not flood the rest of the palace');
});
test('2D, encounters, exit, and game-only audio remain first-class controls',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  for(const id of ['camera-distance','menu-open','battle-open','lantern'])assert(html.includes(`id="${id}"`));
  assert.equal((html.match(/href="\.\.\/\?mode=halloween"/g)||[]).length,2);
  assert.equal((html.match(/href="\.\.\/\?return=palace"/g)||[]).length,2);
  const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
  assert(app.includes("import {initAdventureAudio} from './adventure-audio.js?v=20261016-ios1'"));
  assert(app.includes("if(view==='3d'){try{world?.render"));assert(app.includes('classifyTown3DFailure(error'));assert(app.includes("stageRenderer.render({canvas:$('fallback')"));
  assert(app.includes("battle=null;battleCanvas=null;battleEffect=null"));assert(app.includes("clearInput();returnFocus?.focus({preventScroll:true})"));
  assert(!app.includes('setInterval'));assert(!app.includes('AudioContext'));
});

test('zombie and vampire have distinct named readable patterns and remain optional',()=>{
  let zombie=newBattle('zombie'),vampire=newBattle('vampire');assert(intentFor(zombie).includes('のんびり足踏み'));assert(intentFor(vampire).includes('マント'));
  zombie=battleTurn(zombie,'shine');vampire=battleTurn(vampire,'shine');assert.equal(zombie.energy,8);assert.equal(vampire.energy,5);
  assert(intentFor(zombie).includes('ステップ'));assert(intentFor(vampire).includes('挨拶'));
  for(const id of ['zombie','vampire']){let b=newBattle(id);for(let t=0;t<20&&b.status==='playing';t++){const commands=BATTLE_ACTIONS.map(a=>commandFor(b,a)),choice=commands.find(c=>c.finishing&&!c.disabled)||commands.find(c=>c.recommended&&!c.disabled)||commands.find(c=>c.action==='attack');b=battleTurn(b,choice.action);}assert.equal(b.status,'won');}
  const corridor={...initialState(),x:8,z:44};assert.equal(nearestMonster(corridor),null);assert.equal(nearestMonster({...corridor,horrorAccepted:true}).id,'vampire');
  assert.equal(nearestMonster({...initialState(),x:25.6,z:52.8}).id,'zombie');
  const world=fs.readFileSync(new URL('../world.js',import.meta.url),'utf8');assert(world.includes("definition.id==='zombie'||definition.id==='vampire'"));assert(world.includes('monsterAvailable(spirit.definition'));
});

test('all six residents have traversable 2D and 3D approach routes after relevant doors open',async()=>{
 const {moveAroundFurniture}=await import('../rpg-model.js');
 for(const movement of [move,moveAroundFurniture])for(const monster of MONSTERS){
  const start={...initialState(),unlocked:true,horrorAccepted:true},queue=[start],seen=new Set([`${start.x},${start.z}`]);let found=false;
  for(let i=0;i<queue.length&&!found;i++){const s=queue[i];if(Math.hypot(s.x-monster.x*4,s.z-monster.z*4)<.51){found=true;break;}
   for(const [dx,dz]of[[.5,0],[-.5,0],[0,.5],[0,-.5]]){const next=movement(s,dx,dz),key=`${next.x},${next.z}`;if(!seen.has(key)){seen.add(key);queue.push(next);}}
  }assert(found,monster.id);
 }
});

test('all six residents roam gently on floor and remain static with reduced motion',()=>{
 const flags={unlocked:true,horrorAccepted:true};for(const m of MONSTERS){const samples=[];for(let t=0;t<=30;t++){const p=monsterPose(m,t,true,flags);assert(!blocked(p.x*4,p.z*4,flags));assert(Math.hypot(p.x-m.x,p.z-m.z)<4);samples.push(JSON.stringify(p));assert.deepEqual(monsterPose(m,t,false,flags),monsterPose(m,0,false,flags));}assert(new Set(samples).size>10);}
});
test('resident guides expose all species while respecting locked doors and consent',()=>{
 for(const m of MONSTERS)for(const state of [{},{unlocked:true,horrorAccepted:true}]){const p=guidePoint(m,state);assert(!blocked(p.x*4,p.z*4,state));assert(p.hint.length);assert.equal(state.hasKey,undefined);}
 assert.equal(guidePoint(MONSTERS.find(m=>m.id==='bat'),{}).z,7.4);assert.equal(guidePoint(MONSTERS.find(m=>m.id==='vampire'),{}).x,5);
});
test('golem telegraphs armor, wind-up and handclap before each legal decision',()=>{
 let b=newBattle('franken');assert(intentFor(b).includes('足踏み'));b=battleTurn(b,'shine');assert(intentFor(b).includes('ぜんまい'));const energy=b.energy;b=battleTurn(b,'attack');assert.equal(b.energy,energy);assert(intentFor(b).includes('手拍子'));b=battleTurn(b,'guard');assert.equal(b.energy,energy);assert.equal(b.charged,true);assert.equal(b.turn,3);
});
test('both modes wire six residents and battles require an explicit second choice',()=>{
 const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8'),world=fs.readFileSync(new URL('../world.js',import.meta.url),'utf8'),html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert(app.includes('let encounters=true'));assert(app.includes("fight.id='encounter-confirm'"));assert(app.includes("leave.id='encounter-leave'"));assert(!html.includes('モンスターに出会ったら'));assert(app.includes("['モンスターと遊ぶ'"));assert(html.includes('id="direction-pad"'));
 assert(world.includes('new THREE.Sprite(spriteMaterial)'));assert(world.includes('ART_FILES[definition.id]'));assert(world.includes("definition.id==='franken'"));assert(world.includes('monsterPose(spirit.definition'));assert(world.includes('heldLantern.scale.setScalar(.24)'));
});
