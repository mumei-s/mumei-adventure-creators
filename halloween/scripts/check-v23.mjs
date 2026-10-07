import assert from 'node:assert/strict';
import {questions,resolveSelections} from '../catalog.js?v=27.0.1';
import {applyCollection,dailyInspiration} from '../collection.js?v=27.0.1';
import {everydayScenes,everydayPlaces,casualClothes,swimClothes} from '../everyday-options.js?v=27.0.1';
import {optionRecipe} from '../option-recipes.js?v=27.0.1';
import {productionPlan} from '../production-plan.js?v=27.0.1';
import {renderChatInput} from '../compiled-production.js?v=27.0.1';
const random=()=>.28,profile={displayName:'TEST',activityEnabled:false,topics:[]};
applyCollection('everyday');
for(const [key,values]of [['theme',everydayScenes.map(x=>x[0])],['place',everydayPlaces],['costume',[...casualClothes,...swimClothes]]])for(const value of values){
 assert.ok(questions.find(q=>q.key===key).groups.some(g=>g.values.includes(value)));
 const recipe=optionRecipe(key,value);assert.ok(recipe.known&&recipe.sections.length>=2);assert.ok(recipe.execution.method.length>30);
}
for(const swim of swimClothes){const v=resolveSelections({costume:swim},random);assert.equal(v.costume,swim);assert.equal(v.theme,'プールサイドの休日');assert.equal(v.place,'屋外プール');}
let v=resolveSelections({place:'海水浴場'},random);assert.equal(v.theme,'海で過ごす夏の日');assert.ok(swimClothes.includes(v.costume));
v=resolveSelections({theme:'プールサイドの休日',place:'屋内温水プール',costume:'トランクス型水着'},random);assert.equal(v.place,'屋内温水プール');assert.equal(v.costume,'トランクス型水着');
const p=dailyInspiration({...profile,inspiration:{labels:['創作'],signals:[{label:'創作',theme:'真夜中の魔女のアトリエ',imagery:'魔女',phrases:['Halloween']}],objects:['骸骨','本']}});assert.doesNotMatch(JSON.stringify(p.inspiration),/Halloween|骸骨|魔女/);
for(const medium of ['クリスタルホログラム造形アニメ','宝石ホログラムアニメ']){
 const recipe=optionRecipe('medium',medium);assert.ok(recipe.sections.some(s=>s.label==='顔も同一の結晶ホログラム'));
 assert.equal(optionRecipe('medium',medium).sections.length,recipe.sections.length,'Repeated inspection does not append sections to global recipes');
 const values=resolveSelections({medium,costume:'参照画像の衣装を生かす'},random);
 const plan=productionPlan(profile,values,{face:'正面',expression:'笑顔',pose:'立つ',distance:'全身',camera:'正面',light:'窓からの光',depth:'前後の奥行き',motion:'静止'},'everyday',random);
 const input=renderChatInput(plan);assert.ok(input.indexOf('最優先：顔も結晶ホログラム')<input.indexOf('【全選択の個別レシピ】'));
 for(const c of plan.conditions)for(const section of c.sections)assert.ok(input.includes(section.text));
}
applyCollection('halloween');assert.ok(!questions.find(q=>q.key==='costume').groups.some(g=>g.values.includes('ビキニ')));
console.log('PASS v23: 38 everyday presets have individual recipes; swimming AUTO binds to water; explicit indoor pool/clothing preserved; daily profile signals contain no Halloween; crystal face is prioritized without global mutation; full clauses retained.');
