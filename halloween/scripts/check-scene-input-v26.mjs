import assert from 'node:assert/strict';
import {questions,resolveSelections} from '../catalog.js?v=28.0.2';
import {applyCollection} from '../collection.js?v=28.0.2';
import {productionPlan} from '../production-plan.js?v=28.0.2';
import {composePrompt} from '../prompt.js?v=28.0.2';
import {creatorHandoff} from '../creator-handoff.js?v=28.0.2';

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
 return {plan,prompt,input:prompt.slice(start,end)};
}
let cases=0,max=0;
for(const medium of questions.find(q=>q.key==='medium').groups.flatMap(g=>g.values)){
 for(const theme of ['宇宙のHalloween','お菓子の王国']){
  for(const costume of ['参照画像の衣装を生かす','風景を主役にする']){
   const values={...base,medium,theme,costume};
   const {plan,prompt,input}=make(values);
   assert.ok(input.includes('【物語・世界観・舞台を一つの場面へ】'),medium);
   assert.ok(input.includes('「雨の路地」で「'+theme+'」'),medium+' separates subject and place');
   assert.ok(input.includes('別背景の禁止は画像の分割・無関係な場所の追加を防ぐ条件であり、選んだ世界観を消す条件ではない。'));
   if(theme==='宇宙のHalloween')assert.ok(input.includes('宇宙の世界観を主画像から削除しない'),medium+' loses cosmic context inside the ChatGPT integration material');
   if(theme==='お菓子の王国')assert.ok(input.includes('主役の支持面と周囲にも同じ素材と光'),medium+' reduces candy world to a prop');
   for(const ref of references)assert.ok(input.includes(ref.name),medium+' loses '+ref.role+' reference role');
   assert.ok(input.includes('似せてはいけない前作'));
   for(const condition of plan.conditions){
    assert.ok(condition.known,condition.key+' / '+condition.value+' uses a custom fallback in this preset test');
    for(const section of condition.sections)assert.ok(input.includes(section.text),medium+' loses '+condition.key+' / '+section.label);
   }
   assert.ok(prompt.indexOf('【ChatGPTで作者を確認')<prompt.indexOf('【統合するための制作仕様：開始】'));
   assert.equal((input.match(/共通編集条件：/g)||[]).length,1);
   for(const [index,slot] of plan.copy.generatedSlots.entries())assert.ok(input.includes((index+1)+'. '+slot.role+' / '+slot.maxCharacters+'字以内 / 階層'+slot.priority));
   cases++;max=Math.max(max,prompt.length);
  }
 }
}
assert.equal(cases,432);
for(const changed of [
 {costume:'紋章・アイコンにする'},
 {costume:'モチーフだけで構成する'},
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
 assert.ok(input.includes('限定色の必須条件：'));
 assert.ok(input.includes((medium==='水墨画'?'墨':'水彩')+'の必須条件：'));
}
const {plan,input}=make(base);
const editing=input.slice(input.indexOf('【確認した活動から新しく編集する許可原稿】'));
const oldEditing=plan.copy.generatedSlots.map((slot,index)=>(index+1)+'. '+slot.role+' / '+slot.maxCharacters+'字以内 / 階層'+slot.priority+'：'+slot.instruction).join('\n');
assert.ok(editing.length<oldEditing.length*.5,'Repeated editor instructions remain in the image input');
const interview=make({...base,design:'インタビュー誌面'}).input;
assert.ok(interview.includes('同じ番号の質問と回答を一組に'));
for(const medium of ['書と墨の抽象','禅画','抽象表現','ミニマリズム']){
 const {input}=make({...base,medium});
 assert.ok(input.includes('各指や人体の細部を写実的に追加せず'));
 assert.ok(input.includes('外周5%の安全余白を保ち'));
 assert.ok(!input.includes('両手の全指'));
 assert.ok(!input.includes('75〜80%'));
}
console.log('PASS scene image input: '+cases+' medium/world/subject combinations preserve one scene, every individual recipe and reference role inside the ChatGPT integration-material boundaries; abstract subjects stay planar; color constraints stay in input; repeated editorial instructions reduced. Maximum '+max+' prompt characters. Actual image quality is not inferred by this test.');
