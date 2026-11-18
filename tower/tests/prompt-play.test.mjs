import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
const src = await readFile(new URL('../prompt-play.js',import.meta.url),'utf8');
const asModule = source => 'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const coreUrl=asModule(src);
const qualityUrl=asModule(await readFile(new URL('../quality-assist.js',import.meta.url),'utf8'));
const {makeRoomPrompt,makeArtifactPrompt,residentPost,articleCardBlock,insightUrl,towerUrl,hostNoteUrl}=await import(coreUrl);
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
