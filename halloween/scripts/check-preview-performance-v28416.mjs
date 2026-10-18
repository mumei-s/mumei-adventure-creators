import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createSampleImage,previewSource} from '../sample-image.js';
import {previewThumbnailFor} from '../preview-thumbnails.js';
import {createPicker} from '../picker.js';
import {questions,AUTO} from '../catalog.js';
import {sampleFor,typePreview} from '../examples.js';
import {initialSelections} from '../modes.js';
import {randomItemSelection} from '../random-selections.js';

// Reuse the small DOM double, without executing the earlier regression suite.
const prior=fs.readFileSync(new URL('./check-preview-loading-v28415.mjs',import.meta.url),'utf8');
const Node=vm.runInNewContext(prior.slice(prior.indexOf('class Node {'),prior.indexOf('\nconst el='))+'\nNode');
Object.defineProperty(Node.prototype,'options',{get(){return this.querySelectorAll('option');}});
Object.defineProperty(Node.prototype,'clientWidth',{get(){return 390;}});
const el=(tag,cls,text)=>new Node(tag,cls,text);
const lazy=createSampleImage(el,'./thumbnail.webp',{loading:'lazy',priority:'low',fallbackSrc:'./original.png'});
assert.equal(lazy.loading,'lazy');assert.equal(lazy.fetchPriority,'low');
const initialSource=lazy.src;lazy.emit('error');
assert.equal(lazy.src,previewSource('./thumbnail.webp',{retry:true}),'Retry the lightweight artwork before the original');
lazy.emit('error');assert.equal(lazy.src,previewSource('./original.png',{retry:true}),'Last fallback keeps the same artwork');
assert.notEqual(lazy.src,initialSource);lazy.emit('error');lazy.emit('error');
assert.equal(lazy.operations.filter(([operation])=>operation==='src').length,3,'Fallback stays bounded to three requests');
assert.equal(lazy.dataset.previewState,'failed');
const foreground=createSampleImage(el,'./thumbnail.webp',{loading:'eager',priority:'high'});
assert.equal(foreground.loading,'eager');assert.equal(foreground.fetchPriority,'high');

const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
function extract(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);assert.ok(a>=0&&b>a);return source.slice(a,b);}
const sampleFunction=extract('function sampleNode(','\nlet boardArtKey=');
const sampleContext=vm.createContext({sampleFor,typePreview,el,createSampleImage,previewThumbnailFor,refs:[]});
vm.runInContext(sampleFunction,sampleContext);
const medium='立体光彩アニメ',original=sampleFor('medium',medium).src,thumbnail=previewThumbnailFor(original);
assert.notEqual(thumbnail,original,'This fixture must exercise an optimized display asset');
const main=sampleContext.sampleNode('medium',medium),mainImage=main.querySelector('img');
assert.equal(mainImage.loading,'lazy','Main page previews must not compete with an open picker');
assert.equal(mainImage.src,previewSource(thumbnail));
mainImage.emit('error');assert.equal(mainImage.src,previewSource(thumbnail,{retry:true}));
mainImage.emit('error');assert.equal(mainImage.src,previewSource(original,{retry:true}));
const originalPreview=sampleContext.sampleNode('medium',medium,{eager:true,priority:'high',original:true}).querySelector('img');
assert.equal(originalPreview.loading,'eager');assert.equal(originalPreview.fetchPriority,'high');
assert.equal(originalPreview.src,previewSource(original),'Inspector mode must preserve original resolution');

// Execute the real preset renderer: unrelated fields preserve the existing node.
const presetNodes=new Map(),preset$=id=>{if(!presetNodes.has(id))presetNodes.set(id,el(id==='style-preset-select'?'select':'div'));return presetNodes.get(id);};
let presetCreations=0;
const presetContext=vm.createContext({$:preset$,el,questions,AUTO,selections:{medium},collection:'halloween',activeQuestion:null,stylePresetFor:value=>value===AUTO?null:{medium:value},sampleNode:(key,value)=>{presetCreations++;return el('span','sample-thumb',value);}});
vm.runInContext(extract("let stylePreviewKey='';", "\n$('style-preset-select').addEventListener"),presetContext);
presetContext.renderStylePreset({medium,costume:'人狼'});const firstPreset=preset$('style-preset-preview').firstElementChild;
presetContext.renderStylePreset({medium,costume:'ミイラ'});
assert.equal(presetCreations,1);assert.equal(preset$('style-preset-preview').firstElementChild,firstPreset);
presetContext.renderStylePreset({medium:'立体光彩リアル'});assert.equal(presetCreations,2);
presetContext.collection='everyday';presetContext.renderStylePreset({medium:'立体光彩リアル'});assert.equal(presetCreations,3,'Collection changes must refresh the preset');

