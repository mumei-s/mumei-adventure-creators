import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createReadingJourney,READING_JOURNEY_KEY} from '../reading-journey.js';
import {creatorHomeProfile} from '../creator-home-profile.js';

const archive=JSON.parse(fs.readFileSync(new URL('../../data/archive.json',import.meta.url),'utf8'));
const submittedIDs=['ss_yr','koakumako','n_kazumai55633','mama_ca','naemotion','imota14','fond_holly3483','tenkai_notes','soh_style_work','clever_hare2654','glossy_guppy6230','aihan_days','cheeky_rhino7031','real_hyena9474'];
const actualPeople=()=>archive.creators.map(person=>creatorHomeProfile(archive,person.id));
const person=(id,works=[`https://note.com/${id}/n/n${id.replace(/_/g,'')}`])=>({id,name:`Name ${id}`,works:works.map((url,index)=>({url,title:`Article ${index+1}`}))});
function memoryStorage(initial={}){
 const data=new Map(Object.entries(initial)),writes=[];
 return {data,writes,getItem:key=>data.get(key)??null,setItem(key,value){writes.push(key);data.set(key,value);}};
}
function read(journey,id,url){assert.equal(journey.openArticle(id,url),true);assert.equal(journey.markRead(id,url),true);}

test('the real journey has all fourteen submitted creators and excludes introductions and both pending participants',()=>{
 const journey=createReadingJourney({storage:memoryStorage(),people:actualPeople()}),state=journey.snapshot();
 assert.deepEqual(state.people.map(person=>person.id),submittedIDs);
 assert.equal(state.total,14);assert.equal(state.remaining,14);assert.equal(state.readCount,0);assert.equal(state.complete,false);
 assert.equal(state.people.reduce((total,person)=>total+person.works.length,0),14);
 assert.deepEqual(state.people.find(person=>person.id==='ss_yr').works.map(work=>work.url),['https://note.com/ss_yr/n/n15700f2773c6']);
 assert.equal(journey.openArticle('ss_yr','https://note.com/ss_yr/n/n52be511ec082'),false);
 for(const id of ['grand_daisy8632','airoumu_rin']){assert.equal(journey.select(id),false);assert.equal(journey.visit(id),false);}
});

test('selecting, visiting and opening an article never infer reading; the explicit mark requires a prior open',()=>{
 const journey=createReadingJourney({storage:memoryStorage(),people:[person('alice'),person('bob')]}),url=person('bob').works[0].url;
 assert.equal(journey.select('bob'),true);assert.equal(journey.snapshot().visitedCount,0);
 assert.equal(journey.markRead('bob',url),false);assert.equal(journey.snapshot().readCount,0);
 assert.equal(journey.visit('bob'),true);assert.equal(journey.snapshot().visitedCount,1);assert.equal(journey.snapshot().openedCount,0);
 assert.equal(journey.openArticle('bob',url),true);
 assert.deepEqual(journey.snapshot().selected.openedURLs,[url]);assert.equal(journey.snapshot().readCount,0);
 assert.equal(journey.markRead('bob',url),true);assert.equal(journey.markRead('bob',url),true);
 assert.equal(journey.snapshot().readCount,1);assert.equal(journey.snapshot().selected.visited,true);
});

test('all fourteen real creators can be read in a free order and opening every article alone leaves all unread',()=>{
 const journey=createReadingJourney({storage:memoryStorage(),people:actualPeople()}),pages=journey.snapshot().people;
 for(const page of pages)assert.equal(journey.openArticle(page.id,page.works[0].url),true);
 assert.equal(journey.snapshot().openedCount,14);assert.equal(journey.snapshot().visitedCount,14);assert.equal(journey.snapshot().readCount,0);
 for(const page of [...pages].reverse())assert.equal(journey.markRead(page.id,page.works[0].url),true);
 const state=journey.snapshot();assert.equal(state.readCount,14);assert.equal(state.remaining,0);assert.equal(state.complete,true);assert.equal(state.nextId,null);assert.equal(journey.next(),null);
});

