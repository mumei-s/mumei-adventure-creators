import assert from 'node:assert/strict';
import {assertCompactHandoff,containsInstruction} from './compact-handoff-assertions-v28.mjs';
import {questions,resolveSelections} from '../catalog.js?v=28.4.4';
import {applyCollection} from '../collection.js?v=28.4.4';
import {initialSelections} from '../modes.js?v=28.4.4';
import {buildDirection} from '../direction.js?v=28.4.4';
import {applyPose} from '../poses.js?v=28.4.4';
import {optionRecipe} from '../option-recipes.js?v=28.4.4';
import {productionPlan,repairPrompt} from '../production-plan.js?v=28.4.4';
import {composePrompt} from '../prompt.js?v=28.4.4';
import {renderChatInput} from '../compiled-production.js?v=28.4.4';
import {colorPolicy} from '../palette-recipes.js?v=28.4.4';

const profile={displayName:'TEST CREATOR',activityEnabled:false,topics:[],biography:''};
const random=()=>.28;
const produce=(values,collection='halloween',patch={})=>{
 const variant={...applyPose(buildDirection([],values.mood,random,collection,values),values.pose),...patch};
 const plan=productionPlan(profile,values,variant,collection,random);
 const prompt=composePrompt({collection,profile,values,variant,references:[],edition:'RECIPE TEST',preparedPlan:plan});
 assertCompactHandoff(plan,prompt);return {variant,plan,prompt,audit:renderChatInput(plan)};
};
let occurrences=0,sections=0;const keys=new Map();
for(const collection of ['halloween','everyday']){
 applyCollection(collection);
 const base=resolveSelections({...initialSelections(),costume:'参照画像の衣装を生かす'},random);
 for(const q of questions)for(const value of q.groups.flatMap(g=>g.values)){
  const values={...base,[q.key]:value},recipe=optionRecipe(q.key,value,{values,collection});
  assert.equal(recipe.known,true,collection+' / '+q.key+' / '+value);
  assert.ok(recipe.sections.length>0&&recipe.checks.length>0,value);
  const {prompt,plan,audit}=produce(values,collection);
  assert.ok(!/undefined|NaN|\{focal\}|\{surface\}/.test(prompt),value+' leaked an unresolved instruction');
  for(const c of plan.conditions)for(const s of c.sections){assert.ok(s.label&&s.text,value);assert.ok(audit.includes(s.text),value+' lost a detailed instruction during audit export');}
  assert.ok(!prompt.includes('world-036.jpg')&&!prompt.includes('crystal-transmission-anime.png'),'Picker artwork leaked');
  occurrences++;sections+=recipe.sections.length;
  if(!keys.has(q.key))keys.set(q.key,new Set());keys.get(q.key).add(value);
 }
}
applyCollection('halloween');
const base=resolveSelections({...initialSelections(),design:'通常の一枚絵',costume:'海賊',theme:'光と影の寓話',place:'白いスタジオ',medium:'宝石ホログラムアニメ',mood:'目を閉じて安らぐ',pose:'床であぐらをかく',palette:'桃 × ミルク × 淡金',type:'文字を一切入れない',line:'セリフなし'},random);
const weak='TEST RANDOM LIGHT: 全体を均一に明るくし低いコントラストにする';
const jewel=produce(base,'halloween',{light:weak});
assert.ok(!jewel.prompt.includes(weak));
assert.ok(!jewel.prompt.includes('低いコントラスト、柔らかな散乱光'));
assert.match(jewel.plan.variant.light,/深い.*影面/);
assert.match(jewel.plan.variant.light,/小さく見ても強い局所的な明度差/);
assert.equal(jewel.plan.variant.pose,jewel.variant.pose);
assert.equal(jewel.plan.variant.expression,base.mood,'Selected closed eyes must survive the resolved camera');
assert.ok(jewel.prompt.includes(jewel.plan.variant.face),'Final camera-compatible face must reach the actual handoff');
const unwanted={light:weak,layout:'TEST FOREIGN LAYOUT',background:'TEST FOREIGN BACKGROUND',motion:'TEST FOREIGN MOTION',motif:'TEST FOREIGN PROP',depth:'TEST FOREIGN LENS'};
const resolved=produce(base,'halloween',unwanted);
for(const text of Object.values(unwanted))assert.ok(!resolved.prompt.includes(text),'Unselected direction survived: '+text);
const morning=produce({...base,theme:'真夜中の魔女のアトリエ',place:'朝のキッチン'});
assert.match(morning.plan.variant.light,/明示された朝/);assert.ok(!morning.plan.variant.light.includes('夜の室内'));
const mermaid=produce({...base,costume:'人魚',pose:'全力で走る'});
assert.match(mermaid.plan.variant.pose,/一本の魚尾/);assert.ok(!mermaid.plan.variant.distance.includes('足先'));
for(const type of ['短いタイトル＋名前','クリエイター名＋自由な見出し','HALLOWEEN＋クリエイター名']){
 const r=produce({...base,type,line:'選ばれたセリフ'});assert.equal(r.plan.copy.slots.length,2);assert.ok(!r.plan.copy.slots.some(s=>s.role==='セリフ'||s.role==='キャッチ'||s.role==='紹介文'));
}
const noWords=produce({...base,type:'セリフのみ',line:'セリフなし'});assert.equal(noWords.plan.copy.mode,'none');assert.deepEqual(noWords.plan.copy.slots,[]);

