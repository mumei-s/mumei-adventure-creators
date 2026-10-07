import assert from 'node:assert/strict';
import fs from 'node:fs';
import {questions,resolveSelections} from '../catalog.js?v=23.0.0';
import {applyCollection} from '../collection.js?v=23.0.0';
import {initialSelections} from '../modes.js?v=23.0.0';
import {buildDirection} from '../direction.js?v=23.0.0';
import {applyPose} from '../poses.js?v=23.0.0';
import {productionPlan,repairPrompt} from '../production-plan.js?v=23.0.0';
import {composePrompt} from '../prompt.js?v=23.0.0';
import {renderChatInput,renderInput} from '../compiled-production.js?v=23.0.0';
import {imageOutputContract,imageDeliveryRepairPrompt,nativeImageRequest} from '../output-contract.js?v=23.0.0';

const profile={displayName:'春野 澪',activityEnabled:false,topics:[]},random=()=>.28;
let count=0,total=0,max=0;
const samples=[];
for(const mode of ['halloween','everyday']){
 applyCollection(mode);
 const base=resolveSelections({...initialSelections(),costume:'参照画像の衣装を生かす'},random);
 for(const q of questions)for(const value of q.groups.flatMap(g=>g.values)){
  const values={...base,[q.key]:value};
  const variant=applyPose(buildDirection([],values.mood,random,mode,values),values.pose);
  const plan=productionPlan(profile,values,variant,mode,random);
  const result={edition:'NATIVE-19',prompt:composePrompt({profile,values,variant,collection:mode,preparedPlan:plan,edition:'NATIVE-19'})};
  assert.ok(result.prompt.startsWith(imageOutputContract[0]+'\n'+nativeImageRequest));
  assert.doesNotMatch(result.prompt,/"required_before_details"|"cultural_foundation"|【実画像での完成検査】|60秒以内|合格基準|第2段階/);
  assert.match(result.prompt,/通常の生成画像として表示/);
  assert.match(result.prompt,/非表示の再生成ループは行わない/);
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
const report={date:'2026-10-07',scope:'Prompt and handoff regression; no claim of ChatGPT 5.5 runtime or native UI validation',count,promptCharacters:{mean:Math.round(total/count),max},samples};
if(process.argv.includes('--save')){
 const dir=new URL('../verification/v19/',import.meta.url);fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(new URL('native-handoff.json',dir),JSON.stringify(report,null,2));
}
console.log('PASS native handoff: '+count+' choices; direct image request first; all execution clauses, copy and frame/color/identity retained; no default JSON/audit/staging; native recovery; mean '+Math.round(total/count)+' chars. ChatGPT 5.5 runtime is not tested here.');
