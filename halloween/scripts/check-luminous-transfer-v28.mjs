import assert from 'node:assert/strict';
import {assertCompactHandoff} from './compact-handoff-assertions-v28.mjs';
import fs from 'node:fs';
import {initialSelections} from '../modes.js?v=28.4.3';
import {resolveSelections} from '../catalog.js?v=28.4.3';
import {productionPlan} from '../production-plan.js?v=28.4.3';
import {composePrompt} from '../prompt.js?v=28.4.3';
import {renderChatInput,renderInput} from '../compiled-production.js?v=28.4.3';
import {stylePresetFor,stylePresetInstructions,loadStylePresets} from '../style-presets.js?v=28.4.3';
import {composeArtworkStage,composeArtworkRepair} from '../artwork-stage.js?v=28.4.3';
import {repairPrompt} from '../production-plan.js?v=28.4.3';
import {sampleFor} from '../examples.js?v=28.4.3';

const rng=()=>.23,profile={displayName:'WORLD TRANSFER',activityEnabled:false};
const base=resolveSelections({...initialSelections(),sceneUnified:true,medium:'発光幻想アニメ',theme:'怪奇サーカス',costume:'ミイラ',palette:'星灯りの青紫',type:'デザインに合わせて自動編集'},rng);
let checked=0;
for(const medium of ['発光幻想アニメ','発光幻想リアル'])for(const sourceKind of ['unknown','photo-person','illustration-person','scenery','mark-object'])for(const design of ['通常の一枚絵','映画ポスター','新聞の一面']){
 const values={...base,medium,sourceKind,design},plan=productionPlan(profile,values,{},'halloween',rng);
 const prompt=composePrompt({profile,values,variant:plan.variant,preparedPlan:plan,references:[stylePresetFor(values.medium),{role:'identity',name:'character.jpg'}],edition:'LUMINOUS'});
 const priority=prompt.indexOf('【'+medium+'：人物と背景を一つの光の世界へ】');
 assert.ok(priority>0&&priority<2500,'Full luminous transfer must be in the actual opening handoff');
 assertCompactHandoff(plan,prompt);assert.ok(priority<prompt.indexOf('【主題と描画の統一】'),'The medium must be explicit before wardrobe/layout detail');
 const early=prompt.slice(priority,priority+550);
 assert.match(early,/顔.*腕.*手指.*脚.*足.*衣装/);assert.match(early,/広い深暗部.*小面積の強い幻想光/);
 assert.match(early,/被覆/);assert.match(early,/色は選択配色/);
 assert.doesNotMatch(prompt,/本来の素材のまま薄く光|薄い幻想光/);
 if(medium==='発光幻想リアル'){assert.match(early,/自然な実物立体と精密な写真の材質/);assert.doesNotMatch(early,/2D描線/);}
 else {if(!['scenery','mark-object'].includes(sourceKind))assert.match(early,/基本頭身/);assert.match(renderChatInput(plan),/見本と同じ精密な2D描線/);}
 if(['scenery','mark-object'].includes(sourceKind)){assert.match(early,/独自の主役を設計/);assert.doesNotMatch(early,/主参照の本人らしい特徴/);}
 for(const instruction of stylePresetInstructions(values.medium,{values}))assert.ok(renderChatInput(plan).includes(instruction));assert.match(prompt,/深暗部と鋭い最明部の差、透明な色層と反射の密度/);assert.match(prompt,/作風見本を確認できない場合.*本文の作画仕様で生成/);
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
 for(const route of [actual,renderChatInput(plan),renderInput(plan),composeArtworkStage(plan),composeArtworkRepair(plan),repairPrompt({values,production:plan,prompt:actual})]){
  assert.match(route,/polished Japanese anime|滑らかな絵画的陰影/);
  assert.match(route,/平面セル影へ固定せず/);
  assert.doesNotMatch(route,/精密な2D描線、広い深暗部|実写.*連続階調.*3D.*顔.*残さない/);
 }
}
const preset=stylePresetFor('発光幻想アニメ');
assert.match(preset.file,/^assets\/style-(?:luminous|fine-light)-original-v28-/);
assert.equal(sampleFor('medium',preset.medium).src,'./'+preset.file);
const bytes=fs.readFileSync(new URL('../'+preset.file,import.meta.url));
const legacy={...preset,file:'japan-luminous-v18.png'};
const loaded=await loadStylePresets([legacy],{fetchImpl:async url=>new Response(fs.readFileSync(url),{headers:{'Content-Type':'image/png'}})});
assert.deepEqual(Buffer.from(await loaded[0].file.arrayBuffer()),bytes,'Old history must send the replacement, never the retired lantern sample');
assert.equal(loaded[0].file.name,'style-preset-103.png');
console.log('PASS '+checked+' actual luminous handoffs prioritize whole-body anime/real light before wardrobe/layout and use the original replacement image in preview, transfer and legacy history. Appearance still requires image review.');
