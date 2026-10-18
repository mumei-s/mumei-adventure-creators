import assert from 'node:assert/strict';
import {createSampleImage,previewSource,PREVIEW_VERSION} from '../sample-image.js';
import {createPicker} from '../picker.js';
import {questions} from '../catalog.js';
import {sampleFor} from '../examples.js';
import {initialSelections} from '../modes.js';
import {randomItemSelection} from '../random-selections.js';

// A small DOM double exercises scheduling and event order without a browser.
class Node {
 constructor(tag='div',cls='',text=''){
  Object.assign(this,{tagName:tag,className:cls||'',textContent:text,children:[],dataset:{},attributes:{},listeners:{},hidden:false,value:'',styles:{},operations:[]});
  this.style={setProperty:(key,value)=>this.styles[key]=value,getPropertyValue:key=>this.styles[key]||''};
  this.classList={add:name=>this.setClass(name,true),remove:name=>this.setClass(name,false),contains:name=>this.className.split(' ').includes(name),toggle:(name,on)=>this.setClass(name,on??!this.classList.contains(name))};
 }
 set loading(value){this._loading=value;this.operations.push(['loading',value]);}
 get loading(){return this._loading;}
 set src(value){this._src=value;this.operations.push(['src',value]);if(this.cachedLoad)this.emit('load');}
 get src(){return this._src;}
 setClass(name,on){const classes=new Set(this.className.split(' ').filter(Boolean));on?classes.add(name):classes.delete(name);this.className=[...classes].join(' ');}
 append(...nodes){for(const node of nodes){node.parentElement=this;this.children.push(node);}if(this.tagName==='select'&&this.children.length&&!this.value)this.value=this.children[0].value;}
 replaceChildren(...nodes){this.children=[];if(this.tagName==='select')this.value='';this.append(...nodes);}
 before(node){const parent=this.parentElement;node.parentElement=parent;parent.children.splice(parent.children.indexOf(this),0,node);}
 after(node){const parent=this.parentElement;node.parentElement=parent;parent.children.splice(parent.children.indexOf(this)+1,0,node);}
 setAttribute(key,value){this.attributes[key]=value;}
 addEventListener(event,handler){this.operations.push(['listen',event]);(this.listeners[event]??=[]).push(handler);}
 matches(selector){return selector.startsWith('#')?this.id===selector.slice(1):selector.startsWith('.')?this.classList.contains(selector.slice(1)):this.tagName===selector;}
 querySelectorAll(selector){return this.children.flatMap(node=>[...(node.matches(selector)?[node]:[]),...node.querySelectorAll(selector)]);}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 emit(type,event={}){event.target??=this;event.preventDefault??=function(){this.prevented=true;};for(const handler of this.listeners[type]||[])handler(event);}
 click(){if(!this.disabled)this.emit('click');}
 showModal(){this.open=true;this.operations.push(['showModal']);}
 close(){this.open=false;this.emit('close');}
 get firstElementChild(){return this.children[0]||null;}
 get offsetHeight(){return this.classList.contains('ring-pop')?108:0;}
 get clientHeight(){return 480;}
 get offsetWidth(){return 390;}
 getBoundingClientRect(){return {left:0,top:0,width:390,height:480};}
}
const el=(tag,cls,text)=>new Node(tag,cls,text);
const source='./format-preview.svg?existing=kept#layout-3',states=[];
const image=createSampleImage(el,source,{onState:state=>states.push(state)});
const firstSource=image.operations.findIndex(([operation])=>operation==='src');
assert.ok(firstSource>=0);
for(const [operation,value] of [['loading','eager'],['listen','load'],['listen','error']]){
 const index=image.operations.findIndex(([kind,item])=>kind===operation&&item===value);
 assert.ok(index>=0&&index<firstSource,`${operation} ${value} must precede the first src assignment`);
}
assert.equal(image.decoding,'async');
assert.equal(image.dataset.previewState,'loading');
const initialURL=new URL(image.src,'https://example.test/halloween/');
assert.equal(initialURL.pathname,'/halloween/format-preview.svg');
assert.equal(initialURL.searchParams.get('existing'),'kept');
assert.equal(initialURL.searchParams.get('atelier-preview'),PREVIEW_VERSION);
assert.equal(initialURL.hash,'#layout-3');
image.emit('error');
assert.equal(image.dataset.previewState,'retrying');
const retryURL=new URL(image.src,'https://example.test/halloween/');
assert.equal(retryURL.pathname,initialURL.pathname,'A retry must request the same artwork');
assert.equal(retryURL.searchParams.get('existing'),'kept');
assert.equal(retryURL.searchParams.get('atelier-preview'),PREVIEW_VERSION);
assert.equal(retryURL.searchParams.get('preview-retry'),'1');
assert.equal(retryURL.hash,'#layout-3');
image.emit('error');image.emit('error');
assert.equal(image.operations.filter(([operation])=>operation==='src').length,2,'A failed asset is retried exactly once');
assert.equal(image.dataset.previewState,'failed');
assert.match(image.alt,/読み込めません/);
assert.deepEqual(states,['loading','retrying','failed','failed']);

