import assert from 'node:assert/strict';
import fs from 'node:fs';
import {setupEffects} from '../effects.js?v=28.4.5';
import {installNightStudio,everydayNightIcons,nightIcons} from '../night-studio.js?v=28.4.5';
import {icons,nightIcons as monsterIcons} from '../halloween-icons.js?v=28.4.5';
import {studioIcons} from '../spells.js?v=28.4.5';

class Node{
 constructor(tag='div'){this.tagName=tag;this.children=[];this.dataset={};this.attributes={};this.listeners={};this.className='';this.innerHTML='';this.style={setProperty(){}};this.classList={add(){},remove(){}};}
 append(...nodes){for(const node of nodes){node.parentElement=this;this.children.push(node);}}
 prepend(node){node.parentElement=this;this.children.unshift(node);}
 replaceChildren(...nodes){this.children=[];this.innerHTML='';this.append(...nodes);}
 setAttribute(key,value){this.attributes[key]=value;}
 getAttribute(key){return this.attributes[key];}
 addEventListener(event,handler){(this.listeners[event]??=[]).push(handler);}
 click(){for(const handler of this.listeners.click||[])handler({target:this});}
 showModal(){this.open=true;}
 matches(selector){return selector.startsWith('#')?this.id===selector.slice(1):selector.startsWith('.')?this.className.split(' ').includes(selector.slice(1)):this.tagName===selector;}
 querySelectorAll(selector){const parts=selector.split(' '),last=parts.at(-1);return this.children.flatMap(node=>[...(node.matches(last)&&(!parts[0].startsWith('#')||parts.length===1||node.parentElement?.matches(parts[0]))?[node]:[]),...node.querySelectorAll(selector)]);}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 getContext(){return null;}
}
const body=new Node('body');body.dataset={collection:'halloween',lights:'day',decoration:'stars',motion:'on'};
const hero=new Node();hero.className='studio-hero';body.append(hero);
const ids=new Map(),add=(id,tag='div')=>{const node=new Node(tag);node.id=id;ids.set(id,node);body.append(node);return node;};
const scene=add('magic-scene');for(let i=0;i<4;i++){const node=new Node('button');node.className='ornament';scene.append(node);}
for(const id of ['play-ghosts','ghost-title','spell-status','play-spell','ghost-arena','ghost-status','ghost-restart','light-play','night-state'])add(id);
add('ghost-game','dialog');
const observers=[],intervals=new Set();let nextInterval=0;
globalThis.document={body,hidden:false,createElement:tag=>new Node(tag),getElementById:id=>ids.get(id),querySelector:s=>body.querySelector(s),querySelectorAll:s=>body.querySelectorAll(s),addEventListener(){}};
globalThis.localStorage={getItem:()=> 'on',setItem(){}};
globalThis.MutationObserver=class{constructor(callback){observers.push(callback);}observe(){}};
globalThis.IntersectionObserver=class{observe(){}unobserve(){}};
globalThis.matchMedia=()=>({matches:false,addEventListener(){}});
globalThis.addEventListener=()=>{};globalThis.innerWidth=390;globalThis.innerHeight=780;globalThis.devicePixelRatio=1;
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
globalThis.setInterval=()=>{intervals.add(++nextInterval);return nextInterval;};globalThis.clearInterval=id=>intervals.delete(id);
const api=setupEffects();installNightStudio(api);
const ornaments=()=>scene.children.map(node=>node.innerHTML),cast=()=>hero.querySelector('.night-cast'),creatures=()=>hero.querySelector('.night-creatures');
function switchAppearance(collection,lights){body.dataset.collection=collection;body.dataset.lights=lights;observers.forEach(callback=>callback());}

// Begin with a persisted Halloween night, then switch while its game is open.
assert.equal(body.dataset.lights,'night');assert.deepEqual(ornaments(),monsterIcons);
assert.ok(nightIcons.every(icon=>cast().innerHTML.includes(icon)));assert.equal(creatures().children.length,3);
ids.get('play-ghosts').click();assert.equal(ids.get('ghost-arena').children.length,4);assert.equal(intervals.size,1);
switchAppearance('everyday','night');
assert.equal(body.dataset.lights,'night','Changing collections preserves the active night setting');
assert.deepEqual(ornaments(),everydayNightIcons,'Actual effect DOM switches to ordinary evening objects');
assert.equal(creatures().children.length,0,'Hidden Halloween monsters are physically removed');
assert.ok(everydayNightIcons.every(icon=>cast().innerHTML.includes(icon)));
for(const icon of [...nightIcons,...monsterIcons])assert.ok(!cast().innerHTML.includes(icon),'Ordinary hero has no retained Halloween icon');
assert.equal(cast().dataset.family,'everyday');assert.equal(ids.get('ghost-arena').children.length,0,'Mode switching removes running game monsters');assert.equal(intervals.size,0,'Mode switching cancels the old game timer');
ids.get('ghost-restart').click();assert.deepEqual(ids.get('ghost-arena').children.map(node=>node.innerHTML),everydayNightIcons);
assert.deepEqual(ids.get('ghost-arena').children.map(node=>node.getAttribute('aria-label')),['月をあつめる','星空をあつめる','窓の灯りをあつめる','本と灯りをあつめる']);
assert.match(ids.get('ghost-title').textContent,/夜のモチーフ/);

