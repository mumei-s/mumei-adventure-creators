import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {ALL_MONSTERS,OVERLORD_BOSS,newBattle,battleTurn,commandFor,monsterAvailable} from '../encounter-model.js';
import {encounterStory} from '../story-model.js';
import {initialState} from '../maze-model.js';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const encounterSource=app.slice(app.indexOf('function showEncounters(){'),app.indexOf('function renderBattle(){'));
function harness({cleared=[],encounters=false}={}){
 const nodes=new Map(),record={closed:0,opened:0,renders:0,disposed:0,saves:0,nearby:0};
 const element=(tag,textContent,cls)=>{
  const node={tag,textContent,cls,children:[],append(...items){this.children.push(...items);},setAttribute(){},focus(){}};
  Object.defineProperty(node,'id',{get(){return this._id;},set(value){this._id=value;nodes.set(value,this);}});return node;
 };
 const content=element('main'),panel={open:true,close(){record.closed++;this.open=false;}};
 const context=vm.createContext({element,content,panel,OVERLORD_BOSS,encounterStory,newBattle,encounters,cleared:[...cleared],readyMonsters:()=>ALL_MONSTERS,
  state:initialState(),progress:{2026:{visited:['saved-article'],creatorStory:{met:['existing-friend']}}},reachedVault:false,battle:null,battleCanvas:null,battleEffect:null,
  title(kicker,name){content.children=[];content.append(element('h2',name));},monsterPortrait:id=>Object.assign(element('canvas'),{monsterId:id}),
  contextTarget(){record.nearby++;return null;},nearestReadyMonster(){record.nearby++;return null;},
  openPanel(){record.opened++;panel.open=true;},disposeNativeBattle(){record.disposed++;},renderBattle(){record.renders++;},$:id=>nodes.get(id),save(){record.saves++;},
 });
 vm.runInContext(encounterSource,context);
 const snapshot=()=>JSON.stringify({state:context.state,progress:context.progress,cleared:context.cleared,reachedVault:context.reachedVault,encounters:context.encounters});
 return{context,nodes,record,content,panel,snapshot};
}

test('direct meeting and confirmation work from a fresh, locked, monster-hidden adventure without changing progress',()=>{
 const h=harness(),before=h.snapshot();
 assert.equal(Boolean(monsterAvailable(OVERLORD_BOSS,h.context.state)),false);
 vm.runInContext('meetOverlord()',h.context);
 assert.equal(h.context.battle,null,'meeting does not start combat automatically');
 assert.equal(h.snapshot(),before);assert.equal(h.record.nearby,0,'direct entry has no location or availability prerequisite');
 assert.equal(h.record.closed,0,'changing menu content never queues a close event that could cancel the duel');
 const actions=h.content.children.find(n=>n.children.includes(h.nodes.get('encounter-confirm'))),details=h.content.children.find(n=>n.tag==='details');
 assert(actions&&details);assert(h.content.children.indexOf(actions)<h.content.children.indexOf(details),'fight is before optional long story');
 assert.equal(details.open,undefined,'story is not expanded initially');assert.equal(details.children[0].textContent,'物語を読む');
 assert(h.content.children.some(n=>/物語・鍵・封印の進行は不要/.test(n.textContent||'')));
 h.nodes.get('encounter-confirm').onclick();
 assert.equal(h.context.battle.id,OVERLORD_BOSS.id);assert.equal(h.context.battle.status,'playing');assert.equal(h.context.battle.spirit,30);
 assert.equal(h.record.renders,1);assert.equal(h.record.disposed,1);assert.equal(h.record.saves,0);assert.equal(h.snapshot(),before);
});

test('a cleared Overlord remains directly replayable, with a fresh duel and existing marks intact',()=>{
 const h=harness({cleared:['pumpkin',OVERLORD_BOSS.id]}),before=h.snapshot();
 let won=newBattle(OVERLORD_BOSS.id);
 for(let i=0;i<30&&won.status==='playing';i++){
  const action=['shine','guard','attack'].find(a=>{const c=commandFor(won,a);return !c.disabled&&(c.finishing||c.recommended);});
  won=battleTurn(won,action);
 }
 assert.equal(won.status,'won');h.context.battle=won;h.context.battleCanvas={old:true};h.context.battleEffect={old:true};
 vm.runInContext('meetOverlord()',h.context);h.nodes.get('encounter-confirm').onclick();
 assert.equal(h.context.battle.turn,0);assert.equal(h.context.battle.energy,8);assert.equal(h.context.battle.spirit,30);
 assert.equal(h.context.battleCanvas,null);assert.equal(h.context.battleEffect,null);assert.equal(h.snapshot(),before);
});

test('leave and physical encounter routing keep the original progress gates and full story',()=>{
 const h=harness(),before=h.snapshot();
 vm.runInContext('startBattle()',h.context);assert.equal(h.record.opened,0);
 h.context.encounters=true;vm.runInContext('startBattle()',h.context);assert.equal(h.record.opened,0);assert.equal(h.record.nearby,1);
 h.context.contextTarget=()=>({kind:'monster'});h.context.nearestReadyMonster=()=>OVERLORD_BOSS;
 vm.runInContext('startBattle()',h.context);
 assert.equal(h.content.children.some(n=>n.tag==='details'),false,'walking to the encounter retains the full narrative');
 assert(h.content.children.some(n=>n.textContent===encounterStory(OVERLORD_BOSS.id).intro));
 h.nodes.get('encounter-leave').onclick();assert.equal(h.record.closed,1);assert.equal(h.context.battle,null);
 h.context.encounters=false;assert.equal(h.snapshot(),before);assert.equal(h.record.saves,0);
});

const flatten=node=>[node,...node.children.flatMap(flatten)];
test('the monster roster offers the same ungated Overlord meeting while retaining its walking guide',()=>{
 const h=harness(),before=h.snapshot();vm.runInContext('showEncounters()',h.context);
 const direct=h.nodes.get('overlord-roster-direct');assert(direct);assert.equal(direct.textContent,'今すぐ会う・対戦');assert.equal(direct.cls,'primary');
 const card=flatten(h.content).find(n=>n.children.includes(direct));assert(card.children.some(n=>n.textContent==='近くへ案内'),'physical story route remains available');
 assert.equal(flatten(h.content).filter(n=>n.id==='overlord-roster-direct').length,1,'only this boss gets its direct challenge action');
 assert.equal(flatten(h.content).some(n=>/8種/.test(n.textContent||'')),false);
 direct.onclick();assert.equal(h.record.nearby,0);assert.equal(h.record.closed,0);assert.equal(h.snapshot(),before);
 h.nodes.get('encounter-confirm').onclick();assert.equal(h.context.battle.id,OVERLORD_BOSS.id);assert.equal(h.context.battle.status,'playing');assert.equal(h.snapshot(),before);
});
