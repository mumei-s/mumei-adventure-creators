import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createReadingJourney} from '../reading-journey.js';
import {CREATOR_HOMES,getCreatorHome} from '../creator-homes.js';
import {creatorHomeProfile} from '../creator-home-profile.js';
import {initialTownState,townProgress,townJournal,getTownMap} from '../town-model.js';
import {cameraDistanceLabel} from '../../camera-distance.js';

const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const archive=JSON.parse(fs.readFileSync(new URL('../../data/archive.json',import.meta.url),'utf8'));
function functionSource(name){
 const start=source.indexOf(`function ${name}(`);assert.ok(start>=0,`${name} exists`);
 const rest=source.slice(start),end=rest.slice(1).search(/\n(?:async )?function /);
 return (end<0?rest:rest.slice(0,end+1)).replaceAll('import.meta.url',JSON.stringify('https://example.test/preview/town/app.js'));
}
function element(tag,text='',className=''){
 const listeners=new Map(),attributes=new Map();return {tag,textContent:text,className,children:[],dataset:{},style:{setProperty(){}},disabled:false,
  append(...children){this.children.push(...children);},replaceChildren(...children){this.children=[...children];},setAttribute:(key,value)=>attributes.set(key,String(value)),getAttribute:key=>attributes.get(key),
  addEventListener(type,listener){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(listener);},
  click(){if(this.disabled)return;const event={target:this,currentTarget:this};this.onclick?.(event);for(const listener of listeners.get('click')||[])listener(event);},remove(){},
 };
}
const flatten=node=>[node,...node.children.flatMap(flatten)];
function harness(){
 const content=element('div'),nodes=new Map(),stored=new Map(),record={panels:[],notices:[],closed:0};
 const state=initialTownState(),context=vm.createContext({URL,Math,Set,CREATOR_HOMES,getCreatorHome,createReadingJourney,townProgress,townJournal,getTownMap,cameraDistanceLabel,
  characterArt:{creatorPage:id=>creatorHomeProfile(archive,id)},session:{snapshot:()=>({state})},contextTarget:()=>null,ready:true,renderer:null,settings:{lantern:true},cameraDistance:'normal',toggleLantern(){},
  localStorage:{getItem:key=>stored.get(key)??null,setItem:(key,value)=>stored.set(key,value)},content,
  el:element,button:(text,onclick,className)=>({...element('button',text,className),onclick}),
  $:id=>{if(!nodes.has(id))nodes.set(id,element('div'));return nodes.get(id);},
  beginPanel:(title,options)=>{content.replaceChildren();record.panels.push({title,options});},notify:text=>record.notices.push(text),closePanel:()=>record.closed++,pageReload:{element:element('section')},
  showVisitors(){},showInventory(){},showMap(){},showWalkingSpeed(){},showControlSettings(){},showSettings(){},showMenuLayoutSettings(){},showSave(){},showHelp(){},showCastleReturn(){},
 });
 const functions=['prepareReadingJourney','readingProgress','appendReadingMark','showJournal','showMenu','showCreatorHome','showCreatorHomes','showTownJournal','updateHUD'];
 vm.runInContext(`let readingJourney=null,hudSignature='';${functions.map(functionSource).join('\n')};globalThis.run={${functions.join(',')},journey:()=>readingJourney};`,context);
 const run=context.run;run.prepareReadingJourney();return {run,state,content,record,node:id=>nodes.get(id),all:()=>flatten(content)};
}

test('actual preparation uses short home names, puts the owner last, and keeps the fifteen submitted creators',()=>{
 const h=harness(),journey=h.run.journey(),snapshot=journey.snapshot();
 assert.equal(snapshot.total,15);assert.equal(snapshot.people[0].id,'koakumako');assert.equal(snapshot.people.at(-1).id,'ss_yr');
 for(const person of snapshot.people){assert.equal(person.name,getCreatorHome(person.id).creatorName);assert.ok(person.works.every(work=>!work.introduction));}
 assert.equal(snapshot.people.find(person=>person.id==='n_kazumai55633').name,'ミナト汐');
 for(const id of ['grand_daisy8632'])assert.equal(snapshot.people.some(person=>person.id===id),false);
 const first=snapshot.selected,work=first.works[0];journey.openArticle(first.id,work.url);journey.markRead(first.id,work.url);h.run.prepareReadingJourney();
 assert.equal(h.run.journey(),journey);assert.equal(journey.snapshot().readCount,1,'refreshing profile data retains explicit reading evidence');
});

