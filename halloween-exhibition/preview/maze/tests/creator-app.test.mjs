import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {STORY,chapterFor,encounterStory} from '../story-model.js';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
function fakeElement(tag,text,cls){return{tag,text,cls,children:[],attributes:{},append(...children){this.children.push(...children);},setAttribute(name,value){this.attributes[name]=value;}};}
test('first-run story opening executes without shadowing progress and preserves article visits',()=>{
 const body=app.split('function showStory(){')[1].split('\nfunction updateCreatorFrames')[0].trim().replace(/}\s*$/,'');
 const progress={2026:{visited:['article-1'],cleared:[]}},content=fakeElement('main');let saves=0,opens=0;
 const run=new Function('progress','year','save','chapterFor','title','STORY','element','cleared','state','reachedVault','content','openPanel','encounterStory','requiredClearCount','REQUIRED_MONSTER_IDS',body);
 for(const cleared of[[],['pumpkin'],['pumpkin','ghost','bat']])run(progress,2026,()=>saves++,chapterFor,()=>{},STORY,fakeElement,cleared,{unlocked:false},false,content,()=>opens++,encounterStory,()=>cleared.length,['pumpkin','ghost','bat']);
 assert.equal(saves,3);assert.equal(opens,3);assert.equal(progress[2026].storySeen,true);assert.deepEqual(progress[2026].visited,['article-1']);assert.equal(content.children.length,3);
 assert(content.children.every(page=>page.children.some(item=>item.tag==='progress'&&item.max===6)));
});
test('battle replay preserves earned marks and all three keyboard commands are gated',()=>{
 const retry=app.split("again.onclick=()=>{")[1].split('};actions.append(again)')[0];assert(!retry.includes('cleared='));assert(retry.includes('battle=newBattle(m.id)'));
 assert(app.includes("['1','2','3'].includes(k)"));assert(app.includes("commandFor(battle,action).disabled"));assert(app.includes("...battle.lastAction"));assert(!app.includes('const damage=battle.charged?2:1'));
});
test('owner readiness gates first paint and downscaled player crops use measured layout',()=>{
 assert(app.includes("if(!creatorRoster.hero)throw Error('Owner character is not ready')"));assert(app.includes('rpgArt.setPlayerAtlas(heroImage,scaledCharacterLayout(creatorRoster.hero.asset,heroImage))'));
 assert(app.indexOf('rpgArt.setPlayerAtlas(heroImage')<app.indexOf('gameReady=true;'));
 assert(app.includes('compileCompanions(manifest)'));assert(app.includes('creatorPointer=null;look=null;if(isCharacterTap'));
});
test('paired characters appear atomically after both atlas requests finish',async()=>{
 const {buildCreatorActors}=await import('../creator-runtime.js');const manifest=JSON.parse(fs.readFileSync(new URL('../data/creator-characters.json',import.meta.url)));const pair=manifest.characters.filter(c=>c.creatorId==='fond_holly3483').map((c,i)=>({...c,x:7+i*.6,z:8}));assert.equal(pair.length,2);
 const images=new Map([[pair[0].asset.src,{width:1024,height:1024}]]),assets={get:src=>images.get(src)};
 assert.deepEqual(buildCreatorActors(pair,assets,{state:{}}),[]);images.set(pair[1].asset.src,{width:1024,height:1024});assert.equal(buildCreatorActors(pair,assets,{state:{},motion:false}).length,2);
});

test('visual companions have no independent talk buttons or application dialogue targets',async()=>{
 const {renderCreatorDirectory}=await import('../creator-ui.js');const prior=globalThis.document;
 try{globalThis.document={createElement:tag=>fakeElement(tag)};const container=fakeElement('main');const human={id:'person',creatorId:'creator',name:'Creator',label:'Human'},pets={...human,id:'pets',label:'Visual companions',interactive:false};renderCreatorDirectory(container,{roster:{npcs:[human,pets]},state:{},status:{},onTalk:()=>{},onGuide:()=>{}});
 const flatten=node=>[node,...node.children.flatMap(flatten)];const buttons=flatten(container).filter(node=>node.tag==='button');assert.equal(buttons.filter(node=>(node.textContent||'').includes('と話す')).length,1);assert(!buttons.some(node=>(node.textContent||'').includes('Visual companions')));
 }finally{globalThis.document=prior;}
 assert(app.includes("find(npc=>npc.id===id&&npc.interactive!==false)"));
});
