import assert from 'node:assert/strict';
import {applyCollection} from '../collection.js?v=28.0.2';
import {resolveSelections} from '../catalog.js?v=28.0.2';
import {initialSelections} from '../modes.js?v=28.0.2';
import {buildDirection} from '../direction.js?v=28.0.2';
import {applyPose} from '../poses.js?v=28.0.2';
import {productionPlan} from '../production-plan.js?v=28.0.2';
import {composePrompt} from '../prompt.js?v=28.0.2';
import {composeArtworkStage} from '../artwork-stage.js?v=28.0.2';
import {needsStagedProduction,composeLayoutStage} from '../staged-production.js?v=28.0.2';

// The case that kept producing a photographic face when artwork and typesetting
// were requested together. These assertions check the handoff between stages.
const selected={
 design:'見開き特集',medium:'宝石ホログラムアニメ',theme:'真夜中の魔女のアトリエ',
 costume:'ミイラ',mood:'正面・首をまっすぐ',place:'魔女の書斎',pose:'床であぐらをかく',
 palette:'夜紺 × 翡翠 × 蛍光緑',type:'デザインに合わせて自動編集',line:'隠した想いも、今夜の衣装。',
 size:'A4縦・300dpi目安｜2480×3508｜210:297'
};
const profile={displayName:'AUTHOR_FOR_LAYOUT_ONLY',activityEnabled:false,biography:'PROFILE_INSTRUCTION_MUST_NOT_ENTER_ARTWORK',topics:['PROFILE_TOPIC_ONLY'],titles:['PROFILE_TITLE_ONLY']};
const random=()=>.28;
function fixture(overrides={},collection='halloween'){
 applyCollection(collection);
 const values=resolveSelections({...initialSelections(),...selected,...overrides},random);
 const variant=applyPose(buildDirection([],values.mood,random,collection,values),values.pose);
 const plan=productionPlan(profile,values,variant,collection,random);
 const prompt=composePrompt({collection,profile,values,variant:plan.variant,references:[{name:'original-character-reference.png',role:'identity'}],edition:'STAGE TEST',preparedPlan:plan});
 return {values,variant:plan.variant,plan,prompt};
}
const has=(text,fragment,message)=>assert.ok(text.includes(fragment),message);
const lacks=(text,fragment,message)=>assert.ok(!text.includes(fragment),message);
const matches=(text,pattern,message)=>assert.ok(pattern.test(text),message);

const spread=fixture();
assert.equal(needsStagedProduction(spread.plan),true,'The character feature spread needs separate artwork and layout stages');
const generatedArt='approved-artwork-stage-1.png';
const artwork=composeArtworkStage(spread.plan),layout=composeLayoutStage(spread.plan,{artworkName:generatedArt});
assert.equal(typeof artwork,'string');assert.equal(typeof layout,'string');
assert.ok(artwork.trim()&&layout.trim(),'Both stages must contain actual instructions');
has(spread.prompt,'通常制作：完成画像を1回で生成','Normal delivery has one generation for the finished page');
lacks(spread.prompt,'<svg','Optional SVG templates must not bloat normal delivery');
lacks(spread.prompt,'【必要な場合の画風修正用入力：開始】','Normal delivery must not duplicate the entire repair recipe');
has(spread.prompt,'直ちにこの会話へ表示','Normal delivery must display the first result before checking it');
has(spread.prompt,'非表示の再生成ループは行わない','Failed artwork must not cause a hidden unbounded retry loop');

// All selected image decisions survive stage 1, including the 2D construction
// that failed in the single-pass image proof. Editorial copy does not enter it.
for(const key of ['medium','costume','theme','place','mood','pose','palette']){
 const condition=spread.plan.conditions.find(c=>c.key===key);
 has(artwork,condition.value,'Artwork stage lost the selected '+key);
 for(const s of condition.sections)has(artwork,s.text,'Artwork stage lost '+key+' / '+s.label);
}
matches(artwork,/主参照|参照人物|同じ人物|識別特徴/,'Artwork stage must retain the supplied character identity');
has(artwork,'2D','Artwork stage must explicitly construct the chosen animation style');
has(artwork,'投影膜','Artwork stage must retain the selected hologram method');
for(const marker of [profile.displayName,profile.biography,...profile.topics,...profile.titles])lacks(artwork,marker,'Profile or author content leaked into artwork stage');
for(const slot of spread.plan.copy.slots.filter(s=>/本文|リード|引用/.test(s.role)))lacks(artwork,slot.text,'Editorial '+slot.role+' leaked into artwork stage');
for(const s of spread.plan.conditions.find(c=>c.key==='design').sections)lacks(artwork,s.text,'Layout instruction '+s.label+' leaked into artwork stage');
const withPrivateContext={...spread.plan,profile,editorial:[...spread.plan.editorial,'EDITORIAL_ONLY_INSTRUCTION'],format:[...spread.plan.format,'LAYOUT_ONLY_INSTRUCTION']};
const isolated=composeArtworkStage(withPrivateContext);
for(const marker of [profile.biography,...profile.topics,...profile.titles,'EDITORIAL_ONLY_INSTRUCTION','LAYOUT_ONLY_INSTRUCTION'])lacks(isolated,marker,'Non-artwork context leaked into stage 1');

