import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createPicker} from '../picker.js?v=28.4.4';
import {questions} from '../catalog.js?v=28.4.4';
import {initialSelections,effectiveSelections} from '../modes.js?v=28.4.4';
import {randomItemSelection} from '../random-selections.js?v=28.4.4';

class Node{
 constructor(tag='div',cls='',text=''){
  Object.assign(this,{tagName:tag,className:cls||'',textContent:text,children:[],dataset:{},attributes:{},listeners:{},hidden:false,value:'',styles:{}});
  this.style={setProperty:(key,value)=>this.styles[key]=value,getPropertyValue:key=>this.styles[key]||''};
  this.classList={add:name=>this.setClass(name,true),remove:name=>this.setClass(name,false),contains:name=>this.className.split(' ').includes(name),toggle:(name,on)=>this.setClass(name,on??!this.classList.contains(name))};
 }
 setClass(name,on){const classes=new Set(this.className.split(' ').filter(Boolean));on?classes.add(name):classes.delete(name);this.className=[...classes].join(' ');}
 append(...nodes){for(const node of nodes){node.parentElement=this;this.children.push(node);}if(this.tagName==='select'&&this.children.length&&!this.value)this.value=this.children[0].value;}
 replaceChildren(...nodes){this.children=[];if(this.tagName==='select')this.value='';this.append(...nodes);}
 before(node){const parent=this.parentElement;node.parentElement=parent;parent.children.splice(parent.children.indexOf(this),0,node);}
 after(node){const parent=this.parentElement;node.parentElement=parent;parent.children.splice(parent.children.indexOf(this)+1,0,node);}
 setAttribute(key,value){this.attributes[key]=value;}
 addEventListener(event,handler){(this.listeners[event]??=[]).push(handler);}
 matches(selector){return selector.startsWith('#')?this.id===selector.slice(1):selector.startsWith('.')?this.classList.contains(selector.slice(1)):this.tagName===selector;}
 querySelectorAll(selector){return this.children.flatMap(node=>[...(node.matches(selector)?[node]:[]),...node.querySelectorAll(selector)]);}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 emit(type,event={}){event.target??=this;event.preventDefault??=function(){this.prevented=true;};for(const handler of this.listeners[type]||[])handler(event);}
 click(){if(!this.disabled)this.emit('click');}
 showModal(){this.open=true;}
 close(){this.open=false;this.emit('close');}
 get offsetHeight(){return this.classList.contains('ring-pop')?108:0;}
 get clientHeight(){return 480;}
 get offsetWidth(){return 390;}
 getBoundingClientRect(){return {left:0,top:0,width:390,height:480};}
}
globalThis.window={innerWidth:390,innerHeight:700,addEventListener(){}};
globalThis.innerWidth=390;
globalThis.document={body:{dataset:{collection:'halloween'}},createTextNode:text=>new Node('text','',text)};
globalThis.localStorage={getItem:()=>null,setItem(){}};
globalThis.getComputedStyle=()=>({getPropertyValue:()=> '72px'});
globalThis.ResizeObserver=class{observe(){}};
let frames=[];
globalThis.requestAnimationFrame=callback=>{frames.push(callback);};
const flush=()=>{const ready=frames;frames=[];ready.forEach(callback=>callback());};

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8'),start=app.indexOf('function randomizeItem(q){'),end=app.indexOf('\nfunction renderChoices(',start);
assert.ok(start>=0&&end>start);
const actualRandom=app.slice(start,end);
function fixture(){
 const nodes=new Map(),$=id=>{if(!nodes.has(id)){const node=new Node(id==='picker-category'?'select':'div');node.id=id;nodes.set(id,node);}return nodes.get(id);};
 const surface=$('picker'),canvas=new Node('div','picker-canvas'),stage=$('ring-stage');
 canvas.append(stage,$('picker-options'));surface.append(canvas);stage.append($('ring-focus'),$('ring-options'));
 const inspectorViewport=new Node('div','inspector-viewport'),inspectorActions=new Node('div','inspector-actions');inspectorViewport.append($('inspector-art'));inspectorActions.append($('inspector-pick'));$('inspector').append(inspectorViewport,inspectorActions);
 const medium=questions.find(question=>question.key==='medium'),selections={...initialSelections(),medium:medium.groups[0].values[0],costume:'参照画像の衣装を生かす',palette:'モノクローム'},stats={renders:0,messages:[],chosen:[]};
 const context=vm.createContext({mode:'detail',selections,selectedProposal:null,effectiveSelections,randomItemSelection,rng:()=>.999999,renderChoices(){stats.renders++;},tell:message=>stats.messages.push(message),displayValue:(question,value)=>value});
 vm.runInContext(actualRandom,context);
 const picker=createPicker({$,el:(tag,cls,text)=>new Node(tag,cls,text),sampleNode:(key,value)=>new Node('span','sample-thumb',value),readSelection:()=>effectiveSelections(context.mode,context.selections),choose:value=>stats.chosen.push(value),onRandom:question=>context.randomizeItem(question),onCustom(){},tell:message=>stats.messages.push(message)});
 return {$,surface,picker,context,medium,stats};
}
function visibleSelection(f,view){
 const selected=f.context.selections.medium;
 if(view==='ring'){
  assert.equal(f.$('ring-focus').querySelector('b').textContent,selected,'Ring center shows the actual random value');
  assert.ok(f.$('ring-options').children.some(node=>node.dataset.value===selected),'Selected value is among the visible ring options');
 }else{
  const card=f.$('picker-options').querySelector('.selected');assert.ok(card,'List contains a selected card');assert.equal(card.dataset.value,selected,'Selected list card is the actual random value');
 }
}
let cases=0;
for(const view of ['ring','list'])for(const previous of ['filtered','comparing']){
 const f=fixture();f.picker.open(f.medium);flush();
 if(previous==='filtered'){
  if(view==='list')f.$('picker-list-view').click();
  f.$('picker-category').value=f.medium.groups[0].label;f.$('picker-category').emit('change');
 }else{
  // Populate comparison through the real ring tools, then switch to the
  // requested view before entering comparison mode.
  f.$('ring-focus').querySelector('.ring-tools').children[1].click();
  f.$('ring-options').children[1].click();f.$('ring-focus').querySelector('.ring-tools').children[1].click();
  if(view==='list')f.$('picker-list-view').click();
  f.$('picker-compare').click();assert.equal(f.$('picker-options').classList.contains('comparing'),true);
 }
 const before={...f.context.selections},renders=f.stats.renders;f.$('picker-random').click();
 assert.equal(f.surface.open,true,'Random updates the open dialog');
 assert.equal(f.$('picker-category').value,'すべて','Cross-category random reveals its selected value');
 assert.equal(f.$('picker-options').classList.contains('comparing'),false,'Random returns from comparison to current options');
 assert.equal(f.stats.renders,renders+1,'Actual app handler updates the selection cards once');
 assert.notEqual(f.context.selections.medium,before.medium);assert.ok(!f.medium.groups[0].values.includes(f.context.selections.medium),'Exercise a random value outside the previously filtered group');
 assert.deepEqual(Object.keys(before).filter(key=>before[key]!==f.context.selections[key]),['medium'],'Only this item changes');
 assert.equal(f.stats.chosen.length,0,'Random does not use the picker-closing choose path');visibleSelection(f,view);cases++;
}

// No compatible body pose exists for a scene explicitly without a person.
// A failed draw must retain both the selection and the current filtered view.
const failed=fixture(),pose=questions.find(question=>question.key==='pose');failed.context.selections.costume='風景を主役にする';failed.picker.open(pose);flush();
failed.$('picker-category').value=pose.groups[0].label;failed.$('picker-category').emit('change');
const before={...failed.context.selections},category=failed.$('picker-category').value,page=failed.$('picker-page').textContent,center=failed.$('ring-focus').querySelector('b').textContent;
failed.$('picker-random').click();assert.deepEqual({...failed.context.selections},before);assert.equal(failed.$('picker-category').value,category);assert.equal(failed.$('picker-page').textContent,page);assert.equal(failed.$('ring-focus').querySelector('b').textContent,center);assert.equal(failed.surface.open,true);assert.equal(failed.stats.renders,0);assert.match(failed.stats.messages.at(-1),/人物なし/);

// AUTO exposes size while the chosen proposal owns the other concrete fields.
// Its random button must update both representations of size, preserving the
// proposal's drawing conditions and the same visible selection in the picker.
const auto=fixture(),size=questions.find(question=>question.key==='size');auto.context.mode='auto';auto.context.selectedProposal={...auto.context.selections,medium:'発光幻想アニメ'};
const autoBefore={...auto.context.selections},proposalBefore={...auto.context.selectedProposal};auto.picker.open(size);flush();auto.$('picker-random').click();
assert.notEqual(auto.context.selections.size,autoBefore.size);assert.equal(auto.context.selectedProposal.size,auto.context.selections.size);
assert.deepEqual(Object.keys(autoBefore).filter(key=>autoBefore[key]!==auto.context.selections[key]),['size']);assert.deepEqual(Object.keys(proposalBefore).filter(key=>proposalBefore[key]!==auto.context.selectedProposal[key]),['size']);
assert.equal(auto.$('ring-focus').querySelector('b').textContent,auto.context.selections.size.split('｜')[0]);assert.equal(auto.surface.open,true);assert.equal(auto.stats.renders,1);
console.log('PASS picker random: '+cases+' real picker/app-handler routes across ring/list, category filters and comparison reveal the new selected value without closing or changing other fields; incompatible draw preserves the filtered view; AUTO size updates both selections and chosen proposal.');