assert.match(jewel.prompt,/目が|閉じた目|閉眼/);
assert.match(jewel.prompt,/半透明(?:の)?投影(?:層|面|像)/);
assert.match(jewel.prompt,/屈折|干渉/);
assert.equal(jewel.plan.copy.mode,'none');
assert.deepEqual(jewel.plan.copy.slots,[]);
for(const palette of ['金と黒の二色','墨一色','セピア','黒と白と朱の三色','焦茶 × シアン光']){
 const values={...base,palette},result=produce(values),policy=colorPolicy(values);
 assert.equal(policy.restricted,true);assert.ok(result.plan.variant.light.includes(policy.bright));
 assert.ok(result.plan.interactions.some(s=>s.includes(policy.allowed)));
 assert.ok(!result.prompt.includes('髪・肌・瞳の基礎色は保持'));
 assert.match(result.plan.conditions.find(c=>c.key==='palette').text,/全領域|全領域|主参照の髪・肌・瞳を含む/);
}
const mono=produce({...base,medium:'水墨画',palette:'原色のポップカラー'});
assert.equal(colorPolicy({...base,medium:'水墨画'}).mode,'monochrome');
assert.ok(!mono.prompt.includes('主参照の髪・肌・瞳の基礎色は識別のために残し'));
const paper=produce({...base,medium:'透明水彩',palette:'ネオンピンク × シアン'});
assert.match(paper.plan.variant.light,/塗らない明部/);
assert.ok(!paper.plan.variant.light.includes('点光へ絞る'));
const newspaper=produce({...base,design:'新聞の一面',medium:'実写風フィルム写真',type:'クリエイター名だけ'});
assert.deepEqual(newspaper.plan.copy.blocks,['TEST CREATOR']);
const newspaperSections=newspaper.plan.conditions.find(c=>c.key==='design').sections;
const newspaperLabels=newspaperSections.map(section=>section.label);
for(const label of ['作品の骨格','領域とグリッド','主画像の構成','限定原稿の配置','画風と形式の分担','避ける失敗','日本を基準にした個別条件'])
 assert.ok(newspaperLabels.includes(label),'Limited-copy newspaper loses its distinct '+label+' process');
assert.equal(new Set(newspaperLabels).size,newspaperLabels.length,'Newspaper process owners must not repeat');
assert.equal(new Set(newspaperSections.map(section=>section.text)).size,newspaperSections.length,'Additional newspaper engineering must not duplicate existing sections');
const newspaperGrid=newspaperSections.find(section=>section.label==='領域とグリッド').text;
assert.match(newspaperGrid,/6列/);assert.match(newspaperGrid,/主図版1点/);assert.match(newspaperGrid,/上限40%/);
assert.match(newspaperGrid,/40%以上.*空欄/,'Sparse allowed copy must retain newspaper empty-column structure');
assert.match(newspaper.prompt,/6列/);assert.match(newspaper.prompt,/上限40%/,'The limited-copy grid must reach the actual handoff');
for(const medium of ['宝石ホログラムアニメ','クリスタル透光アニメ','透明水彩','水墨画','現代アニメの一枚絵','実写風フィルム写真']){
 const scenery=produce({...base,medium,costume:'風景を主役にする',pose:'おまかせ',mood:'毎回大胆に変える'},'everyday');
 assert.ok(scenery.plan.noPerson);
 assert.ok(!scenery.prompt.includes('顔の向き：')&&!scenery.prompt.includes('身体の動き：'));
 assert.ok(!scenery.prompt.includes('主参照の髪・肌・瞳の基礎色は識別のために残し'));
 for(const key of ['pose','mood'])assert.match(scenery.plan.conditions.find(c=>c.key===key).text,/適用|人物なし|非適用/);
}
const emblemValues={...base,costume:'紋章・アイコンにする',pose:'おまかせ',mood:'毎回大胆に変える',design:'紋章・エンブレム',medium:'ベクターグラフィック',place:'抽象的な色面'};
const emblem=produce(emblemValues,'everyday');
assert.match(emblem.prompt,/図形の重なり・抜き・余白/);
const repair=repairPrompt({values:emblemValues,production:emblem.plan,prompt:emblem.prompt});
assert.ok(repair.endsWith(emblem.prompt));assert.ok(!repair.split('【元の制作仕様】')[0].includes('雑誌なら誌名'));
for(const value of ['toString','__proto__','未登録の独自技法']){
 const recipe=optionRecipe('medium',value,{values:base});assert.equal(recipe.known,false);assert.ok(recipe.sections.length);
}
console.log('PASS detailed recipes: '+occurrences+' option occurrences / '+sections+' exported recipe sections; '+JSON.stringify(Object.fromEntries([...keys].map(([k,v])=>[k,v.size])))+'; exact selected instructions, image-reference isolation, palette/medium/lighting conflicts, preserved pose and face direction, limited colors, no-person output, text limits and custom input.');
