import test from 'node:test';
import assert from 'node:assert/strict';
import {createTownSession} from '../controller.js';
import {TOWN_START_MAP,TOWN_LAMPS,TOWN_STAMPS,getTownMap,isTownWalkable,mapTargets} from '../story-data.js';
import {nearestTownTarget,townProgress,townJournal} from '../town-model.js';
import {createTownStore,TOWN_SAVE_KEY} from '../save-model.js';

const memory=()=>{const data=new Map([['halloween-exhibition:labyrinth:v1','preserve-interior'],['halloween-yearbook:theatre-return:v1','preserve-exhibition']]);return {data,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};};
function routeToTarget(state,id){
  const target=mapTargets(state.mapId).find(t=>t.id===id);assert.ok(target,`${id} on ${state.mapId}`);
  const start={x:Math.floor(state.position.x),z:Math.floor(state.position.z)},queue=[start],parent=new Map([[`${start.x},${start.z}`,null]]);let found=null;
  for(let i=0;i<queue.length;i++){
    const p=queue[i],point={x:p.x+.5,z:p.z+.5};
    if(isTownWalkable(state.mapId,point.x,point.z)&&Math.hypot(point.x-target.x,point.z-target.z)<1.55&&nearestTownTarget({...state,position:point})?.id===id){found=p;break;}
    for(const[dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const n={x:p.x+dx,z:p.z+dz},key=`${n.x},${n.z}`;if(!parent.has(key)&&isTownWalkable(state.mapId,n.x+.5,n.z+.5)){parent.set(key,p);queue.push(n);}}
  }
  assert.ok(found,`real input can reach a context position for ${id}`);const path=[];
  for(let p=found;p;p=parent.get(`${p.x},${p.z}`))path.unshift({x:p.x+.5,z:p.z+.5});return path;
}
function walk(session,id){
  const path=routeToTarget(session.snapshot().state,id);
  for(const point of path){
    let arrived=false;
    for(let step=0;step<100;step++){
      const s=session.snapshot().state,dx=point.x-s.position.x,dz=point.z-s.position.z,distance=Math.hypot(dx,dz);
      if(distance<.055){arrived=true;session.stop();break;}
      session.tick(.05,{x:dx/distance,z:dz/distance,speed:Math.min(3,distance*4)});
      assert.ok(isTownWalkable(s.mapId,session.snapshot().state.position.x,session.snapshot().state.position.z),`swept collision on path to ${id}`);
    }
    assert.ok(arrived,`controller reached waypoint ${point.x},${point.z} for ${id}`);
  }
  assert.equal(session.target()?.id,id,`visible context action selects ${id}`);
}
function interact(session,id,choice){walk(session,id);const result=session.interact(undefined,choice);assert.ok(result,`${id} can interact through controller context`);return result;}
function resolveEffects(session){for(let i=0;i<100&&session.battleBusy();i++)session.tick(.05,{motion:false});assert.equal(session.battleBusy(),false);}
function battle(session,enemyId,{reloadOnVictory=false,store}={}){
  assert.equal(session.snapshot().battle,null);session.beginBattle(enemyId);
  for(let turn=0;turn<35;turn++){
    const b=session.snapshot().battle;
    if(['victory','defeat','escaped'].includes(b.phase))break;
    const command=b.enemyIntent.id==='wave'?'guard':b.playerHp<23&&b.tonics?'tonic':b.energy>=2?'spark':'attack';
    assert.equal(session.interact('keeper','accept'),null,'walking choices cannot bypass active battle');
    assert.equal(session.actBattle(command,{motion:false}),true);
    assert.equal(session.actBattle(command,{motion:false}),false,'held/repeated command cannot double advance');
    if(session.snapshot().battle.phase==='victory')break;
    resolveEffects(session);
  }
  const victory=session.snapshot();assert.equal(victory.battle.phase,'victory');assert.equal(victory.effect.pending,true,'victory is persisted while the final effect is visible');
  const coins=victory.state.coins,receipt=JSON.parse(store.readRaw()).state.battleReceipts;
  assert.equal(receipt.length,victory.state.battleReceipts.length);
  if(reloadOnVictory){const fresh=createTownSession({store});assert.equal(fresh.snapshot().battle,null);assert.equal(fresh.snapshot().state.coins,coins);session.leaveBattle();assert.equal(session.snapshot().state.coins,coins);return fresh;}
  resolveEffects(session);session.leaveBattle();session.leaveBattle();assert.equal(session.snapshot().state.coins,coins);return session;
}

for(const [route,ending]of [['route-quiet','ending-river'],['route-bright','ending-lanterns']])test(`actual controller walks all districts, doors and the complete story: ${route}, ${ending}`,()=>{
  const storage=memory(),store=createTownStore(storage);let session=createTownSession({store});
  interact(session,'keeper','accept');interact(session,'baker','bread');interact(session,'keeper','deliver');
  assert.equal(interact(session,'enter-candle-shop').state.mapId,'candle-shop');interact(session,'waxkeeper','wick');interact(session,'leave-candle-shop');
  for(const id of TOWN_LAMPS)interact(session,id);
  interact(session,'keeper');assert.equal(townProgress(session.snapshot().state).act,2);
  const firstActCoins=session.snapshot().state.coins;interact(session,'keeper');assert.equal(session.snapshot().state.coins,firstActCoins);
  // Save, reload and entrance round-trips exercise the same data the UI uses.
  session.save();session=createTownSession({store});
  interact(session,'enter-library');interact(session,'archivist');interact(session,'leave-library');
  interact(session,'enter-workshop');interact(session,'gear-console','blue');assert.deepEqual(session.snapshot().state.flags.gearNotes,[]);
  for(const color of ['amber','blue','silver'])interact(session,'gear-console',color);
  interact(session,'leave-workshop');
  const mist=interact(session,'moon-pool','mist-battle');assert.equal(mist.battle,'canal-mist');session=battle(session,mist.battle,{store,reloadOnVictory:true});
  interact(session,'moon-pool');interact(session,'sluice',route);assert.equal(townProgress(session.snapshot().state).act,3);
  session.save();session=createTownSession({store});assert.equal(session.snapshot().state.flags.route,route==='route-quiet'?'quiet':'bright');
  interact(session,'enter-clocktower');const shadow=interact(session,'clock-heart','clock-battle');assert.equal(shadow.battle,'clock-shadow');session=battle(session,shadow.battle,{store});
  interact(session,'clock-heart');interact(session,'leave-clocktower');const choices=interact(session,'keeper');assert.equal(choices.dialogue.choices.length,2);interact(session,'keeper',ending);
  assert.equal(townProgress(session.snapshot().state).completed,true);assert.equal(session.snapshot().state.coins,110);assert.equal(session.snapshot().state.battleReceipts.length,2);assert.ok(session.snapshot().state.steps>180,'the journey actually walked the map');
  session=createTownSession({store});assert.equal(townProgress(session.snapshot().state).completed,true);assert.ok(townJournal(session.snapshot().state).slice(0,3).every(q=>q.status==='complete'));
  const coins=session.snapshot().state.coins;interact(session,'keeper',ending);assert.equal(session.snapshot().state.coins,coins,'reloaded ending cannot pay twice');
  assert.equal(interact(session,'castle-exit').exit,true);assert.equal(storage.getItem('halloween-exhibition:labyrinth:v1'),'preserve-interior');assert.equal(storage.getItem('halloween-yearbook:theatre-return:v1'),'preserve-exhibition');assert.ok(storage.data.has(TOWN_SAVE_KEY));
});

test('optional quests can be explored independently and the inn round-trip preserves the new checkpoint',()=>{
  const storage=memory(),store=createTownStore(storage),session=createTownSession({store});
  interact(session,'masked');interact(session,'cat');interact(session,'masked','ribbon');
  for(const id of TOWN_STAMPS)interact(session,id);
  interact(session,'enter-library');interact(session,'archivist');assert.equal(session.snapshot().state.maxHp,72);interact(session,'leave-library');
  interact(session,'enter-inn');interact(session,'innkeeper','rest');assert.equal(session.snapshot().state.checkpoint.mapId,'inn');interact(session,'leave-inn');
  const reloaded=createTownSession({store});assert.equal(reloaded.snapshot().state.mapId,TOWN_START_MAP);assert.equal(reloaded.snapshot().state.checkpoint.mapId,'inn');assert.equal(reloaded.snapshot().state.flags.maskComplete,true);assert.equal(reloaded.snapshot().state.flags.starComplete,true);assert.equal(reloaded.snapshot().state.maxHp,72);
});
