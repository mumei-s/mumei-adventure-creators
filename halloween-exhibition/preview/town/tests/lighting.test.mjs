import test from 'node:test';
import assert from 'node:assert/strict';
import {townLighting,townLanternPosition} from '../lighting.js';
import {createTownRenderer} from '../renderer.js';
import {initialTownState} from '../town-model.js';

test('lighting accepts the full 0–100 scale, defaults to neutral 75, and scopes night to library',()=>{
 const low=townLighting('library',0),neutral=townLighting('library',75),high=townLighting('library',100);
 assert.ok(low.ambient<neutral.ambient&&neutral.ambient<high.ambient);assert.ok(low.sun>0);assert.ok(low.shade<1&&low.shade>neutral.shade&&neutral.shade>high.shade);
 assert.deepEqual(townLighting('library',NaN),neutral);assert.deepEqual(townLighting('library',-10),low);assert.deepEqual(townLighting('library',120),high);
 for(const map of['lantern-town','inn','workshop','clocktower','candle-shop'])assert.equal(townLighting(map).night,false);
 assert.notEqual(townLighting('lantern-town',0).ambient,townLighting('lantern-town',20).ambient);
 assert.deepEqual(townLanternPosition({x:4,z:6},'left'),{x:3.45,z:6});
});

test('2D fallback shades only its scene and reveals a bounded warm pool when lantern is enabled',async()=>{
 const canvases=[];
 const makeCanvas=(width,height)=>{
  const calls=[],context=new Proxy({globalAlpha:1,measureText:()=>({width:30}),createPattern:()=>null,
   createLinearGradient:()=>({addColorStop(){}}),createRadialGradient(...args){calls.push(['gradient',...args]);return {addColorStop(){}};},fillRect(...args){calls.push(['fill',this.fillStyle,...args]);}},
   {get:(target,key)=>key in target?target[key]:(()=>{})});
  const canvas={width,height,calls,getContext:()=>context};canvases.push(canvas);return canvas;
 };
 const renderer=createTownRenderer({makeCanvas,loadImage:async()=>{throw Error('test fallback');},fetcher:async()=>({ok:false})});await renderer.ready;
 const canvas=makeCanvas(420,600),state=initialTownState();state.mapId='library';state.position={x:9.5,z:12.5};
 renderer.render({canvas,state,motion:false,lantern:false,brightness:75});const shade=canvases[0];assert.ok(shade.calls.some(call=>call[0]==='fill'&&call[1]==='rgba(9,18,39,0.78)'));assert.equal(shade.calls.filter(call=>call[0]==='gradient').length,0);
 shade.calls.length=0;renderer.render({canvas,state,motion:false,lantern:true,brightness:75,facing:'up'});
 const pools=shade.calls.filter(call=>call[0]==='gradient');assert.equal(pools.length,1);assert.ok(pools[0][6]>0&&pools[0][6]<150,'pool covers nearby floor, not the entire viewport');
 assert.equal(canvas.width,420);assert.equal(canvas.height,600);renderer.destroy();
});


test('all 2D rooms keep a dark ambient level and a nearby handheld light',()=>{
 for(const map of ['inn','workshop','clocktower','candle-shop','library']){
  for(const brightness of [0,75,100]){const light=townLighting(map,brightness,{interior2D:true});assert.equal(light.night,true);assert.ok(light.shade>=.74);assert.ok(light.lanternRadius<150);}
 }
 assert.deepEqual(townLighting('lantern-town',75,{interior2D:false}),townLighting('lantern-town',75));
});
