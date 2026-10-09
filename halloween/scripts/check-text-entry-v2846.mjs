import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {questions,resolveSelections} from '../catalog.js?v=28.4.6';
import {initialSelections,effectiveSelections,questionsForMode} from '../modes.js?v=28.4.6';
import {applyCollection} from '../collection.js?v=28.4.6';
import {candidateAvailability} from '../compatibility.js?v=28.4.6';
import {productionPlan} from '../production-plan.js?v=28.4.6';
import {buildDirection} from '../direction.js?v=28.4.6';
import {compileProduction} from '../compiled-production.js?v=28.4.6';
import {stylePresetFor} from '../style-presets.js?v=28.4.6';
import {selectionReferenceManifest,individualSelectionReferenceManifest} from '../selection-references.js?v=28.4.6';
import {worldTransferPrompts} from '../world-transfer-production.js?v=28.4.6';
import {randomItemSelection} from '../random-selections.js?v=28.4.6';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const take=(start,end)=>app.slice(app.indexOf(start),app.indexOf(end,app.indexOf(start)));
const actual=take('function openPicker(q,options={}){','function summarizeName(');
class Node{
 constructor(tag='div',text=''){this.tag=tag;this.textContent=text;this.children=[];this.dataset={};this.listeners={};this.attributes={};}
 append(...items){this.children.push(...items);}
 setAttribute(key,value){this.attributes[key]=value;}
 addEventListener(event,fn){this.listeners[event]=fn;}
 querySelector(tag){return this.children.find(node=>node.tag===tag);}
 focus(){this.focused=true;}
 close(){this.closed=true;}
}
let cases=0,blockedEntries=0;
for(const collection of ['halloween','everyday'])for(const mode of ['detail','simple','auto']){
 applyCollection(collection);
 const nodes=new Map(),$=id=>{if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id);},tabs=['type','line'].map(part=>{const n=new Node('button');n.dataset.textPart=part;return n;}),selection={...initialSelections(),design:'新聞の一面',type:'新聞風・記事と段組み'},before={...selection};
 const context=vm.createContext({$,questions,questionsForMode,mode,modeSnapshots:{},selections:selection,selectedProposal:mode==='auto'?{...selection}:null,textPart:'type',activeQuestion:null,candidateAvailability,effectiveSelections,el:(tag,cls,text)=>new Node(tag,text),renderChoices:key=>{context.renderedKey=key;},tell:message=>{context.message=message;},picker:{open:q=>{context.openedKey=q.key;}},document:{querySelectorAll:()=>tabs,querySelector:()=>null}});
 vm.runInContext(actual,context);
 context.openPicker(questions.find(q=>q.key==='type'));assert.equal($('text-subtabs').hidden,false);assert.equal($('text-entry-note').hidden,true);assert.equal(context.openedKey,'type');
 context.openPicker(questions.find(q=>q.key==='line'));assert.equal($('text-subtabs').hidden,false);assert.equal($('text-entry-note').hidden,false);assert.equal(context.openedKey,'line');assert.equal(tabs[1].attributes['aria-pressed'],'true');
 context.buildCustom(questions.find(q=>q.key==='line'));const form=$('custom-area').children[0],input=form.querySelector('input');assert.equal(input.maxLength,160);assert.equal(input.focused,true);input.value='また、この場所で。';form.listeners.submit({preventDefault(){}});
 assert.equal(context.selections.line,input.value);assert.equal(context.selections.type,'セリフのみ');assert.equal(context.renderedKey,'type');assert.equal($('picker').closed,true);
 for(const key of Object.keys(before).filter(key=>!['type','line'].includes(key)))assert.equal(context.selections[key],before[key],'Text entry must not replace another selection');
 if(mode==='auto'){assert.equal(context.selectedProposal.line,input.value);assert.equal(context.selectedProposal.type,'セリフのみ','AUTO proposal must retain the same explicit words');}
 context.openPicker(questions.find(q=>q.key==='type'));assert.equal(context.openedKey,'type','The main text choice returns to typography, not a remembered hidden dialogue tab');
 context.openPicker(questions.find(q=>q.key==='angle'));assert.equal($('text-subtabs').hidden,true);assert.equal($('text-entry-note').hidden,true);
 for(const medium of ['薄膜光彩アニメ','立体光彩アニメ','立体光彩リアル'])for(const route of ['sheet','individual']){
  const values=resolveSelections({...initialSelections(),...context.selections,sceneUnified:true,sourceKind:'illustration-person',medium,costume:collection==='halloween'?'ミイラ':'旅装',theme:collection==='halloween'?'都会の仮装パレード':'街角アニメ日和',pose:'ゆっくり歩く',mood:'目を閉じて安らぐ',angle:'目線の高さ・正面',palette:'翡翠 × 銅 × 濃紺'},()=>.2),profile={displayName:'原稿試験',activityEnabled:false},plan=productionPlan(profile,values,buildDirection([],values.mood,()=>.2,collection,values),collection,()=>.2),manifest=selectionReferenceManifest(values);
  assert.equal(plan.issues.filter(issue=>issue.severity==='error').length,0);assert.equal(plan.copy.slots.length,1);assert.equal(plan.copy.slots[0].role,'セリフ');assert.equal(plan.copy.slots[0].text,input.value,'A saved or manually entered line reaches the actual allowed manuscript');
  plan.referenceManifest=[stylePresetFor(medium),{role:'identity',name:'source.png'},...(route==='sheet'?[{role:'selection-sheet',name:manifest.name,items:manifest.items}]:individualSelectionReferenceManifest(manifest))];
  const prompt=compileProduction(plan);assert.ok(prompt.includes(input.value));assert.doesNotMatch(prompt,/undefined|NaN/);
  const stages=worldTransferPrompts(plan);if(stages){const final=stages.stages.at(-1);assert.equal(final.kind,'layout');assert.ok(final.prompt.includes(input.value),'Exact words are included in the final image-generation stage');assert.ok(!stages.stages.filter(stage=>stage.kind==='scene-edit').some(stage=>stage.prompt.includes('セリフ：')),'Scene stages do not preprint a competing copy block');}
  cases++;
 }
 // The dialogue control changes its copy mode as well as its words. All
 // ingress paths must evaluate that same resulting manuscript before writing.
 const poster={...context.selections,design:'タイポグラフィーポスター',type:'クリエイター名だけ',line:'選択前の一言'};context.selections={...poster};context.selectedProposal=mode==='auto'?{...poster}:null;context.activeQuestion=questions.find(q=>q.key==='line');
 Object.assign(context,{collection,sampleNode(){},artworkBasis(){},favoritePanel:null,createPicker:options=>{context.pickerOptions=options;return context.picker;},createFavoritesPanel:options=>{context.favoriteOptions=options;return {render(){}};},setMode:next=>{context.mode=next;},displayValue:(q,value)=>value,randomItemSelection,rng:()=>.9});
 vm.runInContext(take('const picker=createPicker(','function renderStylePreset('),context);
 const unchanged=()=>{assert.deepEqual({...context.selections},poster);if(mode==='auto')assert.deepEqual({...context.selectedProposal},poster);};
 const displayed=context.pickerOptions.readSelection();assert.equal(displayed.type,'セリフのみ');assert.equal(candidateAvailability('line','セリフなし',displayed).enabled,false,'The visible line option is disabled against its actual one-line copy mode');unchanged();blockedEntries++;
 context.choose('セリフなし');unchanged();assert.match(context.message,/タイポグラフィーポスター/);blockedEntries++;
 context.favoriteOptions.onPick('line','セリフなし');unchanged();assert.match(context.message,/タイポグラフィーポスター/);blockedEntries++;
 vm.runInContext(take('function randomizeItem(q){','function renderChoices('),context);const onlyBlank={...questions.find(q=>q.key==='line'),groups:[{label:'なし',values:['セリフなし']}]};assert.equal(context.randomizeItem(onlyBlank),undefined);unchanged();assert.match(context.message,/タイポグラフィーポスター/);blockedEntries++;
}
applyCollection('halloween');
console.log(`PASS text entry: real app tab/choose/custom-form handlers in Halloween/everyday × detail/simple/AUTO; ${cases} actual manuscript/handoff routes preserve exact words and one role; ${blockedEntries} visible-option/choose/favorite/random guards reject a blank typography poster without selection or proposal writes.`);
