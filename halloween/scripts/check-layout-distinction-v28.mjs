import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {questions,resolveSelections} from '../catalog.js?v=28.4.6';
import {applyCollection} from '../collection.js?v=28.4.6';
import {initialSelections} from '../modes.js?v=28.4.6';
import {designLayoutValues,designLayoutFor,typographyLayoutValues,typographyLayoutFor,typographyLayoutInstruction,manuscriptFrameBounds} from '../layout-preview-specs.js?v=28.4.6';
import {sampleFor} from '../examples.js?v=28.4.6';
import {detailedFormat} from '../format-recipes.js?v=28.4.6';
import {formatFor} from '../formats.js?v=28.4.6';
import {productionPlan} from '../production-plan.js?v=28.4.6';
import {selectionConflicts} from '../compatibility.js?v=28.4.6';
import {structuredCopyRules} from '../layout-copy-compatibility.js?v=28.4.6';
import {buildDirection} from '../direction.js?v=28.4.6';
import {renderCompactChatInput} from '../compact-production.js?v=28.4.6';
const report=JSON.parse(fs.readFileSync(new URL('../audit/layout-distinction-v28.json',import.meta.url)));
const atlas=(name)=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
const designSVG=atlas('layout-previews-v28.svg'),typeSVG=atlas('typography-previews-v28.svg');
assert.equal(report.design.length,48);assert.equal(report.typography.length,26);
for(const svg of [designSVG,typeSVG])assert.doesNotMatch(svg,/<image|data:image|<foreignObject|<filter|photograph|portrait|anime|人物|少女|少年/i,'Page and manuscript diagrams must have no external artwork or character/style references.');
const signatures=new Set(),geometry=new Set();
for(const row of report.design){
 assert.equal(row.asset,null);assert.equal(row.characterReference,false);assert.equal(row.styleReference,false);
 const s=designLayoutFor(row.value);assert.ok(s&&s.signature);signatures.add(s.signature);
 geometry.add(crypto.createHash('sha256').update(JSON.stringify({image:s.image,frames:s.frames,ornament:s.ornament})).digest('hex'));
 assert.ok(designSVG.includes(`id="${row.id}"`));assert.ok(designSVG.includes(`data-design="${row.value}"`));
 assert.equal(sampleFor('design',row.value).src,'./'+row.src);
 for(const frame of s.frames){assert.ok(frame.direction&&frame.role);assert.ok(frame.x>=5&&frame.y>=5&&frame.x+frame.w<=95&&frame.y+frame.h<=95,row.value+' frame outside 5% safety region');}
}
assert.equal(signatures.size,48,'Every format needs a concrete distinct identifying structure.');
assert.equal(geometry.size,48,'Renaming an identical page geometry does not create a distinct format.');
// A unique hash can still describe a visually near-identical page. These
// formerly confusing pairs need materially different image and copy regions,
// even when all ornamental lines are hidden.
const gothic=designLayoutFor('ゴシック雑誌の表紙'),interview=designLayoutFor('インタビュー誌面'),game=designLayoutFor('ゲームのパッケージ');
assert.deepEqual(gothic.image,[9,26,49,61]);assert.equal(gothic.ornament,'gothic-arch');
assert.ok(gothic.image[0]+gothic.image[2]<65&&gothic.frames.filter(f=>f.role!=='作者名').every(f=>f.x>=68),'Gothic must have a left image and one right information axis, not a decorated symmetrical cover.');
for(const value of ['ファッション雑誌の表紙','アールデコポスター','タロットカード'])assert.ok(designLayoutFor(value).image[0]+designLayoutFor(value).image[2]>70,'The former gothic lookalikes remain centered image designs.');
assert.deepEqual(interview.image,[5,22,90,34]);
const questionsBelow=interview.frames.filter(f=>f.role==='質問と回答');
assert.equal(questionsBelow.length,3);assert.deepEqual(questionsBelow.map(f=>[f.x,f.y,f.w,f.h]),[[5,64,28,26],[36,64,28,26],[67,64,28,26]]);
assert.ok(questionsBelow.every(f=>f.y>interview.image[1]+interview.image[3]),'Interview copy belongs below its full-width image.');
for(const value of ['カルチャー誌の表紙','スイス式グリッドポスター','広告ビジュアル'])assert.ok(designLayoutFor(value).image[2]<60&&designLayoutFor(value).image[3]>55,'The interview must differ from tall-left-image/right-copy layouts.');
assert.deepEqual(game.image,[5,21,90,45]);assert.equal(game.ornament,'game-panels');
assert.deepEqual(game.frames.filter(f=>f.y>=70).map(f=>[f.x,f.y,f.w,f.h]),[[5,72,58,19],[68,72,27,19]]);
assert.ok(designLayoutFor('絵本の表紙').image[3]>60&&designLayoutFor('絵本の表紙').frames.filter(f=>f.y>=70).every(f=>f.h<=4),'A game uses two deep information panels; a picture book retains its large picture and small byline.');
assert.match(designSVG,/data-role="gothic-arch"/);assert.match(designSVG,/data-role="split-information-panels"/);
const structuralRecipes=[['ゴシック雑誌の表紙',/x9〜58%/,/中央幅60%|左右各15%|左右の整列したカバーライン/],['インタビュー誌面',/y22〜56%/,/縦長図版は左|左の幅58%|35〜45%/],['ゲームのパッケージ',/y72〜91%/,/中央65%|上部18〜22%|下部8〜12%/]];
for(const [design,required,obsolete] of structuralRecipes){
 assert.match(formatFor(design).layout,required,design+' legacy format fallback loses the structure');
 assert.doesNotMatch(formatFor(design).layout,obsolete,design+' fallback reintroduces the old structure');
 for(const type of typographyLayoutValues){
  const recipe=detailedFormat(design,{values:{design,type}}),grid=recipe.sections.find(s=>s.label==='領域とグリッド').text;
  assert.match(grid,required,design+' selected copy removes the geometry: '+type);
  assert.doesNotMatch(recipe.sections.map(s=>s.text).join(' '),obsolete,design+' instructions conflict with the new geometry: '+type);
 }
}
assert.equal((designSVG.match(/data-role="single-main-image"/g)||[]).length,48,'Every design has exactly one main image plane.');
assert.equal((typeSVG.match(/data-role="single-main-image"/g)||[]).length,0,'Manuscript preview must not introduce an identity or art medium.');
const counts={'クリエイター名だけ':1,'HALLOWEENのみ':1,'HALLOWEEN＋クリエイター名':2,'短いタイトル＋名前':2,'手書きサイン風の名前':1,'墨の落款風の名前':1,'文字を一切入れない':0,'商品広告・キャッチと特徴3点':6,'イベント告知・見どころと案内':6,'詩のコピー・短い言葉を3行':4,'ミニマル広告・見出しと名前':2,'映画ポスター風・タイトルとクレジット':6,'広告チラシ風・情報をたっぷり':9,'雑誌風・見出しと特集をたっぷり':11,'新聞風・記事と段組み':11};
for(const [value,count] of Object.entries(counts))assert.equal(typographyLayoutFor(value).frames.length,count,value+' changed the visible manuscript count.');
assert.ok(typographyLayoutFor('縦書きコピー・一文を大きく').frames.every(f=>f.direction==='vertical'));
assert.ok(typographyLayoutFor('手書きサイン風の名前').frames.every(f=>f.direction==='diagonal'));
assert.ok(typographyLayoutFor('詩のコピー・短い言葉を3行').frames.every(f=>f.direction==='horizontal'));
for(const value of typographyLayoutValues)for(const frame of typographyLayoutFor(value).frames)assert.ok(frame.x>=5&&frame.y>=5&&frame.x+frame.w<=95&&frame.y+frame.h<=95,value+' manuscript outside 5% safety region');
// A rectangle that is safe before rotation may still clip after rotation.
for(const value of [...designLayoutValues,...typographyLayoutValues]){
 const spec=designLayoutFor(value)||typographyLayoutFor(value);
 for(const frame of spec.frames){
  const b=manuscriptFrameBounds(frame);
  assert.ok(b.left>=5-1e-8&&b.right<=95+1e-8&&b.top>=5-1e-8&&b.bottom<=95+1e-8,value+' rotated manuscript leaves the 5% safe area');
 }
}
const overlaps=(a,b)=>Math.min(a.x+a.w,b.x+b.w)>Math.max(a.x,b.x)&&Math.min(a.y+a.h,b.y+b.h)>Math.max(a.y,b.y);
for(const value of typographyLayoutValues){
 const frames=typographyLayoutFor(value).frames;
 for(let i=0;i<frames.length;i++)for(let j=i+1;j<frames.length;j++)assert.ok(!overlaps(frames[i],frames[j]),value+' merges distinct manuscript groups '+i+' and '+j);
}
const blankBlock=typeSVG.match(/<g transform="translate\(13000 0\)"[^>]*data-typography="文字を一切入れない"[^>]*>([\s\S]*?)<\/g>/)?.[1];
assert.ok(blankBlock,'The blank copy reference must exist.');
assert.doesNotMatch(blankBlock,/<text|data-frame|stroke-dasharray/,'Blank copy must not show a caption, pseudo text or blank form to imitate.');
const credits=typographyLayoutFor('映画ポスター風・タイトルとクレジット').frames.filter(f=>f.role.startsWith('制作情報'));
assert.equal(credits.length,3);assert.ok(credits.every((f,i)=>i===0||f.y>=credits[i-1].y+credits[i-1].h),'Three credit lines cannot be clamped onto the same baseline.');
let routes=0;
for(const collection of ['halloween','everyday']){
 applyCollection(collection);const values=resolveSelections({...initialSelections(),costume:'参照画像の衣装を生かす'},()=>.23);
 for(const value of questions.find(q=>q.key==='design').groups.flatMap(g=>g.values)){
  assert.ok(designLayoutValues.includes(value));const sample=sampleFor('design',value);assert.ok(sample.src.includes('layout-previews-v28.svg#'));assert.match(sample.label,/枠名は作品に印字しない/);
  for(const type of ['文字を一切入れない','HALLOWEENのみ','商品広告・キャッチと特徴3点']){
   const options={...values,design:value,type};const recipe=detailedFormat(value,{values:options});
   assert.ok(recipe.known,value+' recipe must be known');assert.ok(recipe.sections.some(s=>s.text.includes(designLayoutFor(value).signature)));
   if(value==='図鑑の扉')assert.doesNotMatch(recipe.sections.map(s=>s.text).join(' '),/細部図は2〜3|特徴だけを細部図へ/);
   routes++;
  }
 }
 for(const type of questions.find(q=>q.key==='type').groups.flatMap(g=>g.values)){
  assert.ok(typographyLayoutValues.includes(type));const sample=sampleFor('type',type);assert.equal(sample.kind,'image');assert.ok(sample.src.includes('typography-previews-v28.svg#'));
  assert.match(sample.label,/個数と方向だけ/);assert.match(sample.label,/枠名は作品に印字しない/);
  const selected={...values,design:'新聞の一面',type};const variant=buildDirection([],selected.mood,()=>.23,collection,selected);
  const plan=productionPlan({displayName:'創作の作り手',activityEnabled:false},selected,variant,collection,()=>.23);
  const text=renderCompactChatInput(plan);
  const conflicts=selectionConflicts(selected);if(conflicts.length){assert.match(text,/^【選択の不成立：画像生成を停止】/);for(const issue of conflicts)assert.ok(text.includes(issue.reason));assert.equal(plan.values.design,'新聞の一面',type+' rejected choices must remain explicit');const compatible={...selected,design:structuredCopyRules.find(rule=>rule.type===type)?.designs[0]||'広告ビジュアル'},compatiblePlan=productionPlan({displayName:'創作の作り手',activityEnabled:false},compatible,buildDirection([],compatible.mood,()=>.23,collection,compatible),collection,()=>.23),compatibleText=renderCompactChatInput(compatiblePlan);assert.deepEqual(compatiblePlan.issues.filter(issue=>issue.severity==='error'),[],'Rejected newspaper copy must remain available in a compatible advertising format');const layout=typographyLayoutFor(type);assert.ok(compatibleText.includes('書字方向：'+layout.direction));assert.ok(compatibleText.includes('許可原稿量：'+layout.quantity));routes++;continue;}
  if(plan.copy.mode!=='none'&&type!=='デザインに合わせて自動編集'){const layout=typographyLayoutFor(type);assert.ok(text.includes('書字方向：'+layout.direction),type+' lost its writing direction on the production path.');assert.ok(text.includes('許可原稿量：'+layout.quantity),type+' lost its exact manuscript amount on the production path.');}
  assert.equal(plan.values.design,'新聞の一面',type+' must not replace the selected design');
  routes++;
 }
}
applyCollection('halloween');
console.log(`PASS ${geometry.size} unique personless design structures, ${report.typography.length} manuscript layouts, exact limited-copy counts and ${routes} selection routes. No generated artwork acceptance is asserted.`);
