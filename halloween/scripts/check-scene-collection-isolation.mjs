import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {questions,AUTO,resolveSelections} from '../catalog.js?v=28.4.6';
import {applyCollection} from '../collection.js?v=28.4.6';
import {initialSelections,proposalBatch,effectiveSelections} from '../modes.js?v=28.4.6';
import {randomItemSelection} from '../random-selections.js?v=28.4.6';
import {pickerRecords} from '../picker-priority.js?v=28.4.6';
import {halloweenSceneTitles,halloweenSceneFocus} from '../scene-presets.js?v=28.4.6';
import {halloweenOnlySceneTitles,sceneAvailableInCollection,selectionAvailableInCollection,collectionForScene,restoreSceneSelections,restoreCollectionSnapshot} from '../scene-collection-policy.js';
import {collectionFavorites,favoriteStorageKeys} from '../favorites.js?v=28.4.6';
import {optionRecipe} from '../option-recipes.js?v=28.4.6';
import {buildDirection} from '../direction.js?v=28.4.6';
import {productionPlan,repairPrompt} from '../production-plan.js?v=28.4.6';
import {renderChatInput,renderDetailedChatInput} from '../compiled-production.js?v=28.4.6';
import {compactHistoryRecord,restoreHistoryRecord} from '../history-storage.js?v=28.4.6';
import {sourceKinds} from '../source-kind.js?v=28.4.6';

