import assert from 'node:assert/strict';
import {File} from 'node:buffer';
// Browser APIs and pixel decoding are deliberately mocked here. These checks
// exercise panel behavior; they do not establish real-browser compatibility or
// inspect image content.
class Element {
 constructor(tag){this.tagName=tag;this.children=[];this.dataset={};this.events={};this.attributes={};this.hidden=false;this.disabled=false;this.value='';this.files=[];this.ownText='';}
 set textContent(value){this.ownText=String(value);this.children=[];} get textContent(){return this.ownText+this.children.map(n=>n.textContent).join('');}
 append(...nodes){this.children.push(...nodes);for(const node of nodes)node.parent=this;}
 setAttribute(k,v){this.attributes[k]=String(v);} removeAttribute(k){delete this.attributes[k];delete this[k];}
 addEventListener(type,fn){(this.events[type]??=[]).push(fn);} async emit(type){for(const fn of this.events[type]||[])await fn({target:this});}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);}
 focus(){} select(){} click(){this.emit('click');}
 getContext(){return {drawImage(){}};} toBlob(fn){fn(new Blob(['preview'],{type:'image/webp'}));}
}
const body=new Element('body');globalThis.document={body,createElement:tag=>new Element(tag),createTextNode:text=>{const n=new Element('#text');n.textContent=text;return n;}};
let decodeFailure=false;
globalThis.createImageBitmap=async()=>{if(decodeFailure)throw new Error('decode-rejected');return {close(){}};};
const live=new Set();let urlCounter=0;URL.createObjectURL=()=>{const value='blob:local-'+(++urlCounter);live.add(value);return value;};URL.revokeObjectURL=value=>live.delete(value);
const {mountQualityPanel}=await import('../generation-quality-panel.js');
const {createProductionRequest}=await import('../generation-quality.js');
const request=createProductionRequest({edition:'A',values:{costume:'海賊',type:'文字を一切入れない'},production:{copy:{mode:'none',slots:[]}}});
const savedRequest=JSON.stringify(request);
const copied=[],container=new Element('div');const dispose=mountQualityPanel(container,{request,inspection:{status:'checked'},copyText:async text=>copied.push(text)});
const descendants=n=>[n,...n.children.flatMap(descendants)];const all=()=>descendants(container),image=slot=>all().find(n=>n.dataset.qualityImage===slot),field=key=>all().find(n=>n.dataset.qualityField===key),button=text=>all().find(n=>n.tagName==='button'&&n.textContent===text);
assert.match(container.textContent,/生成前の条件確認済み/);assert.match(container.textContent,/完成画像は未検査/);assert.equal(image('revision').disabled,true);
await button('選んだ箇所の修正指示をコピー').emit('click');assert.equal(copied.length,0);
const png=new Uint8Array(24);png.set([137,80,78,71,13,10,26,10]);png.set([73,72,68,82],12);new DataView(png.buffer).setUint32(16,100);new DataView(png.buffer).setUint32(20,150);
const original=new File([png],'original.png',{type:'image/png'});image('original').files=[original];await image('original').emit('change');assert.equal(image('original').disabled,true);assert.equal(image('revision').disabled,false);assert.equal(live.size,2);
image('revision').files=[new File(['invalid'],'invalid.png',{type:'image/png'})];await image('revision').emit('change');assert.equal(live.size,2);assert.equal(image('original').disabled,true);assert.equal(image('revision').disabled,false);assert.match(container.textContent,/元画像と制作条件は変更していません/);
decodeFailure=true;image('revision').files=[new File([png],'rejected.png',{type:'image/png'})];await image('revision').emit('change');decodeFailure=false;assert.equal(live.size,2);assert.equal(image('original').disabled,true);assert.equal(image('revision').disabled,false);assert.match(container.textContent,/decode-rejected/);assert.match(container.textContent,/未検査/);
await button('選んだ箇所の修正指示をコピー').emit('click');assert.equal(copied.length,0);
field('changes').value='剣を両手で持つ';field('preserve').value='顔と背景';await button('選んだ箇所の修正指示をコピー').emit('click');assert.equal(copied.length,1);assert.match(copied[0],/original.png/);assert.match(copied[0],/顔と背景/);
const revision=new File([png],'revision.png',{type:'image/png'});image('revision').files=[revision];await image('revision').emit('change');assert.equal(image('original').disabled,true);assert.equal(live.size,4);
await button('選んだ箇所の修正指示をコピー').emit('click');assert.match(copied[1],/revision.png/);
await button('元画像を修正対象にする').emit('click');await button('選んだ箇所の修正指示をコピー').emit('click');assert.match(copied[2],/original.png/);
await button('修正版の表示を解除').emit('click');assert.equal(live.size,2);assert.equal(image('original').disabled,true);
await button('完成画像を確認する指示をコピー').emit('click');assert.match(copied[3],/未確認/);
assert.deepEqual(new Uint8Array(await original.arrayBuffer()),png);dispose();assert.equal(live.size,0);assert.equal(container.children.length,0);assert.deepEqual(new Uint8Array(await original.arrayBuffer()),png);assert.equal(JSON.stringify(request),savedRequest);
// Clipboard failure must expose a manual copy path without changing a request.
const fallbackContainer=new Element('div');const fallbackDispose=mountQualityPanel(fallbackContainer,{request,inspection:{status:'error'},copyText:async()=>{throw new Error('clipboard-blocked');}});
const review=descendants(fallbackContainer).find(n=>n.tagName==='button'&&n.textContent==='完成画像を確認する指示をコピー');await review.emit('click');await new Promise(resolve=>setTimeout(resolve,0));
const fallback=descendants(fallbackContainer).find(n=>n.tagName==='textarea'&&n.readOnly);assert.equal(fallback.hidden,false);assert.match(fallback.value,/未確認/);assert.match(fallbackContainer.textContent,/生成前の条件は未検査/);fallbackDispose();assert.equal(JSON.stringify(request),savedRequest);
console.log('Quality panel mocked DOM: original/revision isolation, explicit repair, source preservation, decode rejection, clipboard fallback and disposal passed. No actual browser/image judgement.');
