import assert from 'node:assert/strict';
import {questions,resolveSelections} from '../catalog.js?v=28.4.5';
import {applyCollection} from '../collection.js?v=28.4.5';
import {sampleFor} from '../examples.js?v=28.4.5';
import {scenePreviews} from '../scene-preview-catalog.js?v=28.4.5';
import {optionRecipe} from '../option-recipes.js?v=28.4.5';
import {buildDirection} from '../direction.js?v=28.4.5';
import {productionPlan} from '../production-plan.js?v=28.4.5';
import {renderChatInput} from '../compiled-production.js?v=28.4.5';
import {halloweenSceneFocus,halloweenSceneTitles} from '../scene-presets.js?v=28.4.5';
import {halloweenStoryContext,halloweenModeContract} from '../halloween-mode-contract.js?v=28.4.5';
import {canonicalSelectionLabel,normalizeSelectionLabels} from '../legacy-selection-aliases.js?v=28.4.5';

const options=key=>questions.find(q=>q.key===key).groups.flatMap(g=>g.values);
const aliases=[['theme','雨上がりの怪談','雨上がりのホラー'],['mood','ひやりとする怪談','ひやりとするホラー']];
const input={sceneUnified:true,medium:'薄膜光彩アニメ',theme:aliases[0][1],place:'雨の路地',mood:aliases[1][1],costume:'ミイラ',pose:'ゆっくり歩く',angle:'魚眼の曲面遠近',palette:'翡翠 × 銅 × 濃紺',design:'通常の一枚絵',type:'文字を一切入れない',line:'セリフなし',size:'A4縦・300dpi目安｜2480×3508｜210:297',sourceKind:'photo-person'};
const before=structuredClone(input);
applyCollection('halloween');
for(const question of questions)for(const value of question.groups.flatMap(g=>g.values))assert.doesNotMatch(value,/怪談|百鬼夜行/,'A Japanese ghost-story label escaped into the public Halloween catalogue');
for(const [key,legacy,current] of aliases){
 assert.equal(canonicalSelectionLabel(key,legacy),current);
 assert.ok(options(key).includes(current));assert.ok(!options(key).includes(legacy));
 const oldSample=sampleFor(key,legacy),newSample=sampleFor(key,current);
 assert.equal(oldSample.kind,'image');assert.equal(newSample.kind,'image');assert.equal(oldSample.src,newSample.src,'Renaming must not detach the historical image asset');
 for(const value of [legacy,current])assert.ok(optionRecipe(key,value,{values:input,collection:'halloween'}).known,'The renamed or archived selection lost its actual production recipe');
}
assert.equal(scenePreviews[aliases[0][1]].file,scenePreviews[aliases[0][2]].file);
assert.equal(scenePreviews[aliases[0][2]].file,'assets/scenes-original-v28-4-3/after-rain-ghost-story.jpg','Stable asset identity must not move when the visible label changes');
const values=resolveSelections(input,()=>.2);
assert.equal(values.theme,aliases[0][2]);assert.equal(values.mood,aliases[1][2]);
for(const key of Object.keys(input).filter(key=>!['theme','mood','sourceKind'].includes(key)))assert.equal(values[key],input[key],key+' was changed by a label-only migration');
assert.deepEqual(input,before,'Saved/requested input values are not mutated');
const canonical=normalizeSelectionLabels(input);assert.deepEqual(canonical,{...input,theme:aliases[0][2],mood:aliases[1][2]});
assert.equal(normalizeSelectionLabels(canonical),canonical,'Already-current inputs preserve their identity');
assert.equal(canonicalSelectionLabel('line',aliases[0][1]),aliases[0][1],'User-authored copy must not be renamed');
assert.equal(canonicalSelectionLabel('theme','百鬼夜行'),'百鬼夜行','An archived Japanese world must not be silently turned into a different holiday');
assert.equal(canonicalSelectionLabel('theme','雨上がりの怪談を読む日'),'雨上がりの怪談を読む日','Unknown custom selections are exact user input');
const oldDirection=buildDirection([],input.mood,()=>.2,'halloween',input),newDirection=buildDirection([],canonical.mood,()=>.2,'halloween',canonical);
assert.deepEqual(oldDirection,newDirection,'The rename changed the selected facial performance');
const focus=halloweenSceneFocus(values.theme);assert.equal(halloweenSceneFocus(input.theme),focus);
assert.match(focus,/Halloween/);assert.match(focus,/仮装行列/);assert.match(focus,/菓子包み/);assert.match(focus,/帰路.*足跡/);assert.match(focus,/一致しない.*反射/);
for(const theme of halloweenSceneTitles)assert.match(halloweenSceneFocus(theme),/Halloween/);
const story=halloweenStoryContext({collection:'halloween',selectedStory:input.theme});
assert.equal(story.selectedStory,values.theme);assert.match(story.purpose,/謎と帰り道/);assert.match(story.event,/夜にだけ/);
assert.doesNotMatch(halloweenModeContract(input).method,/怪談/);
const plan=productionPlan({displayName:'検査作者',activityEnabled:false},input,oldDirection,'halloween',()=>.2);
assert.equal(plan.values.theme,values.theme);assert.equal(plan.values.mood,values.mood);
assert.equal(plan.values.sourceKind,input.sourceKind,'The production-boundary label migration must preserve source-kind metadata');
const prompt=renderChatInput(plan);assert.doesNotMatch(prompt,/雨上がりの怪談|ひやりとする怪談/);assert.match(prompt,/雨上がりのホラー/);assert.match(prompt,/仮装行列/);

// Ordinary Japanese fantasy remains a distinct explicit choice; it never
// becomes an ordinary automatic default or an implied Halloween event.
applyCollection('everyday');assert.ok(options('theme').includes('百鬼夜行'));
const ordinary=questions.find(q=>q.key==='theme').autoValues;assert.ok(!ordinary.includes('百鬼夜行'));
const everyday=halloweenModeContract({theme:'百鬼夜行',collection:'everyday'});
assert.equal(everyday.collection,'everyday');assert.match(everyday.method,/Halloweenを自動で付与せず/);
applyCollection('halloween');assert.ok(!options('theme').includes('百鬼夜行'));
console.log('PASS Halloween labels: all public options exclude ghost-story/Hyakki titles; renamed story and mood preserve exact assets and performance; source input, custom copy and ordinary Japanese fantasy remain intact; seasonal route and real production input carry the specific celebration aftermath.');