const all=()=>questions.find(q=>q.key==='theme').groups.flatMap(g=>g.values);
const generic=['魔女の書斎','月下の墓地','カボチャ畑','異界の鳥居','吸血鬼の晩餐会','幽霊たちのお茶会','魔法使いの見習い','お菓子の王国','月夜の仮面舞踏会','雨上がりのホラー','百鬼夜行','秘密の図書館','星を集める旅'];
const fixed={sceneUnified:true,medium:'透明水彩',costume:'参照画像の衣装を生かす',pose:'まっすぐ立つ',angle:'斜め前45度',mood:'目を閉じて安らぐ',palette:'モノクローム',design:'通常の一枚絵',type:'文字を一切入れない',line:'セリフなし'};
const profile={displayName:'シーン分離検査',activityEnabled:false};
let seed=673;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const seasonal=/Halloween|ハロウィーン|ハロウィン|10月31日/i;
function checkOrdinaryText(text,label){
 // Negative guards may name Halloween, but must never prescribe its event.
 for(const line of text.split('\n').filter(line=>seasonal.test(line)))assert.match(line,/追加しない|付与せず|混ぜない|追加せず/,label+' contains a positive seasonal instruction: '+line);
 assert.doesNotMatch(text,/Halloween版。|【Halloweenの場面】|Halloween版／|海外のHalloweenの収穫畑|選択されたHalloweenの本/);
}
try{
 applyCollection('halloween');const halloweenBefore=JSON.stringify(questions);
 assert.deepEqual(new Set(all()),new Set(halloweenSceneTitles));
 for(const value of halloweenOnlySceneTitles)assert.ok(all().includes(value));
 applyCollection('everyday');
 const scenes=all();assert.equal(scenes.length,112);assert.equal(new Set(scenes).size,112);
 for(const theme of halloweenOnlySceneTitles)assert.ok(!scenes.includes(theme),theme+' is still in the ordinary catalogue');
 for(const theme of generic)assert.ok(scenes.includes(theme),theme+' was wrongly removed by spooky/seasonal keywords');
 assert.ok(questions.find(q=>q.key==='theme').groups.every(group=>!seasonal.test(group.label)));
 const question=questions.find(q=>q.key==='theme');
 for(const group of ['すべて',...question.groups.map(group=>group.label)])for(const record of pickerRecords(question,{group,collection:'everyday',favorites:halloweenOnlySceneTitles}))assert.ok(sceneAvailableInCollection(record.value,'everyday'));
 for(let i=0;i<1200;i++){
  assert.ok(sceneAvailableInCollection(randomItemSelection(question,fixed,()=>i/1200).value,'everyday'),'Individual random leaks a seasonal scene');
  const values=resolveSelections({...effectiveSelections(i%2?'simple':'auto',initialSelections()),sceneUnified:true},random,{recent:[{theme:'宇宙のHalloween'}]});
  assert.ok(sceneAvailableInCollection(values.theme,'everyday'));
 }
 for(let i=0;i<100;i++)for(const proposal of proposalBatch(initialSelections(),random,{recent:[{...fixed,theme:'静かなハロウィーン'}]}).proposals)assert.ok(sceneAvailableInCollection(proposal.theme,'everyday'));

 // Full recipe/semantic/delivery coverage for every retained scene, including
 // a person and a no-person editorial output. No thumbnail judgement is made.
 let deliveries=0;
 for(const theme of scenes)for(const noPerson of [false,true]){
  const values=resolveSelections({...initialSelections(),...fixed,theme,...(noPerson?{costume:'風景を主役にする',design:'新聞の一面'}:{})},random);
  const recipe=optionRecipe('theme',theme,{values,collection:'everyday'});
  assert.ok(recipe.known,theme+' lost its recipe');
  assert.ok(recipe.sections.every(section=>section.label!=='Halloweenの場面'));
  checkOrdinaryText(recipe.sections.map(section=>section.text).join('\n'),theme+' recipe');
  const plan=productionPlan(profile,values,buildDirection([],values.mood,random,'everyday',values),'everyday',random);
  for(const text of [renderChatInput(plan),renderDetailedChatInput(plan),repairPrompt({collection:'everyday',values,production:plan,variant:plan.variant})])checkOrdinaryText(text,theme+' compiled delivery');
  assert.ok(!plan.conditions.some(condition=>condition.sections.some(section=>section.label==='Halloweenの場面')));
  deliveries++;
 }
 for(const theme of halloweenOnlySceneTitles){
  applyCollection('halloween');
  const values=resolveSelections({...initialSelections(),...fixed,theme},random);
  const plan=productionPlan(profile,values,buildDirection([],values.mood,random,'halloween',values),'halloween',random);
  assert.ok(renderChatInput(plan).includes(halloweenSceneFocus(theme)),theme+' lost its seasonal delivery');
 }

 // Current state fallbacks are copies. Archived selections and every other
 // field remain exact, and replay deliberately selects the visible edition.
 for(const theme of halloweenOnlySceneTitles){
  const old={...initialSelections(),...fixed,theme,place:theme,sourceKind:'photo-person',customField:'retain'};
  const snapshot={mode:'simple',selections:old,modeSnapshots:{detail:old,simple:old,auto:{...old,theme:'月下の墓地'}},selectedProposal:old,proposals:[old,{...old,theme:'月下の墓地'}]};
  const before=structuredClone(snapshot),restored=restoreCollectionSnapshot(snapshot,'everyday');
  assert.deepEqual(snapshot,before);assert.equal(restored.selections.theme,AUTO);assert.equal(restored.selections.place,AUTO);
  assert.deepEqual(restored.selections,{...old,theme:AUTO,place:AUTO});
  assert.equal(restored.modeSnapshots.detail.theme,AUTO);assert.equal(restored.modeSnapshots.simple.theme,AUTO);assert.equal(restored.modeSnapshots.auto.theme,'月下の墓地');
  assert.equal(restored.selectedProposal,null);assert.deepEqual(restored.proposals,[snapshot.proposals[1]]);assert.equal(restored.sceneReset,true);
  assert.deepEqual(restoreCollectionSnapshot(snapshot,'halloween').selections,old);
  assert.equal(collectionForScene(old,'everyday'),'halloween');
  const record={version:28,collection:'everyday',values:old,production:{conditions:[],values:old},prompt:'保存した原文 '+theme,edition:'OLD-'+theme};
  const packed=await compactHistoryRecord(record,{Compression:null,Decompression:null}),unpacked=await restoreHistoryRecord(packed,{Decompression:null});
  assert.deepEqual(unpacked.values,old);assert.equal(unpacked.collection,'everyday');assert.equal(unpacked.prompt,record.prompt);
 }
 for(const theme of [...generic,'Halloweenという本を読む、利用者の自由入力']){
  const value={...fixed,theme};assert.equal(restoreSceneSelections(value,'everyday'),value);assert.equal(collectionForScene(value,'everyday'),'everyday');
 }
 const favorites={'everyday:theme':['宇宙のHalloween','月下の墓地','利用者の自由入力'],'halloween:theme':['宇宙のHalloween']},saved=structuredClone(favorites);
 assert.deepEqual(collectionFavorites(favorites,'everyday','theme'),['月下の墓地','利用者の自由入力']);assert.deepEqual(collectionFavorites(favorites,'halloween','theme'),['宇宙のHalloween']);assert.deepEqual(favorites,saved);
 assert.deepEqual(collectionFavorites({'everyday:theme':['静かなハロウィーン']},'halloween','theme'),['静かなハロウィーン']);
 assert.deepEqual(favoriteStorageKeys(favorites,'halloween','theme','宇宙のHalloween'),['halloween:theme','everyday:theme']);

 // Run the actual history replay handler, including its visible setCollection
 // and old-value handoff. Never silently generate Halloween under everyday UI.
 const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
 const handler=app.slice(app.indexOf("$('again').addEventListener('click',async()=>{"),app.indexOf("$('help').addEventListener",app.indexOf("$('again').addEventListener")));
 assert.ok(handler.startsWith("$('again').addEventListener"));
 for(const mode of ['detail','simple','auto'])for(const theme of ['宇宙のHalloween','月下の墓地']){
  let click,generated;const old={collection:'everyday',values:{...fixed,theme,sourceKind:'photo-person'}};const before=structuredClone(old),messages=[];
  const context=vm.createContext({$:()=>({addEventListener:(event,callback)=>{click=callback;}}),currentResult:old,collection:'everyday',collectionForScene,sourceKinds,sourceKind:'unknown',selections:{},selectedProposal:null,mode,AUTO,renderSourceKinds(){},renderChoices(){},tell:message=>messages.push(message)});
  context.setCollection=next=>{context.collection=next;context.visibleCollection=next;};
  context.generate=async values=>{generated={values,collection:context.collection,visibleCollection:context.visibleCollection||'everyday'};};
  vm.runInContext(handler,context);await click();
  assert.equal(generated.collection,theme==='宇宙のHalloween'?'halloween':'everyday');assert.equal(generated.visibleCollection,generated.collection);
  assert.deepEqual(generated.values,old.values);assert.deepEqual(old,before);
  if(mode==='auto')assert.deepEqual({...context.selectedProposal},old.values);
 }
 const chooseSource=app.slice(app.indexOf('function choose(v){'),app.indexOf('\nfunction summarizeName',app.indexOf('function choose(v){')));
 const chooseContext=vm.createContext({activeQuestion:{key:'theme'},collection:'everyday',selectionAvailableInCollection,tell(){}});
 vm.runInContext(chooseSource,chooseContext);assert.doesNotThrow(()=>chooseContext.choose('宇宙のHalloween'),'Known seasonal custom input must be rejected before changing any selection');
 assert.match(app,/if\(!sceneAvailableInCollection\(input.theme,collection\)\)/,'Generation needs a final boundary guard');
 for(let i=0;i<4;i++){applyCollection('halloween');assert.equal(JSON.stringify(questions),halloweenBefore);applyCollection('everyday');assert.deepEqual(all(),scenes);}
 console.log('PASS scene isolation: five seasonal events stay Halloween-only; 112 ordinary scenes, 1200 item draws, 1200 automatic/simple draws, 300 proposals, '+deliveries+' recipe/semantic/compiled/repair cases, copied state fallback, unchanged history/favorites, explicit replay collection and repeated switches. Image quality was not tested.');
}finally{applyCollection('halloween');}
