import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
const html=read('index.html'),header=html.match(/<header class="masthead">[\s\S]*?<\/header>/)?.[0];
assert.ok(header,'Atelier masthead exists');
for(const id of ['motion-toggle','motion-off','motion-label','pp-background-effects','light-play','night-state','view-status','atelier-effects-help']){
 assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id+' must not be duplicated');
 assert.ok(header.includes('id="'+id+'"'),id+' belongs inside the header');
}
for(const view of ['auto','phone','tablet','pc'])assert.ok(header.includes('data-view="'+view+'"'));
assert.match(header,/<span class="switch-label">動き・遊び<\/span>/);
assert.match(header,/動きとミニゲームのON／OFF/);
assert.match(header,/aria-describedby="atelier-effects-help motion-label"/);
assert.match(header,/背景の飾り/);
assert.match(header,/「動き・遊び」はアニメーションとミニゲーム。「背景の飾り」は星や光の表示。/);
const portal=html.slice(html.indexOf('<section id="prompt-portal"'),html.indexOf('<section class="atelier-deck"'));
assert.ok(!portal.includes('atelier-top-settings'),'Project navigation must no longer contain site settings');
assert.match(read('atelier-global-theme.css'),/\.masthead \.motion-controls:has\(#motion-toggle:disabled\) #motion-label/,'Reduced-motion explanation remains visible');

// Exercise the real independent background controller without a browser or dependencies.
const theme=read('atelier-global-theme.js');
const backgroundSource=theme.slice(theme.indexOf('const backgroundButton='),theme.indexOf('/* Permanent in-page return'));
function backgroundFixture(initial,failStorage=false){
 const storage=new Map(initial===undefined?[]:[['atelier-background-effects-v1',initial]]),attributes={};
 const button={textContent:'',setAttribute:(key,value)=>attributes[key]=value,addEventListener:(event,fn)=>button[event]=fn};
 const body={dataset:{motion:'on',lights:'night'}};
 vm.runInNewContext(backgroundSource,{document:{getElementById:()=>button,body},localStorage:{getItem:key=>{if(failStorage)throw Error('storage denied');return storage.get(key)||null;},setItem:(key,value)=>{if(failStorage)throw Error('storage denied');storage.set(key,value);}}});
 return {storage,attributes,button,body};
}
for(const initial of [undefined,'off','on']){
 const f=backgroundFixture(initial),on=initial==='on';
 assert.equal(f.body.dataset.backgroundEffects,on?'on':'off');
 assert.equal(f.attributes['aria-pressed'],String(on));
 for(let i=0;i<4;i++){
  f.button.click();const enabled=i%2===0?!on:on;
  assert.equal(f.body.dataset.backgroundEffects,enabled?'on':'off');
  assert.equal(f.storage.get('atelier-background-effects-v1'),enabled?'on':'off');
  assert.equal(f.attributes['aria-pressed'],String(enabled));
  assert.equal(f.button.textContent,enabled?'✦ 背景の飾り ON':'✦ 背景の飾り OFF');
  assert.equal(f.attributes['aria-label'],enabled?'背景の飾りをオフにする':'背景の飾りをオンにする');
  assert.equal(f.body.dataset.motion,'on','Background toggling must not turn off motion or gameplay');
  assert.equal(f.body.dataset.lights,'night','Background toggling must not change night appearance');
 }
 const restored=backgroundFixture(f.storage.get('atelier-background-effects-v1'));
 assert.equal(restored.body.dataset.backgroundEffects,f.body.dataset.backgroundEffects);
}
const denied=backgroundFixture(undefined,true);denied.button.click();assert.equal(denied.body.dataset.backgroundEffects,'on');

// Keep the existing motion implementation and saved key, including the OS preference.
const app=read('app.js');
const motionSource=app.slice(app.indexOf('const motionMedia='),app.indexOf('installNightStudio(effects);'));
function motionFixture(stored='on',reduced=false){
 const attrs={},nodes={},storage=new Map([['halloween-motion',stored]]),body={dataset:{backgroundEffects:'on',lights:'night'}};
 for(const id of ['motion-label','motion-off','motion-toggle','play-state','playground','play-spell','play-ghosts']){
  nodes[id]={dataset:{},setAttribute:(key,value)=>(attrs[id]??={})[key]=value,addEventListener:(event,fn)=>nodes[id][event]=fn};
 }
 const media={matches:reduced,addEventListener:(event,fn)=>media[event]=fn};
 vm.runInNewContext(motionSource,{$:id=>nodes[id],window:{matchMedia:()=>media},localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},document:{body},collection:'everyday',effects:{sync(){}}});
 return {attrs,nodes,storage,body,media};
}
for(const stored of ['on','off']){
 const f=motionFixture(stored);assert.equal(f.body.dataset.motion,stored);
 f.nodes['motion-off'].click();assert.equal(f.body.dataset.motion,'off');assert.equal(f.storage.get('halloween-motion'),'off');assert.equal(f.nodes['play-ghosts'].disabled,true);
 f.nodes['motion-toggle'].click();assert.equal(f.body.dataset.motion,'on');assert.equal(f.storage.get('halloween-motion'),'on');assert.equal(f.nodes['play-ghosts'].disabled,false);
 assert.equal(f.body.dataset.backgroundEffects,'on','Motion toggling must retain decorative-background preference');assert.equal(f.body.dataset.lights,'night');
 f.media.matches=true;f.media.change();assert.equal(f.body.dataset.motion,'off');assert.equal(f.nodes['motion-toggle'].disabled,true);assert.match(f.nodes['motion-label'].textContent,/端末の省動作設定/);assert.equal(f.storage.get('halloween-motion'),'on');
 f.media.matches=false;f.media.change();assert.equal(f.body.dataset.motion,'on');assert.equal(f.nodes['motion-toggle'].disabled,false);
}
const osReduced=motionFixture('on',true);assert.equal(osReduced.body.dataset.motion,'off');assert.equal(osReduced.nodes['motion-toggle'].disabled,true);
console.log('PASS unified header controls: unique selectors, accessible distinct names, independent persisted preferences, repeated toggles, unavailable storage, and OS reduced-motion priority.');
