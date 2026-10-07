import assert from 'node:assert/strict';
import fs from 'node:fs';
import {questions,resolveSelections} from '../catalog.js?v=23.0.0';
import {applyCollection} from '../collection.js?v=23.0.0';
import {initialSelections} from '../modes.js?v=23.0.0';
import {buildDirection} from '../direction.js?v=23.0.0';
import {applyPose} from '../poses.js?v=23.0.0';
import {productionPlan} from '../production-plan.js?v=23.0.0';
import {renderInput} from '../compiled-production.js?v=23.0.0';
import {optionRecipe} from '../option-recipes.js?v=23.0.0';
import {mediumExecution} from '../medium-execution.js?v=23.0.0';
import {formatExecution} from '../format-execution.js?v=23.0.0';

const random=()=>.28,profile={displayName:'TEST',activityEnabled:false,topics:[],biography:''};
const entries=new Map();let occurrences=0;
assert.equal(mediumExecution.size,108);
assert.equal(formatExecution.size,48);
assert.equal(new Set(mediumExecution.values()).size,108);
assert.equal(new Set(formatExecution.values()).size,48);
function produce(values,mode){
 const variant=applyPose(buildDirection([],values.mood,random,mode,values),values.pose);
 const plan=productionPlan(profile,values,variant,mode,random);
 const input=renderInput(plan);return {plan,input,json:JSON.parse(input.split('\n\n【全選択の個別レシピ】')[0])};
}
for(const mode of ['halloween','everyday']){
 applyCollection(mode);
 const base=resolveSelections({...initialSelections(),costume:'参照画像の衣装を生かす',type:'セリフのみ'},random);
 for(const q of questions)for(const value of q.groups.flatMap(g=>g.values)){
  const values={...base,[q.key]:value};
  const {plan,input,json}=produce(values,mode);
  const recipe=optionRecipe(q.key,value,{values,variant:plan.variant,collection:mode}),e=recipe.execution;
  assert.equal(e.source,'individual-preset',mode+'/'+q.key+'/'+value);
  assert.ok(e.method.length>20&&e.evidence.length&&e.reject.length);
  assert.equal(e.selected,value);
  for(const item of e.evidence)assert.ok(item.region&&item.required);
  for(const c of plan.conditions){
   const contract=c.key==='medium'?json.drawing:c.key==='design'?json.layout:c.key==='size'?json.canvas:c.key==='type'?json.typography:json.scene[c.key];
   assert.equal(contract.selected,c.value);
   assert.equal(contract.method,c.execution.method);
   assert.ok(!('incomplete_if' in contract),'Repeated audit failures must stay out of the drawing request');
   assert.deepEqual(c.execution.evidence.map(e=>'領域「'+e.region+'」で要求「'+e.required+'」が満たされない場合、この選択は未達成。'),c.execution.reject);
   for(const s of c.sections)assert.ok(input.includes(s.text));
  }
  assert.equal(json.typography.line.selected,values.line);
  assert.equal(plan.conditions.length,10);
  const id=q.key+'\0'+value;
  if(!entries.has(id))entries.set(id,{key:q.key,value,method:e.method,evidence:e.evidence,
   reject:e.reject,instruction:'implemented-and-export-checked',image:'not-validated',modes:[]});
  entries.get(id).modes.push(mode);occurrences++;
 }
 const baseCase={...base,design:'通常の一枚絵',type:'文字を一切入れない',line:'セリフなし',medium:'クリスタル透光アニメ',palette:'金と黒の二色'};
 const limited=produce(baseCase,mode);
 assert.ok(limited.json.drawing.method.includes('金と黒だけ'));
 assert.equal(limited.json.copy.length,0);
 assert.ok(limited.json.drawing.optics.join(' ').includes('虹色は描かず'));
 const scenery=produce({...baseCase,costume:'風景を主役にする',mood:'目を閉じて安らぐ',pose:'全力で走る'},mode);
 assert.ok(scenery.plan.noPerson);
 assert.ok(scenery.json.scene.pose.applicability.includes('非適用'));
 assert.ok(scenery.json.scene.mood.applicability.includes('非適用'));
 assert.ok(scenery.json.scene.pose.method.includes('景物へ適用しない'));
 const blocked=produce({...baseCase,type:'クリエイター名だけ',line:'鏡の向こうで、続きを話そう。'},mode);
 assert.deepEqual(blocked.json.copy,[{role:'作者名',text:'TEST'}]);
 assert.ok(blocked.json.typography.line.method.includes('画像には描かない'));
}
applyCollection('halloween');
assert.equal(entries.size,584);assert.equal(occurrences,983);
const byKey=Object.fromEntries([...new Set([...entries.values()].map(e=>e.key))].map(key=>[key,[...entries.values()].filter(e=>e.key===key).length]));
const report={date:'2026-10-07',scope:'Per-option execution input coverage; not generated-image acceptance',unique:entries.size,occurrences,byKey,entries:[...entries.values()]};
if(process.argv.includes('--save')){
 const dir=new URL('../verification/v18/',import.meta.url);fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(new URL('option-execution.json',dir),JSON.stringify(report,null,2));
}
console.log('PASS individual execution: '+occurrences+' occurrences / '+entries.size+' options. All 10 contracts and each nested line reach the real image-call input; no-person, limited colors and copy boundaries checked. Generated-image quality remains unvalidated.');
