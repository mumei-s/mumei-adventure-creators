import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {CREATOR_HOMES,getCreatorHome} from '../creator-homes.js';
import {creatorHomeProfile} from '../creator-home-profile.js';
import {createTownSession} from '../controller.js';
import {createReadingJourney} from '../reading-journey.js';
const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8'),archive=JSON.parse(fs.readFileSync(new URL('../../data/archive.json',import.meta.url),'utf8'));
function interactHarness(home,{mapId='creator-quarter',position=home.door}={}){
 const calls=[],state={mapId,position};const context={ready:true,CREATOR_HOMES,Math,session:{snapshot:()=>({state}),interact:(...args)=>calls.push(['story',...args])},contextTarget:()=>({id:home.id}),characterArt:{visitor:()=>null},showCreatorHome:id=>calls.push(['home',id]),showVisitor:()=>{},applyInteraction:()=>{}};
 vm.runInNewContext(source.match(/^function interact\(targetId,choiceId\).*$/m)[0]+';this.run=interact;',context);return {calls,run:context.run};
}
test('each real front door opens its own creator page while remote or other-map interaction cannot',()=>{
 for(const home of CREATOR_HOMES){const valid=interactHarness(home);valid.run();assert.deepEqual(valid.calls,[['home',home.creatorId]]);assert.ok(creatorHomeProfile(archive,home.creatorId));
 for(const opts of[{mapId:'lantern-town'},{position:{x:home.door.x+3,z:home.door.z}}]){const far=interactHarness(home,opts);far.run(home.id);assert.deepEqual(far.calls,[]);}}
});
function node(tag,text,cls){return {tag,textContent:text,className:cls,children:[],append(...items){this.children.push(...items)},remove(){},style:{setProperty(){}},setAttribute(){}};}
test('home page includes the correct official note and real works, and pending homes keep their profile',()=>{
 const target=source.slice(source.indexOf('function showCreatorHome('),source.indexOf('function showCreatorHomes(')).replaceAll('import.meta.url',JSON.stringify('https://example.test/preview/town/app.js'));
 for(const home of CREATOR_HOMES){const items=[],actions=[],context={readingJourney:null,appendReadingMark(){},getCreatorHome,URL,characterArt:{creatorPage:id=>creatorHomeProfile(archive,id)},beginPanel:(...args)=>actions.push(args),el:node,button:(text,onclick)=>({...node('button',text),onclick}),content:{append:(...nodes)=>items.push(...nodes)},showCreatorHomes:()=>{},closePanel:()=>actions.push('closed')};
 vm.runInNewContext(target+';this.run=showCreatorHome;',context);context.run(home.creatorId);
 const official=items.find(item=>item.tag==='a'&&item.className==='button-link primary');assert.equal(official.href,archive.creators.find(person=>person.id===home.creatorId).profileURL);assert.equal(official.target,'_blank');assert.equal(official.rel,'noopener noreferrer');
 const cards=items.filter(item=>item.className==='town-card creator-home-work');assert.equal(cards.length,creatorHomeProfile(archive,home.creatorId).works.length);if(['grand_daisy8632'].includes(home.creatorId)){assert.equal(cards.length,0);assert.ok(items.some(item=>item.textContent?.includes('参加作品は準備中')));}
 items.find(item=>item.textContent==='街歩きに戻る').onclick();assert.equal(actions.at(-1),'closed');}
});
function homesHarness({ready=true,reading=true}={}){
 const items=[],panels=[],travelIds=[],transitions=[],saved=[],session=createTownSession({store:{save(state){saved.push(structuredClone(state));return {ok:true};}}});
 const actualVisit=session.visitCreatorHome;session.visitCreatorHome=id=>{travelIds.push(id);return actualVisit(id);};
 const people=CREATOR_HOMES.map(home=>creatorHomeProfile(archive,home.creatorId)),readingJourney=reading?createReadingJourney({people,storage:null}):null;
 const context={ready,session,readingJourney,CREATOR_HOMES,getCreatorHome,URL,
  characterArt:{creatorPage:id=>creatorHomeProfile(archive,id)},appendReadingMark(){},
  beginPanel:title=>{items.length=0;panels.push(title);},el:node,button:(text,onclick,cls)=>({...node('button',text,cls),onclick}),
  content:{append:(...nodes)=>items.push(...nodes)},showMap(){},closePanel(){},applyInteraction:result=>transitions.push(result)};
 const functions=source.slice(source.indexOf('function showCreatorHome('),source.indexOf('function showVisitors(')).replaceAll('import.meta.url',JSON.stringify('https://example.test/preview/town/app.js'));
 vm.runInNewContext(functions+';this.list=showCreatorHomes;this.page=showCreatorHome;this.travel=visitCreatorHome;',context);
 return {...context,items,panels,travelIds,transitions,saved};
}
test('each listed physical visit reaches its own real house while its separate profile button remains correct',()=>{
 for(const [index,home] of CREATOR_HOMES.entries()){
  const harness=homesHarness();harness.list();const list=harness.items.find(item=>item.className==='inventory-list');
  assert.equal(list.children.length,CREATOR_HOMES.length);const card=list.children[index];assert.equal(card.children.find(item=>item.tag==='h3').textContent,home.creatorName);
  const go=card.children.find(item=>item.tag==='button'&&item.textContent==='この家へ行く'),profile=card.children.find(item=>item.tag==='button'&&item.textContent==='クリエイターページを見る');
  assert.equal(go.className,'primary');assert.equal(profile.disabled,false);go.onclick();
  assert.deepEqual(harness.travelIds,[home.creatorId]);assert.equal(harness.transitions.length,1);assert.equal(harness.transitions[0].transition,true);
  const state=harness.session.snapshot().state;assert.equal(state.mapId,'creator-quarter');assert.equal(state.position.x,home.door.x);assert.ok(state.position.z>home.door.z);assert.ok(state.position.z-home.door.z<1.65);assert.equal(state.facing,'up');assert.equal(harness.session.target().creatorId,home.creatorId);assert.equal(harness.saved.length,1);
  assert.deepEqual(harness.panels,['参加者の家'],'travel closes into the world instead of replacing it with a creator page');
  const journey=harness.readingJourney.snapshot();assert.equal(journey.readCount,0);assert.equal(journey.openedCount,0);if(journey.people.some(person=>person.id===home.creatorId))assert.equal(journey.selectedId,home.creatorId);
  profile.onclick();assert.equal(harness.panels.at(-1),home.creatorName+'のクリエイターページ');
  const official=harness.items.find(item=>item.tag==='a'&&item.className==='button-link primary');assert.equal(official.href,creatorHomeProfile(archive,home.creatorId).profileURL);assert.equal(harness.readingJourney.snapshot().readCount,0,'visiting a page never silently records reading');
 }
});
test('the housing-street action reaches the selected house and can fall back before a reading journey exists',()=>{
 const selected=homesHarness(),person=selected.readingJourney.snapshot().people.at(-1);selected.readingJourney.select(person.id);selected.list();
 selected.items.find(item=>item.tag==='button'&&item.textContent==='住宅街へ行く').onclick();assert.deepEqual(selected.travelIds,[person.id]);assert.equal(selected.session.target().creatorId,person.id);
 const fallback=homesHarness({reading:false});fallback.list();fallback.items.find(item=>item.tag==='button'&&item.textContent==='住宅街へ行く').onclick();assert.deepEqual(fallback.travelIds,[CREATOR_HOMES[0].creatorId]);assert.equal(fallback.session.target().creatorId,CREATOR_HOMES[0].creatorId);
});
test('travel UI cannot bypass readiness or an active battle',()=>{
 const unready=homesHarness({ready:false});unready.list();unready.items.find(item=>item.tag==='button'&&item.textContent==='住宅街へ行く').onclick();assert.equal(unready.travelIds.length,0);assert.equal(unready.saved.length,0);assert.equal(unready.transitions.length,0);
 const fighting=homesHarness(),selected=fighting.readingJourney.snapshot().selectedId;fighting.session.beginBattle('canal-mist');fighting.travel(CREATOR_HOMES[3].creatorId);assert.equal(fighting.transitions.length,0);assert.equal(fighting.saved.length,0);assert.equal(fighting.readingJourney.snapshot().selectedId,selected);assert.equal(fighting.session.snapshot().state.mapId,'lantern-town');
});
