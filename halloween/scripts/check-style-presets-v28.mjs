import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {stylePresets,stylePresetFor,stylePresetInstructions,stylePresetRoleDescription,loadStylePresets} from '../style-presets.js?v=28.4.0';
import {drawingReferenceFor,deliveryImageFiles} from '../drawing-references.js?v=28.4.0';
import {questions,resolveSelections} from '../catalog.js?v=28.4.0';
import {initialSelections} from '../modes.js?v=28.4.0';
import {applyCollection} from '../collection.js?v=28.4.0';
import {productionPlan,repairPrompt,planInstructions} from '../production-plan.js?v=28.4.0';
import {composePrompt} from '../prompt.js?v=28.4.0';
import {composeArtworkStage,composeArtworkRepair} from '../artwork-stage.js?v=28.4.0';
import {renderChatInput} from '../compiled-production.js?v=28.4.0';
import {composeStagedMaster} from '../production-workflow.js?v=28.4.0';

const root=new URL('../',import.meta.url),random=()=>.34,profile={displayName:'PRESET CHECK',activityEnabled:false};
applyCollection('halloween');
const media=questions.find(q=>q.key==='medium').groups.flatMap(g=>g.values).filter(value=>value!=='おまかせ');
assert.equal(media.length,114);
assert.equal(stylePresets.length,media.length);
assert.deepEqual(new Set(stylePresets.map(ref=>ref.medium)),new Set(media));
for(const key of ['medium','file','name'])assert.equal(new Set(stylePresets.map(ref=>ref[key])).size,114,key+' must be distinct for each preset');
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
assert.equal(hashes.size,114,'Distinct preset files must not contain duplicate images');
assert.equal(fetches,114);await loadStylePresets(stylePresets,{fetchImpl});assert.equal(fetches,114,'Repeated preparation must reuse cached images');
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
assert.equal(sent.length,5);assert.equal(sent[0].name,ordinary.name);for(let i=0;i<4;i++)assert.equal(await sent[i+1].text(),await users[i].file.text());
let routesChecked=0;
for(const collection of ['halloween','everyday'])for(const preset of stylePresets)for(const noPerson of [false,true]){
 applyCollection(collection);
 const values=resolveSelections({...initialSelections(),sceneUnified:true,sourceKind:noPerson?'scenery':'illustration-person',medium:preset.medium,theme:collection==='halloween'?'都会の仮装パレード':'街角アニメ日和',costume:noPerson?'風景を主役にする':'参照画像の衣装を生かす',design:'通常の一枚絵',palette:'モノクローム',type:'文字を一切入れない',line:'セリフなし'},random);
 values.sourceKind=noPerson?'scenery':'illustration-person';
 const plan=productionPlan(profile,values,{},collection,random),prompt=composePrompt({collection,profile,values,variant:plan.variant,preparedPlan:plan,references:[preset,{role:'identity',name:'character.png'}],edition:'STYLE-PRESET-CHECK'});
 const routes=[prompt,renderChatInput(plan),composeArtworkStage(plan),composeArtworkRepair(plan),composeArtworkRepair(plan,{compact:true}),repairPrompt({production:plan,values}),planInstructions(plan).join('\n'),composeStagedMaster(plan,['画像生成の制作仕様','【作品モード】','【作成者が添付する参照画像】','【10の選択】'],{verbose:true})];
 for(const route of routes){
  assert.ok(route.includes(preset.name),collection+' / '+preset.medium+' lost the actual attached preset filename');
  for(const text of stylePresetInstructions(preset.medium,{noPerson,values}))assert.ok(route.includes(text),preset.medium+' lost preset-role instructions');
  routesChecked++;
 }
 const description=stylePresetRoleDescription(preset,values,{noPerson});
 if(preset.role==='style-preset'){
  assert.ok(prompt.includes(description),'The preset must be classified separately from the character');
  assert.match(description,/小道具・構図・背景・配色はコピーしない/);
  const instructions=stylePresetInstructions(preset.medium,{noPerson,values}).join(' ');
  assert.match(instructions,/見本の配色に固定せず/);assert.match(instructions,/コピーだけでは見本画像は届かない/);assert.match(instructions,/名前だけで画像を見たと扱わない/);
  if(noPerson)assert.match(description,/人物・顔・手足を完全に除外/);
 }
 assert.equal(plan.values.medium,preset.medium);assert.equal(plan.values.palette,'モノクローム');
}
applyCollection('halloween');
console.log('PASS 114 assistant style presets: distinct existing images, exact original bytes and MIME, local validated catalog/cache/retry, separate character + preset transfer, '+routesChecked+' prompt/stage/repair routes, no jewel or sample-identity/scene/palette leakage. Generated appearance requires visual review.');
