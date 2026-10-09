import assert from 'node:assert/strict';
import {questions,resolveSelections} from '../catalog.js?v=28.4.3';
import {initialSelections} from '../modes.js?v=28.4.3';
import {applyCollection} from '../collection.js?v=28.4.3';
import {buildDirection} from '../direction.js?v=28.4.3';
import {applyPose} from '../poses.js?v=28.4.3';
import {visualSpec} from '../visual-specs.js?v=28.4.3';
import {formatSpecs} from '../formats.js?v=28.4.3';
import {productionPlan,planInstructions,repairPrompt} from '../production-plan.js?v=28.4.3';
import {buildEditorial} from '../editorial.js?v=28.4.3';
import {composePrompt} from '../prompt.js?v=28.4.3';
import {profileForArtwork} from '../activity-settings.js?v=28.4.3';
// This suite checks fixed manuscript geometry. Source-guided manuscript roles
// and actual article evidence are exercised separately by check-fidelity-v25.
const profile={displayName:'Alice',activityEnabled:false,topics:['写真','創作'],biography:'写真と創作'},base=resolveSelections({...initialSelections(),design:'ファッション雑誌の表紙',costume:'海賊',pose:'全力で走る',mood:'完全な左横顔90度'},()=>0.2);
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
  const errors=plan.issues.filter(issue=>issue.severity==='error');
  if(errors.length){assert.match(prompt,/画像生成を停止/);for(const issue of errors)assert.ok(prompt.includes(issue.reason));assert.ok(!prompt.includes('ChatGPTの画像作成機能を実行'));}
  else{if(q.key!=='line')assert.ok(prompt.includes(value));for(const slot of plan.copy.slots)assert.ok(prompt.includes(JSON.stringify(slot.text)));assert.ok(prompt.includes('ChatGPTの画像作成機能を実行'));}
  assert.ok(!prompt.includes('undefined'));assert.ok(!prompt.includes('NaN'));assert.ok(!prompt.includes('選択した特徴だけを作品へ反映'));examined++;
 }
}
applyCollection('halloween');
for(const design of Object.keys(formatSpecs)){
 const values={...base,design,type:'デザインに合わせて自動編集'},copy=buildEditorial(profile,values,()=>0.2);
 const imageOnly=['通常の一枚絵','キャラクターのキービジュアル','幻想風景画','自然・都市の風景画','映画のワンシーン','物語の挿絵','絵巻物','屏風絵','掛け軸','図案・パターン','アイコン・肖像','紋章・エンブレム','ステッカー','スマホ壁紙'].includes(design);
 if(imageOnly){assert.equal(copy.mode,'none',design+' must not acquire stock title/slogan/author copy');assert.deepEqual(copy.slots,[]);}else assert.ok(copy.slots.length>=2,design+' lost its necessary default title/name roles');
 if(design==='写真集の表紙'||design==='絵本の表紙')assert.deepEqual(copy.slots.map(s=>s.role),['書名','作者名']);
 if(design==='タロットカード')assert.deepEqual(copy.slots.map(s=>s.role),['カード題名','作者名']);
 if(design==='トレーディングカード')assert.deepEqual(copy.slots.map(s=>s.role),['キャラクター名','役柄','短い説明']);
 if(design==='音楽アルバムジャケット')assert.deepEqual(copy.slots.map(s=>s.role),['アルバム名','作者名']);
 if(copy.kind==='cover'){assert.equal(copy.slots.filter(s=>s.role==='補助特集').length,design==='週刊誌の表紙'?6:4);assert.equal(copy.slots.filter(s=>s.role==='補助特集の補足').length,design==='週刊誌の表紙'?6:4);assert.ok(copy.slots.some(s=>s.role==='誌名'));}
 if(copy.kind==='interview'){assert.ok(copy.slots.some(s=>s.role==='リード文'));assert.ok(copy.slots.filter(s=>/^回答/.test(s.role)).every(s=>s.text.length>35));assert.ok(copy.slots.some(s=>/^(写真|図版)キャプション$/.test(s.role)));}
 if(['spread','newspaper'].includes(copy.kind)){assert.equal(copy.slots.filter(s=>/^本文\d/.test(s.role)).length,3);assert.ok(copy.slots.filter(s=>/^本文\d/.test(s.role)).every(s=>s.text.length>60));}
 if(copy.kind==='newspaper'){assert.notEqual(copy.slots.find(s=>s.role==='副記事本文1').text,copy.slots.find(s=>s.role==='本文1').text);assert.notEqual(copy.slots.find(s=>s.role==='副記事本文2').text,copy.slots.find(s=>s.role==='本文2').text);}
 if(copy.kind==='festival'){assert.ok(copy.slots.some(s=>s.role==='紹介'));assert.ok(!copy.slots.some(s=>s.role==='キャッチ'),'A stock slogan duplicates the festival introduction');}
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
const auto=resolveSelections(Object.fromEntries(questions.map(q=>[q.key,'おまかせ'])),()=>0.99);
assert.ok(questions.find(q=>q.key==='type').groups.some(group=>group.values.includes(auto.type)),'AUTO typography must resolve to a real allowed option');
const fixedType=resolveSelections({...initialSelections(),type:'デザインに合わせて自動編集'},()=>.99);assert.equal(fixedType.type,'デザインに合わせて自動編集','An explicitly selected editorial control must stay fixed');
const densitySwitch={...base,type:'映画ポスター風・タイトルとクレジット'},p=productionPlan(profile,densitySwitch,make(densitySwitch));assert.ok(planInstructions(p).join('\n').includes('デザイン自体を別形式へ置換しない'));
assert.ok(repairPrompt({prompt:'EXACT ORIGINAL PROMPT'}).endsWith('EXACT ORIGINAL PROMPT'));
const mono={...base,medium:'水墨画',palette:'墨一色'},monoPrompt=composePrompt({creator:'alice',profile,values:mono,variant:make(mono),references:[],edition:'MONO'});
assert.match(monoPrompt,/髪・肌・瞳の色は無彩色の明度差へ翻訳/);assert.match(monoPrompt,/主参照の識別色.*許可色の濃淡へ変換/);assert.ok(!monoPrompt.includes('髪・肌・瞳の基礎色は保持'));
assert.match(formatSpecs['見開き特集'].layout,/同じ高さから始まる横並び2列/);
console.log('PASS production: '+examined+' Halloween/everyday choices are concrete and present in final prompts; all '+Object.keys(formatSpecs).length+' format structures; full cover lines/decks, Q&A, spread/newspaper body, cinema billing; no-text/name-only/activity OFF; unresolved inputs blocked. These checks validate instructions, not a guarantee of image-model fidelity.');
