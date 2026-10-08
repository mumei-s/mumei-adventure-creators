import assert from 'node:assert/strict';
import {buildEditorial} from '../editorial.js?v=28.1.2';
import {copyContentRules} from '../copy-scope.js?v=28.1.2';
import {typographyValues} from '../typography-options.js?v=28.1.2';
import {applyCollection} from '../collection.js?v=28.1.2';
import {buildDirection} from '../direction.js?v=28.1.2';
import {productionPlan,repairPrompt} from '../production-plan.js?v=28.1.2';
import {composePrompt} from '../prompt.js?v=28.1.2';
import {renderInput,renderSelectionMaterial} from '../compiled-production.js?v=28.1.2';
import {composeArtworkStage,composeArtworkRepair} from '../artwork-stage.js?v=28.1.2';
import {imageDeliveryRepairPrompt} from '../output-contract.js?v=28.1.2';
import {renderEditorialLayout} from '../editorial-layout.js?v=28.1.2';

// Reproduce the supplied choice combination, including source-guided copy.
// We inspect source boundaries, transfer routes and actual text placement;
// this does not run AI manuscript editing or generate an image.
const random=()=>.23;
const fixture={medium:'発光幻想アニメ',theme:'悪夢からの脱出',place:'霧の森',costume:'竜人',pose:'四つん這いで進む',mood:'ローアングル＋威嚇',angle:'真上から・90度',palette:'夜紺 × 翡翠 × 蛍光緑',design:'新聞の一面',type:'商品広告・キャッチと特徴3点',line:'セリフなし',size:'A4縦・300dpi目安｜2480×3508｜210:297'};
const profile=sourceGuided=>({displayName:'無名 S note',activityEnabled:sourceGuided,...(sourceGuided?{handoff:{id:'ss_yr'},biography:'物語や日々の出来事を公開している。'}:{})});
const forbiddenCopy=/真上|真下|90度|アングル|解像度|dpi|\bpx\b|プロンプト|画像生成|作画|描画|コントラスト|深暗部|蛍光緑|夜紺|翡翠|光源|セル影|検査|制作番号/i;
const sourceFields=['medium','pose','mood','angle','palette','size'];
let cases=0;
for(const collection of ['halloween','everyday']){
 applyCollection(collection);
 for(const noPerson of [false,true])for(const type of typographyValues)for(const sourceGuided of [false,true]){
  const values={...fixture,collection,type,...(noPerson?{costume:'風景を主役にする'}:{})},creator=profile(sourceGuided);
  const copy=buildEditorial(creator,values,random),label=[collection,type,noPerson?'scenery':'person',sourceGuided?'source':'fixed'].join(' / ');
  assert.equal(copy.roleScoped,true,label+' lost explicit role priority');
  assert.doesNotMatch(copy.blocks.join(' '),forbiddenCopy,label+' contains a production explanation as fixed print copy');
  const serializedSources=JSON.stringify(copy.contentSources);
  assert.doesNotMatch(serializedSources,forbiddenCopy,label+' production settings entered reader-copy sources');
  for(const slot of copy.generatedSlots){
   assert(['story_world','public_activity'].includes(slot.contentDomain),label+' lacks a copy-content domain');
   assert.equal(slot.contentSources.domain,slot.contentDomain,label+' has conflicting source and copy domains');
   if(slot.contentDomain==='story_world')assert.deepEqual(slot.contentSources,copy.contentSources,label+' uses unrestricted image specifications as world-copy sources');
   else {assert.match(slot.contentSources.verifiedSource,/確認できる活動/);assert.equal(slot.contentSources.protagonist,undefined,label+' attributes the fictional protagonist to the real author');}
   for(const rule of copyContentRules)assert(slot.instruction.includes(rule),label+' lost the no-meta-copy boundary');
  }
  const mutated={...values,medium:'実写風スタジオ写真',pose:'両腕を頭上に伸ばす',mood:'完全な右横顔90度',angle:'真下から・90度',palette:'モノクローム',size:'正方形・SNS｜1080×1080｜1:1'};
  const alternate=buildEditorial(creator,mutated,random);
  assert.deepEqual(alternate.contentSources,copy.contentSources,label+' camera/paint/pose/size changes became advertising topics');
  assert.deepEqual(alternate.slots,copy.slots,label+' drawing settings changed fixed reader-facing copy');
  assert.deepEqual(alternate.generatedSlots,copy.generatedSlots,label+' drawing settings changed editing requests');
  cases++;
 }
 for(const sourceGuided of [false,true]){
  const values={...fixture,collection},creator=profile(sourceGuided),plan=productionPlan(creator,values,buildDirection([],values.mood,random,collection,values),collection,random);
  const native=renderSelectionMaterial(plan),master=composePrompt({collection,profile:creator,creator:'ss_yr',values,variant:plan.variant,references:[],edition:'COPY-SCOPE',preparedPlan:plan});
  const result={edition:'COPY-SCOPE',prompt:master,production:plan,values};
  const routes={native,master,artwork:composeArtworkStage(plan),embedded:composeArtworkStage(plan,{embedded:true}),artworkRepair:composeArtworkRepair(plan),repair:repairPrompt(result),deliveryRepair:imageDeliveryRepairPrompt(result)};
  for(const [name,text] of Object.entries(routes))for(const rule of copyContentRules)assert(text.includes(rule),name+' lost print-content scope');
  const input=JSON.parse(renderInput(plan).split('\n\n【全選択の個別レシピ】')[0]);
  if(sourceGuided){
   for(const request of input.manuscript_requests)assert.deepEqual(request.contentSources,plan.copy.contentSources,'The actual image-call request lost the separated copy topics');
   const start=native.indexOf('【作品世界または公開活動から編集する許可原稿】');
   assert(start>=0,'The source-guided native manuscript section is missing');
   const requests=native.slice(start,native.indexOf('原稿は上記の',start));
   for(const topic of [plan.copy.contentSources.story,plan.copy.contentSources.setting,plan.copy.contentSources.protagonist,plan.copy.contentSources.purpose])assert(requests.includes('「'+topic+'」'),'A separated topic did not reach the actual manuscript editing request: '+topic);
   for(const angle of plan.copy.contentSources.featureAngles)assert(requests.includes('「'+angle+'」'),'The distinct feature topic did not reach the actual manuscript editing request: '+angle);
  }
  assert.deepEqual([...plan.copy.slots,...plan.copy.generatedSlots].map(s=>s.role).sort(),['主見出し','商品紹介','特徴1','特徴2','特徴3','作者名'].sort());
  for(const field of sourceFields)assert.equal(plan.values[field],values[field],'Copy scope altered the drawing condition '+field);
  assert.equal(input.camera.geometry.pitch_degrees_from_horizontal,90,'Text correction weakened top camera');
  assert(![...plan.copy.slots,...plan.copy.generatedSlots].some(s=>/本文|副記事|新聞題字|キャプション/.test(s.role)),'The newspaper added article copy to an ad');
 }
 // The deterministic layout path must give these roles actual newspaper
 // space; the old catch-all footer shrank all five copy blocks to ~9 px.
 const values={...fixture,collection},creator=profile(false),plan=productionPlan(creator,values,buildDirection([],values.mood,random,collection,values),collection,random);
 const output=renderEditorialLayout(plan,{dataUrl:'data:image/png;base64,AA==',artworkWidth:1024,artworkHeight:1536});
 assert.equal((output.svg.match(/<image\b/g)||[]).length,1,'The rendered newspaper duplicated a portrait');
 for(const role of ['主見出し','商品紹介','特徴1','特徴2','特徴3','作者名']){
  const frame=output.placements.textFrames.find(f=>f.roles.includes(role));
  assert(frame,role+' has no dedicated newspaper area');
  const run=output.placements.textRuns.find(r=>r.role===role);
  assert(run.fontSize>=output.width*.012,role+' was shrunk into the incidental-copy footer');
  assert(!frame.id.includes('additional-copy'),role+' uses the old catch-all footer');
 }
 const features=output.placements.textFrames.filter(f=>f.roles.some(r=>/^特徴\d$/.test(r)));
 assert.equal(features.length,3,'The features must occupy three newspaper columns');
 const featureRuns=output.placements.textRuns.filter(r=>/^特徴\d$/.test(r.role));
 assert(featureRuns.every(r=>r.direction==='vertical-rl'),'Japanese features must retain newspaper vertical columns');
 assert.equal(new Set(features.map(f=>f.y)).size,1,'The feature columns do not share the same baseline');
 assert.equal(new Set(featureRuns.map(r=>r.fontSize)).size,1,'The three feature columns do not share the same hierarchy');
}
applyCollection('halloween');
console.log('PASS reader-copy scope: '+cases+' mode/typography/source/subject combinations keep production settings out of copy sources and fixed text; supplied newspaper fixture retains six roles, one image, readable feature columns and hard camera across native, artwork and repair routes. AI editing and generated-image adherence remain unverified.');
