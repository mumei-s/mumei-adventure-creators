import assert from 'node:assert/strict';
import {buildEditorial,editorialContract} from '../editorial.js?v=28.3.1';
import {publicCopyContext} from '../copy-scope.js?v=28.3.1';
import {halloweenModeContract,halloweenCopyRules} from '../halloween-mode-contract.js?v=28.3.1';
import {typographyValues} from '../typography-options.js?v=28.3.1';

// Check reader-facing outputs and preservation with a deliberately ordinary
// source theme. Merely appending a decorative pumpkin is not this contract.
const seasonal=/Halloween|ハロウィーン|ハロウィン/i;
const technical=/カメラ|アングル|90度|深暗部|解像度|プロンプト|画像生成|\bdpi\b|\bpx\b/i;
const base={theme:'旅先で見つけた景色',place:'街角の歩道',costume:'リネンシャツとデニム',medium:'水墨画',palette:'墨一色',pose:'椅子に腰掛ける',mood:'目を閉じて安らぐ',angle:'真上から・90度',line:'セリフなし',size:'A4縦・300dpi目安｜2480×3508｜210:297'};
const designs=['通常の一枚絵','新聞の一面','週刊誌の表紙','見開き特集','映画ポスター','小説の装丁','トレーディングカード','紋章・エンブレム'];
const types=['デザインに合わせて自動編集','新聞風・記事と段組み','短いタイトル＋名前',...typographyValues];
let cases=0;
for(const collection of ['halloween','everyday'])for(const noPerson of [false,true])for(const design of designs)for(const type of types)for(const sourceGuided of [false,true]){
 const values={...base,collection,design,type,...(noPerson?{costume:'風景を主役にする'}:{})},before=JSON.stringify(values);
 const profile={displayName:'季節原稿の検証',activityEnabled:sourceGuided,...(sourceGuided?{biography:'旅と日々の出来事について文章を公開している。'}:{})};
 const copy=buildEditorial(profile,values,()=>.2),contract=halloweenModeContract(values,{collection,noPerson});
 assert.equal(JSON.stringify(values),before,'Seasonal adaptation changed the selected values');
 assert.equal(copy.contentSources.setting,base.place,'Seasonal copy replaced the location');
 assert.doesNotMatch(JSON.stringify(copy.contentSources),technical,'Drawing instructions entered reader-facing topics');
 assert.doesNotMatch(copy.blocks.join(' '),technical,'The printed manuscript explains production settings');
 if(collection==='halloween'){
  assert.match(copy.contentSources.story,seasonal,'A Halloween manuscript retained a generic story');
  assert.equal(copy.contentSources.selectedStory,base.theme,'Seasonal adaptation discarded the original story');
  assert.match(copy.contentSources.event,seasonal,'The story has no seasonal event');
  assert.match(copy.contentSources.purpose,seasonal,'The story has no seasonal purpose');
  const main=[...copy.slots,...copy.generatedSlots].find(slot=>/誌名|新聞題字|特集見出し|作品タイトル|主見出し|書名|主語句|作品名|企画名/.test(slot.role));
  if(main?.text)assert.match(main.text,seasonal,'A fixed masthead/title returned to a generic publication');
  for(const slot of copy.generatedSlots){
   for(const rule of halloweenCopyRules(copy.contentSources))assert(slot.instruction.includes(rule),'Source-guided editing lost Halloween copy rules');
   assert.match(JSON.stringify(slot.contentSources),seasonal,'The editing request lost the seasonal story');
  }
  assert.match(contract.method,/すべての形式/);
  assert.match(contract.method,/カボチャを一個置く/);
  assert.match(contract.method,/許可色の濃淡/);
  if(!noPerson)assert.match(contract.method,/同じ服/,'Seasonal mode can replace ordinary clothing');
  if(noPerson)assert.match(contract.method,/人型の影やマネキン/);
  if(!sourceGuided&&design==='新聞の一面'&&type==='デザインに合わせて自動編集'){
   assert.match(copy.slots.find(slot=>slot.role==='新聞題字').text,seasonal);
   assert.match(copy.slots.find(slot=>slot.role==='本文1').text,seasonal);
   assert.match(copy.slots.find(slot=>slot.role==='本文2').text,seasonal);
   assert.match(copy.slots.find(slot=>slot.role==='本文3').text,seasonal);
  }
  for(const rule of halloweenCopyRules(copy.contentSources))assert(editorialContract(copy).includes(rule),'The final manuscript contract lost seasonality');
 }else{
  assert.equal(copy.contentSources.story,base.theme,'Everyday mode acquired a forced seasonal title');
  assert.equal(copy.contentSources.season,undefined);
  assert.doesNotMatch(copy.blocks.join(' '),seasonal,'Everyday copy gained unsolicited Halloween wording');
  assert.equal(halloweenCopyRules(copy.contentSources).length,0);
  assert.match(contract.method,/日常・幻想・ホラー・怪談/,'Everyday mode was narrowed to ordinary scenes');
 }
 cases++;
}
// Exact user text and restricted manuscript roles remain untouched. Seasonal
// wording must be expressed by the image when no additional copy is allowed.
for(const collection of ['halloween','everyday']){
 const values={...base,collection,design:'新聞の一面',type:'セリフのみ',line:'また、この場所で。'};
 const copy=buildEditorial({displayName:'作者',activityEnabled:false},values,()=>.2);
 assert.deepEqual(copy.slots.map(slot=>slot.text),['また、この場所で。']);
 const empty=buildEditorial({displayName:'作者'}, {...values,type:'文字を一切入れない'},()=>.2);
 assert.equal(empty.slots.length,0);
 assert.equal(empty.blocks.length,0);
 const signed=buildEditorial({displayName:'作者',activityEnabled:false},{...values,type:'クリエイター名だけ'},()=>.2);
 assert.deepEqual(signed.slots.map(slot=>slot.text),['作者']);
 const explicit=publicCopyContext({...base,collection:'everyday',theme:'Halloweenのお茶会'});
 assert.match(explicit.story,seasonal,'Everyday mode removed an explicitly selected seasonal theme');
}
// Non-person inputs provide shapes and colours, not a face to preserve. A
// separately selected person output may create an original protagonist;
// scenery-only output must not create one, including during later repair.
for(const sourceKind of ['scenery','mark-object']){
 const values={...base,sourceKind,collection:'halloween',costume:'リネンシャツとデニム'};
 const contract=halloweenModeContract(values,{collection:'halloween',noPerson:false});
 const identity=contract.sections.find(section=>section.label==='Halloween版／選択主題と画材の保持').text;
 assert.match(identity,/人物の識別基準がない/);
 assert.match(identity,/選択が明示されている場合だけ/);
 assert.match(identity,/固有形・色・紋様・構造/);
 assert.match(identity,/独自の主役を作る/);
 assert.match(identity,/既に生成した独自の主役の識別特徴を保ち/,'The common repair contract lost the already generated original identity');
 assert.match(identity,/専用宝石原画/);
 assert.doesNotMatch(identity,/同じ主参照の識別特徴/,'A non-person image was incorrectly used as a face reference');
 assert.match(identity,/同じ服/,'The adapted original protagonist lost the selected ordinary clothing');
 const scenery=halloweenModeContract({...values,costume:'風景を主役にする'},{collection:'halloween',noPerson:true});
 const scenerySubject=scenery.sections.find(section=>section.label==='Halloween版／選択主題と画材の保持').text;
 assert.match(scenerySubject,/人物なしを保ち/);
 assert.doesNotMatch(scenerySubject,/独自の主役を作る/,'Non-person source created a character despite the scenery-only selection');
}
// An automatic weekly cover still needs its six distinct cover-line/deck
// pairs with tags OFF. Limited text must never use those pairs as filler.
for(const noPerson of [false,true])for(const sourceGuided of [false,true]){
 const values={...base,collection:'halloween',design:'週刊誌の表紙',type:'デザインに合わせて自動編集',...(noPerson?{costume:'風景を主役にする'}:{})};
 const profile={displayName:'週刊誌検証',tagsEnabled:false,topics:[],activityEnabled:sourceGuided,...(sourceGuided?{biography:'日々の出来事を文章にしている。'}:{})};
 const copy=buildEditorial(profile,values,()=>.2),roles=[...copy.slots,...copy.generatedSlots];
 assert.equal(roles.filter(slot=>slot.role==='補助特集').length,6,'Halloween weekly cover lost one of its six feature slots');
 assert.equal(roles.filter(slot=>slot.role==='補助特集の補足').length,6,'Halloween weekly cover lost one of its six feature decks');
 if(!sourceGuided){
  const headlines=copy.slots.filter(slot=>slot.role==='補助特集').map(slot=>slot.text);
  assert.equal(new Set(headlines).size,6,'The sixth feature was a duplicate filler headline');
  for(const text of headlines)assert.match(text,seasonal);
 }
 for(const type of ['文字を一切入れない','クリエイター名だけ','短いタイトル＋名前','セリフのみ']){
  const limited=buildEditorial(profile,{...values,type,line:'また、この場所で。'},()=>.2);
  assert.ok(![...limited.slots,...(limited.generatedSlots||[])].some(slot=>/補助特集/.test(slot.role)),'Weekly density added forbidden copy under '+type);
 }
}
console.log('PASS Halloween story and copy contract: '+cases+' format/type/source/subject/mode combinations preserve selections, adapt ordinary themes into seasonal stories, season newspaper headlines and bodies, keep exact user text and text-off, and leave everyday themes unrestricted. Generated-image adherence is not asserted.');
