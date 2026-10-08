import assert from 'node:assert/strict';
import {questions,resolveSelections} from '../catalog.js?v=28.1.2';
import {applyCollection} from '../collection.js?v=28.1.2';
import {productionPlan} from '../production-plan.js?v=28.1.2';
import {composePrompt} from '../prompt.js?v=28.1.2';
import {colorPolicy} from '../color-policy.js?v=28.1.2';
import {isPhotographicMedium} from '../photo-design.js?v=28.1.2';
import {renderInput} from '../compiled-production.js?v=28.1.2';
import {cameraContract} from '../angles.js?v=28.1.2';

const profile={displayName:'同一性検査',activityEnabled:false},random=()=>.2;
const base=resolveSelections({design:'通常の一枚絵',medium:'発光幻想アニメ',theme:'宇宙のHalloween',costume:'参照画像の衣装を生かす',place:'星空の砂漠',pose:'片手を差し出す',mood:'俯瞰＋目を見開く',angle:'俯瞰・45度',palette:'群青 × 菫 × 星白',type:'文字を一切入れない',line:'セリフなし',size:'縦ポスター2:3｜2400×3600｜2:3'},random);
const variant={face:'顔を上へ向ける',expression:'目を見開いて驚く',distance:'全身',pose:'片手を差し出す',camera:'俯瞰'};
function inputFor(values,mode){
 const plan=productionPlan(profile,values,variant,mode,random);
 const prompt=composePrompt({profile,values,variant,collection:mode,preparedPlan:plan,references:[{name:'character.png',role:'identity'}],edition:'IDENTITY'});
 const input=prompt.split('【統合するための制作仕様：開始】')[1].split('【統合するための制作仕様：終了】')[0];
 const audit=JSON.parse(renderInput(plan).split('\n\n【全選択の個別レシピ】')[0]);
 return {plan,input,audit};
}
let cases=0,photographs=0;
for(const mode of ['halloween','everyday']){
 applyCollection(mode);
 for(const medium of questions.find(q=>q.key==='medium').groups.flatMap(g=>g.values)){
  for(const palette of ['群青 × 菫 × 星白','モノクローム','金と黒の二色','黒と白と朱の三色','セピア']){
   const values={...base,medium,palette},{plan,input,audit}=inputFor(values,mode),policy=colorPolicy(values);
   if(isPhotographicMedium(medium)){
    assert.match(audit.identity,/同じキャラクターと識別できる実物の人物立体へ再構成/);
    assert.match(audit.identity,/髪型・識別色・固有の印.*保持/);
    assert.match(input,/年齢感・性別表現・基礎体格/);
    assert.match(audit.identity,/自然な頭蓋・眼球・皮膚・毛髪へ翻訳/);
    assert.match(input,/皮膚.*毛穴.*産毛/);
    assert.match(input,/服は裁断・縫い目・繊維・重力で生じる皺へ再構成/);
    assert.match(input,/細寸法の比率・描線・セル色面を固定せず/);
    assert.doesNotMatch(audit.required_before_details.drawing_priority,/細部の精密さはその描線・色面・画材/);
    const camera=cameraContract(values);
    assert.equal(audit.camera.geometry.selected,values.angle);
    for(const instruction of camera.instructions)assert.ok(input.includes(instruction),'Photo reconstruction must retain '+medium+' / '+values.angle);
    assert.ok(input.includes(plan.variant.face)&&input.includes(plan.variant.expression),'Photo reconstruction must retain selected facial direction and expression');
    assert.ok(input.includes(plan.variant.pose),'Photo reconstruction must retain the selected body configuration');
    photographs++;
   }else{
    assert.match(input,/顔立ち・目鼻口・髪・固有の印の特徴的な組合せで同じキャラクターと識別/);
    assert.match(input,/年齢感、性別の表現、基礎体格を保つ/);
    assert.match(input,/顔の立体・各部の細寸法・表面質感は固定せず、選択画風の造形・線・色面・画材へ変換/);
    assert.match(input,/ちび等の選択画風が明示する比率整理・誇張・省略を実行/);
   }
   assert.doesNotMatch(input,/固定：顔の輪郭、目の形と間隔|固定：顔の輪郭、目鼻口の形と配置比率/);
   const style=plan.conditions.find(c=>c.key==='medium');
   assert.ok(style.known,medium);
   assert.ok(input.includes(style.execution.method));
   for(const section of style.sections)assert.ok(input.includes(section.text),'Identity routing must retain '+medium+' / '+section.label);
   if(policy.mode==='monochrome'){
    assert.match(input,/色：髪・肌・瞳の色は無彩色の明度差へ翻訳/);
    assert.doesNotMatch(input,/色：髪・肌・瞳の識別に必要な基礎色を保ち|素材と色：/);
   }else if(policy.restricted){
    assert.match(input,/色：髪・肌・瞳の色は選択した技法と限定配色の色・明度差へ翻訳/);
    assert.match(input,/元の有彩色を例外で残さない/);
    assert.doesNotMatch(input,/色：髪・肌・瞳の識別に必要な基礎色を保ち|素材と色：/);
   }else if(['クリスタルホログラム造形アニメ','宝石ホログラムアニメ'].includes(medium)){
    assert.match(input,/素材と色：顔・髪・全身を透明な結晶または半透明ホログラムとして描き直す/);
    assert.match(input,/元の肌色・肌質・髪の不透明さを固定しない/);
    assert.match(input,/髪と瞳の識別色は透明材質の内側の淡い色として使う/);
    assert.doesNotMatch(input,/色：髪・肌・瞳の識別に必要な基礎色を保ち/);
   }else{
    assert.match(input,/色：髪・肌・瞳の識別に必要な基礎色を保ち、配色と照明は今回の指定へ合わせる/);
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
assert.equal(cases,1080);
assert.equal(photographs,120);
console.log('PASS character identity: '+cases+' mode/style/palette combinations preserve identifying features, age, gender and base build; '+photographs+' photographic cases reconstruct natural anatomy, skin, hair and fabric without retaining illustration surfaces or changing selected camera/pose; non-photo chibi/material construction and all color policies remain intact; no-person output receives no face contract. Generated-image adherence is not inferred.');