test('the actual HUD progresses from the street to a home, then to its article and the next creator',()=>{
 const h=harness(),journey=h.run.journey(),first=journey.snapshot().selected;
 h.run.updateHUD();assert.match(h.node('quest-title').textContent,/記事巡り\s+0\/15/);assert.match(h.node('quest-objective').textContent,/街の南西の案内門から住宅街へ/);assert.ok(h.node('quest-objective').textContent.includes(first.name));
 h.state.mapId='creator-quarter';h.run.updateHUD();assert.match(h.node('quest-objective').textContent,/北から\d列目・西から\d軒目/);assert.match(h.node('quest-objective').textContent,/玄関から作品をひらこう/);
 journey.visit(first.id);assert.match(h.node('quest-objective').textContent,/参加記事を読みに行こう/);assert.match(h.node('quest-objective').textContent,/読んだしるし/);
 h.run.showCreatorHome(first.id);const link=h.content.children.find(node=>node.className==='town-card creator-home-work'),mark=h.content.children.find(node=>node.className==='reading-mark');link.click();mark.click();
 assert.equal(journey.snapshot().readCount,1);assert.notEqual(journey.snapshot().selectedId,first.id);assert.match(h.node('quest-title').textContent,/記事巡り\s+1\/15/);assert.ok(h.node('quest-objective').textContent.includes(journey.snapshot().selected.name));
});

test('opening an article only enables its explicit reading mark; the mark advances the journey',()=>{
 const h=harness(),journey=h.run.journey(),person=journey.snapshot().selected;h.run.showCreatorHome(person.id);
 const link=h.content.children.find(node=>node.className==='town-card creator-home-work'),mark=h.content.children.find(node=>node.className==='reading-mark');
 assert.ok(link);assert.ok(mark);assert.equal(mark.disabled,true);mark.click();assert.equal(journey.snapshot().readCount,0);
 link.click();assert.equal(journey.snapshot().readCount,0);assert.equal(journey.snapshot().openedCount,1);assert.equal(mark.disabled,false);assert.equal(journey.snapshot().selectedId,person.id);
 mark.click();assert.equal(journey.snapshot().readCount,1);assert.equal(mark.disabled,true);assert.equal(mark.textContent,'読んだしるしを残しました');assert.notEqual(journey.snapshot().selectedId,person.id);assert.match(h.record.notices.at(-1),/次は.+の物語へ/);
 link.click();assert.equal(mark.disabled,true,'reopening a marked article does not enable its completed mark');assert.equal(mark.textContent,'読んだしるしを残しました');assert.equal(journey.snapshot().readCount,1);mark.click();assert.equal(journey.snapshot().readCount,1);
});

test('owner introduction links receive no reading mark while the submitted work does',()=>{
 const h=harness(),person=creatorHomeProfile(archive,'ss_yr');h.run.showCreatorHome('ss_yr');
 const cards=h.content.children.filter(node=>node.className==='town-card creator-home-work'),marks=h.content.children.filter(node=>node.className==='reading-mark');
 assert.equal(cards.length,person.works.length);assert.equal(marks.length,person.works.filter(work=>!work.introduction).length);
 for(const intro of person.works.filter(work=>work.introduction)){const link=cards.find(card=>card.href===intro.url);assert.ok(link);assert.notEqual(h.content.children[h.content.children.indexOf(link)+1]?.className,'reading-mark');link.click();}
 assert.equal(h.run.journey().snapshot().openedCount,0);assert.equal(h.run.journey().snapshot().readCount,0);
});

test('the pending creator retain their home and profile while the reading notebook excludes them',()=>{
 const h=harness();h.run.showCreatorHomes();const list=h.content.children.find(node=>node.className==='inventory-list');assert.equal(list.children.length,16);assert.equal(CREATOR_HOMES.length,16);
 for(const id of ['grand_daisy8632']){const home=getCreatorHome(id),card=list.children.find(item=>item.children.some(node=>node.tag==='h3'&&node.textContent===home.creatorName));assert.ok(card);assert.equal(card.children.find(node=>node.tag==='button').disabled,false);
  h.run.showCreatorHome(id);assert.ok(h.content.children.some(node=>node.tag==='a'&&node.href===creatorHomeProfile(archive,id).profileURL));assert.ok(h.content.children.some(node=>node.textContent.includes('参加作品は準備中')));assert.equal(h.content.children.some(node=>node.className==='reading-mark'),false);
 }
 h.run.showJournal();const notebook=h.content.children.find(node=>node.className==='reading-list');assert.equal(notebook.children.length,15);assert.equal(h.content.children.find(node=>node.tag==='progress').max,15);
 for(const id of ['grand_daisy8632'])assert.equal(notebook.children.some(card=>card.children.some(node=>node.tag==='h3'&&node.textContent===getCreatorHome(id).creatorName)),false);
});

test('the main menu and reading notebook both retain the original town quest journal',()=>{
 const h=harness();h.run.showMenu();const menu=h.content.children.find(node=>node.className==='town-menu'),oldJournal=menu.children.find(node=>node.textContent==='街の依頼（寄り道）');assert.ok(oldJournal);oldJournal.click();assert.equal(h.record.panels.at(-1).title,'街の依頼（寄り道）');assert.ok(h.content.children.some(node=>node.className==='town-card'));
 h.run.showJournal();h.content.children.find(node=>node.textContent==='街の依頼を見る').click();assert.equal(h.record.panels.at(-1).title,'街の依頼（寄り道）');
 h.run.journey().setPeople([]);h.run.showJournal();assert.equal(h.record.panels.at(-1).title,'街の依頼（寄り道）');
});
