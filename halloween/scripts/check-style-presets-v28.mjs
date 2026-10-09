import assert from 'node:assert/strict';
import {assertCompactHandoff} from './compact-handoff-assertions-v28.mjs';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {stylePresets,stylePresetFor,stylePresetInstructions,stylePresetRoleDescription,loadStylePresets} from '../style-presets.js?v=28.4.6';
import {drawingReferenceFor,deliveryImageFiles} from '../drawing-references.js?v=28.4.6';
import {questions,resolveSelections} from '../catalog.js?v=28.4.6';
import {initialSelections} from '../modes.js?v=28.4.6';
import {applyCollection} from '../collection.js?v=28.4.6';
import {productionPlan,repairPrompt,planInstructions} from '../production-plan.js?v=28.4.6';
import {composePrompt} from '../prompt.js?v=28.4.6';
import {composeArtworkStage,composeArtworkRepair} from '../artwork-stage.js?v=28.4.6';
import {renderChatInput} from '../compiled-production.js?v=28.4.6';
import {composeStagedMaster} from '../production-workflow.js?v=28.4.6';
import {usesFocusedProduction} from '../focused-production.js?v=28.4.6';
import {renderRecipeChatInput} from '../compact-production.js?v=28.4.6';
import {assertFocusedHandoff} from './focused-handoff-assertions-v28.mjs';
import {volumetricReferenceMedia} from '../attachment-policy.js?v=28.4.6';

const root=new URL('../',import.meta.url),random=()=>.34,profile={displayName:'PRESET CHECK',activityEnabled:false};
applyCollection('halloween');
const media=questions.find(q=>q.key==='medium').groups.flatMap(g=>g.values).filter(value=>value!=='おまかせ');
assert.ok(media.length>=115);
assert.equal(stylePresets.length,media.length);
assert.deepEqual(new Set(stylePresets.map(ref=>ref.medium)),new Set(media));
for(const key of ['medium','file','name'])assert.equal(new Set(stylePresets.map(ref=>ref[key])).size,media.length,key+' must be distinct for each preset');
assert.notEqual(stylePresetFor('宵彩ゴシックアニメ').file,stylePresetFor('ゴシック・ロマン主義').file,'The anime preset must not reuse a photographic sample');
assert.equal(stylePresetFor('未登録作風'),null);assert.deepEqual(stylePresetInstructions('未登録作風'),[]);
const hashes=new Set();let fetches=0;
const fetchImpl=async url=>{fetches++;const type=url.pathname.endsWith('.png')?'image/png':'image/jpeg';return new Response(fs.readFileSync(url),{headers:{'Content-Type':type}});};
const loaded=await loadStylePresets(stylePresets,{fetchImpl});
for(let index=0;index<stylePresets.length;index++){
 const preset=stylePresets[index],bytes=fs.readFileSync(new URL(preset.file,root)),prepared=loaded[index];
 assert.match(preset.file,/^[a-zA-Z0-9_/-]+\.(png|jpg)$/);
 assert.ok(preset.label&&preset.category);
 assert.deepEqual(Buffer.from(await prepared.file.arrayBuffer()),bytes,'The sent preset must preserve original image bytes');
 assert.equal(prepared.file.name,preset.name);assert.equal(prepared.file.type,preset.file.endsWith('.png')?'image/png':'image/jpeg');
 hashes.add(crypto.createHash('sha256').update(bytes).digest('hex'));
 const jewel=drawingReferenceFor(preset.medium);
 if(jewel){assert.equal(preset.role,'drawing');assert.equal(preset.file,jewel.file);assert.equal(preset.name,jewel.name);}
 else{assert.equal(preset.role,'style-preset');assert.equal(drawingReferenceFor(preset.medium),null);assert.doesNotMatch(stylePresetInstructions(preset.medium).join(' '),/画像編集の土台|背景透過の完成基画|宝石光彩の画風原画/);}
}
assert.equal(hashes.size,media.length,'Distinct preset files must not contain duplicate images');
assert.equal(fetches,media.length);await loadStylePresets(stylePresets,{fetchImpl});assert.equal(fetches,media.length,'Repeated preparation must reuse cached images');
const ordinary=stylePresetFor('発光幻想アニメ');
await assert.rejects(loadStylePresets([{...ordinary,file:'https://example.test/image.png'}],{fetchImpl}),/指定/);
await assert.rejects(loadStylePresets([{...ordinary,name:'forged.png'}],{fetchImpl}),/指定/);
await assert.rejects(loadStylePresets([{...ordinary,role:'identity'}],{fetchImpl}),/指定/);
await assert.rejects(loadStylePresets([ordinary],{fetchImpl:async()=>new Response('missing',{status:404})}),/読み込めません/);
let retryCalls=0;const retry=async url=>{retryCalls++;if(retryCalls===1)return new Response('missing',{status:404});return new Response(fs.readFileSync(url),{headers:{'Content-Type':'image/png'}});};
await assert.rejects(loadStylePresets([ordinary],{fetchImpl:retry}),/読み込めません/);assert.equal((await loadStylePresets([ordinary],{fetchImpl:retry})).length,1);assert.equal(retryCalls,2);
await assert.rejects(loadStylePresets([ordinary],{fetchImpl:async()=>new Response('html',{headers:{'Content-Type':'text/html'}})}),/画像形式/);
await assert.rejects(loadStylePresets([ordinary],{fetchImpl:async()=>new Response('not a PNG',{headers:{'Content-Type':'image/png'}})}),/画像内容/);

