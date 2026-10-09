import assert from 'node:assert/strict';
import fs from 'node:fs';
import {productionPlan} from '../production-plan.js?v=28.4.5';
import {renderChatInput,renderInput} from '../compiled-production.js?v=28.4.5';
import {composePrompt} from '../prompt.js?v=28.4.5';

const settings=JSON.parse(fs.readFileSync(new URL('../verification/v25/machine-anime-settings.json',import.meta.url)));
const profile={displayName:'検証作者',activityEnabled:true,tagsEnabled:false,topics:['根拠のない宇宙ブランド'],biography:'日常で集めた音を短い映像と文章にしています。',bodyRead:{count:60,status:'complete'},sourceEvidence:Array.from({length:60},(_,index)=>({key:String(index),title:'記録'+index,url:'https://example.test/articles/'+index,excerpts:['本文の観察'+index+'：朝の街角の音を録り、帰宅後に短い映像として組み立てた。']}))};
const make=(values=settings.values,owner=profile)=>productionPlan(owner,values,settings.variant,'halloween',()=>.28);
const plan=make(),input=renderChatInput(plan),structured=JSON.parse(renderInput(plan).split('\n\n【全選択の個別レシピ】')[0]);
const medium=plan.conditions.find(c=>c.key==='medium');
assert.ok(input.indexOf(medium.execution.method)<input.indexOf('【作品モード】'),'The concrete drawing process must be read before collection/reference prose');
assert.match(medium.execution.method,/COMPLETELY REDRAW.*2D luminous-fantasy anime/);
assert.match(medium.execution.method,/fine tapered colored lines and thin painterly color layers/);
assert.match(medium.execution.method,/broad connected palette-dark shadow regions/);
assert.match(medium.execution.method,/Preserve the recognizable reference feature pattern, hairstyle, identifying colors and age impression/);
assert.match(medium.execution.method,/preserve selected or referenced chibi head-to-body proportions/);
assert.doesNotMatch(medium.execution.method,/preserve the reference feature spacing, eye proportions/,'Identity preservation must permit the selected rendering proportions');
assert.ok(!medium.execution.method.includes('all use closed opaque base-color shapes'),'Luminous fantasy rendering must retain thin painted layers, rather than force a uniform two-tone cel fill');
assert.match(structured.identity,/形の整理・誇張・省略/);
assert.match(structured.identity,/衣装の裁断・重なり.*今回の画風の線・色面・反射/);
assert.match(structured.required_before_details.story_integration,/機械仕掛けの怪物.*古い洋館の階段/);
assert.match(input,/歯車から駆動軸/);
assert.ok(!plan.copy.slots.some(slot=>slot.text==='STORIES IN LIGHT'));
assert.deepEqual([...plan.copy.slots,...plan.copy.generatedSlots].map(slot=>slot.role),['キャラクター名','役柄','短い説明']);
assert.equal(plan.copy.slots[0].text,profile.displayName);
assert.match(plan.copy.generatedSlots[0].instruction,/同じHalloweenの物語/);
const selectedTitle=make({...settings.values,type:'短いタイトル＋名前'}).copy.slots.find(slot=>slot.role==='作品タイトル').text;
assert.match(selectedTitle,/Halloween|ハロウィーン|ハロウィン/i);assert.ok(selectedTitle.includes(settings.values.theme));
assert.equal(plan.copy.contentSources.selectedStory,settings.values.theme);
assert.match(plan.copy.contentSources.event,/Halloween/);
assert.match(plan.copy.contentSources.purpose,/Halloween/);
assert.ok(!input.includes('本文の観察'),'Article corpora must stay out of ChatGPT integration material');
assert.ok(!input.includes(profile.biography),'Scene-world card copy must not import an unrelated author biography');
assert.ok(!input.includes(profile.topics[0]),'Disabled tags must not become editorial headings or image inputs');
assert.ok(!plan.copy.slots.some(slot=>slot.text===settings.values.line),'Automatic trading-card roles do not authorize dialogue');
const dialogue=make({...settings.values,type:'セリフのみ'});assert.deepEqual(dialogue.copy.slots.map(slot=>slot.text),[settings.values.line],'An explicitly permitted dialogue remains exact');

const interview=make({...settings.values,design:'インタビュー誌面'}),interviewInput=renderChatInput(interview);
assert.ok(interview.copy.generatedSlots.some(slot=>slot.role==='回答1'));
assert.ok(interview.copy.generatedSlots.some(slot=>slot.role==='リード文'));
for(const slot of interview.copy.generatedSlots)assert.match(slot.instruction,/同じHalloweenの物語/,'Edited interview copy lost the seasonal world');
assert.ok(!interview.copy.slots.some(slot=>/回答|リード文/.test(slot.role)),'Generic stock paragraphs must not be passed as the final author manuscript');
assert.match(interviewInput,/本人の発言の捏造をせず/);
assert.ok(!interviewInput.includes('本文の観察59'));
const exported=JSON.parse(renderInput(interview).split('\n\n【全選択の個別レシピ】')[0]);
assert.equal(exported.manuscript_requests.length,interview.copy.generatedSlots.length);
for(const condition of interview.conditions){assert.ok(interviewInput.includes(condition.execution.method));for(const section of condition.sections)assert.ok(interviewInput.includes(section.text));}

for(const type of ['文字を一切入れない','クリエイター名だけ','短いタイトル＋名前','セリフのみ']){
 const limited=make({...settings.values,design:'インタビュー誌面',type});
 assert.ok(!(limited.copy.generatedSlots||[]).length,'Source data cannot add manuscript roles under '+type);
 if(type==='文字を一切入れない')assert.equal(limited.copy.slots.length,0);
}
const disabled=make(settings.values,{...profile,activityEnabled:false});
assert.equal(disabled.authorContext,'');
assert.ok(!renderChatInput(disabled).includes('本文の観察'));
const landscape=make({...settings.values,costume:'風景を主役にする',type:'文字を一切入れない'});
assert.ok(!landscape.conditions.find(c=>c.key==='medium').execution.method.includes('reference face'));
assert.match(renderChatInput(landscape),/人物なし/);
console.log('PASS v25 fidelity: selected drawing process first; facial abstraction and clothing redraw permitted; machine-theme relationships; seasonal story heading and edited Halloween manuscript retain the selected subject; unrelated author biography omitted from world-only copy; dialogue and limited text preserved; disabled tags/activities and no-person medium routing. Native visual acceptance is separate.');
