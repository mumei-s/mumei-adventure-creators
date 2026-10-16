import test from 'node:test';
import assert from 'node:assert/strict';
import {battleEffectDuration,shineSequence,renderBattleScene} from '../battle-scene.js';
import {newBattle} from '../encounter-model.js';
function fakeCanvas(w,h){const calls=[],g={addColorStop(){}};const c=new Proxy({createLinearGradient:()=>g,createRadialGradient:()=>g},{get:(o,k)=>k in o?o[k]:(...a)=>calls.push([k,...a]),set(o,k,v){o[k]=v;return true;}});return {width:w,height:h,getContext:()=>c,calls};}
const art={images:{}};
test('finisher has ordered charge, circle, release, impact and settle windows',()=>{
  assert.deepEqual([0,.5,.86,1.28,1.86,2.4].map(t=>shineSequence(t).stage),['charge','circle','release','impact','settle','done']);
  assert.equal(battleEffectDuration('shine'),2.4);assert.equal(battleEffectDuration('attack'),1.2);assert.equal(battleEffectDuration('guard'),1.2);
  for(let t=0;t<3;t+=.01){const s=shineSequence(t);for(const k of ['charge','travel','impact','lunge'])assert(s[k]>=0&&s[k]<=1,k);}
  assert.equal(shineSequence(0).travel,0);assert.equal(shineSequence(1.28).travel,1);assert.equal(shineSequence(2.4).lunge,0);
});
test('reduced motion has stationary light emblem and a bounded brief duration',()=>{
  assert.equal(battleEffectDuration('shine',false),.65);assert.equal(shineSequence(.3,false).lunge,0);
  const a=fakeCanvas(365,230),b=fakeCanvas(365,230),battle=newBattle('pumpkin'),effect={type:'shine',damage:3,started:0};
  renderBattleScene({canvas:a,art,battle,effect,time:.25,motion:false});renderBattleScene({canvas:b,art,battle,effect,time:.5,motion:false});assert.deepEqual(a.calls,b.calls);
  assert(a.calls.some(v=>v[0]==='fillText'&&v[1]==='灯の必殺技'));
});
test('victory waits for impact and every sequence stage renders at compact sizes',()=>{
  for(const [w,h]of [[320,200],[365,230],[640,180],[1000,440]])for(const t of [.2,.7,1.05,1.5,2.1,2.4]){
    const canvas=fakeCanvas(w,h),battle={...newBattle('pumpkin'),status:'won'},effect={type:'shine',damage:3,started:0};renderBattleScene({canvas,art,battle,effect,time:t,motion:true});
    assert.equal(canvas.calls.some(v=>v[0]==='fillText'&&v[1]==='灯を取り戻した'),t>=1.28);
    for(const call of canvas.calls)for(const value of call.slice(1))if(typeof value==='number')assert(Number.isFinite(value),call[0]);
  }
});
test('136px compact stage keeps primary labels centered and bounded without secondary overlaps',()=>{
  for(const status of ['playing','won','rest'])for(const type of ['shine','attack','guard']){
    const canvas=fakeCanvas(136,150),battle={...newBattle('pumpkin'),status};
    renderBattleScene({canvas,art,battle,effect:{type,damage:4,retaliation:2,started:0},time:1.5,motion:true});
    const labels=canvas.calls.filter(v=>v[0]==='fillText');
    assert(!labels.some(v=>v[1]==='ランタンの玄関'||v[1]==='帰り道を守る番人'||v[1]==='MEMORY RESTORED'));
    assert.equal(labels.filter(v=>v[3]===26).length,1);
    for(const v of labels){assert.equal(v[2],68);assert(v[4]>0&&v[4]<=120);}
    if(status!=='won')assert(labels.some(v=>v[1]==='無名S note'));
  }
});
