import assert from 'node:assert/strict';
import {applyCollection} from '../collection.js?v=28.0.2';
import {resolveSelections} from '../catalog.js?v=28.0.2';
import {initialSelections} from '../modes.js?v=28.0.2';
import {buildDirection} from '../direction.js?v=28.0.2';
import {applyPose} from '../poses.js?v=28.0.2';
import {productionPlan,repairPrompt} from '../production-plan.js?v=28.0.2';
import {composePrompt} from '../prompt.js?v=28.0.2';
import {renderSelectionMaterial,renderChatInput,renderInput} from '../compiled-production.js?v=28.0.2';
import {composeArtworkStage,composeArtworkRepair} from '../artwork-stage.js?v=28.0.2';
import {cameraContract} from '../angles.js?v=28.0.2';
import {creatorHandoff} from '../creator-handoff.js?v=28.0.2';
import {selectionIntegrationInstructions,imageOutputContract,imageDeliveryRepairPrompt} from '../output-contract.js?v=28.0.2';

// These tests inspect the material and instructions sent to ChatGPT. They do
// not execute AI synthesis or claim that an image model obeyed the selections.
const sourceStart='【統合するための制作仕様：開始】',sourceEnd='【統合するための制作仕様：終了】';
const selectedSource='【選択済みの仕様資料：一場面へ統合する】';
const auditMarker='\n\n【全選択の個別レシピ】';
const artworkKeys=['medium','theme','costume','mood','place','angle','pose','palette'];
const random=()=>.23;
const base={sceneUnified:true,theme:'空中都市',design:'パンク・フライヤー',medium:'アメコミのインク画',costume:'参照画像の衣装を生かす',pose:'膝を抱えて座る',mood:'完全な左横顔90度',angle:'真上から・90度',palette:'群青 × 月白 × 銀',type:'デザインに合わせて自動編集',line:'セリフなし',size:'A4縦・300dpi目安｜2480×3508｜210:297'};
const cases=[
 {name:'top city / punk / ink / knees / left profile',collection:'halloween',values:{},profile:creatorHandoff('integration_test','検査作者')},
 {name:'everyday custom scene',collection:'everyday',values:{theme:'朝の喫茶店で手紙を読む',design:'広告ビジュアル',medium:'透明水彩',pose:'椅子に腰掛ける',mood:'正面・首をまっすぐ',angle:'目線の高さ・正面',palette:'モノクローム',type:'商品広告・キャッチと特徴3点'},custom:true},
 {name:'no person / no text',collection:'everyday',values:{costume:'風景を主役にする',pose:'おまかせ',mood:'毎回大胆に変える',type:'文字を一切入れない'},noPerson:true},
 {name:'weekly cover / two permitted copy roles',collection:'halloween',values:{design:'週刊誌の表紙',type:'ミニマル広告・見出しと名前',angle:'斜め前45度',mood:'正面・首をまっすぐ'},profile:creatorHandoff('integration_test','検査作者'),limitedCopy:true}
];
const includes=(text,clause,label)=>assert.ok(text.includes(clause),label+' lost: '+clause);
const integration=selectionIntegrationInstructions.join('\n');
assert.ok(selectionIntegrationInstructions.length>=4,'The handoff must include a synthesis procedure, not merely rename a heading');
assert.match(integration,/ChatGPT側|ChatGPTが/,'The tool must delegate semantic synthesis to ChatGPT');
assert.match(integration,/全項目を選び終えた|全選択.*確定|選択済み/,'Synthesis must follow complete selection');
assert.match(integration,/全文.*そのまま.*渡.*しない|全文.*直送.*禁止/,'Raw specification must not be the image-call payload');
assert.match(integration,/一つの整合した完成場面|一場面.*統合|一つの完成場面/);
assert.match(integration,/まとめてから.*画像作成|統合.*後.*画像作成/,'Synthesis must happen before the image call');
assert.match(integration,/アングルの数値|数値.*角度/);
assert.match(integration,/身体配置・支持点|姿勢.*支持/);
assert.match(integration,/衝突.*伝え|両立.*伝え/,'Impossible explicit selections must not be silently discarded');
assert.match(integration,/完成画像1枚.*生成と表示|画像.*生成.*表示まで/,'The handoff must continue through image creation and display');
for(const clause of selectionIntegrationInstructions)includes(imageOutputContract.join('\n'),clause,'common output contract');