for(const [collection,lights,expected] of [['everyday','day',studioIcons],['halloween','day',icons],['halloween','night',monsterIcons],['everyday','night',everydayNightIcons]]){
 switchAppearance(collection,lights);assert.deepEqual(ornaments(),expected);
 if(collection==='everyday'){
  assert.equal(creatures().children.length,0);
  assert.ok(scene.children.every(node=>!/おばけ|コウモリ|モンスター|スケルトン|カボチャ/.test(node.getAttribute('aria-label'))));
 }
 if(lights==='day')assert.equal(cast().innerHTML,'','Day mode removes the night hero illustrations');
 assert.equal(intervals.size,0);
}
// The header control still owns the persisted ON/OFF state and its label.
ids.get('light-play').click();assert.equal(body.dataset.lights,'day');assert.equal(ids.get('light-play').getAttribute('aria-pressed'),'false');
ids.get('light-play').click();assert.equal(body.dataset.lights,'night');assert.equal(ids.get('light-play').getAttribute('aria-pressed'),'true');assert.deepEqual(ornaments(),everydayNightIcons);

// Check the concrete foreground/background pairs used by the repaired note,
// inspector feature chips and ordinary-night surfaces at WCAG normal-text 4.5.
const css=fs.readFileSync(new URL('../night.css',import.meta.url),'utf8');
const palettes=[...css.matchAll(/--night-surface:(#[0-9a-f]{6});--night-chip:(#[0-9a-f]{6});--night-copy:(#[0-9a-f]{6});--night-secondary:(#[0-9a-f]{6})/gi)].map(match=>match.slice(1));
assert.equal(palettes.length,2);
const luminance=hex=>{const rgb=hex.slice(1).match(/../g).map(value=>parseInt(value,16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
const ratio=(a,b)=>{const values=[luminance(a),luminance(b)].sort((a,b)=>b-a);return (values[0]+.05)/(values[1]+.05);};
for(const [surface,chip,copy,secondary] of palettes)for(const background of [surface,chip])for(const foreground of [copy,secondary])assert.ok(ratio(background,foreground)>=4.5);
assert.match(css,/:is\(#inspector-note,#inspector-specs-body[^}]+color:var\(--night-copy\)/,'The actual inspector ID receives the readable foreground');
assert.match(css,/#inspector \.look-tags>span[^}]+background:var\(--night-chip\);color:var\(--night-copy\)/,'Feature chips receive both their dark background and readable foreground');

// Resolve the actual button rules in stylesheet order. Checking the selected
// rule alone misses a pale :is(...,#view-status) color with higher specificity.
const splitSelectors=selector=>{let depth=0,start=0;const parts=[];for(let i=0;i<selector.length;i++){if(selector[i]==='('||selector[i]==='[')depth++;if(selector[i]===')'||selector[i]===']')depth--;if(selector[i]===','&&!depth){parts.push(selector.slice(start,i).trim());start=i+1;}}return [...parts,selector.slice(start).trim()];};
const compareSpecificity=(a,b)=>a[0]-b[0]||a[1]-b[1]||a[2]-b[2];
function specificity(selector){
 const score=[0,0,0];
 selector=selector.replace(/:(is|where)\(([^()]*)\)/g,(_,kind,choices)=>{if(kind==='is'){const max=splitSelectors(choices).map(specificity).sort(compareSpecificity).at(-1);max.forEach((value,i)=>score[i]+=value);}return '';});
 const attributes=selector.match(/\[[^\]]+\]/g)||[];selector=selector.replace(/\[[^\]]+\]/g,'');
 score[0]+=(selector.match(/#[\w-]+/g)||[]).length;
 score[1]+=attributes.length+(selector.match(/\.[\w-]+|:(?!:)[\w-]+/g)||[]).length;
 score[2]+=(selector.match(/(^|[\s>+~])[a-z][\w-]*/gi)||[]).length;
 return score;
}
function expandSelector(selector){
 const match=selector.match(/:(?:is|where)\(([^()]*)\)/);if(!match)return [selector];
 return splitSelectors(match[1]).flatMap(choice=>expandSelector(selector.slice(0,match.index)+choice+selector.slice(match.index+match[0].length)));
}
function matchesCompound(selector,node){
 if(!node||selector.includes('::'))return false;
 let matches=true;
 selector=selector.replace(/:([\w-]+)/g,(_,state)=>{if(!node.cssStates?.has(state))matches=false;return '';});
 selector=selector.replace(/\[([\w-]+)(?:=(["']?)([^\]"']+)\2)?\]/g,(_,key,quote,value)=>{const actual=key.startsWith('data-')?node.dataset[key.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())]:node.getAttribute(key);if(actual===undefined||(value!==undefined&&actual!==value))matches=false;return '';});
 selector=selector.replace(/([.#])([\w-]+)/g,(_,kind,value)=>{if(kind==='#'?node.id!==value:!node.className.split(' ').includes(value))matches=false;return '';});
 return matches&&(!selector||selector==='*'||node.tagName===selector);
}
function matchesSelector(selector,node){
 return expandSelector(selector).some(expanded=>{
  const parts=expanded.replace(/>/g,' > ').trim().split(/\s+/);let current=node;
  if(!matchesCompound(parts.pop(),current))return false;
  while(parts.length){const part=parts.pop();if(part==='>' ){current=current.parentElement;if(!matchesCompound(parts.pop(),current))return false;}else{do{current=current.parentElement;}while(current&&!matchesCompound(part,current));if(!current)return false;}}
  return true;
 });
}
function styleRules(source){
 return [...source.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/([^{}]+)\{([^{}]*)\}/g)].flatMap(([,selector,declarations])=>selector.trim().startsWith('@')?[]:splitSelectors(selector).map(selector=>({selector,score:specificity(selector),declarations:[...declarations.matchAll(/(?:^|;)\s*(background(?:-color)?|color)\s*:\s*([^;]+)/g)].map(([,property,value])=>({property:property.startsWith('background')?'background':'color',value:value.replace(/\s*!important\s*$/,''),important:value.includes('!important')}))})));
}
function buttonPair(rules,node){
 const winners={};rules.forEach((rule,order)=>{if(!matchesSelector(rule.selector,node))return;for(const declaration of rule.declarations){const old=winners[declaration.property];if(!old||Number(declaration.important)>Number(old.important)||(declaration.important===old.important&&(compareSpecificity(rule.score,old.score)>0||(compareSpecificity(rule.score,old.score)===0&&order>old.order))))winners[declaration.property]={...declaration,score:rule.score,order};}});
 return {background:winners.background?.value,color:winners.color?.value};
}
const stylesheets=[...fs.readFileSync(new URL('../index.html',import.meta.url),'utf8').matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/g)].map(([,href])=>fs.readFileSync(new URL('../'+href.split('?')[0],import.meta.url),'utf8'));
const rules=styleRules(stylesheets.join('\n'));
const fixture=(collection,classes,pressed,view='auto',hover=false)=>{const root=new Node('body');root.dataset={collection,lights:'night'};let parent=root;for(const className of classes){const wrapper=new Node();wrapper.className=className;parent.append(wrapper);parent=wrapper;}const button=new Node('button');button.setAttribute('aria-pressed',String(pressed));button.dataset.view=view;button.cssStates=new Set(hover?['hover']:[]);parent.append(button);return button;};
let buttonPairs=0;
for(const collection of ['halloween','everyday'])for(const pressed of [false,true])for(const hover of [false,true]){
 const buttons=[...['auto','phone','tablet','pc'].map(view=>fixture(collection,['view-toolbar','view-switch'],pressed,view,hover)),...['collection-switch','mode-switch','decoration-controls','picker-views'].map(group=>fixture(collection,[group],pressed,'auto',hover))];
 const favorite=fixture(collection,[],pressed,'auto',hover);favorite.className='favorite-toggle';buttons.push(favorite);
 for(const button of buttons){const pair=buttonPair(rules,button),label=`${collection}/${button.parentElement.className||button.className}/${button.dataset.view}/${pressed}/${hover}`;assert.match(pair.background,/^#[0-9a-f]{6}$/i,label+' has a concrete paired background');assert.match(pair.color,/^#[0-9a-f]{6}$/i,label+' has a concrete paired foreground');assert.ok(ratio(pair.background,pair.color)>=4.5,label+' effective CSS cascade must meet normal-text contrast');if(pressed)assert.ok(luminance(pair.color)<luminance(pair.background),label+' selected light surface uses dark text');buttonPairs++;}
}
// Verify that this cascade regression catches the previously published bug.
const oldMutedRule='body[data-collection][data-lights=night] :is(.view-toolbar button,#view-status){color:#cfc3e9}';
const oldPair=buttonPair([...rules,...styleRules(oldMutedRule)],fixture('halloween',['view-toolbar','view-switch'],true));
assert.deepEqual(oldPair,{background:'#b397db',color:'#cfc3e9'});
assert.ok(ratio(oldPair.background,oldPair.color)<4.5,'The old ID-bearing :is branch is caught, although the selected rule declares dark text');
console.log(`PASS night UI: persisted night and live collection switches replace actual hero/ornament/game DOM, remove Halloween monsters and cancel stale timers; distinct ordinary day/night motifs; header ON/OFF; both paired night palettes and ${buttonPairs} effective selected/unselected/hover button pairs meet 4.5 contrast; the prior :is specificity failure is reproduced.`);
