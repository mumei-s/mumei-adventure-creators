import assert from 'node:assert/strict';
import {assertCompactHandoff,containsInstruction} from './compact-handoff-assertions-v28.mjs';
import fs from 'node:fs';
import {questions,resolveSelections} from '../catalog.js?v=28.4.3';
import {applyCollection} from '../collection.js?v=28.4.3';
import {initialSelections} from '../modes.js?v=28.4.3';
import {buildDirection} from '../direction.js?v=28.4.3';
import {applyPose} from '../poses.js?v=28.4.3';
import {productionPlan} from '../production-plan.js?v=28.4.3';
import {composePrompt} from '../prompt.js?v=28.4.3';
import {optionRecipe} from '../option-recipes.js?v=28.4.3';
import {conditionOwners,renderInput} from '../compiled-production.js?v=28.4.3';
import {opticalColors,opticalSignature} from '../optical-effects.js?v=28.4.3';
import {automaticSelection} from '../random-selections.js?v=28.4.3';
const random=()=>.28,profile={displayName:'REVIEW',activityEnabled:false,topics:[],biography:''};
const entries=new Map();let occurrences=0,pairs=0,totalLength=0,maxLength=0;
for(const mode of ['halloween','everyday']){
 applyCollection(mode);
 const base=resolveSelections({...initialSelections(),costume:'参照画像の衣装を生かす'},random);
 for(const q of questions)for(const value of q.groups.flatMap(g=>g.values)){
  const values={...base,[q.key]:value};
  // Explicit inputs must survive the automatic-selection refiner unchanged.
  const resolved=resolveSelections(values,random);
  if(automaticSelection(value))assert.ok(q.groups.some(group=>group.values.includes(resolved[q.key])),'AUTO must become an allowed concrete choice');
  else assert.equal(resolved[q.key],value);
  const variant=applyPose(buildDirection([],values.mood,random,mode,values),values.pose);
  const plan=productionPlan(profile,values,variant,mode,random);
  const prompt=composePrompt({profile,values,variant,preparedPlan:plan,collection:mode,edition:'REVIEW'});
  assert.ok(!prompt.includes('<svg')&&!prompt.includes('第2段階の生成用入力'));
  for(const c of plan.conditions){assert.ok(conditionOwners[c.key]);for(const s of c.sections)assert.ok(renderInput(plan).includes(s.text),mode+'/'+value+'/'+s.label);}
  const drawingInput=renderInput(plan);
  for(const c of plan.conditions)for(const s of c.sections)assert.ok(drawingInput.includes(s.text),'Actual ChatGPT integration material lost '+q.key+'/'+value+'/'+s.label);
  const medium=plan.conditions.find(c=>c.key==='medium');
  if(assertCompactHandoff(plan,prompt))assert.ok(prompt.indexOf('作風・画材＝'+medium.value)<prompt.indexOf('【選択固有の制作工程】'),'Selected medium must precede physical recipes');
  assert.ok(!plan.copy.slots.some(s=>s.role==='ノンブル'||s.text==='06'||s.text===values.medium));
  const r=optionRecipe(q.key,value,{values,variant,collection:mode});
  const id=q.key+'\u0000'+value;
  if(!entries.has(id))entries.set(id,{key:q.key,value,owner:conditionOwners[q.key]||'選択セリフの正確な転記',recipeSections:r.sections.length,visibleRequirements:r.checks,review:'instruction-checked',image:'not-validated-by-this-test',modes:[]});
  entries.get(id).modes.push(mode);occurrences++;totalLength+=prompt.length;maxLength=Math.max(maxLength,prompt.length);
 }
 const media=questions.find(q=>q.key==='medium').groups.flatMap(g=>g.values),palettes=questions.find(q=>q.key==='palette').groups.flatMap(g=>g.values);
 for(const medium of media)for(const palette of palettes){
  const values={...base,medium,palette},color=opticalColors(values),recipe=optionRecipe('palette',palette,{values});
  assert.ok(recipe.known);assert.ok(!recipe.sections.some(s=>/undefined|NaN/.test(s.text)));
  if(['クリスタル透光アニメ','宝石ホログラムアニメ'].includes(medium)){
   const signature=opticalSignature(values).join(' ');
   assert.ok(signature.includes('屈折')||signature.includes('投影面'));
   if(color.restricted){assert.equal(color.spectral,false);assert.ok(signature.includes('虹色は描かず'));}
   else{assert.equal(color.spectral,true);assert.ok(signature.includes('シアン・菫・マゼンタ・淡金'));assert.ok(recipe.sections.some(s=>s.text.includes('スペクトル色は画風の光学として保つ')));}
  }
  pairs++;
 }
}
applyCollection('halloween');
const report={date:'2026-10-07',scope:'Instruction and combination review, not image acceptance',occurrences,unique:entries.size,mediaPalettePairs:pairs,promptCharacters:{mean:Math.round(totalLength/occurrences),max:maxLength},byKey:Object.fromEntries(Object.keys(conditionOwners).map(key=>[key,[...entries.values()].filter(e=>e.key===key).length])),entries:[...entries.values()]};
if(process.argv.includes('--save'))fs.writeFileSync(new URL('../verification/v18/item-review.json',import.meta.url),JSON.stringify(report,null,2));
console.log('PASS item review: '+occurrences+' occurrences, '+entries.size+' distinct options, '+pairs+' medium/palette combinations. Exact inputs, all recipe clauses, visual signatures first, one-call output, limited-color optics. Image acceptance is separate.');
