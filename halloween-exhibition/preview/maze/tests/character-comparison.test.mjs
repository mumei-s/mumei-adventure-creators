import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {readFile,access} from 'node:fs/promises';
import {comparisonEntries,portraitURL,spriteURL,noteProfileURL} from '../../characters/model.js';
const archive=JSON.parse(await readFile(new URL('../../data/archive.json',import.meta.url),'utf8'));
const manifest=JSON.parse(await readFile(new URL('../data/creator-characters.json',import.meta.url),'utf8'));
const base='https://example.test/mumei-adventure-creators/halloween-exhibition/preview/characters/app.js';
test('both the old missing menu destination and the public comparison page exist',async()=>{
 const legacy=new URL('../../work-review/cast-check.html',import.meta.url),html=await readFile(legacy,'utf8');
 assert.match(html,/location\.replace/);assert.match(html,/\.\.\/characters\//);await access(new URL('../../characters/index.html',import.meta.url));await access(new URL('../../characters/app.js',import.meta.url));
});
test('comparison uses approved runtime characters and keeps pending participants visible',async()=>{
 const entries=comparisonEntries(archive,manifest),ready=entries.filter(entry=>entry.ready),pending=entries.filter(entry=>!entry.ready);
 assert(ready.length>=20);assert.equal(new Set(entries.map(entry=>entry.id)).size,entries.length);assert(ready.some(entry=>entry.id==='owner-lantern-hero'));assert(ready.some(entry=>entry.id==='owner-black-cat'));
 assert.equal(ready.filter(entry=>entry.creatorId==='grand_daisy8632').length,3);assert(ready.some(entry=>entry.id==='rin-rai-lion'&&entry.creatorId==='airoumu_rin'));assert(!pending.some(entry=>entry.creatorId==='airoumu_rin'));
 for(const entry of ready){const url=spriteURL(entry.asset,base);assert(url.startsWith('https://example.test/mumei-adventure-creators/halloween-exhibition/preview/maze/assets/'));await access(new URL('../'+entry.asset.src,import.meta.url));}
 for(const entry of pending)assert.equal(entry.asset,undefined);
});
test('comparison links stay under the published project and reject unsafe paths',()=>{
 assert.equal(portraitURL('assets/portraits/ss_yr.jpg',base),'https://example.test/mumei-adventure-creators/halloween-exhibition/preview/assets/portraits/ss_yr.jpg');
 assert.equal(spriteURL({src:'../../missing.webp'},base),null);assert.equal(portraitURL('../../missing.jpg',base),null);assert.equal(portraitURL('javascript:alert(1)',base),null);
 assert.equal(noteProfileURL('https://note.com/ss_yr'),'https://note.com/ss_yr');assert.equal(noteProfileURL('https://other.test/ss_yr'),null);assert.equal(noteProfileURL('https://note.com.evil.test/ss_yr'),null);
});
test('comparison defers individual sprites until selection instead of loading the whole roster',async()=>{
 const app=await readFile(new URL('../../characters/app.js',import.meta.url),'utf8');
 assert.match(app,/function loadSprite\(entry,token\)/);assert.match(app,/im\.fetchPriority='high'/);assert.match(app,/if\(document\.hidden\)return/);assert.doesNotMatch(app,/Promise\.all\(entries\.map/);
});


test('comparison and source-mode manifests use matching content versions, with a versioned comparison app',async()=>{
 const data=await readFile(new URL('../data/creator-characters.json',import.meta.url)),hash=crypto.createHash('sha256').update(data).digest('hex').slice(0,12);
 for(const file of ['../../characters/app.js','../startup-assets.js','../../town/character-art.js']){
  const source=await readFile(new URL(file,import.meta.url),'utf8');assert(source.includes('creator-characters.json?v='+hash),file);assert.doesNotMatch(source,/creator-characters\.json['"]/);
 }
 const app=await readFile(new URL('../../characters/app.js',import.meta.url)),appHash=crypto.createHash('sha256').update(app).digest('hex').slice(0,12),html=await readFile(new URL('../../characters/index.html',import.meta.url),'utf8');
 assert(html.includes('src="./app.js?v='+appHash+'"'));
 const rai=manifest.characters.find(character=>character.id==='rin-rai-lion');assert.equal(new URL(spriteURL(rai.asset,base)).searchParams.get('v'),rai.asset.sha256.slice(0,12));
});
