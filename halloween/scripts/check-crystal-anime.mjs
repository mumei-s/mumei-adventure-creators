import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CRYSTAL_ANIME,crystalAnimeMedium,crystalAnimeSpec,crystalAnimePalette,isCrystalAnimeLimitedPalette} from '../crystal-anime.js?v=28.0.3';
import {questions,resolveSelections} from '../catalog.js?v=28.0.3';
import {applyCollection} from '../collection.js?v=28.0.3';
import {initialSelections} from '../modes.js?v=28.0.3';
import {buildDirection} from '../direction.js?v=28.0.3';
import {poseItems,applyPose} from '../poses.js?v=28.0.3';
import {visualSpec} from '../visual-specs.js?v=28.0.3';
import {lookFor} from '../looks.js?v=28.0.3';
import {sampleFor} from '../examples.js?v=28.0.3';
import {productionPlan,repairPrompt} from '../production-plan.js?v=28.0.3';
import {composePrompt} from '../prompt.js?v=28.0.3';

const profile={displayName:'TEST CREATOR',biography:'',topics:[],activityEnabled:false};
const random=()=>.22;
const weakLight='OLD_LOW_CONTRAST_LIGHT_SENTINEL';
const sceneFacialDirections=/鼻・口|鼻先|鼻翼|睫毛|虹彩|髪の|肌の|頬|瞳孔/;
const image=sampleFor('medium',CRYSTAL_ANIME);
assert.equal(image.kind,'image');
assert.match(image.src,/japan-previews-v21\//);
assert.match(image.label,/生成の参照画像には使いません/);
assert.ok(fs.existsSync(new URL('../'+crystalAnimeMedium.file,import.meta.url)));
assert.ok(lookFor('medium',CRYSTAL_ANIME).chips.includes('白い逆光と深い影'));

function produce(values,collection){
 const variant={...applyPose(buildDirection([],values.mood,random,collection,values),values.pose),light:weakLight};
 const plan=productionPlan(profile,values,variant,collection,random);
 const args={collection,creator:'test',profile,values,variant,edition:'CRYSTAL-TEST',random,preparedPlan:plan,references:[{name:'reference-01-user.png',role:'identity'}]};
 return {variant,plan,args,prompt:composePrompt(args)};
}

let scenarios=0;
for(const collection of ['halloween','everyday']){
 applyCollection(collection);
 const options=questions.find(q=>q.key==='medium').groups.flatMap(g=>g.values);
 assert.equal(options.filter(v=>v===CRYSTAL_ANIME).length,1);
 assert.ok(options.includes('宝石ホログラムアニメ'));
 const base=resolveSelections({...initialSelections(),design:'通常の一枚絵',medium:CRYSTAL_ANIME,theme:collection==='everyday'?'ものづくりの時間':'光と影の寓話',costume:'参照画像の衣装を生かす',place:'白いスタジオ',pose:'全力で走る',mood:'完全な左横顔90度',palette:'桃 × ミルク × 淡金',type:'文字を一切入れない',line:'セリフなし',size:'縦写真3:4｜2400×3200｜3:4'},random);
 const {args,prompt,plan}=produce(base,collection);
 assert.equal(plan.conditions.find(c=>c.key==='medium').value,CRYSTAL_ANIME);
 assert.match(prompt,/顔は細い色線と少数の澄んだ色面/);assert.match(prompt,/鼻・口は位置と大きさの関係を保った簡潔な描線/);
 assert.match(prompt,/目の一律な拡大/);
 assert.match(prompt,/顔の輪郭、目鼻口の形・配置・比率/);
 assert.match(prompt,/強いコントラスト|強い局所的な明度差/);
 assert.match(prompt,/虹彩の暗い奥行き/);
 assert.match(prompt,/反射光で固有色を塗り替えない/);
 assert.match(prompt,/選んだポーズ：全力で走る/);
 assert.match(prompt,/完全な左横顔90度/);
 assert.ok(!prompt.includes(weakLight));
 assert.ok(!prompt.includes('低いコントラスト、柔らかな散乱光'));
 assert.ok(!prompt.includes('空間に浮かぶ半透明の投影層'));
 assert.ok(!prompt.includes(crystalAnimeMedium.file));
 assert.ok(!prompt.includes('1000015491'));
 assert.ok(!prompt.includes('1000015711'));
 assert.match(prompt,/完成した画像そのものを1枚/);
 assert.match(prompt,/文字・数字・署名のない完成/);
 const ignored=composePrompt({...args,styleGuide:{name:'wrong-person.png',cells:[{value:'別の顔',text:'別人の顔と衣装へ置換する'}]}});
 assert.equal(ignored,prompt,'UI artwork must never become character or style-image input');
 const repair=repairPrompt({prompt});
 assert.ok(repair.endsWith(prompt));
 assert.ok(repair.includes(CRYSTAL_ANIME));

 for(const pose of poseItems){
  const values={...base,pose:pose.value,mood:'目を閉じて安らぐ'};
  const result=produce(values,collection);
  assert.equal(result.plan.conditions.find(c=>c.key==='pose').value,pose.value);
  assert.ok(result.prompt.includes(result.variant.pose));
  assert.ok(result.prompt.includes(result.variant.distance));
  assert.match(result.prompt,/閉じた目を開けたり、後ろ姿や隠れた目へ虹彩を追加したりしない/);
  assert.ok(!result.prompt.includes('undefined'));
  scenarios++;
 }
 for(const palette of questions.find(q=>q.key==='palette').groups.flatMap(g=>g.values)){
  const result=produce({...base,palette},collection);
  assert.ok(result.prompt.includes(palette));
  assert.ok(!result.prompt.includes(weakLight));
  assert.ok(!result.prompt.includes('低いコントラスト、柔らかな散乱光'));
  assert.ok(!result.prompt.includes('undefined'));
  if(isCrystalAnimeLimitedPalette(palette)){
   assert.match(result.prompt,/全ての元の色を許可色と明度差へ翻訳/);
   assert.doesNotMatch(result.prompt,/人物の同一性として必要な髪・肌・瞳の基礎色は保持|髪の基礎色と識別できる髪の特徴|虹彩の基礎色を保ち|元の髪色と根元の明度を残し/,'Limited palettes must agree throughout the final prompt: '+palette);
  }else{
   assert.match(result.prompt,/髪・肌・瞳の基礎色は識別のために残し|人物の髪・瞳・肌の基礎色はキャラクター参照を保ち/);
  }
  scenarios++;
 }
 for(const costume of ['風景を主役にする','モチーフだけで構成する','紋章・アイコンにする']){
  const result=produce({...base,costume},collection);
  const spec=result.plan.conditions.find(c=>c.key==='medium');
  assert.equal(result.plan.noPerson,true);
  assert.doesNotMatch(spec.text,sceneFacialDirections);
  assert.doesNotMatch(spec.checks.join(' '),sceneFacialDirections);
  assert.match(spec.text,/人物なしの指定を守り/);
  assert.ok(!result.prompt.includes('鼻・唇・頬まで'));
  assert.match(result.prompt,/人物の顔・表情・ポーズ：適用しない/);
  scenarios++;
 }
 const legacy=produce({...base,medium:'宝石ホログラムアニメ'},collection);
 assert.match(legacy.prompt,/半透明の投影層/);
 assert.ok(!legacy.prompt.includes('【画風：'+CRYSTAL_ANIME+'】'));
 assert.ok(!legacy.prompt.includes(weakLight),'All detailed media resolve lighting from their technique and selected stage');assert.match(legacy.prompt,/深い.*影面/);
}

for(const palette of ['モノクローム','墨一色','金と黒の二色','黒と白と朱の三色','セピア','焦茶 × シアン光']){
 const spec=crystalAnimeSpec({palette});
 assert.match(spec.text,/全ての元の色を許可色と明度差へ翻訳/);
 assert.ok(!spec.text.includes('虹彩の基礎色を保ち'));
 assert.ok(!spec.text.includes('元の髪色と根元の明度を残し'));
 assert.ok(!spec.text.includes('人物の髪・瞳・肌の基礎色はキャラクター参照を保ち'));
 assert.match(spec.text,/虹彩の元の色も許可色/);
 assert.doesNotMatch(crystalAnimeSpec({noPerson:true,palette}).text,sceneFacialDirections);
}
assert.ok(!crystalAnimePalette('toString').includes('function'));
assert.ok(!crystalAnimePalette('__proto__').includes('[object Object]'));
assert.match(crystalAnimeSpec().text,/髪のないキャラクターへ髪を生やさず/);
assert.match(crystalAnimeSpec().text,/幽霊化などを明示した選択は実行/);
assert.match(visualSpec('medium','現代アニメの一枚絵').text,/整理したベース色/);
applyCollection('halloween');
console.log('PASS crystal anime: '+scenarios+' mode/pose/palette/scenery cases; 2D face and facial geometry, contrast, original or limited colors, no preview leakage, closed eyes/no hair, explicit transparency, repair output and legacy media separation. Image resemblance still requires visual review.');
