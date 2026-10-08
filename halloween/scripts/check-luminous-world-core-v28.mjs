import assert from 'node:assert/strict';
import {questions} from '../catalog.js?v=28.4.0';
import {applyCollection} from '../collection.js?v=28.4.0';
import {initialSelections} from '../modes.js?v=28.4.0';
import {buildDirection} from '../direction.js?v=28.4.0';
import {applyPose} from '../poses.js?v=28.4.0';
import {angleItems,cameraContract} from '../angles.js?v=28.4.0';
import {luminousWorldContract} from '../luminous-world.js?v=28.4.0';
import {productionPlan} from '../production-plan.js?v=28.4.0';
import {renderInput,renderSelectionMaterial} from '../compiled-production.js?v=28.4.0';
import {composeArtworkStage,composeArtworkRepair} from '../artwork-stage.js?v=28.4.0';
import {artworkBasis} from '../artwork-basis.js?v=28.4.0';

// Reproduce the supplied dragon-person specification without generating an
// image. These checks expose the old restrictive rules that reduced the world
// to a normally lit 3D character and one green light in the forest.
applyCollection('halloween');
const base={...initialSelections(),sceneUnified:true,medium:'発光幻想アニメ',theme:'悪夢からの脱出',place:'霧の森',
 costume:'竜人',pose:'四つん這いで進む',mood:'ローアングル＋威嚇',angle:'真上から・90度',
 palette:'夜紺 × 翡翠 × 蛍光緑',design:'新聞の一面',type:'商品広告・キャッチと特徴3点',line:'セリフなし',
 size:'A4縦・300dpi目安｜2480×3508｜210:297',hair:'参照の茶髪',proportions:'参照の頭身'};
const profile={displayName:'作画核検査',activityEnabled:false},random=()=>.23;
const obsolete=[
 '物自体の発光は選択場面の既存光源に限定',
 '普通の肌や布まで自発光や透ける材質へ変えない',
 '深暗部は光を置かない余白'
];
const basis=artworkBasis(base.medium);
assert.ok(basis.basis.some(text=>text.includes('それぞれの内部にも幻想光')));
let count=0;
for(const angle of angleItems)for(const noPerson of [false,true])for(const palette of [base.palette,'モノクローム','金と黒の二色']){
 const values={...base,angle:angle.value,palette,...(noPerson?{costume:'風景を主役にする',pose:'おまかせ',mood:'毎回大胆に変える'}:{})};
 const variant=applyPose(buildDirection([],values.mood,random,'halloween',values),values.pose);
 const contract=luminousWorldContract(values,{noPerson,variant});
 const plan=productionPlan(profile,values,variant,'halloween',random);
 const recipe=plan.conditions.find(condition=>condition.key==='medium');
 const native=renderSelectionMaterial(plan),stage=composeArtworkStage(plan),repair=composeArtworkRepair(plan,{compact:true});
 const audit=JSON.parse(renderInput(plan).split('\n\n【全選択の個別レシピ】')[0]);
 assert.ok(contract.drawingCore.length<900,'The dedicated drawing core should be a short priority, not a second recipe dump');
 assert.ok(contract.method.includes(contract.drawingCore));
 assert.ok(recipe.execution.method.includes(contract.drawingCore));
 for(const text of [native,stage])assert.ok(text.includes(contract.drawingCore),'The actual handoff lost the drawing core');
 const all=[contract.method,contract.lighting,contract.sections.map(section=>section.text).join(' '),basis.basis.join(' ')].join(' ');
 for(const rule of obsolete)assert.ok(!all.includes(rule),'The old emission limiter returned: '+rule);
 assert.match(contract.lighting,/発光を既存の照明器具や背景の一つのスポットに限定しない/);
 assert.match(all,/内部.*幻想.*光|幻想.*内部.*光/);
 assert.match(all,/材質|素材/);assert.match(all,/深暗部|深い.*影/);
 if(!noPerson){
  assert.match(contract.drawingCore,/上眼瞼.*虹彩.*鼻.*口.*頬/,'The anime face must be constructed from drawn facial marks and shadow planes');
  assert.match(contract.drawingCore,/実写.*連続階調.*3D.*顔.*残さない/);
  assert.match(contract.drawingCore,/茶髪.*識別色.*保持/,'Luminous rendering must preserve the correctly selected brown hair');
  assert.match(all,/鱗.*2D|2D.*鱗/,'Scales must use the same 2D rendering as the rest of the subject');
 }else{
  assert.ok(!contract.sections.some(section=>section.label==='見える瞳・髪・肌の光層'));
  assert.doesNotMatch(contract.drawingCore,/上眼瞼|虹彩|茶髪/,'Scenery must not inherit the face/hair construction');
 }
 for(const key of ['medium','theme','place','costume','pose','mood','angle','palette','design','type','size'])assert.equal(plan.values[key],values[key]);
 assert.deepEqual(audit.camera.geometry,cameraContract(values,{noPerson}),'Internal light may not change the selected camera');
 for(const check of contract.checks)assert.ok(repair.includes(check),'Compact repair lost required drawing acceptance: '+check);
 assert.match(all,/ガラス.*変えない|ガラスに変える指示ではない/,'Material identity must survive internal luminous layers');
 assert.match(contract.palette,/許可色|選択配色/);
 if(palette==='金と黒の二色')assert.ok(contract.palette.includes('金と黒だけ'));
 if(palette==='モノクローム')assert.ok(contract.palette.includes('黒・白・無彩色の灰'));
 count++;
}
assert.equal(questions.find(question=>question.key==='medium').groups.flatMap(group=>group.values).length,114);
for(const value of ['ちびキャラ','実写風ファッション写真','透明水彩アニメ','クリスタル透光アニメ'])assert.equal(luminousWorldContract({...base,medium:value}),null);
console.log('PASS luminous drawing core: '+count+' camera/person/scenery/palette cases require drawn 2D faces and world-wide internal color-layer emission while preserving original material, brown hair, selected camera, pose, body proportions and limited colors. This checks instructions against the supplied failure, not generated-image appearance.');
