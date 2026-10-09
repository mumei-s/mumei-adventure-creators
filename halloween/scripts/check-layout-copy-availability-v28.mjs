import assert from 'node:assert/strict';
import {applyCollection} from '../collection.js?v=28.4.6';
import {questions,resolveSelections,AUTO} from '../catalog.js?v=28.4.6';
import {initialSelections} from '../modes.js?v=28.4.6';
import {candidateAvailability,selectionConflicts,selectionWarnings} from '../compatibility.js?v=28.4.6';
import {layoutCopyConflicts,structuredCopyRules,shortCopyDesigns,longCopyTypes} from '../layout-copy-compatibility.js?v=28.4.6';
import {designLayoutValues,typographyLayoutValues} from '../layout-preview-specs.js?v=28.4.6';
import {randomItemSelection} from '../random-selections.js?v=28.4.6';
import {productionPlan} from '../production-plan.js?v=28.4.6';
import {compileProduction} from '../compiled-production.js?v=28.4.6';
import {stagePrompts,composeStagedMaster} from '../production-workflow.js?v=28.4.6';

let matrixCases=0,randomCases=0,automaticCases=0;
for(const collection of ['halloween','everyday']){
 applyCollection(collection);
 const base=resolveSelections({...initialSelections(),collection,sceneUnified:true,medium:'現代アニメの一枚絵',costume:'参照画像の衣装を生かす',pose:'まっすぐ立つ',mood:'正面・首をまっすぐ',angle:'目線の高さ・正面',design:'通常の一枚絵',type:'文字を一切入れない'},()=>.23);
 for(const design of designLayoutValues)for(const type of typographyLayoutValues){
  const values={...base,design,type},snapshot=structuredClone(values),rule=structuredCopyRules.find(rule=>rule.type===type);
  const blocked=(!!rule&&!rule.designs.includes(design))||(shortCopyDesigns.includes(design)&&longCopyTypes.includes(type))||(design==='タイポグラフィーポスター'&&type==='文字を一切入れない');
  const issues=selectionConflicts(values).filter(issue=>issue.keys.includes('design')&&issue.keys.includes('type'));
  assert.equal(!!issues.length,blocked,`${collection}: ${design} × ${type}`);
  for(const key of ['design','type'])assert.equal(candidateAvailability(key,values[key],values).enabled,!blocked,'Both selection orders must make the same structural decision');
  if(blocked)assert.ok(!selectionWarnings(values).some(issue=>issue.code==='dense-copy-in-short-copy-design'),'An impossible rich layout cannot be passed as a small-print warning');
  assert.deepEqual(values,snapshot,'Compatibility must never rewrite manuscript quantity, writing direction or layout');
  matrixCases++;
 }
 const reported={...base,medium:'薄膜光彩アニメ',design:'新聞の一面',type:'広告チラシ風・情報をたっぷり',sourceKind:'photo-person'};
 const snapshot=structuredClone(reported),conflict=selectionConflicts(reported).find(issue=>issue.code==='layout-copy-structure-conflict');
 assert.ok(conflict,'The exact user screenshot combination is blocked');
 assert.ok(conflict.reason.length<160,'The remedy should be short enough to read in the picker');
 assert.ok(conflict.compatibleTypes.includes('新聞風・記事と段組み'));
 assert.equal(candidateAvailability('type',reported.type,{...base,design:reported.design}).enabled,false);
 assert.equal(candidateAvailability('design',reported.design,{...base,type:reported.type}).enabled,false);
 const explicit=resolveSelections(reported,()=>.23);
 assert.equal(explicit.design,reported.design);assert.equal(explicit.type,reported.type);
 assert.ok(selectionConflicts(explicit).some(issue=>issue.code===conflict.code),'Saved explicit conflicts stay reviewable; they are never silently repaired');
 assert.deepEqual(reported,snapshot);
 const plan=productionPlan({displayName:'互換性検査',activityEnabled:false},reported,{},collection,()=>.23);
 assert.ok(plan.issues.some(issue=>issue.severity==='error'&&issue.code===conflict.code));
 const output=compileProduction(plan);
 assert.match(output,/選択.*不成立|組み合わせ|両立/);assert.doesNotMatch(output,/Create ONE|人物翻訳用入力：開始|短い統合制作指示|通常制作：完成画像を1回/,'No image-producing stage is compiled from a blocked selection');
 assert.equal(stagePrompts(plan),null,'Individual stage-copy buttons must not bypass a rejected layout');
 assert.equal(composeStagedMaster(plan,[],{verbose:true}),output,'Verbose staging must also stop before giving an image command');
 for(const key of ['design','type'])for(let seed=0;seed<64;seed++){
  const automatic=resolveSelections({...reported,[key]:AUTO},()=>seed/64);
  assert.equal(automatic[key==='design'?'type':'design'],reported[key==='design'?'type':'design']);
  assert.equal(selectionConflicts(automatic).filter(issue=>issue.keys.includes('design')&&issue.keys.includes('type')).length,0,'Only AUTO may resolve to a compatible structure');automaticCases++;
 }
 for(const [key,fixed] of [['type',{...base,design:'新聞の一面'}],['design',{...base,type:'広告チラシ風・情報をたっぷり',design:'広告ビジュアル'}]]){
  const question=questions.find(question=>question.key===key);
  for(let seed=0;seed<256;seed++){
   const before=structuredClone(fixed),draw=randomItemSelection(question,fixed,()=>seed/256);
   assert.ok(draw.value,'There are real compatible choices for this one-item random selection');
   assert.equal(layoutCopyConflicts({...fixed,[key]:draw.value}).length,0,'Item random must not choose a conflicting structural manuscript');
   assert.deepEqual(fixed,before,'A one-item draw cannot replace other fields');randomCases++;
  }
 }
 for(const type of ['クリエイター名だけ','短いタイトル＋名前','墨の落款風の名前','手書きサイン風の名前','縦書きコピー・一文を大きく','詩のコピー・短い言葉を3行','文字を一切入れない']){
  for(const design of designLayoutValues)if(!(type==='文字を一切入れない'&&design==='タイポグラフィーポスター'))assert.equal(layoutCopyConflicts({design,type}).length,0,'Simple copy and its horizontal, vertical or diagonal direction remain independent');
 }
 assert.deepEqual(layoutCopyConflicts({design:'自由指定の版面',type:'広告チラシ風・情報をたっぷり'}),[],'Custom specifications must not be banned on guessed structure');
}
applyCollection('halloween');
console.log(`PASS ${matrixCases} design/type combinations, ${randomCases} one-item random draws and ${automaticCases} AUTO resolutions: newspaper/ad mismatch is stopped in both pickers and all prompt-stage boundaries, fixed choices stay visible, and simple copy directions remain available.`);
