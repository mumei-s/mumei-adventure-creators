import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createState,validateArchive,validateCatalog,validateState,saveEntry,deleteEntry,restoreEntry,importData,publicFiles,safeURL,STORAGE_KEY,entryDoorId,getURL,getPrimaryLink,getExtraLinks} from '../model.js';
const archive=JSON.parse(fs.readFileSync(new URL('../../data/archive.json',import.meta.url)));const catalog=JSON.parse(fs.readFileSync(new URL('../../maze/data/catalog.json',import.meta.url)));const state=()=>createState(archive,catalog);const values={creatorId:'ss_yr',title:'テスト作品',url:'https://note.com/ss_yr/n/test',image:'',description:'紹介文',order:0,visible:true,year:2026};
test('current fifteen-creator archive and legacy nine-creator catalog validate',()=>{assert.equal(validateArchive(archive).schemaVersion,1);assert.equal(validateCatalog(catalog).schemaVersion,2);assert.equal(state().archive.creators.length,15);});
test('archive + catalog export-import roundtrip preserves all source data',()=>{const s=state(),out=publicFiles(s);assert.deepEqual(JSON.parse(out.archive),archive);assert.deepEqual(JSON.parse(out.catalog),catalog);assert.deepEqual(importData(s,JSON.parse(JSON.stringify(s))),s);});
test('three independent collections save without mutating source',()=>{let s=state();s=saveEntry(s,'normal',null,null,values);s=saveEntry(s,'halloween',2027,null,values);s=saveEntry(s,'horror',null,null,values);assert.equal(s.archive.evergreenEntries.length,archive.evergreenEntries.length+1);assert.equal(s.archive.years.find(y=>y.year===2027).entries.length,1);assert.equal(s.catalog.articles.length,catalog.articles.length+1);});
test('multiple links and works preserve independent visibility and order',()=>{const s=saveEntry(state(),'normal',null,null,{...values,extraLinks:[{title:'記事2',url:'https://note.com/ss_yr/n/two',order:3,visible:false}],works:[{title:'作品3',url:'https://note.com/ss_yr/n/three',order:1,visible:true}]});assert.equal(s.archive.evergreenEntries[0].links.length,2);assert.equal(s.archive.evergreenEntries[0].works.length,1);assert.equal(s.archive.evergreenEntries[0].links[1].visible,false);assert.deepEqual(JSON.parse(publicFiles(s).archive),s.archive);});
test('edit preserves unrelated metadata and secondary links',()=>{const s=saveEntry(state(),'halloween',2026,0,values),old=archive.years[0].entries[0],e=s.archive.years[0].entries[0];assert.equal(e.role,old.role);assert.deepEqual(e.tags,old.tags);assert.deepEqual(e.links.slice(1),old.links.slice(1));assert.equal(e.message,values.description);});
test('delete and restore recover exact data; duplicate restore fails safely',()=>{let s=state(),original=s.archive.years[0].entries;s=deleteEntry(s,'halloween',2026,0);assert.equal(s.trash.length,1);s=restoreEntry(s,0);assert.deepEqual(s.archive.years[0].entries,original);assert.equal(s.trash.length,0);});
test('bad imports and duplicate door IDs do not mutate drafts',()=>{const s=saveEntry(state(),'normal',null,null,values),before=JSON.stringify(s),duplicate=cloneForTest(s);duplicate.archive.evergreenEntries.push({...duplicate.archive.evergreenEntries[0]});assert.throws(()=>importData(s,duplicate),/扉IDが重複/);assert.throws(()=>importData(s,{schemaVersion:3}));assert.equal(JSON.stringify(s),before);});
test('unsafe URL and nonfinite order rejected',()=>{for(const url of ['javascript:alert(1)','data:text/html,x','http://example.com','https://name:secret@example.com','https://example.com\\x'])assert.equal(safeURL(url),null);assert.equal(safeURL('assets/../private.png',true),null);assert.equal(safeURL('assets/art.png',true),'assets/art.png');assert.throws(()=>saveEntry(state(),'normal',null,null,{...values,url:'javascript:alert(1)'}));assert.throws(()=>saveEntry(state(),'normal',null,null,{...values,order:NaN}));});
test('incomplete or wrong schema and unknown creator IDs rejected',()=>{const s=state();s.archive.creators[0].id='outsider';assert.throws(()=>validateState(s));assert.throws(()=>validateCatalog({...catalog,collections:[{id:'normal'}]}));});
test('storage is exhibition-scoped; source never clears unrelated state or uses secrets',()=>{assert.equal(STORAGE_KEY,'halloween-exhibition:article-editor:v1');const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');assert.equal(/localStorage\.clear|sessionStorage\.clear|INSIGHT|Authorization|access_token/.test(app),false);});

test('library validation messages are genre-neutral and compatibility IDs stay unchanged',()=>{
 assert.throws(()=>validateCatalog({}),/schemaVersion: 2 の書庫データ/);
 const s=saveEntry(state(),'horror',null,null,values);
 assert.equal(s.catalog.articles[0].collection,'horror');assert.equal(s.catalog.articles[0].kind,'作品');
 const invalid=cloneForTest(s.catalog);invalid.articles[0].url='javascript:alert(1)';
 assert.throws(()=>validateCatalog(invalid),/記事のID・書庫・HTTPS URL/);
 const duplicate=cloneForTest(s.catalog);duplicate.articles.push({...duplicate.articles[0]});
 assert.throws(()=>validateCatalog(duplicate),/記事IDが重複/);
 const legacy=cloneForTest(s);legacy.catalog.articles[0].kind='ホラーイラスト';
 const edited=saveEntry(legacy,'horror',null,0,{...values,title:'変更後'});
 assert.equal(edited.catalog.articles[0].kind,legacy.catalog.articles[0].kind,'existing metadata is preserved, not migrated');
 assert.equal(edited.catalog.articles[0].id,legacy.catalog.articles[0].id);
});
function cloneForTest(value){return JSON.parse(JSON.stringify(value));}

test('main/editor UI, aria/help source and README contain no genre-only article wording',()=>{
 const root=new URL('../../',import.meta.url);
 for(const directory of ['', 'admin/']){
  for(const item of fs.readdirSync(new URL(directory,root),{withFileTypes:true})){
   if(!item.isFile()||!/[.](?:js|html|css|md|webmanifest)$/.test(item.name))continue;
   const path=directory+item.name,source=fs.readFileSync(new URL(path,root),'utf8');
   assert.doesNotMatch(source,/ホラー記事|ホラーイラスト|ホラー専用/,path);
  }
 }
});

test('same creator may have independent article doors in the same collection and year',()=>{
 let s=state();const start=s.archive.years.find(y=>y.year===2026).entries.length;
 s=saveEntry(s,'halloween',2026,null,{...values,title:'最初の扉',image:'assets/first.png'});
 s=saveEntry(s,'halloween',2026,null,{...values,title:'次の扉',url:'https://note.com/ss_yr/n/second',image:'assets/second.png'});
 const entries=s.archive.years.find(y=>y.year===2026).entries,first=cloneForTest(entries[start]),second=entries[start+1];
 assert.notEqual(first.doorId,second.doorId);assert.equal(first.creatorId,second.creatorId);assert.notEqual(first.image,second.image);assert.notEqual(getURL(first),getURL(second));
 s=saveEntry(s,'halloween',2026,start+1,{...values,title:'次の扉を更新',url:'https://note.com/ss_yr/n/second-edited',image:'assets/second-edited.png'});
 assert.deepEqual(s.archive.years[0].entries[start],first);assert.equal(s.archive.years[0].entries[start+1].doorId,second.doorId);
 const edited=cloneForTest(s.archive.years[0].entries[start+1]);s=deleteEntry(s,'halloween',2026,start);assert.deepEqual(s.archive.years[0].entries[start],edited);
 s=restoreEntry(s,0);assert.deepEqual(s.archive.years[0].entries[start],first);assert.deepEqual(s.archive.years[0].entries[start+1],edited);
});

test('pending doors accept unknown main URL without fabricating a profile destination',()=>{
 const s=saveEntry(state(),'normal',null,null,{...values,submissionStatus:'pending',url:'',extraLinks:[{title:'プロフィール',url:'https://note.com/ss_yr'}]});
 const entry=s.archive.evergreenEntries.at(-1);assert.equal(getURL(entry),'');assert.equal(entry.links[0].url,'');assert.equal(entry.links[1].url,'https://note.com/ss_yr');assert.equal(entry.submissionStatus,'pending');
 assert.deepEqual(importData(state(),JSON.parse(JSON.stringify(s))),s);assert.equal(JSON.parse(publicFiles(s).archive).evergreenEntries.at(-1).links[0].url,'');
 for(const submissionStatus of ['submitted','introduction'])assert.throws(()=>saveEntry(s,'normal',null,s.archive.evergreenEntries.length-1,{...values,submissionStatus,url:''}),/HTTPS/);
 const published=saveEntry(s,'normal',null,s.archive.evergreenEntries.length-1,{...values,submissionStatus:'submitted'}).archive.evergreenEntries.at(-1);
 assert.equal(published.doorId,entry.doorId);assert.equal(getURL(published),values.url);assert.equal(published.links[1].url,'https://note.com/ss_yr');
});

test('empty secondary links, unsafe pending main and missing submitted main are rejected',()=>{
 assert.throws(()=>saveEntry(state(),'normal',null,null,{...values,url:'',submissionStatus:'pending',extraLinks:[{title:'空欄',url:''}]}),/HTTPS/);
 assert.throws(()=>saveEntry(state(),'normal',null,null,{...values,url:'http://example.com',submissionStatus:'pending'}),/HTTPS/);
 assert.throws(()=>saveEntry(state(),'normal',null,null,{...values,url:'',submissionStatus:'pending',works:[{title:'空欄',url:''}]}),/HTTPS/);
 for(const submissionStatus of ['submitted','introduction']){
  const input=cloneForTest(archive);input.evergreenEntries=[{creatorId:'ss_yr',doorId:'empty-article',title:'未設定',submissionStatus,links:[],works:[{title:'別の作品',url:values.url}]}];
  assert.throws(()=>validateArchive(input),/メインの記事のHTTPS URL/);
 }
});

test('legacy profile-only pending entries retain their profile as an extra when explicitly edited',()=>{
 const s=state(),entry=s.archive.years[0].entries.find(e=>e.submissionStatus==='pending'&&e.links?.[0]?.url),index=s.archive.years[0].entries.indexOf(entry),original=cloneForTest(entry);
 delete entry.doorId;
 assert.equal(getURL(entry),'');assert.equal(getPrimaryLink(entry),null);assert.deepEqual(getExtraLinks(entry),entry.links);
 const saved=saveEntry(s,'halloween',2026,index,{...values,creatorId:entry.creatorId,submissionStatus:'pending',url:''}),edited=saved.archive.years[0].entries[index];
 assert.equal(edited.doorId,`legacy-archive-2026-${entry.creatorId}`);assert.equal(getURL(edited),'');assert.deepEqual(edited.links.slice(1),original.links);
 assert.deepEqual(s.archive.years[0].entries[index].links,original.links,'saving leaves the original draft untouched');
});

test('legacy v1 drafts roundtrip unchanged and identity migrates only on explicit edit',()=>{
 const legacy=state();legacy.archive.evergreenEntries=[{creatorId:'ss_yr',title:'以前の下書き',links:[{title:'本文',url:values.url}],custom:'keep'}];
 legacy.trash=[{collection:'normal',year:null,index:0,entry:{creatorId:'koakumako',title:'以前の削除',links:[]},deletedAt:'2026-10-01T00:00:00.000Z'}];
 const snapshot=JSON.stringify(legacy),read=importData(state(),JSON.parse(snapshot));assert.equal(JSON.stringify(read),snapshot);assert.equal(read.editorVersion,1);assert.equal(read.archive.schemaVersion,1);
 assert.equal(entryDoorId(read.archive.evergreenEntries[0],'normal',null),'legacy-evergreen-ss_yr');assert.equal('doorId' in read.archive.evergreenEntries[0],false);
 const edited=saveEntry(read,'normal',null,0,values);assert.equal(edited.archive.evergreenEntries[0].doorId,'legacy-evergreen-ss_yr');assert.equal(edited.archive.evergreenEntries[0].custom,'keep');assert.deepEqual(edited.trash,read.trash);
 const changedCreator=saveEntry(edited,'normal',null,0,{...values,creatorId:'koakumako'});assert.equal(changedCreator.archive.evergreenEntries[0].doorId,'legacy-evergreen-ss_yr');
 assert.equal(JSON.stringify(legacy),snapshot);
});

test('explicit door IDs reject invalid and colliding identities, including legacy collisions',()=>{
 for(const doorId of ['',null,42,'has spaces','-bad','a'.repeat(121)]){
  const input=cloneForTest(archive);input.evergreenEntries=[{creatorId:'ss_yr',title:'扉',doorId,submissionStatus:'pending',links:[]}];assert.throws(()=>validateArchive(input),/扉ID/);
 }
 const input=cloneForTest(archive);input.evergreenEntries=[{creatorId:'ss_yr',title:'以前の扉',links:[]},{creatorId:'koakumako',title:'重複',doorId:'legacy-evergreen-ss_yr',submissionStatus:'pending',links:[]}];assert.throws(()=>validateArchive(input),/扉IDが重複/);
 input.evergreenEntries[1].doorId='different-door';input.evergreenEntries[1].creatorId='ss_yr';assert.equal(validateArchive(input),input);
 const crossCollection=cloneForTest(input);crossCollection.years[0].entries.push({...input.evergreenEntries[1]});assert.equal(validateArchive(crossCollection),crossCollection,'identity uniqueness is scoped to each collection');
});

test('restore rejects a door ID collision and retains both active draft and trash',()=>{
 let s=saveEntry(state(),'normal',null,null,values);const original=cloneForTest(s.archive.evergreenEntries.at(-1));s=deleteEntry(s,'normal',null,s.archive.evergreenEntries.length-1);s.archive.evergreenEntries.push({...original,title:'同じID'});const snapshot=JSON.stringify(s);
 assert.throws(()=>restoreEntry(s,s.trash.length-1),/扉IDが重複/);assert.equal(JSON.stringify(s),snapshot);
});

test('editing the host preserves its role while a new owner door has no host role',()=>{
 const s=state(),index=s.archive.years[0].entries.findIndex(e=>e.role==='host'),host=s.archive.years[0].entries[index];
 const edited=saveEntry(s,'halloween',2026,index,{...values,submissionStatus:'introduction'});assert.equal(edited.archive.years[0].entries[index].role,'host');assert.equal(edited.archive.years[0].entries[index].doorId,entryDoorId(host,'halloween',2026));
 const added=saveEntry(edited,'halloween',2026,null,{...values,submissionStatus:'pending',url:''}).archive.years[0].entries.at(-1);assert.equal(added.creatorId,'ss_yr');assert.equal(added.role,undefined);assert.notEqual(added.doorId,edited.archive.years[0].entries[index].doorId);
});

test('editor presents fixed door identity and status-sensitive main URL guidance',()=>{
 const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8'),html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/<input id="door-id" readonly/);assert.match(html,/id="url-requirement"/);assert.match(html,/id="url-guidance"/);assert.match(app,/\$\('url'\)\.required=!pending/);
 assert.doesNotMatch(app+html,/1人につき1つ/);assert.match(app,/model\.js\?v=20261015-iris1/);assert.match(html,/app\.js\?v=20261015-clear1/);
 assert.match(fs.readFileSync(new URL('../model.js',import.meta.url),'utf8'),/data-model\.js\?v=20261014-doors1/);
});

test("new creator is editable without changing legacy adventure roster",()=>{const s=saveEntry(state(),"normal",null,null,{...values,creatorId:"clever_hare2654"});assert.equal(s.archive.evergreenEntries.at(-1).creatorId,"clever_hare2654");assert.deepEqual(s.catalog,catalog);const old=structuredClone(archive);old.creators=old.creators.filter(c=>c.id!=="clever_hare2654");old.years[0].entries=old.years[0].entries.filter(e=>e.creatorId!=="clever_hare2654");assert.doesNotThrow(()=>validateArchive(old));});

test('three added participant IDs edit independently and preserve the adventure catalog',()=>{
 for(const creatorId of ['glossy_guppy6230','aihan_days','cheeky_rhino7031','grand_daisy8632','real_hyena9474']){
  const s=saveEntry(state(),'halloween',2026,null,{...values,creatorId});
  assert.equal(s.archive.years[0].entries.at(-1).creatorId,creatorId);assert.deepEqual(s.catalog,catalog);
 }
 for(const count of [9,10,13]){
  const old=structuredClone(archive);old.creators=old.creators.slice(0,count);
  const ids=new Set(old.creators.map(c=>c.id));old.years[0].entries=old.years[0].entries.filter(e=>ids.has(e.creatorId));
  assert.doesNotThrow(()=>validateArchive(old));
 }
 for(const change of [d=>d.creators.push(d.creators[0]),d=>d.creators.splice(0,1),d=>d.creators.push({id:'unknown',name:'Unknown'})]){const d=structuredClone(archive);change(d);assert.throws(()=>validateArchive(d));}
});
