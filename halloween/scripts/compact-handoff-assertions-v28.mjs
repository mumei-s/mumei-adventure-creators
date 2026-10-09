import assert from 'node:assert/strict';
import {cameraContract} from '../angles.js?v=28.4.3';
import {isPhotographicMedium} from '../photo-design.js?v=28.4.3';
import {colorPolicy} from '../color-policy.js?v=28.4.3';
import {stylePresetFor} from '../style-presets.js?v=28.4.3';
import {selectionReferenceManifest} from '../selection-references.js?v=28.4.3';
import {characterProportionInstruction} from '../source-kind.js?v=28.4.3';

const normalize=text=>String(text).replace(/\s+/g,'');
export const normalized=normalize;
export const containsInstruction=(text,clause)=>normalize(text).includes(normalize(clause));
export const sentenceClauses=text=>(String(text||'').match(/[^。！？]+[。！？]?/gu)||[]).map(clause=>clause.trim()).filter(Boolean);
export function includesClause(text,clause,label){assert.ok(normalize(text).includes(normalize(clause)),label+' lost: '+clause);}
export function compactReferences(plan,references=[]){
 plan.referenceManifest=[...[stylePresetFor(plan.values.medium)].filter(Boolean),selectionReferenceManifest(plan.values),...references];
 return plan.referenceManifest;
}
export function assertCompactHandoff(plan,text,label){
 const errors=(plan.issues||[]).filter(issue=>issue.severity==='error');
 if(errors.length){
  assert.match(text,/^【選択の不成立：画像生成を停止】/);
  assert.match(text,/画像生成を停止/,label+' must stop a hard selection conflict');
  for(const issue of errors)includesClause(text,issue.reason,label+' conflict reason');
  assert.doesNotMatch(text,/画像生成の制作仕様|【通常制作|完成作品を1枚生成|完成した画像そのもの/,label+' still requests an image for a blocked plan');
  assert.doesNotMatch(text,/ChatGPTの画像作成機能を実行|【描いてほしい完成品】/);
  return false;
 }
 assert.match(text,/【短い統合制作指示】/,label+' must use the actual compact route');
 assert.equal((text.match(/【短い統合制作指示】/g)||[]).length,1);
 for(const condition of plan.conditions)includesClause(text,condition.name+'＝'+condition.value,label+' selected '+condition.key);
 const camera=cameraContract(plan.values,{noPerson:plan.noPerson});
 if(camera){
  for(const clause of sentenceClauses(camera.instructions[0]))includesClause(text,clause,label+' absolute camera projection');
  for(const clause of sentenceClauses(camera.framing_instruction))includesClause(text,clause,label+' fixed visible framing');
  assert.match(text,/距離調整は同じ光軸上だけ/,label+' must not move to another camera to fit the scene');
 }else{
  includesClause(text,plan.values.angle,label+' literal custom camera');
  includesClause(text,plan.variant.camera,label+' resolved camera');
  includesClause(text,plan.variant.distance,label+' selected crop/distance');
 }
 if(plan.noPerson){
  assert.match(text,/人物なし/,label+' lost the no-person subject');
  assert.match(text,/顔・人体・手足・人型へ見立てない/,label+' can invent a human subject');
 }else{
  if(['scenery','mark-object'].includes(plan.values.sourceKind)){
   assert.match(text,/独自の主役を設計|独自の主役/,label+' lost the designed actor from non-person input');
   assert.match(text,/顔・髪・年齢・性別を復元したとは扱わず|存在しない顔や身体を本人として復元しない/,label+' falsely restores a source person');
  }else{
   assert.match(text,/年齢感・性別表現|年齢感、性別/,label+' lost age/gender identity');
   assert.match(text,/基礎体格|体格/,label+' lost the source build');
  }
  assert.match(text,/衣装の被覆|形と被覆|構造と被覆/,label+' lost coverage');
  assert.match(text,/閉眼.*髪なし|閉眼は開かず/,label+' can open eyes or invent hair for style details');
  for(const field of ['face','expression','pose'])for(const clause of sentenceClauses(plan.variant[field]))includesClause(text,clause,label+' selected '+field);
  if(isPhotographicMedium(plan.values.medium)){
   assert.match(text,/自然な頭蓋・眼球・人体|自然な人物立体/,label+' lost photographic anatomy');
   assert.match(text,/輪郭線やセル影を残さず|描線やセル色を残さず|輪郭線.*セル塗り.*残さ/,label+' retains an illustrated surface instead of reconstruction');
   assert.doesNotMatch(text,/基本頭身は主参照を保ち、ちびキャラなど頭身変更を明示した選択だけ/,label+' locks exaggerated drawn proportions in a photograph');
  }else for(const clause of sentenceClauses(characterProportionInstruction(plan.values,{noPerson:false})))includesClause(text,clause,label+' chosen/reference drawing proportions');
 }
 includesClause(text,colorPolicy(plan.values).allowed,label+' allowed colors');
 if(colorPolicy(plan.values).restricted)assert.match(text,/識別色.*許可色.*濃淡|許可色の明度差/,label+' preserves source hues outside a restricted palette');
 if(plan.copy.mode==='none')assert.match(text,/文字・数字・署名なし/,label+' added a manuscript');
 for(const slot of plan.copy.slots)includesClause(text,slot.role+'：'+JSON.stringify(slot.text),label+' exact copy');
 for(const slot of plan.copy.generatedSlots||[]){
  includesClause(text,slot.role+' / '+slot.maxCharacters+'字以内 / 階層'+slot.priority,label+' editorial role/limit/priority');
  if(slot.contentSources)includesClause(text,JSON.stringify(slot.contentSources),label+' separated reader-copy sources');
 }
 if(plan.copy.mode!=='none')assert.match(text,/形式の標準役割は文字許可を増やさない/);
 if(plan.collection==='halloween')assert.match(text,/10月31日.*出来事と目的/);
 else assert.match(text,/Halloweenを自動追加しない/);
 assert.match(text,/同じ工程|同じ描画|同じ制作/,label+' can leave only the background in the selected medium');
 assert.doesNotMatch(text,/undefined|NaN|両手の全指/,label+' contains unresolved values or forces hidden fingers');
 return true;
}

