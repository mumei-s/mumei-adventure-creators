import assert from 'node:assert/strict';
import {assertCompactHandoff,containsInstruction} from './compact-handoff-assertions-v28.mjs';
import {questions,visibleQuestions,resolveSelections,AUTO} from '../catalog.js?v=28.4.4';
import {applyCollection} from '../collection.js?v=28.4.4';
import {modeKeys,effectiveSelections,initialSelections} from '../modes.js?v=28.4.4';
import {sceneSourcePlace} from '../scene-presets.js?v=28.4.4';
import {angleItems} from '../angles.js?v=28.4.4';
import {buildDirection} from '../direction.js?v=28.4.4';
import {productionPlan} from '../production-plan.js?v=28.4.4';
import {composePrompt} from '../prompt.js?v=28.4.4';
const profile={displayName:'Test Creator',biography:'創作',topics:[]};
let scenes=0,angles=0;
for(const collection of ['halloween','everyday']){
 applyCollection(collection);
 assert.equal(visibleQuestions.length,10);
 assert.ok(visibleQuestions.some(q=>q.key==='angle'));
 assert.ok(!visibleQuestions.some(q=>q.key==='place'));
 assert.ok(!modeKeys.simple.includes('place'));
 assert.ok(modeKeys.simple.includes('theme'));
 for(const theme of questions.find(q=>q.key==='theme').groups.flatMap(g=>g.values)){
  const values=resolveSelections({...effectiveSelections('detail',initialSelections()),theme,place:'UNRELATED_OLD_PLACE',medium:'発光幻想アニメ',design:'通常の一枚絵',palette:'群青 × 月白 × 銀',costume:'参照画像の衣装を生かす',pose:'まっすぐ立つ',mood:'正面・首をまっすぐ'},()=>0);
  assert.equal(values.theme,theme);assert.notEqual(values.place,'UNRELATED_OLD_PLACE');
  if(sceneSourcePlace(theme))assert.equal(values.place,theme);
  const variant=buildDirection([],values.mood,()=>0,collection,values);
  const plan=productionPlan(profile,values,variant,collection,()=>0);
  assert.equal(plan.conditions.length,10);assert.ok(!plan.conditions.some(c=>c.key==='place'));
  assert.ok(plan.conditions.find(c=>c.key==='theme').known,theme);
  assert.ok(plan.conditions.find(c=>c.key==='angle').known);
  const text=composePrompt({collection,creator:'test',profile,values,variant,references:[],edition:'SCENE',preparedPlan:plan});
  assert.ok(text.includes('世界観・シーン'));assert.ok(text.includes(theme));assert.ok(text.includes(values.place));assert.ok(!text.includes('UNRELATED_OLD_PLACE'));
  scenes++;
 }
 for(const noPerson of [false,true])for(const angle of angleItems){
  const values=resolveSelections({...initialSelections(),sceneUnified:true,theme:collection==='halloween'?'宇宙のHalloween':'山岳と湖のパノラマ',angle:angle.value,design:'通常の一枚絵',medium:'発光幻想アニメ',palette:'群青 × 月白 × 銀',costume:noPerson?'風景を主役にする':'参照画像の衣装を生かす',mood:'毎回大胆に変える',pose:noPerson?AUTO:'まっすぐ立つ',type:'文字を一切入れない'},()=>0);
  const variant=buildDirection([],values.mood,()=>0,collection,values),plan=productionPlan(profile,values,variant,collection,()=>0);
  const text=composePrompt({collection,creator:'test',profile,values,variant,references:[],edition:'ANGLE',preparedPlan:plan});
  assert.ok(plan.variant.camera.includes(angle.value));assert.ok(plan.conditions.find(c=>c.key==='angle').known);
  assert.ok(text.includes(angle.value));assert.ok(!text.includes(angle.file),'UI schematic must not become image input');
  if(assertCompactHandoff(plan,text)&&collection==='halloween'){
   assert.match(text,/宇宙の広がり|星雲と遠い星の広がり|恒星|小物だけで宇宙を代用しない/);
   assert.match(text,/宇宙を小さな飾り・窓内の別絵・別枠だけに閉じ込めない|小物だけで宇宙を代用しない/,'Actual final image input must retain the cosmic environment rather than a detached prop');
  }
  angles++;
 }
}
applyCollection('halloween');
console.log('PASS '+scenes+' unified scene presets, stale independent places removed, one public scene contract, '+angles+' camera/person/scenery cases and 36 UI-only angle diagrams.');
