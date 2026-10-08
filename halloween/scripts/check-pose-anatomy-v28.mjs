import assert from 'node:assert/strict';
import {poseItems,poseGroups,poseContent,poseTechnical,applyPose} from '../poses.js?v=28.3.0';
import {optionRecipe} from '../option-recipes.js?v=28.3.0';
import {productionPlan,repairPrompt} from '../production-plan.js?v=28.3.0';
import {renderChatInput} from '../compiled-production.js?v=28.3.0';
import {composeArtworkStage,composeArtworkRepair} from '../artwork-stage.js?v=28.3.0';

const random=()=>.28;
const base={face:'正面の顔',expression:'穏やかな表情',pose:'まっすぐ立つ',camera:'正面',distance:'全身',layout:'主役の全身',signature:'ANATOMY',motif:'背景の光',light:'窓光',depth:'前後の奥行き',motion:'静止'};
// These descriptors are contract-invariance fixtures, not image inputs or a
// JavaScript gender detector. Actual anatomy is read from the caller's image
// by the image model; this test verifies its instructions and transfer paths.
const identityFixtures=[
 {age:38,genderExpression:'男性',proportions:'肩幅が広く、腰も厚みのある成人'},
 {age:34,genderExpression:'女性',proportions:'肩と腰に自然な厚みのある成人'},
 {age:29,genderExpression:'中性的',proportions:'細身の成人、長い四肢'}
];
assert.equal(poseItems.length,72,'Reference studies must not create sheet-number catalogue entries');
assert.equal(poseGroups.flatMap(g=>g.values).length,72);
for(const pose of poseItems)for(const reference of identityFixtures){
 const context={values:{costume:'参照画像の衣装を生かす'},variant:{...base},reference};
 const before=JSON.stringify(context),technical=poseTechnical(pose.value,context);
 assert.equal(technical.applicable,true);
 const body=technical.sections.find(s=>s.label==='元の体格に合う動作').text;
 assert.match(body,/年齢感・性別表現・体格の特徴を保つ/);
 assert.match(body,/男性参照の肩幅や骨盤の比率も保持/);
 assert.match(body,/女性の細い腰・狭い肩・脚寄せへ固定しない/);
 assert.match(body,/成人を幼い体格へ変えない/);
 assert.equal(JSON.stringify(context),before,'Anatomy adaptation must not mutate source identity, expression or camera');
 const posed=applyPose(context.variant,pose.value);
 assert.equal(posed.face,base.face);assert.equal(posed.expression,base.expression);assert.equal(posed.camera,base.camera);
 assert.match(poseContent(pose.value,context),/性別表現・体格の特徴/);
 assert(poseContent(pose.value,context).includes(pose.text),'The selected action must survive body-fit adaptation');
 const recipe=optionRecipe('pose',pose.value,context);
 assert(recipe.sections.some(s=>s.text===body),'Actual selected recipe must include body-fit rules');
 assert(technical.checks.every(check=>recipe.checks.includes(check)),'Repair checks must include body-fit and support criteria');
}
const sections=(value,context={})=>poseTechnical(value,{variant:base,...context}).sections;
const at=(value,label)=>sections(value).find(s=>s.label===label).text;
assert.match(at('座って脚を組む','体格に合わせた支持'),/坐骨.*座面/);
assert.match(at('床であぐらをかく','体格に合わせた支持'),/交差は上下を一つ/);
assert.match(at('横向きに寝る','体格に合わせた支持'),/肩・胸郭・骨盤/);
assert.match(at('四つん這いで進む','体格に合わせた支持'),/左右の掌と膝/);
assert.match(at('頬に手を添える','選択動作の接触と重なり'),/頬・顎・口元/);
assert.match(at('まっすぐ立つ','選択動作の接触と重なり'),/仕草を追加しない/);
assert.match(at('両手で顔の枠を作る','選択動作の接触と重なり'),/顔の周囲の空間/);
assert.match(at('指ハートを作る','選択動作の接触と重なり'),/親指と人差し指の交差/);
assert.match(at('胸元で祈る','選択動作の接触と重なり'),/目を閉じたり表情を変更したりしない/);
assert.equal(poseTechnical('おまかせ',{variant:{...base,pose:'横向きに寝る'}}).action,'横向きに寝る');
assert.equal(poseTechnical('おまかせ',{variant:{pose:''}}).applicable,false,'No gesture may be invented from an unresolved automatic choice');
for(const context of [{noPerson:true},{variant:{noPerson:true}},{values:{costume:'風景を主役にする'}}]){
 assert.equal(poseTechnical('腕を組む',context).applicable,false);
 assert.equal(poseContent('腕を組む',context),'');
}
const tail=sections('椅子に腰掛ける',{values:{costume:'人魚'}}).find(s=>s.label==='体格に合わせた支持').text;
assert.match(tail,/一本の魚尾/);assert.match(tail,/人の二本脚・膝・足を追加しない/);
assert.doesNotMatch(tail,/足裏|左右の腿|二つの足/);
assert(poseTechnical('椅子に腰掛ける',{values:{costume:'人魚'}}).checks.some(check=>check.includes('腕・魚尾')));

// Assert propagation in the actual image-call material, staged artwork and repairs.
let routesChecked=0;
for(const medium of ['宝石光彩アニメ','宝石光彩リアル'])for(const pose of ['腕を組む','椅子に腰掛ける','ゆっくり歩く','うつ伏せで頬杖をつく']){
 const values={medium,theme:'星糸のアトリエ',place:'星糸のアトリエ',sceneUnified:true,costume:'参照画像の衣装を生かす',pose,mood:'正面顔',angle:'正面・水平',palette:'夜紺 × 翡翠 × 蛍光緑',design:'一枚絵・画集',type:'文字を入れない',line:'セリフなし',size:'縦長・SNS｜1080×1440｜3:4'};
 const posed=applyPose({...base},pose),plan=productionPlan({displayName:'ANATOMY CHECK',topics:[]},values,posed,'everyday',random);
 const criterion=poseTechnical(pose,{values,variant:posed}).sections[0].text;
 const routes=[renderChatInput(plan),composeArtworkStage(plan),composeArtworkRepair(plan),repairPrompt({production:plan,values,edition:'ANATOMY CHECK',prompt:renderChatInput(plan)})];
 for(const text of routes){assert(text.includes(criterion),'The body-fit contract was lost in an image or repair route');assert.doesNotMatch(text,/pose-illustrations|pose-\d{3}|顔25|全身25/);routesChecked++;}
 assert.equal(plan.values.pose,pose);assert.equal(plan.variant.face,base.face);assert.equal(plan.variant.expression,base.expression);
}
console.log('PASS internal pose anatomy contracts: 72 poses × 3 immutable identity descriptors; support, hand/face overlap, automatic/no-person/fish-tail exceptions; '+routesChecked+' artwork and repair routes. Source pixels and generated-image anatomy are not tested.');
