import assert from 'node:assert/strict';
import {questions,visibleQuestions} from '../catalog.js?v=28.4.4';
import {initialSelections} from '../modes.js?v=28.4.4';
import {applyCollection} from '../collection.js?v=28.4.4';
import {randomItemSelection,automaticSelection} from '../random-selections.js?v=28.4.4';
import {candidateAvailability} from '../compatibility.js?v=28.4.4';
let count=0;
for(const mode of ['halloween','everyday']){
 applyCollection(mode);
 const values={...initialSelections(),medium:'現代アニメの一枚絵',costume:'参照画像の衣装を生かす',palette:'モノクローム',sourceKind:'illustration-person',sceneUnified:true};
 for(const q of visibleQuestions){
  for(const draw of [0,.1,.6,.999999,NaN]){
   const before=structuredClone(values),result=randomItemSelection(q,values,()=>draw);
   assert.deepEqual(values,before,'Draw may not mutate any input');
   assert(result.value&&result.value!==values[q.key]);
   assert(!automaticSelection(result.value),'Individual random must select an actual option');
   assert(candidateAvailability(q.key,result.value,values).enabled,'Random must respect fixed constraints');
   const after={...values,[q.key]:result.value};
   assert.deepEqual(Object.keys(after).filter(k=>before[k]!==after[k]),[q.key]);
   count++;
  }
 }
 const pose=questions.find(q=>q.key==='pose');
 const rejected=randomItemSelection(pose,{...values,costume:'風景を主役にする'},()=>0);
 assert.equal(rejected.value,null);assert.match(rejected.reason,/人物なし/);
 const locked={...values,medium:'水墨画',palette:'墨一色'};
 for(let n=0;n<20;n++){
  const result=randomItemSelection(questions.find(q=>q.key==='palette'),locked,()=>n/20);
  assert(['モノクローム','参照画像の色を生かす'].includes(result.value));
  assert.equal(locked.medium,'水墨画');
 }
}
applyCollection('halloween');
console.log('PASS '+count+' single-item draws: only one actual compatible option changes, inputs stay intact, no-person rejects body poses and monochrome style remains fixed.');
