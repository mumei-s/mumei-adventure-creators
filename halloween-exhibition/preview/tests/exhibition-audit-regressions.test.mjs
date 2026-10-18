import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createArtLibrary} from '../maze/rpg-art.js';
import {createChangeTracker,setChangedProperty,setChangedAttribute} from '../maze/change-only-ui.js';
import {createExhibitResources} from '../maze/exhibit-resources.js';
import {schedulePalaceResidents} from '../palace-startup.js';
const app=readFileSync(new URL('../maze/app.js',import.meta.url),'utf8');
const world=readFileSync(new URL('../maze/world.js',import.meta.url),'utf8');
const flush=()=>new Promise(resolve=>setImmediate(resolve));

test('maze does not request any optional scene images before explicit start',()=>{
 const calls=[],art=createArtLibrary({loadPlayer:false,deferOptional:true,deferScene:true,loadImage:url=>{calls.push(url);return new Promise(()=>{});}});
 assert.equal(calls.length,0);art.startScene();assert.equal(calls.length,16);art.startScene();assert.equal(calls.length,16);
 art.loadRemaining();assert.equal(calls.length,22);art.loadRemaining();assert.equal(calls.length,22);
 assert.match(app,/createArtLibrary\(\{loadPlayer:false,deferOptional:true,deferScene:true\}\)/);
 assert.ok(app.indexOf('void rpgArt.startScene()')>app.indexOf('gameReady=true;loading.hidden=true'));
});
test('existing eager art callers keep automatic scene loading',async()=>{
 const calls=[],art=createArtLibrary({motionData:{},loadPlayer:false,loadImage:async url=>(calls.push(url),{width:512,height:512})});
 await art.ready;assert.ok(calls.length>16);assert.ok(art.images.palaceAtlas);assert.ok(art.images.battle);
});
test('deferred scene readiness resolves once and preserves supplied hero',async()=>{
 const hero={width:100,height:100},art=createArtLibrary({motionData:{},loadPlayer:false,deferOptional:true,deferScene:true,loadImage:async()=>({width:512,height:512})});
 art.setPlayerAtlas(hero);await art.startScene();await art.loadRemaining();await art.ready;assert.equal(art.images.playerAtlas,hero);assert.ok(art.images.palaceAtlas);
});

test('actual minimap update skips identical frames but keeps moving markers and state changes',()=>{
 const source=app.slice(app.indexOf('const minimapChanges='),app.indexOf('function drawMap('));
 let pose={x:1,z:2},draws=0;const state={x:1,z:1,yaw:0},canvas={width:170,height:170};
 const update=Function('createChangeTracker','$','state','readyMonsters','monsterPose','monsterAvailable','cleared','encounters','motion','reducedMotion','time','mapHeading','view','facing','drawMap',source+';return updateMinimap;')(createChangeTracker,()=>canvas,state,()=>[{id:'ghost',icon:'👻'}],()=>pose,()=>true,[],true,true,{matches:false},0,()=>0,'2d','down',()=>draws++);
 update();for(let i=0;i<60;i++)update();assert.equal(draws,1);
 pose={x:1.2,z:2};update();assert.equal(draws,2);
 state.hasKey=true;update();assert.equal(draws,3);canvas.width=180;update();assert.equal(draws,4);
});
test('actual HUD performs zero same-value property writes including scenery label',()=>{
 let writes=0;const nodes=new Map();const node=id=>{if(!nodes.has(id)){const values={};const attrs=new Map();nodes.set(id,new Proxy({getAttribute:k=>attrs.get(k)??null,setAttribute(k,v){writes++;attrs.set(k,v)}},{get:(o,k)=>k in o?o[k]:values[k],set:(o,k,v)=>(writes++,values[k]=v,true)}));}return nodes.get(id);};
 const source=app.slice(app.indexOf('function updateHUD(){'),app.indexOf('\nfunction showEncounters()'));
 const update=Function('$','setChangedProperty','setChangedAttribute','state','creatorJourney','chapterFor','cleared','reachedVault','nearby','contextTarget','actionButtonFor',source+';return updateHUD;')(node,setChangedProperty,setChangedAttribute,{x:1,z:1},()=>({active:false}),()=>({objective:'Walk'}),[],false,()=>null,()=>({kind:'scenery',name:'Bookcase'}),()=> 'interact');
 update();assert.ok(writes>0);writes=0;for(let i=0;i<60;i++)update();assert.equal(writes,0);
});