// Execute the actual initialization statement with a retained everyday setting.
const startup=source.split('\n').find(line=>line.startsWith('setView(view);renderSourceKinds();'));
assert.ok(startup);
const collections=[],startupContext=vm.createContext({view:'auto',setView(){},renderSourceKinds(){},renderRefs(){},localStorage:{getItem:()=> 'everyday'},setCollection:value=>collections.push(value),setMode(){throw new Error('Do not render the default collection before restoring the selected collection');},renderHistory(){},initializeHistory(){return Promise.resolve();},initializeCreatorDraft(){return Promise.resolve();},renderDraftStatus(){}});
vm.runInContext(startup,startupContext);assert.equal(collections.length,1);assert.equal(collections[0],'everyday');

globalThis.window={innerWidth:390,innerHeight:700,addEventListener(){}};
globalThis.innerWidth=390;globalThis.document={body:{dataset:{collection:'halloween'}},createElement:tag=>el(tag),createTextNode:text=>el('text','',text)};
globalThis.localStorage={getItem:()=>null,setItem(){}};
globalThis.getComputedStyle=()=>({getPropertyValue:()=> '72px'});
globalThis.ResizeObserver=class{observe(){}};
let frames=[];globalThis.requestAnimationFrame=callback=>frames.push(callback);
const flush=()=>{const ready=frames;frames=[];ready.forEach(callback=>callback());};
function fixture(key,value){
 const nodes=new Map(),$=id=>{if(!nodes.has(id)){const node=el(id==='picker-category'?'select':'div');node.id=id;nodes.set(id,node);}return nodes.get(id);};
 const surface=$('picker'),canvas=el('div','picker-canvas'),stage=$('ring-stage');canvas.append(stage,$('picker-options'));surface.append(canvas);stage.append($('ring-focus'),$('ring-options'));
 const viewport=el('div','inspector-viewport'),actions=el('div','inspector-actions');viewport.append($('inspector-art'));actions.append($('inspector-pick'));$('inspector').append(viewport,actions);
 const selections={...initialSelections(),[key]:value},calls=[];
 const picker=createPicker({$,el,sampleNode:(sampleKey,sampleValue,options)=>{assert.equal(options?.eager,true,'Every picker preview must explicitly load eagerly');calls.push({key:sampleKey,value:sampleValue,options});return sampleContext.sampleNode(sampleKey,sampleValue,options);},readSelection:()=>selections,choose(){},onRandom:question=>{const next=randomItemSelection(question,selections,()=>.999999);if(!next.value)return false;selections[question.key]=next.value;return true;},onCustom(){},tell(){}});
 return {$,surface,picker,selections,calls};
}
let paths=0;
for(const [key,value] of [['costume','カボチャの王族'],['pose','横向きに座る']]){
 const f=fixture(key,value),question=questions.find(item=>item.key===key);
 const verify=()=>{const images=[...f.$('ring-options').querySelectorAll('img'),...f.$('ring-focus').querySelectorAll('img')];assert.ok(images.length);for(const image of images)assert.equal(image.loading,'eager');assert.equal(f.$('ring-focus').querySelector('img').fetchPriority,'high','The center preview must receive foreground priority');paths++;};
 f.picker.open(question);flush();verify();f.$('picker-next').click();flush();verify();
 f.$('picker-category').value=question.groups.find(group=>group.values.includes(value)).label;f.$('picker-category').emit('change');flush();verify();
 f.$('picker-random').click();flush();verify();
 f.$('ring-focus').querySelector('.ring-tools').children[0].click();
 const inspectorCall=f.calls.at(-1);assert.equal(inspectorCall.options.original,true);assert.equal(inspectorCall.options.priority,'high');
 const inspectedImage=f.$('inspector-art').querySelector('img');assert.equal(inspectedImage.src,previewSource(sampleFor(key,inspectorCall.value).src));
 assert.equal(inspectedImage.loading,'eager');assert.equal(f.$('inspector').open,true);
}
console.log(`PASS preview performance: lazy main thumbnails, foreground priority, bounded own-original fallback, original inspector, preset-node reuse, single restored-collection startup; ${paths} eager picker paths.`);
