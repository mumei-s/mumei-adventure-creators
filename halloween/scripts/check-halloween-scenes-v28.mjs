import assert from 'node:assert/strict';
import {questions,visibleQuestions,resolveSelections,AUTO} from '../catalog.js?v=28.0.2';
import {applyCollection} from '../collection.js?v=28.0.2';
import {initialSelections,propose,effectiveSelections} from '../modes.js?v=28.0.2';
import {halloweenSceneFocus,halloweenSceneTitles,sceneSourcePlace} from '../scene-presets.js?v=28.0.2';
import {optionRecipe} from '../option-recipes.js?v=28.0.2';
import {sampleFor} from '../examples.js?v=28.0.2';
import {buildDirection} from '../direction.js?v=28.0.2';
import {productionPlan} from '../production-plan.js?v=28.0.2';
import {renderChatInput} from '../compiled-production.js?v=28.0.2';
import {compactHistoryRecord,restoreHistoryRecord} from '../history-storage.js?v=28.0.2';

const valuesFor=key=>questions.find(q=>q.key===key).groups.flatMap(group=>group.values);
const keptWorlds='月夜の仮面舞踏会|真夜中の魔女のアトリエ|忘れられた劇場|幽霊たちのお茶会|異界に続く駅|鏡の向こうの自分|眠らない美術館|一夜だけの怪奇サーカス|吸血鬼の晩餐会|死神の休日|魔法使いの見習い|悪夢からの脱出|百鬼夜行|妖狐と月の契約|海賊船の亡霊|宇宙のHalloween|機械仕掛けの怪物|呪われたオルゴール|お菓子の王国|カボチャの収穫祭|都会の仮装パレード|花と骸骨の祝祭|墨で描く怪異|雨上がりの怪談|静かなハロウィーン'.split('|');
const keptPlaces=['魔女の書斎','月下の墓地','カボチャ畑','異界の鳥居'];
const removedWorlds=['秘密の図書館','星を集める旅','光と影の寓話','記憶の標本室','異世界のファッションショー'];
const expected=new Set([...keptWorlds,...keptPlaces]);
const profile={displayName:'季節の場面検査',activityEnabled:false};
const fixed={sceneUnified:true,design:'通常の一枚絵',medium:'透明水彩',mood:'毎回大胆に変える',pose:'まっすぐ立つ',angle:'真上から・90度',type:'文字を一切入れない',palette:'秋色のブラウン × 生成り'};
let state=12081;const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
function planFor(values,collection){return productionPlan(profile,values,buildDirection([],values.mood,()=>.2,collection,values),collection,()=>.2);}

// Verify the complete seasonal set and its meaningful scene instructions, not
// just a lower number of options. Internal place recipes are not public axes.
applyCollection('halloween');
assert.equal(visibleQuestions.length,10);
assert.ok(!visibleQuestions.some(question=>question.key==='place'));
assert.deepEqual(new Set(valuesFor('theme')),expected);
assert.deepEqual(new Set(halloweenSceneTitles),expected);
const halloweenSnapshot=JSON.stringify(questions.find(question=>question.key==='theme'));
const legacyPlaces=[...valuesFor('place')];assert.equal(legacyPlaces.length,30);
const removedPlaces=legacyPlaces.filter(value=>!keptPlaces.includes(value));
assert.equal(removedPlaces.length,26);
for(const value of [...removedWorlds,...removedPlaces])assert.ok(!valuesFor('theme').includes(value),value+' reappeared publicly');
for(const group of questions.find(question=>question.key==='theme').groups){
 for(const value of group.values)assert.equal(group.sceneSource,keptPlaces.includes(value)?'place':'theme');
}
for(const theme of expected){
 const focus=halloweenSceneFocus(theme);assert.ok(focus?.length>35,theme+' lacks a specific Halloween scene');
 assert.match(focus,/Halloween/);
 for(const costume of ['参照画像の衣装を生かす','風景を主役にする']){
  const values=resolveSelections({...initialSelections(),...fixed,theme,costume,place:'STALE_BACKGROUND'},()=>.2);
  assert.equal(values.theme,theme);assert.notEqual(values.place,'STALE_BACKGROUND');
  for(const [key,value] of Object.entries({...fixed,costume}))assert.equal(values[key],value,theme+' changed explicit '+key);
  if(keptPlaces.includes(theme))assert.equal(values.place,theme);
  const recipe=optionRecipe('theme',theme,{values,collection:'halloween'});
  assert.ok(recipe.known,theme+' lost its recipe');
  assert.equal(recipe.sourceKey,keptPlaces.includes(theme)?'place':'theme');
  assert.ok(recipe.sections.some(section=>section.label==='Halloweenの場面'&&section.text.includes(focus)));
  assert.ok(renderChatInput(planFor(values,'halloween')).includes(focus),theme+' seasonal scene did not reach real input');
  assert.notEqual(sampleFor('theme',theme).kind,'custom',theme+' lost its preview');
 }
}
// Automatic suggestion and both simplified UI modes must use this same set.
const autoSeen=new Set();
for(let index=0;index<400;index++){
 for(const values of [propose(initialSelections(),random),resolveSelections(effectiveSelections(index%2?'simple':'auto',initialSelections()),random)]){
  assert.ok(expected.has(values.theme),'Automatic scene escaped seasonal set: '+values.theme);autoSeen.add(values.theme);
 }
}
assert.equal(autoSeen.size,expected.size,'Some seasonal choices never reach automatic suggestions');

