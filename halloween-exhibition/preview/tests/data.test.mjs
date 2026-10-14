import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, access} from 'node:fs/promises';
import {validateArchive,safeURL,normalizeSearch} from '../data-model.js';
const source=JSON.parse(await readFile(new URL('../data/archive.json',import.meta.url)));
// Snapshot of yearbook-roster/verified-profiles.json, verified 2026-10-13.
// Kept local so the shipped preview tests remain independently runnable.
const verified=JSON.parse(await readFile(new URL('./fixtures/verified-profiles.json',import.meta.url)));

test('nine verified public profiles with no future slots, with no invented creators',()=>{
  validateArchive(source);
  assert.equal(source.creators.length,9);
  assert.deepEqual(source.creators.map(c=>c.id),verified.map(c=>c.id));
  assert.equal(source.creators.filter(c=>c.provisional).length,0);
  assert.equal(source.years[0].entries.length,9);
  assert.equal(source.years[0].plannedSlots,undefined);
  assert.deepEqual(source.evergreenEntries,[]);
  assert.deepEqual(source.years[0].entries.map(e=>e.creatorId),verified.map(c=>c.id));
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
    await access(new URL('../'+creator.avatar,import.meta.url));
  }
});

test('only the host has article artwork; other entries explicitly await submissions',()=>{
  const [host,...participants]=source.years[0].entries;
  assert.equal(host.creatorId,'ss_yr');
  assert.equal(host.role,'host');
  assert.equal(host.links[0].url,'https://note.com/ss_yr/n/n52be511ec082');
  assert.match(host.image,/322657367\/rectangle_large_type_2_6cd807a5c7b4cef57389ab4adf353974/);
  for(const entry of participants){
    const profile=verified.find(c=>c.id===entry.creatorId);
    assert.equal(entry.submissionStatus,'pending');
    assert.equal(entry.title,'作品準備中');
    assert.equal(entry.image,undefined);
    assert.equal(entry.message,undefined);
    assert.equal(entry.works,undefined);
    assert.deepEqual(entry.links,[{title:'noteプロフィールを見る',url:profile.profileURL}]);
  }
});

test('stable creator IDs may recur across years',()=>{const data=structuredClone(source);data.years.push({...structuredClone(data.years[0]),year:2027});assert.equal(validateArchive(data).years.length,2);});
test('empty year and roster are valid',()=>{assert.doesNotThrow(()=>validateArchive({schemaVersion:1,creators:[],years:[{year:2026,title:'',description:'',entries:[]}]}));});
test('duplicate creators, duplicate annual entries, unknown IDs, duplicate years reject',()=>{for(const change of [d=>d.creators.push(d.creators[0]),d=>d.years[0].entries.push(d.years[0].entries[0]),d=>d.years[0].entries[0].creatorId='missing',d=>d.years.push(d.years[0])]){const d=structuredClone(source);change(d);assert.throws(()=>validateArchive(d));}});
test('planned slots are optional nonnegative integers and do not create entries',()=>{
  for(const value of [-1,1.5,101,'2',null]){const data=structuredClone(source);data.years[0].plannedSlots=value;assert.throws(()=>validateArchive(data));}
  for(const value of [0,2,100]){const data=structuredClone(source);data.years[0].plannedSlots=value;assert.equal(validateArchive(data).years[0].entries.length,9);}
  const data=structuredClone(source);delete data.years[0].plannedSlots;assert.doesNotThrow(()=>validateArchive(data));
});
test('malformed profile field types reject',()=>{for(const key of ['avatar','avatarSource','profileURL']){const data=structuredClone(source);data.creators[0][key]={url:'bad'};assert.throws(()=>validateArchive(data));}});
test('unsafe URLs and traversal reject',()=>{for(const url of ['javascript:alert(1)','data:text/html,x','http://example.com','//example.com','assets/../private.png','https://user:secret@example.com','https://x.com/\nx'])assert.equal(safeURL(url,{image:true}),null);assert.equal(safeURL('./assets/portal.svg',{image:true}),'./assets/portal.svg');assert.equal(safeURL('https://example.com'),'https://example.com/');});
test('search normalizes width, case, whitespace',()=>{assert.equal(normalizeSearch(' ＡＢＣ '),'abc');});
