import assert from 'node:assert/strict';
import {createPicker} from '../picker.js?v=28.4.1';
import {questions,visibleQuestions} from '../catalog.js?v=28.4.1';
import {applyCollection} from '../collection.js?v=28.4.1';
import {ringPosition,restingRingPosition,pagePatternTone} from '../ring-motion.js?v=28.4.1';

// Short screens retain a 360px scrollable canvas rather than crushing its cards.
// Exercise measured card bounds and two-line labels at all supported widths.
for(const width of [320,390,620,1024])for(const height of [360,380,480])for(let count=1;count<=6;count++)for(const cardHeight of [88,108,118]){
 const gap=width<620?72:76;
 for(let slot=0;slot<count;slot++){
  const raw=ringPosition(slot,count),p=restingRingPosition(raw,{height,cardHeight,gap,slot,count}),half=cardHeight*p.scale/2,y=Math.abs(p.y)*height/100;
  assert.ok(y-half>=gap/2+7.99,`Clear band: ${width}/${height}/${count}/${slot}/${cardHeight}`);
  assert.ok(y+half<=height/2-7.99,'Card stays inside the canvas');
  assert.equal(p.x,raw.x);assert.equal(p.scale,raw.scale);
 }
}
for(let pages=2;pages<=200;pages++)for(let page=0;page<pages;page++)assert.notEqual(pagePatternTone(page,pages),pagePatternTone((page+1)%pages,pages),'Adjacent patterns differ even across the wrap');

// A minimal DOM runs the real picker/render/event code without a browser package.
class Node{
 constructor(tag='div',cls='',text=''){this.tagName=tag;this.className=cls||'';this.textContent=text;this.children=[];this.dataset={};this.attributes={};this.listeners={};this.hidden=false;this.style={setProperty:(k,v)=>this.styles[k]=v,getPropertyValue:k=>this.styles[k]||''};this.styles={};this.classList={add:c=>this.setClass(c,true),remove:c=>this.setClass(c,false),contains:c=>this.className.split(' ').includes(c),toggle:(c,on)=>this.setClass(c,on??!this.classList.contains(c))};}
 setClass(c,on){const names=new Set(this.className.split(' ').filter(Boolean));on?names.add(c):names.delete(c);this.className=[...names].join(' ');}
 append(...nodes){for(const n of nodes){n.parentElement=this;this.children.push(n);}if(this.tagName==='select'&&this.children.length&&!this.value)this.value=this.children[0].value;}
 replaceChildren(...nodes){this.children=[];if(this.tagName==='select')this.value='';this.append(...nodes);}
 before(node){const p=this.parentElement;node.parentElement=p;p.children.splice(p.children.indexOf(this),0,node);}
 after(node){const p=this.parentElement;node.parentElement=p;p.children.splice(p.children.indexOf(this)+1,0,node);}
 setAttribute(k,v){this.attributes[k]=v;}
 getAttribute(k){return this.attributes[k];}
 addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);}
 matches(s){return s.startsWith('#')?this.id===s.slice(1):s.startsWith('.')?this.classList.contains(s.slice(1)):this.tagName===s;}
 closest(selector){for(let n=this;n;n=n.parentElement)if(selector.split(',').some(s=>n.matches(s.trim())))return n;return null;}
 querySelectorAll(selector){return this.children.flatMap(n=>[...(n.matches(selector)?[n]:[]),...n.querySelectorAll(selector)]);}
 querySelector(s){return this.querySelectorAll(s)[0]||null;}
 emit(type,event={}){event.target??=this;event.preventDefault??=function(){this.prevented=true;};for(const fn of this.listeners[type]||[])fn(event);}
 click(){if(!this.disabled)this.emit('click');}
 showModal(){this.open=true;}
 close(){this.open=false;this.emit('close');}
 get offsetHeight(){return surface.open&&this.classList.contains('ring-pop')?108:0;}
 get offsetWidth(){return width;}
 get clientHeight(){return surface.open?height:0;}
 getBoundingClientRect(){return {left:0,top:0,width,height};}
}
let width=390,height=360,now=1000,frames=[],observer,chosen=[],selection={};
const ids=new Map(),$=id=>{if(!ids.has(id)){const n=new Node(id==='picker-category'?'select':'div');n.id=id;ids.set(id,n);}return ids.get(id);};
const surface=$('picker'),canvas=new Node('div','picker-canvas'),stage=$('ring-stage');stage.className='ring-stage';canvas.append(stage,$('picker-options'));surface.append(canvas);stage.append($('ring-focus'),$('ring-options'));$('ring-focus').className='ring-focus';
const windowEvents={};globalThis.window={innerWidth:width,innerHeight:700,addEventListener:(k,fn)=>(windowEvents[k]??=[]).push(fn)};globalThis.innerWidth=width;
globalThis.document={body:{dataset:{collection:'halloween'}},createTextNode:text=>new Node('text','',text)};
globalThis.localStorage={getItem:()=>null,setItem(){}};
globalThis.requestAnimationFrame=fn=>{frames.push(fn);};globalThis.getComputedStyle=()=>({getPropertyValue:()=>width<620?'72px':'76px'});
globalThis.ResizeObserver=class{constructor(fn){observer=fn;}observe(){}};
Object.defineProperty(globalThis,'performance',{value:{now:()=>now},configurable:true});
const el=(tag,cls,text)=>new Node(tag,cls,text),picker=createPicker({$,el,sampleNode:(key,value)=>el('span','sample-thumb',value),readSelection:()=>selection,choose:value=>chosen.push(value),onCustom(){},tell(){},artworkBasis:value=>({value,basis:['描線の基準'],checks:['輪郭を確認'],avoid:['別の技法を混ぜない'],references:[{title:'技法資料',url:'https://example.test/technique',kind:'technique',note:'製法を確認'}],status:'documented'})});
const flush=()=>{const pending=frames;frames=[];pending.forEach(fn=>fn());};
const label=()=>surface.querySelector('.ring-current-category'),basis=()=>surface.querySelector('.artwork-basis-panel');
const bounds=()=>[...$('ring-options').children].map(card=>Math.abs(parseFloat(card.styles['--ry']))*height/100-card.offsetHeight*parseFloat(card.styles['--orbit-scale'])/2);
function pointer(type,target,x,y){const event={target,pointerId:1,isPrimary:true,clientX:x,clientY:y,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;}};surface.emit(type,event);return event;}
function swipe(dx,dy=0,target=stage){now+=1000;pointer('pointerdown',target,width/2,height/2);const move=pointer('pointermove',target,width/2+dx,height/2+dy);pointer('pointerup',target,width/2+dx,height/2+dy);return move;}

