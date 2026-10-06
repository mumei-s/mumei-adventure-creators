import assert from 'node:assert/strict';
import {questions,visibleQuestions,resolveSelections,AUTO} from '../catalog.js?v=17';
import {applyCollection,landscapeScenes,noPersonSelection,dailyInspiration} from '../collection.js?v=17';
import {initialSelections,propose,effectiveSelections} from '../modes.js?v=17';
import {buildDirection} from '../direction.js?v=17';
import {poseItems,applyPose} from '../poses.js?v=17';
import {sampleFor,typePreview} from '../examples.js?v=17';
let state=11987;const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
const valuesFor=key=>questions.find(q=>q.key===key).groups.flatMap(g=>g.values);
applyCollection('halloween');
const halloweenSnapshot=JSON.stringify(questions.map(q=>({key:q.key,name:q.name,hint:q.hint,groups:q.groups})));
assert.equal(visibleQuestions.length,10);assert.equal(poseItems.length,48);
applyCollection('everyday');
assert.equal(valuesFor('pose').length,48);assert.equal(new Set(valuesFor('pose')).size,48);
assert.ok(valuesFor('design').includes('自然・都市の風景画'));
assert.ok(valuesFor('theme').includes('山岳と湖のパノラマ'));
assert.ok(valuesFor('costume').includes('森の妖精'),'fantasy remains an explicit option');
assert.ok(!valuesFor('theme').includes('幽霊たちのお茶会'));
const landscapeNames=new Set(landscapeScenes.map(x=>x[0]));
let sceneryCount=0,personCount=0;
for(let i=0;i<500;i++){
 const values=resolveSelections(initialSelections(),random);
 for(const q of questions)assert.ok(values[q.key]===AUTO||valuesFor(q.key).includes(values[q.key]),q.key+': '+values[q.key]);
 assert.doesNotMatch([values.theme,values.costume,values.place,values.pose].join(' '),/魔法|魔女|幽霊|カボチャ|浮遊する|空中都市|星.*集める/);
 const variant=applyPose(buildDirection([],values.mood,random,'everyday',values),values.pose);
 assert.doesNotMatch(variant.depth,/浮遊/);assert.doesNotMatch(variant.pose,/マント|牙|魔法/);
 if(noPersonSelection(values)){sceneryCount++;assert.equal(variant.noPerson,true);assert.equal(variant.face,'');assert.equal(variant.expression,'');assert.equal(variant.pose,'');}
 else personCount++;
}
assert.ok(sceneryCount>0&&personCount>0);
for(const [theme,place]of [['山岳と湖のパノラマ','山岳と湖畔'],['里山と田園風景','田畑と里山'],['四季の森を見渡す','広葉樹の森']]){
 const values=resolveSelections({...initialSelections(),theme},random);assert.equal(values.theme,theme);assert.equal(values.place,place);assert.equal(values.costume,'風景を主役にする');
}
const reading=resolveSelections({...initialSelections(),theme:'静かな読書の時間'},()=>0.99);assert.equal(reading.pose,'本を読む');assert.ok(['窓辺の読書室','深夜の喫茶店'].includes(reading.place));assert.equal(noPersonSelection(reading),false);
const fantasyInput={...initialSelections(),theme:'星明かりを集める旅',costume:'森の妖精',place:'空中都市',pose:'浮遊する'};
const fantasy=resolveSelections(fantasyInput,random);for(const key of ['theme','costume','place','pose'])assert.equal(fantasy[key],fantasyInput[key]);
for(const costume of ['風景を主役にする','モチーフだけで構成する','紋章・アイコンにする']){
 const values=resolveSelections({...initialSelections(),costume,pose:'全力で走る',mood:'完全な左横顔90度'},random),v=applyPose(buildDirection([],values.mood,random,'everyday',values),values.pose);
 assert.equal(values.pose,'全力で走る','explicit selection is retained for later reuse');assert.equal(v.noPerson,true);assert.equal(v.face,'');assert.equal(v.expression,'');assert.equal(v.pose,'');
}
const scenicPerson=resolveSelections({...initialSelections(),design:'自然・都市の風景画',costume:'リネンシャツとデニム',pose:'頬に手を添える'},random);
const scenicPersonVariant=applyPose(buildDirection([],scenicPerson.mood,random,'everyday',scenicPerson),scenicPerson.pose);
assert.equal(scenicPerson.costume,'リネンシャツとデニム');assert.equal(noPersonSelection(scenicPerson),false);assert.match(scenicPersonVariant.distance,/風景の全景/);assert.match(scenicPersonVariant.pose,/頬に手/);
for(const mode of ['simple','auto']){
 const resolved=resolveSelections(effectiveSelections(mode,{...initialSelections(),theme:'魔法使いの見習い',costume:'魔女・魔法使い'}),random);
 if(mode==='auto')assert.doesNotMatch(resolved.theme,/魔法|魔女/);
 assert.ok(!resolved.costume.includes('魔女'));
}
const size='縦投稿4:5｜2160×2700｜4:5';assert.equal(propose({...initialSelections(),size},random).size,size);
const dailySample=sampleFor('theme',AUTO);assert.ok(dailySample.srcs.every(src=>src.startsWith('./everyday-')));
assert.doesNotMatch(typePreview('新聞風・記事と段組み').blocks.join(' '),/NIGHT|夜の/);
const inspiration=dailyInspiration({inspiration:{labels:['光彩','旅','創作'],objects:['魔法の杖','本','幽霊']}}).inspiration;
assert.ok(inspiration.themes.every(name=>!name.includes('星明かり')));assert.deepEqual(inspiration.objects,['本']);
for(let i=0;i<3;i++){applyCollection('halloween');assert.equal(JSON.stringify(questions.map(q=>({key:q.key,name:q.name,hint:q.hint,groups:q.groups}))),halloweenSnapshot);assert.equal(questions.reduce((n,q)=>n+q.groups.flatMap(g=>g.values).length,0),501);applyCollection('everyday');}
applyCollection('halloween');
for(let i=0;i<120;i++){const values=resolveSelections(initialSelections(),random);for(const q of questions)assert.ok(values[q.key]===AUTO||valuesFor(q.key).includes(values[q.key]));}
console.log('v11 collections: ordinary defaults, explicit fantasy, subject-free scenery, 48 poses, mode pools and restoration passed.');
