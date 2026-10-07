import assert from 'node:assert/strict';
import {questions,resolveSelections} from '../catalog.js?v=18';
import {initialSelections} from '../modes.js?v=18';
import {applyCollection} from '../collection.js?v=18';
import {buildDirection} from '../direction.js?v=18';
import {applyPose} from '../poses.js?v=18';
import {visualSpec} from '../visual-specs.js?v=18';
import {formatSpecs} from '../formats.js?v=18';
import {productionPlan,planInstructions,repairPrompt} from '../production-plan.js?v=18';
import {buildEditorial} from '../editorial.js?v=18';
import {composePrompt} from '../prompt.js?v=18';
import {profileForArtwork} from '../activity-settings.js?v=18';
const profile={displayName:'Alice',topics:['写真','創作'],biography:'写真と創作'},base=resolveSelections({...initialSelections(),design:'ファッション雑誌の表紙',costume:'海賊',pose:'全力で走る',mood:'完全な左横顔90度'},()=>0.2);
const make=values=>applyPose(buildDirection([],values.mood,()=>0.2),values.pose);
let examined=0;
for(const collection of ['halloween','everyday']){
 applyCollection(collection);
 for(const q of questions)for(const value of q.groups.flatMap(g=>g.values)){
  const values={...base,[q.key]:value},spec=visualSpec(q.key,value);
  assert.ok(spec.known,collection+' / '+q.key+' / '+value+' has no concrete specification');assert.ok(spec.text.length>=15,q.key+' / '+value);assert.ok(spec.checks.length);
  const variant=make(values),plan=productionPlan(profile,values,variant,collection,()=>0.2);
  assert.equal(plan.conditions.length,10);assert.ok(plan.conditions.every(c=>c.text.length>=20&&c.checks.length));
  const prompt=composePrompt({creator:'alice',profile,values,variant,references:[],edition:'ALL',collection,preparedPlan:plan});
  assert.ok(prompt.includes(value));assert.ok(prompt.includes('実画像での完成検査'));assert.ok(!prompt.includes('undefined'));assert.ok(!prompt.includes('NaN'));assert.ok(!prompt.includes('選択した特徴だけを作品へ反映'));examined++;
 }
}
applyCollection('halloween');
for(const design of Object.keys(formatSpecs)){
 const values={...base,design,type:'デザインに合わせて自動編集'},copy=buildEditorial(profile,values,()=>0.2);assert.ok(copy.slots.length>=3,design);
 if(copy.kind==='cover'){assert.equal(copy.slots.filter(s=>s.role==='補助特集').length,design==='週刊誌の表紙'?6:4);assert.equal(copy.slots.filter(s=>s.role==='補助特集の補足').length,design==='週刊誌の表紙'?6:4);assert.ok(copy.slots.some(s=>s.role==='誌名'));}
 if(copy.kind==='interview'){assert.ok(copy.slots.some(s=>s.role==='リード文'));assert.ok(copy.slots.filter(s=>/^回答/.test(s.role)).every(s=>s.text.length>35));assert.ok(copy.slots.some(s=>/^(写真|図版)キャプション$/.test(s.role)));}
 if(['spread','newspaper'].includes(copy.kind)){assert.equal(copy.slots.filter(s=>/^本文\d/.test(s.role)).length,3);assert.ok(copy.slots.filter(s=>/^本文\d/.test(s.role)).every(s=>s.text.length>60));}
 if(copy.kind==='cinema')assert.equal(copy.slots.filter(s=>s.role.startsWith('ビリング')).length,3);
 if(['art','landscape','icon','pattern'].includes(copy.kind))assert.ok(!copy.slots.some(s=>s.role==='補助見出し'));
}
const none=buildEditorial(profile,{...base,type:'文字を一切入れない'},()=>0.2);assert.deepEqual(none.blocks,[]);
for(const type of ['クリエイター名だけ','手書きサイン風の名前','墨の落款風の名前'])assert.deepEqual(buildEditorial(profile,{...base,type},()=>0.2).blocks,['Alice']);
assert.deepEqual(buildEditorial(profile,{...base,type:'HALLOWEENのみ'},()=>0.2).blocks,['HALLOWEEN']);assert.deepEqual(buildEditorial(profile,{...base,type:'セリフのみ',line:'セリフなし'},()=>0.2).blocks,[]);
assert.ok(buildEditorial(profile,{...base,type:'物語の装丁風・タイトルと紹介'},()=>0.2).slots.some(s=>s.role==='紹介文'));
const off=buildEditorial(profileForArtwork(profile,false),base,()=>0.2);assert.ok(!off.blocks.join('\n').includes('写真の向こう側'));assert.deepEqual(off.topics,[]);
const np={...base,costume:'風景を主役にする'},npPlan=productionPlan(profile,np,make(np));assert.ok(npPlan.notes.some(s=>s.includes('人物なし')));assert.match(npPlan.conditions.find(c=>c.key==='pose').text,/物体/);
assert.throws(()=>productionPlan(profile,{...base,place:'おまかせ'},make(base)),/未確定/);assert.throws(()=>productionPlan(profile,{...base,size:'bad'},make(base)),/幅・高さ/);
const auto=resolveSelections(Object.fromEntries(questions.map(q=>[q.key,'おまかせ'])),()=>0.99);assert.equal(auto.type,'デザインに合わせて自動編集');
const densitySwitch={...base,type:'映画ポスター風・タイトルとクレジット'},p=productionPlan(profile,densitySwitch,make(densitySwitch));assert.ok(planInstructions(p).join('\n').includes('デザイン自体を別形式へ置換しない'));
assert.ok(repairPrompt({prompt:'EXACT ORIGINAL PROMPT'}).endsWith('EXACT ORIGINAL PROMPT'));
const mono={...base,medium:'水墨画',palette:'墨一色'},monoPrompt=composePrompt({creator:'alice',profile,values:mono,variant:make(mono),references:[],edition:'MONO'});
assert.match(monoPrompt,/髪・肌・瞳の色は無彩色の明度差へ翻訳/);assert.match(monoPrompt,/金髪・金刺繍・肌色/);assert.ok(!monoPrompt.includes('髪・肌・瞳の基礎色は保持'));
assert.match(formatSpecs['見開き特集'].layout,/同じ高さから始まる横並び2列/);
console.log('PASS production: '+examined+' Halloween/everyday choices are concrete and present in final prompts; all '+Object.keys(formatSpecs).length+' format structures; full cover lines/decks, Q&A, spread/newspaper body, cinema billing; no-text/name-only/activity OFF; unresolved inputs blocked. These checks validate instructions, not a guarantee of image-model fidelity.');
