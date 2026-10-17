import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const bundledStyles=await readFile(new URL('../gallery-styles.css',import.meta.url),'utf8');
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const css=await read('presentation-profiles.css');
test('explicit presentation modes change typography, icons and native targets together',()=>{
 for(const tokens of ['--ui-font:16px;--ui-meta:14px;--ui-target:48px;--ui-icon:40px','--ui-font:18px;--ui-meta:16px;--ui-target:52px;--ui-icon:48px','--ui-font:14px;--ui-meta:12px;--ui-target:44px;--ui-icon:32px'])assert.ok(css.includes(tokens));
 for(const target of ['.palace-toolbar button','.room-dot.face-dot img','.palace-return-row',':is(label,button)','#panel .explore-menu',':is(.nearby button,.lantern-dock #lantern)'])assert.ok(css.includes(target));
 assert.match(css,/--game-hud-font:var\(--ui-font\)/);assert.match(css,/flex-wrap:wrap/);assert.match(css,/white-space:normal;overflow-wrap:anywhere/);
 assert.doesNotMatch(css,/zoom:|transform:scale|screen\.width|user-scalable|maximum-scale/);
});
test('profile stylesheet follows older gallery and game style layers without reaching editor',async()=>{
 for(const file of ['index.html','maze/index.html']){const html=await read(file),styles=file==='index.html'?bundledStyles:html;assert.match(styles,/presentation-profiles.css\?v=20261017-castle2/);assert.ok(styles.indexOf('presentation-profiles.css')>styles.indexOf('ios-viewport.css'));}
 assert.doesNotMatch(await read('admin/index.html'),/presentation-profiles.css/);
});
