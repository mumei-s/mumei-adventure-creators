import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {viewpointOptions,cycleViewpoint,migrateViewpoint,resolveViewpoint,saveViewpoint} from '../../viewpoint-presets.js';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8'),html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('town exposes two direct native arrows and a current-view label, never a viewpoint modal',()=>{
 for(const id of ['camera-distance','viewpoint-prev','viewpoint-next'])assert.equal((html.match(new RegExp(`id="${id}"`,'g'))||[]).length,1);
 assert.match(html,/<span id="camera-distance"[^>]*role="status"/);
 assert.doesNotMatch(html,/id="town-view-[23]d"|>2D<|>3D<|id="camera-distance"[^>]*aria-haspopup/);
 assert.match(app,/\$\('viewpoint-prev'\)\.onclick=\(\)=>cycleTownViewpoint\(-1\)/);
 assert.match(app,/\$\('viewpoint-next'\)\.onclick=\(\)=>cycleTownViewpoint\(1\)/);
 assert.doesNotMatch(app,/showViewpoints|kind:'viewpoint'|const cameraToggle=|viewSelect\.onchange/);
 assert.equal(viewpointOptions('town').length,6);
});
test('town arrows wrap all viewpoints both ways without changing progress or zoom or opening a panel',()=>{
 const start=app.indexOf('function chooseTownViewpoint('),end=app.indexOf('function showWalkingSpeed()',start),calls=[],state={mapId:'creator-quarter',flags:{intro:true},position:{x:11,z:17},inventory:{key:1}},old=JSON.stringify(state),storage=new Map();
 const context=vm.createContext({cycleViewpoint,selectedViewpoint:resolveViewpoint('town','eye'),settings:{view:'3d'},cameraDistance:'normal',cameraZoom:.65,ready:true,
  clearInput(){},saveViewpoint:(page,id)=>saveViewpoint(page,id,{setItem:(key,value)=>storage.set(key,value)}),saveCameraDistance:(page,value)=>calls.push(['distance',value]),persistSettings(){},updateCameraButton(){},renderer:{invalidate(){}},prepareSelectedView(){calls.push(['preload',context.selectedViewpoint.view]);},viewController:{snapshot:()=>({status:'ready'}),setMode:(view,options)=>calls.push(['mode',view,options])},tick(){calls.push(['paint']);},state});
 vm.runInContext(app.slice(start,end)+';globalThis.choose=chooseTownViewpoint;globalThis.cycle=cycleTownViewpoint;',context);
 for(const direction of [1,-1])for(let i=0;i<6;i++){
  const expected=cycleViewpoint('town',context.selectedViewpoint.id,direction);context.cycle(direction);
  assert.equal(context.cameraDistance,expected.distance);assert.equal(context.settings.view,expected.view);assert.equal(context.selectedViewpoint.id,expected.id);assert.equal(calls.at(-1)[0],'paint');
 }
 assert.equal(context.selectedViewpoint.id,'eye');assert.equal(context.cameraZoom,.65);assert.equal(JSON.stringify(state),old);assert.equal(storage.size,1);
});
test('actual fallback and indoor labels remain distinct from saved choice and arrows announce their target',()=>{
 const start=app.indexOf('function updateCameraButton()'),end=app.indexOf("$('viewpoint-prev').onclick",start),nodes=new Map(),status={active:'2d',status:'loading'},map={outdoor:true};
 const node=id=>{if(!nodes.has(id))nodes.set(id,{attributes:{},setAttribute(k,v){this.attributes[k]=v;}});return nodes.get(id);};
 const context=vm.createContext({$:node,cycleViewpoint,migrateViewpoint,cameraDistance:'normal',selectedViewpoint:resolveViewpoint('town','eye'),viewController:{snapshot:()=>status},getTownMap:()=>map,session:{snapshot:()=>({state:{mapId:'lantern-town'}})}});
 vm.runInContext(app.slice(start,end)+';globalThis.update=updateCameraButton;',context);
 context.update();assert.equal(node('camera-distance').textContent,'見下ろし（準備中）');status.status='failed';context.update();assert.equal(node('camera-distance').textContent,'見下ろし（代替）');
 assert.match(node('camera-distance').attributes['aria-description'],/選択：目線/);assert.match(node('viewpoint-prev').attributes['aria-label'],/立体の俯瞰（遠景）/);
 context.selectedViewpoint=resolveViewpoint('town','angled-far');context.cameraDistance='far';context.update();assert.equal(node('camera-distance').textContent,'遠景（代替）');
 context.selectedViewpoint=resolveViewpoint('town','eye');status.active='3d';status.status='ready';context.update();assert.equal(node('camera-distance').textContent,'目線');map.outdoor=false;context.update();assert.equal(node('camera-distance').textContent,'見下ろし（屋内）');
});

test('town retry feedback survives immediate results and module failure exposes only the save-and-reload action',()=>{
 const start=app.indexOf('function updateViewUI('),end=app.indexOf('function updateEyeControls(',start),nodes=new Map();
 const node=id=>{if(!nodes.has(id))nodes.set(id,{attributes:{},setAttribute(k,v){this.attributes[k]=v;}});return nodes.get(id);};
 const context=vm.createContext({$:node,document:{activeElement:null,querySelector:()=>null},clearInput(){},returnFocus:null,selectedViewpoint:resolveViewpoint('town','eye'),updateCameraButton(){},updateEyeControls(){},scheduleResize(){}});
 vm.runInContext(app.slice(start,end)+';globalThis.update=updateViewUI;',context);
 context.update({active:'2d',status:'loading',attempt:2});assert.equal(node('town-mode-banner').hidden,false);assert.match(node('town-mode-message').textContent,/準備 2回目.*準備中/);
 context.update({active:'2d',status:'failed',attempt:2,failureReason:'読み込み失敗',failure:{requiresReload:true}});assert.equal(node('town-mode-retry').hidden,true);assert.equal(node('town-mode-reload').hidden,false);
 context.update({active:'3d',status:'ready',attempt:3});assert.equal(node('town-mode-banner').hidden,true);assert.equal(node('viewpoint-result').hidden,false);assert.match(node('viewpoint-result').textContent,/準備 3回目 完了/);assert.equal(node('town-mode-reload').hidden,true);
 assert.match(app,/\$\('town-mode-reload'\)\.onclick=\(\)=>void pageReload.controller.run\(\)/);
});
