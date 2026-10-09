import assert from 'node:assert/strict';
import {worldTransferPrompts,renderWorldTransferMaster} from '../world-transfer-production.js?v=28.4.5';
import {cameraContract} from '../angles.js?v=28.4.5';
import {colorPolicy} from '../color-policy.js?v=28.4.5';
import {isNonHumanSource} from '../source-kind.js?v=28.4.5';
import {designLayoutFor,typographyLayoutFor} from '../layout-preview-specs.js?v=28.4.5';

const clauses=text=>(String(text||'').match(/[^。！？]+[。！？]?/gu)||[]).map(clause=>clause.trim()).filter(Boolean);
const includes=(text,value,label)=>assert.ok(text.replace(/\s/g,'').includes(String(value).replace(/\s/g,'')),label+' lost: '+value);
export function assertWorldTransferHandoff(plan,text,label='world transfer',refs=plan.referenceManifest||[]){
 const workflow=worldTransferPrompts(plan,refs);
 assert.ok(workflow);assert.equal(workflow.kind,'world-transfer');assert.equal(workflow.internal,true);assert.equal(workflow.userPreparationRequired,false);
 if(workflow.blocked){assert.match(text,/^【選択の不成立：画像生成を停止】/);assert.equal(workflow.stages.length,0);assert.doesNotMatch(text,/【内部制作|【この回だけの画像入力/);return false;}
 const master=renderWorldTransferMaster(plan,refs);
 includes(text,master,label+' actual internally scoped master');
 assert.equal((text.match(/【完成画像の自動制作：利用者の送信は1回】/g)||[]).length,1);
 assert.doesNotMatch(text,/undefined|NaN|prepared-identity\.png|人物翻訳用入力|【通常制作：完成画像を1回で生成】/);
 assert.match(text,/利用者へ中間画像の保存・命名・再アップロードを求めない/);
 assert.match(text,/生成画像のファイル名や説明だけで生成・確認済みと扱わない/);
 assert.equal(workflow.status,'requires-generated-image-verification');assert.equal(workflow.sourceReattachment,false);
 assert.deepEqual(workflow.conditions,plan.conditions.map(({key,name,value})=>({key,name,value})));
 const keys=new Set(workflow.stages.map(stage=>stage.key));assert.equal(keys.size,workflow.stages.length);assert.ok(keys.has(workflow.finalStage));
 for(const condition of plan.conditions){includes(text,condition.name+'＝'+condition.value,label+' choice '+condition.key);assert.ok(workflow.conditionOwners[condition.key]?.length);for(const owner of workflow.conditionOwners[condition.key])assert.ok(keys.has(owner),label+' dangling condition owner '+condition.key+'→'+owner);}
 assert.equal((text.match(/【この回だけの画像入力：開始】/g)||[]).length,workflow.stages.length);assert.equal((text.match(/【この回だけの画像入力：終了】/g)||[]).length,workflow.stages.length);
 for(const stage of workflow.stages){
  includes(text,stage.prompt,label+' actual '+stage.key+' payload');assert.equal(stage.requiresVisualVerification,true);assert.ok(stage.acceptance.length);assert.ok(stage.references.length<=5,label+' exceeds the observed image-tool limit');assert.ok(stage.outputRole);
  for(const ref of stage.references){assert.ok(ref.name||ref.file);if(ref.generated)assert.equal(ref.requiresActualImage,true,label+' unverified intermediate '+stage.key);}
  if(stage.key!=='world')assert.ok(!stage.references.some(ref=>ref.role==='identity'),label+' reattaches original identity at '+stage.key);
 }
 const world=workflow.stages.find(stage=>stage.key==='world'),surface=workflow.stages.find(stage=>stage.key==='surface'),scenes=workflow.stages.filter(stage=>stage.kind==='scene-edit'),layout=workflow.stages.find(stage=>stage.kind==='layout');
 assert.deepEqual(world.references.map(ref=>ref.role),refs.some(ref=>ref.role==='identity')?['style-preset','identity']:['style-preset']);
 assert.equal(surface.optional,true);assert.match(surface.appliesWhen,/実画像/);assert.deepEqual(surface.references.map(ref=>ref.role),['world-base','style-preset']);
 assert.match(world.prompt,/衣服・背景・姿勢・構図を維持/);assert.match(world.prompt,/中間画像.*完成作品ではない/);assert.match(surface.prompt,/未達の造形と可視面の光・影だけを修正/);
 const sceneText=scenes.map(stage=>stage.prompt).join('\n'),person=!plan.noPerson&&!isNonHumanSource(plan.values);
 if(plan.noPerson){for(const stage of [world,surface,...scenes]){assert.match(stage.prompt,/人物.*顔.*人体.*手足.*人型.*追加しない/);assert.doesNotMatch(stage.prompt,/本人へ差し替|本人の輪郭|本人の識別特徴|自然な頭蓋・眼球|トゥーンの顔と身体/);}assert.doesNotMatch(sceneText,/顔の向き：|表情：|身体配置・支持・動作：/);}
 else if(!person){assert.match(world.prompt,/独自の主役/);assert.match(world.prompt,/本人の顔・髪・年齢・性別を復元したと主張しない/);assert.doesNotMatch([world.prompt,surface.prompt,sceneText].join('\n'),/本人へ差し替|本人の輪郭|本人の識別特徴/);}
 else {assert.match(world.prompt,/識別特徴だけを2枚目の本人へ差し替/);for(const value of ['輪郭','眉と目鼻口','実際の髪型','年齢感・性別表現・体格・基本頭身'])includes(world.prompt,value,label+' identity');assert.match(world.prompt,/ちび.*通常頭身へ伸ばさない/);assert.match(world.prompt,/閉眼・髪なし・元々ある髭・被覆・遮蔽/);}
 assert.doesNotMatch([world.prompt,surface.prompt,sceneText].join('\n'),/同じ2Dの形と色面へ|2～3つの明確なセル影|写真顔・プラスチックCG/);
 assert.match(sceneText,/全可視面の局所反射と深暗部/);assert.match(sceneText,/不合格を完成扱いしない/);
 const camera=cameraContract(plan.values,{noPerson:plan.noPerson});
 if(camera){for(const clause of clauses(camera.instructions[0]))includes(sceneText,clause,label+' projection');for(const clause of clauses(camera.framing_instruction))includes(sceneText,clause,label+' framing');for(const line of camera.instructions.filter(line=>/^光軸は/.test(line)))includes(sceneText,line,label+' occlusion');assert.match(sceneText,/距離調整は同じ光軸上だけ/);}
 else {if(plan.values.angle)includes(sceneText,plan.values.angle,label+' custom angle');if(plan.variant?.camera)includes(sceneText,plan.variant.camera,label+' custom camera');if(plan.variant?.distance)includes(sceneText,plan.variant.distance,label+' custom crop');}
 if(plan.values.verticalFovDegrees)includes(sceneText,'垂直画角'+plan.values.verticalFovDegrees+'°',label+' FOV');
 if(!plan.noPerson){for(const key of ['face','expression','pose'])for(const clause of clauses(plan.variant?.[key]))includes(sceneText,clause,label+' '+key);assert.match(sceneText,/基本頭身.*被覆と遮蔽/);}
 const palette=colorPolicy(plan.values);includes(sceneText,palette.allowed,label+' palette');includes(sceneText,'最明部は'+palette.bright,label+' highlights');includes(sceneText,'最暗部は'+palette.dark,label+' shadows');if(palette.restricted)assert.match(sceneText,/識別色・肌・光・反射も許可色の濃淡だけ/);
 if(plan.collection==='halloween'){assert.match(sceneText,/Halloween版/);assert.match(sceneText,/10月31日/);assert.match(sceneText,/カボチャ一個・題名だけ/);}else assert.match(sceneText,/Halloweenを自動追加しない/);
 includes(sceneText,plan.values.size,label+' size');
 if(layout){
  assert.equal(layout.references[0].role,'scene-result');assert.ok(layout.references.slice(1).every(ref=>ref.role==='selection-sheet'||ref.role==='selection-condition'&&['design','type'].includes(ref.key)));assert.match(layout.prompt,/可視矩形全体.*縦横比を保った同一縮尺/);assert.match(layout.prompt,/トリミング、引き伸ばし.*しない/);assert.match(layout.prompt,/主図版.*1点だけ/);
  const design=designLayoutFor(plan.values.design);if(design)includes(layout.prompt,design.signature,label+' layout skeleton');
  assert.equal(layout.layout.manuscriptCount,plan.copy.mode==='none'?0:plan.copy.slots.length+(plan.copy.generatedSlots||[]).length);
  if(plan.copy.mode==='none')assert.match(layout.prompt,/文字・数字・ロゴ・サイン・署名・疑似文字.*一切入れない/);
  for(const slot of plan.copy.slots)includes(layout.prompt,'確定原稿／'+slot.role+'／階層'+(slot.priority??2)+'：'+JSON.stringify(slot.text),label+' exact copy');
  for(const slot of plan.copy.generatedSlots||[])includes(layout.prompt,'許可編集／'+slot.role+'／'+slot.maxCharacters+'字以内／階層'+(slot.priority??2),label+' generated copy');
  if(plan.copy.mode!=='none'){assert.match(layout.prompt,/未許可の誌名.*形式から補完しない/);const type=typographyLayoutFor(plan.values.type);if(type&&plan.values.type!=='デザインに合わせて自動編集'){includes(layout.prompt,type.quantity,label+' copy quantity');includes(layout.prompt,type.direction,label+' copy direction');includes(layout.prompt,type.placement,label+' copy placement');}}
 }else {assert.equal(plan.copy.mode,'none');assert.equal(workflow.finalStage,scenes.at(-1).key);const design=designLayoutFor(plan.values.design);if(design)includes(scenes.at(-1).prompt,design.signature,label+' final image-form skeleton');assert.match(text,/全\d+選択・文字の不在・外周余白.*実画像で照合/);}
 assert.match(text,/実際の寸法不足、未実行・未確認・不合格.*未達を完成と報告しない/);
 return true;
}
