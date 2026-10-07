import assert from 'node:assert/strict';
import {readPublicProfile} from '../supabase/functions/halloween-profile/profile.js';
import {bodyText,publicArticle,articleEvidence} from '../supabase/functions/halloween-profile/articles.js';
import {mergeCreator,articleContext,compactCreatorProfile} from '../creator.js';
import {profileForArtwork} from '../activity-settings.js';

assert.equal(bodyText('<script>ignore()</script><p>海&amp;空</p><p>季節&#12398;記録</p>'),'海&空 季節の記録');
assert.equal(publicArticle({user:{urlname:'other'}},'author'),false);
assert.equal(publicArticle({price:500},'author'),false);
assert.equal(publicArticle({paywall:{requires_membership:true}},'author'),false);
assert.equal(publicArticle({is_draft:true},'author'),false);
assert.equal(publicArticle({user:{urlname:'author'},price:0},'author'),true);
assert.ok(articleEvidence('短い導入。作者は毎朝の海辺を歩きながら、色の変化や写真の発見を記録しています。午後は家で絵の道具を整え、新しい紙の質感を確かめる日々を続けています。').excerpts.some(text=>text.includes('海辺')));

const originalFetch=globalThis.fetch,notes=Array.from({length:75},(_,index)=>({key:'n'+index.toString(16).padStart(12,'0'),name:'ARTICLE_'+index,user:{urlname:'author'},price:0}));
let failKey='',bodyRequests=[],active=0,maxActive=0;
globalThis.fetch=async input=>{
 const url=new URL(input);
 if(url.pathname==='/api/v2/creators/author')return Response.json({data:{name:'Author',profile:'旅と写真を記録する作者'}});
 if(url.pathname.endsWith('/contents')){const page=Number(url.searchParams.get('page'));const pageNotes=notes.slice((page-1)*30,page*30);if(page===1)pageNotes.push({key:'nffffffffffff',name:'PAID_TITLE',price:300});return Response.json({data:{contents:pageNotes,isLastPage:page===3}});}
 const key=url.pathname.split('/').pop(),index=notes.findIndex(note=>note.key===key);bodyRequests.push(key);active++;maxActive=Math.max(maxActive,active);await new Promise(resolve=>setTimeout(resolve,1));active--;
 if(key===failKey)throw new Error('temporary unavailable');
 return Response.json({data:{...notes[index],body:'<p>ARTICLE_BODY_'+index+'の海辺の写真と季節の暮らしを、作者ならではの記録として残しています。</p><p>後半の記録_'+index+'。新しい物語を作品にして、誰かの毎日へ届けたいと考えています。</p>'}});
};
try{
 let profile=null,page=1;
 while(page){const next=await readPublicProfile('author',page);profile=mergeCreator(profile,next);page=next.pagination.nextPage;}
 assert.equal(profile.articles.length,75,'Every listing page and every public body must survive aggregation');
 assert.equal(profile.sourceEvidence.length,75);
 assert.equal(profile.bodyRead.count,75);
 assert.deepEqual(profile.bodyRead.pages,[1,2,3]);
 assert.equal(profile.bodyRead.listed,76);
 assert.equal(profile.bodyRead.unavailable,1);
 assert.equal(profile.bodyRead.status,'complete');
 assert.equal(bodyRequests.length,75);
 assert.ok(maxActive<=6&&maxActive>1,'Bounded concurrent reads reduce latency');
 assert.ok(profile.titles.includes('ARTICLE_29')&&profile.titles.includes('ARTICLE_74'),'Do not retain only eight titles per page');
 assert.ok(profile.articles.at(-1).text.includes('ARTICLE_BODY_74'),'Bodies from older pages are retained');
 const artwork=profileForArtwork(profile,true,new Set(['写真']));
 assert.deepEqual(artwork.topics,[],'Tags default OFF');
 assert.equal(artwork.tagsEnabled,false);
 assert.equal(artwork.articles.length,75,'Tags OFF keeps body context');
 assert.equal(artwork.biography,profile.biography);
 assert.deepEqual(artwork.inspiration.phrases,profile.inspiration.phrases,'Dialogue remains enabled with tags OFF');
 const selected=profileForArtwork(profile,true,new Set(['写真']),{tagsEnabled:true});
 assert.ok(!selected.topics.includes('写真'));
 assert.deepEqual(selected.inspiration,profile.inspiration,'Removing a supplemental tag does not discard article signals');
 const context=articleContext(artwork,{maxCharacters:7200,maxArticles:24});
 assert.ok(context.includes('ARTICLE_0')&&context.includes('ARTICLE_74'),'Representative input contains both newest and oldest sources');
 assert.ok(context.includes('ARTICLE_BODY_74'));
 assert.ok(context.length<=7200);
 const compact=compactCreatorProfile(profile);
 assert.equal(compact.articles.length,0,'History must not store all body text');
 assert.equal(compact.sourceEvidence.length,24);
 assert.ok(compact.sourceEvidence.at(-1).title==='ARTICLE_74');
 assert.ok(articleContext(compact).includes('ARTICLE_BODY_74'));
 assert.equal(profile.articles.length,75,'Compacting history never mutates the loaded profile');
 failKey=notes[32].key;const partial=await readPublicProfile('author',2);
 assert.equal(partial.bodyRead.status,'partial');
 assert.deepEqual(partial.bodyRead.failedKeys,[failKey]);
 assert.equal(partial.articles.length,29);
 failKey='';const repaired=mergeCreator(partial,await readPublicProfile('author',2));
 assert.equal(repaired.articles.length,30);
 assert.deepEqual(repaired.bodyRead.failedKeys,[]);
 assert.equal(repaired.bodyRead.status,'complete','A retried public body clears its partial status');
 assert.equal(articleContext(profileForArtwork(profile,false)),'');
 await assert.rejects(readPublicProfile('bad/id',1),/ID形式/);
}finally{globalThis.fetch=originalFetch;}
console.log('PASS profile v25: 75 complete public bodies over three pages, independent optional tags, original dialogue context, bounded representative evidence, compact history, explicit partial reads and repair.');
