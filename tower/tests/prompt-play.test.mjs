import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
const src = await readFile(new URL('../prompt-play.js',import.meta.url),'utf8');
const asModule = source => 'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const coreUrl=asModule(src);
const qualityUrl=asModule(await readFile(new URL('../quality-assist.js',import.meta.url),'utf8'));
const {makeRoomPrompt,makeArtifactPrompt,creatorReference,residentPost,articleCardBlock,insightUrl,towerUrl,hostNoteUrl}=await import(coreUrl);
const spotSource=await readFile(new URL('../../halloween-exhibition/preview/diorama-city/spot-illustration.js',import.meta.url),'utf8');
const {makeSpotPrompt,spotReferenceInstructions}=await import(asModule(spotSource
  .replace(/\.\.\/\.\.\/\.\.\/tower\/prompt-play\.js\?v=[\d-]+/,coreUrl)
  .replace(/\.\.\/\.\.\/\.\.\/tower\/quality-assist\.js\?v=\d+/,qualityUrl)));
const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
test('room generation first, recovery without new avatar, independent attachments',()=>{
  const normal=makeRoomPrompt({id:'tester'});
  assert.match(normal,/最初の成果物は必ず部屋画像/);
  assert.match(normal,/次にアバター画像を別の画像/);
  assert.match(normal,/３枚目は部屋を題材にした記事専用サムネイル/);
  assert.match(normal,/部屋画像とサムネイルを絶対に兼用・合成しない/);
  assert.match(makeRoomPrompt({id:'tester',roomOnly:true}),/既存アバターを再生成しない/);
  assert.match(app,/if \(!play.avatar \|\| !play.interior/);
  assert.doesNotMatch(app,/else \$\('#prompt-import'\).requestSubmit\(\)/);
  assert.match(html,/id="copy-room-only"/);
  assert.match(html,/id="generated-interior"/);
});
test('spot article requires two scenes, distinct cover and title/hashtag',()=>{
  const href='https://example.com/city/?spot=cafe';
  const prompt=makeSpotPrompt({label:'カフェ',scene:'窓辺',href,id:'tester'});
  for(const marker of ['［ここに街のイラスト１］','［ここに街のイラスト２］','1280×650','#無名Sプロンプト','本文用の絵とは明確に異なる','未完了']) assert.ok(prompt.includes(marker));
  for(const url of [href,hostNoteUrl,insightUrl,towerUrl+'#prompt-play']) assert.ok(prompt.split('\n').includes(url));
});
test('note cards contain raw URL lines, not bracket markup',()=>{
  const block=articleCardBlock([['企画主',hostNoteUrl],['INSIGHT',insightUrl]]);
  assert.equal(block,'企画主\n\n'+hostNoteUrl+'\n\nINSIGHT\n\n'+insightUrl);
  assert.ok(residentPost('部屋',towerUrl+'?room=1').split('\n').includes(insightUrl));
});

test('registered reference, new attachment and article follow-up are explicit',()=>{
 const common={label:'カフェ',scene:'窓辺',href:'https://example.com/',id:'tester'};
 const url='https://example.com/avatar.webp';
 const registered=makeSpotPrompt({...common,referenceMode:'registered',referenceUrl:url});
 assert.ok(registered.includes(url));
 assert.match(registered,/IDは再質問しない/);
 assert.match(registered,/今回のイラストをnoteの記事にしますか/);
 assert.match(spotReferenceInstructions({referenceMode:'local'}),/別チャット/);
 assert.match(spotReferenceInstructions({referenceMode:'attachment'}),/今回添付する新しい/);
 assert.doesNotMatch(makeSpotPrompt({...common,referenceMode:'attachment'}),/登録済みアバター画像URL/);
});

test('room instructions precede avatar and article-only continuation preserves completed images',()=>{
 const initial=makeRoomPrompt({id:'tester'});
 assert.ok(initial.indexOf('【ゲーム用部屋画像')<initial.indexOf('【アバター画像'));
 const article=makeArtifactPrompt({kind:'article',id:'tester',mode:'spot'});
 for(const marker of ['記事本文だけ','［ここにアバター画像］','［ここに部屋画像］','専用サムネイル']) assert.ok(article.includes(marker));
 assert.doesNotMatch(article,/個別の完成画像をチャットに表示/);
});

test('a reference belongs to one creator and only a public image URL is copied', () => {
  const image = 'https://example.com/creator.png', local = 'data:image/webp;base64,private';
  const saved = creatorReference('alice', 'alice', image);
  assert.equal(saved.referenceUrl, image);
  assert.deepEqual(creatorReference('bob', 'alice', image), {referenceMode:'attachment'});
  assert.deepEqual(creatorReference(null, null, image), {referenceMode:'attachment'});
  assert.deepEqual(creatorReference('alice', 'alice', './assets/resident.webp'), {referenceMode:'attachment'});
  const device = creatorReference('alice', 'alice', local);
  assert.deepEqual(device, {referenceMode:'local'});
  for (const variant of [{}, {roomOnly:true}, {avatarOnly:true}]) {
    assert.ok(makeRoomPrompt({id:'alice', reference:saved, ...variant}).includes(image));
    assert.ok(!makeRoomPrompt({id:'alice', reference:device, ...variant}).includes(local));
  }
});

test('scene and thumbnail prompts distinguish character style from the location reference', () => {
  const backgroundUrl = 'https://example.com/sky.webp', referenceUrl = 'https://example.com/actor.webp';
  const reference = {referenceMode:'registered', referenceUrl};
  const spot = {id:'alice', label:'天空ラウンジ', scene:'夜景の見える窓辺', href:'https://example.com/sky/', backgroundUrl};
  for (const prompt of [
    makeSpotPrompt({...spot, ...reference}),
    ...['scene1','scene2','cover'].map(kind => makeArtifactPrompt({...spot, reference, kind}))
  ]) {
    assert.ok(prompt.includes(backgroundUrl) && prompt.includes(referenceUrl));
    for (const detail of ['顔立ち','衣装','実写','アニメ','幻想画','背景や別の登場人物']) assert.ok(prompt.includes(detail), detail);
  }
  const article = makeArtifactPrompt({...spot, reference, kind:'article', title:'窓辺の夜', reason:'２枚目の行動を反映'});
  assert.ok(article.includes('確定した記事タイトル：窓辺の夜') && article.includes('２枚目の行動を反映'));
  assert.ok(!article.includes(backgroundUrl) && !article.includes(referenceUrl));
  assert.match(article, /画像は再生成しない/);
});
