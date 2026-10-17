import test from 'node:test';
import assert from 'node:assert/strict';
import {TOWN_UI_KEY,normalizeTownPreferences,readTownPreferences,saveTownPreferences,resolveTownLayout} from '../preferences.js';
test('town preferences retain real brightness/layout/speed choices without storing or restoring audio',()=>{
 const data=new Map([['halloween-exhibition:visitor-preferences:v1','original-audio'],['halloween-exhibition:labyrinth:v1','original-progress']]),writes=[],storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>{writes.push(key);data.set(key,value);}};
 assert.equal(readTownPreferences(storage).preferences.brightness,75);for(const layout of ['auto','phone','tablet','desktop']){const saved=saveTownPreferences({brightness:60,lantern:false,motion:false,layout,speed:1.25,volume:100,music:true},storage);assert(saved.ok);assert.equal(readTownPreferences(storage).preferences.layout,layout);assert.equal(readTownPreferences(storage).preferences.speed,1.25);const value=JSON.parse(data.get(TOWN_UI_KEY));assert.equal(value.volume,undefined);assert.equal(value.music,undefined);}
 assert(writes.every(key=>key===TOWN_UI_KEY));assert.equal(data.get('halloween-exhibition:visitor-preferences:v1'),'original-audio');assert.equal(data.get('halloween-exhibition:labyrinth:v1'),'original-progress');
});
test('unknown values and denied persistence keep safe defaults and usable local choices',()=>{
 assert.deepEqual(normalizeTownPreferences({brightness:Infinity,layout:'constructor',speed:999}),{view:'3d',brightness:75,lantern:true,motion:true,layout:'auto',speed:1});const denied={getItem(){throw Error('denied')},setItem(){throw Error('denied')}};assert.equal(readTownPreferences(denied).saved,false);const result=saveTownPreferences({brightness:0,layout:'desktop',speed:.75},denied);assert.equal(result.ok,false);assert.equal(result.preferences.brightness,0);assert.equal(result.preferences.layout,'desktop');
 for(const width of [320,680,681,1100,1101])assert.equal(resolveTownLayout('desktop',width),'desktop');assert.equal(resolveTownLayout('auto',320),'phone');assert.equal(resolveTownLayout('auto',900),'tablet');assert.equal(resolveTownLayout('auto',1280),'desktop');
});

test('3D/2D view choice persists separately from the unchanged town journey',()=>{
 const values=new Map(),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
 assert.equal(readTownPreferences(storage).preferences.view,'3d');
 saveTownPreferences({...readTownPreferences(storage).preferences,view:'2d'},storage);
 assert.equal(readTownPreferences(storage).preferences.view,'2d');assert.deepEqual([...values.keys()],[TOWN_UI_KEY]);
});
