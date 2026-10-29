import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {ALL_MONSTERS,newBattle,battleTurn,commandFor,intentFor,prankFor} from '../encounter-model.js';
import {encounterStory,STORY} from '../story-model.js';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
function harness(){
  const nodes=new Map(),record={saves:0,closed:0,draws:0};
  const element=(tag,textContent,cls)=>{
    const n={tag,textContent,cls,children:[],clientWidth:360,clientHeight:210,classList:{add(){},remove(){},toggle(){}},style:{},dataset:{},setAttribute(){},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},focus(){}};
    Object.defineProperty(n,'id',{get(){return this._id;},set(id){this._id=id;nodes.set(id,n);}});return n;
  };
  const content=element('main'),panel={open:true,classList:{add(){},remove(){}},close(){record.closed++;this.open=false;}};
  const context=vm.createContext({element,content,panel,MONSTERS:ALL_MONSTERS,STORY,encounterStory,newBattle,battleTurn,commandFor,intentFor,prankFor,
    battle:newBattle('nameless_overlord'),battleEffect:null,battleCanvas:null,cleared:['pumpkin'],visualTime:0,motion:true,reducedMotion:{matches:false},
    title(k,n){content.replaceChildren(element('h2',n));},save(){record.saves++;},requiredClearCount(){return 1;},
    $:id=>nodes.get(id),drawBattleVisual(){record.draws++;},battleAnimationBusy(){return false;},battleEffectDuration(){return 1;},
    updateHUD(){},renderOverlordBattle(){},disposeOverlordBattle(){},overlordBattle:null,nativeBattle:null,nativeBattleLoading:false,nativeBattleFailed:false,disposeNativeBattle(){record.disposed=(record.disposed||0)+1;},
  });
  const render=app.slice(app.indexOf('function renderBattle(){'),app.indexOf('\nfunction battleAnimationBusy'));
  const act=app.slice(app.indexOf('function actBattle(action){'),app.indexOf('\n\n\nconst minimapChanges'));
  vm.runInContext(render+'\n'+act,context);return{context,nodes,record};
}
test('boss win saves once, retry resets only this duel, and exit closes the panel',()=>{
  const {context,nodes,record}=harness();
  vm.runInContext("battle={...newBattle('nameless_overlord'),spirit:1};actBattle('attack');renderBattle()",context);
  assert.equal(context.battle.status,'won');assert.equal(record.saves,1);
  assert.deepEqual([...context.cleared],['pumpkin','nameless_overlord']);
  vm.runInContext('renderBattle()',context);assert.equal(record.saves,1);
  nodes.get('battle-retry').onclick();assert.equal(context.battle.status,'playing');assert.equal(context.battle.spirit,30);
  assert.equal(context.battleEffect,null);assert.deepEqual([...context.cleared],['pumpkin','nameless_overlord']);
  vm.runInContext("battle={...battle,status:'rest'};renderBattle()",context);
  nodes.get('battle-exit').onclick();assert.equal(record.closed,1);assert.equal(record.saves,1);
});
test('disabled or terminal boss input cannot advance turn or duplicate rewards',()=>{
  const {context,record}=harness();
  vm.runInContext("battle={...battle,focus:0};actBattle('shine')",context);assert.equal(context.battle.turn,0);
  vm.runInContext("battle={...battle,status:'rest'};actBattle('attack')",context);assert.equal(context.battle.turn,0);assert.equal(record.saves,0);
});
function nativeHarness(){
  let resolve;const loading=new Promise(r=>resolve=r),record={created:0,disposed:0,draws:0,status:{textContent:'玉座の間の立体表示を準備しています…'}};
  const canvas=()=>({clientWidth:360,clientHeight:210,setAttribute(){},replaceWith(next){record.replacement=next;},getContext:()=>({fillRect(){},fillText(){}})});
  const context=vm.createContext({battle:newBattle('nameless_overlord'),battleCanvas:canvas(),battleEffect:null,nativeBattle:null,nativeBattleLoading:false,nativeBattleFailed:false,nativeBattleToken:0,rpgArt:{},renderOverlordBattle2D(){record.fallback=(record.fallback||0)+1;},visualTime:0,motion:true,reducedMotion:{matches:false},$:id=>id==='overlord-render-status'?record.status:null,element:()=>canvas(),drawBattleVisual(){record.draws++;},loadOverlordModule:()=>loading});
  const dispose=app.slice(app.indexOf('function disposeNativeBattle(){'),app.indexOf('\n',app.indexOf('function disposeNativeBattle(){')));
  const native=app.slice(app.indexOf('function drawOverlordBattle(){'),app.indexOf('function actBattle(action){')).replace("import('./overlord-battle-scene.js?v=20261029-overlord2')",'loadOverlordModule()');
  vm.runInContext(dispose+'\n'+native,context);
  const finish=()=>resolve({createOverlordBattleScene(){record.created++;return {render(){},dispose(){record.disposed++;}};}});
  return{context,record,finish};
}
test('late native viewport load cannot reopen a canceled duel or overwrite a newer canvas',async()=>{
  for(const cancel of ['disposeNativeBattle();battle=null','battleCanvas=element()']){
    const {context,record,finish}=nativeHarness();vm.runInContext('drawOverlordBattle();'+cancel,context);finish();await new Promise(r=>setImmediate(r));
    assert.equal(record.created,0);assert.equal(record.draws,0);assert.equal(context.nativeBattle,null);
  }
});
test('native viewport disposal is idempotent and render failure keeps turn state playable',async()=>{
  const {context,record,finish}=nativeHarness();vm.runInContext('drawOverlordBattle()',context);finish();await new Promise(r=>setImmediate(r));
  assert.equal(record.created,1);assert.equal(context.nativeBattleLoading,false);assert.equal(record.status.textContent,'');assert.equal(record.status.hidden,true);
  vm.runInContext('nativeBattle.render=()=>{throw new Error("lost")};drawOverlordBattle()',context);
  assert.equal(record.disposed,1);assert.equal(context.nativeBattleFailed,true);assert(record.replacement);
  assert.equal(context.battle.status,'playing');assert.equal(context.battle.turn,0);
  vm.runInContext('disposeNativeBattle();disposeNativeBattle()',context);assert.equal(record.disposed,1);assert.equal(context.nativeBattleFailed,false);
});

