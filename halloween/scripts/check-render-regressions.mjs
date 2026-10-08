import assert from 'node:assert/strict';
import fs from 'node:fs';
import {productionPlan} from '../production-plan.js?v=28.2.0';
import {renderInput} from '../compiled-production.js?v=28.2.0';
import {detailedPalette} from '../palette-recipes.js?v=28.2.0';
import {imageOutputContract} from '../output-contract.js?v=28.2.0';

// Reproduce the user's failed cover, including its actual resolved camera.
const old=JSON.parse(fs.readFileSync(new URL('../verification/v17/failed-user-input.json',import.meta.url)));
const values={design:old.layout.selected,medium:old.drawing.selected,
 ...Object.fromEntries(Object.entries(old.scene).map(([key,c])=>[key,c.selected])),
 type:old.typography.selected,line:old.typography.line.selected,size:old.canvas.selected};
const variant={face:old.camera.face,expression:old.camera.expression,
 pose:old.camera.body,distance:old.camera.distance,camera:old.camera.angle};
const plan=productionPlan({displayName:'無名 S note',activityEnabled:false},values,variant,'halloween',()=>.28);
plan.copy.slots=old.copy;
const input=renderInput(plan),json=JSON.parse(input.split('\n\n【全選択の個別レシピ】')[0]);
assert.equal(json.canvas.width_px,2480);
assert.equal(json.canvas.height_px,3508);
assert.equal(json.canvas.aspect_ratio,'210:297');
assert.equal(json.camera.torso_yaw_degrees,90);
assert.match(json.required_before_details.body_projection,/真横90度/);
assert.match(json.required_before_details.palette,/黒・白・朱だけ/);
assert.match(json.required_before_details.optical_geometry,/背後の輪郭がずれ/);
assert.match(json.identity,/肌色・髪色・瞳色も許可色へ/);
assert.equal(plan.conditions.length,10);
for(const c of plan.conditions)for(const s of c.sections)assert.ok(input.includes(s.text));
for(const [palette,colors] of [['黒と白と朱の三色',['黒 45%','白 45%','朱 10%']],['金と黒の二色',['金 30%','黒 70%']]]){
 const native=detailedPalette(palette,{values:{medium:'クリスタル透光アニメ',palette}});
 assert.ok(!native.executionMethod.includes('有彩色は使用せず'));
 assert.match(native.executionMethod,/色相を保ち/);
 for(const color of colors)assert.ok(native.checks.join(' ').includes(color));
 const mono=detailedPalette(palette,{values:{medium:'水墨画',palette}});
 assert.match(mono.executionMethod,/色相をそのまま使わず/);
 assert.match(mono.executionMethod,/黒・白・無彩色の灰/);
}
assert.ok(!imageOutputContract.join('\n').includes('今回の画像生成は1回だけ'));
assert.match(imageOutputContract.join('\n'),/選択した全10項目/);
assert.match(imageOutputContract.join('\n'),/通常の画像生成/);
assert.doesNotMatch(imageOutputContract.join('\n'),/60秒以内|合格基準/);
const localized=plan.conditions.flatMap(c=>c.sections.filter(s=>s.label==='日本を基準にした個別条件')).reduce((n,s)=>n+s.text.length,0);
const artworkCriteria=plan.conditions.flatMap(c=>c.sections.filter(s=>s.label.startsWith('作画基準／'))).reduce((n,s)=>n+s.text.length,0);
assert.ok(input.length<JSON.stringify(old,null,2).length+localized*2+artworkCriteria*4+1600,'Local drawing and source criteria have a bounded audit budget; unrelated documents must stay out of the input');
if(process.argv.includes('--save'))fs.writeFileSync(new URL('../verification/v17/retest-drawing-input.txt',import.meta.url),input);
console.log('PASS failed-cover regressions: structured audit material owns side projection, full frame, restricted identity colors, broad crystal optics, explicit requested dimensions and all ten recipes; allowed vermilion/gold are retained; failed output is not frozen as final. Image acceptance is still separate.');
