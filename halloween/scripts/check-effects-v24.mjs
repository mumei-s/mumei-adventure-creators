import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import assert from 'node:assert/strict';
const {JSDOM}=await import(process.env.HALLOWEEN_JSDOM_PATH||'jsdom');
const root=path.resolve(new URL('..',import.meta.url).pathname);
const dom=new JSDOM('<!doctype html><body data-collection="halloween" data-decoration="stars" data-lights="day" data-motion="on"><div class="studio-hero"></div><div id="magic-scene">'+Array.from({length:4},()=>'<button class="ornament"></button>').join('')+'</div><button id="play-ghosts"></button><b id="ghost-title"></b><b id="spell-status"></b><button id="play-spell"></button><dialog id="ghost-game"></dialog><div id="ghost-arena"></div><p id="ghost-status"></p><button id="ghost-restart"></button></body>',{url:'https://example.test/halloween/',pretendToBeVisual:true,runScripts:'outside-only'}),w=dom.window;
const draws=[],raf=new Map();let nextFrame=0;
const ctx=Object.fromEntries(['setTransform','clearRect','save','restore','translate','rotate','beginPath','moveTo','lineTo','closePath','fill','stroke','quadraticCurveTo','ellipse','arc'].map(name=>[name,(...args)=>draws.push({name,args})]));
w.HTMLCanvasElement.prototype.getContext=()=>ctx;
w.Element.prototype.animate=function(frames,options){this._animation={frames,options};return {finished:new Promise(()=>{}),cancel(){}};};
w.requestAnimationFrame=cb=>{raf.set(++nextFrame,cb);return nextFrame;};w.cancelAnimationFrame=id=>raf.delete(id);
w.IntersectionObserver=class{observe(){}unobserve(){}};w.matchMedia=()=>({matches:false,addEventListener(){}});
const context=dom.getInternalVMContext(),mods=new Map();
function load(file){file=path.resolve(file.split('?')[0]);if(mods.has(file))return mods.get(file);const m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context,identifier:file});mods.set(file,m);return m;}
const effects=load(root+'/effects.js');await effects.link((spec,parent)=>load(path.resolve(path.dirname(parent.identifier),spec)));await effects.evaluate();const api=effects.namespace.setupEffects();
const spells=mods.get(root+'/spells.js').namespace.createSpells({layer:w.document.getElementById('effect-layer'),active:()=>true});
const profileFor=mods.get(root+'/decoration-effects.js').namespace.decorationProfile;
let tick=100;
for(const collection of ['halloween','everyday'])for(const lights of ['day','night'])for(const decoration of ['stars','paper','gallery']){
 w.document.body.dataset.collection=collection;w.document.body.dataset.lights=lights;w.document.body.dataset.decoration=decoration;api.refresh();
 const profile=profileFor(decoration,collection==='everyday');assert.equal(w.document.getElementById('spell-status').textContent,profile.status);
 if(collection==='everyday')assert.match(w.document.getElementById('play-ghosts').textContent,/モチーフ/);
 const layer=w.document.getElementById('effect-layer');layer.replaceChildren();api.celebrate();assert.equal(layer.children.length,22);assert.ok([...layer.children].every(n=>n.className==='fx-'+profile.shape));
 const animation=layer.firstElementChild._animation,transform=animation.frames.at(-1).transform;
 if(decoration==='paper')assert.ok(!transform.includes(' + -'),'Petals fall rather than rise');
 const seen=new Set();for(let i=0;i<3;i++){layer.replaceChildren();spells.cast();const kind=Number(w.document.getElementById('play-spell').dataset.spell);seen.add(kind);assert.ok(profile.spells.includes(kind));assert.ok([...layer.children].every(n=>n.dataset.family===decoration));}
 assert.deepEqual([...seen].sort(),[...profile.spells].sort(),'A theme keeps its own complete spell family');
 layer.replaceChildren();spells.cast(6);assert.ok(profile.spells.includes(Number(w.document.getElementById('play-spell').dataset.spell)),'Ornament buttons stay in the selected theme');
 draws.length=0;const [id,paint]=[...raf].at(-1);raf.delete(id);paint(tick+=100);const names=draws.map(d=>d.name);
 if(decoration==='paper'){assert.ok(names.includes('ellipse'));assert.ok(!names.includes('quadraticCurveTo'));}
 if(decoration==='stars'){assert.ok(names.includes('quadraticCurveTo'));assert.ok(!names.includes('ellipse'));}
 if(decoration==='gallery'){assert.ok(names.includes('lineTo'));assert.ok(!names.includes('ellipse'));assert.ok(!names.includes('quadraticCurveTo'));}
}
assert.equal(new Set(['stars','paper','gallery'].flatMap(key=>profileFor(key).spells)).size,9,'The three effects never share their spell types');
spells.stop();dom.window.close();console.log('PASS actual effects: stars/constellations, petals/paper, and prism/light have distinct canvas shapes, click bursts, movements and spell families in ordinary/Halloween and day/night.');
