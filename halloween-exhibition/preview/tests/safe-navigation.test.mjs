import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=name=>readFile(new URL(`../${name}`,import.meta.url),'utf8');
test('castle return is navigation only and does not stop the app',async()=>{
 const source=await read('theater.js');
 const navigation=source.slice(source.indexOf('function returnToCastle(){'),source.indexOf('const returnPanel='));
 for(const expected of ['cancelStoryOpening()','cancelRoulette()',"setMode('halloween',{save:false})",'palace?.home()'])assert.ok(navigation.includes(expected),expected);
 assert.doesNotMatch(navigation,/stopMusic|setEnabled\(false\)|window\.close|appExit|history\.back|localStorage\.(clear|removeItem)/);
 assert.match(source,/get\('return'\)===\s*'palace'/);
 assert.doesNotMatch(source,/終了・お城へ/);
 assert.match(source,/node\('button','お城に戻る'/);
});
test('app exit alone stops playback and restores the user motion preference on resume',async()=>{
 const source=await read('theater.js');
 const exit=source.slice(source.indexOf('const appExit='),source.indexOf('function updateSlideshowState'));
 for(const expected of ['visitorSettings.stopMusic()','slideshow?.setEnabled(false)','doorClock.cancel()','cancelArtworkLoad()','sceneMotion?.isUserPaused()','sceneMotion?.setPaused(true)','sceneMotion?.setPaused(motionPausedBeforeExit)'])assert.ok(exit.includes(expected),expected);
 assert.match(source,/returnPanel.hidden=state.view!=='gallery'/);
});
test('phone dialogs expose labeled return buttons and usable target sizes',async()=>{
 const html=await read('index.html'),maze=await read('maze/index.html'),preferences=await read('visitor-preferences.js'),css=await read('safe-navigation.css');
 assert.equal((html.match(/class="close safe-dialog-back"/g)||[]).length,3);
 assert.match(maze,/← 探索に戻る/);assert.match(preferences,/safe-dialog-back', '← 戻る'/);assert.match(css,/min-height:44px/);
});
test('maze castle return preserves progress and never offers app exit',async()=>{
 const html=await read('maze/index.html'),source=await read('maze/app.js');
 assert.match(html,/class="exit-link" href="\.\.\/\?return=palace">お城に戻る/);
 assert.match(source,/clearInput\(\);soundCheck\.stop\(''\);visitorSettings\.stopMusic\(\);save\(\)/);
 assert.match(source,/← 記事一覧に戻る/);
 assert.doesNotMatch(source+html,/終了・お城へ|アプリ終了|window\.close/);
});
test('admin local return retains input and page exit guards only unsaved or unpersisted drafts',async()=>{
 const source=await read('admin/app.js');
 assert.match(source,/if\(dirty\|\|!storageOK\)\{event\.preventDefault\(\)/);
 // The rebuild specification explicitly requires unsaved exit protection.
 // Local castle return retains the form; reload/close may request a native
 // warning, guarded by draft state. It must not force navigation or closure.
 assert.match(source,/window\.addEventListener\('beforeunload',event=>\{\s*if\(dirty\|\|\(state&&!storageOK\)\)\{event\.preventDefault\(\);event\.returnValue='';\}/);
 assert.doesNotMatch(source,/window\.close|history\.(?:back|go)|location\.(?:replace|assign)|localStorage\.clear/);
 assert.match(source,/入力はこの画面に残しています/);
});