test('only a known submitted article on the same creator account can be opened or marked',()=>{
 const storage=memoryStorage(),alice=person('alice'),journey=createReadingJourney({storage,people:[alice,person('bob')]});
 for(const url of ['https://note.com/alice','https://note.com/alice/n/nunlisted','https://note.com/bob/n/nbob','https://note.com.evil.test/alice/n/nalice','https://note.com@evil.test/alice/n/nalice','https://evil@note.com/alice/n/nalice','http://note.com/alice/n/nalice','https://note.com:444/alice/n/nalice','javascript:alert(1)',null,42]){
  assert.equal(journey.openArticle('alice',url),false,String(url));assert.equal(journey.markRead('alice',url),false,String(url));
 }
 assert.equal(journey.openArticle('unknown',alice.works[0].url),false);assert.equal(journey.select('unknown'),false);assert.equal(journey.visit('unknown'),false);assert.equal(storage.writes.length,0);
 assert.equal(journey.openArticle('alice',`${alice.works[0].url}/?utm_source=town#article`),true);
 assert.equal(journey.markRead('alice',alice.works[0].url),true);assert.deepEqual(journey.snapshot().selected.readURLs,[alice.works[0].url]);
});

test('malformed, pending, hidden, foreign and introduction-only people do not enter the journey',()=>{
 const alice=person('alice'),journey=createReadingJourney({storage:memoryStorage(),people:[null,{},person('../invalid'),{...person('blank'),name:' '},{...person('hidden'),visible:false},{...person('pending'),pending:true},{...person('intro'),works:[{url:'https://note.com/intro/n/nintro',introduction:true}]},{...person('foreign'),works:[{url:'https://note.com/bob/n/nbob'}]}, {...alice,works:null},alice,{...alice,name:'Duplicate'}, {...person('bob'),works:[{url:'https://note.com/bob/n/nhidden',visible:false},{url:'https://note.com/bob/n/npending',submissionStatus:'pending'},...person('bob').works,...person('bob').works]}]});
 assert.deepEqual(journey.snapshot().people.map(person=>person.id),['alice','bob']);assert.equal(journey.snapshot().people[0].name,alice.name);assert.equal(journey.snapshot().people[1].works.length,1);
 assert.doesNotThrow(()=>journey.setPeople({people:[alice]}));assert.equal(journey.snapshot().total,0);assert.equal(journey.snapshot().selected,null);assert.equal(journey.snapshot().complete,false);assert.equal(journey.next(),null);
 assert.equal(journey.setPeople([alice]).selectedId,'alice');
});

test('next wraps from the current choice to an unread creator and one read work completes a multi-work creator',()=>{
 const alice=person('alice',['https://note.com/alice/n/na1','https://note.com/alice/n/na2']),journey=createReadingJourney({storage:memoryStorage(),people:[alice,person('bob'),person('carol')]});
 assert.equal(journey.snapshot().selectedId,'alice');assert.equal(journey.next(),'bob');assert.equal(journey.snapshot().visitedCount,0);
 read(journey,'bob',person('bob').works[0].url);assert.equal(journey.snapshot().nextId,'carol');
 journey.select('carol');assert.equal(journey.next(),'alice');read(journey,'alice',alice.works[1].url);
 assert.equal(journey.snapshot().readCount,2);assert.equal(journey.snapshot().selected.readURLs.length,1);assert.equal(journey.next(),'carol');assert.equal(journey.next(),'carol');
 read(journey,'carol',person('carol').works[0].url);assert.equal(journey.next(),null);assert.equal(journey.snapshot().complete,true);
});

test('independent storage preserves explicit progress and selection without touching the story save',()=>{
 const storyKey='mumei:lantern-town:v1',storage=memoryStorage({[storyKey]:'story unchanged'}),people=[person('alice'),person('bob')],journey=createReadingJourney({storage,people});
 assert.equal(READING_JOURNEY_KEY,'mumei:lantern-town:reading-journey:v1');assert.equal(storage.writes.length,0);
 read(journey,'bob',people[1].works[0].url);journey.select('alice');
 assert.ok(storage.writes.every(key=>key===READING_JOURNEY_KEY));assert.equal(storage.data.get(storyKey),'story unchanged');
 const restored=createReadingJourney({storage,people}).snapshot();assert.equal(restored.selectedId,'alice');assert.equal(restored.readCount,1);assert.equal(restored.people[1].read,true);assert.equal(restored.people[0].visited,false);assert.equal(restored.saved,true);assert.equal(restored.storageError,null);
});

