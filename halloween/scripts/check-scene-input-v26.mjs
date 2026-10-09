import assert from 'node:assert/strict';
import {assertCompactHandoff,containsInstruction} from './compact-handoff-assertions-v28.mjs';
import {renderChatInput} from '../compiled-production.js?v=28.4.4';
import {renderRecipeChatInput} from '../compact-production.js?v=28.4.4';
import {usesFocusedProduction,needsIdentityPreparation} from '../focused-production.js?v=28.4.4';
import {questions,resolveSelections} from '../catalog.js?v=28.4.4';
import {applyCollection} from '../collection.js?v=28.4.4';
import {productionPlan} from '../production-plan.js?v=28.4.4';
import {composePrompt} from '../prompt.js?v=28.4.4';
import {creatorHandoff} from '../creator-handoff.js?v=28.4.4';

applyCollection('halloween');
const profile=creatorHandoff('scene_author');
const base=resolveSelections({design:'週刊誌の表紙',medium:'発光幻想アニメ',theme:'宇宙のHalloween',costume:'参照画像の衣装を生かす',place:'雨の路地',pose:'四つん這いで進む',mood:'正面・首をまっすぐ',palette:'群青 × 菫 × 星白',type:'デザインに合わせて自動編集',line:'セリフなし',size:'縦ポスター2:3｜2400×3600｜2:3'},()=>.2);
const variant={face:'正面・首をまっすぐ',expression:'微笑み',distance:'全身',pose:'右手を前へ伸ばし左掌と両膝で支える',camera:'俯瞰'};
const references=[{name:'identity.png',role:'identity'},{name:'auxiliary.png',role:'auxiliary'},{name:'avoid.png',role:'avoid'}];
function make(values){
 const plan=productionPlan(profile,values,variant,'halloween',()=>.2);
 const prompt=composePrompt({creator:profile.id,profile,values,variant,preparedPlan:plan,references,edition:'SCENE-INPUT'});
 const start=prompt.indexOf('【統合するための制作仕様：開始】');
 const end=prompt.indexOf('【統合するための制作仕様：終了】');
 assert.ok(start>=0&&end>start);
 assertCompactHandoff(plan,prompt);assert.doesNotMatch(prompt,/undefined|NaN/,'Legacy scene plans must resolve meaningful camera/performance without leaking missing fields');return {plan,prompt,input:prompt.slice(start,end),audit:renderChatInput(plan),recipe:renderRecipeChatInput(plan,references),focused:usesFocusedProduction(plan)};
}
let cases=0,max=0;
for(const medium of questions.find(q=>q.key==='medium').groups.flatMap(g=>g.values)){
 for(const theme of ['宇宙のHalloween','お菓子の王国']){
  for(const costume of ['参照画像の衣装を生かす','風景を主役にする']){
   const values={...base,medium,theme,costume,palette:medium==='サイアノタイプ'?'参照画像の色を生かす':medium==='クリスタルホログラム造形アニメ'?'群青 × 菫 × 星白':'モノクローム',...(costume==='風景を主役にする'?{pose:'おまかせ',mood:'毎回大胆に変える'}:{})};
   const {plan,prompt,input,audit,recipe,focused}=make(values);
   assert.ok(audit.includes('【物語・世界観・舞台を一つの場面へ】'),medium);assert.match(focused?recipe:input,/【出来事と世界】/);
   assert.ok(input.includes('雨の路地')&&input.includes(theme),medium+' separates subject and place');
   assert.ok(audit.includes('別背景の禁止は画像の分割・無関係な場所の追加を防ぐ条件であり、選んだ世界観を消す条件ではない。'));assert.match(focused?recipe:input,/世界を小物だけへ縮めず/);
   if(theme==='宇宙のHalloween'){
    assert.ok(/宇宙の広がり|星雲と遠い星の広がり|恒星|小物だけで宇宙を代用しない/.test(input),medium+' loses cosmic context inside the ChatGPT integration material');
    if(focused)assert.match(input,/宇宙を小さな飾り・窓内の別絵・別枠だけに閉じ込めない/,'The focused actual scene must not reduce the world to a detached prop');
   }
   if(theme==='お菓子の王国')assert.ok(input.includes('主役の支持面と周囲にも同じ素材と光'),medium+' reduces candy world to a prop');
   if(focused){
    for(const ref of references)assert.ok(prompt.includes(ref.name),medium+' loses the exact '+ref.role+' source name from its staged handoff');
    assert.match(prompt,/指定された補助用途だけ|補助用途|指定用途|今回の選択が明示した用途だけ/,'The staged handoff must limit supporting sources rather than blend unrelated examples');
    assert.match(prompt,/似せない前作|似せてはいけない前作|比較する前作/);
    assert.match(prompt,/人物の識別・作風・衣装・構図を置き換えず/,'Auxiliary evidence must not replace selected production conditions');
    assert.match(prompt,/今回の確定選択を禁止しない/,'Avoid references must not prohibit the same correctly selected world or technique');
    if(needsIdentityPreparation(plan,references)){assert.ok(input.includes('prepared-identity.png'));assert.ok(!input.includes('「identity.png」'),'The final stage must use the verified translated identity rather than reattach the original face');}
   }else{for(const ref of references)assert.ok(input.includes(ref.name),medium+' loses '+ref.role+' reference role');assert.ok(input.includes('似せてはいけない前作'));}
   for(const condition of plan.conditions){
    assert.ok(condition.known,condition.key+' / '+condition.value+' uses a custom fallback in this preset test');
    for(const section of condition.sections)assert.ok(audit.includes(section.text),medium+' audit loses '+condition.key+' / '+section.label);
   }
   assert.ok(prompt.indexOf('【ChatGPTで作者を確認')<prompt.indexOf('【統合するための制作仕様：開始】'));
   assert.equal((input.match(focused?/自動原稿は次の許可役割だけ編集する。/g:/次の役割だけ内容資料から新しく編集する。/g)||[]).length,1);
   for(const [index,slot] of plan.copy.generatedSlots.entries())assert.ok(input.includes(slot.role+' / '+slot.maxCharacters+'字以内 / 階層'+slot.priority));
   cases++;max=Math.max(max,prompt.length);
  }
 }
}
assert.equal(cases,questions.find(q=>q.key==='medium').groups.flatMap(g=>g.values).length*4);
for(const changed of [
 {costume:'紋章・アイコンにする',pose:'おまかせ',mood:'毎回大胆に変える'},
 {costume:'モチーフだけで構成する',pose:'おまかせ',mood:'毎回大胆に変える'},
 {place:'抽象的な色面'},
 {place:'墨の余白'}
]){
 const {input}=make({...base,...changed});
 assert.ok(input.includes('宇宙の広がりと舞台の識別形を、同じ図案内の大小・重なり・抜き・選択技法の明暗で結ぶ。'));
 assert.ok(input.includes('未選択の地平線・窓・建物・写実的な別景観を追加しない。'));
 assert.ok(!input.includes('その空・開口部・奥行きへ星雲と遠い星の広がりを連続させる。'));
}
for(const medium of ['水墨画','透明水彩']){
 const {input}=make({...base,medium,palette:'モノクローム'});
 assert.match(input,/主参照の識別色.*光.*反射.*文字.*許可色/);
 assert.match(input,medium==='水墨画'?/筆圧|かすれ|墨のにじみ/:/透明|translucent layering/);
}
const {plan,input}=make(base);
const editing=input.slice(input.indexOf('印字原稿：'));
const oldEditing=plan.copy.generatedSlots.map((slot,index)=>(index+1)+'. '+slot.role+' / '+slot.maxCharacters+'字以内 / 階層'+slot.priority+'：'+slot.instruction).join('\n');
assert.ok(editing.length<oldEditing.length*.5,'Repeated editor instructions remain in the image input');
const interview=make({...base,design:'インタビュー誌面'}).input;
assert.ok(interview.includes('同じ番号の質問と回答を一組に'));
for(const medium of ['書と墨の抽象','禅画','抽象表現','ミニマリズム']){
 const {input}=make({...base,medium});
 assert.ok(input.includes('各指や人体の細部を写実的に追加せず'));
 assert.match(input,/外周5%(?:以上)?の安全余白を保/,'Resolved camera must retain the same minimum safe margin');
 assert.ok(!input.includes('両手の全指'));
 assert.ok(!input.includes('75〜80%'));
}
// Free-input cosmic names must retain the conditional scene geometry too.
for(const theme of ['星雲の祝祭','星海の旅','宇宙の記録']){
 const {input}=make({...base,theme});
 assert.ok(input.includes('星雲と遠い星の広がりを連続させる'));
 assert.ok(input.includes('窓内の別絵・別枠だけに閉じ込めない'));
 const planar=make({...base,theme,costume:'紋章・アイコンにする',pose:'おまかせ',mood:'毎回大胆に変える'}).input;
 assert.ok(planar.includes('同じ図案内の大小・重なり・抜き'));
 assert.ok(planar.includes('星雲や星の間隔を少数の形と余白へ整理'));
 assert.ok(planar.includes('未選択の地平線・窓・建物・写実的な別景観を追加しない'));
}
console.log('PASS scene image input: '+cases+' medium/world/subject combinations preserve actual integrated world geometry, named reference roles, color and permitted copy; every authored recipe stays in the public review renderer. Focused final uses the verified prepared identity, scoped supporting/avoid sources stay named in the staged handoff, abstract subjects stay planar, and repeated editorial instructions are reduced. Maximum '+max+' prompt characters. Actual image quality is not inferred by this test.');