// Stage 2 uses native SVG composition with the verified picture, selected grid,
// and exact copy. It must not invoke image generation or redraw the portrait.
has(layout,'この段階はSVGによる組版','Layout stage must use native SVG composition');
has(layout,'<svg','Layout stage must contain an executable SVG template');
has(layout,'preserveAspectRatio="xMidYMid meet"','SVG template must preserve the whole source image');
lacks(layout,'この環境で利用できる画像生成機能を実行し、完成した画像そのものを1枚','Layout stage must not retain the previous image-generation output contract');
has(spread.prompt,'確定原稿','Single-call delivery retains the final copy');
for(const s of spread.plan.conditions.find(c=>c.key==='design').sections.filter(s=>['領域とグリッド','文字と読み順'].includes(s.label)))has(layout,s.text,'Layout stage lost '+s.label);
for(const slot of spread.plan.copy.slots)has(layout,slot.text,'Layout stage lost exact copy for '+slot.role);
has(layout,generatedArt,'Layout stage must use the generated artwork as its reference');
has(layout,'本文枠A','Layout stage lost the left body-text frame');
has(layout,'本文枠B','Layout stage lost the right body-text frame');
matches(layout,/主画像|制作済み|生成済み/,'Layout stage must use the picture made in stage 1');
matches(layout,/描き直さない|再描画しない|再制作しない|再生成しない/,'Layout stage must explicitly preserve the completed picture');
lacks(layout,'今回必要な主参照がこのメッセージにない場合だけ、その画像の添付を求める','Layout stage must not request the original character reference again');
lacks(layout,'original-character-reference.png','Layout stage must not name the original portrait as a reference');
const drawing=spread.plan.conditions.find(c=>c.key==='medium').sections[0].text;
lacks(layout,drawing,'Layout stage must not restart the character drawing recipe');

// Native editorial composition also applies to complex pages without people.
// Their artwork stage must continue to suppress human face and body directions.
for(const costume of ['風景を主役にする','モチーフだけで構成する','紋章・アイコンにする']){
 const subject=fixture({costume}),stage=composeArtworkStage(subject.plan);
 assert.equal(needsStagedProduction(subject.plan),true,costume+' in a populated feature spread needs editorial composition');
 has(subject.prompt,'通常制作：完成画像を1回で生成',costume+' normal delivery returns a finished page in one call');
 has(stage,costume,'Artwork stage must retain the selected nonhuman subject');
 matches(stage,/人物や人型へ置換しない|人物なし/,'Artwork stage must preserve the no-person requirement');
 for(const heading of ['顔の向き：','表情：','身体の動作：'])assert.ok(!stage.split('\n').some(line=>line.startsWith(heading)),costume+' artwork stage must not execute a human '+heading);
}

// No-text, limited-name, and straightforward picture flows remain single-stage.
for(const [label,overrides,collection] of [
 ['text off',{type:'文字を一切入れない'},'halloween'],
 ['empty dialogue only',{type:'セリフのみ',line:'セリフなし'},'halloween'],
 ['name only',{type:'クリエイター名だけ'},'halloween'],
 ['single illustration',{design:'通常の一枚絵'},'halloween'],
 ['ordinary watercolor landscape',{design:'自然・都市の風景画',medium:'透明水彩',theme:'山岳と湖のパノラマ',costume:'風景を主役にする',mood:'静かで美しい',place:'山岳と湖畔',pose:'おまかせ',palette:'翡翠 × 銅 × 濃紺',type:'文字を一切入れない',line:'セリフなし',size:'横写真3:2｜3600×2400｜3:2'},'everyday']
]){
 const single=fixture(overrides,collection);
 assert.equal(needsStagedProduction(single.plan),false,label+' must remain a single-stage request');
 lacks(single.prompt,'第1段階',label+' master prompt must not introduce staged production');
 lacks(single.prompt,'第2段階',label+' master prompt must not introduce a layout stage');
}

applyCollection('halloween');
console.log('PASS staged production: artwork preserves style, identity, pose and palette without editorial/profile instructions; native SVG layout preserves the verified picture, selected two-column format and exact copy without image generation; optional no-person artwork/layout stages suppress human instructions; normal delivery uses one generation; no-text, name-only and simple artwork stay single-stage.');
