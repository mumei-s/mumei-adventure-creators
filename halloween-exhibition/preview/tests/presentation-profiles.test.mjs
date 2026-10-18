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
 assert.match(bundledStyles,/presentation-profiles.css\?v=20261019-compact1/);assert.ok(bundledStyles.indexOf('presentation-profiles.css')>bundledStyles.indexOf('ios-viewport.css'));
 for(const game of ['town','maze']){
  const styles=JSON.parse(await read(`${game}/game-style-sources.json`)),manifest=JSON.parse(await read(`${game}/game-script-manifest.json`)),html=await read(`${game}/index.html`);
  const profile=styles.indexOf('../presentation-profiles.css?v=20261019-compact1'),viewport=styles.findIndex(source=>source.split('?')[0]==='../ios-viewport.css');
  assert.ok(viewport>=0&&profile>viewport,`${game} profile overrides viewport styles`);
  assert.deepEqual(manifest.styleSources,styles);assert.ok(manifest.inputs.some(input=>input.path==='presentation-profiles.css'));
  assert.ok(html.includes(`href="./game-styles.css?v=20261019-game-fast1-${manifest.styles.sha256.slice(0,12)}"`));
 }
 assert.doesNotMatch(await read('admin/index.html'),/presentation-profiles.css/);
});
