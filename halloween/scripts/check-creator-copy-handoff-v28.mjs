import assert from 'node:assert/strict';
import fs from 'node:fs';
import {creatorHandoff,creatorCopyRequirements,creatorDisplayLabel,CREATOR_NAME_TOKEN} from '../creator-handoff.js?v=28.4.4';
import {productionPlan} from '../production-plan.js?v=28.4.4';
import {composePrompt} from '../prompt.js?v=28.4.4';
import {renderCompactChatInput} from '../compact-production.js?v=28.4.4';
import {renderInput} from '../compiled-production.js?v=28.4.4';
import {applyCollection} from '../collection.js?v=28.4.4';
import {sampleFor} from '../examples.js?v=28.4.4';
import {selectionReferenceManifest,selectionReferenceCounts,individualSelectionReferenceManifest} from '../selection-references.js?v=28.4.4';
import {attachmentConditionPolicy} from '../attachment-policy.js?v=28.4.4';
import {stylePresetFor} from '../style-presets.js?v=28.4.4';
import {assertCompactHandoff} from './compact-handoff-assertions-v28.mjs';

const base={sceneUnified:true,medium:'艶彩幻想アニメ',theme:'吸血鬼の晩餐会',place:'古城の大広間',costume:'亡霊騎士',pose:'低くしゃがむ',mood:'牙を見せて威嚇',angle:'超ローアングル・70度',palette:'菫 × マンゴー × 白',design:'通常の一枚絵',type:'文字を一切入れない',line:'セリフなし',size:'A4縦・300dpi目安｜2480×3508｜210:297',sourceKind:'photo-person'};
const owner=creatorHandoff('stored_author','','AUTHOR_ACTIVITY_SENTINEL'),before=JSON.stringify(owner),random=()=>.23;
const namedOwner=creatorHandoff('stored_author','確定した作者名','AUTHOR_ACTIVITY_SENTINEL');
const make=(overrides={},profile=owner,collection='halloween')=>{
 const values={...base,...overrides};
 const plan=productionPlan(profile,values,{},collection,random);
 const prompt=composePrompt({collection,creator:profile.id,profile,values,variant:plan.variant,references:[],edition:'CREATOR-SCOPE',preparedPlan:plan});
 assertCompactHandoff(plan,prompt,'actual creator/copy scope / '+collection+' / '+values.design+' / '+values.type);
 return {plan,prompt};
};
let cases=0;
for(const collection of ['halloween','everyday']){
 applyCollection(collection);
 for(const design of ['通常の一枚絵','新聞の一面','週刊誌の表紙'])for(const type of ['文字を一切入れない','HALLOWEENのみ']){
  const {plan,prompt}=make({design,type},owner,collection);
  assert.equal(plan.creatorLookup.length,0);
  assert.equal(plan.authorContext,'');
  assert.equal(JSON.parse(renderInput(plan).split('\n\n【全選択の個別レシピ】')[0]).author_context,undefined);
  for(const text of [prompt,renderCompactChatInput(plan)])assert.doesNotMatch(text,/ChatGPTで作者|https:\/\/note\.com\/stored_author|AUTHOR_ACTIVITY_SENTINEL|〔公開プロフィールのクリエイター名〕/);
  assert.equal(creatorDisplayLabel(owner,plan.copy),'');
  if(type==='HALLOWEENのみ')assert.deepEqual(plan.copy.slots.map(slot=>slot.text),['HALLOWEEN']);
  else assert.equal(plan.copy.slots.length,0);
  cases++;
 }
 const blank=make({type:'デザインに合わせて自動編集'},owner,collection);
 assert.equal(blank.plan.copy.authority,'none');assert.equal(blank.plan.creatorLookup.length,0);
 cases++;
}
applyCollection('halloween');
// Automatic scene-only editorial roles never authorize a real-author article.
const world=make({design:'図鑑の扉',type:'デザインに合わせて自動編集'});
assert.ok(world.plan.copy.generatedSlots.length>0);
assert.ok(world.plan.copy.generatedSlots.every(slot=>slot.contentDomain==='story_world'));
assert.equal(world.plan.creatorLookup.length,0);assert.equal(world.plan.authorContext,'');
assert.doesNotMatch(world.prompt,/https:\/\/note\.com\/stored_author|AUTHOR_ACTIVITY_SENTINEL/);
cases++;
const interview=make({design:'インタビュー誌面',type:'デザインに合わせて自動編集'},namedOwner);
for(const slot of interview.plan.copy.generatedSlots.filter(slot=>/^回答/.test(slot.role))){assert.equal(slot.contentDomain,'story_world');assert.match(slot.instruction,/作品世界内の説明/);assert.doesNotMatch(slot.instruction,/回答は対応する質問を受けた公開活動の紹介/);}
assert.equal(interview.plan.creatorLookup.length,0);cases++;
// A permitted unresolved name needs only its display name, never article text.
const name=make({type:'クリエイター名だけ'});
assert.equal(name.plan.creatorRequirements.needsNameLookup,true);
assert.equal(name.plan.creatorRequirements.needsActivity,false);
assert.match(name.prompt,/このURLの表示名だけを確認/);
assert.match(name.prompt,/公開記事の調査や紹介文の追加は行わない/);
assert.doesNotMatch(name.prompt,/公開記事の読める本文から/);
assert.equal(name.plan.authorContext,'');
assert.equal(creatorDisplayLabel(owner,name.plan.copy),'作者名はChatGPTで確認');
cases++;
const named=make({type:'クリエイター名だけ'},namedOwner);
assert.equal(named.plan.creatorLookup.length,0);assert.equal(named.plan.authorContext,'');
assert.deepEqual(named.plan.copy.slots.map(slot=>slot.text),['確定した作者名']);
cases++;
// Public-activity copy still needs the actual public source, even when named.
for(const collection of ['halloween','everyday']){
 applyCollection(collection);
 const activity=make({design:'広告ビジュアル',type:'ブランド広告・宣言と短いコピー'},namedOwner,collection);
 assert.ok(activity.plan.copy.generatedSlots.some(slot=>slot.contentDomain==='public_activity'));
 assert.equal(activity.plan.creatorRequirements.needsActivity,true);
 assert.match(activity.prompt,/公開記事の読める本文から/);
 assert.match(activity.prompt,/https:\/\/note\.com\/stored_author\//);
 assert.match(activity.plan.authorContext,/AUTHOR_ACTIVITY_SENTINEL/);
 cases++;
}
applyCollection('halloween');
// A name embedded in another permitted role also receives name resolution.
assert.equal(creatorCopyRequirements({mode:'selected',slots:[{role:'制作クレジット',text:'作：'+CREATOR_NAME_TOKEN}]}).needsNameLookup,true);
assert.equal(JSON.stringify(owner),before,'Filtering author work must not mutate the stored profile');
const manifest=selectionReferenceManifest(base);
assert.equal(manifest.conditions.length,10,'Focused delivery must preserve every selected condition');
for(const condition of manifest.conditions)assert.equal(condition.value,base[condition.key],'Focused metadata loses '+condition.key);
assert.deepEqual(selectionReferenceCounts(manifest),{selected:10,sheet:0,separateStyle:1});
assert.equal(manifest.items.length,0,'Focused normal production cannot attach comparison diagrams as a sheet');
assert.equal(manifest.attachmentPolicy.mode,'focused-originals');
assert.equal(manifest.attachmentPolicy.duplicateMedium,false);
const preset=stylePresetFor(base.medium),comparison=individualSelectionReferenceManifest(manifest);
assert.equal(manifest.mediumReference.delivery,'separate-original');
assert.equal(manifest.mediumReference.file,preset.file,'Selected style must use its original file');
assert.equal(manifest.mediumReference.name,preset.name);
assert.equal(manifest.mediumReference.inSheet,false,'Style original cannot be duplicated in a sheet');
assert.ok(!manifest.diagnosticItems.some(item=>item.key==='medium'),'Optional comparison diagrams cannot duplicate the full style original');
assert.ok(!comparison.some(item=>item.key==='medium'));
assert.equal(new Set(comparison.map(item=>item.name)).size,comparison.length,'Comparison filenames cannot collide');
for(const key of ['theme','costume','pose','mood','angle','design']){
 const item=manifest.diagnosticItems.find(item=>item.key===key),original=sampleFor(key,base[key]),reference=comparison.find(reference=>reference.key===key);
 assert.ok(item&&item.sample.kind==='image',key+' must retain its optional comparison image');
 assert.equal(item.value,base[key]);
 assert.equal(item.scope,attachmentConditionPolicy(key,base,{comparison:true}).scope,key+' comparison must retain only its assigned role');
 assert.equal(item.sample.src,original.src,key+' comparison cannot substitute another sample or a reduced preview');
 assert.equal(item.sample.label,original.label,key+' display and comparison must describe the same sample');
 assert.ok(reference,key+' optional comparison reference is missing');
 assert.equal(reference.role,'selection-condition');
 assert.equal(reference.scope,item.scope);
 assert.equal(reference.source,original.src,key+' original comparison image source must survive handoff');
 const source=new URL(original.src,import.meta.url),expectedKind=source.hash||/\.svg$/i.test(source.pathname)?'native-svg-view':'original-raster';
 assert.equal(reference.sourceKind,expectedKind,key+' original raster or selected SVG view must be preserved');
 assert.doesNotMatch(item.sample.label,/生成の参照画像には使いません/);
 assert.match(item.sample.label,/選択条件の比較見本。/,'Label must explicitly identify this as an optional selected-condition comparison');
 assert.doesNotMatch(item.sample.label,/見本シートに添付し/,key+' common label cannot promise a sheet that focused delivery omits');
}
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
assert.match(app,/creatorDisplayLabel\(r\.profile,r\.production\?\.copy\)/,'Result, ZIP and history labels must use the same permitted manuscript');
console.log('PASS '+cases+' real-plan actual handoffs: no author research/context for blank, literal HALLOWEEN and scene-only copy; unresolved name-only lookup; public-activity source lookup preserved; saved profile unchanged; all ten focused conditions survive with no sheet/style duplication, and optional comparison labels, roles and original sources match.');
