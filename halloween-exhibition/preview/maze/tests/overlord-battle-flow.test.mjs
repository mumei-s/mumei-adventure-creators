import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {ALL_MONSTERS,newBattle,battleTurn,commandFor,intentFor,prankFor} from '../encounter-model.js';
import {encounterStory,STORY} from '../story-model.js';
import {overlordActionDuration,overlordBattleDirector} from '../overlord-battle-director.js';
import {setChangedProperty,setChangedAttribute} from '../change-only-ui.js';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
function harness(){
  const nodes=new Map(),record={saves:0,closed:0,draws:0};
  const element=(tag,textContent,cls)=>{
    const n={tag,textContent,cls,children:[],clientWidth:360,clientHeight:210,classList:{add(){},remove(){},toggle(){}},style:{},dataset:{},attributes:{},setAttribute(name,value){this.attributes[name]=value;},getAttribute(name){return this.attributes[name]??null;},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},focus(options){record.focus={id:this.id,options};}};
    Object.defineProperty(n,'id',{get(){return this._id;},set(id){this._id=id;nodes.set(id,n);}});return n;
  };
  const content=element('main'),panel={open:true,classList:{add(){},remove(){},toggle(){}},close(){record.closed++;this.open=false;}};
  const context=vm.createContext({element,content,panel,overlordActionDuration,overlordBattleDirector,setChangedProperty,setChangedAttribute,MONSTERS:ALL_MONSTERS,STORY,encounterStory,newBattle,battleTurn,commandFor,intentFor,prankFor,
    battle:newBattle('nameless_overlord'),battleEffect:null,battleCanvas:null,cleared:['pumpkin'],visualTime:0,motion:true,reducedMotion:{matches:false},
    title(k,n,options){record.heading={kicker:k,name:n,options};content.replaceChildren(element('h2',n));},save(){record.saves++;},requiredClearCount(){return 1;},
    $:id=>nodes.get(id),drawBattleVisual(){record.draws++;},battleAnimationBusy(){return false;},battleEffectDuration(){return 1;},
    updateHUD(){},renderOverlordBattle(){},disposeOverlordBattle(){},overlordBattle:null,nativeBattle:null,nativeBattleLoading:false,nativeBattleFailed:false,disposeNativeBattle(){record.disposed=(record.disposed||0)+1;},
  });
  const render=app.slice(app.indexOf('function renderBattle(){'),app.indexOf('\nfunction battleAnimationBusy'));
  const act=app.slice(app.indexOf('function actBattle(action){'),app.indexOf('\n\n\nconst minimapChanges'));
  const controls=app.slice(app.indexOf('function battleAnimationBusy(){'),app.indexOf('function drawBattleVisual(){'));
  vm.runInContext(render+'\n'+controls+'\n'+act,context);return{context,nodes,record,content};
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

