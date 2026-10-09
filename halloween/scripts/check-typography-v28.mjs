import assert from 'node:assert/strict';
import {assertCompactHandoff,containsInstruction} from './compact-handoff-assertions-v28.mjs';
import {applyCollection} from '../collection.js?v=28.4.5';
import {resolveSelections} from '../catalog.js?v=28.4.5';
import {initialSelections} from '../modes.js?v=28.4.5';
import {buildDirection} from '../direction.js?v=28.4.5';
import {productionPlan} from '../production-plan.js?v=28.4.5';
import {composePrompt} from '../prompt.js?v=28.4.5';
import {typePreview} from '../examples.js?v=28.4.5';
import {typographyValues,typographyOption} from '../typography-options.js?v=28.4.5';
import {visualSpec} from '../visual-specs.js?v=28.4.5';
import {renderInput} from '../compiled-production.js?v=28.4.5';

let examined=0;
for(const collection of ['halloween','everyday']){
 applyCollection(collection);
 const base=resolveSelections({...initialSelections(),design:'広告ビジュアル'},()=>.23);
 for(const type of typographyValues)for(const sourceGuided of [false,true])for(const noPerson of [false,true]){
  const profile={displayName:'創作の作り手',activityEnabled:sourceGuided,...(sourceGuided?{handoff:{id:'private_test_id'}}:{})};
  const values={...base,type,costume:noPerson?'風景を主役にする':base.costume};
  const variant=buildDirection([],values.mood,()=>.23,collection,values);
  const plan=productionPlan(profile,values,variant,collection,()=>.23),copy=plan.copy;
  const roles=[...copy.slots,...copy.generatedSlots].map(slot=>slot.role);
  assert.equal(plan.conditions.find(condition=>condition.key==='type').known,true,type+' must have a concrete recipe');
  assert.equal(visualSpec('type',type).known,true,type+' must be recognized by legacy previews');
  assert.ok(copy.typographyLayout&&copy.typographyDensity,type+' lost its selected layout/density');
  assert.ok(roles.length>=2&&roles.length<=6,type+' unexpectedly expanded to standard magazine copy');
  assert.ok(!roles.some(role=>/^(誌名|補助特集|ビリング|本文\d|質問|回答|日時|会場|価格|ID|URL)$/.test(role)),type+' gained unrequested roles');
  if(type==='商品広告・キャッチと特徴3点')assert.equal(roles.filter(role=>/^特徴\d$/.test(role)).length,3);
  if(type==='イベント告知・見どころと案内')assert.equal(roles.filter(role=>/^見どころ\d$/.test(role)).length,2);
  if(type==='詩のコピー・短い言葉を3行')assert.equal(roles.filter(role=>/^詩行\d$/.test(role)).length,3);
  if(type==='ミニマル広告・見出しと名前')assert.equal(roles.length,2);
  if(type==='キャラクター名鑑・役柄とスキル')assert.equal(roles.filter(role=>noPerson?/^特徴\d$/.test(role):/^スキル\d$/.test(role)).length,2);
  const input=renderInput(plan),prompt=composePrompt({creator:'private_test_id',profile,values,variant:plan.variant,references:[],edition:'TYPOGRAPHY',collection,preparedPlan:plan});
  assert.ok(input.includes(typographyOption(type).layout),type+' layout did not reach ChatGPT integration material');
  assertCompactHandoff(plan,prompt);
  for(const slot of copy.slots)assert.ok(input.includes(slot.text),type+' lost fixed manuscript '+slot.role);
  for(const slot of copy.generatedSlots){assert.ok(input.includes(slot.role),type+' lost generated manuscript '+slot.role);assert.ok(input.includes(slot.instruction),type+' lost role-specific editorial rules');}
  assert.doesNotMatch(copy.blocks.join(' '),/private_test_id|https?:|undefined|NaN/);
  assert.doesNotMatch(prompt,/undefined|NaN/);
  const preview=typePreview(type);assert.ok(preview.blocks.length>=2,type+' missing a corresponding typography preview');
  if(collection==='everyday')assert.doesNotMatch(copy.blocks.join(' '),/HALLOWEEN|Halloween|ハロウィ/);
  examined++;
 }
}
applyCollection('halloween');
console.log('PASS v28 typography: '+typographyValues.length+' copy choices and '+examined+' mode/source/person combinations preserve explicit manuscript counts, role-specific editing, matching previews, and selected layout inside ChatGPT integration material; no unrequested factual claims or ID copy.');
