import assert from 'node:assert/strict';
import {assertCompactHandoff,compactReferences,includesClause,sentenceClauses} from './compact-handoff-assertions-v28.mjs';
import fs from 'node:fs';
import {initialSelections} from '../modes.js?v=28.4.6';
import {resolveSelections} from '../catalog.js?v=28.4.6';
import {productionPlan} from '../production-plan.js?v=28.4.6';
import {composePrompt} from '../prompt.js?v=28.4.6';
import {renderChatInput,renderInput} from '../compiled-production.js?v=28.4.6';
import {stylePresetFor,stylePresetInstructions,loadStylePresets} from '../style-presets.js?v=28.4.6';
import {composeArtworkStage,composeArtworkRepair} from '../artwork-stage.js?v=28.4.6';
import {repairPrompt} from '../production-plan.js?v=28.4.6';
import {sampleFor} from '../examples.js?v=28.4.6';
import {lightingContract} from '../art-direction.js?v=28.4.6';
import {colorPolicy} from '../color-policy.js?v=28.4.6';
import {candidateAvailability} from '../compatibility.js?v=28.4.6';
import {fantasyStyleDefinitions} from '../fantasy-style-definitions.js?v=28.4.6';
import {luminousWorldContract} from '../luminous-world.js?v=28.4.6';
import {usesFocusedProduction} from '../focused-production.js?v=28.4.6';
import {renderRecipeChatInput} from '../compact-production.js?v=28.4.6';
import {assertFocusedHandoff} from './focused-handoff-assertions-v28.mjs';

