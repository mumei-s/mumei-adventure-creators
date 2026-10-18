import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  CREATOR_STORY_GOAL,CREATOR_STORY_FICTION,normalizeCreatorStory,
  recordCreatorMeeting,creatorStoryChapter,renderCreatorStoryJournal,
} from '../creator-story.js';
import {compileCharacterRoster,placeCreatorNPCs,creatorGuide} from '../creator-runtime.js';
import {eligibleForEnding} from '../clear-reward.js';
import {REQUIRED_MONSTER_IDS} from '../encounter-model.js';
import {blocked,CELL} from '../maze-model.js';
import {inFurniture} from '../rpg-model.js';

const runId='adventure-a';
const person=(id,creatorId,extra={})=>({id,creatorId,name:`Author ${creatorId}`,label:`Character ${id}`,x:6,z:10,zone:'hall',...extra});
const a=person('a-human','author-a'),aPet=person('a-pet','author-a',{interactive:false}),
  b=person('b-human','author-b',{x:13.3,z:8.3,zone:'east'}),
  c=person('c-human','author-c',{x:5.7,z:1.8,zone:'archive',needsKey:true}),
  west=person('west-human','author-west',{x:1.5,z:8.2,zone:'west',needsCorridor:true});
const roster={npcs:[a,aPet,b,c,west]};
const chapter=(progress,state={})=>creatorStoryChapter({roster,progress,runId,state});
const deepFreeze=value=>{if(value&&typeof value==='object'){Object.freeze(value);for(const item of Object.values(value))deepFreeze(item);}return value;};
function element(tag,text,cls){return {tag,textContent:text??'',className:cls??'',children:[],attributes:{},append(...children){this.children.push(...children);},setAttribute(key,value){this.attributes[key]=String(value);}};}
const flatten=node=>[node,...node.children.flatMap(flatten)];

test('legacy, malformed and another adventure records restore safely without sharing their arrays',()=>{
  for(const value of [null,undefined,0,'legacy',[],{}, {metCreatorIds:['author-a']},
    {runId:'old-run',metCreatorIds:['author-a']},{runId,metCreatorIds:'author-a'}]){
    assert.deepEqual(normalizeCreatorStory(value,runId),{runId,metCreatorIds:[]});
  }
  const saved=deepFreeze({runId,metCreatorIds:['author-a','author-a',null,42,'',{},'../foreign','https://note.com/x','author-b']});
  const before=JSON.stringify(saved),normalized=normalizeCreatorStory(saved,runId);
  assert.deepEqual(normalized,{runId,metCreatorIds:['author-a','author-b']});
  normalized.metCreatorIds.push('author-c');assert.equal(JSON.stringify(saved),before,'restoration cannot mutate a previous save');
  const oversized={runId,metCreatorIds:Array.from({length:200},(_,i)=>'author-'+i)};
  assert.equal(normalizeCreatorStory(oversized,runId).metCreatorIds.length,128,'untrusted saved lists stay bounded');
});

test('a recorded conversation counts one author once and rejects pets, owner, unknown or forged targets',()=>{
  const owner=person('owner','ss_yr'),localRoster={npcs:[...roster.npcs,owner,person('a-second','author-a')]};
  let progress=recordCreatorMeeting(null,a,{runId,roster:localRoster});
  const original=deepFreeze(structuredClone(progress));
  for(const npc of [a,localRoster.npcs.at(-1),aPet,owner,person('unknown','author-x'),{...a,creatorId:'author-x'},null]){
    progress=recordCreatorMeeting(progress,npc,{runId,roster:localRoster});
  }
  assert.deepEqual(progress,original);assert.deepEqual(progress.metCreatorIds,['author-a']);
  assert.deepEqual(recordCreatorMeeting(progress,b,{runId,roster:localRoster}).metCreatorIds,['author-a','author-b']);
  assert.deepEqual(recordCreatorMeeting(progress,b,{runId:'new-adventure',roster:localRoster}),{runId:'new-adventure',metCreatorIds:['author-b']});
});

test('meeting state is isolated from year entries, article visits and the previous adventure',()=>{
  const saved=deepFreeze({2026:{runId,visited:['article-1'],cleared:['pumpkin'],creatorStory:{runId,metCreatorIds:['author-a']}},
    2025:{runId:'adventure-2025',visited:['older-article'],creatorStory:{runId:'adventure-2025',metCreatorIds:['author-b']}}});
  const before=JSON.stringify(saved);
  const next=recordCreatorMeeting(saved[2026].creatorStory,b,{runId,roster});
  assert.deepEqual(next.metCreatorIds,['author-a','author-b']);assert.equal(JSON.stringify(saved),before);
  assert.deepEqual(normalizeCreatorStory(next,'another-adventure').metCreatorIds,[]);
  assert.deepEqual(normalizeCreatorStory(saved[2025].creatorStory,runId).metCreatorIds,[]);
});

test('chapter groups placed authors, ignores unknown saved names and changes the optional objective after three conversations',()=>{
  const localRoster={npcs:[...roster.npcs,person('a-other','author-a'),person('owner','ss_yr'),person('not-placed','author-not-placed',{x:NaN}),person('hidden','author-hidden',{interactive:false})]};
  const before=creatorStoryChapter({roster:localRoster,runId,progress:{runId,metCreatorIds:['unknown-author']}});
  assert.deepEqual(before.people.map(p=>p.creatorId),['author-a','author-b','author-c','author-west']);
  assert.equal(before.met.length,0);assert.equal(before.next.creatorId,'author-a');assert.equal(before.goal,CREATOR_STORY_GOAL);assert.equal(before.complete,false);
  let progress;for(const npc of [a,b,c])progress=recordCreatorMeeting(progress,npc,{runId,roster:localRoster});
  const after=creatorStoryChapter({roster:localRoster,runId,progress});
  assert.equal(after.met.length,3);assert.equal(after.complete,true);assert.equal(after.next.creatorId,'author-west');
  assert.match(after.objective,/寄り道を達成/);assert.equal(after.total,4);
  const empty=creatorStoryChapter({roster:{npcs:[]},runId});assert.equal(empty.active,false);assert.equal(empty.complete,false);assert.equal(empty.objective,'');
});