let checked=0;
try{
 for(const item of cases){
  applyCollection(item.collection);
  const supplied={...initialSelections(),...base,...item.values};
  const values=resolveSelections(supplied,random);
  const profile=item.profile||{displayName:'検査作者',activityEnabled:false};
  const variant=applyPose(buildDirection([],values.mood,random,item.collection,values),values.pose);
  const plan=productionPlan(profile,values,variant,item.collection,random);
  const references=item.noPerson?[]:[{name:'identity-reference.png',role:'identity'},{name:'auxiliary-reference.png',role:'auxiliary'},{name:'avoid-reference.png',role:'avoid'}];
  const native=renderSelectionMaterial(plan);
  assert.equal(native,renderChatInput(plan),'The legacy renderChatInput alias must preserve the source-material primitive');
  const prompt=composePrompt({collection:item.collection,creator:profile.id,profile,values,variant:plan.variant,references,edition:'SELECTION-INTEGRATION',preparedPlan:plan});
  const result={edition:'SELECTION-INTEGRATION',prompt,production:plan,values};
  const routes={native,master:prompt,artwork:composeArtworkStage(plan),embeddedArtwork:composeArtworkStage(plan,{embedded:true}),artworkRepair:composeArtworkRepair(plan),compactArtworkRepair:composeArtworkRepair(plan,{compact:true}),repair:repairPrompt(result),deliveryRepair:imageDeliveryRepairPrompt(result)};
  for(const [route,text] of Object.entries(routes)){
   if(route!=='native')for(const clause of selectionIntegrationInstructions)includes(text,clause,item.name+' / '+route);
   assert.doesNotMatch(text,/【画像生成へ渡す作画条件：(?:開始|終了)】|以下の描画条件だけを画像生成機能へ渡し|下の「画像生成へ渡す作画条件」の内容/,'An old raw-input instruction survived in '+route);
   assert.doesNotMatch(text,/undefined|NaN/);
   assert.doesNotMatch(text,/(?:このツール|ツール側).{0,20}(?:AIで統合|意味を理解|矛盾を自動解消)|(?:AIで統合|矛盾を自動解消)済み/,'The deterministic tool must not claim completed AI synthesis');
  }
  const from=prompt.indexOf(sourceStart),to=prompt.indexOf(sourceEnd);
  assert.ok(from>=0&&to>from,item.name+' has no delimited source material');
  const material=prompt.slice(from+sourceStart.length,to);
  includes(material,selectedSource,item.name+' material heading');
  assert.ok(prompt.indexOf(selectionIntegrationInstructions[0])<from,'The synthesis contract must be read before the source material');
  assert.ok(native.indexOf('【固定カメラ：描画前に確定】')<native.indexOf(selectedSource),'Camera geometry must precede per-option source clauses');
  assert.ok(!native.includes('【全選択の個別レシピ】'),'The native handoff must label recipes as synthesis material');
  const audit=renderInput(plan),structured=JSON.parse(audit.split(auditMarker)[0]);
  includes(audit,auditMarker,'audit export compatibility');
  for(const condition of plan.conditions){
   assert.equal(condition.value,values[condition.key],condition.key+' metadata differs from its selected value');
   for(const [label,text] of [['native',native],['master material',material],['audit',audit]]){
    includes(text,condition.value,item.name+' / '+label+' / '+condition.key);
    for(const section of condition.sections)includes(text,section.text,item.name+' / '+label+' / '+condition.key+' / '+section.label);
   }
   includes(native,condition.execution.method,item.name+' native execution '+condition.key);
   if(condition.execution.line)includes(native,condition.execution.line.method,item.name+' selected dialogue');
   if(artworkKeys.includes(condition.key))for(const section of condition.sections)includes(routes.artwork,section.text,item.name+' artwork source '+condition.key);
  }
  for(const clause of Object.values(structured.required_before_details))includes(native,clause,item.name+' required condition');
  includes(native,structured.identity,item.name+' subject identity');
  assert.equal(values.place,values.theme,'A unified scene must not gain an unrelated independent place');
  for(const reference of references)includes(material,reference.name,item.name+' reference role');
  const geometry=cameraContract(values,{noPerson:plan.noPerson});
  assert.equal(structured.camera.geometry.selected,values.angle);
  for(const clause of geometry.instructions)for(const [route,text] of Object.entries(routes))includes(text,clause,item.name+' fixed camera / '+route);
  for(const slot of plan.copy.slots){includes(native,JSON.stringify(slot.text),item.name+' fixed manuscript');assert.ok(structured.copy.some(s=>s.role===slot.role&&s.text===slot.text));}
  for(const slot of plan.copy.generatedSlots||[]){includes(native,slot.role,item.name+' permitted manuscript role');assert.ok(structured.manuscript_requests.some(s=>s.role===slot.role&&s.maxCharacters===slot.maxCharacters));}
  if(profile.handoff)assert.ok(prompt.indexOf('【ChatGPTで作者を確認')<from,'Author lookup must precede specification synthesis');
  if(item.custom){
   assert.equal(plan.conditions.find(c=>c.key==='theme').known,false,'The custom scene must exercise the deterministic fallback');
   assert.equal(plan.values.theme,supplied.theme,'Custom source text must reach ChatGPT without being replaced by a canned scene');
   assert.match(native,/【作品モード】普段使い/);
   assert.doesNotMatch(plan.copy.blocks.join(' '),/HALLOWEEN|Halloween|ハロウィ/);
  }
  if(item.noPerson){
   assert.equal(plan.noPerson,true);assert.equal(plan.copy.mode,'none');
   assert.equal(structured.copy.length,0);assert.ok(!structured.manuscript_requests?.length);
   assert.match(native,/文字・数字・署名のない完成/);
   for(const text of [native,routes.artwork])assert.doesNotMatch(text,/^顔の向き：|^身体の動き：|^身体の動作：/m);
  }
  if(item.limitedCopy){
   assert.deepEqual([...plan.copy.slots,...(plan.copy.generatedSlots||[])].map(slot=>slot.role).sort(),['主見出し','作者名'].sort(),'The standard weekly-cover format must not expand the selected two-role manuscript');
   assert.match(integration,/確定原稿.*許可|許可.*原稿/);
   assert.match(integration,/形式.*(?:原稿|文字).*(?:優先|追加しない|描かない)|(?:確定原稿|許可.*役割).*(?:優先|上書き)/,'Copy permissions must explicitly override generic format text proposals');
  }
  checked++;
 }
}finally{applyCollection('halloween');}
console.log('PASS selection integration: '+checked+' user-camera/custom-scene/no-person/limited-copy cases preserve selected source material and hard constraints while the master, artwork and repair handoffs require ChatGPT synthesis before image creation; raw specification forwarding is prohibited and the legacy native-material alias remains compatible. AI synthesis and generated-image adherence are not executed or inferred by this test.');
