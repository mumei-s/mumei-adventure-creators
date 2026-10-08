import fs from 'node:fs';
import assert from 'node:assert/strict';
import {questions,visibleQuestions,defaults,resolveSelections} from '../catalog.js?v=28.3.1';
import {poseItems,applyPose} from '../poses.js?v=28.3.1';
import {initialSelections,effectiveSelections} from '../modes.js?v=28.3.1';
import {buildDirection} from '../direction.js?v=28.3.1';
import {composePrompt} from '../prompt.js?v=28.3.1';
import {selectedRecipes} from '../recipes.js?v=28.3.1';
assert.equal(visibleQuestions.length,10);assert.equal(questions.length,12);assert.equal(defaults.length,12);assert.ok(!visibleQuestions.some(q=>q.key==='line'));assert.ok(visibleQuestions.some(q=>q.key==='pose'));assert.equal(poseItems.length,72);
const values=resolveSelections({...initialSelections(),pose:'全力で走る',mood:'完全な左横顔90度',line:'今日の光を、忘れない。'});assert.equal(effectiveSelections('detail',values).line,values.line);assert.equal(effectiveSelections('simple',values).line,values.line);
for(const pose of poseItems){assert.ok(fs.existsSync(new URL('../'+pose.file,import.meta.url)));const v=applyPose(buildDirection([],values.mood),pose.value);assert.match(v.face,/左横顔90度/);assert.ok(v.pose.includes(pose.text));assert.match(v.distance,/全身|胸から上/);}
const variant=applyPose(buildDirection([],values.mood),values.pose),cells=selectedRecipes(values).map((r,i)=>({...r,cell:i+1}));assert.equal(cells.length,8);assert.equal(cells[7].key,'pose');assert.equal(cells[7].file,'pose-028.jpg');
const prompt=composePrompt({creator:'alice',profile:{displayName:'Alice',topics:[]},values:{...values,sceneUnified:true},variant,references:[],edition:'POSE',styleGuide:{name:'reference-board.jpg',combined:true,cells}});assert.ok(!prompt.includes('作例8 /'));assert.ok(!prompt.includes('reference-board.jpg'));assert.match(prompt,/項目名から制作/);assert.match(prompt,/選んだポーズ：全力で走る/);assert.match(prompt,/完全な左横顔90度/);assert.match(prompt,/セリフ：今日の光を、忘れない。/);const titles=prompt.match(/^\d+\. .+：.+$/gm)||[];assert.equal(titles.length,10);for(const q of visibleQuestions)assert.ok(titles.some(t=>t.includes(values[q.key])));
const custom=applyPose(buildDirection([]),'片手で傘を持って階段を登る');assert.match(custom.pose,/片手で傘を持って階段を登る/);assert.match(custom.pose,/自由指定/);
console.log('PASS pose contracts: 10 visible items, retained phrases/density, 72 dedicated pose previews, independent left profile and body poses, title-based 10-item instructions, custom pose.');
