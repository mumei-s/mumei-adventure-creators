import assert from 'node:assert/strict';
import {worldTransferPrompts,renderWorldTransferMaster} from '../world-transfer-production.js?v=28.4.6';
import {cameraContract} from '../angles.js?v=28.4.6';
import {colorPolicy} from '../color-policy.js?v=28.4.6';
import {isNonHumanSource} from '../source-kind.js?v=28.4.6';
import {designLayoutFor,typographyLayoutFor} from '../layout-preview-specs.js?v=28.4.6';

const clauses=text=>(String(text||'').match(/[^。！？]+[。！？]?/gu)||[]).map(clause=>clause.trim()).filter(Boolean);
const includes=(text,value,label)=>assert.ok(text.replace(/\s/g,'').includes(String(value).replace(/\s/g,'')),label+' lost: '+value);
export function assertWorldTransferHandoff(plan,text,label='world transfer',refs=plan.referenceManifest||[]){
 const workflow=worldTransferPrompts(plan,refs);
 assert.ok(workflow);assert.equal(workflow.kind,'world-transfer');assert.equal(workflow.internal,true);assert.equal(workflow.userPreparationRequired,false);
 if(workflow.blocked){assert.match(text,/^【選択の不成立：画像生成を停止】/);assert.equal(workflow.stages.length,0);assert.doesNotMatch(text,/【内部制作|【この回だけの画像入力/);return false;}
 const master=renderWorldTransferMaster(plan,refs);
 includes(text,master,label+' actual complete-image master');
 assert.equal((text.match(/【完成画像の自動制作：利用者の送信は1回】/g)||[]).length,1);
 assert.doesNotMatch(text,/undefined|NaN|prepared-identity\.png|人物翻訳用入力/);
 assert.match(text,/利用者へ中間画像の保存・命名・再アップロードを求めない/);
 assert.match(master,/^【完成画像の自動制作：利用者の送信は1回】\n画像作成機能を実行し、.*完成画像1枚を1回で生成/);
 assert.match(text,/画像が表示されるまで文章だけで終了せず/);
 assert.match(text,/通常の生成画像としてこのチャットに表示する/);
 assert.doesNotMatch(master,/【内部制作|【この回だけの画像入力|この回の添付：|最初の差替後|担当見本\d枚以内/);
 assert.doesNotMatch(master,/不足があればその生成画像を編集|実際の(?:生成)?寸法(?:が)?不足|未達なら.*編集し|合格を確認した実画像だけを次へ/);
 assert.match(text,/要求サイズ「/);assert.match(text,/縦横比と安全余白/);
 assert.equal(workflow.status,'requires-generated-image-verification');assert.equal(workflow.sourceReattachment,false);
 assert.deepEqual(workflow.conditions,plan.conditions.map(({key,name,value})=>({key,name,value})));
 const keys=new Set(workflow.stages.map(stage=>stage.key));assert.equal(keys.size,workflow.stages.length);assert.ok(keys.has(workflow.finalStage));
 for(const condition of plan.conditions){includes(text,condition.name+'＝'+condition.value,label+' choice '+condition.key);assert.ok(workflow.conditionOwners[condition.key]?.length);for(const owner of workflow.conditionOwners[condition.key])assert.ok(keys.has(owner),label+' dangling condition owner '+condition.key+'→'+owner);}
 // The optional workflow remains independently executable and strict, but its
 // intermediate prompts must never replace the standard complete-image input.
 for(const stage of workflow.stages){
  assert.ok(!master.includes(stage.prompt),label+' leaks optional '+stage.key+' instructions into standard delivery');assert.equal(stage.requiresVisualVerification,true);assert.ok(stage.acceptance.length);assert.ok(stage.references.length<=5,label+' exceeds the observed image-tool limit');assert.ok(stage.outputRole);
  for(const ref of stage.references){assert.ok(ref.name||ref.file);if(ref.generated)assert.equal(ref.requiresActualImage,true,label+' unverified intermediate '+stage.key);}
  if(stage.key!=='world')assert.ok(!stage.references.some(ref=>ref.role==='identity'),label+' reattaches original identity at '+stage.key);
 }
 const world=workflow.stages.find(stage=>stage.key==='world'),surface=workflow.stages.find(stage=>stage.key==='surface'),scenes=workflow.stages.filter(stage=>stage.kind==='scene-edit'),layout=workflow.stages.find(stage=>stage.kind==='layout');
 assert.deepEqual(world.references.map(ref=>ref.role),refs.some(ref=>ref.role==='identity')?['identity','style-preset']:['style-preset']);
 assert.equal(surface.optional,true);assert.match(surface.appliesWhen,/実画像/);assert.deepEqual(surface.references.map(ref=>ref.role),['world-base','style-preset']);
 assert.match(world.prompt,/原画の人物・顔・髪・体格・衣服・小道具・背景・姿勢・構図を採用しない/);assert.match(world.prompt,/中間画像.*完成作品ではない/);assert.match(surface.prompt,/未達の造形と可視面の光・影だけを修正/);
 const sceneText=scenes.map(stage=>stage.prompt).join('\n'),person=!plan.noPerson&&!isNonHumanSource(plan.values);
 if(plan.noPerson){for(const stage of [world,surface,...scenes]){assert.match(stage.prompt,/人物.*顔.*人体.*手足.*人型.*追加しない/);assert.doesNotMatch(stage.prompt,/本人へ差し替|本人の輪郭|本人の識別特徴|自然な頭蓋・眼球|トゥーンの顔と身体/);}assert.doesNotMatch(sceneText,/顔の向き：|表情：|身体配置・支持・動作：/);}
 else if(!person){assert.match(world.prompt,/独自の主役/);assert.match(world.prompt,/本人の顔・髪・年齢・性別を復元したと主張しない/);assert.doesNotMatch([world.prompt,surface.prompt,sceneText].join('\n'),/本人へ差し替|本人の輪郭|本人の識別特徴/);}
 else {assert.match(world.prompt,/主参照の本人だけを描く/);for(const value of ['輪郭','眉と目鼻口','実際の髪型','年齢感・性別表現・体格・基本頭身'])includes(world.prompt,value,label+' identity');assert.match(world.prompt,/ちび.*通常頭身へ伸ばさない/);assert.match(world.prompt,/閉眼・髪なし・元々ある髭・被覆・遮蔽/);}
 assert.doesNotMatch([world.prompt,surface.prompt,sceneText].join('\n'),/同じ2Dの形と色面へ|2～3つの明確なセル影|写真顔・プラスチックCG/);
 assert.match(sceneText,/全可視面の局所反射と深暗部/);assert.match(sceneText,/不合格を完成扱いしない/);
 const camera=cameraContract(plan.values,{noPerson:plan.noPerson});
 for(const payload of [master,sceneText]){
  if(camera){for(const clause of clauses(camera.instructions[0]))includes(payload,clause,label+' projection');for(const clause of clauses(camera.framing_instruction))includes(payload,clause,label+' framing');for(const line of camera.instructions.filter(line=>/^光軸は/.test(line)))includes(payload,line,label+' occlusion');assert.match(payload,/距離調整は同じ光軸上だけ/);}
  else {if(plan.values.angle)includes(payload,plan.values.angle,label+' custom angle');if(plan.variant?.camera)includes(payload,plan.variant.camera,label+' custom camera');if(plan.variant?.distance)includes(payload,plan.variant.distance,label+' custom crop');}
  if(plan.values.verticalFovDegrees)includes(payload,'垂直画角'+plan.values.verticalFovDegrees+'°',label+' FOV');
  if(!plan.noPerson)for(const key of ['face','expression','pose'])for(const clause of clauses(plan.variant?.[key]))includes(payload,clause,label+' '+key);
  const palette=colorPolicy(plan.values);includes(payload,palette.allowed,label+' palette');includes(payload,'最明部は'+palette.bright,label+' highlights');includes(payload,'最暗部は'+palette.dark,label+' shadows');
  if(plan.collection==='halloween'){assert.match(payload,/Halloween版/);assert.match(payload,/10月31日/);assert.match(payload,/カボチャ一個・題名だけ/);}else assert.match(payload,/Halloweenを自動追加しない/);
 }
 if(!plan.noPerson)assert.match(sceneText,/基本頭身.*被覆と遮蔽/);
 if(colorPolicy(plan.values).restricted){assert.match(sceneText,/識別色・肌・光・反射も許可色の濃淡だけ/);assert.match(master,/全領域の識別色・光・反射・文字も許可色の濃淡へ変換/);}
 includes(sceneText,plan.values.size,label+' size');
 if(layout){
  assert.equal(layout.references[0].role,'scene-result');assert.ok(layout.references.slice(1).every(ref=>ref.role==='selection-sheet'||ref.role==='selection-condition'&&['design','type'].includes(ref.key)));assert.match(layout.prompt,/可視矩形全体.*縦横比を保った同一縮尺/);assert.match(layout.prompt,/トリミング、引き伸ばし.*しない/);assert.match(layout.prompt,/主図版.*1点だけ/);
  const design=designLayoutFor(plan.values.design);if(design)includes(layout.prompt,design.signature,label+' layout skeleton');
  if(design){includes(master,design.signature,label+' standard layout skeleton');for(const frame of design.frames||[])includes(master,'x'+frame.x+'%・y'+frame.y+'%・幅'+frame.w+'%・高さ'+frame.h+'%',label+' standard information frame');}
  assert.equal(layout.layout.manuscriptCount,plan.copy.mode==='none'?0:plan.copy.slots.length+(plan.copy.generatedSlots||[]).length);
  for(const payload of [master,layout.prompt]){
   if(plan.copy.mode==='none')assert.match(payload,/文字・数字・ロゴ・サイン・署名・疑似文字.*一切入れない/);
   for(const slot of plan.copy.slots)includes(payload,'確定原稿／'+slot.role+'／階層'+(slot.priority??2)+'：'+JSON.stringify(slot.text),label+' exact copy');
   for(const slot of plan.copy.generatedSlots||[])includes(payload,'許可編集／'+slot.role+'／'+slot.maxCharacters+'字以内／階層'+(slot.priority??2),label+' generated copy');
   if(plan.copy.mode!=='none'){assert.match(payload,/未許可の誌名.*形式から補完しない/);const type=typographyLayoutFor(plan.values.type);if(type&&plan.values.type!=='デザインに合わせて自動編集'){includes(payload,type.quantity,label+' copy quantity');includes(payload,type.direction,label+' copy direction');includes(payload,type.placement,label+' copy placement');}}
  }
 }else {assert.equal(plan.copy.mode,'none');assert.equal(workflow.finalStage,scenes.at(-1).key);const design=designLayoutFor(plan.values.design);if(design){includes(scenes.at(-1).prompt,design.signature,label+' final image-form skeleton');includes(master,design.signature,label+' standard image-form skeleton');}assert.match(master,/文字・数字・署名なし/);}
 for(const ref of refs)if(ref.name||ref.file)includes(master,ref.name||ref.file,label+' supplied reference role');
 assert.match(master,/全可視域.*反射色層|反射色層の密度を全可視域/);assert.match(master,/肌・布・金属をガラス化せず/);
 if(plan.noPerson){assert.match(master,/顔・人体・手足・人型や擬人化を追加しない/);assert.doesNotMatch(master,/顔の向き：|虹彩の縁|本人へ差し替/);}
 else if(!person){assert.match(master,/識別資料はない/);assert.match(master,/独自の主役/);assert.doesNotMatch(master,/本人へ差し替|本人の識別特徴/);}
 else {assert.match(master,/眉・目鼻口・顎・首/);assert.match(master,/年齢感・性別表現・基礎体格/);assert.match(master,/元々ある髭/);assert.match(master,/閉眼は閉じたまま、髪なしは髪なし/);}
 return true;
}
