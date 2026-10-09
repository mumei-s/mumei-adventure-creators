import assert from 'node:assert/strict';
import {createFavoritesPanel} from '../favorites-panel.js?v=28.4.6';
import {questions} from '../catalog.js?v=28.4.6';

class Node{
 constructor(tag='div',cls='',text=''){Object.assign(this,{tagName:tag,className:cls||'',textContent:text,children:[],dataset:{},attributes:{},listeners:{},value:''});}
 append(...nodes){for(const node of nodes){node.parentElement=this;this.children.push(node);}if(this.tagName==='select'&&this.children.length&&!this.value)this.value=this.children[0].value;}
 replaceChildren(...nodes){this.children=[];if(this.tagName==='select')this.value='';this.append(...nodes);}
 before(node){const parent=this.parentElement;node.parentElement=parent;parent.children.splice(parent.children.indexOf(this),0,node);}
 setAttribute(key,value){this.attributes[key]=value;}
 addEventListener(event,callback){(this.listeners[event]??=[]).push(callback);}
 emit(event){for(const callback of this.listeners[event]||[])callback();}
 click(){this.emit('click');}
 matches(selector){return selector.startsWith('.')?this.className.split(' ').includes(selector.slice(1)):selector.startsWith('#')?this.id===selector.slice(1):this.tagName===selector;}
 querySelectorAll(selector){return this.children.flatMap(node=>[...(node.matches(selector)?[node]:[]),...node.querySelectorAll(selector)]);}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
}
const nodes=new Map(),$=id=>nodes.get(id),el=(tag,cls,text)=>new Node(tag,cls,text),panel=el('section');
for(const id of ['favorite-library-status','favorite-library-items']){const node=el('div');node.id=id;nodes.set(id,node);panel.append(node);}nodes.set('favorite-library',panel);
let collection='halloween';const picks=[],removals=[],saved={'halloween:medium':['発光幻想アニメ','ちびキャラ'],'halloween:pose':['振り向く'],'everyday:medium':['透明水彩'],'everyday:design':['通常の一枚絵']};
const picker={getFavorites:()=>structuredClone(saved),removeFavorite(key,value,collection){removals.push({key,value,collection});const previous=saved[collection+':'+key]||[],next=previous.filter(item=>item!==value);if(next.length===previous.length)return false;saved[collection+':'+key]=next;return true;}};
const shelf=createFavoritesPanel({$,el,picker,questions,sampleNode:(key,value)=>{const node=el('span','sample-thumb');node.dataset.sampleKey=key;node.dataset.sampleValue=value;return node;},collection:()=>collection,onPick:(key,value)=>picks.push({key,value})});
const cards=()=>$('favorite-library-items').querySelectorAll('.favorite-library-card'),filter=()=>panel.querySelector('select');
shelf.render();assert.equal(cards().length,3);assert.match($('favorite-library-status').textContent,/Halloween.*3件/);assert.equal(filter().children.length,questions.length+1,'Every category is available without leaving the main page');
const luminous=cards().find(card=>card.dataset.value==='発光幻想アニメ');assert.equal(luminous.querySelector('.sample-thumb').dataset.sampleKey,'medium');assert.equal(luminous.querySelector('.favorite-library-category').textContent,questions.find(question=>question.key==='medium').name);luminous.querySelector('.favorite-library-pick').click();assert.deepEqual(picks,[{key:'medium',value:'発光幻想アニメ'}]);assert.equal(cards().length,3,'Applying a favorite does not remove saved entries');
filter().value='pose';filter().emit('change');assert.deepEqual(cards().map(card=>card.dataset.value),['振り向く']);cards()[0].querySelector('.favorite-library-remove').click();assert.deepEqual(removals,[{key:'pose',value:'振り向く',collection:'halloween'}]);assert.equal(cards().length,0);assert.match($('favorite-library-items').querySelector('p').textContent,/この分類.*まだ/);assert.equal(filter().value,'pose','Removing a favorite retains the active filter');
assert.deepEqual(saved['halloween:medium'],['発光幻想アニメ','ちびキャラ']);assert.deepEqual(saved['everyday:medium'],['透明水彩'],'Removing a choice does not affect another collection');
collection='everyday';shelf.render();assert.equal(filter().value,'all','Collection gets its own filter position');assert.deepEqual(cards().map(card=>card.dataset.value),['透明水彩','通常の一枚絵']);assert.match($('favorite-library-status').textContent,/普段使い.*2件/);
filter().value='design';filter().emit('change');cards()[0].querySelector('.favorite-library-pick').click();assert.deepEqual(picks.at(-1),{key:'design',value:'通常の一枚絵'});
collection='halloween';shelf.render();assert.equal(filter().value,'pose','Switching back restores the previous collection filter');collection='everyday';shelf.render();assert.equal(filter().value,'design');cards()[0].querySelector('.favorite-library-remove').click();filter().value='medium';filter().emit('change');cards()[0].querySelector('.favorite-library-remove').click();assert.equal(cards().length,0);assert.match($('favorite-library-items').querySelector('p').textContent,/☆.*保存/);assert.match($('favorite-library-status').textContent,/0件/);
assert.equal(panel.querySelectorAll('select').length,1,'Repeated rendering retains a single filter');
console.log('PASS favorites shelf: persistent main-page preview/category/select/remove controls; all category filters; exact single-item pick dispatch; independent collection contents and filter restoration; deletion/empty state; no duplicate filter after updates.');
