import assert from 'node:assert/strict';
import {questions,resolveSelections} from '../catalog.js?v=28.4.5';
import {initialSelections} from '../modes.js?v=28.4.5';
import {applyCollection} from '../collection.js?v=28.4.5';
import {buildEditorial,editorialContract} from '../editorial.js?v=28.4.5';
import {copyAuthority,copyAllowsDialogue,copySelectionExplanation} from '../copy-scope.js?v=28.4.5';
import {formatTextPolicy,detailedFormat} from '../format-recipes.js?v=28.4.5';
import {formatSpecs} from '../formats.js?v=28.4.5';
import {productionPlan} from '../production-plan.js?v=28.4.5';
import {buildDirection} from '../direction.js?v=28.4.5';
import {renderInput} from '../compiled-production.js?v=28.4.5';

// A design owns geometry. A selected text control owns one manuscript. Cover,
// card and blank-art combinations must not silently supply a second manuscript.
const expected={
 'クリエイター名＋自由な見出し':['主見出し','作者名'],
 'クリエイター名だけ':['作者名'],
 'HALLOWEEN＋クリエイター名':['テーマ名','作者名'],
 'HALLOWEENのみ':['テーマ名'],
 '短いタイトル＋名前':['作品タイトル','作者名'],
 '手書きサイン風の名前':['作者名'],
 '墨の落款風の名前':['作者名'],
 '文字を一切入れない':[],
 '映画ポスター風・タイトルとクレジット':['作品タイトル','キャッチ','作者名','ビリング1','ビリング2','ビリング3'],
 '広告チラシ風・情報をたっぷり':['主見出し','紹介文','情報見出し1','情報本文1','情報見出し2','情報本文2','情報見出し3','情報本文3','作者名'],
 '新聞風・記事と段組み':['主見出し','リード文','本文1','本文2','本文3','副見出し1','副記事本文1','副見出し2','副記事本文2','図版キャプション','作者名'],
 '物語の装丁風・タイトルと紹介':['作品タイトル','作者名','紹介文'],
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
const magazine=['主見出し','主特集の補足',...Array.from({length:4},()=>['補助特集','補助特集の補足']).flat(),'作者名'];
const imageOnly=['通常の一枚絵','キャラクターのキービジュアル','幻想風景画','自然・都市の風景画','映画のワンシーン','物語の挿絵','絵巻物','屏風絵','掛け軸','図案・パターン','アイコン・肖像','紋章・エンブレム','ステッカー','スマホ壁紙'];
const designs=Object.keys(formatSpecs),types=questions.find(q=>q.key==='type').groups.flatMap(group=>group.values);
assert.equal(new Set(designs).size,48);
assert.equal(new Set(types).size,26);
assert.deepEqual(new Set(types),new Set(['デザインに合わせて自動編集','雑誌風・見出しと特集をたっぷり',...Object.keys(expected)]),'Every visible control needs an independent manuscript expectation');
const random=()=>.28,profile=source=>({displayName:'原稿検証の作者',activityEnabled:source,...(source?{biography:'旅と創作の物語を公開している。'}:{})});
let cases=0,transfers=0;
for(const collection of ['halloween','everyday']){
 applyCollection(collection);
 const base=resolveSelections({...initialSelections(),medium:'現代アニメの一枚絵',theme:'悪夢からの脱出',design:'通常の一枚絵',type:'デザインに合わせて自動編集',costume:'ミイラ',mood:'正面・首をまっすぐ',angle:'目線の高さ・正面',pose:'まっすぐ立つ',line:'セリフなし',size:'A4縦・300dpi目安｜2480×3508｜210:297'},random);
 for(const design of designs)for(const type of types)for(const noPerson of [false,true])for(const source of [false,true]){
  const values={...base,collection,design,type,costume:noPerson?'風景を主役にする':'ミイラ'},before=JSON.stringify(values),copy=buildEditorial(profile(source),values,random),all=[...copy.slots,...copy.generatedSlots],roles=all.map(slot=>slot.role);
  const label=[collection,design,type,noPerson?'scenery':'person',source?'edited':'fixed'].join(' / '),policy=formatTextPolicy(values);
  assert.equal(JSON.stringify(values),before,label+' changed a fixed selection');
  assert.equal(copy.requestedMode,type,label+' discarded the selected text control');
  assert.equal(copy.authority,policy.authority,label+' has inconsistent effective copy authority');
  assert.ok(copySelectionExplanation(values).length>20,label+' has no UI explanation');
  if(type==='デザインに合わせて自動編集'){
   if(imageOnly.includes(design)){assert.equal(copy.mode,'none',label+' added a stock title/slogan/signature');assert.deepEqual(roles,[]);}
   else{assert.equal(copy.authority,'design');assert(roles.length>0,label+' lost required automatic editorial roles');}
   if(design==='タロットカード')assert.deepEqual(roles,['カード題名','作者名']);
   if(design==='トレーディングカード')assert.deepEqual(roles,noPerson?['主題名','主題の分類','短い説明']:['キャラクター名','役柄','短い説明']);
   if(design==='写真集の表紙')assert.deepEqual(roles,['書名','作者名']);
  }else{
   let permitted=expected[type];
   if(type==='雑誌風・見出しと特集をたっぷり')permitted=[...magazine];
   if(type==='キャラクター名鑑・役柄とスキル'&&noPerson)permitted=['キャラクター名','主題の分類','特徴1','特徴2','主題紹介'];
   assert.deepEqual([...roles].sort(),[...permitted].sort(),label+' added default design copy or lost selected manuscript');
   assert.equal(copy.authority,type==='文字を一切入れない'?'none':'selected');
  }
  assert.equal(new Set(copy.slots.map(slot=>slot.text)).size,copy.slots.length,label+' repeats a complete manuscript in another role');
  assert.doesNotMatch(copy.blocks.join(' '),/undefined|NaN|原稿検証.*原稿検証|カメラ|アングル|プロンプト|解像度|\bdpi\b|\bpx\b/,label+' prints drawing settings or duplicated author copy');
  const recipe=detailedFormat(design,{values,noPerson});
  assert.equal(recipe.known,true,label+' lost its design recipe');
  if(policy.authority!=='design'){
   assert.ok(recipe.executionMethod,label+' still uses the stock early format instruction');
   assert.equal(recipe.sections.find(s=>s.label==='文字なしの構成')!==undefined,policy.noText,label+' has a contradictory no-text/type layout');
   if(!policy.noText&&!policy.limited)assert.match(recipe.executionMethod,/文字設定が許可する役割と原稿数を優先/,label+' early instruction can append stock roles');
  }
  if(copy.mode==='none')assert.match(editorialContract(copy).join(' '),/文字・数字・ロゴ・サイン/);
  if(design==='見開き特集'&&copy.authority==='selected')assert.doesNotMatch(editorialContract(copy).join(' '),/本文3は本文2の末尾|本文枠A・右本文枠Bの2枠/,label+' reintroduces the default article-frame assignment over selected copy');
  if(!source&&['週刊誌の表紙','インタビュー誌面','見開き特集','新聞の一面','タロットカード','アイコン・肖像'].includes(design)&&['商品広告・キャッチと特徴3点','映画ポスター風・タイトルとクレジット','新聞風・記事と段組み','文字を一切入れない','デザインに合わせて自動編集'].includes(type)){
   const plan=productionPlan(profile(false),values,buildDirection([],values.mood,random,collection,values),collection,random),input=renderInput(plan),json=JSON.parse(input.split('\n\n【全選択の個別レシピ】')[0]);
   assert.deepEqual(json.copy.map(slot=>[slot.role,slot.text]),plan.copy.slots.map(slot=>[slot.role,slot.text]),label+' actual handoff changed or duplicated approved copy');
   assert.equal(json.layout.method,plan.conditions.find(c=>c.key==='design').execution.method,label+' actual handoff still uses stock design execution');
   if(policy.authority!=='design')assert.ok(json.layout.method.includes(recipe.executionMethod),label+' lost explicit copy authority before the detailed recipes');
   assert(!input.includes('undefined')&&!input.includes('NaN'));
   transfers++;
  }
  cases++;
 }
 // Remembered dialogue is subordinate to the selected manuscript and to a
 // blank automatic art format. It must not add an extra role through lineDetail.
 for(const design of ['通常の一枚絵','タロットカード','週刊誌の表紙'])for(const type of ['デザインに合わせて自動編集','クリエイター名だけ','商品広告・キャッチと特徴3点','映画ポスター風・タイトルとクレジット','文字を一切入れない','セリフのみ']){
  const values={...base,collection,design,type,line:'また、この場所で。'},plan=productionPlan(profile(false),values,buildDirection([],values.mood,random,collection,values),collection,random),line=plan.conditions.find(c=>c.key==='type').execution.line;
  if(copyAllowsDialogue(values))assert(plan.copy.slots.some(slot=>slot.text===values.line),design+' / '+type+' authorizes a dialogue absent from the manuscript');
  else{assert(!plan.copy.slots.some(slot=>slot.text===values.line));assert.match(line.method,/画像には描かない/,design+' / '+type+' prints remembered dialogue outside the authorized roles');}
  assert.equal(copyAuthority(values).noText,type==='文字を一切入れない'||type==='デザインに合わせて自動編集'&&design==='通常の一枚絵');
 }
}
applyCollection('halloween');
console.log('PASS effective copy: '+cases+' combinations across all 48 designs, 26 visible text controls, Halloween/everyday, person/scenery and fixed/source-edited manuscript; '+transfers+' real integration inputs; explicit roles replace defaults, image-only auto stays blank, no duplicate copy, and remembered dialogue stays within permission.');
