import assert from 'node:assert/strict';
import fs from 'node:fs';
import {questions,resolveSelections} from '../catalog.js?v=28.0.2';
import {applyCollection} from '../collection.js?v=28.0.2';
import {productionPlan} from '../production-plan.js?v=28.0.2';
import {composePrompt} from '../prompt.js?v=28.0.2';
import {creatorHandoff} from '../creator-handoff.js?v=28.0.2';
import {lightingContract} from '../art-direction.js?v=28.0.2';
import {detailedSubject} from '../subject-recipes.js?v=28.0.2';

const profile=creatorHandoff('test_author','試作作者');
const fixed={design:'通常の一枚絵',medium:'発光幻想アニメ',costume:'参照画像の衣装を生かす',pose:'四つん這いで進む',mood:'俯瞰＋目を見開く',palette:'群青 × 菫 × 星白',type:'文字を一切入れない',line:'セリフなし',size:'縦ポスター2:3｜2400×3600｜2:3'};
const variant={face:'正面',expression:'驚き',distance:'全身',pose:'両手と両膝を接地',camera:'俯瞰'};
const oldRestrictions=['行為の対象・状態変化・前後の痕跡だけを担当','テーマ側の別の場所名は、必要な道具・展示・演目などへ翻案','固有の構造・素材・背景面だけを使う','仮装の小物と祝祭の道具だけ','物語の名前から別の場所や人物を補わない'];
let checked=0;
for(const collection of ['halloween','everyday']){
 applyCollection(collection);
 for(const theme of ['宇宙のHalloween','お菓子の王国']){
  for(const place of ['雨の路地','古城の大広間','抽象的な色面']){
   for(const costume of ['参照画像の衣装を生かす','風景を主役にする','モチーフだけで構成する','紋章・アイコンにする']){
    const values={...resolveSelections({...fixed,theme,place},()=>.2),costume};
    const plan=productionPlan(profile,values,variant,collection,()=>.2);
    const prompt=composePrompt({creator:'test_author',profile,values,variant,preparedPlan:plan,references:costume==='参照画像の衣装を生かす'?[{name:'reference.png',role:'identity'}]:[],edition:'SEMANTICS'});
    const drawing=prompt.split('【統合するための制作仕様：開始】')[1]?.split('【統合するための制作仕様：終了】')[0];
    assert.ok(drawing,'Drawing input must be explicitly delimited');
    if(collection==='halloween')assert.ok(plan.conditions.every(c=>c.known),'This preset scenario must use real selectable values');
    for(const stale of oldRestrictions)assert.ok(!drawing.includes(stale),theme+' / '+place+' still restricts the world: '+stale);
    assert.ok(drawing.includes(theme)&&drawing.includes(place),'Both selections must survive composition');
    const event=plan.conditions.find(c=>c.key==='theme');
    assert.ok(event.execution.evidence.every(e=>e.region.includes('世界')),'World must be a checked drawing region');
    const text=event.sections.map(s=>s.text).join(' ');
    if(theme.includes('宇宙'))assert.match(text,/恒星|宇宙の広がり|小物だけで宇宙を代用しない/);
    else assert.match(text,/菓子の素材|飴の硬い面/);
    if(costume==='参照画像の衣装を生かす')assert.ok(drawing.includes('四つん這いで進む'),'Story must preserve the selected pose');
    else assert.match(text,/人型|人体|人物|顔・手足/,'No-person story must retain its boundary');
    checked++;
   }
  }
 }
 assert.equal(questions.find(q=>q.key==='theme').name,'世界観・シーン');
 assert.equal(questions.find(q=>q.key==='place').name,'舞台・場所');
 assert.equal(questions.find(q=>q.key==='medium').name,'作風・画材');
}
applyCollection('everyday');
const everyday={...fixed,theme:'静かな読書の時間',place:'窓辺の読書室'};
const naturalLight=lightingContract(everyday,{collection:'everyday'});
assert.ok(!/宇宙|恒星|Halloween|魔法陣/.test(naturalLight),'Ordinary selections must not acquire an unselected world');
assert.match(lightingContract({...fixed,theme:'宇宙のHalloween',place:'雨の路地'}),/恒星光/,'Cosmic light must reach a non-cosmic selected place');
assert.ok(!lightingContract({...fixed,theme:'宇宙のHalloween',place:'抽象的な色面'}).includes('窓'),'Abstract selections must not gain windows');
const custom=detailedSubject('theme','珊瑚の宇宙で読書する',{values:{...fixed,place:'深夜の喫茶店'},noPerson:false,variant});
assert.match(custom.sections.map(s=>s.text).join(' '),/世界・環境・素材/,'Custom story semantics must include its selected world');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.ok(!html.includes('テーマ・舞台は場所、作風は世界観'));
applyCollection('halloween');
console.log('PASS v27 semantics: '+checked+' world/place/person/scenery/motif/emblem combinations keep one selected scene; no old world-to-prop restrictions; world-aware light, custom stories and UI roles are coherent. Instruction validation only, not generated-image quality.');
