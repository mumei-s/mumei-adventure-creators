import assert from 'node:assert/strict';
import {createProductionRequest,buildQualityPrompt,finalizeProductionRequest,inspectProductionRequest,safeInspectProductionRequest,buildImageReviewPrompt,buildTargetedRepairPrompt} from '../generation-quality.js';
import {productionPlan} from '../production-plan.js';
import {composePrompt} from '../prompt.js';
import {applyCollection} from '../collection.js';
import {initialSelections} from '../modes.js';
import {resolveSelections,questions} from '../catalog.js';
import {buildDirection} from '../direction.js';
import {stylePresetFor} from '../style-presets.js';

const clone = value => structuredClone(value), random = () => .34;
let assertions = 0;
function expectIssue(inspection,code) {assert(inspection.findings.some(item => item.code === code && item.severity === 'error'),JSON.stringify(inspection));assert.equal(inspection.status,'problems');assertions++;}
function prepare({name='利用者A',edition='QUALITY-A',medium='水彩画',collection='halloween',overrides={},references,productionMutator}={}) {
  applyCollection(collection);
  const profile = {displayName:name,activityEnabled:false};
  const values = resolveSelections({...initialSelections(),medium,costume:'参照画像の衣装を生かす',type:'文字を一切入れない',...overrides},random);
  Object.assign(values,{sourceKind:'photo-person',collection},overrides);
  const production = productionPlan(profile,values,buildDirection([],values.mood,random,collection,values),collection,random);
  const style = stylePresetFor(medium);
  references ||= [{id:'user:'+name,name:name+'.png',role:'identity'},...(style ? [{...style,id:'style:'+medium}] : [])];
  production.referenceManifest = references;
  productionMutator?.(production);
  const request = createProductionRequest({edition,collection,profile,values,variant:production.variant,production,references,attachmentMode:'bundle',referenceRequired:true});
  const prompt = buildQualityPrompt(request,composePrompt({collection,profile,values,variant:production.variant,references,edition,preparedPlan:production}));
  return {request:finalizeProductionRequest(request,prompt),prompt,values,references,production};
}
const good = prepare();
assert.equal(inspectProductionRequest(good.request,{values:good.values,references:good.references,prompt:good.prompt,deliveryNames:good.references.map(ref=>ref.name),copyPrompt:good.prompt,filePrompt:good.prompt}).status,'checked');
assert.equal(good.request.outputPrompt,good.prompt);
assert(Object.isFrozen(good.request));assert(Object.isFrozen(good.request.selections));
assert.throws(()=>{good.request.selections.medium='油彩画';},TypeError);
assert.deepEqual(JSON.parse(JSON.stringify(good.request)),good.request);
assert(!JSON.stringify(good.request).includes('data:image'));

// 1 / 10: each creation is immutable and visitor specific; old output is detected.
const other = prepare({name:'利用者B',edition:'QUALITY-B',medium:'油彩画'});
assert(!other.prompt.includes('利用者A.png'));assert(!good.prompt.includes('利用者B.png'));
expectIssue(inspectProductionRequest(other.request,{prompt:good.prompt}),'production-id');
expectIssue(inspectProductionRequest(good.request,{values:other.values}),'stale-selections');

// 2: test actual renderer roles with different people, and intentional role failure.
const two = prepare({medium:'発光幻想アニメ'});
assert.equal(inspectProductionRequest(two.request).status,'checked');
const styleRef = two.references.find(ref=>ref.role==='style-preset');assert(styleRef);
expectIssue(inspectProductionRequest({...two.request,outputPrompt:null},{prompt:two.prompt+'\n主参照「'+styleRef.name+'」'}),'reversed-reference-role');
const swapped = clone(two.references);swapped[0].role='style-preset';
expectIssue(inspectProductionRequest(two.request,{references:swapped}),'reference-assignment');

// 3: ordering does not own role; delete/add/target change do.
assert.equal(inspectProductionRequest(two.request,{references:[...two.references].reverse()}).status,'checked');
expectIssue(inspectProductionRequest(two.request,{references:two.references.slice(1)}),'reference-assignment');
expectIssue(inspectProductionRequest(two.request,{references:[...two.references,{id:'stale',name:'old.png',role:'support'}]}),'reference-set');
expectIssue(inspectProductionRequest(two.request,{deliveryNames:[two.references[0].name]}),'missing-file');
expectIssue(inspectProductionRequest(two.request,{deliveryNames:[...two.references.map(ref=>ref.name),'old.png']}),'unexpected-file');

// 4: explicit allowed hair/clothing changes are not mistakes.
const allowed = prepare({overrides:{constraints:{required:[{target:'hero',attribute:'face',value:'主参照の顔'}],allowedChanges:['髪色','衣装'],requestedChanges:['髪色を緑にする','魔女の衣装へ変える']}}});
assert.equal(inspectProductionRequest(allowed.request).status,'checked');
assert.deepEqual(allowed.request.constraints.allowedChanges,['髪色','衣装']);
assert(!allowed.request.constraints.required.some(item=>item.attribute==='hair'));
assert.match(buildImageReviewPrompt(allowed.request),/許可された変化を相違にしない/);

