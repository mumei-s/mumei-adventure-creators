import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, access} from 'node:fs/promises';
import {validateArchive,safeURL,normalizeSearch,doorIdFor} from '../data-model.js';
const source=JSON.parse(await readFile(new URL('../data/archive.json',import.meta.url)));
// Original nine-profile snapshot verified 2026-10-13; カモミール verified 2026-10-15 JST; 凛 added 2026-10-18 JST.
// Kept local so the shipped preview tests remain independently runnable.
const verified=JSON.parse(await readFile(new URL('./fixtures/verified-profiles.json',import.meta.url)));

test('sixteen verified profiles and seventeen article doors without invented creators',()=>{
  validateArchive(source);
  assert.equal(source.creators.length,16);
  assert.deepEqual(source.creators.map(c=>c.id),verified.map(c=>c.id));
  assert.equal(source.creators.filter(c=>c.provisional).length,0);
  assert.equal(source.years[0].entries.length,17);
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

test('host introduction and fifteen confirmed participant articles are present; one door awaits submission',()=>{
  const [host,owner,mako]=source.years[0].entries;
  assert.equal(owner.doorId,'owner-work-2026');
  assert.equal(owner.submissionStatus,'submitted');
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
  assert.equal(source.years[0].entries.filter(e=>e.submissionStatus==='submitted').length,15);
  assert.equal(participants.length,1);
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
  assert.equal(source.years[0].entries.find(e=>e.creatorId==='soh_style_work').submissionStatus,'submitted');
  assert.equal(source.years[0].entries.find(e=>e.creatorId==='imota14').submissionStatus,'submitted');
  assert.equal(source.years[0].entries.find(e=>e.creatorId==='glossy_guppy6230').submissionStatus,'submitted');
  assert.deepEqual(source.evergreenEntries,[]);
});

test('stable creator IDs may recur across years',()=>{const data=structuredClone(source);data.years.push({...structuredClone(data.years[0]),year:2027});assert.equal(validateArchive(data).years.length,2);});
test('empty year and roster are valid',()=>{assert.doesNotThrow(()=>validateArchive({schemaVersion:1,creators:[],years:[{year:2026,title:'',description:'',entries:[]}]}));});
test('duplicate creators, duplicate annual entries, unknown IDs, duplicate years reject',()=>{for(const change of [d=>d.creators.push(d.creators[0]),d=>d.years[0].entries.push(d.years[0].entries[0]),d=>d.years[0].entries[0].creatorId='missing',d=>d.years.push(d.years[0])]){const d=structuredClone(source);change(d);assert.throws(()=>validateArchive(d));}});
test('planned slots are optional nonnegative integers and do not create entries',()=>{
  for(const value of [-1,1.5,101,'2',null]){const data=structuredClone(source);data.years[0].plannedSlots=value;assert.throws(()=>validateArchive(data));}
  for(const value of [0,2,100]){const data=structuredClone(source);data.years[0].plannedSlots=value;assert.equal(validateArchive(data).years[0].entries.length,17);}
  const data=structuredClone(source);delete data.years[0].plannedSlots;assert.doesNotThrow(()=>validateArchive(data));
});
test('malformed profile field types reject',()=>{for(const key of ['avatar','avatarSource','profileURL']){const data=structuredClone(source);data.creators[0][key]={url:'bad'};assert.throws(()=>validateArchive(data));}});
test('unsafe URLs and traversal reject',()=>{for(const url of ['javascript:alert(1)','data:text/html,x','http://example.com','//example.com','assets/../private.png','https://user:secret@example.com','https://x.com/\nx'])assert.equal(safeURL(url,{image:true}),null);assert.equal(safeURL('./assets/portal.svg',{image:true}),'./assets/portal.svg');assert.equal(safeURL('https://example.com'),'https://example.com/');});
test('search normalizes width, case, whitespace',()=>{assert.equal(normalizeSearch(' ＡＢＣ '),'abc');});

test('the published owner work retains its separate door and the fixed project introduction',()=>{
 const extra=source.years[0].entries.find(e=>e.doorId==='owner-work-2026');
 assert.equal(extra.submissionStatus,'submitted');assert.equal(extra.links[0].url,'https://note.com/ss_yr/n/n15700f2773c6');assert.equal(extra.title,"【🎃本格スタート】 無名S note 𝑯𝒂𝒍𝒍𝒐𝒘𝒆𝒆𝒏 𝑨𝒕𝒆𝒍𝒊𝒆𝒓‼️あなたの作品を『魔法の入口🚪』へ🎃");assert.equal(extra.image,"https://assets.st-note.com/production/uploads/images/324657828/rectangle_large_type_2_459273410eb989ab713248ac628c65c9.png?fit=bounds&quality=85&width=1280");assert.equal(source.years[0].entries[0].links[0].url,'https://note.com/ss_yr/n/n52be511ec082');
 assert.equal(source.years[0].entries.filter(e=>e.role==='host').length,1);
 assert.equal(new Set(source.years[0].entries.map(e=>e.creatorId)).size,16);
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

test("verified Takechi work is submitted alongside newly available Marimo while owner work uses its separate door",()=>{const e=source.years[0].entries.find(e=>e.creatorId==="imota14");assert.equal(e.title,"死神と貴公子と、顔に張り紙を貼った私。");assert.equal(e.submissionStatus,"submitted");assert.equal(e.links[0].url,"https://note.com/imota14/n/n618813fb0e89");assert.match(e.image,/324418285/);assert.equal(source.years[0].entries.find(e=>e.creatorId==="soh_style_work").submissionStatus,"submitted");assert.equal(source.years[0].entries.find(e=>e.doorId==="owner-work-2026").links[0].url,"https://note.com/ss_yr/n/n15700f2773c6");});

test('CNA remains pending; unrelated Tantan article is excluded',()=>{
 assert.deepEqual(source.years[0].entries.filter(e=>e.submissionStatus==='pending').map(e=>e.creatorId),['grand_daisy8632']);
 assert.doesNotMatch(JSON.stringify(source),/ne1d31629fa6e|キャラクターを変身させたら物語が生まれた/);
});

test('explicit Yamacon and Aihan articles replace existing pending doors without adding people',()=>{
 for(const [id,note,image,title] of [
  ['fond_holly3483','ne5a25ae27a20','324565762','𝑯𝒂𝒍𝒍𝒐𝒘𝒆𝒆𝒏 𝑨𝒕𝒆𝒍𝒊𝒆𝒓‼️　参加してみた！'],
  ['aihan_days','nfa274d6fe464','324560660','ちょっと試すつもりが…柴犬とハロウィン大冒険！🎃']]){
  const entries=source.years[0].entries.filter(e=>e.creatorId===id);assert.equal(entries.length,1);const e=entries[0];
  assert.equal(e.submissionStatus,'submitted');assert.equal(e.title,title);assert.equal(e.links[0].url,`https://note.com/${id}/n/${note}`);assert.ok(e.image.includes(image));assert.deepEqual(e.tags,['参加者','ハロウィン']);
 }
 assert.equal(source.creators.length,16);assert.equal(source.years[0].entries.length,17);assert.equal(source.years[0].entries[0].submissionStatus,'introduction');assert.equal(source.years[0].entries[1].doorId,'owner-work-2026');assert.equal(source.years[0].entries[1].submissionStatus,'submitted');
});

test("CNA is a new pending participant with no invented article",()=>{const c=source.creators.find(c=>c.id==="grand_daisy8632");assert.equal(c.name,"CNA運営");assert.equal(c.profileURL,"https://note.com/grand_daisy8632");const e=source.years[0].entries.find(e=>e.creatorId===c.id);assert.equal(e.submissionStatus,"pending");assert.equal(e.image,undefined);assert.equal(e.links.length,1);assert.equal(e.links[0].url,c.profileURL);});

 test('Marimo supplied article is now live and all official names match verified profiles',()=>{
 const e=source.years[0].entries.find(e=>e.creatorId==='soh_style_work');assert.equal(e.submissionStatus,'submitted');assert.equal(e.links[0].url,'https://note.com/soh_style_work/n/nc02977b1ebf9');assert.ok(e.image.startsWith('https://assets.st-note.com/'));
 for(const c of source.creators)assert.equal(c.name,verified.find(v=>v.id===c.id).displayName);
 });

test('Iris joins once with the verified public Halloween article and original full profile name',()=>{
 const c=source.creators.find(c=>c.id==='real_hyena9474');assert.equal(c.name,'アイリス｜AIで眠る物語を形にする');
 const entries=source.years[0].entries.filter(e=>e.creatorId===c.id);assert.equal(entries.length,1);const e=entries[0];
 assert.equal(e.title,'かぼちゃの灯りがともる、アイリスのハロウィン');assert.equal(e.submissionStatus,'submitted');assert.equal(e.links[0].url,'https://note.com/real_hyena9474/n/nde7d4a19044d');assert.match(e.image,/324726369/);
 assert.equal(source.years[0].entries[0].role,'host');assert.equal(source.years[0].entries[1].doorId,'owner-work-2026');
});

test("four explicit Halloween submissions replace only their existing pending doors",()=>{
 const expected=[{"id": "n72ea89e9a32e", "title": "『午前零時の解決屋』ハロウィン特別編｜黒猫さん、魔法の入口から音がします。", "image": "https://assets.st-note.com/production/uploads/images/324081013/rectangle_large_type_2_fc66dccba7fc2ce4a5584afc6a2ac55f.png?fit=bounds&quality=85&width=1280", "creatorId": "tenkai_notes", "name": "天界記録", "avatar": "https://assets.st-note.com/production/uploads/images/253576749/profile_70a01c50c971bc4c57351b9f5cc8a299.png?fit=bounds&format=jpeg&quality=85&width=330"}, {"id": "n4cc7e57a4182", "title": "【今日は一斉投稿の日✨️】AIイラスト・ハロウィン・企画参加で魔法の入口をくぐった話🎃", "image": "https://assets.st-note.com/production/uploads/images/324716686/rectangle_large_type_2_f5ef48b0cad2793cfecb16450223d790.png?fit=bounds&quality=85&width=1280", "creatorId": "n_kazumai55633", "name": "ミナト汐　＠光と構図のアトリエ", "avatar": "https://assets.st-note.com/production/uploads/images/322474239/profile_fce4138c4bb1001cc51b60785c106073.png?fit=bounds&format=jpeg&quality=85&width=330"}, {"id": "nd58ac4b4c53d", "title": "【企画に初参加】したんだけど…ハロウィン🎃", "image": "https://assets.st-note.com/production/uploads/images/324587601/rectangle_large_type_2_8ec8a44b2cb35c23f8d86061c2329f25.png?fit=bounds&quality=85&width=1280", "creatorId": "cheeky_rhino7031", "name": "ロキろん", "avatar": "https://assets.st-note.com/production/uploads/images/281429856/profile_394e2eb8124ebdada2bc028db6563ed2.png?fit=bounds&format=jpeg&quality=85&width=330"}, {"id": "n4b2ef2311c28", "title": "今年のハロウィン、どう楽しもう？🎃", "image": "https://assets.st-note.com/production/uploads/images/324762618/rectangle_large_type_2_c16cb3a36f6db9ce02b6436313464842.jpg?fit=bounds&quality=85&width=1280", "creatorId": "glossy_guppy6230", "name": "🍞たんたん🐼", "avatar": "https://assets.st-note.com/production/uploads/images/318256859/profile_d2fbdcbda06d06e5d51adea51865b4a6.jpeg?fit=bounds&format=jpeg&quality=85&width=330"}];
 for(const j of expected){const es=source.years[0].entries.filter(e=>e.creatorId===j.creatorId);assert.equal(es.length,1);const e=es[0];assert.equal(e.submissionStatus,"submitted");assert.equal(e.title,j.title);assert.equal(e.image,j.image);assert.equal(e.links[0].url,`https://note.com/${j.creatorId}/n/${j.id}`);}
});

test("Naemo profile uses the current official avatar without replacing submitted article art",()=>{const c=source.creators.find(c=>c.id==="naemotion");assert.equal(c.name,"なえも｜Kindle作家・支援と当事者の視点");assert.equal(c.avatar,"https://assets.st-note.com/production/uploads/images/324956810/profile_38e6c7db64b5f16f7f09c53de58785df.png?fit=bounds&format=jpeg&quality=85&width=330");assert.equal(c.avatarSource,c.avatar);const e=source.years[0].entries.find(e=>e.creatorId===c.id);assert.match(e.image,/324617440/);assert.notEqual(e.image,c.avatar);assert.equal(e.links[0].url,"https://note.com/naemotion/n/n26b717b6c247");});


test('Rin supplied article replaces the existing pending door without changing identity',()=>{
 const creator=source.creators.find(c=>c.id==='airoumu_rin');assert.equal(creator.name,'凛🦁｜転職活動中｜ワーママ｜AI活用');assert.equal(creator.avatarSource,verified.find(c=>c.id==='airoumu_rin').avatarURL);
 const entries=source.years[0].entries.filter(entry=>entry.creatorId==='airoumu_rin');assert.equal(entries.length,1);const entry=entries[0];assert.equal(entry.submissionStatus,'submitted');assert.match(entry.title,/ライちゃんが4つのハロウィン世界へ/);assert.match(entry.image,/325928572/);assert.notEqual(entry.image,creator.avatar);assert.equal(entry.links[0].url,'https://note.com/airoumu_rin/n/n7179d2f821e8');assert.equal(entry.links[1].url,creator.profileURL);assert.equal(doorIdFor(entry,'archive:2026'),'legacy-archive-2026-airoumu_rin');
});
