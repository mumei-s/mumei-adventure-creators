import assert from 'node:assert/strict';
import {assertCompactHandoff} from './compact-handoff-assertions-v28.mjs';
import {usesFocusedProduction} from '../focused-production.js?v=28.4.4';
import fs from 'node:fs';
import {questions,resolveSelections} from '../catalog.js?v=28.4.4';
import {applyCollection} from '../collection.js?v=28.4.4';
import {initialSelections} from '../modes.js?v=28.4.4';
import {buildDirection} from '../direction.js?v=28.4.4';
import {applyPose} from '../poses.js?v=28.4.4';
import {productionPlan,repairPrompt} from '../production-plan.js?v=28.4.4';
import {composePrompt} from '../prompt.js?v=28.4.4';
import {renderChatInput,renderInput} from '../compiled-production.js?v=28.4.4';
import {imageOutputContract,imageDeliveryRepairPrompt,nativeImageRequest} from '../output-contract.js?v=28.4.4';

const profile={displayName:'春野 澪',activityEnabled:false,topics:[]},random=()=>.28;
let count=0,total=0,max=0,blocked=0;
const samples=[];
for(const mode of ['halloween','everyday']){
 applyCollection(mode);
 const base=resolveSelections({...initialSelections(),costume:'参照画像の衣装を生かす'},random);
 for(const q of questions)for(const value of q.groups.flatMap(g=>g.values)){
  const values={...base,[q.key]:value};
  const variant=applyPose(buildDirection([],values.mood,random,mode,values),values.pose);
  const plan=productionPlan(profile,values,variant,mode,random);
  const result={edition:'NATIVE-19',prompt:composePrompt({profile,values,variant,collection:mode,preparedPlan:plan,edition:'NATIVE-19'})};
  const errors=plan.issues.filter(issue=>issue.severity==='error');
  if(errors.length){
   assert.match(result.prompt,/^【選択の不成立：画像生成を停止】/);
   for(const issue of errors)assert(result.prompt.includes(issue.reason));
   assert(!result.prompt.includes(nativeImageRequest)&&!result.prompt.includes(imageOutputContract[0]));
   blocked++;
  }else if(usesFocusedProduction(plan)){
   assert.ok(result.prompt.startsWith(imageOutputContract[0]+'\n選択条件を保持した完成作品は1枚。'));
   assertCompactHandoff(plan,result.prompt,mode+' / '+q.key+' / '+value);
  }else assert.ok(result.prompt.startsWith(imageOutputContract[0]+'\n'+nativeImageRequest));
  assert.doesNotMatch(result.prompt,/"required_before_details"|"cultural_foundation"|【実画像での完成検査】|60秒以内|合格基準|第2段階/);
  if(!errors.length){
   assert.match(result.prompt,/通常の生成画像として表示/);
   if(usesFocusedProduction(plan)){
    assert.match(result.prompt,/各段階の生成画像を表示して実画像を確認/,'Focused preparation may not be hidden or declared complete without image inspection');
    assert.match(result.prompt,/準備画像を完成作品と呼ばず/);
   }else assert.match(result.prompt,/非表示の再生成ループは行わない/);
   assert.match(result.prompt,/【短い統合制作指示】/);
  }
  const chatInput=renderChatInput(plan),structured=JSON.parse(renderInput(plan).split('\n\n【全選択の個別レシピ】')[0]);
  for(const clause of Object.values(structured.required_before_details))assert.ok(chatInput.includes(clause));
  assert.ok(chatInput.includes(structured.identity));
  for(const c of plan.conditions){
   assert.ok(chatInput.includes(c.execution.method));
   for(const section of c.sections)assert.ok(chatInput.includes(section.text));
   if(c.execution.line)assert.ok(chatInput.includes(c.execution.line.method));
  }
  for(const slot of plan.copy.slots)assert.ok(chatInput.includes(JSON.stringify(slot.text)));
  const recovery=imageDeliveryRepairPrompt(result);
  assert.match(recovery,/新しく描き直さず/);
  assert.match(recovery,/実際の状態/);
  assert.ok(recovery.endsWith(result.prompt));
  assert.ok(repairPrompt({...result,production:plan}).startsWith(imageOutputContract[0]));
  assert.ok(!result.prompt.includes('undefined'));
  count++;total+=result.prompt.length;max=Math.max(max,result.prompt.length);
  if(q.key==='design'&&['ファッション雑誌の表紙','週刊誌の表紙','新聞の一面'].includes(value))samples.push({mode,value,prompt:result.prompt});
 }
}
applyCollection('halloween');
const report={date:'2026-10-07',scope:'Prompt and handoff regression; no claim of ChatGPT 5.5 runtime or native UI validation',count,blocked,promptCharacters:{mean:Math.round(total/count),max},samples};
if(process.argv.includes('--save')){
 const dir=new URL('../verification/v19/',import.meta.url);fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(new URL('native-handoff.json',dir),JSON.stringify(report,null,2));
}
console.log('PASS native handoff: '+count+' choices; direct image request first; detailed recipe clauses retained in audit; actual focused identity/final stages, copy, frame, color and identity checked; no default JSON or unverified completion; native recovery; mean '+Math.round(total/count)+' chars. ChatGPT 5.5 runtime is not tested here.');