// 5 / 6: no-reference scenery is allowed and face/hands aren't checked as anatomy.
const sceneryValues={medium:'水彩画',costume:'風景を主役にする',type:'文字を一切入れない',theme:'霧の森',place:'森',size:'正方形',pose:'未適用',mood:'未適用'};
const scenery=createProductionRequest({edition:'SCENERY',values:sceneryValues,production:{noPerson:true,values:sceneryValues,copy:{mode:'none',slots:[]}},references:[],referenceRequired:false});
const sceneryPrompt=buildQualityPrompt(scenery,'水彩画 風景を主役にする 文字を一切入れない 霧の森 森 正方形');
assert.equal(inspectProductionRequest(finalizeProductionRequest(scenery,sceneryPrompt),{deliveryNames:[]}).status,'checked');
const sceneReview=buildImageReviewPrompt(scenery);assert(!sceneReview.includes('pose：'));assert(!sceneReview.includes('mood：'));assert.match(sceneReview,/顔や手の形の検査は非適用/);

// 7: typed per-subject assignments survive reordering, and broken ones fail.
const multiple=prepare({references:[{id:'r-a',name:'a.png',role:'identity',target:'A'},{id:'r-b',name:'b.png',role:'support',target:'B'},{id:'dog',name:'dog.png',role:'support',target:'pet'}],overrides:{subjects:[{id:'A',kind:'character',count:1},{id:'B',kind:'character',count:1},{id:'pet',kind:'dog',count:1}],constraints:{assignments:[{target:'A',referenceId:'r-a',prop:'剣'},{target:'B',referenceId:'r-b',prop:'傘'}]}}});
assert.equal(inspectProductionRequest(multiple.request,{references:[...multiple.references].reverse()}).status,'checked');
assert.equal(multiple.request.subjects.filter(subject=>subject.kind==='character').length,2);
const brokenRefs=clone(multiple.references);brokenRefs[0].target='B';
expectIssue(inspectProductionRequest(multiple.request,{references:brokenRefs}),'reference-assignment');
const brokenAssignments=clone(multiple.request);brokenAssignments.constraints.assignments[0].referenceId='lost';
expectIssue(inspectProductionRequest(brokenAssignments),'assignment-reference');
const expandedRoles=prepare({references:[{id:'primary',name:'primary.png',role:'identity'},...['style','pose','costume','background','composition'].map(role=>({id:role,name:role+'.png',role,target:'hero'}))]});
assert.equal(inspectProductionRequest(expandedRoles.request,{deliveryNames:expandedRoles.references.map(ref=>ref.name)}).status,'checked');
for(const label of ['画風参照','ポーズ参照','衣装参照','背景参照','構図参照'])assert(expandedRoles.prompt.includes(label));
const intentionalShared=prepare({references:[{id:'face-use',assetId:'one-image',name:'same.png',role:'identity'},{id:'costume-use',assetId:'one-image',name:'same.png',role:'costume'}]});
assert.equal(inspectProductionRequest(intentionalShared.request,{deliveryNames:['same.png']}).status,'checked');

// 8: exact Unicode/newlines are checked without normalization or substitutions.
const special='無名ではない「花」🌸\nA&B <C> 𝑺・①';
const textRequest=createProductionRequest({edition:'TEXT',values:{medium:'水彩画',type:'文字を入れる'},production:{values:{medium:'水彩画',type:'文字を入れる'},copy:{mode:'custom',slots:[{role:'題名',text:special,position:'中央下'}]}}});
const textPrompt=buildQualityPrompt(textRequest,'水彩画 文字を入れる\n題名：'+JSON.stringify(special));
assert.equal(inspectProductionRequest(finalizeProductionRequest(textRequest,textPrompt)).status,'checked');
expectIssue(inspectProductionRequest(textRequest,{prompt:textPrompt.replaceAll(JSON.stringify(special),JSON.stringify(special.replace('🌸','🌼')))}),'exact-text');
const invalidNone=clone(scenery);invalidNone.text.slots=[{role:'題名',text:'勝手な名前'}];
expectIssue(inspectProductionRequest(invalidNone,{prompt:sceneryPrompt}),'unexpected-text');

