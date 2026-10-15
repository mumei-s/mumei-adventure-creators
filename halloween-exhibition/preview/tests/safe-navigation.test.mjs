import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=name=>readFile(new URL(`../${name}`,import.meta.url),'utf8');
test('finish returns to the castle without closing tabs, external history, or preference reset',async()=>{
 const source=await read('theater.js');
 const finish=source.slice(source.indexOf('function finishVisit(){'),source.indexOf("const finishPanel="));
 for(const expected of ['visitorSettings.stopMusic()','slideshow?.setEnabled(false)','cancelStoryOpening()','cancelRoulette()',"setMode('halloween',{save:false})",'palace?.home()'])assert.ok(finish.includes(expected),expected);
 assert.doesNotMatch(finish,/window\.close|history\.back|localStorage\.(clear|removeItem)/);
 assert.match(source,/get\('return'\)===\s*'palace'/);
});
test('phone dialogs expose labeled return buttons and usable target sizes',async()=>{
 const html=await read('index.html'),maze=await read('maze/index.html'),preferences=await read('visitor-preferences.js'),css=await read('safe-navigation.css');
 assert.equal((html.match(/class="close safe-dialog-back"/g)||[]).length,3);
 assert.match(maze,/← 探索に戻る/);assert.match(preferences,/safe-dialog-back', '← 戻る'/);assert.match(css,/min-height:44px/);
});
test('maze finish has a deterministic local castle destination and stops active input and audio',async()=>{
 const html=await read('maze/index.html'),source=await read('maze/app.js');
 assert.match(html,/class="exit-link" href="\.\.\/\?return=palace">終了・お城へ/);
 assert.match(source,/clearInput\(\);soundCheck\.stop\(''\);visitorSettings\.stopMusic\(\);save\(\)/);
 assert.match(source,/← 記事一覧に戻る/);
});
test('admin local return preserves unsaved input without beforeunload interception',async()=>{
 const source=await read('admin/app.js');
 assert.match(source,/if\(dirty\|\|!storageOK\)\{event\.preventDefault\(\)/);
 assert.doesNotMatch(source,/beforeunload/);
 assert.match(source,/入力はこの画面に残しています/);
});