function scheduler(loadResidents){
 const callbacks=new Map(),listeners=new Map();let serial=0,observerCallback;
 const eventTarget=()=>({addEventListener(k,f){if(!listeners.has(k))listeners.set(k,new Set());listeners.get(k).add(f)},removeEventListener(k,f){listeners.get(k)?.delete(f)}});
 const win={...eventTarget(),navigator:{},MutationObserver:class{constructor(cb){observerCallback=cb}observe(){}disconnect(){}}};
 const doc={...eventTarget(),hidden:false,defaultView:win},root={ownerDocument:doc,dataset:{theaterReady:'ready',archiveState:'ready',palaceState:'palace'}};
 const stop=schedulePalaceResidents(root,{ready:Promise.resolve(),loadResidents,timers:{setTimeout(f){callbacks.set(++serial,f);return serial},clearTimeout(id){callbacks.delete(id)}}});
 return {doc,win,root,callbacks,stop,emit(event){for(const f of listeners.get(event)||[])f()},fire(){const entry=callbacks.entries().next().value;if(entry){callbacks.delete(entry[0]);entry[1]()}}};
}
test('resident enhancement resumes after hidden deadline and initializes only once',async()=>{
 let loads=0;const f=scheduler(async()=>({initPalaceLivingScene(){loads++}}));await flush();f.doc.hidden=true;f.fire();await flush();assert.equal(loads,0);
 f.doc.hidden=false;f.emit('visibilitychange');assert.equal(f.callbacks.size,1);f.fire();await flush();assert.equal(loads,1);f.emit('pageshow');assert.equal(f.callbacks.size,0);
});
test('resident enhancement resumes after pagehide/pageshow without attribute mutation',async()=>{
 let loads=0;const f=scheduler(async()=>({initPalaceLivingScene(){loads++}}));await flush();f.emit('pagehide');assert.equal(f.callbacks.size,0);f.emit('pageshow');f.fire();await flush();assert.equal(loads,1);
});
test('resident import retry is bounded and a later return can retry again',async()=>{
 let loads=0;const f=scheduler(async()=>{loads++;throw Error('offline')});await flush();f.fire();await flush();assert.equal(loads,1);f.fire();await flush();assert.equal(loads,2);assert.equal(f.callbacks.size,0);
 f.emit('pageshow');f.fire();await flush();assert.equal(loads,3);f.stop();assert.equal(f.callbacks.size,0);
});
test('resident pending idle callback is harmless after cancellation',async()=>{
 let loads=0,begin;const f=scheduler(async()=>({initPalaceLivingScene(){loads++}}));f.win.requestIdleCallback=cb=>(begin=cb,1);f.win.cancelIdleCallback=()=>{};await flush();f.fire();f.stop();begin();await flush();assert.equal(loads,0);
});

test('exhibit ownership stays bounded over 20 replacements and excludes shared resources',()=>{
 const shared={dispose(){throw Error('Shared geometry must survive')}},parent=new Set([shared]),scope=createExhibitResources(parent);let releases=0;
 for(let i=0;i<20;i++){const generation=scope.reset();for(let j=0;j<3;j++)scope.track({dispose(){releases++}},generation);assert.equal(scope.size,3);assert.equal(parent.size,4);}
 assert.equal(releases,57);scope.dispose();scope.dispose();assert.equal(releases,60);assert.equal(parent.size,1);
});
test('late exhibit textures are disposed after replacement or world disposal',()=>{
 const parent=new Set(),scope=createExhibitResources(parent);const old=scope.reset();scope.reset();let releases=0;assert.equal(scope.track({dispose(){releases++}},old),false);scope.dispose();assert.equal(scope.track({dispose(){releases++}}),false);assert.equal(releases,2);assert.equal(parent.size,0);
});
test('actual exhibit setter releases placeholders and rejects stale image callbacks',()=>{
 const resources=new Set(),scope=createExhibitResources(resources),callbacks=[];let releases=0;const resource=()=>({dispose(){releases++}});
 const THREE={Group:class{constructor(){this.position={set(){}};this.rotation={}}},MeshBasicMaterial:class{constructor(x){Object.assign(this,x)}dispose(){releases++}},PlaneGeometry:class{dispose(){releases++}},SRGBColorSpace:'srgb'};
 const group={children:[],remove(x){this.children.splice(this.children.indexOf(x),1)},add(x){this.children.push(x)}};
 const body=world.slice(world.indexOf('  function setExhibits('),world.indexOf('  function creatorNameTexture('));
 const setter=Function('THREE','resources','exhibitResources','exhibitGroup','FEATURES','point','box','gold','textTexture','mesh','textureLoader','disposed',body+';return setExhibits;')(THREE,resources,scope,group,{article:{}},()=>({x:0,z:0}),()=>{},null,()=>{const r=resource();resources.add(r);return r},g=>resources.add(g),{load(src,cb){callbacks.push(cb)}},false);
 setter([{image:'one.webp'}]);assert.equal(resources.size,3);callbacks[0](resource());assert.equal(resources.size,3);assert.equal(releases,1);
 setter([{image:'two.webp'}]);assert.equal(resources.size,3);callbacks[0](resource());assert.equal(resources.size,3);assert.equal(releases,5);
 scope.dispose();callbacks[1](resource());assert.equal(resources.size,0);assert.equal(group.children.length,1);
 assert.match(world,/disposed=true;exhibitResources\.dispose\(\)/);
});
