import assert from 'node:assert/strict';
import {assertCompactHandoff,containsInstruction} from './compact-handoff-assertions-v28.mjs';
import {questions,resolveSelections} from '../catalog.js?v=28.4.4';
import {applyCollection} from '../collection.js?v=28.4.4';
import {productionPlan} from '../production-plan.js?v=28.4.4';
import {composePrompt} from '../prompt.js?v=28.4.4';
import {renderInput,renderChatInput} from '../compiled-production.js?v=28.4.4';
import {usesFocusedProduction} from '../focused-production.js?v=28.4.4';
import {renderRecipeChatInput} from '../compact-production.js?v=28.4.4';

applyCollection('halloween');
const profile={displayName:'試作作者',activityEnabled:false};
const base=resolveSelections({design:'通常の一枚絵',medium:'発光幻想アニメ',theme:'宇宙のHalloween',costume:'ヴィクトリア朝の正装',place:'雨の路地',pose:'片手を差し出す',mood:'俯瞰＋目を見開く',palette:'モノクローム',type:'文字を一切入れない',line:'セリフなし',size:'縦ポスター2:3｜2400×3600｜2:3'},()=>.2);
const variant={face:'正面',expression:'目を見開いて驚く',distance:'全身',pose:'片手を手前へ差し出す',camera:'俯瞰'};
function make(values){
 const plan=productionPlan(profile,values,variant,'halloween',()=>.2);
 const prompt=composePrompt({profile,values,variant,preparedPlan:plan,references:[{name:'witch-reference.png',role:'identity'}],edition:'WARDROBE'});
 const input=prompt.split('【統合するための制作仕様：開始】')[1]?.split('【統合するための制作仕様：終了】')[0]||prompt;
 const structured=JSON.parse(renderInput(plan).split('\n\n【全選択の個別レシピ】')[0]);
 const generatable=assertCompactHandoff(plan,prompt);
 const focused=usesFocusedProduction(plan),wardrobeClauses=focused?renderRecipeChatInput(plan,plan.referenceManifest||[]):input;
 return {plan,input,structured,audit:renderChatInput(plan),generatable,focused,wardrobeClauses};
}
let cases=0;
for(const medium of questions.find(q=>q.key==='medium').groups.flatMap(g=>g.values)){
 for(const costume of ['ヴィクトリア朝の正装','消防士','参照画像の衣装を生かす']){
  const {plan,input,structured,audit,generatable,focused,wardrobeClauses}=make({...base,medium,costume});
  const condition=plan.conditions.find(c=>c.key==='costume');
  assert.ok(condition.known);
  assert.ok(audit.includes(condition.execution.method));for(const section of condition.sections)assert.ok(audit.includes(section.text));cases++;if(!generatable)continue;assert(containsInstruction(input,condition.sections[0].text),'Selected costume construction lost in compact delivery');
  if(focused){
   assert.ok(input.indexOf('主役：')>=0&&input.indexOf('主役：')<input.indexOf('Halloween版。'),'Actual focused identity precedes seasonal scene instructions');
   assert.ok(input.indexOf('衣装「'+costume+'」：')>=0&&input.indexOf('衣装「'+costume+'」：')<input.indexOf('Halloween版。'),'Actual focused wardrobe precedes seasonal scene instructions');
   assert.match(input,/見本の若い女性、別の性別、幼児、細身の身体へ交換せず/,'Focused wardrobe must not borrow sample identity');
   for(const section of condition.sections.filter(section=>['役柄を示す形','接続と厚み','ポーズへの可動'].includes(section.label)))assert.ok(containsInstruction(input,section.text),'Actual focused wardrobe loses '+costume+' / '+section.label);
  }
  assert.ok(wardrobeClauses.indexOf('【主題と描画の統一】')<wardrobeClauses.indexOf('【出来事と世界】'),'Selected identity and wardrobe precede seasonal scene instructions');
  for(const section of condition.sections)assert.ok(audit.includes(section.text),'Selected wardrobe audit loses '+section.label);
  assert.match(wardrobeClauses,/顔の輪郭・目鼻口.*髪型.*年齢感・性別表現/);
  if(costume==='参照画像の衣装を生かす'){
   assert.match(structured.identity,/衣装の裁断・重なり・固定装身具.*保つ/);
   assert.match(wardrobeClauses,/背景の小物や手の武器は衣装に含めない/);
   if(focused)assert.match(input,/主参照の撮影角度・表情・服・装身具・持物・背景.*引き継がない.*参照衣装や参照色を明示した場合だけその構造や色を使う/,'Focused reference clothing retains construction without inheriting props/background');
   assert.ok(!input.includes('衣装は参照から継承せず'));
  }else{
   assert.ok(!structured.identity.includes('衣装の裁断・重なり・固定装身具を同じキャラクターの衣装として保つ'));
   assert.ok(!input.includes('衣装の裁断・重なり・固定装身具を同じキャラクターの衣装として保つ'));
   assert.ok(!input.includes('「参照画像の衣装を生かす」は着用した服'));
   assert.ok(wardrobeClauses.includes('衣装は選択した「'+costume+'」'));assert.match(wardrobeClauses,/選択衣装の構造と被覆へ着替える/);
   assert.match(wardrobeClauses,/入力の服・帽子・装身具・胸元の開きは自動継承せず/);
   assert.match(wardrobeClauses,/見本から顔・性別・体格を借用しない/);
   if(costume==='ヴィクトリア朝の正装')assert.match(input,/高い襟、長袖、胴の切替、丈の長い裾/);
   if(costume==='消防士')assert.match(input,/厚い防護服.*反射帯.*ヘルメット/);
  }
 }
}
assert.equal(cases,questions.find(q=>q.key==='medium').groups.flatMap(g=>g.values).length*3);
const scenery=make({...base,costume:'風景を主役にする',pose:'おまかせ',mood:'毎回大胆に変える'});
assert.ok(!scenery.structured.required_before_details.wardrobe_selection);
assert.ok(!scenery.input.includes('【今回の衣装を先に確定】'));
console.log('PASS wardrobe handoff: '+cases+' drawing-style/wardrobe combinations use identity separately from clothing; Victorian and firefighter outfits replace reference garments and headwear, while explicit reference-clothing selection retains its construction; no-person output receives no wardrobe directive. Actual image acceptance remains separate.');
