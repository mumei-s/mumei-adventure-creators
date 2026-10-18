import test from 'node:test';
import assert from 'node:assert/strict';
import {createSceneNameOverlay} from '../scene-names.js';
class Node{
 constructor(document){this.ownerDocument=document;this.children=[];this.attributes={};this.hidden=false;this.writes=0;this.style=new Proxy({},{set:(object,key,value)=>{this.writes++;object[key]=value;return true;}});}
 append(node){node.parentElement=this;this.children.push(node);}
 remove(){const parent=this.parentElement;if(parent)parent.children=parent.children.filter(child=>child!==this);this.parentElement=null;}
 setAttribute(key,value){this.attributes[key]=value;}
 get textContent(){return this.text||'';}
 set textContent(value){this.writes++;this.text=value;}
 getBoundingClientRect(){return {left:0,top:0,width:400,height:300};}
}
function fixture(){const document={createElement(){return new Node(document);}},container=new Node(document),binding=createSceneNameOverlay(container);return {container,overlay:container.children[0],...binding};}
const map=tiles=>({id:'town',tiles:tiles||Array(12).fill('............'),npcs:[],buildings:[]});
const state={position:{x:1.5,z:1.5}};
const project=point=>({x:point.x*24,y:point.z*20});
const visible=fixture=>fixture.overlay.children.filter(node=>!node.hidden);

