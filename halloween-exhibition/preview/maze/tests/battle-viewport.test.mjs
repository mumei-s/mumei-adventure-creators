import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const app=read('app.js'),html=read('index.html'),css=read('battle-story.css'),hud=read('adventure-controls.css');
test('battle scene and commands have bounded panes while only the story log scrolls',()=>{
 for(const cls of ['battle-heading','battle-view','battle-controls','battle-log'])assert(app.includes(cls));
 assert.match(css,/#panel\.battle-mode\[open\]\{display:flex;flex-direction:column\}/);
 assert.match(css,/#panel\.battle-mode \.battle-log\{[^}]*overflow:auto/);
 assert.match(css,/#panel\.battle-mode>\.close\{position:absolute;[^}]*float:none/);
 assert(css.includes('inset:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)'));
 assert(css.includes('height:calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 16px)'));
 assert(css.includes('min-height:0'));assert(css.includes('min-width:0!important'));
 assert(css.includes('display:flex;flex-direction:column;justify-content:center'));
});
test('battle commits earned marks immediately but keeps canvas and commands locked for the effect',()=>{
 const act=app.split('function actBattle(action){')[1].split('\nfunction ')[0];
 assert(act.includes('battleAnimationBusy()'));assert(act.includes("duration:battle.id==='nameless_overlord'?overlordActionDuration("));assert(act.includes('pendingUI:true'));
 assert(act.includes("if(battle.status==='won'&&!cleared.includes(battle.id)){cleared.push(battle.id);save();}"));
 assert(!act.includes('renderBattle()'));assert(act.includes('.disabled=true'));
 assert(app.includes('visualTime+=elapsed'));assert(!app.includes('if(motion&&!reducedMotion.matches)visualTime+='));
 assert(app.includes('Math.min(battleEffect?.duration||0,battleEffectDuration(battleEffect?.type,false))'));
 assert.equal((app.match(/\$\('battle-shine'\)\?\.focus\(\{preventScroll:true\}\)/g)||[]).length,2);
 assert(app.includes('$(nextFocus)?.focus({preventScroll:true})'));
});
test('exploration shows a compact top control row, story beside map and a separate lantern dock',()=>{
 assert(!html.includes('Halloween冒険室'));assert(!html.includes('class="encounter-help"'));
 assert(!html.includes('id="view-2d"'));assert(!html.includes('id="view-3d"'));assert(html.includes('id="camera-distance"'));
 const header=html.match(/<header>([\s\S]*?)<\/header>/)[1];
 for(const id of ['minimap-size','menu-open'])assert(header.includes(`id="${id}"`));
 assert.match(html,/<div class="exploration-hud"><div class="place">[\s\S]*?id="minimap-open"/);
 const dock=html.match(/<aside class="lantern-dock"[^>]*>([\s\S]*?)<\/aside>/)[1];
 assert.match(dock,/^<div class="viewpoint-control" role="group" aria-label="視点の切り替え">/);
 const dockIds=['viewpoint-prev','camera-distance','viewpoint-next','lantern'];let previous=-1;
 for(const id of dockIds){assert.equal((dock.match(new RegExp(`id="${id}"`,'g'))||[]).length,1);const index=dock.indexOf(`id="${id}"`);assert.ok(index>previous);previous=index;}
 assert.match(dock,/<\/div><button id="lantern" aria-pressed="true">ランタン ON<\/button>$/);
 const menuApp=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8'),menuSource=menuApp.slice(menuApp.indexOf('function showExploreMenu(){'),menuApp.indexOf('function showMenuLayoutSettings(){'));
 assert.ok(menuSource.includes("const lanternButton=add(lantern?'ランタン ON':'ランタン OFF',()=>{toggleLantern();"));assert.ok(menuSource.includes("}),lanternButton,add('歩く速さ'"));
 assert(!html.match(/<div class="nearby">([\s\S]*?)<\/div>/)[1].includes('id="lantern"'));
 assert(hud.includes('grid-template-rows:48px 0 auto minmax(0,1fr) 114px 20px'));
 assert(hud.includes('grid-template-columns:minmax(0,1fr) auto'));assert(hud.includes('max-width:32ch'));
 assert(hud.includes('--map-side:44px'));assert(hud.includes('--map-side:72px'));assert(hud.includes('--map-side:104px'));
 assert(html.includes('<span>拡大</span>'));assert(html.includes('aria-label="現在位置の地図を拡大"'));
 assert(app.includes("onChange:()=>requestAnimationFrame(()=>{if(view==='2d')resizeFlat();else world?.resize();})"));
});
test('current hero name is exact in story, creator directory and battle canvas',()=>{
 for(const file of ['story-model.js','creator-ui.js','battle-scene.js'])assert(read(file).includes('無名S note'),file);
});
