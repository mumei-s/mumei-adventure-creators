import assert from 'node:assert/strict';
import fs from 'node:fs';
import {initialSelections} from '../modes.js?v=28.4.2';
import {resolveSelections} from '../catalog.js?v=28.4.2';
import {productionPlan} from '../production-plan.js?v=28.4.2';
import {composePrompt} from '../prompt.js?v=28.4.2';
import {renderChatInput} from '../compiled-production.js?v=28.4.2';
import {stylePresetFor,stylePresetInstructions,loadStylePresets} from '../style-presets.js?v=28.4.2';
import {sampleFor} from '../examples.js?v=28.4.2';

const rng=()=>.23,profile={displayName:'WORLD TRANSFER',activityEnabled:false};
const base=resolveSelections({...initialSelections(),sceneUnified:true,medium:'発光幻想アニメ',theme:'怪奇サーカス',costume:'ミイラ',palette:'星灯りの青紫',type:'デザインに合わせて自動編集'},rng);
let checked=0;
for(const medium of ['発光幻想アニメ','発光幻想リアル'])for(const sourceKind of ['unknown','photo-person','illustration-person','scenery','mark-object'])for(const design of ['通常の一枚絵','映画ポスター','新聞の一面']){
 const values={...base,medium,sourceKind,design},plan=productionPlan(profile,values,{},'halloween',rng);
 const prompt=composePrompt({profile,values,variant:plan.variant,preparedPlan:plan,references:[stylePresetFor(values.medium),{role:'identity',name:'character.jpg'}],edition:'LUMINOUS'});
 const priority=prompt.indexOf('【'+medium+'：人物と背景を一つの光の世界へ】');
 assert.ok(priority>0&&priority<2500,'Full luminous transfer must be in the actual opening handoff');
 assert.ok(priority<prompt.indexOf('【今回の衣装を先に確定】'),'The medium must be explicit before wardrobe/layout detail');
 const early=prompt.slice(priority,priority+550);
 assert.match(early,/顔.*腕.*手指.*脚.*足.*衣装/);assert.match(early,/広い深暗部.*小面積の強い幻想光/);
 assert.match(early,/被覆/);assert.match(early,/色は選択配色/);
 assert.doesNotMatch(prompt,/本来の素材のまま薄く光|薄い幻想光/);
 if(medium==='発光幻想リアル'){assert.match(early,/自然な実物立体と精密な写真の材質/);assert.doesNotMatch(early,/2D描線/);}
 else {if(!['scenery','mark-object'].includes(sourceKind))assert.match(early,/基本頭身/);assert.match(renderChatInput(plan),/見本と同じ精密な2D描線/);}
 if(['scenery','mark-object'].includes(sourceKind)){assert.match(early,/独自の主役を設計/);assert.doesNotMatch(early,/主参照の本人らしい特徴/);}
 for(const instruction of stylePresetInstructions(values.medium,{values}))assert.ok(prompt.includes(instruction));
 checked++;
}
const preset=stylePresetFor('発光幻想アニメ');
assert.equal(preset.file,'assets/style-luminous-original-v28-4-2.png');
assert.equal(sampleFor('medium',preset.medium).src,'./'+preset.file);
const bytes=fs.readFileSync(new URL('../'+preset.file,import.meta.url));
const legacy={...preset,file:'japan-luminous-v18.png'};
const loaded=await loadStylePresets([legacy],{fetchImpl:async url=>new Response(fs.readFileSync(url),{headers:{'Content-Type':'image/png'}})});
assert.deepEqual(Buffer.from(await loaded[0].file.arrayBuffer()),bytes,'Old history must send the replacement, never the retired lantern sample');
assert.equal(loaded[0].file.name,'style-preset-103.png');
console.log('PASS '+checked+' actual luminous handoffs prioritize whole-body anime/real light before wardrobe/layout and use the original replacement image in preview, transfer and legacy history. Appearance still requires image review.');