picker.open(questions.find(q=>q.key==='medium'));
assert.ok(bounds().some(edge=>edge<36),'Closed-dialog measurement starts at zero');flush();assert.ok(bounds().every(edge=>edge>=43.99),'First shown frame reserves the clear band');
height=480;observer();assert.ok(bounds().every(edge=>edge>=43.99),'ResizeObserver repositions a taller canvas');
height=360;width=400;window.innerWidth=innerWidth=400;windowEvents.resize.forEach(fn=>fn());assert.ok(bounds().every(edge=>edge>=43.99),'Resize within the phone breakpoint also repositions');
basis().open=true;$('ring-options').children[2].click();assert.equal(basis().open,true,'Changing the center keeps notes expanded');assert.equal(basis().dataset.value,$('ring-focus').querySelector('b').textContent);
const initialPage=$('picker-page').textContent;swipe(-100,0,basis());assert.equal($('picker-page').textContent,initialPage,'Reading source notes does not page or rotate');
$('picker-list-view').click();const listed=$('picker-options').children[2],listedValue=listed.dataset.value;listed.querySelector('.artwork-basis-preview').click();assert.equal(basis().dataset.value,listedValue);assert.equal(basis().open,true);assert.equal(chosen.length,0,'Inline list basis does not commit a choice or open another popup');$('picker-ring-view').click();

