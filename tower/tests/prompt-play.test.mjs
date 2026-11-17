import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
const src = await readFile(new URL('../prompt-play.js',import.meta.url),'utf8');
const asModule = source => 'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const coreUrl=asModule(src);
const qualityUrl=asModule(await readFile(new URL('../quality-assist.js',import.meta.url),'utf8'));
const {makeRoomPrompt,residentPost,articleCardBlock,insightUrl,towerUrl,hostNoteUrl}=await import(coreUrl);
const spotSource=await readFile(new URL('../../halloween-exhibition/preview/diorama-city/spot-illustration.js',import.meta.url),'utf8');
const {makeSpotPrompt}=await import(asModule(spotSource
  .replace(/\.\.\/\.\.\/\.\.\/tower\/prompt-play\.js\?v=\d+/,coreUrl)
  .replace(/\.\.\/\.\.\/\.\.\/tower\/quality-assist\.js\?v=\d+/,qualityUrl)));
const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
test('room generation first, recovery without new avatar, independent attachments',()=>{
  const normal=makeRoomPrompt({id:'tester'});
  assert.match(normal,/最初の成果物は必ず部屋画像/);
  assert.match(normal,/次にアバター画像を別の画像/);
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
