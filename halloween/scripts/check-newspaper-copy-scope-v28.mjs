import assert from 'node:assert/strict';
import {applyCollection} from '../collection.js?v=28.4.0';
import {resolveSelections} from '../catalog.js?v=28.4.0';
import {initialSelections} from '../modes.js?v=28.4.0';
import {buildDirection} from '../direction.js?v=28.4.0';
import {productionPlan} from '../production-plan.js?v=28.4.0';
import {renderInput} from '../compiled-production.js?v=28.4.0';
import {formatTextPolicy,detailedFormat} from '../format-recipes.js?v=28.4.0';
import {formatFor} from '../formats.js?v=28.4.0';
import {typographyValues} from '../typography-options.js?v=28.4.0';

// Permission boundaries must survive the combination that caused article and
// portrait additions. These checks inspect the actual production contracts;
// they do not generate pictures or infer image-model adherence.
const expected={
 '商品広告・キャッチと特徴3点':['主見出し','商品紹介','特徴1','特徴2','特徴3','作者名'],
 'ブランド広告・宣言と短いコピー':['主見出し','ブランドコピー','作者名'],
 'イベント告知・見どころと案内':['企画名','企画紹介','見どころ1','見どころ2','案内','作者名'],
 '展覧会告知・作品名と制作ノート':['作品名','展示紹介','制作ノート','作者名'],
 '映画予告・キャッチとあらすじ':['作品タイトル','キャッチ','あらすじ','作者名'],
 '漫画表紙・大見出しと煽り文':['作品タイトル','煽り文','物語紹介','作者名'],
 'キャラクター名鑑・役柄とスキル':['キャラクター名','役柄','スキル1','スキル2','キャラクター紹介'],
 'ゲーム告知・世界紹介とクエスト':['作品タイトル','世界紹介','クエスト','見どころ','作者名'],
 '縦書きコピー・一文を大きく':['縦書きコピー','作者名'],
 '詩のコピー・短い言葉を3行':['詩行1','詩行2','詩行3','作者名'],
 '大判タイポグラフィー・文字が主役':['主語句','短い補足','作者名'],
 'ミニマル広告・見出しと名前':['主見出し','作者名']
};
assert.deepEqual(Object.keys(expected),typographyValues,'Every explicit typography choice needs a newspaper boundary case');
const random=()=>.28;
let scopedCases=0,standardCases=0;
for(const collection of ['halloween','everyday']){
 applyCollection(collection);
 const base=resolveSelections({...initialSelections(),design:'新聞の一面',medium:'現代アニメの一枚絵',type:'デザインに合わせて自動編集'},random);
 for(const type of typographyValues)for(const sourceGuided of [false,true])for(const noPerson of [false,true]){
  const values={...base,type,costume:noPerson?'風景を主役にする':'参照画像の衣装を生かす'};
  const profile={displayName:'検査作者',activityEnabled:sourceGuided,...(sourceGuided?{handoff:{id:'newspaper_scope_test'}}:{})};
  const plan=productionPlan(profile,values,buildDirection([],values.mood,random,collection,values),collection,random);
  const label=[collection,type,sourceGuided?'source':'fixed',noPerson?'scenery':'person'].join(' / ');
  const roles=[...plan.copy.slots,...(plan.copy.generatedSlots||[])].map(slot=>slot.role);
  const permitted=noPerson&&type==='キャラクター名鑑・役柄とスキル'?['キャラクター名','主題の分類','特徴1','特徴2','主題紹介']:expected[type];
  assert.deepEqual([...roles].sort(),[...permitted].sort(),label+' added or lost an authorized manuscript role');
  const policy=formatTextPolicy(values);
  assert.equal(policy.roleScoped,true,label+' lost explicit role scope');
  assert.equal(policy.limited,false,label+' must retain editable source-derived copy rather than name-only behavior');
  assert.equal(plan.copy.generatedSlots.length>0,sourceGuided,label+' changed source-based manuscript editing');
  const design=plan.conditions.find(condition=>condition.key==='design');
  const image=design.sections.find(section=>section.label=== (noPerson?'主題の景物・物体':'主画像の構成')).text;
  assert.match(image,/全紙面の図版は.*主図版1点だけ/,label+' allows a second image');
  assert.match(image,/追加しない|追加せず/,label+' lost the no-crop/no-secondary-image boundary');
  const grid=design.sections.find(section=>section.label==='領域とグリッド').text;
  assert.match(grid,/横段.*縦列/,label+' replaced the newspaper with a poster');
  assert.match(grid,/右から左/,label+' lost Japanese newspaper reading order');
  assert.match(design.execution.method,/文字設定が許可する役割と原稿数を優先/,label+' execution can expand article roles');
  assert.match(design.execution.method,/主図版1点/,label+' compact execution lost the image count');
  const input=JSON.parse(renderInput(plan).split('\n\n【全選択の個別レシピ】')[0]);
  assert.match(input.required_before_details.layout,/主図版1点/,label+' early image-call material lost the image count');
  assert.match(input.required_before_details.layout,/その役割の確定原稿がある場合だけ/,label+' early image-call material requires unauthorized article roles');
  if(type==='商品広告・キャッチと特徴3点'){
   const typeSection=design.sections.find(section=>section.label==='文字と読み順').text;
   for(const role of expected[type])assert.ok(typeSection.includes(role),label+' has no newspaper placement for '+role);
   assert.match(typeSection,/3つの特徴を同じ階層の縦列/,label+' feature hierarchy is inconsistent');
  }
  scopedCases++;
 }
 for(const type of ['デザインに合わせて自動編集','新聞風・記事と段組み','クリエイター名だけ','短いタイトル＋名前','文字を一切入れない'])for(const noPerson of [false,true]){
  const values={...base,type,costume:noPerson?'風景を主役にする':'参照画像の衣装を生かす'};
  assert.equal(formatTextPolicy(values).roleScoped,false,type+' became an explicit typography preset');
  const recipe=detailedFormat(values.design,{values,noPerson}),image=recipe.sections.find(section=>section.label===(noPerson?'主題の景物・物体':'主画像の構成')).text;
  assert.match(image,/全紙面の図版は.*主図版1点だけ/,type+' must also prohibit secondary images');
  assert.ok(recipe.checks.includes('主図版1点のみ・補助肖像や接写や複製なし'),type+' lost the observable image count check');
  standardCases++;
 }
}
const fallback=formatFor('新聞の一面');
assert.match(fallback.layout,/主図版1点/);
assert.match(fallback.layout,/その役割がある場合だけ/);
assert.ok(!fallback.layout.includes('2本の副記事'),'Legacy format material forces extra article counts');
applyCollection('halloween');
console.log('PASS newspaper copy scope: '+scopedCases+' explicit typography/source/subject/mode combinations retain their allowed roles and editable source copy; '+standardCases+' ordinary/limited/no-text cases keep one main image. Newspaper columns and reading order survive without automatic portraits, crops or article roles. No images generated.');
