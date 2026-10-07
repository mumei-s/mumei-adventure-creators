import assert from 'node:assert/strict';
import {questions,resolveSelections} from '../catalog.js?v=27.0.1';
import {applyCollection} from '../collection.js?v=27.0.1';
import {productionPlan} from '../production-plan.js?v=27.0.1';
import {composePrompt} from '../prompt.js?v=27.0.1';
import {colorPolicy} from '../color-policy.js?v=27.0.1';

const profile={displayName:'同一性検査',activityEnabled:false},random=()=>.2;
const base=resolveSelections({design:'通常の一枚絵',medium:'発光幻想アニメ',theme:'宇宙のHalloween',costume:'参照画像の衣装を生かす',place:'星空の砂漠',pose:'片手を差し出す',mood:'俯瞰＋目を見開く',palette:'群青 × 菫 × 星白',type:'文字を一切入れない',line:'セリフなし',size:'縦ポスター2:3｜2400×3600｜2:3'},random);
const variant={face:'顔を上へ向ける',expression:'目を見開いて驚く',distance:'全身',pose:'片手を差し出す',camera:'俯瞰'};
function inputFor(values,mode){
 const plan=productionPlan(profile,values,variant,mode,random);
 const prompt=composePrompt({profile,values,variant,collection:mode,preparedPlan:plan,references:[{name:'character.png',role:'identity'}],edition:'IDENTITY'});
 const input=prompt.split('【画像生成へ渡す作画条件：開始】')[1].split('【画像生成へ渡す作画条件：終了】')[0];
 return {plan,input};
}
let cases=0;
for(const mode of ['halloween','everyday']){
 applyCollection(mode);
 for(const medium of questions.find(q=>q.key==='medium').groups.flatMap(g=>g.values)){
  for(const palette of ['群青 × 菫 × 星白','モノクローム','金と黒の二色','黒と白と朱の三色','セピア']){
   const values={...base,medium,palette},{plan,input}=inputFor(values,mode),policy=colorPolicy(values);
   assert.match(input,/顔立ち・目鼻口・髪・固有の印の特徴的な組合せで同じキャラクターと識別/);
   assert.match(input,/年齢感、性別の表現、基礎体格を保つ/);
   assert.match(input,/顔の立体・各部の細寸法・表面質感は固定せず、選択画風の造形・線・色面・画材へ変換/);
   assert.match(input,/ちび等の選択画風が明示する比率整理・誇張・省略を実行/);
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
console.log('PASS character identity: '+cases+' mode/style/palette combinations preserve identifying features, age, gender and base build while permitting the selected medium to reshape facial form and surface; chibi simplification, material conversion, monochrome and limited-color routing are retained in the actual image input; no-person output receives no face contract.');
