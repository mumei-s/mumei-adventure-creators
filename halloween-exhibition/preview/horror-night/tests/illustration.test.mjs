import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {prepareIllustration} from '../scene-illustration.js';import {SCENES} from '../journey-data.js';
function fake(){const made=[];class Image{constructor(){made.push(this);this.requests=[];}set src(value){this.requests.push(value);}get src(){return this.requests.at(-1)}removeAttribute(){}decode(){return Promise.resolve();}}return {Image,made};}
test('preloads only the current scene, at low priority and without blocking',()=>{
 const f=fake();const task=prepareIllustration(SCENES[1].image,{ImageClass:f.Image});
 assert.equal(f.made.length,1);const image=f.made[0];assert.equal(image.fetchPriority,'low');assert.equal(image.decoding,'async');assert.deepEqual(image.requests,[SCENES[1].image.src]);assert.equal(task.status(),'loading');
 assert.equal(image.width,1672);assert.equal(image.height,941);
});
test('mount reuses the same downloaded Image object without a second src request',()=>{
 const f=fake(),task=prepareIllustration(SCENES[0].image,{ImageClass:f.Image}),image=f.made[0];image.onload();
 let mounted,observed;task.mount({replaceWith:i=>mounted=i},s=>observed=s);
 assert.equal(mounted,image);assert.equal(image.requests.length,1);assert.equal(image.fetchPriority,'high');assert.equal(observed,'loaded');
});
test('failed early preload is visible on mount and retry only reloads that scene',()=>{
 const f=fake(),task=prepareIllustration(SCENES[2].image,{ImageClass:f.Image}),image=f.made[0];image.onerror();
 const states=[];task.mount({replaceWith(){}},s=>states.push(s));assert.equal(states.at(-1),'error');
 task.retry();assert.equal(states.at(-1),'loading');image.onload();assert.equal(states.at(-1),'loaded');assert.deepEqual(image.requests,[SCENES[2].image.src,SCENES[2].image.src]);
});
test('decode rejection is nonfatal and does not block mounting or actions',async()=>{
 const f=fake(),task=prepareIllustration(SCENES[0].image,{ImageClass:f.Image}),image=f.made[0];image.decode=()=>Promise.reject(Error('decode'));
 image.onload();let mounted=false;task.mount({replaceWith(){mounted=true}},()=>{});assert.equal(mounted,true);await new Promise(r=>setImmediate(r));assert.equal(task.status(),'loaded');
});
test('missing image definition performs no request',()=>{const f=fake();assert.equal(prepareIllustration(null,{ImageClass:f.Image}),null);assert.equal(f.made.length,0);});
test('all source dimensions preserved; only3 lightweight WebPs used by passage definitions',()=>{
 assert.deepEqual(SCENES.map(s=>[s.image.width||1080,s.image.height||1249]),[[1024,1536],[1672,941],[1080,1249]]);
 let bytes=0;for(const s of SCENES){assert.match(s.image.src,/-q94\.webp$/);bytes+=fs.statSync(new URL('../'+s.image.src.slice(2),import.meta.url)).size;}
 assert.equal(bytes,1430740);
 const app=fs.readFileSync(new URL('../journey-app.js',import.meta.url),'utf8');
 assert.match(app,/illustration=prepareIllustration\(s.image\)/);
 assert.doesNotMatch(app,/await (?:illustration|.*decode)/);
 assert.match(app,/sceneParagraphs\(s,!!illustration\)/);
 assert.match(app,/挿絵を再読み込み/);
});
