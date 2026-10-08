import assert from 'node:assert/strict';
import {questions,resolveSelections} from '../catalog.js?v=28.2.0';
import {applyCollection} from '../collection.js?v=28.2.0';
import {productionPlan} from '../production-plan.js?v=28.2.0';
import {composePrompt} from '../prompt.js?v=28.2.0';
import {renderInput} from '../compiled-production.js?v=28.2.0';

applyCollection('halloween');
const profile={displayName:'試作作者',activityEnabled:false};
const base=resolveSelections({design:'通常の一枚絵',medium:'発光幻想アニメ',theme:'宇宙のHalloween',costume:'ヴィクトリア朝の正装',place:'雨の路地',pose:'片手を差し出す',mood:'俯瞰＋目を見開く',palette:'群青 × 菫 × 星白',type:'文字を一切入れない',line:'セリフなし',size:'縦ポスター2:3｜2400×3600｜2:3'},()=>.2);
const variant={face:'正面',expression:'目を見開いて驚く',distance:'全身',pose:'片手を手前へ差し出す',camera:'俯瞰'};
function make(values){
 const plan=productionPlan(profile,values,variant,'halloween',()=>.2);
 const prompt=composePrompt({profile,values,variant,preparedPlan:plan,references:[{name:'witch-reference.png',role:'identity'}],edition:'WARDROBE'});
 const input=prompt.split('【統合するための制作仕様：開始】')[1].split('【統合するための制作仕様：終了】')[0];
 const structured=JSON.parse(renderInput(plan).split('\n\n【全選択の個別レシピ】')[0]);
 return {plan,input,structured};
}
let cases=0;
for(const medium of questions.find(q=>q.key==='medium').groups.flatMap(g=>g.values)){
 for(const costume of ['ヴィクトリア朝の正装','消防士','参照画像の衣装を生かす']){
  const {plan,input,structured}=make({...base,medium,costume});
  const condition=plan.conditions.find(c=>c.key==='costume');
  assert.ok(condition.known);
  assert.ok(input.includes(condition.execution.method));
  assert.ok(input.indexOf(structured.required_before_details.wardrobe_selection)<input.indexOf('【作品モード】'),'Selected wardrobe must be established before reference/collection discussion');
  for(const section of condition.sections)assert.ok(input.includes(section.text),'Selected wardrobe loses '+section.label);
  assert.ok(input.includes('髪型・顔の輪郭・目鼻口の特徴的な並び・年齢感・性別表現'));
  if(costume==='参照画像の衣装を生かす'){
   assert.match(structured.identity,/衣装の裁断・重なり・固定装身具.*保つ/);
   assert.match(input,/背景の小物や手に持つ武器を含めない/);
   assert.ok(!input.includes('衣装は参照から継承せず'));
  }else{
   assert.ok(!structured.identity.includes('衣装の裁断・重なり・固定装身具を同じキャラクターの衣装として保つ'));
   assert.ok(!input.includes('衣装の裁断・重なり・固定装身具を同じキャラクターの衣装として保つ'));
   assert.ok(!input.includes('「参照画像の衣装を生かす」は着用した服'));
   assert.ok(input.includes('衣装は参照から継承せず、選択した「'+costume+'」へ着替えた同じキャラクター'));
   assert.ok(input.includes('主参照の衣服・帽子・装身具・衣服の柄・胸元の開きは固定する人物特徴に含めない'));
   assert.ok(input.includes('帽子・冠・ヘッドドレス・宝飾は選択衣装の専用仕様が指定したものだけ'));
   if(costume==='ヴィクトリア朝の正装')assert.match(input,/高い襟、長袖、胴の切替、丈の長い裾/);
   if(costume==='消防士')assert.match(input,/厚い防護服.*反射帯.*ヘルメット/);
  }
  cases++;
 }
}
assert.equal(cases,342);
const scenery=make({...base,costume:'風景を主役にする'});
assert.ok(!scenery.structured.required_before_details.wardrobe_selection);
assert.ok(!scenery.input.includes('【今回の衣装を先に確定】'));
console.log('PASS wardrobe handoff: '+cases+' drawing-style/wardrobe combinations use identity separately from clothing; Victorian and firefighter outfits replace reference garments and headwear, while explicit reference-clothing selection retains its construction; no-person output receives no wardrobe directive. Actual image acceptance remains separate.');