// Every category/page in both collections retains its records and category label.
let checkedPages=0,checkedCategories=0;
for(const collection of ['halloween','everyday']){
 applyCollection(collection);document.body.dataset.collection=collection;
 for(const q of visibleQuestions){
  picker.open(q);flush();
  for(const group of ['すべて',...q.groups.map(g=>g.label)]){
   $('picker-category').value=group;$('picker-category').emit('change');
   const records=q.groups.filter(g=>group==='すべて'||g.label===group).flatMap(g=>g.values.map(value=>({value,group:g.label}))),pages=Math.max(1,Math.ceil(records.length/6));
   checkedCategories++;
   for(let page=0;page<pages;page++){
    const expected=records.slice(page*6,(page+1)*6);
    assert.equal($('picker-page').textContent,`${page+1} / ${pages} ページ`);
    assert.deepEqual($('ring-options').children.map(n=>n.dataset.value),expected.map(r=>r.value));
    assert.equal(label().textContent,'カテゴリ：'+(expected[0]?.group||group));assert.equal(label().hidden,false);assert.equal(basis().hidden,q.key!=='medium');if(q.key==='medium')assert.equal(basis().dataset.value,expected[0]?.value||'');
    assert.ok(bounds().every(edge=>edge>=43.99));checkedPages++;
    for(const record of expected){$('ring-options').children.find(n=>n.dataset.value===record.value).click();assert.equal(label().textContent,'カテゴリ：'+record.group,'Category follows every preview on a page');if(q.key==='medium')assert.equal(basis().dataset.value,record.value,'Basis follows every medium preview');}
    if(pages>1){const priorTone=surface.dataset.pageTone;$('picker-next').click();assert.notEqual(surface.dataset.pageTone,priorTone);assert.equal(canvas.styles['--page-enter-x'],'18px');}
   }
  }
 }
}
applyCollection('halloween');document.body.dataset.collection='halloween';picker.open(questions.find(q=>q.key==='medium'));flush();
swipe(-100);assert.match($('picker-page').textContent,/^2 \/ /);swipe(100);assert.match($('picker-page').textContent,/^1 \/ /);assert.equal(canvas.styles['--page-enter-x'],'-18px');
assert.ok(!swipe(4,100).prevented,'Vertical pan stays native');assert.match($('picker-page').textContent,/^1 \/ /);
// Starting in the free band stays paging even after the pointer crosses a card.
now+=1000;pointer('pointerdown',stage,width-20,height/2);pointer('pointermove',$('ring-options').children[1],width-140,height/2);pointer('pointerup',$('ring-options').children[1],width-140,height/2);assert.match($('picker-page').textContent,/^2 \/ /);assert.ok(!stage.classList.contains('ring-grabbing'));
// Central taps still select, while dragging does not produce an accidental click.
now+=1000;const pick=$('ring-focus').querySelector('.ring-pick');pointer('pointerdown',pick,200,180);pointer('pointerup',pick,202,181);pick.click();assert.equal(chosen.length,1);
swipe(-100,1,pick);const click={target:pick,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;}};surface.emit('click',click);assert.ok(click.prevented&&click.stopped);assert.equal(chosen.length,1);
// Direct card dragging still orbits; cancellation restores both the center and gap.
now+=1000;const original=$('ring-focus').querySelector('b').textContent,card=$('ring-options').children[0];pointer('pointerdown',card,width*.88,height/2);pointer('pointermove',card,width/2,height*.85);assert.ok(stage.classList.contains('ring-grabbing'));assert.notEqual($('ring-focus').querySelector('b').textContent,original);pointer('pointercancel',card,width/2,height*.85);assert.equal($('ring-focus').querySelector('b').textContent,original);assert.ok(bounds().every(edge=>edge>=43.99));assert.ok(!stage.classList.contains('ring-grabbing'));
for(const finish of ['pointerup','blur','close']){
 now+=1000;const before=$('ring-focus').querySelector('b').textContent,card=$('ring-options').children[0];pointer('pointerdown',card,width*.88,height/2);pointer('pointermove',card,width/2,height*.85);const preview=$('ring-focus').querySelector('b').textContent;
 if(finish==='pointerup'){pointer('pointerup',card,width/2,height*.85);assert.equal($('ring-focus').querySelector('b').textContent,preview,'Releasing commits the visible preview');}
 else if(finish==='blur'){windowEvents.blur.forEach(fn=>fn());assert.equal($('ring-focus').querySelector('b').textContent,before);}
 else {surface.close();assert.equal($('ring-focus').querySelector('b').textContent,before);picker.open(questions.find(q=>q.key==='medium'));flush();}
 assert.ok(!stage.classList.contains('ring-grabbing'));assert.ok(bounds().every(edge=>edge>=43.99),'Finishing any orbit restores the clear band');
}
// The reported conflict must be explained outside the measured orbit cards.
selection={mood:'ローアングル＋威嚇',angle:'真上から・90度',pose:'四つん這いで進む'};
picker.open(questions.find(q=>q.key==='angle'));flush();
const conflictPanel=surface.querySelector('.candidate-notice'),center=$('ring-focus');
assert.equal(conflictPanel.hidden,false,'Known conflicting angle has a visible reason');
assert.equal(conflictPanel.dataset.status,'blocked');assert.equal(center.querySelector('.ring-pick').disabled,true);
assert.equal(center.querySelector('.compatibility-reason'),null,'Conflict text does not stretch the center card');
assert.ok(!conflictPanel.closest('.ring-stage'),'Notice is outside the swipe band');
const conflictPage=$('picker-page').textContent;swipe(-100,0,conflictPanel);assert.equal($('picker-page').textContent,conflictPage,'Reading conflict text does not page or rotate');
picker.open(questions.find(q=>q.key==='medium'));flush();assert.equal(conflictPanel.hidden,true,'Opening an unrelated valid choice clears the old reason');
console.log(`PASS picker: clear horizontal band at 320/390/620/1024, 1–6 cards and long labels; first open/resize/cancel; ${checkedCategories} categories and ${checkedPages} pages in both collections; current category; distinct adjacent patterns; left-next/right-previous; native vertical pan; taps and intentional orbit preserved.`);