// 9: different directional attributes do not conflict; same attribute does.
const directions=createProductionRequest({edition:'CAMERA',values:{constraints:{required:[{target:'camera',attribute:'position',value:'真上'},{target:'camera',attribute:'direction',value:'下向き'},{target:'hero',attribute:'faceDirection',value:'正面'},{target:'hero',attribute:'bodyDirection',value:'横'}]}}});
const directionsPrompt=buildQualityPrompt(directions,'指定した視点を使う。');
assert.equal(inspectProductionRequest(directions,{prompt:directionsPrompt}).status,'checked');
const collision=clone(directions);collision.constraints.required.push({target:'camera',attribute:'position',value:'真下'});
expectIssue(inspectProductionRequest(collision,{prompt:directionsPrompt}),'constraint-conflict');
const forbidden=clone(directions);forbidden.constraints.forbidden=[{target:'camera',attribute:'position',value:'真上'}];
expectIssue(inspectProductionRequest(forbidden,{prompt:directionsPrompt}),'constraint-conflict');

// 11 / 12: neither code, image name nor instructions manufacture image verdicts.
for(const completedImageName of ['normal.png','wrong-pose.png']){
  const result=inspectProductionRequest(good.request,{completedImageName});
  assert.equal(result.imageStatus,'uninspected');assert(!('score' in result));
}
assert.match(buildImageReviewPrompt(good.request),/確認済み.*明確な相違.*要確認.*未確認/);
assert.match(buildImageReviewPrompt(good.request),/根拠となる画像内の位置/);
assert.match(buildImageReviewPrompt(good.request),/剣を両手で持つ/);

// 13: correction requires an explicit user change and never mutates original.
const originalJSON=JSON.stringify(good.request);
assert.throws(()=>buildTargetedRepairPrompt(good.request,{imageName:'original.png',changes:[]}),/直したい箇所/);
assert.throws(()=>buildTargetedRepairPrompt(good.request,{changes:['手だけ直す']}),/画像を選んで/);
const repair=buildTargetedRepairPrompt(good.request,{imageName:'original.png',issues:['右手が剣に触れていない'],changes:['右手も剣の柄を握る'],preserve:['顔・髪・衣装・背景']});
assert.match(repair,/右手も剣の柄を握る/);assert.match(repair,/顔・髪・衣装・背景/);assert.match(repair,/変更箇所と保持対象の両方/);assert.match(repair,/別画像として返す/);
assert.equal(JSON.stringify(good.request),originalJSON);

// 14 (mock state only): serializable snapshots restore role and exact body.
const restored=JSON.parse(originalJSON);
assert.equal(inspectProductionRequest(restored,{copyPrompt:good.prompt,filePrompt:good.prompt}).status,'checked');
expectIssue(inspectProductionRequest(restored,{filePrompt:good.prompt+'改変'}),'delivery-text');
const missed=good.prompt.replaceAll(good.values.medium,'欠落した画風');
expectIssue(inspectProductionRequest({...good.request,outputPrompt:null},{prompt:missed}),'missing-selection');
const wrongPlan=clone(good.request);wrongPlan.plannedValues.medium='別の画材';
expectIssue(inspectProductionRequest(wrongPlan),'plan-selection');

// 15: exceptions report uninspected and leave inputs untouched.
assert.equal(safeInspectProductionRequest(null).status,'error');
assert.equal(safeInspectProductionRequest(null).imageStatus,'uninspected');
assert.equal(JSON.stringify(good.request),originalJSON);
assert.equal(inspectProductionRequest(good.request,{prompt:null}).status,'uninspected');

// Representative real compiler paths, including non-focused medium and focused styles.
let rendererCases=0;
for(const medium of ['水彩画','油彩画','発光幻想アニメ','立体光彩リアル','宝石光彩アニメ','アメコミのインク画']){
  if(!questions.find(question=>question.key==='medium').groups.some(group=>group.values.includes(medium)))continue;
  const sample=prepare({medium});
  const result=inspectProductionRequest(sample.request);
  assert.equal(result.status,'checked',medium+' '+JSON.stringify(result.findings));
  assert.equal(buildQualityPrompt(sample.request,sample.prompt),sample.prompt,'Wrapping should be idempotent.');
  rendererCases++;
}
console.log(JSON.stringify({suite:'generation-quality',intentionalFaultAssertions:assertions,rendererCases,scope:'Node code and mock-state tests; no image-model judgement, mobile-device or generation-rate claim'}));
// Optional review/repair must preserve the same permissions and prohibitions.
const policyRequest=createProductionRequest({edition:'POLICY',values:{costume:'参照画像の衣装を生かす',constraints:{required:['顔を参照'],allowedChanges:['髪色は変更可'],requestedChanges:['衣装を魔女へ'],forbidden:['犬を追加しない']}},variant:{face:'右斜め',pose:'両手で剣を持つ',camera:'真上90度'}});
for(const text of [buildImageReviewPrompt(policyRequest),buildTargetedRepairPrompt(policyRequest,{imageName:'original.png',changes:['剣の持ち方']})]){
 for(const literal of ['顔を参照','髪色は変更可','衣装を魔女へ','犬を追加しない','右斜め','両手で剣を持つ','真上90度'])assert(text.includes(literal));
 assert.match(text,/既に反映済みなら再変更しない/);
}