const rng=()=>.23,profile={displayName:'WORLD TRANSFER',activityEnabled:false};
const base=resolveSelections({...initialSelections(),sceneUnified:true,medium:'発光幻想アニメ',theme:'怪奇サーカス',costume:'ミイラ',palette:'星灯りの青紫',type:'デザインに合わせて自動編集'},rng);
let checked=0;
for(const medium of ['発光幻想アニメ','発光幻想リアル'])for(const sourceKind of ['unknown','photo-person','illustration-person','scenery','mark-object'])for(const design of ['通常の一枚絵','映画ポスター','新聞の一面']){
 const values={...base,medium,sourceKind,design},plan=productionPlan(profile,values,{},'halloween',rng);
 const prompt=composePrompt({profile,values,variant:plan.variant,preparedPlan:plan,references:[stylePresetFor(values.medium),{role:'identity',name:'character.jpg'}],edition:'LUMINOUS'});
 assertCompactHandoff(plan,prompt);
 const focused=usesFocusedProduction(plan),recipe=focused?renderRecipeChatInput(plan,plan.referenceManifest):null;
 if(focused){
  assertFocusedHandoff(plan,prompt,medium+' / '+sourceKind+' / '+design+' actual focused transfer');
  const final=prompt.split('【統合するための制作仕様：開始】')[1].split('【統合するための制作仕様：終了】')[0];
  const drawing=final.indexOf('作画「'+medium+'」');
  assert.ok(drawing>0&&drawing<final.indexOf('固定カメラ：'),'Positive medium construction must precede scene and layout in the final image-call payload');
  assert.match(final,/広い深暗部と小面積の強光/);assert.match(final,/不透明な肌・布・金属をガラス化しない/);
  assert.match(final,/見本の線、色面、陰影、光の強さと密度を保ったまま|線・色面・陰影・光の強さと密度だけを同じ主役へ適用|線、色面、陰影、光の強さと密度を今回の主役と場面へ適用|線・顔と身体の2D色面・光と深い影・反射色の重なり・明暗差・描き込みの密度を維持/);
  if(plan.noPerson)assert.match(final,/主景・物体・景物・支持面・可視背景/);
  else assert.match(final,/顔・瞳・見える肌・衣服・景物・背景それぞれに暗部内の色光を連続/);
 }else{
  const priority=prompt.indexOf('【'+medium+'：人物と背景を一つの光の世界へ】');
  assert.ok(priority>0&&priority<2500,'Full luminous transfer must be in the actual opening handoff');
  assert.ok(priority<prompt.indexOf('【主題と描画の統一】'),'The medium must be explicit before wardrobe/layout detail');
  const early=prompt.slice(priority,priority+550);
  assert.match(early,/顔.*腕.*手指.*脚.*足.*衣装/);assert.match(early,/広い深暗部.*小面積の強い幻想光/);
  assert.match(early,/被覆/);assert.match(early,/色は選択配色/);
  if(medium==='発光幻想リアル'){assert.match(early,/自然な実物立体と精密な写真の材質/);assert.doesNotMatch(early,/2D描線/);}
  else {if(!['scenery','mark-object'].includes(sourceKind))assert.match(early,/基本頭身/);}
  if(['scenery','mark-object'].includes(sourceKind)){assert.match(early,/独自の主役を設計/);assert.doesNotMatch(early,/主参照の本人らしい特徴/);}
 }
 assert.doesNotMatch(prompt,/本来の素材のまま薄く光|薄い幻想光/);
 if(medium==='発光幻想アニメ')assert.match(renderChatInput(plan),/精密な少女漫画・日本2Dアニメの有色線と描いた平面陰影/);
 for(const instruction of stylePresetInstructions(values.medium,{values}))assert.ok(renderChatInput(plan).includes(instruction));
 assert.match(recipe||prompt,/深暗部と鋭い最明部の差、透明な色層と反射の密度/);assert.match(recipe||prompt,/作風見本を確認できない場合.*本文の作画仕様で生成/);
 checked++;
}
// The separately selectable polished rendering must survive all handoffs,
// without receiving the flat-face instruction specific to luminous anime.
for(const noPerson of [false,true]){
 const values={...base,medium:'艶彩幻想アニメ',design:'通常の一枚絵',type:'文字を一切入れない',...(noPerson?{costume:'風景を主役にする',pose:'おまかせ',mood:'毎回大胆に変える'}:{})};
 const plan=productionPlan(profile,values,{},'halloween',rng);
 plan.referenceManifest=[stylePresetFor(values.medium),{role:'identity',name:'character.jpg'}];
 const actual=composePrompt({profile,values,variant:plan.variant,preparedPlan:plan,references:plan.referenceManifest,edition:'POLISHED'});
 assertCompactHandoff(plan,actual);
 const polishedRoutes={actual,native:renderChatInput(plan),audit:renderInput(plan),artwork:composeArtworkStage(plan),artworkRepair:composeArtworkRepair(plan),repair:repairPrompt({values,production:plan,prompt:actual}),recipe:renderRecipeChatInput(plan,plan.referenceManifest)};
 for(const [name,route] of Object.entries(polishedRoutes)){
  if(['actual','repair'].includes(name)){
   assertFocusedHandoff(plan,route,'polished '+name+(noPerson?' scenery':' person'));
   assert.match(route,/柔らかな絵画的連続陰影/);assert.match(route,/深い.*影.*微細な反射/);
   assert.match(route,/平面セル影へ固定(?:せず|しない)/);
  }else{
   assert.match(route,noPerson?/柔らかな絵画的(?:な)?連続陰影/:/polished Japanese anime|滑らかな絵画的陰影/);
   assert.match(route,/平面セル影へ固定せず/);
  }
  assert.doesNotMatch(route,/精密な2D描線、広い深暗部|実写.*連続階調.*3D.*顔.*残さない/);
 }
}