// Removed choices stay readable through direct legacy/history inputs. Do not
// turn a seasonal picker filter into a destructive saved-value migration.
for(const theme of [...removedWorlds,...removedPlaces]){
 const values=resolveSelections({...initialSelections(),...fixed,theme,costume:'参照画像の衣装を生かす'},()=>.2);
 assert.equal(values.theme,theme);
 if(removedPlaces.includes(theme)){assert.equal(sceneSourcePlace(theme),theme);assert.equal(values.place,theme);}
 const recipe=optionRecipe('theme',theme,{values,collection:'halloween'});
 assert.ok(recipe.known,theme+' old recipe became a free-input fallback');
 assert.ok(!recipe.sections.some(section=>section.label==='Halloweenの場面'),theme+' legacy scene was rewritten');
 assert.notEqual(sampleFor('theme',theme).kind,'custom',theme+' old preview disappeared');
 const production=planFor(values,'halloween'),prompt=renderChatInput(production);
 assert.ok(prompt.includes(theme));
 const record={version:28,collection:'halloween',values,production,prompt,edition:'SAVED-'+theme};
 const packed=await compactHistoryRecord(record,{Compression:null,Decompression:null});
 const restored=await restoreHistoryRecord(packed,{Decompression:null});
 assert.deepEqual(restored.values,values);assert.deepEqual(restored.production,production);assert.equal(restored.prompt,prompt);
}
const customTheme='秋の夜の自作シーン・自由指定';
const custom=resolveSelections({...initialSelections(),...fixed,theme:customTheme,costume:'参照画像の衣装を生かす'},()=>.2);
assert.equal(custom.theme,customTheme);assert.equal(custom.place,customTheme);
assert.ok(renderChatInput(planFor(custom,'halloween')).includes(customTheme));

// Everyday fantasy and ordinary locations remain available exactly as before;
// selecting a shared title there must not acquire Halloween decoration.
applyCollection('everyday');
assert.equal(valuesFor('theme').length,74);
for(const theme of [...removedWorlds,'空中都市','白いスタジオ','朝の光と小さな日常','山岳と湖のパノラマ'])assert.ok(valuesFor('theme').includes(theme));
for(const theme of valuesFor('theme')){
 const values=resolveSelections({...initialSelections(),...fixed,theme,costume:'参照画像の衣装を生かす'},()=>.2);
 const recipe=optionRecipe('theme',theme,{values,collection:'everyday'});
 assert.ok(!recipe.sections.some(section=>section.label==='Halloweenの場面'),theme+' gained seasonal context in everyday mode');
}
const everydaySnapshot=JSON.stringify(questions.find(question=>question.key==='theme'));
for(let index=0;index<3;index++){
 applyCollection('halloween');assert.equal(JSON.stringify(questions.find(question=>question.key==='theme')),halloweenSnapshot);
 applyCollection('everyday');assert.equal(JSON.stringify(questions.find(question=>question.key==='theme')),everydaySnapshot);
}
applyCollection('halloween');
assert.equal(resolveSelections({...initialSelections(),sceneUnified:true,theme:AUTO},()=>.99).theme,'異界の鳥居');
console.log('PASS Halloween scenes: 29 seasonal scene contracts (25 stories + 4 locations), 800 automatic/simplified proposals, 31 removed presets still readable through legacy/history inputs, arbitrary scenes retained, 74 everyday scenes unchanged, seasonal scope and collection restoration checked.');
