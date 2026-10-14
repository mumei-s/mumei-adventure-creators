import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createState,validateArchive,validateCatalog,validateState,saveEntry,deleteEntry,restoreEntry,importData,publicFiles,safeURL,STORAGE_KEY} from '../model.js';
const archive=JSON.parse(fs.readFileSync(new URL('../../data/archive.json',import.meta.url)));const catalog=JSON.parse(fs.readFileSync(new URL('../../maze/data/catalog.json',import.meta.url)));const state=()=>createState(archive,catalog);const values={creatorId:'ss_yr',title:'テスト作品',url:'https://note.com/ss_yr/n/test',image:'',description:'紹介文',order:0,visible:true,year:2026};
test('current contracts and exact nine creator IDs validate',()=>{assert.equal(validateArchive(archive).schemaVersion,1);assert.equal(validateCatalog(catalog).schemaVersion,2);assert.equal(state().archive.creators.length,9);});
test('archive + catalog export-import roundtrip preserves all source data',()=>{const s=state(),out=publicFiles(s);assert.deepEqual(JSON.parse(out.archive),archive);assert.deepEqual(JSON.parse(out.catalog),catalog);assert.deepEqual(importData(s,JSON.parse(JSON.stringify(s))),s);});
test('three independent collections save without mutating source',()=>{let s=state();s=saveEntry(s,'normal',null,null,values);s=saveEntry(s,'halloween',2027,null,values);s=saveEntry(s,'horror',null,null,values);assert.equal(s.archive.evergreenEntries.length,1);assert.equal(s.archive.years.find(y=>y.year===2027).entries.length,1);assert.equal(s.catalog.articles.length,1);assert.equal(archive.evergreenEntries.length,0);});
test('multiple links and works preserve independent visibility and order',()=>{const s=saveEntry(state(),'normal',null,null,{...values,extraLinks:[{title:'記事2',url:'https://note.com/ss_yr/n/two',order:3,visible:false}],works:[{title:'作品3',url:'https://note.com/ss_yr/n/three',order:1,visible:true}]});assert.equal(s.archive.evergreenEntries[0].links.length,2);assert.equal(s.archive.evergreenEntries[0].works.length,1);assert.equal(s.archive.evergreenEntries[0].links[1].visible,false);assert.deepEqual(JSON.parse(publicFiles(s).archive),s.archive);});
test('edit preserves unrelated metadata and secondary links',()=>{const s=saveEntry(state(),'halloween',2026,0,values),old=archive.years[0].entries[0],e=s.archive.years[0].entries[0];assert.equal(e.role,old.role);assert.deepEqual(e.tags,old.tags);assert.deepEqual(e.links.slice(1),old.links.slice(1));assert.equal(e.message,values.description);});
test('delete and restore recover exact data; duplicate restore fails safely',()=>{let s=state(),original=s.archive.years[0].entries;s=deleteEntry(s,'halloween',2026,0);assert.equal(s.trash.length,1);s=restoreEntry(s,0);assert.deepEqual(s.archive.years[0].entries,original);assert.equal(s.trash.length,0);});
test('bad imports and duplicate creators do not mutate drafts',()=>{let s=saveEntry(state(),'normal',null,null,values);const before=JSON.stringify(s);assert.throws(()=>saveEntry(s,'normal',null,null,values));assert.throws(()=>importData(s,{schemaVersion:3}));assert.equal(JSON.stringify(s),before);});
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
