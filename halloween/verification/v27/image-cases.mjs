import {applyCollection} from '../../collection.js?v=27.0.0';
import {resolveSelections} from '../../catalog.js?v=27.0.0';
import {productionPlan} from '../../production-plan.js?v=27.0.0';
import {composePrompt} from '../../prompt.js?v=27.0.0';
import {creatorHandoff} from '../../creator-handoff.js?v=27.0.0';
import assert from 'node:assert/strict';

// The model receives the application's real prompt unchanged. Only the owner's
// character reference is supplied; catalogue sample art is never supplied.
export const mediaCases=[
 {id:'luminous-weekly',medium:'発光幻想アニメ',design:'週刊誌の表紙',costume:'ヴィクトリア朝の正装',place:'雨の路地',pose:'四つん這いで進む',body:'両手と両膝で濡れた地面を支え、手を前へ進める途中。肩と骨盤を同じ身体につなぐ'},
 {id:'crystal-character',medium:'クリスタルホログラム造形アニメ'},
 {id:'watercolor-character',medium:'透明水彩'},
 {id:'sumi-character',medium:'水墨画',theme:'お菓子の王国',place:'古城の大広間'},
 {id:'impasto-character',medium:'油彩・厚塗り',costume:'ヴィクトリア朝の正装'},
 {id:'photo-character',medium:'実写風街角スナップ',costume:'ヴィクトリア朝の正装',theme:'幽霊たちのお茶会',place:'雨の路地'},
 {id:'ukiyoe-character',medium:'浮世絵木版画',costume:'ヴィクトリア朝の正装'},
 {id:'pixel-character',medium:'ピクセルアート',costume:'ヴィクトリア朝の正装'},
];
export function mediaProof(c){
 applyCollection('halloween');
 const values=resolveSelections({design:c.design||'通常の一枚絵',medium:c.medium,
  theme:c.theme||'宇宙のHalloween',costume:c.costume||'参照画像の衣装を生かす',place:c.place||'星空の砂漠',
  pose:c.pose||'片手を差し出す',mood:'俯瞰＋目を見開く',palette:'群青 × 菫 × 星白',
  type:c.design?'デザインに合わせて自動編集':'文字を一切入れない',
  line:'セリフなし',size:'縦ポスター2:3｜2400×3600｜2:3'},()=>.2);
 const variant={face:'顔を上へ向け、カメラへ目を見開く。首の左右傾き0度',
  expression:'口角を上げた明るい微笑み',pose:c.body||'片膝と片手を地面で支え、もう片方の手を鑑賞者へ伸ばす',
  camera:'真上に近い強い俯瞰。手前へ差し出した手を大きく短縮遠近で描く',
  distance:'頭から両膝までの構図。差し出した手と支持する手を画面内へ収める',
  light:'星空の青紫の環境光と地面のランタンの暖色が同じ人物と砂へ落ちる',
  depth:'近景の手、主役、奥の砂丘と宇宙の空を一枚の空間として連続させる',
  motion:'指定した片手の差し出し。強風や浮遊を追加しない',
  layout:'縦構図で顔と手を大きく見せ、舞台の奥行きも残す',
  background:c.place?'選んだ場所と物語の世界を同じ空間に統合する':'砂丘から星と星雲の空へつながる一つの砂漠',
  motif:'選んだ物語に含まれる対象だけを同じ場面に統合する'};
 const profile=creatorHandoff('','無名S note','創作とnoteの活動を紹介する');
 const plan=productionPlan(profile,values,variant,'halloween',()=>.2);
 assert.ok(plan.conditions.every(x=>x.known),JSON.stringify(plan.conditions.filter(x=>!x.known)));
 const prompt=composePrompt({collection:'halloween',profile,values,variant,preparedPlan:plan,
  references:[{name:'owner-character-reference.png',role:'identity'}],edition:'STYLE-PROOF-'+c.id});
 return {id:c.id,values,variant:plan.variant,prompt,checks:plan.conditions.find(x=>x.key==='medium').checks};
}
