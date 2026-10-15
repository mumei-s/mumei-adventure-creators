import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, access} from 'node:fs/promises';
import {validateArchive,safeURL,normalizeSearch,doorIdFor} from '../data-model.js';
const source=JSON.parse(await readFile(new URL('../data/archive.json',import.meta.url)));
// Original nine-profile snapshot verified 2026-10-13; カモミール public profile verified 2026-10-15 JST.
// Kept local so the shipped preview tests remain independently runnable.
const verified=JSON.parse(await readFile(new URL('./fixtures/verified-profiles.json',import.meta.url)));

test('thirteen verified profiles and fourteen article doors without invented creators',()=>{
  validateArchive(source);
  assert.equal(source.creators.length,13);
  assert.deepEqual(source.creators.map(c=>c.id),verified.map(c=>c.id));
  assert.equal(source.creators.filter(c=>c.provisional).length,0);
  assert.equal(source.years[0].entries.length,14);
  assert.equal(source.years[0].plannedSlots,undefined);
  assert.deepEqual(source.evergreenEntries,[]);
  assert.deepEqual([...new Set(source.years[0].entries.map(e=>e.creatorId))],verified.map(c=>c.id));
});

test('creator identities use only names, handles, public profile links and profile images',async()=>{
  const allowed=new Set(['id','name','avatar','avatarSource','profileURL']);
  for(const creator of source.creators){
    const profile=verified.find(c=>c.id===creator.id);
    assert.equal(creator.profileURL,profile.profileURL);
    assert.equal(creator.avatarSource,profile.avatarURL);
    // The supplied short names compact optional spaces for two creators.
    assert.equal(creator.name.replace(/\s/g,''),profile.displayName.replace(/\s/g,''));
    for(const key of Object.keys(creator))assert.ok(allowed.has(key),`${creator.id}: unexpected profile field ${key}`);
    assert.equal(safeURL(creator.profileURL),creator.profileURL);
    assert.ok(safeURL(creator.avatar,{image:true}));
    if(creator.avatar.startsWith('https:'))assert.equal(creator.avatar,profile.avatarURL);
    else await access(new URL('../'+creator.avatar,import.meta.url));
  }
});

test('host introduction and three confirmed participant articles are present; ten doors await submissions',()=>{
  const [host,owner,mako]=source.years[0].entries;
  assert.equal(owner.doorId,'owner-work-2026');
  assert.equal(owner.submissionStatus,'pending');
  const participants=source.years[0].entries.filter(entry=>entry.submissionStatus==='pending');
  assert.equal(host.creatorId,'ss_yr');
  assert.equal(host.role,'host');
  assert.equal(host.links[0].url,'https://note.com/ss_yr/n/n52be511ec082');
  assert.match(host.image,/322657367\/rectangle_large_type_2_6cd807a5c7b4cef57389ab4adf353974/);
  assert.equal(mako.creatorId,'koakumako');
  assert.equal(mako.submissionStatus,'submitted');
  assert.equal(mako.title,'本場のHalloweenを見せてあげる');
  assert.equal(mako.image,'https://assets.st-note.com/production/uploads/images/323659898/rectangle_large_type_2_d5a9c6f7f951e84d30ffa44d72e80886.png');
  assert.equal(mako.imageAlt,'こあく まこの記事「本場のHalloweenを見せてあげる」の見出し画像');
  assert.notEqual(mako.image,verified.find(c=>c.id===mako.creatorId).avatarURL);
  assert.deepEqual(mako.tags,['参加者','ハロウィン']);
  assert.deepEqual(mako.links,[
    {title:'本場のHalloweenを見せてあげる（note記事）',url:'https://note.com/koakumako/n/na9731433238f'},
    {title:'noteプロフィールを見る',url:'https://note.com/koakumako'}
  ]);
  assert.equal(mako.message,undefined);
  assert.equal(mako.works,undefined);
  assert.equal(source.years[0].entries.filter(e=>e.submissionStatus==='introduction').length,1);
  assert.equal(source.years[0].entries.filter(e=>e.submissionStatus==='submitted').length,3);
  assert.equal(participants.length,10);
  for(const entry of participants){
    const profile=verified.find(c=>c.id===entry.creatorId);
    assert.equal(entry.submissionStatus,'pending');
    assert.equal(entry.title,'作品準備中');
    assert.equal(entry.image,undefined);
    assert.equal(entry.message,undefined);
    assert.equal(entry.works,undefined);
    assert.deepEqual(entry.links,entry.doorId==='owner-work-2026'?[]:[{title:'noteプロフィールを見る',url:profile.profileURL}]);
  }
});

test('confirmed Chamomile article uses public article art distinct from the new profile avatar',()=>{
  const creator=source.creators.find(c=>c.id==='clever_hare2654');
  assert.equal(creator.name,'カモミール');
  assert.equal(creator.profileURL,'https://note.com/clever_hare2654');
  const entry=source.years[0].entries.find(e=>e.doorId==='chamomile-halloween-2026');
  assert.equal(entry.creatorId,creator.id);
  assert.equal(entry.title,'「🧙‍♀Happy Halloween🎃」｜ハロウィン企画に参加してみた話');
  assert.equal(entry.submissionStatus,'submitted');
  assert.equal(entry.image,'https://assets.st-note.com/production/uploads/images/324417758/rectangle_large_type_2_71b577e1ed8ffdaeecd1af87bd58ecab.jpeg?width=1200');
  assert.notEqual(entry.image,creator.avatar);
  assert.equal(entry.links[0].url,'https://note.com/clever_hare2654/n/nf731501cfb0e');
  assert.equal(entry.links[1].url,creator.profileURL);
  assert.deepEqual(entry.tags,['参加者','ハロウィン']);
  assert.equal(entry.message,undefined);
  assert.equal(source.years[0].entries.find(e=>e.creatorId==='soh_style_work').submissionStatus,'pending');
  assert.equal(source.years[0].entries.find(e=>e.creatorId==='imota14').submissionStatus,'submitted');
  assert.equal(source.years[0].entries.find(e=>e.creatorId==='glossy_guppy6230').submissionStatus,'pending');
  assert.deepEqual(source.evergreenEntries,[]);
});