// The three independent synthesized techniques must own their actual light
// handoff. Check the real typed-reference route as well as the full audit and
// artwork routes; a medium name alone does not establish drawing fidelity.
const independentMedia=['薄膜光彩アニメ','白域幾何・宇宙彩アニメ','艶彩幻想アニメ'];
const independentPalettes=['菫 × マンゴー × 白','モノクローム','金と黒の二色','黒と白と朱の三色','赤と黒だけ','金と黒の2色だけ','青・白のみ'];
const genericLight=/必要な反射だけ|写真の陰影や滑らかな3Dの質感へ戻さず/;
const naturalBase=/主参照の髪・肌・瞳の基礎色は識別のために残し|固有色が読める程度に重ねる|参照の識別色を保ち、主色/;
function independentCase(medium,palette,noPerson,collection='halloween'){
 const values={...base,medium,palette,collection,sourceKind:'photo-person',design:'通常の一枚絵',theme:'吸血鬼の晩餐会',place:'古城の大広間',angle:'超ローアングル・70度',
  type:'文字を一切入れない',line:'セリフなし',costume:noPerson?'風景を主役にする':'亡霊騎士',pose:noPerson?'おまかせ':'低くしゃがむ',mood:noPerson?'毎回大胆に変える':'牙を見せて威嚇'};
 const variant=noPerson?{}:{face:'選択ポーズに合う自然な頭と首の向き',expression:values.mood,pose:values.pose};
 const plan=productionPlan(profile,values,variant,collection,rng);
 const references=compactReferences(plan,noPerson?[]:[{role:'identity',name:'same-character.jpg'}]);
 const actual=composePrompt({profile,values,variant:plan.variant,collection,preparedPlan:plan,references,edition:'INDEPENDENT-LIGHT'});
 assert.equal(assertCompactHandoff(plan,actual,medium+' / '+palette+' / '+collection+' actual light'),true,'Independent light fixture must be executable');
 const routes={actual,native:renderChatInput(plan),audit:renderInput(plan),artwork:composeArtworkStage(plan),artworkRepair:composeArtworkRepair(plan),repair:repairPrompt({values,production:plan,prompt:actual}),recipe:renderRecipeChatInput(plan,plan.referenceManifest)};
 const light=lightingContract(values,{collection,noPerson}),policy=colorPolicy(values);
 const label=[medium,palette,noPerson?'scenery':'person',collection].join(' / ');
 assert.doesNotMatch(light,genericLight,label+' still uses the generic anime lighting fallback');
 if(medium==='薄膜光彩アニメ'){
  assert.match(light,/細線|細い.*線|極細/,label+' lost the fine drawn boundaries');
  assert.match(light,/2D|平面/,label+' lost the flat drawn construction');
  assert.match(light,/薄膜.*(?:層|色)|(?:層|色).*薄膜/,label+' lost the thin-film colour layers');
  assert.match(light,/曲面|面に沿|湾曲/,label+' lost surface-following colour');
  assert.match(light,/連続|つな|続/,label+' lost continuous colour layers');
  if(!noPerson){assert.match(light,/顔/,label+' lost the flat face');assert.match(light,/髪/,label+' lost hair layers');assert.match(light,/衣服|衣装/,label+' lost clothing layers');}
  assert.match(light,/景物|景観|背景/,label+' lost environment layers');
 }else if(medium==='白域幾何・宇宙彩アニメ'){
  assert.match(light,/白い抜き|白抜き|白い余白|許可.*最明部/,label+' lost the open bright ground');
  assert.match(light,/細.*(?:幾何|構造).*線|幾何.*細.*線/,label+' lost fine geometric lines');
  assert.match(light,/少数.*(?:2D|影)|(?:2D|影).*少数/,label+' lost the sparse flat shadows');
  assert.match(light,/宇宙.*(?:濃|色)|濃.*宇宙/,label+' lost local dense cosmic colour');
  assert.doesNotMatch(light,/全域.*(?:発光粒|均一.*光粒|密な.*艶)/,label+' replaced open geometry with luminous density');
 }else{
  assert.match(light,/柔らか.*(?:絵画|連続)|(?:絵画|連続).*柔らか/,label+' lost painterly continuous shading');
  assert.match(light,/深い.*影|深暗部/,label+' lost deep shadow');
  assert.match(light,/鋭い.*(?:艶|光)|(?:艶|光).*鋭/,label+' lost sharp gloss');
  assert.doesNotMatch(light,/精密な2D描線、広い深暗部|平面セル影へ固定する/,label+' inherited the flat luminous pipeline');
 }
 if(noPerson){
  const positiveBody=/(?:顔|肌|髪|身体|人体|瞳|虹彩|首|腕|指|脚|足)[^。]{0,100}(?:へ|に|まで)[^。]{0,75}(?:光|反射|陰影|色層)[^。]{0,75}(?:描く|置く|重ね|連続|回す|つなぐ)/;
  assert.doesNotMatch(light,positiveBody,label+' scenery light creates a human surface');
 }
 for(const [route,text] of Object.entries(routes)){
  assert.doesNotMatch(text,genericLight,label+' / '+route+' reintroduced generic light');
  // The structured audit retains every authored engineering clause, while
  // the prose routes also deliver the resolved scene light and its priority.
  const entry=fantasyStyleDefinitions.find(style=>style.value===medium);
  if(['actual','repair'].includes(route)){
   assertFocusedHandoff(plan,text,label+' / '+route+' focused dedicated drawing/light');
   assert.match(text,/光は小さく鋭い芯、薄い反射色、深い接触影を分け、面の向き・遮光・前後へ対応/,label+' / '+route+' loses coherent light/material depth');
   if(medium==='薄膜光彩アニメ')assert.match(text,noPerson?/曲面と前後.*反射色の薄塗り/:/曲面.*薄い透光色の膜.*反射帯/,label+' / '+route+' loses surface-following film');
   if(medium==='白域幾何・宇宙彩アニメ')assert.match(text,/濃い宇宙色.*(?:限られた可視面|選択物の可視面).*短縮/,label+' / '+route+' loses local cosmic depth');
   if(medium==='艶彩幻想アニメ')assert.match(text,/絵画的連続陰影.*深い.*影.*微細な反射/,label+' / '+route+' loses painterly gloss hierarchy');
  }else{
   const expectedLight=['audit','artworkRepair'].includes(route)?(noPerson?entry.lightingScenery:entry.lighting):light;
   for(const clause of sentenceClauses(expectedLight))includesClause(text,clause,label+' / '+route+' dedicated light propagation');
  }
  assert.doesNotMatch(text,/精密な2D描線、広い深暗部/,label+' / '+route+' inherits the 103 luminous opening');
  assert.doesNotMatch(text,/undefined|NaN/,label+' / '+route+' contains unresolved contracts');
 }
 if(palette==='菫 × マンゴー × 白'){
  assert.equal(policy.restricted,false,label+' turns a colour scheme into an exclusive ink list');
  for(const [route,text] of Object.entries(routes)){
   assert.doesNotMatch(text,/全領域の使用色は菫 × マンゴー × 白/,label+' / '+route+' contradicts preserved natural identity colours');
   if(!noPerson)assert.match(text,/髪・肌・瞳の基礎色は識別のために残し|識別色.*(?:保|保持)|固有色.*保/,label+' / '+route+' lost natural identifying colours');
  }
 }else{
  assert.equal(policy.restricted,true,label+' misses an explicit limited colour input');
  if(['赤と黒だけ','金と黒の2色だけ'].includes(palette))assert.doesNotMatch(policy.bright,/白|紙/,label+' invents white outside the named ink colours');
  for(const [route,text] of Object.entries(routes)){
   assert.doesNotMatch(text,naturalBase,label+' / '+route+' preserves unpermitted natural base colours');
   assert.match(text,/許可色.*(?:明度|濃淡)|(?:明度|濃淡).*許可色/,label+' / '+route+' lost identity through shape/value translation');
  }
 }
 return {values,plan,actual,routes};
}
let independentCases=0,whiteAreaWarnings=0;
for(const collection of ['halloween','everyday'])for(const medium of independentMedia)for(const palette of independentPalettes)for(const noPerson of [false,true]){
 independentCase(medium,palette,noPerson,collection);independentCases++;
}
for(const palette of ['金と黒の二色','焦茶 × シアン光','セピア'])for(const noPerson of [false,true]){
 const {values,plan,actual}=independentCase('白域幾何・宇宙彩アニメ',palette,noPerson);
 const warning=plan.issues.find(issue=>issue.severity==='warning'&&issue.keys.includes('medium')&&issue.keys.includes('palette')&&/白域/.test(issue.reason));
 assert.ok(warning,palette+' must disclose how the white ground changes');
 assert.match(warning.reason,/許可.*最明部/,palette+' warning must explain the translated white');
 assert.match(warning.reason,/配色.*面積|面積.*配色/,palette+' warning must explain the large-area allocation');
 const availability=candidateAvailability('palette',palette,values);
 assert.equal(availability.enabled,true,palette+' warning must not discard the selected palette');
 assert.equal(availability.status,'warning',palette+' picker does not surface the white-area attention');
 assert.ok(availability.warnings.some(issue=>issue.reason===warning.reason));
 includesClause(actual,'選択の注意：'+warning.reason,palette+' actual compact white-area attention');
 whiteAreaWarnings++;
}
for(const palette of ['モノクローム','黒と白と朱の三色']){
 const {plan}=independentCase('白域幾何・宇宙彩アニメ',palette,false);
 assert.ok(!plan.issues.some(issue=>issue.severity==='warning'&&/白域/.test(issue.reason)),palette+' already permits white and needs no white-area translation warning');
}
const normalWhiteArea=independentCase('白域幾何・宇宙彩アニメ','菫 × マンゴー × 白',false);
const areaWarning=normalWhiteArea.plan.issues.find(issue=>issue.severity==='warning'&&issue.keys.includes('medium')&&issue.keys.includes('palette')&&/白域/.test(issue.reason));
assert.ok(areaWarning,'The normal palette has only 15% white and must disclose the white-area allocation');
assert.match(areaWarning.reason,/15%/,'The warning must identify the selected white share, not an invented ratio');
assert.match(areaWarning.reason,/配色.*面積|面積.*配色/,'The selected large-area allocation must stay in charge');
assert.match(areaWarning.reason,/幾何線|幾何.*線/,'The warning must retain the defining geometry');
assert.match(areaWarning.reason,/宇宙.*色/,'The warning must retain local cosmic colour');
assert.equal(candidateAvailability('palette',normalWhiteArea.values.palette,normalWhiteArea.values).status,'warning');
includesClause(normalWhiteArea.actual,'選択の注意：'+areaWarning.reason,'Actual compact normal white-area attention');
whiteAreaWarnings++;
// Flat painted colour still represents the selected living pose in depth.
// This checks physical projection, rather than treating "2D" as a flat board.
const spatialDepth=normalWhiteArea.plan.variant.depth;
assert.match(spatialDepth,/短縮/, 'The selected 117 low camera must retain pose foreshortening');
assert.match(spatialDepth,/重なり|遮蔽/, 'The selected 117 scene must retain projected overlap');
assert.match(spatialDepth,/支持/, 'The selected crouch must retain real support');
assert.match(spatialDepth,/厚み/, 'The drawn subject must retain visible part thickness');
assertFocusedHandoff(normalWhiteArea.plan,normalWhiteArea.actual,'Actual focused 117 spatial construction');
assert.match(normalWhiteArea.actual,/厚み.*短縮.*重なり.*支持/,'The actual focused 117 must draw living depth and real support');
for(const clause of sentenceClauses(spatialDepth))includesClause(normalWhiteArea.routes.recipe,clause,'Detailed recipe 117 spatial construction');
const luminousValues={...base,medium:'発光幻想アニメ'},luminous2DLight=lightingContract(luminousValues);
includesClause(luminous2DLight,luminousWorldContract(luminousValues).lighting,'The existing 103 dedicated light branch');
assert.match(renderChatInput(productionPlan(profile,luminousValues,{},'halloween',rng)),/精密な少女漫画・日本2Dアニメの有色線と描いた平面陰影/, 'The existing 103 drawn construction must remain independent');
assert.match(luminous2DLight,/深暗部|深い.*影/,'The existing 103 dark light hierarchy must remain');
const preset=stylePresetFor('発光幻想アニメ');
assert.match(preset.file,/^assets\/style-(?:luminous|fine-light)-original-v28-/);
assert.equal(sampleFor('medium',preset.medium).src,'./'+preset.file);
const bytes=fs.readFileSync(new URL('../'+preset.file,import.meta.url));
const legacy={...preset,file:'japan-luminous-v18.png'};
const loaded=await loadStylePresets([legacy],{fetchImpl:async url=>new Response(fs.readFileSync(url),{headers:{'Content-Type':'image/png'}})});
assert.deepEqual(Buffer.from(await loaded[0].file.arrayBuffer()),bytes,'Old history must send the replacement, never the retired lantern sample');
assert.equal(loaded[0].file.name,'style-preset-103.png');
console.log('PASS '+checked+' actual luminous handoffs retain whole-body anime/real light and replacement assets; '+independentCases+' independent 116/117/118 mode/palette/person-scene cases propagate their dedicated lighting through actual/native/audit/artwork/repair, plus '+whiteAreaWarnings+' white-area attentions. Natural and explicitly limited identity colours remain distinct. Appearance still requires image review.');