const flatten=node=>[node,...(node.children||[]).flatMap(flatten)];
test('native duel keeps the next attack readable while its full explanation stays optional',()=>{
  const {context,nodes,record,content}=harness();vm.runInContext('renderBattle()',context);
  assert.equal(record.heading.name,'無名の覇王 S');assert.match(record.heading.kicker,/666/);assert.equal(record.heading.options.accessibleName,ALL_MONSTERS.find(m=>m.id==='nameless_overlord').name);
  const tree=flatten(content),details=tree.find(n=>n.cls==='battle-details');
  assert.equal(details.open,undefined);assert(details.children.some(n=>n.cls==='battle-intent-detail'&&n.textContent===intentFor(context.battle)));
  assert.match(tree.find(n=>n.cls==='battle-intent').textContent,/次：五振りの紅剣を展開.*勇気 −1/);
  assert.equal(nodes.get('battle-phase').textContent,'TURN 1 · コマンドを選ぶ');assert.equal(nodes.get('battle-skip').hidden,true);
  vm.runInContext("battle=newBattle('pumpkin');renderBattle()",context);
  assert.equal(record.heading.name,'カボチャの番人');assert.equal(record.heading.kicker,'LANTERN DUEL · 時間制限なし');
  assert.equal(flatten(content).some(n=>n.id==='battle-skip'),false);
  assert.equal(flatten(content).find(n=>n.cls==='battle-intent').textContent,intentFor(context.battle));
});
test('skip completes only the animation and returns a usable next decision without a second turn',()=>{
  const {context,nodes,record}=harness();vm.runInContext("renderBattle();actBattle('guard');updateOverlordBattleHUD()",context);
  const turn=context.battle.turn,message=context.battle.message,energy=context.battle.energy,focus=context.battle.focus;
  assert.equal(context.battleEffect.duration,1.65);assert.equal(context.battleEffect.pendingUI,true);
  assert.equal(nodes.get('battle-skip').hidden,false);assert.equal(nodes.get('battle-shine').disabled,true);
  nodes.get('battle-skip').onclick();
  assert.equal(context.battle.turn,turn);assert.equal(context.battle.message,message);assert.equal(context.battle.energy,energy);assert.equal(context.battle.focus,focus);
  assert.equal(context.battleEffect.pendingUI,false);assert.equal(nodes.get('battle-skip').hidden,true);assert.equal(nodes.get('battle-shine').disabled,false);assert.equal(record.heading.options.animate,false);
  assert.equal(record.saves,0);assert.equal(record.focus.id,'battle-guard');assert.equal(record.focus.options.preventScroll,true);
  nodes.get('battle-skip').onclick();assert.equal(context.battle.turn,turn);assert.equal(record.saves,0);
});
test('skipping a finishing blow preserves the one earned reward and exposes retry or exit',()=>{
  const {context,nodes,record}=harness();vm.runInContext("battle={...battle,spirit:1};renderBattle();actBattle('attack');updateOverlordBattleHUD()",context);
  assert.equal(context.battle.status,'won');assert.equal(context.battleEffect.duration,1.4);assert.equal(record.saves,1);
  nodes.get('battle-skip').onclick();
  assert.equal(context.battle.turn,1);assert.equal(record.saves,1);assert.equal(record.focus.id,'battle-exit');
  assert.equal(nodes.get('battle-phase').textContent,'VICTORY · 影をほどいた');assert(nodes.get('battle-retry'));assert(nodes.get('battle-exit'));
});
test('reduced motion resolves the native action promptly and phase refresh avoids same-value DOM writes',()=>{
  const {context,nodes}=harness();let writes=0;
  context.setChangedProperty=(node,name,value)=>{if(node[name]!==value)writes++;return setChangedProperty(node,name,value);};
  context.setChangedAttribute=(node,name,value)=>{if(node.getAttribute(name)!==value)writes++;return setChangedAttribute(node,name,value);};
  vm.runInContext('renderBattle()',context);const first=writes;vm.runInContext('updateOverlordBattleHUD();updateOverlordBattleHUD()',context);assert.equal(writes,first);
  vm.runInContext("motion=false;actBattle('guard');updateOverlordBattleHUD()",context);assert.equal(context.battleEffect.duration,.12);
  vm.runInContext('visualTime=.121;settleBattleAnimation()',context);
  assert.equal(context.battleEffect.pendingUI,false);assert.equal(nodes.get('battle-shine').disabled,false);assert.equal(nodes.get('battle-skip').hidden,true);
});

function nativeHarness(){
  let resolve;const loading=new Promise(r=>resolve=r),record={created:0,disposed:0,draws:0,status:{textContent:'玉座の間の立体表示を準備しています…'}};
  const canvas=()=>({clientWidth:360,clientHeight:210,setAttribute(){},replaceWith(next){record.replacement=next;},getContext:()=>({fillRect(){},fillText(){}})});
  const context=vm.createContext({battle:newBattle('nameless_overlord'),battleCanvas:canvas(),battleEffect:null,nativeBattle:null,nativeBattleLoading:false,nativeBattleFailed:false,nativeBattleToken:0,rpgArt:{},renderOverlordBattle2D(){record.fallback=(record.fallback||0)+1;},visualTime:0,motion:true,reducedMotion:{matches:false},$:id=>id==='overlord-render-status'?record.status:null,element:()=>canvas(),drawBattleVisual(){record.draws++;},loadOverlordModule:()=>loading});
  const dispose=app.slice(app.indexOf('function disposeNativeBattle(){'),app.indexOf('\n',app.indexOf('function disposeNativeBattle(){')));
  const native=app.slice(app.indexOf('function drawOverlordBattle(){'),app.indexOf('function actBattle(action){')).replace("import('./overlord-battle-scene.js?v=20261029-overlord3')",'loadOverlordModule()');
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
