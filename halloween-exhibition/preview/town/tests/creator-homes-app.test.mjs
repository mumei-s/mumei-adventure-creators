import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {CREATOR_HOMES,getCreatorHome} from '../creator-homes.js';
import {creatorHomeProfile} from '../creator-home-profile.js';
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
 const cards=items.filter(item=>item.className==='town-card creator-home-work');assert.equal(cards.length,creatorHomeProfile(archive,home.creatorId).works.length);if(['grand_daisy8632','airoumu_rin'].includes(home.creatorId)){assert.equal(cards.length,0);assert.ok(items.some(item=>item.textContent?.includes('参加作品は準備中')));}
 items.find(item=>item.textContent==='街歩きに戻る').onclick();assert.equal(actions.at(-1),'closed');}
});