// These sections are responsibility-wide wording, checked above as identity,
// camera, manuscript and reference roles. Every other authored physical clause
// remains literal (ignoring whitespace), rather than merely checking its title.
const owned=/^(作画基準／全域への適用|入力画像の種類と変換|固定カメラでの解釈|今回実行する表情と向き|今回実行する動作|自動カメラと顔の見え方の注意|自動候補の再利用の注意|イラスト参照から人物へ|イラスト参照から実物へ|非人物入力から独自の人物へ|同一人物への着装|元の体格に合う動作|顔角度との両立|投影と演技の独立|選択した造形とカメラの保持|縮小と拡大での完成照合|実寸の照合|Halloween版／)/;
export function assertCompactEngineering(plan,text,sections,label){
 if((plan.issues||[]).some(issue=>issue.severity==='error'))return;
 for(const section of sections){
  if(owned.test(section.label))continue;
  if(section.label==='画風プリセットの使い方'){
   if(['宝石光彩アニメ','宝石光彩リアル'].includes(plan.values.medium)&&!section.text.startsWith('【'))for(const clause of sentenceClauses(section.text))includesClause(text,clause,label+' independent reference density');
   continue;
  }
  if(['発光幻想アニメ','発光幻想リアル'].includes(plan.values.medium)&&(section.label.startsWith('作画基準／')||section.label==='日本を基準にした個別条件'))continue;
  for(const clause of sentenceClauses(section.text))includesClause(text,clause,label+' physical '+section.label);
 }
}
