import test from 'node:test';
import assert from 'node:assert/strict';
import {paginateRoster} from '../roster-pagination.js';

const entries=[...Array(7)].flatMap((_,i)=>[{creatorId:`person-${i}`,doorId:`article-${i}`}]);
entries.splice(6,0,{creatorId:'person-0',doorId:'second-article'});

test('pages contain five distinct people and every door of those people in original order',()=>{
 const first=paginateRoster(entries,0),second=paginateRoster(entries,1);
 assert.equal(first.creatorCount,7);assert.equal(first.visibleCreatorCount,5);assert.equal(first.pageCount,2);
 assert.deepEqual(first.entries.map(e=>e.doorId),['article-0','article-1','article-2','article-3','article-4','second-article']);
 assert.deepEqual(second.entries.map(e=>e.doorId),['article-5','article-6']);
 assert.equal(new Set([...first.entries,...second.entries].map(e=>e.doorId)).size,entries.length);
});
test('empty, stale, negative and noninteger page preferences clamp without changing entries',()=>{
 assert.deepEqual(paginateRoster([],8),{page:0,pageCount:0,start:0,creatorCount:0,visibleCreatorCount:0,entries:[]});
 assert.equal(paginateRoster(entries,999).page,1);
 for(const invalid of [-1,1.5,NaN])assert.equal(paginateRoster(entries,invalid).page,0);
});
