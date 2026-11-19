import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {makeMoveInArticlePrompt,makeRoomPrompt,makeArtifactPrompt,makeArticleDraft,creatorReference,residentPost,articleCardBlock,insightUrl,towerUrl,hostNoteUrl} from '../prompt-play.js';
import {makeSpotPrompt,spotReferenceInstructions} from '../../halloween-exhibition/preview/diorama-city/spot-illustration.js';
test('unregistered objects can be reused in the same chat without forcing a new attachment or inventing one',()=>{
 const args={id:'writer',label:'バイク工房',scene:'工房の窓',href:'https://example.com/',item:{mode:'chat',label:'バイク'},referenceMode:'none'};
 for(const prompt of [makeSpotPrompt(args),makeArtifactPrompt({...args,kind:'cover',reference:{referenceMode:'none'}})]){
   assert.match(prompt,/バイクの画像が１つに定まれば、自動/);
   assert.match(prompt,/物を追加せずそのまま場面を描く/);
   assert.doesNotMatch(prompt,/登録した乗り物の画像URL|登録済みアバター画像URL/);
 }
});
const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
test('avatar followed by a room request and ID-bearing return, recovery without new avatar, independent attachments',()=>{
  const normal=makeRoomPrompt({id:'tester'});
  assert.match(normal,/最初にゲーム用アバター画像/);
  assert.match(normal,/ここで返事を待つ/);
  assert.match(normal,/２枚をそれぞれ保存/);
  assert.match(normal,/\?creator=tester#prompt-import/);
  assert.doesNotMatch(normal,/note専用サムネイル/);
  const article=makeMoveInArticlePrompt({id:'tester',title:'月の書斎',address:'504',href:towerUrl+'?room=abc'});
  for(const word of ['入居確認済み','1280×650','本文イラスト１','本文イラスト２','記事を最後まで','添付は任意','月の書斎','504号室']) assert.ok(article.includes(word),word);
  assert.match(makeRoomPrompt({id:'tester',roomOnly:true}),/既存アバターを再生成しない/);
  assert.match(app,/if \(!play.avatar \|\| !play.interior/);
  assert.doesNotMatch(app,/else \$\('#prompt-import'\).requestSubmit\(\)/);
  assert.match(html,/id="copy-room-only"/);
  assert.match(html,/id="generated-interior"/);
});
test('spot illustration request keeps two scenes and a distinct cover with matching title and hashtag',()=>{
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

test('avatar and question precede room and article-only continuation preserves completed images',()=>{
 const initial=makeRoomPrompt({id:'tester'});
 assert.ok(initial.indexOf('最初にゲーム用アバター') < initial.indexOf('ここで返事を待つ') && initial.indexOf('ここで返事を待つ') < initial.indexOf('部屋画像を１枚生成'));
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

test('a market article is ready to paste with no uploads, including an actual egg-sandwich handover', () => {
  const experience = '水辺のコンビニでたまごサンドを1点選んだ。木のレジで260円を支払い、たまごサンドの入った紙袋を受け取った。';
  const spot = {label:'水辺のコンビニ', href:'https://example.com/market/', id:'ss_yr',
    articleScene:'運河のそばに木のカウンターがある。棚からは温かい灯りがこぼれる。', experience,
    title:'運河のそばで、たまごサンドをひとつ', scene:'袋を持つ手を寄りの構図で描く。'};
  const body = makeArticleDraft(spot), lines = body.split('\n');
  assert.equal(lines[0], spot.title);
  for (const line of [spot.articleScene, experience, '［ここに街のイラスト１］','［ここに街のイラスト２］',
    spot.href, towerUrl+'#prompt-play', hostNoteUrl, insightUrl]) assert.ok(lines.includes(line), line);
  assert.equal(lines.at(-1),'#無名Sプロンプト');
  assert.doesNotMatch(body,/構図で描く|添付してください|確認できません|入居しました/);
  const prompt = makeArtifactPrompt({...spot,kind:'article',draft:body});
  assert.ok(prompt.includes(experience) && prompt.includes(JSON.stringify(body)));
  assert.match(prompt,/画像の添付や確認を求めず/);
  assert.match(prompt,/別作品の表紙/);
  assert.doesNotMatch(prompt,/本文用画像の添付を依頼|本文画像を.*送ってください/);
});

test('unseen art, guest visits and room plans remain publishable without claiming a purchase or occupancy', () => {
  const article = makeArticleDraft({label:'レジ',articleScene:'運河の灯りが見える。木のカウンターは窓のそば。',scene:'支払い済みの絵を描いてください。'});
  assert.ok(article.includes('［ここに街のイラスト１］\n\n木のカウンターは窓のそば。'));
  assert.doesNotMatch(article,/支払い|@undefined|添付してください/);
  for (const occupied of [true,false]) {
    const room = makeArticleDraft({mode:'room',roomTitle:'月の部屋',ideas:'緑の窓辺',occupied});
    assert.match(room,/月の部屋/); assert.match(room,/緑の窓辺/);
    assert.ok(room.includes('［ここにアバター画像］') && room.includes('［ここに部屋画像］'));
    assert.equal(room.includes('という部屋ができました'),occupied);
  }
  const initial = makeRoomPrompt({});
  assert.match(initial,/今回入力されたnote IDをcreatorパラメータ/);
  assert.doesNotMatch(initial,/３枚を揃えたら/);
});
