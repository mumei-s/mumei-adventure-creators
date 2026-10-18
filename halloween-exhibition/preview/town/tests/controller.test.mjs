import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createTownSession} from '../controller.js';
import {initialTownState,townProgress} from '../town-model.js';
import {createTownStore,TOWN_SAVE_KEY,exportTownState,importTownState} from '../save-model.js';
const memory=()=>{const values=new Map();return {values,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};};
function clearFrame(session,motion=true){for(let index=0;index<100&&session.battleBusy();index++)session.tick(.05,{motion});assert.equal(session.battleBusy(),false);}
test('controller consumes actual movement for gait and stops on modal or lifecycle interruption',()=>{
 const state=initialTownState();state.position={x:27,z:13.5};const session=createTownSession({state});for(let i=0;i<40;i++)session.tick(1/60,{x:1});const moved=session.snapshot();assert(moved.state.position.x>state.position.x);assert(moved.walkPhase>0);assert(moved.walking);
 session.stop();const point={...moved.state.position};for(let i=0;i<30;i++)session.tick(1/60,{paused:true});assert.deepEqual(session.snapshot().state.position,point);assert.equal(session.snapshot().walking,false);
 session.tick(1/60,{});assert.deepEqual(session.snapshot().state.position,point);
});
test('an action owns its effect and telegraphed enemy turn; reduced motion cannot leave it locked',()=>{
 const session=createTownSession();session.beginBattle('canal-mist');assert(session.actBattle('attack'));const turn=session.snapshot().battle.turn;
 for(let i=0;i<10;i++)assert.equal(session.actBattle('attack'),false);assert.equal(session.snapshot().battle.turn,turn);
 clearFrame(session,false);assert.equal(session.snapshot().battle.phase,'player');assert.equal(session.snapshot().battle.turn,turn+1);assert(session.actBattle('guard',{motion:false}));clearFrame(session,false);assert.equal(session.snapshot().battle.turn,turn+2);
});
test('victory commits before animation ends and leaving cannot duplicate coins or its receipt',()=>{
 const storage=memory(),store=createTownStore(storage),state=initialTownState();Object.assign(state.flags,{intro:true,breadTaken:true,breadDelivered:true,wickTaken:true,act1Complete:true,lamps:['lamp-market','lamp-plaza','lamp-garden']});const session=createTownSession({store,state});session.beginBattle('canal-mist');
 for(let count=0;count<20&&session.snapshot().battle.phase!=='victory';count++){const battle=session.snapshot().battle;session.actBattle(battle.energy>=2?'spark':'attack',{motion:false});if(session.snapshot().battle.phase!=='victory')clearFrame(session,false);}
 const before=session.snapshot();assert.equal(before.battle.phase,'victory');assert.equal(before.state.flags.gardenVictory,true);assert(before.effect.pending);assert.equal(before.state.battleReceipts.length,1);
 const coins=before.state.coins;session.leaveBattle();session.leaveBattle();assert.equal(session.snapshot().state.coins,coins);assert.equal(store.load().state.flags.gardenVictory,true);assert.equal(store.load().state.battleReceipts.length,1);
});
test('quest choices, export/import and reload stay inside the new town namespace',()=>{
 const storage=memory();storage.setItem('halloween-exhibition:labyrinth:v1','original-labyrinth');storage.setItem('halloween-yearbook:theatre-return:v1','original-theatre');const store=createTownStore(storage),state=initialTownState();state.position={x:15.5,z:9.6};const session=createTownSession({store,state});
 const result=session.interact('keeper','accept');assert.equal(result.state.flags.intro,true);assert.equal(store.load().state.flags.intro,true);const exported=exportTownState(session.snapshot().state),imported=importTownState(exported);assert.equal(imported.ok,true);assert.equal(townProgress(imported.state).act,1);
 assert.equal(store.replace(imported.state).ok,true);session.replace(imported.state);assert.equal(storage.getItem('halloween-exhibition:labyrinth:v1'),'original-labyrinth');assert.equal(storage.getItem('halloween-yearbook:theatre-return:v1'),'original-theatre');assert(storage.values.has(TOWN_SAVE_KEY));
});
test('failed storage and corrupt saves remain playable and preserve the original payload',()=>{
 const storage=memory();storage.setItem(TOWN_SAVE_KEY,'{unreadable');const store=createTownStore(storage),session=createTownSession({store});assert.equal(session.save().ok,false);assert.equal(storage.getItem(TOWN_SAVE_KEY),'{unreadable');
 assert(session.beginBattle('canal-mist'));session.leaveBattle();assert.equal(storage.getItem(TOWN_SAVE_KEY),'{unreadable');const denied=createTownStore({getItem(){throw Error('denied')},setItem(){throw Error('denied')}});const temporary=createTownSession({store:denied});assert.equal(temporary.save().ok,false);assert(temporary.snapshot().state.position);
});
test('UI exposes actual settings, isolated save review, visible exits and a focus-safe battle layout',()=>{
 const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8'),html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8'),css=fs.readFileSync(new URL('../style.css',import.meta.url),'utf8');
 for(const label of ['旅の手帳','持ち物','街の地図','明るさ・音・表示','記録・バックアップ','キャラ見比べ'])assert(app.includes(label));for(const key of ['auto','phone','tablet','desktop'])assert(app.includes("'"+key+"'"));
 assert(html.includes('href="../?return=palace"'));assert(html.includes('width=device-width,initial-scale=1,viewport-fit=cover'));assert(!html.includes('user-scalable=no'));assert(html.includes('id="loading-retry"'));assert(app.includes('store.replace(next)'));assert(app.includes('確認した記録を復元する'));assert(app.includes('focus({preventScroll:true})'));
 assert(css.includes('.town-battle-log{min-height:0;overflow:auto'));assert(css.includes('.town-battle-controls{display:grid'));assert(css.includes('min-height:44px'));assert(css.includes('repeat(var(--menu-columns),minmax(0,1fr))'));assert(!app.includes('serviceWorker.register'));
 for(const id of ['town-view-2d','town-view-3d','town-mode-banner','town-mode-message','town-mode-retry'])assert(html.includes(`id="${id}"`));
 assert.match(html,/id="town-mode-message"[^>]*role="status"/);assert.match(app,/\$\('town-view-2d'\)\.onclick=.*chooseTownView\('2d'\)/);assert.match(app,/\$\('town-view-3d'\)\.onclick=.*chooseTownView\('3d'\)/);assert.match(app,/\$\('town-mode-retry'\)\.onclick=.*chooseTownView\('3d',\{retry:true\}\)/);assert(app.includes('state.failureReason'));
});