test('stable creator IDs may recur across years',()=>{const data=structuredClone(source);data.years.push({...structuredClone(data.years[0]),year:2027});assert.equal(validateArchive(data).years.length,2);});
test('empty year and roster are valid',()=>{assert.doesNotThrow(()=>validateArchive({schemaVersion:1,creators:[],years:[{year:2026,title:'',description:'',entries:[]}]}));});
test('duplicate creators, duplicate annual entries, unknown IDs, duplicate years reject',()=>{for(const change of [d=>d.creators.push(d.creators[0]),d=>d.years[0].entries.push(d.years[0].entries[0]),d=>d.years[0].entries[0].creatorId='missing',d=>d.years.push(d.years[0])]){const d=structuredClone(source);change(d);assert.throws(()=>validateArchive(d));}});
test('planned slots are optional nonnegative integers and do not create entries',()=>{
  for(const value of [-1,1.5,101,'2',null]){const data=structuredClone(source);data.years[0].plannedSlots=value;assert.throws(()=>validateArchive(data));}
  for(const value of [0,2,100]){const data=structuredClone(source);data.years[0].plannedSlots=value;assert.equal(validateArchive(data).years[0].entries.length,14);}
  const data=structuredClone(source);delete data.years[0].plannedSlots;assert.doesNotThrow(()=>validateArchive(data));
});
test('malformed profile field types reject',()=>{for(const key of ['avatar','avatarSource','profileURL']){const data=structuredClone(source);data.creators[0][key]={url:'bad'};assert.throws(()=>validateArchive(data));}});
test('unsafe URLs and traversal reject',()=>{for(const url of ['javascript:alert(1)','data:text/html,x','http://example.com','//example.com','assets/../private.png','https://user:secret@example.com','https://x.com/\nx'])assert.equal(safeURL(url,{image:true}),null);assert.equal(safeURL('./assets/portal.svg',{image:true}),'./assets/portal.svg');assert.equal(safeURL('https://example.com'),'https://example.com/');});
test('search normalizes width, case, whitespace',()=>{assert.equal(normalizeSearch(' ＡＢＣ '),'abc');});

test('the one requested owner work placeholder is a separate door, with no invented work URL or art',()=>{
 const extra=source.years[0].entries.find(e=>e.doorId==='owner-work-2026');
 assert.deepEqual(extra,{doorId:'owner-work-2026',creatorId:'ss_yr',theme:'letter',submissionStatus:'pending',title:'作品準備中',tags:['参加者','作品準備中'],links:[]});
 assert.equal(source.years[0].entries.filter(e=>e.role==='host').length,1);
 assert.equal(new Set(source.years[0].entries.map(e=>e.creatorId)).size,13);
});
test('door IDs survive reordered and retitled legacy entries, and distinguish same-creator articles',()=>{
 const entry=source.years[0].entries[0],scope='archive:2026';
 assert.equal(doorIdFor(entry,scope),'legacy-archive-2026-ss_yr');
 assert.equal(doorIdFor({...entry,title:'Edited',order:200},scope),doorIdFor(entry,scope));
 const data=structuredClone(source);data.years[0].entries.push({...entry,doorId:'another-owner-work'});assert.doesNotThrow(()=>validateArchive(data));
 data.years[0].entries.at(-1).doorId='owner-work-2026';assert.throws(()=>validateArchive(data),/扉ID/);
 data.years[0].entries.at(-1).doorId=doorIdFor(entry,scope);assert.throws(()=>validateArchive(data),/扉ID/);
 for(const id of ['',{},'a b','../x','x'.repeat(121)]){data.years[0].entries.at(-1).doorId=id;assert.throws(()=>validateArchive(data),/扉ID/);}
});

test("verified Takechi work is submitted without altering skipped Marimo or owner placeholder",()=>{const e=source.years[0].entries.find(e=>e.creatorId==="imota14");assert.equal(e.title,"死神と貴公子と、顔に張り紙を貼った私。");assert.equal(e.submissionStatus,"submitted");assert.equal(e.links[0].url,"https://note.com/imota14/n/n618813fb0e89");assert.match(e.image,/324418285/);assert.equal(source.years[0].entries.find(e=>e.creatorId==="soh_style_work").submissionStatus,"pending");assert.deepEqual(source.years[0].entries.find(e=>e.doorId==="owner-work-2026").links,[]);});

// These three people were requested as participants, not as submitted works.
test('new participant doors remain pending and exclude unrelated Tantan work',()=>{
 for(const id of ['glossy_guppy6230','aihan_days','cheeky_rhino7031']){
  const entries=source.years[0].entries.filter(e=>e.creatorId===id);assert.equal(entries.length,1);
  const e=entries[0];assert.equal(e.submissionStatus,'pending');assert.equal(e.image,undefined);assert.equal(e.works,undefined);assert.equal(e.message,undefined);
  assert.deepEqual(e.links,[{title:'noteプロフィールを見る',url:`https://note.com/${id}`}]);
 }
 assert.doesNotMatch(JSON.stringify(source),/キャラクターを変身させたら物語が生まれた/);
});