test('actual context target discovers native boss without an atlas and resolves the sealed door',async()=>{
  const {monsterPose,nearestMonster,OVERLORD_BOSS}=await import('../encounter-model.js');
  const {CELL,FEATURES,nearby,toWorld}=await import('../maze-model.js');
  const {resolveContextAction}=await import('../context-action.js');
  const open={unlocked:true,horrorAccepted:true,overlordUnlocked:true};
  const context=vm.createContext({state:{...open,...toWorld(monsterPose(OVERLORD_BOSS,0,false,open))},CELL,FEATURES,nearby,resolveContextAction,MONSTERS:ALL_MONSTERS,monsterPose,nearestMonster,rpgArt:{images:{}},cleared:[],time:0,motion:false,reducedMotion:{matches:false},encounters:true,nearbyCreator:()=>null,nearbyResident:()=>null,nearestFurnishing:()=>null,PALACE_FURNISHINGS:[],EXIT:{x:8,z:14}});
  const ready=app.slice(app.indexOf('function readyMonsters(){'),app.indexOf('function monsterPortrait('));
  const target=app.slice(app.indexOf('function contextTarget(){'),app.indexOf('function performContextAction(){'));
  vm.runInContext(ready+'\n'+target,context);
  const found=vm.runInContext('contextTarget()',context);assert.equal(found.kind,'monster');assert.equal(found.id,OVERLORD_BOSS.id);
  assert(vm.runInContext('readyMonsters().some(m=>m.id==="nameless_overlord")',context));
  context.cleared=[OVERLORD_BOSS.id];assert.equal(vm.runInContext('contextTarget()',context),null);
  context.state={...open,overlordUnlocked:false,...toWorld({x:17,z:3})};
  const seal=vm.runInContext('contextTarget()',context);assert.equal(seal.kind,'feature');assert.equal(seal.id,'overlord-door');
});
