import assert from 'node:assert/strict';
import {assertCompactHandoff} from './compact-handoff-assertions-v28.mjs';
import {usesFocusedProduction} from '../focused-production.js?v=28.4.5';
import {volumetricReferenceMedia} from '../attachment-policy.js?v=28.4.5';
import fs from 'node:fs';
import {questions,resolveSelections} from '../catalog.js?v=28.4.5';
import {applyCollection} from '../collection.js?v=28.4.5';
import {initialSelections} from '../modes.js?v=28.4.5';
import {buildDirection} from '../direction.js?v=28.4.5';
import {applyPose} from '../poses.js?v=28.4.5';
import {productionPlan,repairPrompt} from '../production-plan.js?v=28.4.5';
import {composePrompt} from '../prompt.js?v=28.4.5';
import {renderChatInput,renderInput} from '../compiled-production.js?v=28.4.5';
import {imageOutputContract,imageDeliveryRepairPrompt,nativeImageRequest} from '../output-contract.js?v=28.4.5';

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
   if(volumetricReferenceMedia.includes(plan.values.medium))assert.match(result.prompt,/【完成画像の自動制作：利用者の送信は1回】/);
   else assert.ok(result.prompt.startsWith(imageOutputContract[0]+'\n'+nativeImageRequest));
   assertCompactHandoff(plan,result.prompt,mode+' / '+q.key+' / '+value);
  }else assert.ok(result.prompt.startsWith(imageOutputContract[0]+'\n'+nativeImageRequest));
  assert.doesNotMatch(result.prompt,/"required_before_details"|"cultural_foundation"|【実画像での完成検査】|60秒以内|合格基準|第2段階/);
  if(!errors.length){
   assert.doesNotMatch(result.prompt,/人物翻訳用入力|prepared-identity\.png|2段階で実行/,'Ordinary handoff must not require user preparation');
   if(volumetricReferenceMedia.includes(plan.values.medium)){assert.match(result.prompt,/完成画像の自動制作：利用者の送信は1回/);assert.match(result.prompt,/各回の本文と、その回の参照だけ/);assert.match(result.prompt,/利用者へ中間画像の保存・命名・再アップロードを求めない/);assert.match(result.prompt,/途中画像も画像作成機能の通常表示で実際に見せ/);assert.match(result.prompt,/最終の完成画像1枚を通常表示/);}
   else{assert.match(result.prompt,/通常の生成画像として表示/);assert.match(result.prompt,/非表示の再生成ループは行わない/);assert.match(result.prompt,/通常制作：完成画像を1回で生成/);assert.match(result.prompt,/【短い統合制作指示】/);}
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
  const repaired=repairPrompt({...result,production:plan});
  if(volumetricReferenceMedia.includes(plan.values.medium)){
   if(errors.length){assert.match(repaired,/^【選択の不成立：画像生成を停止】/);for(const issue of errors)assert.ok(repaired.includes(issue.reason));}
   else{assert.match(repaired,/^【立体光彩の完成画像：不足箇所だけを編集】/);assert.match(repaired,/の2画像だけ/);assert.match(repaired,/完成画像を編集の土台/);assert.match(repaired,/最終画像1枚を通常表示/);assert.doesNotMatch(repaired,/【描いてほしい完成品】|元の制作仕様/);}
  }else assert.ok(repaired.startsWith(imageOutputContract[0]));
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
console.log('PASS native handoff: '+count+' choices; direct image execution and detailed recipe audits; original single-call and new automatic internal routes, optional flat identity preparation, copy, frame, color and identity checked; no default JSON or unverified completion; native recovery; mean '+Math.round(total/count)+' chars. ChatGPT runtime is not tested here.');
