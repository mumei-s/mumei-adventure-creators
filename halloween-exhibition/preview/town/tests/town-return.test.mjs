import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createTownSession} from '../controller.js';
import {CREATOR_HOMES,CREATOR_QUARTER_CONNECTION} from '../creator-homes.js';
import {initialTownState,getTownMap,isTownWalkable} from '../town-model.js';
import {createTownStore} from '../save-model.js';
import {createReadingJourney,READING_JOURNEY_KEY} from '../reading-journey.js';

test('all 16 homes return repeatedly from direct travel and walked entry without erasing progress',()=>{
 for(const home of CREATOR_HOMES){
  const original={...initialTownState(),coins:63,steps:82},saved=[];
  const session=createTownSession({state:original,store:{save(state){saved.push(state);return {ok:true};}}});
  for(let repeat=0;repeat<2;repeat++){
   session.visitCreatorHome(home.creatorId);
   assert.equal(session.returnToTown().state.mapId,'lantern-town');
   session.visitCreatorHome(home.creatorId);session.interact(home.id);
   assert.equal(session.snapshot().state.mapId,home.interiorId);
   const returned=session.returnToTown();assert.equal(returned.transition,true);
   assert.deepEqual(returned.state.position,CREATOR_QUARTER_CONNECTION.streetArrival);
   assert(isTownWalkable(returned.state.mapId,returned.state.position.x,returned.state.position.z));
   assert.equal(saved.at(-1).mapId,'lantern-town');assert.equal(session.snapshot().walking,false);
   for(const key of ['coins','steps','inventory','flags','checkpoint','battleReceipts'])assert.deepEqual(returned.state[key],original[key]);
   assert(returned.state.visited.includes(home.interiorId));
   assert.equal(session.returnToTown(),null,'repeated event in town is harmless');
  }
 }
});

test('return cannot escape combat or teleport from unrelated maps',()=>{
 const session=createTownSession();assert.equal(session.returnToTown(),null);
 session.visitCreatorHome(CREATOR_HOMES[0].creatorId);session.beginBattle('clock-shadow');
 assert(session.snapshot().battle);assert.equal(session.returnToTown(),null);
});

test('compact route panel exposes actual town return in every interior and quarter',()=>{
 const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
 const start=source.indexOf('function updateHomeRoute('),end=source.indexOf('\nfunction updateHUD',start);
 const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{dataset:{},style:{},setAttribute(k,v){this[k]=v;},removeAttribute(k){delete this[k];}});return nodes.get(id);};
 const context=vm.createContext({$:node,getTownMap,CREATOR_HOMES,getCreatorHome:()=>CREATOR_HOMES[0],ready:true,readingJourney:null,homeRouteSignature:'',activeTownRenderer:()=>null,Math});
 vm.runInContext(source.slice(start,end)+';globalThis.run=updateHomeRoute;',context);
 for(const mapId of ['creator-quarter',...CREATOR_HOMES.map(h=>h.interiorId)]){
  context.run({...initialTownState(),mapId});assert.equal(node('home-route').hidden,false);assert.equal(node('home-route-title').textContent,'町へ戻る');assert.equal(node('home-route')['aria-haspopup'],undefined);
 }
 context.run(initialTownState());assert.equal(node('home-route-title').textContent,'参加者の家・アトリエ');assert.equal(node('home-route')['aria-haspopup'],'dialog');
});


test('return saves the new location while preserving read marks and other games byte-for-byte',()=>{
 const data=new Map([['halloween-exhibition:labyrinth:v1','preserve-adventure'],['halloween-yearbook:theatre-return:v1','preserve-exhibition']]);
 const storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
 const id=CREATOR_HOMES[0].creatorId,url=`https://note.com/${id}/n/n123`,people=[{id,name:'Creator',works:[{url,title:'Story'}]}];
 const journey=createReadingJourney({storage,people});journey.openArticle(id,url);journey.markRead(id,url);const reading=data.get(READING_JOURNEY_KEY);
 const session=createTownSession({store:createTownStore(storage)});session.visitCreatorHome(id);session.interact(CREATOR_HOMES[0].id);session.returnToTown();
 assert.equal(createTownStore(storage).load().state.mapId,'lantern-town');assert.equal(data.get(READING_JOURNEY_KEY),reading);
 assert.equal(createReadingJourney({storage,people}).snapshot().readCount,1);
 assert.equal(data.get('halloween-exhibition:labyrinth:v1'),'preserve-adventure');assert.equal(data.get('halloween-yearbook:theatre-return:v1'),'preserve-exhibition');
});

test('actual return action applies a map transition and restores canvas focus without browser history',()=>{
 const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8'),start=source.indexOf('function returnToTown('),end=source.indexOf('\nfunction updateHomeRoute',start),calls=[];
 const session=createTownSession();session.visitCreatorHome(CREATOR_HOMES[0].creatorId);session.interact(CREATOR_HOMES[0].id);
 const context=vm.createContext({ready:true,session,applyInteraction:result=>calls.push(result),updateHomeRoute:state=>calls.push(state.mapId),updateHUD:()=>calls.push('hud'),$:id=>({hidden:true,focus:()=>calls.push('focus:'+id)})});
 vm.runInContext(source.slice(start,end)+';returnToTown();',context);
 assert.equal(calls[0].transition,true);assert.equal(calls[0].state.mapId,'lantern-town');assert.deepEqual(calls.slice(1),['lantern-town','hud','focus:town-canvas']);
});

test('compact return panel shares a stacking container with notices and retains touch size in landscape',()=>{
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8'),css=fs.readFileSync(new URL('../style.css',import.meta.url),'utf8');
 assert.match(html,/<div class="town-route-controls"><div id="town-mode-banner"[\s\S]*?<button id="home-route"[\s\S]*?<\/button><\/div><canvas id="town-canvas"/);
 assert.match(css,/\.town-route-controls\{[^}]*flex-direction:column/);
 assert.match(css,/\.town-world \.town-route-controls \.home-route\{[^}]*position:static;[^}]*max-width:100%;min-height:44px/);
 assert.match(css,/@media\(max-height:480px\)\{[^\n]*data-return-to-town="true"\] small\{display:none/);
});