const users=Array.from({length:4},(_,index)=>({file:new File(['USER BYTES '+index],'user-'+index+'.png',{type:'image/png'}),role:index?'support':'identity'}));
const sent=deliveryImageFiles({localDrawingRefs:[loaded[stylePresets.findIndex(ref=>ref.medium===ordinary.medium)]],localRefs:users,references:users.map((ref,index)=>({name:'character-'+index+'.png',role:ref.role}))});
assert.equal(sent.length,5);assert.ok(sent.some(file=>file.name===ordinary.name));for(let i=0;i<4;i++){assert.equal(sent[i].name,'character-'+i+'.png');assert.equal(await sent[i].text(),await users[i].file.text());}
let routesChecked=0;
for(const collection of ['halloween','everyday'])for(const preset of stylePresets)for(const noPerson of [false,true]){
 applyCollection(collection);
 const values=resolveSelections({...initialSelections(),sceneUnified:true,sourceKind:noPerson?'scenery':'illustration-person',medium:preset.medium,theme:collection==='halloween'?'都会の仮装パレード':'街角アニメ日和',costume:noPerson?'風景を主役にする':'参照画像の衣装を生かす',...(noPerson?{pose:'おまかせ',mood:'毎回大胆に変える'}:{}),design:'通常の一枚絵',palette:preset.medium==='サイアノタイプ'?'参照画像の色を生かす':preset.medium==='クリスタルホログラム造形アニメ'?'群青 × 菫 × 星白':'モノクローム',type:'文字を一切入れない',line:'セリフなし'},random);
 values.sourceKind=noPerson?'scenery':'illustration-person';
 const plan=productionPlan(profile,values,{},collection,random);plan.referenceManifest=[preset,{role:'identity',name:'character.png'}];const prompt=composePrompt({collection,profile,values,variant:plan.variant,preparedPlan:plan,references:[preset,{role:'identity',name:'character.png'}],edition:'STYLE-PRESET-CHECK'});
 assertCompactHandoff(plan,prompt);assert.ok(prompt.includes(preset.name));assert.ok(prompt.includes('character.png'));
 const focused=usesFocusedProduction(plan),recipe=focused?renderRecipeChatInput(plan,plan.referenceManifest):null;
 if(focused){
  assertFocusedHandoff(plan,prompt,collection+' / '+preset.medium+' actual preset');
  if(volumetricReferenceMedia.includes(preset.medium))assert.match(prompt,/1枚目の選択画風原画を編集の土台にする/,'The supplied original image must own the world-editing step');
  else assert.match(prompt,/原寸の選択画風見本.*(?:制作の土台・編集の基準|描法だけの資料)/,'The actual focused preset must supply full-resolution drawing method');
  assert.ok(recipe.includes('原寸見本'),'The authored full-resolution wording must survive on the recipe review renderer');
 }else assert.ok(prompt.includes('原寸見本'));
 const routes=[renderChatInput(plan),composeArtworkStage(plan),composeArtworkRepair(plan),composeArtworkRepair(plan,{compact:true}),repairPrompt({production:plan,values}),planInstructions(plan).join('\n')];
 for(const [routeIndex,route] of routes.entries()){
  assert.ok(route.includes(preset.name),collection+' / '+preset.medium+' lost the actual attached preset filename');
  if(routeIndex===4&&volumetricReferenceMedia.includes(preset.medium)){assert.match(route,/完成画像を編集の土台/);assert.match(route,/原画は光彩・造形・材質の描法だけに使う/);assert.match(route,/元の人物写真・元イラスト・見本シート・個別条件見本は再添付しない/);}
  else for(const text of stylePresetInstructions(preset.medium,{noPerson,values}))assert.ok(route.includes(text),preset.medium+' route '+routeIndex+' lost preset-role instructions');
  routesChecked++;
 }
 const description=stylePresetRoleDescription(preset,values,{noPerson});
 if(preset.role==='style-preset'){
  if(focused){
   if(volumetricReferenceMedia.includes(preset.medium)){
    assert.match(prompt,/character\.png：最初の差替で読む本人または主題の識別資料。[^\n]*以後の画像入力へ再添付しない/);
    if(noPerson){assert.match(prompt,/原画の人物を除き/);assert.doesNotMatch(prompt,/本人へ差し替|本人の輪郭/);}else assert.match(prompt,/識別特徴だけを2枚目の本人へ差し替/);
    assert.match(prompt,/本人画像の衣装・着脱可能な仮装の角・動物耳のカチューシャ・装身具・飾り・撮影姿勢・撮影光・背景は移さない|人物・顔・人体・手足・人型を追加しない/);
    assert.match(prompt,/選択衣装・場面・ポーズ・表情・投影・配色を描き直す/);
   }else{
    if(noPerson){assert.match(prompt,/主参照「character\.png」[^\n]*選択された景物・物体・図案/);assert.doesNotMatch(prompt,/人物を今回の本人へ差し替|今回の本人の識別特徴だけ/,'No-person output cannot borrow a sample or source person');}
    else assert.match(prompt,/主参照「character\.png」[^\n]*今回の本人の識別特徴だけ|人物識別参照「prepared-identity\.png」の同じ人物/,'The actual character reference must remain separate from the style image');
    assert.match(prompt,/見本の人物・性別・髪型・衣装・小道具・(?:背景の具体的な配置・)?構図・文字は引き継がない/,'Focused transfer must not import the example identity, costume, props, background arrangement, composition or text');
   }
   assert.match(recipe,/作成者の主参照/,'Detailed character reference must remain separate');assert.match(recipe,/人物・衣装・小道具・構図・舞台は借用しない/);
  }else {assert.match(prompt,/作成者の主参照/,'Character reference must remain separate');assert.match(prompt,/人物・衣装・小道具・構図・舞台は借用しない/);}
  const verbose=composeStagedMaster(plan,['画像生成の制作仕様','【作品モード】','【作成者が添付する参照画像】','【10の選択】'],{verbose:true});assertCompactHandoff(plan,verbose);assert.ok(verbose.includes(preset.name));
  assert.match(description,/小道具・構図・背景・配色はコピーしない/);
  const instructions=stylePresetInstructions(preset.medium,{noPerson,values}).join(' ');
  assert.match(instructions,/見本の配色に固定せず/);assert.match(instructions,/コピーだけでは見本画像は届かない/);assert.match(instructions,/名前だけで画像を見たと扱わない/);
  if(noPerson)assert.match(description,/人物・顔・手足を完全に除外/);
 }
 assert.equal(plan.values.medium,preset.medium);assert.equal(plan.values.palette,values.palette);
}
applyCollection('halloween');
console.log('PASS '+stylePresets.length+' assistant style presets: distinct existing images, exact original bytes and MIME, local validated catalog/cache/retry, separate character + preset transfer, '+routesChecked+' prompt/stage/repair routes, no jewel or sample-identity/scene/palette leakage. Generated appearance requires visual review.');
