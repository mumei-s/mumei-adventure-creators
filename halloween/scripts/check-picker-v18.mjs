import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import assert from 'node:assert/strict';
const {JSDOM}=await import(process.env.HALLOWEEN_JSDOM_PATH||'jsdom');
const root=path.resolve(new URL('..',import.meta.url).pathname);
const dom=new JSDOM(fs.readFileSync(root+'/index.html','utf8'),{url:'https://example.test/halloween/',pretendToBeVisual:true,runScripts:'outside-only'}),w=dom.window;
w.HTMLElement.prototype.setPointerCapture=function(){};w.HTMLElement.prototype.hasPointerCapture=()=>false;w.HTMLElement.prototype.releasePointerCapture=function(){};
w.matchMedia=()=>({matches:false});w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};w.HTMLElement.prototype.scrollIntoView=()=>{};
const ctx=dom.getInternalVMContext(),mods=new Map();
function load(file){file=path.resolve(file.split('?')[0]);if(mods.has(file))return mods.get(file);const mod=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context:ctx,identifier:file});mods.set(file,mod);return mod;}
const entry=load(root+'/picker.js');await entry.link((spec,parent)=>load(path.resolve(path.dirname(parent.identifier),spec)));await entry.evaluate();
const questions=mods.get(root+'/catalog.js').namespace.questions;
const $=id=>w.document.getElementById(id),el=(tag,cls,text)=>{const x=w.document.createElement(tag);if(cls)x.className=cls;if(text)x.textContent=text;return x;};
let selection={},chosen=[];
const picker=entry.namespace.createPicker({$,el,sampleNode:(key,value)=>el('span','test-sample',value),readSelection:()=>selection,choose:v=>chosen.push(v),onCustom(){},tell(){}});
const medium=questions.find(q=>q.key==='medium');picker.open(medium);
const page=()=>$('picker-page').textContent;assert.match(page(),/^1 \/ /);
const total=Number(page().match(/\/ (\d+)/)[1]);assert.equal(total,18);assert.equal($('ring-options').children.length,6);assert.equal($('search'),null);assert.equal($('picker-category').options[0].text,'カテゴリ：すべて');
const surface=$('picker').querySelector('.picker-body');
function gesture(dx,dy=0,target=surface){for(const [type,x,y]of [['pointerdown',300,300],['pointerup',300+dx,300+dy]]){const e=new w.Event(type,{bubbles:true,cancelable:true});for(const [k,v]of Object.entries({isPrimary:true,pointerId:1,clientX:x,clientY:y}))Object.defineProperty(e,k,{value:v});target.dispatchEvent(e);}}
gesture(-110);assert.match(page(),/^2 \/ /);gesture(110);assert.match(page(),/^1 \/ /);
assert.equal($('picker-next-arrow'),null);assert.equal($('picker-prev-arrow'),null);assert.equal($('swipe-hint').textContent,'スワイプ可');const firstTone=$('picker').dataset.pageTone;gesture(-110);assert.notEqual($('picker').dataset.pageTone,firstTone);assert.ok($('picker').querySelector('.picker-canvas').classList.contains('page-changing'));gesture(110);assert.equal($('picker').dataset.pageTone,firstTone);
gesture(0,110);assert.match(page(),/^1 \/ /);gesture(-110,0,$('picker').querySelector('.dialog-header'));assert.match(page(),/^2 \/ /,'Page swipe also works over the heading');gesture(110,0,$('picker').querySelector('.dialog-header'));assert.match(page(),/^1 \/ /);
await new Promise(r=>setTimeout(r,410));$('picker-prev').click();assert.equal(page(),total+' / '+total+' ページ');$('picker-next').click();assert.match(page(),/^1 \/ /);
// Sliding an orbit card immediately rotates it; no holding timer or page change is involved.
const stage=$('ring-stage');stage.getBoundingClientRect=()=>({left:0,top:0,width:400,height:400});
const pointer=(type,x,y,target=stage)=>{const e=new w.Event(type,{bubbles:true,cancelable:true});for(const [k,v]of Object.entries({isPrimary:true,pointerId:2,clientX:x,clientY:y}))Object.defineProperty(e,k,{value:v});target.dispatchEvent(e);return e;};
const beforeFocus=$('ring-focus').querySelector('b').textContent,orbitCard=$('ring-options').children[0];pointer('pointerdown',340,200,orbitCard);assert.ok(!stage.classList.contains('ring-grabbing'));const move=pointer('pointermove',200,330);assert.ok(stage.classList.contains('ring-grabbing'));assert.ok(move.defaultPrevented);
const touch=new w.Event('touchmove',{bubbles:true,cancelable:true});stage.dispatchEvent(touch);assert.ok(touch.defaultPrevented);
const duringFocus=$('ring-focus').querySelector('b').textContent;assert.notEqual(duringFocus,beforeFocus,'The center changes before pointer release');assert.equal(chosen.length,0,'Rotating previews candidates without committing a choice');assert.equal($('ring-options').querySelector('[aria-pressed=true]').dataset.value,duringFocus);assert.equal($('swipe-hint').textContent,'スワイプ可');
pointer('pointerup',200,330);assert.ok(!stage.classList.contains('ring-grabbing'));assert.match(page(),/^1 \/ /);assert.equal($('ring-focus').querySelector('b').textContent,duringFocus,'Releasing retains the already visible candidate');
await new Promise(r=>setTimeout(r,410));const tapped=$('ring-options').children[2],tappedValue=tapped.dataset.value;pointer('pointerdown',340,200,tapped);pointer('pointerup',340,200,tapped);tapped.click();assert.equal($('ring-focus').querySelector('b').textContent,tappedValue,'Tapping still previews a card without rotating');pointer('pointerdown',100,100);const vertical=pointer('pointermove',100,180);pointer('pointerup',100,180);assert.ok(!vertical.defaultPrevented,'Vertical movement outside cards keeps ordinary scrolling');assert.match(page(),/^1 \/ /);$('picker-list-view').click();assert.equal($('picker-options').children.length,entry.namespace.pageSize(w.innerWidth));$('picker-ring-view').click();
selection={medium:'クリスタルホログラム造形アニメ'};picker.open(questions.find(q=>q.key==='palette'));
$('picker-category').value=questions.find(q=>q.key==='palette').groups.find(g=>g.values.includes('墨一色')).label;$('picker-category').dispatchEvent(new w.Event('change'));var ink;for(let i=0;i<20;i++){ink=$('ring-options').querySelector('[data-value="墨一色"]');if(ink){ink.click();break;}$('picker-next').click();}
assert.ok($('ring-focus').querySelector('.ring-pick').disabled);assert.ok($('ring-focus').querySelector('.compatibility-reason').textContent.includes('虹色'));
const big=[...$('ring-focus').querySelectorAll('button')].find(b=>b.textContent==='拡大');big.click();assert.ok($('inspector-pick').disabled);$('inspector-pick').click();assert.equal(chosen.length,0);$('inspector').close();
$('picker-list-view').click();const card=$('picker-options').querySelector('.option-button[data-value="墨一色"]');assert.ok(card.disabled);card.click();assert.equal(chosen.length,0);
selection={medium:'クリスタル透光アニメ'};picker.open(questions.find(q=>q.key==='palette'));
$('picker-category').value=questions.find(q=>q.key==='palette').groups.find(g=>g.values.includes('墨一色')).label;$('picker-category').dispatchEvent(new w.Event('change'));var ink;for(let i=0;i<20;i++){ink=$('ring-options').querySelector('[data-value="墨一色"]');if(ink){ink.click();break;}$('picker-next').click();}assert.ok(!$('picker-options').querySelector('.option-button[data-value="墨一色"]').disabled);
dom.window.close();console.log('PASS actual picker DOM: left to next; right to previous; vertical scrolling outside cards retained; immediate card rotation and tap preview; live center and distinct page accents; arrows removed; both buttons wrap; disabled ring/list/inspector choices cannot select; compatible choice enabled.');
