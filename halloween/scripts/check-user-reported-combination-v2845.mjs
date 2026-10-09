import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {questions,AUTO,resolveSelections} from '../catalog.js?v=28.4.6';
import {initialSelections,effectiveSelections,questionsForMode,proposalBatch} from '../modes.js?v=28.4.6';
import {candidateAvailability,selectionConflicts} from '../compatibility.js?v=28.4.6';
import {randomItemSelection} from '../random-selections.js?v=28.4.6';
import {productionPlan} from '../production-plan.js?v=28.4.6';
import {composePrompt} from '../prompt.js?v=28.4.6';
import {optionalIdentityPrompts} from '../production-workflow.js?v=28.4.6';
import {structuredCopyRules} from '../layout-copy-compatibility.js?v=28.4.6';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8'),random=()=>.27;
const profile={displayName:'検査作者',activityEnabled:false};
const base={...initialSelections(),sceneUnified:true,medium:'薄膜光彩アニメ',theme:'雨上がりのホラー',place:'雨の路地',costume:'ミイラ',pose:'ゆっくり歩く',mood:'ひやりとするホラー',angle:'魚眼の曲面遠近',palette:'翡翠 × 銅 × 濃紺',design:'新聞の一面',type:'広告チラシ風・情報をたっぷり',line:'セリフなし',size:'A4縦・300dpi目安｜2480×3508｜210:297',sourceKind:'photo-person'};
const code='layout-copy-structure-conflict';
assert.ok(selectionConflicts(base).some(issue=>issue.code===code),'The exact reported newspaper and three-column advertising manuscript must be blocked');
assert.equal(candidateAvailability('type',base.type,{...base,type:AUTO}).enabled,false);
assert.equal(candidateAvailability('design',base.design,{...base,design:AUTO}).enabled,false,'Both selection orders must reject the same structural mismatch');
const fixed=resolveSelections(base,random);assert.equal(fixed.design,base.design);assert.equal(fixed.type,base.type,'Explicit choices must never be silently repaired');
const plan=productionPlan(profile,fixed,{},'halloween',random),text=composePrompt({profile,values:fixed,variant:plan.variant,preparedPlan:plan,references:[],edition:'REPORTED-COMBINATION'});
assert.match(text,/^【選択の不成立：画像生成を停止】/);assert.match(text,/新聞の一面.*広告チラシ/);assert.doesNotMatch(text,/人物翻訳用入力|完成画像を1回で生成|画像作成機能.*表示/);assert.equal(optionalIdentityPrompts(plan),null,'Optional preparation cannot bypass the same invalid combination');
const batch=proposalBatch(base,random);assert.equal(batch.proposals.length,0);assert.ok(batch.issues.some(issue=>issue.code===code));
for(const [key,other] of [['design','type'],['type','design']]){
 const input={...base,[key]:AUTO},resolved=resolveSelections(input,random);assert.equal(resolved[other],base[other]);assert.deepEqual(selectionConflicts(resolved),[],'AUTO must repair its own field without discarding the pinned manuscript or layout');
}
let pairs=0;
for(const rule of structuredCopyRules)for(const design of rule.designs){assert.equal(candidateAvailability('type',rule.type,{...base,design,type:AUTO}).enabled,true,'Allowed structural pair: '+design+' / '+rule.type);pairs++;}
const question=questions.find(q=>q.key==='type');
for(let seed=0;seed<100;seed++){const draw=randomItemSelection(question,{...base,type:AUTO},()=>seed/100);assert.ok(draw.value);assert.equal(candidateAvailability('type',draw.value,{...base,type:AUTO}).enabled,true);assert.notEqual(draw.value,base.type,'Per-item random cannot reintroduce the reported forbidden manuscript');}

// Execute actual application pick and favorite callbacks with presentation
// mocked only. These controls cannot mutate either a draft or an AUTO proposal
// after the shared compatibility decision has rejected the candidate.
const chooseStart=app.indexOf('function choose('),chooseEnd=app.indexOf('\nfunction summarizeName(',chooseStart);assert.ok(chooseStart>=0&&chooseEnd>chooseStart);
function contextFor(mode='detail'){
 const messages=[],rendered=[],nodes=new Map();const $=id=>{if(!nodes.has(id))nodes.set(id,{close(){this.closed=true;},closed:false});return nodes.get(id);};
 const context=vm.createContext({mode,selections:{...base,type:'文字を一切入れない'},selectedProposal:mode==='auto'?{...base,type:'文字を一切入れない'}:null,activeQuestion:question,questions,questionsForMode,effectiveSelections,candidateAvailability,renderChoices:key=>rendered.push(key),tell:message=>messages.push(message),$: $,document:{querySelector:()=>({focus(){}})},displayValue:(q,v)=>v,setMode(){throw new Error('A rejected favorite must not change modes');},createFavoritesPanel:options=>options,picker:{},el(){},sampleNode(){},collection:'halloween'});
 vm.runInContext(app.slice(chooseStart,chooseEnd),context);return {context,messages,rendered,nodes};
}
for(const mode of ['detail','auto']){
 const check=contextFor(mode),before=JSON.stringify(check.context.selections),proposal=JSON.stringify(check.context.selectedProposal);check.context.choose(base.type);assert.equal(JSON.stringify(check.context.selections),before);assert.equal(JSON.stringify(check.context.selectedProposal),proposal);assert.equal(check.rendered.length,0);assert.match(check.messages.at(-1),/新聞の一面/);assert.ok(!check.nodes.get('picker')?.closed);
 const favoriteLine=app.split('\n').find(line=>line.startsWith('favoritePanel=createFavoritesPanel('));assert.ok(favoriteLine,'Execute the application favorite callback, not a copied implementation');vm.runInContext(favoriteLine,check.context);check.context.favoritePanel.onPick('type',base.type);assert.equal(JSON.stringify(check.context.selections),before);assert.equal(JSON.stringify(check.context.selectedProposal),proposal);assert.equal(check.rendered.length,0);assert.match(check.messages.at(-1),/新聞の一面/);
}
console.log('PASS exact reported newspaper/ad mismatch: both picker orders, preserved explicit selections, one-call and optional preparation stop, proposal and 100 per-item random draws, '+pairs+' allowed structural pairs, actual draft/AUTO pick and favorite callbacks. Generated image quality is separate.');