const successful=createSampleImage(el,'./pose-019.jpg');
successful.emit('load');
assert.equal(successful.dataset.previewState,'ready');
const retrySuccess=createSampleImage(el,'./costume-006.jpg');
retrySuccess.emit('error');retrySuccess.emit('load');
assert.equal(retrySuccess.dataset.previewState,'ready');
const cached=createSampleImage((tag,cls)=>{const node=el(tag,cls);node.cachedLoad=true;return node;},'./pose-019.jpg');
assert.equal(cached.dataset.previewState,'ready','A synchronous cached load must not be missed');
for(const localURL of ['blob:https://example.test/local-preview','data:image/png;base64,aGVsbG8=']){
 assert.equal(previewSource(localURL),localURL);
 assert.equal(previewSource(localURL,{retry:true}),localURL);
 const local=createSampleImage(el,localURL);local.emit('error');local.emit('error');
 assert.equal(local.src,localURL);
 assert.equal(local.dataset.previewState,'failed');
 assert.equal(local.operations.filter(([operation])=>operation==='src').length,1,'Local object/data resources must not be rewritten or retried');
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
function fixture(key,value){
 const nodes=new Map(),$=id=>{if(!nodes.has(id)){const node=new Node(id==='picker-category'?'select':'div');node.id=id;nodes.set(id,node);}return nodes.get(id);};
 const surface=$('picker'),canvas=el('div','picker-canvas'),stage=$('ring-stage');
 canvas.append(stage,$('picker-options'));surface.append(canvas);stage.append($('ring-focus'),$('ring-options'));
 const viewport=el('div','inspector-viewport'),actions=el('div','inspector-actions');viewport.append($('inspector-art'));actions.append($('inspector-pick'));$('inspector').append(viewport,actions);
 const selections={...initialSelections(),[key]:value},rendered=[];
 const picker=createPicker({$,el,sampleNode:(sampleKey,sampleValue)=>{
  assert.equal(surface.open,true,'showModal must run before preview nodes are rendered');
  const sample=sampleFor(sampleKey,sampleValue),thumb=el('span','sample-thumb');thumb.dataset.previewKind=sample.kind;
  if(sample.kind==='image'){const img=createSampleImage(el,sample.src);thumb.append(img);rendered.push(img);}
  else {assert.equal(sample.kind,'reference','These costume/pose pages may use the uploaded reference but must not silently lack a sample');thumb.append(el('span','sample-text',sampleValue));}
  return thumb;
 },readSelection:()=>selections,choose(){},onRandom:question=>{const next=randomItemSelection(question,selections,()=>.999999);if(!next.value)return false;selections[question.key]=next.value;return true;},onCustom(){},tell(){}});
 return {$,surface,picker,selections,rendered};
}
let renderingChecks=0;
for(const [key,value] of [['costume','カボチャの王族'],['pose','横向きに座る']]){
 const f=fixture(key,value),question=questions.find(item=>item.key===key);
 f.picker.open(question);flush();
 const verify=action=>{
  const thumbs=[...f.$('ring-options').querySelectorAll('.sample-thumb'),...f.$('ring-focus').querySelectorAll('.sample-thumb')];
  const previews=[...f.$('ring-options').querySelectorAll('img'),...f.$('ring-focus').querySelectorAll('img')];
  assert.equal(thumbs.length,f.$('ring-options').children.length+1,`${key}: ${action} must include every circle and the center sample`);
  if(action==='first display')assert.equal(thumbs.length,7,'The user-reported pages each contain six circles and a center sample');
  assert.equal(previews.length,thumbs.filter(thumb=>thumb.dataset.previewKind==='image').length,'Every artwork sample must create an image');
  assert.ok(previews.length>=thumbs.length-1,'Only an explicit uploaded-reference option may use reference text');
  for(const preview of previews){assert.equal(preview.loading,'eager');assert.equal(preview.dataset.previewState,'loading');assert.ok(preview.src.includes('atelier-preview='+PREVIEW_VERSION));}
  renderingChecks++;
 };
 verify('first display');
 const firstPage=f.$('picker-page').textContent;f.$('picker-next').click();flush();
 assert.notEqual(f.$('picker-page').textContent,firstPage);verify('next page');
 f.$('picker-category').value=question.groups.find(group=>group.values.includes(value)).label;
 f.$('picker-category').emit('change');flush();verify('category filter');
 f.$('picker-random').click();flush();
 assert.notEqual(f.selections[key],value);assert.equal(f.$('picker-category').value,'すべて');verify('item random');
}
console.log(`PASS preview loading: eager/listeners before src, cached and retried success, one same-asset retry, permanent failure, query/fragment preservation, unchanged blob/data URLs; ${renderingChecks} real picker rendering paths across costume and pose.`);

let pending,cleared=0;
const stalled=createSampleImage(el,'./small.webp',{fallbackSrc:'./original.png',setTimer:fn=>{pending=fn;return 1;},clearTimer:()=>cleared++});
pending();assert.match(stalled.src,/small.webp.*preview-retry=1/);
pending();assert.match(stalled.src,/original.png.*preview-retry=1/);
stalled.emit('load');assert.equal(stalled.dataset.previewState,'ready');assert.ok(cleared>=3);
let lazyTimer=false;
createSampleImage(el,'./offscreen.jpg',{loading:'lazy',setTimer:()=>{lazyTimer=true;}});
assert.equal(lazyTimer,false);
let detachedTimer;
const detached=createSampleImage(el,'./detached.jpg',{setTimer:fn=>{detachedTimer=fn;return 1;},clearTimer(){}});detached.isConnected=false;detachedTimer();
assert.equal(detached.operations.filter(([op])=>op==='src').length,1);
console.log('PASS stalled visible preview recovery, cancelled watchdog on success, no background fallback for offscreen or removed cards.');
