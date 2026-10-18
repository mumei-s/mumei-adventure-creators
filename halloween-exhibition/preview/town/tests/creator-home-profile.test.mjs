import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {creatorHomeProfile} from '../creator-home-profile.js';
const archive=JSON.parse(fs.readFileSync(new URL('../../data/archive.json',import.meta.url),'utf8'));
test('every current creator including the host and new participant has their own actual profile',()=>{
 for(const person of archive.creators){const page=creatorHomeProfile(archive,person.id);assert.equal(page.name,person.name);assert.equal(page.profileURL,person.profileURL);assert.ok(page.works.every(work=>new URL(work.url).hostname==='note.com'));}
 assert.ok(creatorHomeProfile(archive,'ss_yr').works.some(work=>work.introduction));assert.ok(creatorHomeProfile(archive,'ss_yr').works.some(work=>!work.introduction));assert.equal(creatorHomeProfile(archive,'unknown'),null);
});
test('pending creators keep their profile without inventing a submission or reusing the portrait as artwork',()=>{
 for(const id of ['grand_daisy8632','airoumu_rin']){const page=creatorHomeProfile(archive,id);assert.equal(page.pending,true);assert.deepEqual(page.works,[]);assert.ok(page.avatar);assert.equal(page.profileURL,`https://note.com/${id}`);}
});
test('hidden, pending, duplicate and non-article links stay out of a creator home',()=>{
 const source={creators:[{id:'alice',name:'Alice',profileURL:'https://note.com/alice'}],years:[{year:2026,entries:[{creatorId:'alice',title:'A',submissionStatus:'submitted',links:[{title:'work',url:'https://note.com/alice/n/n123'},{url:'https://note.com/alice/n/n123'},{url:'https://note.com/alice'},{url:'javascript:alert(1)'},{url:'https://note.com.evil.test/alice/n/n123'}]},{creatorId:'alice',visible:false,links:[{url:'https://note.com/alice/n/nhidden'}]},{creatorId:'alice',submissionStatus:'pending',links:[{url:'https://note.com/alice/n/npending'}]}]}]};
 assert.deepEqual(creatorHomeProfile(source,'alice').works.map(work=>work.url),['https://note.com/alice/n/n123']);
 for(const profileURL of ['https://note.com/bob','http://note.com/alice','https://note.com@evil.test/alice','javascript:alert(1)'])assert.equal(creatorHomeProfile({...source,creators:[{id:'alice',profileURL}]},'alice').profileURL,null);
});
test('the selected edition controls home works and a missing edition chooses the newest archive',()=>{
 const source={creators:[{id:'a',profileURL:'https://note.com/a'}],years:[2024,2026].map(year=>({year,entries:[{creatorId:'a',title:String(year),links:[{url:`https://note.com/a/n/n${year}`}]}]}))};
 assert.equal(creatorHomeProfile(source,'a',2024).works[0].title,'2024');assert.equal(creatorHomeProfile(source,'a',2099).works[0].title,'2026');
});
