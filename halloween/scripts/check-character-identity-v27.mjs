import assert from 'node:assert/strict';
import {questions,resolveSelections} from '../catalog.js?v=28.4.3';
import {applyCollection} from '../collection.js?v=28.4.3';
import {productionPlan} from '../production-plan.js?v=28.4.3';
import {composePrompt} from '../prompt.js?v=28.4.3';
import {colorPolicy} from '../color-policy.js?v=28.4.3';
import {isPhotographicMedium} from '../photo-design.js?v=28.4.3';
import {renderInput,renderSelectionMaterial} from '../compiled-production.js?v=28.4.3';
import {cameraContract} from '../angles.js?v=28.4.3';
import {compactReferences,assertCompactHandoff,assertCompactEngineering,includesClause} from './compact-handoff-assertions-v28.mjs';

const profile={displayName:'同一性検査',activityEnabled:false},random=()=>.2;
const base=resolveSelections({design:'通常の一枚絵',medium:'発光幻想アニメ',theme:'宇宙のHalloween',costume:'参照画像の衣装を生かす',place:'星空の砂漠',pose:'片手を差し出す',mood:'俯瞰＋目を見開く',angle:'俯瞰・45度',palette:'群青 × 菫 × 星白',type:'文字を一切入れない',line:'セリフなし',size:'縦ポスター2:3｜2400×3600｜2:3'},random);
const variant={face:'顔を上へ向ける',expression:'目を見開いて驚く',distance:'全身',pose:'片手を差し出す',camera:'俯瞰'};
function inputFor(values,mode){
 const plan=productionPlan(profile,values,variant,mode,random);
 const prompt=composePrompt({profile,values,variant,collection:mode,preparedPlan:plan,references:compactReferences(plan,[{name:'character.png',role:'identity'}]),edition:'IDENTITY'});
 const detail=renderInput(plan),native=renderSelectionMaterial(plan);
 const audit=JSON.parse(detail.split('\n\n【全選択の個別レシピ】')[0]);
 const actual=assertCompactHandoff(plan,prompt,mode+' / '+values.medium+' / '+values.palette+' actual identity');
 return {plan,input:prompt,audit,detail,native,actual};
}
const publicMedia=questions.find(q=>q.key==='medium').groups.flatMap(g=>g.values);
assert.equal(publicMedia.length,118,'The original styles and all three additional analyzed media must remain selectable');
assert.equal(new Set(publicMedia).size,publicMedia.length);
for(const medium of ['薄膜光彩アニメ','白域幾何・宇宙彩アニメ','艶彩幻想アニメ'])assert.ok(publicMedia.includes(medium),medium);
let cases=0,photographs=0,blocked=0;
for(const mode of ['halloween','everyday']){
 applyCollection(mode);
 for(const medium of questions.find(q=>q.key==='medium').groups.flatMap(g=>g.values)){
  for(const palette of ['群青 × 菫 × 星白','モノクローム','金と黒の二色','黒と白と朱の三色','セピア']){
   const values={...base,medium,palette},{plan,input,audit,detail,native,actual}=inputFor(values,mode),policy=colorPolicy(values);
   if(!actual)blocked++;
   if(isPhotographicMedium(medium)){
    assert.match(audit.identity,/同じキャラクターと識別できる実物の人物立体へ再構成/);
    assert.match(audit.identity,/髪型・識別色・固有の印.*保持/);
    assert.match(audit.identity,/年齢感・性別表現/);
    assert.match(audit.identity,/自然な頭蓋・眼球・皮膚・毛髪へ翻訳/);
    for(const text of [native,detail]){
     assert.match(text,/皮膚.*毛穴.*産毛/);
     assert.match(text,/服は裁断・縫い目・繊維・重力で生じる皺へ再構成/);
    }
    assert.match(audit.identity,/巨大な目・記号的な鼻口・平たい顔面を寸法どおり固定せず/);
    if(actual){
     assert.match(input,/皮膚.*毛穴.*産毛/);
     assert.match(input,/服は裁断・縫い目・繊維・重力で生じる皺へ再構成/);
    }
    assert.doesNotMatch(audit.required_before_details.drawing_priority,/細部の精密さはその描線・色面・画材/);
    const camera=cameraContract(values);
    assert.equal(audit.camera.geometry.selected,values.angle);
    for(const instruction of camera.instructions)assert.ok(native.includes(instruction),'Full photographic audit must retain '+medium+' / '+values.angle);
    for(const field of ['face','expression','pose'])assert.equal(audit.camera[field==='pose'?'body':field],plan.variant[field]);
    photographs++;
   }else{
    assert.match(audit.identity,/髪型・顔の輪郭・目鼻口の特徴的な並び・年齢感・性別表現/);
    assert.match(audit.identity,/画風が定める形の整理・誇張・省略は実行/);
    assert.match(audit.identity,/写真の顔の立体や細かな寸法まで固定しない/);
    if(actual){
     assert.match(input,/同じ人物の顔の輪郭・目鼻口と眉顎鼻首の特徴的な組合せ・髪型・識別色・固有の印/);
     assert.match(input,/年齢感・性別表現・基礎体格を保つ/);
     assert.match(input,/主参照の完成面や写真の細寸法を固定せず.*選択作風の線・形の整理・誇張・省略・画材へ翻訳/);
    }
   }
   assert.doesNotMatch(input,/固定：顔の輪郭、目の形と間隔|固定：顔の輪郭、目鼻口の形と配置比率/);
   const style=plan.conditions.find(c=>c.key==='medium');
   assert.ok(style.known,medium);
   assert.ok(native.includes(style.execution.method),'Full native making must remain available for '+medium);
   for(const section of style.sections)for(const [route,text] of [['native',native],['audit',detail]])assert.ok(text.includes(section.text),'Full '+route+' must retain '+medium+' / '+section.label);
   if(actual)assertCompactEngineering(plan,input,style.sections,medium+' actual identity/style engineering');
   if(policy.mode==='monochrome'){
    assert.match(audit.identity,/参照の肌色・髪色・瞳色も許可色へ変換し、形と明度差で同じ人を表す/);
    if(actual)includesClause(input,policy.allowed,medium+' monochrome identity translation');
   }else if(policy.restricted){
    assert.match(audit.identity,/参照の肌色・髪色・瞳色も許可色へ変換し、形と明度差で同じ人を表す/);
    if(actual)assert.match(input,/主参照の識別色、光、反射、文字もこの許可色の濃淡へ変換/);
   }else if(['クリスタルホログラム造形アニメ','宝石ホログラムアニメ'].includes(medium)){
    assert.match(native,/透明|半透明/);
    assert.match(native,/肌.*不透明|不透明.*肌/);
    if(actual){assert.match(input,/透明|半透明/);assert.match(input,/肌.*不透明|不透明.*肌/);}
   }else{
    if(actual)assert.match(input,/参照の識別色を保ち、主色・副色・差し色/);
   }
   cases++;
  }
 }
 for(const costume of ['風景を主役にする','モチーフだけで構成する','紋章・アイコンにする']){
  const {plan,input}=inputFor({...base,costume},mode);
  assert.ok(plan.conditions.find(c=>c.key==='costume').known,costume);
  assert.doesNotMatch(input,/【固定するもの／変えるもの】|固定：主参照の顔立ち・目鼻口・髪/);
 }
}
applyCollection('halloween');
assert.equal(cases,publicMedia.length*2*5);
assert.equal(photographs,140);
assert.ok(blocked>0,'Explicit incompatible color/material combinations must exercise the reasoned stop path');
console.log('PASS character identity: '+cases+' mode/style/palette combinations retain full native/audit recipes and verify actual compact identity/camera/engineering; '+photographs+' photographic cases reconstruct anatomy and real materials; '+blocked+' hard conflicts stop with reasons and no image request. Non-photo proportions, restricted colors and no-person subjects remain intact. Generated-image adherence is not inferred.');
