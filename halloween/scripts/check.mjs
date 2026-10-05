import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {questions,defaults} from '../catalog.js';
import {sampleFor} from '../examples.js';
import {modeKeys,effectiveSelections} from '../modes.js';
import {composePrompt} from '../prompt.js';
import {selectedRecipes} from '../recipes.js';
import {buildDirection} from '../direction.js';
const keys=questions.map(q=>q.key),values=Object.fromEntries(questions.map((q,i)=>[q.key,defaults[i]]));
assert.equal(keys.length,10);assert.equal(modeKeys.detail.length,10);assert.equal(modeKeys.simple.length,5);assert.equal(modeKeys.auto.length,1);
let count=0,images=new Set();for(const q of questions)for(const v of q.groups.flatMap(g=>g.values)){count++;const s=sampleFor(q.key,v);assert.notEqual(s.kind,'custom',q.key+':'+v);if(s.kind==='image'){assert.ok(fs.existsSync(new URL(s.src,new URL('../examples.js',import.meta.url))));images.add(s.src);}}
assert.equal(count,416);assert.equal(images.size,366);
const explicit={...values,medium:'水墨画',design:'ファッション雑誌の表紙',mood:'完全な左横顔90度',palette:'墨一色'};
assert.equal(effectiveSelections('simple',explicit).mood,'毎回大胆に変える');assert.equal(effectiveSelections('simple',explicit).medium,'水墨画');
const cells=selectedRecipes(explicit).map((r,i)=>({...r,cell:i+1})),variant=buildDirection([],explicit.mood),prompt=composePrompt({creator:'alice',profile:{displayName:'Alice',biography:'写真と創作',topics:['写真','創作']},values:explicit,variant,references:[{name:'reference-01-face.png',role:'identity'}],edition:'CHECK',styleGuide:{name:'selected-style-guide.jpg',cells}});
assert.match(prompt,/selected-style-guide.jpg/);assert.match(prompt,/墨のにじみ/);assert.match(prompt,/顔の参照ではない/);assert.match(prompt,/作例画像を確認できなければ/);assert.ok(!prompt.includes('sabosan0404'));assert.ok(!prompt.includes('無名S note'));
assert.match(variant.face,/横顔/);
for(const file of fs.readdirSync(new URL('../',import.meta.url))){if(!/\.(js|html|css)$/.test(file))continue;const source=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');assert.ok(!source.includes('sabosan0404'),file);for(const m of source.matchAll(/(?:from\s+|src=|href=)["'](\.\/[^"']+)["']/g)){const local=m[1].split('?')[0];assert.ok(fs.existsSync(new URL(local,new URL('../'+file,import.meta.url))),file+' -> '+local);}}
console.log('416 options / 366 artwork samples, three modes, style-guide contract and privacy scan passed.');
