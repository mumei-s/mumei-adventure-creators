import assert from 'node:assert/strict';
import {applyCollection} from '../collection.js?v=28.4.5';
import {resolveSelections,AUTO} from '../catalog.js?v=28.4.5';
import {initialSelections} from '../modes.js?v=28.4.5';
import {selectionConflicts,candidateAvailability} from '../compatibility.js?v=28.4.5';
import {designLayoutValues} from '../layout-preview-specs.js?v=28.4.5';
import {buildEditorial} from '../editorial.js?v=28.4.5';
import {detailedFormat} from '../format-recipes.js?v=28.4.5';
let cases=0;
for(const collection of ['halloween','everyday']){
 applyCollection(collection);
 const base={...initialSelections(),collection,costume:'参照画像の衣装を生かす',medium:'現代アニメの一枚絵',pose:'まっすぐ立つ',mood:'正面・首をまっすぐ',angle:'目線の高さ・正面',type:'文字を一切入れない'};
 const profile={displayName:'原稿検証の作者',activityEnabled:false};
 const fixed=resolveSelections({...base,design:'タイポグラフィーポスター'},()=>.23);
 assert.equal(fixed.type,'文字を一切入れない','An explicit no-copy choice must not be silently changed to resolve a word-led format.');
 assert.equal(fixed.design,'タイポグラフィーポスター','Two explicit incompatible choices remain visible for user correction.');
 assert.ok(selectionConflicts(fixed).some(c=>c.code==='typography-design-needs-copy'));
 assert.equal(candidateAvailability('design','タイポグラフィーポスター',base).enabled,false);
 const automatic=resolveSelections({...base,design:AUTO},()=>.23);
 assert.equal(automatic.type,'文字を一切入れない');
 assert.notEqual(automatic.design,'タイポグラフィーポスター','Only AUTO may change to a compatible design.');
 for(const design of designLayoutValues){
  const selected={...base,design};
  const issues=selectionConflicts(selected).filter(c=>c.keys.includes('type')&&c.keys.includes('design'));
  assert.equal(issues.length,design==='タイポグラフィーポスター'?1:0,design+' has incorrect no-copy availability.');
  cases++;
 }
 for(const style of ['新聞の一面','見開き特集','インタビュー誌面']){
  const values={...base,design:style,type:'雑誌風・見出しと特集をたっぷり'};
  const copy=buildEditorial(profile,values,()=>.23),all=[...copy.slots,...copy.generatedSlots];
  assert.equal(all.length,11,style+' must retain the eleven selected magazine roles.');
  assert.ok(!all.some(s=>/リード文|本文\d/.test(s.role)),style+' appends standard editorial text over the selected manuscript.');
  assert.ok(selectionConflicts(values).some(issue=>issue.code==='layout-copy-structure-conflict'),'Preserving eleven manuscript roles must not silently allow incompatible cover-line placement in an inner page.');
 }
 const advert=detailedFormat('新聞の一面',{values:{...base,design:'新聞の一面',type:'商品広告・キャッチと特徴3点'}});
 const reading=advert.sections.find(s=>s.label==='文字と読み順').text;
 assert.match(reading,/同じ階層の横書き列/);
 assert.doesNotMatch(reading,/特徴.*同じ階層の縦列/,'Newspaper article direction cannot override an explicit horizontal advertisement.');
}
applyCollection('halloween');
console.log(`PASS ${cases} design/no-copy combinations: word-led/no-copy conflicts remain explicit, AUTO preserves no copy, and raw recipes retain manuscript roles/directions without allowing incompatible magazine cover-line selection in inner pages.`);