test('temporarily missing creators keep their records and returning or added creators recalculate the unread route',()=>{
 const storage=memoryStorage(),alice=person('alice'),bob=person('bob'),carol=person('carol'),journey=createReadingJourney({storage,people:[alice,bob]});
 read(journey,'bob',bob.works[0].url);journey.setPeople([alice]);assert.equal(journey.snapshot().readCount,0);
 journey.visit('alice');const restored=createReadingJourney({storage,people:[alice]});
 restored.setPeople([alice,bob,carol]);assert.equal(restored.snapshot().people[1].read,true);assert.equal(restored.snapshot().total,3);assert.equal(restored.snapshot().nextId,'carol');
 read(restored,'alice',alice.works[0].url);read(restored,'carol',carol.works[0].url);assert.equal(restored.snapshot().complete,true);
 restored.setPeople([alice,bob,carol,person('dana')]);assert.equal(restored.snapshot().complete,false);assert.equal(restored.snapshot().readCount,3);assert.equal(restored.next(),'dana');
});

test('a removed work cannot silently complete a replacement article and its record returns with the original work',()=>{
 const first=person('alice',['https://note.com/alice/n/nfirst']),second=person('alice',['https://note.com/alice/n/nsecond']),journey=createReadingJourney({storage:memoryStorage(),people:[first]});
 read(journey,'alice',first.works[0].url);journey.setPeople([second]);assert.equal(journey.snapshot().readCount,0);assert.deepEqual(journey.snapshot().selected.readURLs,[]);assert.equal(journey.markRead('alice',second.works[0].url),false);
 journey.setPeople([first]);assert.equal(journey.snapshot().readCount,1);assert.equal(journey.snapshot().complete,true);
});

test('saved read claims require the same creator article to have an open record',()=>{
 const alice=person('alice'),bob=person('bob'),value={version:1,selectedId:'unknown',progress:[{id:'alice',visited:false,openedURLs:['https://note.com/bob/n/nbob'],readURLs:[alice.works[0].url]},{id:'bob',visited:false,openedURLs:[bob.works[0].url],readURLs:[`${bob.works[0].url}?source=town`]},null,{id:'../invalid',openedURLs:[],readURLs:[]}]};
 const state=createReadingJourney({storage:memoryStorage({[READING_JOURNEY_KEY]:JSON.stringify(value)}),people:[alice,bob]}).snapshot();
 assert.equal(state.selectedId,'alice');assert.equal(state.readCount,1);assert.equal(state.people[0].visited,false);assert.deepEqual(state.people[0].openedURLs,[]);assert.equal(state.people[1].visited,true);assert.equal(state.people[1].read,true);
});

test('corrupt or incompatible saves recover on a valid action without losing current reading progress',()=>{
 for(const raw of ['{broken','null',JSON.stringify({version:2,progress:[]}),JSON.stringify({version:1,progress:{}})]){
  const storage=memoryStorage({[READING_JOURNEY_KEY]:raw}),alice=person('alice'),journey=createReadingJourney({storage,people:[alice]});
  assert.equal(journey.snapshot().readCount,0);assert.equal(journey.snapshot().saved,false);assert.ok(journey.snapshot().storageError);
  read(journey,'alice',alice.works[0].url);assert.equal(journey.snapshot().complete,true);assert.equal(journey.snapshot().saved,true);assert.equal(createReadingJourney({storage,people:[alice]}).snapshot().readCount,1);
 }
});

test('denied storage and throwing callbacks preserve the usable in-memory journey',()=>{
 const alice=person('alice'),denied={getItem(){throw Error('denied');},setItem(){throw Error('denied');}};
 for(const storage of [null,{},denied,{getItem:()=>null,setItem(){throw Error('quota');}}]){
  const journey=createReadingJourney({storage,people:[alice],onChange(){throw Error('render interrupted');}});
  assert.doesNotThrow(()=>read(journey,'alice',alice.works[0].url));assert.equal(journey.snapshot().readCount,1);assert.equal(journey.snapshot().saved,false);assert.ok(journey.snapshot().storageError);
 }
});

test('snapshots and input records cannot mutate the internal reading evidence',()=>{
 const alice=person('alice'),changes=[],journey=createReadingJourney({storage:memoryStorage(),people:[alice],onChange:state=>changes.push(state)});
 assert.equal(changes.length,0);alice.works[0].url='https://note.com/alice/n/nchanged';
 const state=journey.snapshot();state.people[0].works[0].url='https://note.com/alice/n/nforged';state.people[0].readURLs.push('https://note.com/alice/n/nalice');state.people.length=0;
 assert.equal(journey.snapshot().selected.works[0].url,'https://note.com/alice/n/nalice');assert.equal(journey.snapshot().readCount,0);
 journey.openArticle('alice','https://note.com/alice/n/nalice');assert.equal(changes.length,1);assert.equal(changes[0].readCount,0);
 journey.markRead('alice','https://note.com/alice/n/nalice');assert.equal(changes.length,2);assert.equal(changes[1].readCount,1);
});
