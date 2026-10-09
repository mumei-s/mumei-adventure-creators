import assert from 'node:assert/strict';
import fs from 'node:fs';
import {setupEffects} from '../effects.js?v=28.4.3';
import {installNightStudio,everydayNightIcons,nightIcons} from '../night-studio.js?v=28.4.3';
import {icons,nightIcons as monsterIcons} from '../halloween-icons.js?v=28.4.3';
import {studioIcons} from '../spells.js?v=28.4.3';

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
console.log('PASS night UI: persisted night and live collection switches replace actual hero/ornament/game DOM, remove Halloween monsters and cancel stale timers; distinct ordinary day/night motifs; header ON/OFF; both paired night palettes meet 4.5 contrast for inspector notes/features and primary/secondary text.');
