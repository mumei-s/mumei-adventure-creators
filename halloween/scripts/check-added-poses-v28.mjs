import assert from 'node:assert/strict';
import fs from 'node:fs';
import {poseItems,poseGroups,applyPose,poseTechnical} from '../poses.js?v=28.4.5';
import {questions,resolveSelections} from '../catalog.js?v=28.4.5';
import {applyCollection} from '../collection.js?v=28.4.5';
import {optionRecipe} from '../option-recipes.js?v=28.4.5';
import {sampleFor} from '../examples.js?v=28.4.5';
import {productionPlan} from '../production-plan.js?v=28.4.5';
import {renderChatInput} from '../compiled-production.js?v=28.4.5';

const added=poseItems.slice(48),names=poseGroups.flatMap(g=>g.values);
assert.equal(poseItems.length,72);
assert.equal(added.length,24);
assert.equal(new Set(names).size,72);
assert.deepEqual(new Set(names),new Set(poseItems.map(p=>p.value)));
for(const [index,item] of poseItems.slice(0,48).entries())assert.equal(item.file,'pose-'+String(index+1).padStart(3,'0')+'.jpg','Existing previews must be retained');
assert.equal(new Set(added.map(item=>item.file)).size,24,'Every action has its own matching illustrated preview');
const seenMethods=new Set(),random=()=>.28,variant={face:'左向き45度',expression:'穏やかな表情',pose:'立つ',distance:'全身',layout:'身体全体',signature:'POSE',motif:'背景の光',camera:'正面',light:'窓からの光',depth:'前後の奥行き',motion:'静止'};
try{
 for(const collection of ['halloween','everyday']){
  applyCollection(collection);
  const available=questions.find(q=>q.key==='pose').groups.flatMap(g=>g.values);
  for(const item of added){
   assert.ok(available.includes(item.value),collection+' must expose '+item.value);
   assert.ok(item.support.length>25&&item.contact.length>25&&item.checks.length>=3);
   assert.doesNotMatch(item.value,/ローアングル|ハイアングル|俯瞰|煽り|カメラ角度/,'Camera names are a separate choice');
   const values=resolveSelections({pose:item.value,costume:'参照画像の衣装を生かす'},random);
   assert.equal(values.pose,item.value,'An explicit action must survive automatic scene choices');
   const recipe=optionRecipe('pose',item.value,{values,variant});
   assert.equal(recipe.known,true,'An added pose needs a dedicated recipe, not generic free input');
   assert.ok(recipe.sections.some(s=>s.text===item.support));
   assert.ok(recipe.sections.some(s=>s.text===item.contact));
   assert.ok(item.checks.every(check=>recipe.checks.includes(check)),'All action-specific checks must survive anatomy adaptation');
   assert.ok(poseTechnical(item.value,{values,variant}).checks.every(check=>recipe.checks.includes(check)),'Body-fit and support checks must reach the actual recipe');
   assert.ok(recipe.execution.method.includes(item.support)&&recipe.execution.method.includes(item.contact));
   seenMethods.add(recipe.execution.method);
   const posed=applyPose(variant,item.value);
   assert.equal(posed.face,variant.face);
   assert.equal(posed.expression,variant.expression);
   assert.ok(posed.pose.includes(item.text));
   const noPerson=applyPose({...variant,noPerson:true},item.value);
   assert.equal(noPerson.pose,'');assert.equal(noPerson.face,'');
   const preview=sampleFor('pose',item.value);
   assert.equal(preview.kind,'image');assert.ok(preview.src.endsWith(item.file));
   const raster=fs.readFileSync(new URL('../'+item.file,import.meta.url));
   assert.equal(raster.readUInt16BE(0),0xffd8,'The individual person illustration must be a real JPEG');
   const metadata=JSON.parse(fs.readFileSync(new URL('../'+item.file.replace('.jpg','.json'),import.meta.url),'utf8'));
   assert.equal(metadata.label,item.value);assert.equal(metadata.visualQA.status,'accepted');
   const plan=productionPlan({displayName:'POSE CHECK',topics:[]},values,posed,collection,random),input=renderChatInput(plan);
   assert.ok(input.includes(item.support)&&input.includes(item.contact));
   assert.ok(!input.includes(item.file)&&!input.includes('<svg'),'Picker schematics must not enter image-generation input');
  }
 }
 assert.equal(seenMethods.size,24,'Every added action has its own physical execution method');
 console.log('PASS 24 added poses / 72 total: both modes expose every action; dedicated support, joint/contact and anatomy checks survive image handoff; face/expression remain independent; 24 matching original person illustrations stay UI-only.');
}finally{applyCollection('halloween');}
