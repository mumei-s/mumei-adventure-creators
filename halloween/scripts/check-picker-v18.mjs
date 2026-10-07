import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import assert from 'node:assert/strict';
const {JSDOM}=await import(process.env.HALLOWEEN_JSDOM_PATH||'jsdom');
const root=path.resolve(new URL('..',import.meta.url).pathname);
const dom=new JSDOM(fs.readFileSync(root+'/index.html','utf8'),{url:'https://example.test/halloween/',pretendToBeVisual:true,runScripts:'outside-only'}),w=dom.window;
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
const total=Number(page().match(/\/ (\d+)/)[1]);assert.ok(total>1);
const surface=$('picker').querySelector('.picker-body');
function gesture(dx,dy=0){for(const [type,x,y]of [['pointerdown',300,300],['pointerup',300+dx,300+dy]]){const e=new w.Event(type,{bubbles:true,cancelable:true});for(const [k,v]of Object.entries({isPrimary:true,pointerId:1,clientX:x,clientY:y}))Object.defineProperty(e,k,{value:v});surface.dispatchEvent(e);}}
gesture(-110);assert.equal(page(),total+' / '+total+' ページ');gesture(110);assert.match(page(),/^1 \/ /);
gesture(0,110);assert.match(page(),/^1 \/ /);
await new Promise(r=>setTimeout(r,410));$('picker-prev').click();assert.equal(page(),total+' / '+total+' ページ');$('picker-next').click();assert.match(page(),/^1 \/ /);
selection={medium:'クリスタルホログラム造形アニメ'};picker.open(questions.find(q=>q.key==='palette'));
$('search').value='墨一色';$('search').dispatchEvent(new w.Event('input'));
assert.ok($('ring-focus').querySelector('.ring-pick').disabled);assert.ok($('ring-focus').querySelector('.compatibility-reason').textContent.includes('虹色'));
const big=[...$('ring-focus').querySelectorAll('button')].find(b=>b.textContent==='拡大');big.click();assert.ok($('inspector-pick').disabled);$('inspector-pick').click();assert.equal(chosen.length,0);$('inspector').close();
$('picker-list-view').click();const card=$('picker-options').querySelector('.option-button');assert.ok(card.disabled);card.click();assert.equal(chosen.length,0);
selection={medium:'クリスタル透光アニメ'};picker.open(questions.find(q=>q.key==='palette'));
$('search').value='墨一色';$('search').dispatchEvent(new w.Event('input'));assert.ok(!$('picker-options').querySelector('.option-button').disabled);
dom.window.close();console.log('PASS actual picker DOM: left from first to last; right back to first; vertical gesture ignored; both buttons wrap; disabled ring/list/inspector choices cannot select; compatible choice enabled.');
