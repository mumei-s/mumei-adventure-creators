import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {initGalleryPanels,GALLERY_PANEL_SELECTOR} from '../gallery-panels.js';

class Node {
 constructor(tag,doc){this.tagName=tag.toUpperCase();this.doc=doc;this.children=[];this.parentNode=null;this.attrs={};this.dataset={};this.style={setProperty(k,v){this[k]=v;}};this.className='';this.id='';this.classList={add:c=>{this.className=[...new Set([...this.className.split(' ').filter(Boolean),c])].join(' ');},remove:c=>{this.className=this.className.split(' ').filter(x=>x!==c).join(' ');},contains:c=>this.className.split(' ').includes(c)};}
 get isConnected(){return this===this.doc.body||Boolean(this.parentNode?.isConnected);}
 get firstChild(){return this.children[0]||null;}
 get nextSibling(){if(!this.parentNode)return null;return this.parentNode.children[this.parentNode.children.indexOf(this)+1]||null;}
 setAttribute(k,v){this.attrs[k]=v;}
 append(...nodes){for(const node of nodes){node.remove();node.parentNode=this;this.children.push(node);}}
 insertBefore(node,before){if(!before){this.append(node);return;}const index=this.children.indexOf(before);assert.ok(index>=0);node.remove();node.parentNode=this;this.children.splice(index,0,node);}
 remove(){if(this.parentNode){this.parentNode.children=this.parentNode.children.filter(x=>x!==this);this.parentNode=null;}}
 matches(selector){return selector.split(',').some(part=>{const match=part.trim().match(/^(\w+)?(?:#([\w-]+))?(?:\.([\w-]+))?$/);if(!match)return false;return (!match[1]||this.tagName===match[1].toUpperCase())&&(!match[2]||this.id===match[2])&&(!match[3]||this.classList.contains(match[3]));});}
 querySelectorAll(selector){return this.children.flatMap(node=>[...(node.matches(selector)?[node]:[]),...node.querySelectorAll(selector)]);}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
}
function events(){const listeners=new Map();return {listeners,addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);},removeEventListener(type,fn){listeners.get(type)?.delete(fn);if(listeners.get(type)?.size===0)listeners.delete(type);},fire(type,event={}){for(const fn of [...listeners.get(type)||[]])fn(event);}};}
function fixture({root=true,observer=true}={}){
 const doc={...events(),hidden:false},win=events(),observers=[];doc.body=new Node('body',doc);doc.createElement=tag=>new Node(tag,doc);doc.querySelectorAll=s=>doc.body.querySelectorAll(s);doc.getElementById=id=>doc.body.querySelector('#'+id);
 if(root){const theater=doc.createElement('main');theater.id='theater';doc.body.append(theater);}
 if(observer)win.MutationObserver=class{constructor(callback){this.callback=callback;observers.push(this);}observe(...args){this.args=args;}disconnect(){this.disconnected=true;}};
 function panel(id='',className=''){const element=doc.createElement('dialog');element.id=id;element.className=className;element.attrs['aria-labelledby']='title';const close=doc.createElement('button');close.className='close';close.textContent='戻る';const content=doc.createElement('div');content.id='content';content.textContent='実際の紹介文';element.append(close,content);doc.body.append(element);return {element,close,content};}
 return {doc,win,observers,panel,notify(nodes=[]){for(const item of observers)item.callback([{addedNodes:nodes}]);}};
}

test('decorates all five gallery panels after their existing close control without changing content or focus',()=>{
 const f=fixture(),panels=[f.panel('roster'),f.panel('detail'),f.panel('years'),f.panel('','visitor-settings-dialog'),f.panel('','pwa-guide')],other=f.panel('unrelated');
 f.doc.activeElement=panels[0].close;const dispose=initGalleryPanels(f);
 for(const {element,close,content}of panels){assert.equal(element.children[0],close);assert.equal(element.children[1].className,'gallery-panel-art');assert.equal(element.children[2],content);assert.equal(element.children[1].attrs['aria-hidden'],'true');assert.equal(element.attrs['aria-labelledby'],'title');assert.equal(content.textContent,'実際の紹介文');assert.equal(element.querySelectorAll('.gallery-panel-spark').length,7);assert.equal(element.querySelectorAll('button').length,1);}
 assert.equal(f.doc.activeElement,panels[0].close);assert.equal(other.element.children.length,2);dispose();
 for(const {element,close,content}of panels)assert.deepEqual(element.children,[close,content]);
});

test('repeated initialization, content replacement and late settings create one ornament per panel',()=>{
 const f=fixture(),p=f.panel('detail'),dispose=initGalleryPanels(f);assert.equal(initGalleryPanels(f),dispose);assert.equal(f.observers.length,1);
 for(let i=0;i<10;i++)f.notify([p.content,p.element]);assert.equal(p.element.querySelectorAll('.gallery-panel-art').length,1);
 const settings=f.panel('','visitor-settings-dialog');f.notify([settings.element]);assert.equal(settings.element.querySelectorAll('.gallery-panel-art').length,1);
 p.element.remove();f.notify();f.doc.body.append(p.element);f.notify([p.element]);assert.equal(p.element.querySelectorAll('.gallery-panel-art').length,1);
 dispose();assert.equal(p.element.querySelectorAll('.gallery-panel-art').length,0);assert.equal(settings.element.querySelectorAll('.gallery-panel-art').length,0);
});

test('hidden tabs and bfcache freeze decoration; real unload and explicit disposal release everything',()=>{
 const f=fixture(),p=f.panel('roster'),dispose=initGalleryPanels(f);assert.equal(f.doc.body.dataset.galleryPanelsPaused,'false');
 f.doc.hidden=true;f.doc.fire('visibilitychange');assert.equal(f.doc.body.dataset.galleryPanelsPaused,'true');
 f.doc.hidden=false;f.doc.fire('visibilitychange');assert.equal(f.doc.body.dataset.galleryPanelsPaused,'false');
 f.win.fire('pagehide',{persisted:true});assert.equal(f.doc.body.dataset.galleryPanelsPaused,'true');assert.equal(p.element.querySelectorAll('.gallery-panel-art').length,1);
 f.win.fire('pageshow');assert.equal(f.doc.body.dataset.galleryPanelsPaused,'false');
 f.win.fire('pagehide',{persisted:false});assert.equal(p.element.querySelectorAll('.gallery-panel-art').length,0);assert.equal(f.doc.listeners.size,0);assert.equal(f.win.listeners.size,0);assert.equal(f.observers[0].disconnected,true);dispose();
});

test('unrelated pages are untouched and older engines still get static existing panel art',()=>{
 const other=fixture({root:false}),p=other.panel('roster');initGalleryPanels(other)();assert.equal(other.observers.length,0);assert.equal(p.element.children.length,2);
 const old=fixture({observer:false}),q=old.panel('years');const dispose=initGalleryPanels(old);assert.equal(q.element.children.length,3);dispose();
});

test('both themes use original local illustrations and reserve an untouchable header area',async()=>{
 const css=await readFile(new URL('../gallery-panels.css',import.meta.url),'utf8'),html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 assert.match(css,/\[data-mode=normal\][^{]*\{[^}]*butterfly\.svg[^}]*branch\.svg/s);
 assert.match(css,/--panel-familiar:url\('\.\/assets\/panel-magic\/ghost\.svg'\)/);
 assert.match(css,/width:calc\(100% - 104px\);max-width:380px;height:64px/);
 assert.match(css,/overflow:hidden;contain:layout paint;pointer-events:none/);
 assert.match(css,/\.gallery-panel-art \*\{pointer-events:none\}/);
 assert.doesNotMatch(css,/object-fit|object-position|text-size-adjust|zoom:|font-size:[1-9]/);
 for(const name of ['book','ghost','lantern','butterfly','branch']){const url=new URL(`../assets/panel-magic/${name}.svg`,import.meta.url);assert.ok((await stat(url)).size<2500);const svg=await readFile(url,'utf8');assert.match(svg,/viewBox=/);assert.doesNotMatch(svg,/<(?:script|image|text)|https?:\/\/(?!www\.w3\.org)/);}
 for(const name of ['gallery-panels.js','gallery-panels.css'])assert.ok(html.includes(name+'?v='+(name.endsWith('.css')?'20261017-panels2':'20261017-panels1')));
 assert.ok(GALLERY_PANEL_SELECTOR.includes('dialog#detail'));
});

test('motion is optional and genuine loading/exit lifecycle is never delayed or replaced',async()=>{
 const css=await readFile(new URL('../gallery-panels.css',import.meta.url),'utf8'),js=await readFile(new URL('../gallery-panels.js',import.meta.url),'utf8');
 assert.match(css,/@media\(prefers-reduced-motion:reduce\).*animation:none!important/);
 assert.match(css,/data-ambient-paused=true[^}]+animation:none!important/s);
 assert.match(css,/data-gallery-panels-paused=true/);
 assert.match(css,/detail-image-loading\[data-state=loading\]::before/);
 assert.match(css,/detail-image-loading\[data-state=error\]/);
 for(const rule of css.matchAll(/([^{}]*app-ended-screen[^{}]*)\{([^}]+)\}/g))assert.doesNotMatch(rule[2],/animation|transition/);
 assert.doesNotMatch(js,/setTimeout|setInterval|requestAnimationFrame|fetch\(|showModal|\.close\(|\.focus\(|innerHTML|localStorage|sessionStorage/);
});


test('roster ornaments stay out of both theme grids and result counts keep readable contrast',async()=>{
 const css=await readFile(new URL('../gallery-panels.css',import.meta.url),'utf8');
 const rule=selector=>{const start=css.indexOf(selector+'{');assert.ok(start>=0,selector);return css.slice(start+selector.length+1,css.indexOf('}',start));};
 const card='body[data-layout-page=gallery] #roster.gallery-panel .roster-card';
 // Neither declaration may depend on Halloween-only rules: otherwise ::before
 // becomes normal mode's first grid item and moves the copy into the portrait column.
 assert.match(rule(card),/(?:^|;)\s*position:relative;/);
 assert.match(rule(card+'::before'),/(?:^|;)\s*position:absolute;/);
 assert.match(rule(card+'::before'),/pointer-events:none/);
 assert.match(rule('body[data-layout-page=gallery] #roster.gallery-panel #results'),/color:var\(--panel-ink\)/);
 const rgb=hex=>hex.match(/../g).map(value=>parseInt(value,16));
 const luminance=values=>values.map(value=>value/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4).reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index],0);
 for(const selector of ['body[data-layout-page=gallery]','body[data-layout-page=gallery][data-mode=normal]']){
  const variables=rule(selector),color=name=>rgb(variables.match(new RegExp('--panel-'+name+':#([a-f0-9]+)'))[1]);
  const ink=luminance(color('ink')),wash=color('wash'),alpha=wash[3]/255;
  for(const base of [color('top'),color('base')])for(const strength of [0,alpha]){
   const background=luminance(base.map((channel,index)=>channel*(1-strength)+wash[index]*strength));
   const ratio=(Math.max(ink,background)+.05)/(Math.min(ink,background)+.05);
   assert.ok(ratio>=4.5,`${selector} result count contrast ${ratio.toFixed(2)}:1`);
  }
 }
});