test('locked locations explain the required door and retain the existing safe guide behavior',()=>{
  const locked=chapter(null),archive=locked.people.find(p=>p.creatorId==='author-c'),corridor=locked.people.find(p=>p.creatorId==='author-west');
  assert.equal(archive.location,'北の浮遊書庫');assert.equal(corridor.location,'西の肖像の回廊');
  assert.ok(!archive.available);assert.match(archive.hint,/鍵.*格子扉/);assert.ok(!corridor.available);assert.match(corridor.hint,/西の扉/);
  for(const row of [archive,corridor]){const guide=creatorGuide(row.npc,{});assert.ok(!blocked(guide.x*CELL,guide.z*CELL,{}));assert.ok(!inFurniture(guide.x*CELL,guide.z*CELL));}
  assert.notEqual(creatorGuide(archive.npc,{}).z,archive.npc.z,'the bookcase guide stops before the locked area');
  const unlocked=chapter(null,{unlocked:true,horrorAccepted:true});
  assert.ok(unlocked.people.every(p=>p.available));
});

test('three meetings never replace any existing key, six battle marks or vault ending condition',()=>{
  let met;for(const npc of [a,b,c])met=recordCreatorMeeting(met,npc,{runId,roster});
  assert.equal(chapter(met).complete,true);
  const complete={unlocked:true,reachedVault:true,cleared:[...REQUIRED_MONSTER_IDS]};
  for(const progress of [normalizeCreatorStory(null,runId),met]){
    assert.equal(eligibleForEnding({...complete,creatorStory:progress},REQUIRED_MONSTER_IDS),true);
    for(const incomplete of [{...complete,unlocked:false},{...complete,reachedVault:false},{...complete,cleared:REQUIRED_MONSTER_IDS.slice(1)}]){
      assert.equal(eligibleForEnding({...incomplete,creatorStory:progress},REQUIRED_MONSTER_IDS),false);
    }
  }
});

test('the live approved placement roster appears by real author name and counts the three CNA characters once',()=>{
  const read=path=>JSON.parse(fs.readFileSync(new URL(path,import.meta.url),'utf8')),
    archive=read('../../data/archive.json'),manifest=read('../data/creator-characters.json'),compiled=compileCharacterRoster(archive,manifest,2026),
    placed=placeCreatorNPCs(compiled.npcs,manifest.slotAssignments),liveRoster={...compiled,npcs:placed.placed};
  assert.deepEqual(placed.omitted,[]);
  const live=creatorStoryChapter({roster:liveRoster,runId}),expected=new Set(placed.placed.filter(n=>n.interactive!==false).map(n=>n.creatorId));
  assert.deepEqual(new Set(live.people.map(p=>p.creatorId)),expected);assert.ok(!expected.has('ss_yr'));
  const creatorNames=new Map(archive.creators.map(creator=>[creator.id,creator.name]));
  for(const row of live.people){assert.equal(row.name,creatorNames.get(row.creatorId));assert.ok(row.location);assert.ok(row.npc.slotId);}
  const cna=placed.placed.filter(n=>n.creatorId==='grand_daisy8632');assert.equal(cna.length,3);
  let progress;for(const npc of cna)progress=recordCreatorMeeting(progress,npc,{runId,roster:liveRoster});
  assert.deepEqual(progress.metCreatorIds,['grand_daisy8632']);
  assert.equal(creatorStoryChapter({roster:liveRoster,progress,runId}).met.length,1);
});

test('journal renders author names and locations, and guide buttons do not record a meeting',()=>{
  const progress=deepFreeze({runId,metCreatorIds:['author-a']}),model=chapter(progress),container=element('main'),guides=[];
  renderCreatorStoryJournal(container,model,{element,onGuide:npc=>guides.push(npc)});
  const nodes=flatten(container),buttons=nodes.filter(node=>node.tag==='button'),text=nodes.map(node=>node.textContent).join('\n');
  for(const row of model.people){assert.ok(text.includes(row.name));assert.ok(text.includes(row.location));}
  assert.ok(text.includes(CREATOR_STORY_FICTION));assert.match(text,/必須条件ではありません/);
  assert.equal(buttons.length,model.people.length);assert.equal(buttons.filter(button=>button.textContent==='扉の手前へ案内').length,2);
  for(const button of buttons)button.onclick();
  assert.deepEqual(guides,model.people.map(row=>row.npc));assert.deepEqual(progress.metCreatorIds,['author-a']);assert.equal(chapter(progress).met.length,1);
  const bar=nodes.find(node=>node.tag==='progress');assert.equal(bar.value,1);assert.equal(bar.max,3);
  const empty=element('main');renderCreatorStoryJournal(empty,creatorStoryChapter({roster:{npcs:[]},runId}),{element,onGuide:()=>assert.fail('empty roster has no guide')});
  assert.equal(flatten(empty).some(node=>node.tag==='button'),false);assert.match(flatten(empty).map(n=>n.textContent).join(' '),/準備中/);
});
