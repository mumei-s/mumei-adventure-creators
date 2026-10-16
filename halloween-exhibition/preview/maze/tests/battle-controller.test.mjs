// Real battle controller logic with canvas/DOM boundaries stubbed; not browser QA.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {newBattle,battleTurn,commandFor} from '../encounter-model.js';
import {battleEffectDuration,battleEffectPending} from '../battle-scene.js';
const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const act=source.slice(source.indexOf('function actBattle(action){'),source.indexOf('\n\n\nfunction drawMap('));
function harness(initial){
 const buttons=new Map(),panel={open:true},canvas={isConnected:true};let saves=0,draws=0;
 const context=vm.createContext({panel,battleCanvas:canvas,$:id=>{if(!buttons.has(id))buttons.set(id,{disabled:false});return buttons.get(id);},battleTurn,commandFor,battleEffectDuration,battleEffectPending,reducedMotion:{matches:false},save:()=>saves++,drawBattleVisual:()=>draws++,initial});
 vm.runInContext(`let battle=initial,cleared=[],battleEffect=null,visualTime=0,motion=true;function battleAnimationBusy(){return battleEffectPending(battleEffect,visualTime,motion&&!reducedMotion.matches);}${act};globalThis.api={act:actBattle,snapshot:()=>({battle,cleared,battleEffect}),time:t=>visualTime=t,reduce:()=>motion=false}`,context);
 return {api:context.api,panel,canvas,buttons,saves:()=>saves,draws:()=>draws};
}
test('repeated clicks and keys during an effect execute exactly one turn; reduced motion unlocks commands',()=>{
 const h=harness(newBattle('pumpkin'));h.api.act('attack');const first=h.api.snapshot();h.api.act('guard');h.api.act('attack');
 assert.equal(h.api.snapshot().battle.turn,1);assert.equal(h.draws(),1);
 for(const id of ['battle-shine','battle-guard','battle-attack'])assert.equal(h.buttons.get(id).disabled,true);
 h.api.reduce();h.api.time(.66);h.api.act('guard');assert.equal(h.api.snapshot().battle.turn,2);assert.equal(first.battle.turn,1);
});
test('a winning turn persists its mark before effects, and closing or stale handlers cannot award it again',()=>{
 const h=harness({...newBattle('pumpkin'),spirit:1});h.api.act('attack');
 assert.equal(h.api.snapshot().battle.status,'won');assert.equal(h.saves(),1);assert.deepEqual([...h.api.snapshot().cleared],['pumpkin']);
 h.api.act('attack');h.panel.open=false;h.api.time(10);h.api.act('attack');h.panel.open=true;h.canvas.isConnected=false;h.api.act('attack');
 assert.equal(h.saves(),1);assert.deepEqual([...h.api.snapshot().cleared],['pumpkin']);assert.equal(h.api.snapshot().battle.turn,1);
});

test('late ending receipt success or failure cannot replace another panel or a closed screen',async()=>{
 const ending=source.slice(source.indexOf('async function showEnding(){'),source.indexOf('\nfunction visitVault(){'));
 for(const error of [false,true])for(const closed of [false,true]){
  let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;}),children=[];
  const panel={open:false},content={append:node=>children.push(node),replaceChildren:()=>children.length=0};
  const context=vm.createContext({panel,content,element:(_tag,text)=>({text}),isAdventureComplete:()=>true,rewardStore:{issue:()=>promise,read:()=>null},renderEnding:()=>{throw Error('Stale rendering must not run');}});
  vm.runInContext(`let runId='run',panelRevision=0;function title(){panelRevision++;}function openPanel(){panel.open=true;}${ending};globalThis.api={show:showEnding,leave:closed=>{if(closed)panel.open=false;else panelRevision++;}}`,context);
  const pending=context.api.show();context.api.leave(closed);if(error)reject(Error('Canceled allocation'));else resolve({number:1});await pending;
  assert.equal(children.length,1);assert.equal(children[0].text,'6つのしるしが、夜明けの光へ…');
 }
});
