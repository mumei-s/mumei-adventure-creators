import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {questions,visibleQuestions,defaults,resolveSelections} from '../catalog.js?v=27.0.0';
import {sampleFor} from '../examples.js?v=27.0.0';
import {modeKeys,effectiveSelections} from '../modes.js?v=27.0.0';
import {composePrompt} from '../prompt.js?v=27.0.0';
import {selectedRecipes} from '../recipes.js?v=27.0.0';
import {buildDirection} from '../direction.js?v=27.0.0';
const keys=questions.map(q=>q.key),values=resolveSelections(Object.fromEntries(questions.map((q,i)=>[q.key,defaults[i]])),()=>0);
assert.equal(visibleQuestions.length,10);assert.equal(modeKeys.detail.length,10);assert.equal(modeKeys.simple.length,5);assert.equal(modeKeys.auto.length,1);
let count=0,images=new Set();for(const q of questions)for(const v of q.groups.flatMap(g=>g.values)){count++;const s=sampleFor(q.key,v);assert.notEqual(s.kind,'custom',q.key+':'+v);if(s.kind==='image'){assert.ok(fs.existsSync(new URL(s.src,new URL('../examples.js',import.meta.url))));images.add(s.src);}}
assert.equal(count,502);assert.equal(images.size,453);
const explicit={...values,medium:'水墨画',design:'ファッション雑誌の表紙',mood:'完全な左横顔90度',palette:'墨一色'};
assert.equal(effectiveSelections('simple',explicit).mood,'毎回大胆に変える');assert.equal(effectiveSelections('simple',explicit).medium,'水墨画');
const cells=selectedRecipes(explicit).map((r,i)=>({...r,cell:i+1})),variant=buildDirection([],explicit.mood),prompt=composePrompt({creator:'alice',profile:{displayName:'Alice',biography:'写真と創作',topics:['写真','創作']},values:explicit,variant,references:[{name:'reference-01-face.png',role:'identity'}],edition:'CHECK',styleGuide:{name:'selected-style-guide.jpg',cells}});
assert.ok(!prompt.includes('selected-style-guide.jpg'));assert.ok(!prompt.includes('作例1 /'));assert.match(prompt,/各項目のタイトル/);assert.match(prompt,/にじみ|にじませ/);assert.match(prompt,/筆圧|運筆/);assert.match(prompt,/顔の参照ではない/);assert.ok(!prompt.includes('作例画像を確認できなければ'));assert.match(prompt,/完成した画像そのものを1枚/);assert.match(prompt,/性別の表現/);assert.ok(!prompt.includes('sabosan0404'));assert.ok(!prompt.includes('無名S note'));
assert.match(variant.face,/横顔/);
for(const file of fs.readdirSync(new URL('../',import.meta.url))){if(!/\.(js|html|css)$/.test(file))continue;const source=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');assert.ok(!source.includes('sabosan0404'),file);for(const m of source.matchAll(/(?:from\s+|src=|href=)["'](\.\/[^"']+)["']/g)){const local=m[1].split('?')[0];assert.ok(fs.existsSync(new URL(local,new URL('../'+file,import.meta.url))),file+' -> '+local);}}
assert.equal(questions.find(q=>q.key==='palette').groups.flatMap(g=>g.values).length,50);
const luminous={...explicit,theme:'幽霊たちのお茶会',place:'星空の砂漠',medium:'発光幻想アニメ',palette:'群青 × 菫 × 星白'};
const luminousPrompt=composePrompt({creator:'alice',profile:{displayName:'Alice',biography:'創作',topics:[]},values:luminous,variant,references:[],edition:'LIGHT',styleGuide:{name:'selected-style-guide.jpg',cells:selectedRecipes(luminous).map((r,i)=>({...r,cell:i+1}))}});
assert.match(luminousPrompt,/2Dアニメの線と面/);assert.match(luminousPrompt,/深いセル影/);assert.match(luminousPrompt,/60:30:10/);
assert.match(luminousPrompt,/完成場面：「星空の砂漠」で「幽霊たちのお茶会」/);
assert.match(luminousPrompt,/舞台の識別構造を残したまま場面全体で意味が読める/);
assert.ok(!luminousPrompt.includes('テーマ側の別の場所名は、必要な道具・展示・演目などへ翻案'));
console.log('502 options / 453 artwork samples, 50 palettes, three modes, scene roles, luminous technique and title-based rendering contract passed.');