test('overlay shows creator names once per group and omits companions and noninteractive actors',()=>{
 const f=fixture(),actors=[{id:'a',creatorId:'creator',groupId:'trio',name:'Old title',x:3,z:2},{id:'b',creatorId:'creator',groupId:'trio',name:'Second member',x:4,z:2},{id:'black-cat',name:'黒猫',x:2,z:2},{id:'silent',name:'Silent',interactive:false,x:2,z:3},{id:'other-map',name:'Elsewhere',mapId:'elsewhere',x:2,z:2}];
 f.update({map:map(),state,actors,homes:[{creatorId:'creator',creatorName:'凛🦁｜転職活動中'}],project});
 assert.equal(f.overlay.className,'scene-names');assert.equal(f.overlay.attributes['aria-hidden'],'true');assert.deepEqual(visible(f).map(node=>node.textContent),['凛🦁']);assert.match(visible(f)[0].className,/scene-name-person/);
});
test('creator deduplication also works for distinct group IDs with the same creator',()=>{
 const f=fixture();f.update({map:map(),state,actors:[{id:'1',creatorId:'same',groupId:'one',name:'Creator',x:2,z:2},{id:'2',creatorId:'same',groupId:'two',name:'Creator',x:3,z:2}],project});assert.equal(visible(f).length,1);
});
test('residents get their own names while stone walls and buildings occlude people',()=>{
 for(const obstruction of ['#','b']){
  const f=fixture(),scene=map(['........','........','..'+obstruction+'.....','........']);scene.npcs=[{id:'open',name:'パン屋ミレット',x:1.5,z:2.5},{id:'blocked',name:'隠れた住民',x:3.5,z:2.5}];
  f.update({map:scene,state:{position:{x:1.5,z:2.5}},actors:[{id:'creator',name:'Hidden creator',x:3.5,z:2.5}],project});assert.deepEqual(visible(f).map(node=>node.textContent),['パン屋ミレット']);
 }
});
test('a river is transparent to names, and diagonal wall corners remain opaque',()=>{
 const f=fixture(),scene=map(['........','........','..~.....','........']);scene.npcs=[{id:'other-bank',name:'向こう岸の人',x:3.5,z:2.5}];f.update({map:scene,state:{position:{x:1.5,z:2.5}},project});assert.equal(visible(f)[0].textContent,'向こう岸の人');
 const corner=map(['.....','..#..','.....','.....']);corner.npcs=[{id:'corner',name:'石の向こう',x:3.5,z:3.5}];f.update({map:corner,state,project});assert.equal(visible(f).length,0);
});
test('home labels use the short creator name on the front wall above the doorstep',()=>{
 for(const homes of [[{creatorId:'owner',creatorName:'無名S note｜主催'}],new Map([['owner',{creatorName:'無名S note｜主催'}]]),{owner:{creatorName:'無名S note｜主催'}}]){
  const f=fixture(),points=[],scene=map();scene.buildings=[{id:'home',kind:'creator-home',creatorId:'owner',creatorName:'Fallback',door:{x:4.5,z:4.5}},{id:'shop',kind:'shop',name:'Shop',door:{x:2,z:2}}];
  f.update({map:scene,state,homes,project:point=>{points.push(point);return project(point);}});assert.deepEqual(visible(f).map(node=>node.textContent),['無名S noteの家']);assert.deepEqual(points,[{x:4.5,y:2.2,z:4.2}]);assert.match(visible(f)[0].className,/scene-name-home/);
 }
});
test('home labels project a stable facade height and stay centered on the house at either renderer zoom',()=>{
 const scene=map();scene.buildings=[{id:'home',kind:'creator-home',creatorName:'カモミール',x:3,z:3,w:7,h:5,door:{x:6.5,z:8.5}}];
 for(const scale of [.6,1,1.7]){
  const f=fixture(),points=[];
  f.update({map:scene,state,project:point=>{points.push(point);return{x:200,y:210-point.y*40*scale};}});
  assert.deepEqual(points,[{x:6.5,y:2.2,z:8.2}]);
  assert.equal(visible(f)[0].style.top,Math.round(210-2.2*40*scale-9)+'px');
  assert.equal(visible(f)[0].textContent,'カモミールの家');
 }
});
test('offscreen points are omitted, edge names stay inside the viewport and nearby labels separate',()=>{
 const f=fixture(),scene=map(),actors=[{id:'a',name:'あいはん',x:2,z:2},{id:'b',name:'カモミール',x:3,z:2},{id:'c',name:'Offscreen',x:4,z:2}];
 f.update({map:scene,state,actors,project:point=>({x:point.x===4?-1:1,y:10})});const names=visible(f);assert.equal(names.length,2);assert.notEqual(names[0].style.top,names[1].style.top);for(const name of names){assert(parseFloat(name.style.left)>=8);assert(parseFloat(name.style.top)>=8);assert(parseFloat(name.style.top)<=274);assert(parseFloat(name.style.maxWidth)<=384);}
});
test('unchanged labels reuse DOM nodes without repeating text or style writes',()=>{
 const f=fixture(),input={map:map(),state,actors:[{id:'a',name:'ミナト汐',x:2,z:2}],project};f.update(input);const node=visible(f)[0],writes=node.writes;f.update(input);assert.equal(visible(f)[0],node);assert.equal(node.writes,writes);
 f.update({...input,project:()=>({x:140,y:140})});assert.equal(visible(f)[0],node);assert(node.writes>writes);f.update({...input,actors:[]});assert(node.hidden);f.update(input);assert.equal(visible(f)[0],node);
});
test('visible and retained label counts stay bounded at 32 during large roster changes',()=>{
 const f=fixture(),scene=map(Array(80).fill('.'.repeat(80))),actors=Array.from({length:60},(_,index)=>({id:'actor-'+index,name:'Creator '+index,x:2+index/10,z:2}));
 f.update({map:scene,state,actors,project:()=>({x:200,y:150})});assert.equal(visible(f).length,32);assert.equal(f.overlay.children.length,32);
 f.update({map:scene,state,actors:actors.map(actor=>({...actor,id:actor.id+'next'})),project:()=>({x:200,y:150})});assert.equal(visible(f).length,32);assert.equal(f.overlay.children.length,32);
});
test('clear and destroy remove stale names safely without rendering on a destroyed overlay',()=>{
 const f=fixture(),input={map:map(),state,actors:[{id:'a',name:'たんたん',x:2,z:2}],project};f.update(input);f.clear();assert.equal(visible(f).length,0);f.update(input);assert.equal(visible(f).length,1);f.destroy();assert.equal(f.container.children.length,0);f.update(input);f.destroy();assert.equal(f.container.children.length,0);
});
test('long creator descriptions stay short, and invalid projections never create labels',()=>{
 const f=fixture();f.update({map:map(),state,actors:[{id:'a',name:'あ'.repeat(40),x:2,z:2},{id:'b',name:'Invalid',x:3,z:2}],project:point=>point.x===3?{x:NaN,y:10}:project(point)});assert.equal(visible(f).length,1);assert.equal(Array.from(visible(f)[0].textContent).length,22);assert(visible(f)[0].textContent.endsWith('…'));
 f.update({map:map(),state,actors:[],project});assert.equal(visible(f).length,0);
});
