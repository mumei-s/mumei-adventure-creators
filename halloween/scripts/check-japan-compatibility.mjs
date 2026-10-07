import assert from 'node:assert/strict';
import {selectionConflicts,candidateAvailability,wrappedPage} from '../compatibility.js?v=28.0.3';
import {questions,resolveSelections} from '../catalog.js?v=28.0.3';
import {applyCollection} from '../collection.js?v=28.0.3';
import {initialSelections} from '../modes.js?v=28.0.3';
import {optionRecipe} from '../option-recipes.js?v=28.0.3';
import {modeFoundation} from '../japan-direction.js?v=28.0.3';
const base={...initialSelections(),costume:'風景を主役にする',pose:'おまかせ',mood:'毎回大胆に変える'};
assert.equal(candidateAvailability('pose','両手を広げる',base).enabled,false);
assert.equal(candidateAvailability('mood','正面＋満面の笑顔',base).enabled,false);
assert.equal(candidateAvailability('mood','静かで美しい',base).enabled,true);
assert.equal(candidateAvailability('pose','おまかせ',base).enabled,true);
assert.equal(candidateAvailability('palette','墨一色',{medium:'クリスタルホログラム造形アニメ'}).enabled,false);
assert.equal(candidateAvailability('palette','墨一色',{medium:'クリスタル透光アニメ'}).enabled,true);
assert.equal(candidateAvailability('medium','水墨画',{palette:'ネオンピンク × シアン'}).enabled,false);
assert.equal(candidateAvailability('medium','墨彩画',{palette:'ネオンピンク × シアン'}).enabled,true);
assert.equal(candidateAvailability('pose','片足に体重を乗せる',{costume:'人魚'}).enabled,false);
assert.equal(candidateAvailability('pose','浮遊する',{costume:'人魚'}).enabled,true);
assert.equal(candidateAvailability('place','朝のキッチン',{theme:'海辺と水平線'}).enabled,false);
assert.equal(candidateAvailability('place','海辺の灯台',{theme:'海辺と水平線'}).enabled,true);
assert.equal(candidateAvailability('place','参照風景を舞台にする',{theme:'海辺と水平線'}).enabled,true);
for(let pages=1;pages<=20;pages++){
 assert.equal(wrappedPage(0,-1,pages),pages-1);
 assert.equal(wrappedPage(pages-1,1,pages),0);
}
assert.equal(wrappedPage(0,-1,0),0);
for(const mode of ['halloween','everyday']){
 applyCollection(mode);
 for(let seed=1;seed<=300;seed++){
  let state=seed;const random=()=>((state=Math.imul(state,1664525)+1013904223>>>0)/4294967296);
  const resolved=resolveSelections(initialSelections(),random);
  assert.deepEqual(selectionConflicts(resolved),[],mode+' AUTO conflict seed '+seed);
 }
 const explicit={...initialSelections(),medium:'クリスタルホログラム造形アニメ',palette:'墨一色'};
 const resolved=resolveSelections(explicit,()=>.3);
 assert.equal(resolved.medium,explicit.medium);assert.equal(resolved.palette,explicit.palette);
 assert.ok(selectionConflicts(resolved).length,'Explicit conflict must remain reviewable instead of silently changing choices');
 for(const q of questions)for(const g of q.groups)for(const value of g.values){
  const r=optionRecipe(q.key,value,{values:{costume:'参照画像の衣装を生かす'},collection:mode});
  assert.ok(r.sections.some(s=>s.label==='日本を基準にした個別条件'),mode+' Japan clause missing '+q.key+': '+value);
 }
}
const scenery=optionRecipe('medium','クリスタルホログラム造形アニメ',{values:{costume:'風景を主役にする'}});
assert.ok(!scenery.sections.map(s=>s.text).join('').match(/眼瞼|瞳孔|眼の|目鼻|袖|髪束/),'No-person material recipe must not introduce anatomy');
for(const type of ['文字を一切入れない','クリエイター名だけ']){const cover=optionRecipe('design','週刊誌の表紙',{values:{type}});const clause=cover.sections.find(s=>s.label==='日本を基準にした個別条件').text;assert.ok(!clause.includes('大見出し2〜4本'));assert.match(clause,type==='文字を一切入れない'?/一切追加しない/:/補完しない/);}
assert.match(modeFoundation('everyday'),/自動追加しない/);
assert.match(modeFoundation('halloween'),/通常モードと同じ日本/);
applyCollection('halloween');
console.log('PASS Japan foundation for every option; incompatible candidates blocked with explicit choices preserved; 600 AUTO combinations; no-person crystal recipe; circular navigation including first-left to last.');
