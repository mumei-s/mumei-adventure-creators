import {sourceKinds,sourceSubjectFor} from '../source-kind.js?v=28.4.5';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {questions,visibleQuestions,defaults,AUTO,resolveSelections} from '../catalog.js?v=28.4.5';
import {modeKeys,modeCopy,questionsForMode,initialSelections,effectiveSelections,propose} from '../modes.js?v=28.4.5';
import {applyCollection} from '../collection.js?v=28.4.5';

const detail=['medium','theme','costume','pose','mood','angle','palette','design','type','size'];
const simple=['medium','theme','design','type','size'];
const internal=['medium','theme','place','costume','pose','mood','angle','palette','design','type','line','size'];
const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
function actualFunction(name,next){const start=source.indexOf('function '+name+'('),end=source.indexOf(next,start);assert.ok(start>=0&&end>start);return source.slice(start,end);}
const appCode=actualFunction('renderChoices','\nconst paletteColors=')+'\n'+actualFunction('openPicker','\nfunction buildCustom(')+'\n'+actualFunction('setMode','\nfunction makeProposals(');

// Run the real renderer/mode switch/picker entry point. In particular, a cached
// detail card must not keep its old number when reused by the simple mode.
function node(tag='div',cls='',text=''){
 const n={tag,className:cls||'',textContent:text,children:[],replacements:0,dataset:{},attributes:{},listeners:{},hidden:false,append(...children){this.children.push(...children);},replaceChildren(...children){this.replacements++;this.children=children;},setAttribute(k,v){this.attributes[k]=v;},addEventListener(k,fn){this.listeners[k]=fn;},click(){this.listeners.click?.();},querySelector(selector){const matches=child=>selector.startsWith('.')?child.className.split(/\s+/).includes(selector.slice(1)):child.tag===selector;for(const child of this.children){if(matches(child))return child;const nested=child.querySelector?.(selector);if(nested)return nested;}return null;}};
 n.classList={remove(){}};n.focus=options=>{n.focusOptions=options;};return n;
}
function application(collection){
 const nodes=new Map(),$=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);},initial=initialSelections(),opens=[],randoms=[];
 const context=vm.createContext({sourceKinds,sourceSubjectFor,sourceKind:'unknown',collection,questions,visibleQuestions,modeKeys,modeCopy,questionsForMode,initialSelections,mode:'detail',modeSnapshots:{detail:{...initial}},selections:initial,refs:[],proposals:[],selectedProposal:null,textPart:'type',activeQuestion:null,$,el:node,sampleNode:(key,value)=>node('span','sample',key+':'+value),displayValue:(q,v)=>q.key==='size'?v.split('｜')[0]:v,effectiveSelections,selectionConflicts:()=>[],selectionWarnings:()=>[],updateSelectionFeedback({choices}){assert.ok(choices.every(choice=>choice.tag==='button'&&choice.dataset.key),'Feedback receives the selection buttons, not wrapper rows');},randomizeItem:q=>randoms.push(q.key),renderBoard(){},syncActivity(){},makeProposals(){},window:{scrollX:13,scrollY:2400,scrollTo(options){this.scrollX=options.left;this.scrollY=options.top;this.restored=options;}},document:{body:{dataset:{}},querySelectorAll:()=>[]},picker:{open:q=>opens.push(q.key)}});
 vm.runInContext(appCode,context);
 return {context,$,opens,randoms};
}
let buttonsChecked=0;
try{
 for(const collection of ['halloween','everyday','halloween']){
  applyCollection(collection);
  assert.deepEqual(questions.map(q=>q.key),internal,'Canonical order survives collection switching');
  assert.deepEqual(visibleQuestions.map(q=>q.key),detail);
  assert.deepEqual(modeKeys.detail,detail);assert.deepEqual(modeKeys.simple,simple);
  assert.deepEqual(questionsForMode('detail').map(q=>q.key),detail);assert.deepEqual(questionsForMode('simple').map(q=>q.key),simple);
  const initial=initialSelections();assert.deepEqual(Object.keys(initial),internal);
  questions.forEach((q,i)=>assert.equal(initial[q.key],defaults[i],'Defaults remain attached to the same key'));
  assert.equal(initial.medium,AUTO);assert.equal(initial.design,'通常の一枚絵');assert.equal(initial.mood,'毎回大胆に変える');assert.equal(initial.type,'文字を一切入れない');assert.equal(initial.size,'A4縦・300dpi目安｜2480×3508｜210:297');

  // Compatibility reads all fixed choices before drawing from an AUTO pool.
  // Verify the resulting canonical order and the actual first random draw,
  // rather than treating the last property read as the question being sampled.
  const input=Object.fromEntries(internal.map(key=>[key,AUTO])),draws=[];
  const random=()=>{const value=draws.length===0?.1:draws.length===1?0:.2;draws.push(value);return value;};
  const resolved=resolveSelections(input,random);
  assert.deepEqual(Object.keys(resolved),internal,'Resolver preserves drawing-first condition order');
  assert.ok(draws.length>1,'AUTO must actually sample multiple pools');
  const mediumQuestion=questions[0],media=mediumQuestion.autoValues||mediumQuestion.groups.flatMap(g=>g.values);
  assert.equal(resolved.medium,media[Math.floor(draws[0]*media.length)],'First draw determines the medium');
  const explicit={...initial,medium:'透明水彩',design:collection==='everyday'?'自然・都市の風景画':'通常の一枚絵',theme:questions.find(q=>q.key==='theme').groups[0].values[0]};
  for(const mode of ['detail','simple']){const effective=effectiveSelections(mode,explicit),final=resolveSelections(effective,()=>.2);assert.equal(final.medium,explicit.medium);assert.equal(final.design,explicit.design);assert.equal(final.theme,explicit.theme);}
  const proposed=propose(initial,()=>.2);assert.equal(proposed.size,initial.size);assert.equal(Object.keys(proposed)[0],'medium');

  const {$,context,opens,randoms}=application(collection);
  for(const [mode,keys] of [['detail',detail],['simple',simple],['detail',detail],['simple',simple],['auto',['size']],['detail',detail]]){
   vm.runInContext(`setMode('${mode}')`,context);
   assert.deepEqual($('choices').children.map(n=>n.dataset.choiceKey),keys,'Actual row order: '+mode);
   const cachedRows=[...$('choices').children];vm.runInContext('renderChoices()',context);
   assert.ok($('choices').children.every((row,i)=>row===cachedRows[i]),'Unchanged cards retain their wrapper and button listeners');
   $('choices').children.forEach((row,i)=>{
    assert.equal(row.tag,'div');assert.equal(row.children.length,2,'Each row has two separate buttons');
    const button=row.querySelector('.choice'),random=row.querySelector('.choice-random');
    assert.equal(button.dataset.key,keys[i]);assert.equal(random.tag,'button');assert.equal(random.dataset.randomKey,keys[i]);
    const question=questions.find(q=>q.key===keys[i]);
    assert.equal(button.children[0].children[0].textContent,String(i+1).padStart(2,'0')+' / '+question.name,'Actual button number: '+mode);
    button.click();assert.equal(opens.at(-1),question.key,'Tap opens the displayed question');
    assert.equal($('picker-index').textContent,String(i+1).padStart(2,'0')+' / '+keys.length,'Picker matches the current mode numbering');buttonsChecked++;
    const openCount=opens.length;random.click();assert.equal(randoms.at(-1),question.key,'Random button targets only its displayed question');assert.equal(opens.length,openCount,'Random does not open the picker');
   });
  }
  // A random redraw retains the live pressed node instead of sending focus
  // and the scroll anchor back to the first作風 control.
  const poseRow=$('choices').children.find(row=>row.dataset.choiceKey==='pose'),poseButton=poseRow.querySelector('.choice'),pressed=poseRow.querySelector('.choice-random'),replacements=$('choices').replacements;
  context.document.activeElement=pressed;context.selections.pose='四つん這いで進む';context.renderBoard=()=>{context.window.scrollY=0;};
  vm.runInContext("renderChoices('pose',{keepViewport:true})",context);
  assert.equal($('choices').children.find(row=>row.dataset.choiceKey==='pose'),poseRow,'Updated row keeps its position and identity');
  assert.equal(poseRow.querySelector('.choice'),poseButton);assert.equal(poseRow.querySelector('.choice-random'),pressed,'Pressed random control remains connected');
  assert.equal($('choices').replacements,replacements,'An ordinary value update does not detach the grid');
  assert.equal(pressed.focusOptions.preventScroll,true);assert.equal(context.window.scrollY,2400);assert.equal(context.window.scrollX,13);assert.equal(context.window.restored.behavior,'instant');
  // Chosen medium and design survive both mode snapshots, without using their
  // old positional indices or resetting them when the layout changes.
  context.selections.medium='水墨画';context.selections.design='通常の一枚絵';vm.runInContext("setMode('simple');setMode('detail')",context);assert.equal(context.selections.medium,'水墨画');assert.equal(context.selections.design,'通常の一枚絵');
 }
}finally{applyCollection('halloween');}
console.log(`PASS drawing-first flow: canonical questions/defaults/random order, both collections, detail/simple/auto mode switches, ${buttonsChecked} real rendered buttons and picker numbers, cached numbering, first tap, preserved selections and random viewport/focus retention.`);
