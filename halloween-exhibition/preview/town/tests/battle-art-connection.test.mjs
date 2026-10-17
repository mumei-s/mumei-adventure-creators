// Exercises the actual app loader function and actual Canvas renderer with draw stubs.
// This is an asset/logic integration check, not browser/GPU or art acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {TOWN_BATTLE_ART_IDS} from '../visual-data.js';
import {createTownRenderer} from '../renderer.js';
import {startTownBattle} from '../battle-model.js';
import {initialTownState} from '../town-model.js';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const loader=app.slice(app.indexOf('async function prepareBattleArt(){'),app.indexOf('\nfunction renderBattle(){'));
function canvas(width=390,height=260){const gradient={addColorStop(){}},context=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,measureText:()=>({width:50})},{get:(object,key)=>key in object?object[key]:(...args)=>{},set:(object,key,value)=>{object[key]=value;return true;}});return {width,height,getContext:()=>context};}
test('both narrative enemies load exactly the same approved sprite ID the actual battle renderer reads',async()=>{
 for(const enemyId of ['canal-mist','clock-shadow']){
  const loaded=[],read=[],battle=startTownBattle(initialTownState(),enemyId),context=vm.createContext({TOWN_BATTLE_ART_IDS,panel:{open:true},session:{snapshot:()=>({battle})},characterArt:{ensureMonster:async id=>{loaded.push(id);return true;}},renderBattle(){}});
  vm.runInContext(`let battleArtReady=false,battleArtFailed=false;${loader};globalThis.prepare=prepareBattleArt;globalThis.flags=()=>({battleArtReady,battleArtFailed});`,context);await context.prepare();assert.equal(context.flags().battleArtReady,true);
  const images={};for(const id of Object.values(TOWN_BATTLE_ART_IDS))Object.defineProperty(images,id,{get(){read.push(id);return {width:384,height:384};}});
  const renderer=createTownRenderer({art:{images,monsterLayouts:{}},makeCanvas:(w,h)=>canvas(w,h),loadImage:async()=>({width:2048,height:2048}),fetcher:async()=>({ok:true,json:async()=>({sprites:{}})})});await renderer.ready;
  renderer.renderTownBattle({canvas:canvas(),battle,motion:false});assert.equal(loaded[0],TOWN_BATTLE_ART_IDS[enemyId]);assert.equal(read.at(-1),loaded[0]);renderer.destroy();
 }
});
test('failed or obsolete battle art resolves to retry state without unlocking an unrelated battle',async()=>{
 let resolve;const battle=startTownBattle(initialTownState(),'canal-mist'),context=vm.createContext({TOWN_BATTLE_ART_IDS,panel:{open:true},session:{snapshot:()=>({battle:context.current})},characterArt:{ensureMonster:()=>new Promise(done=>resolve=done)},renderBattle(){context.renders=(context.renders||0)+1;}});context.current=battle;
 vm.runInContext(`let battleArtReady=false,battleArtFailed=false;${loader};globalThis.prepare=prepareBattleArt;globalThis.flags=()=>({battleArtReady,battleArtFailed});`,context);
 const pending=context.prepare();assert.equal(context.flags().battleArtReady,false);resolve(false);await pending;assert.equal(context.flags().battleArtFailed,true);assert.equal(context.renders,1);
 const obsolete=context.prepare();context.current={...battle,id:'another-battle'};resolve(true);await obsolete;assert.equal(context.flags().battleArtReady,false);assert.equal(context.renders,1);
 const act=app.slice(app.indexOf('function actBattle(action){'),app.indexOf('\nfunction drawBattle(){'));assert(act.includes('if(!battleArtReady)return'));assert(app.includes('画像の準備をやり直す'));assert(app.includes("$('panel-close').onclick=closePanel"));
});
