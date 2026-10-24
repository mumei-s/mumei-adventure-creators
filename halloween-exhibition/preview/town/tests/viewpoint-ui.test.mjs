import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {viewpointOptions,resolveViewpoint,saveViewpoint} from '../../viewpoint-presets.js';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8'),html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('town exposes one viewpoint entry and preserves every existing view inside its menu',()=>{
 assert.equal((html.match(/id="camera-distance"/g)||[]).length,1);
 assert.doesNotMatch(html,/id="town-view-[23]d"|>2D<|>3D</);
 assert.match(app,/\$\('camera-distance'\)\.onclick=showViewpoints/);
 assert.match(app,/more.label='ほかの視点'/);
 assert.equal(viewpointOptions('town').length,6);
 assert.doesNotMatch(app,/const cameraToggle=|viewSelect\.onchange/);
});
test('town choices change both camera and renderer together without changing progress or zoom',()=>{
 const start=app.indexOf('function chooseTownViewpoint('),end=app.indexOf('function showViewpoints()',start),calls=[],state={mapId:'creator-quarter',flags:{intro:true}},old=JSON.stringify(state),storage=new Map();
 const context=vm.createContext({selectedViewpoint:resolveViewpoint('town','eye'),settings:{view:'3d'},cameraDistance:'normal',cameraZoom:.65,ready:true,
  clearInput(){},saveViewpoint:(page,id)=>saveViewpoint(page,id,{setItem:(key,value)=>storage.set(key,value)}),saveCameraDistance:(page,value)=>calls.push(['distance',value]),persistSettings(){},updateCameraButton(){},renderer:{invalidate(){}},prepareSelectedView(){calls.push(['preload',context.selectedViewpoint.view]);},viewController:{snapshot:()=>({status:'ready'}),setMode:(view,options)=>calls.push(['mode',view,options])},tick(){},state});
 vm.runInContext(app.slice(start,end)+';globalThis.choose=chooseTownViewpoint;',context);
 for(const preset of viewpointOptions('town')){context.choose(preset.id);assert.equal(context.cameraDistance,preset.distance);assert.equal(context.settings.view,preset.view);assert.equal(context.selectedViewpoint.id,preset.id);assert.equal(calls.at(-1)[1],preset.view);}
 assert.equal(context.cameraZoom,.65);assert.equal(JSON.stringify(state),old);assert.equal(storage.size,1);
});
test('fallback and indoor button labels report the actual view, not a successful eye camera',()=>{
 const start=app.indexOf('function updateCameraButton()'),end=app.indexOf("$('camera-distance').onclick",start),button={setAttribute(){},removeAttribute(){}},status={active:'2d',status:'loading'},map={outdoor:true};
 const context=vm.createContext({$:()=>button,selectedViewpoint:resolveViewpoint('town','eye'),viewController:{snapshot:()=>status},getTownMap:()=>map,session:{snapshot:()=>({state:{mapId:'lantern-town'}})}});
 vm.runInContext(app.slice(start,end)+';globalThis.update=updateCameraButton;',context);
 context.update();assert.equal(button.textContent,'視点：見下ろし（準備中）');status.status='failed';context.update();assert.equal(button.textContent,'視点：見下ろし（代替）');status.active='3d';status.status='ready';context.update();assert.equal(button.textContent,'視点：目線');map.outdoor=false;context.update();assert.equal(button.textContent,'視点：見下ろし（屋内）');
});
