import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {normalizeCreatorStory,recordCreatorMeeting,creatorStoryChapter} from '../creator-story.js';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
function element(tag,text,cls){return {tag,textContent:text,cls,children:[],append(...items){this.children.push(...items);},setAttribute(){},remove(){this.removed=true;},querySelector(){return flatten(this).find(item=>item.tag==='a'&&item.cls==='primary')||null;}};}
function flatten(node){return[node,...node.children.flatMap(flatten)];}
function harness(){
  const first={id:'first',creatorId:'author-a',name:'Author A',label:'Character A',x:6,z:9,zone:'hall',articleURL:'https://note.com/author-a/n/n123'},guest={id:'guest-a',creatorId:'author-b',name:'Author B',label:'Guest A',x:6,z:3,zone:'archive',needsKey:true,articleURL:null,profileURL:'https://note.com/author-b'},anotherGuest={...guest,id:'guest-b',label:'Guest B'},third={...first,id:'third',creatorId:'author-c'},pet={...first,id:'pet',interactive:false};
  const content=element('main'),record={opens:0,hud:0,storage:null};
  const context=vm.createContext({URL,content,element,normalizeCreatorStory,recordCreatorMeeting,creatorStoryChapter,runId:'run-a',year:2026,creatorRoster:{npcs:[first,guest,anotherGuest,third,pet]},catalog:{creators:[{id:'author-a',profileURL:'https://note.com/author-a'}]},state:{hasKey:true,unlocked:false},reachedVault:false,cleared:['pumpkin'],storageOK:true,storageKey:'progress',progress:{2026:{visited:['article-already-read'],storySeen:true}},localStorage:{setItem(key,value){record.storage=JSON.parse(value);}},title(){content.children=[];},renderCreatorConversation(container,npc){const card=element('section'),article=element('a','作者の参加記事を読む ↗','primary');article.href=npc.articleURL;card.append(article);container.append(card);},openPanel(){record.opens++;},updateHUD(){record.hud++;},showStory(){},showCreators(){},guideCreator(){}});
  const save=app.slice(app.indexOf('function save(){'),app.indexOf('\nfunction notify'));
  const safe=app.slice(app.indexOf('function safeURL('),app.indexOf('\nfunction displayArticleKind'));
  const talk=app.slice(app.indexOf('function creatorJourney()'),app.indexOf('\nfunction guideCreator'));
  vm.runInContext(save+'\n'+safe+'\n'+talk,context);return{context,record,content};
}

test('only a real conversation records a creator, keeps article visits and survives save/reload',()=>{
  const {context,record}=harness();
  vm.runInContext('creatorJourney()',context);assert.equal(record.storage,null,'viewing the journal model does not meet anyone');
  vm.runInContext("showCreator('missing');showCreator('pet')",context);assert.equal(record.opens,0);assert.equal(record.storage,null);
  vm.runInContext("showCreator('first')",context);assert.equal(record.opens,1);assert.equal(record.hud,1);assert.deepEqual(record.storage[2026].creatorStory,{runId:'run-a',metCreatorIds:['author-a']});
  assert.deepEqual(record.storage[2026].visited,['article-already-read']);assert.equal(record.storage[2026].hasKey,true);assert.equal(record.storage[2026].unlocked,false);assert.deepEqual(record.storage[2026].cleared,['pumpkin']);
  vm.runInContext("showCreator('first');showCreator('guest-a');showCreator('guest-b')",context);
  assert.deepEqual(record.storage[2026].creatorStory.metCreatorIds,['author-a','author-b']);assert.deepEqual(record.storage[2026].visited,['article-already-read']);
  const restored=JSON.parse(JSON.stringify(record.storage));context.progress=restored;vm.runInContext('save()',context);assert.deepEqual(record.storage[2026].creatorStory,restored[2026].creatorStory);
  vm.runInContext("runId='run-b';save()",context);assert.deepEqual(record.storage[2026].creatorStory,{runId:'run-b',metCreatorIds:[]});assert.deepEqual(record.storage[2026].visited,['article-already-read']);
});

test('a pending creator opens the real profile instead of a null article URL',()=>{
  const {context,content}=harness();vm.runInContext("showCreator('guest-a')",context);const link=flatten(content).find(item=>item.tag==='a'&&item.cls==='primary');
  assert.equal(link.href,'https://note.com/author-b');assert.equal(link.textContent,'作者のプロフィールをひらく ↗');
  vm.runInContext("showCreator('first')",context);const links=flatten(content).filter(item=>item.tag==='a');assert.ok(links.some(item=>item.href==='https://note.com/author-a/n/n123'));assert.ok(links.some(item=>item.href==='https://note.com/author-a'));
});
