import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {DISPLAY_MODE_KEY,DISPLAY_MODES,normalizeDisplayMode,resolveDisplayMode,isPreviewPath,readDisplayMode,createDisplayModeController,initDisplayMode} from '../display-mode.js';
const bundledStyles=await readFile(new URL('../gallery-styles.css',import.meta.url),'utf8');
const root=new URL('../',import.meta.url),read=path=>readFile(new URL(path,root),'utf8');
const css=await read('display-mode.css'),html=await read('index.html'),admin=await read('admin/index.html');
function memory(value){const values=new Map(value===undefined?[]:[[DISPLAY_MODE_KEY,value]]),writes=[];return {values,writes,getItem:key=>values.get(key)??null,setItem(key,value){writes.push(key);values.set(key,value);}};}
test('automatic layout follows actual width; manual choices do not pretend to change viewport',()=>{
 for(const [width,want] of [[320,'phone'],[400,'phone'],[680,'phone'],[681,'tablet'],[768,'tablet'],[1024,'tablet'],[1100,'tablet'],[1101,'desktop'],[1440,'desktop']]){
  assert.equal(resolveDisplayMode('auto',width),want);
  for(const mode of ['phone','tablet','desktop'])assert.equal(resolveDisplayMode(mode,width),mode);
 }
 assert.equal(resolveDisplayMode('invalid',NaN),'phone');assert.equal(resolveDisplayMode('auto',0),'phone');
 assert.equal(normalizeDisplayMode({mode:'desktop'}),'auto');
});
test('only allowlisted choices and one preview-scoped key are stored',()=>{
 const storage=memory();const c=createDisplayModeController({storage,getWidth:()=>1440});
 for(const mode of DISPLAY_MODES){assert.equal(c.setMode(mode),true);assert.equal(readDisplayMode(storage),mode);assert.deepEqual(JSON.parse(storage.values.get(DISPLAY_MODE_KEY)),{mode});}
 assert.equal(c.setMode('INSIGHT'),false);assert.equal(c.setMode(null),false);
 assert.ok(storage.writes.every(key=>key===DISPLAY_MODE_KEY));assert.equal(storage.values.size,1);
});
test('resize changes only auto layout; manual choice persists across preview pages',()=>{
 const storage=memory();let width=400;const states=[];const a=createDisplayModeController({storage,getWidth:()=>width,onChange:s=>states.push(s)});
 assert.equal(a.getState().layout,'phone');width=900;a.refresh();assert.equal(a.getState().layout,'tablet');
 a.setMode('phone');width=1440;a.refresh();assert.equal(a.getState().layout,'phone');
 const b=createDisplayModeController({storage,getWidth:()=>1440});assert.equal(b.getState().mode,'phone');
 b.setMode('desktop');a.reload();assert.equal(a.getState().mode,'desktop');
 const n=states.length;a.refresh();assert.equal(states.length,n,'no repeated live announcement within a breakpoint');
 a.setMode('auto');assert.equal(a.getState().layout,'desktop');
});
test('malformed or denied storage never prevents a session layout choice',()=>{
 for(const bad of ['null','{','{"mode":"other"}','[]','"desktop"'])assert.equal(readDisplayMode(memory(bad)),'auto');
 const storage={getItem(){throw Error('denied')},setItem(){throw Error('denied')}};
 const c=createDisplayModeController({storage});assert.equal(c.getState().mode,'auto');assert.equal(c.setMode('tablet'),true);
 assert.equal(c.getState().layout,'tablet');assert.equal(c.getState().saved,false);
});
test('UI initializer is inert outside the preview subtree or without a settings mount',()=>{
 for(const path of ['/','/INSIGHT/','/halloween/','/halloween-exhibition/preview-other/'])assert.equal(isPreviewPath(path),false);
 for(const path of ['/repo/halloween-exhibition/preview/','/repo/halloween-exhibition/preview/admin/','/repo/halloween-exhibition/preview/maze/index.html'])assert.equal(isPreviewPath(path),true);
 assert.equal(initDisplayMode(),null);assert.equal(initDisplayMode({controlsParent:{}}),null);
});
test('main and admin presentation hooks and all local references resolve',async()=>{
 assert.match(await read('theater.js'),/initDisplayMode\(\{controlsParent:document\.querySelector\('\.visitor-preferences'\),page:'gallery'\}/);
 assert.match(admin,/id="editor-display-settings"/);assert.match(admin,/src="\.\/display-settings\.js\?v=20261019-unified1"/);
 assert.match(await read('admin/display-settings.js'),/page:'admin'/);
 assert.doesNotMatch(await read('admin/display-settings.js'),/localStorage|fetch\(|serviceWorker|STORAGE_KEY|draft\s*=/);
 for(const [text,base] of [[html,root],[admin,new URL('admin/',root)]]){
  assert.match(text,/viewport-fit=cover/);assert.doesNotMatch(text,/user-scalable=no|maximum-scale=1/);
  for(const match of text.matchAll(/(?:href|src)="(\.\.?\/[^"?]+\.(?:css|js|png))"/g))await access(new URL(match[1],base));
 }
});
test('manual modes fit small viewports and keep usable flow, typography and safe areas',()=>{
 for(const mode of ['phone','tablet','desktop'])assert.match(css,new RegExp('body\\[data-layout='+mode+'\\]'));
 assert.match(css,/--display-content-max:520px/);assert.match(css,/--display-content-max:1000px/);assert.match(css,/--display-content-max:1440px/);
 assert.match(css,/width:100%;max-width:var\(--display-content-max\)/);
 assert.match(css,/grid-template-columns:repeat\(auto-fit,minmax\(min\(100%,360px\),1fr\)\)/);
 assert.match(css,/min-height:44px/);assert.match(css,/font-size:16px/);
 assert.match(css,/safe-area-inset-top/);assert.match(css,/safe-area-inset-bottom/);assert.match(css,/100dvh/);assert.match(css,/overflow:auto/);
 assert.doesNotMatch(css,/(?:min-width:\s*(?:768|1024|1440)px|zoom:|scale\(\.\d|text-size-adjust:\s*none)/);
});
test('new shared display assets are public-shell-only and never cache editor content',async()=>{
 const sw=await read('sw.js');assert.match(sw,/display-mode\.js\?v=20261019-unified1/);assert.match(sw,/gallery-styles\.css\?v=20261019-compact1/);
 const list=sw.match(/const PUBLIC_ASSETS = \[([\s\S]*?)\];/)[1];assert.doesNotMatch(list,/admin\/|maze\/|town\/|data\/|draft|app\.js/);
});
test('Halloween roster has warm orange surfaces while ordinary mode stays separately scoped',async()=>{
 const styles=await read('gallery-controls.css');assert.match(styles,/body\[data-mode=halloween\] \.roster-card/);
 assert.match(styles,/#8e472c/);assert.match(styles,/#f4ac5255/);assert.match(styles,/body\[data-mode=normal\] \.roster-invitation/);
});

test('real initializer renders all four options, updates on selection/resize/storage, and cleans listeners',()=>{
 const names=['document','window','localStorage','location'];const previous=names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]);
 class El{constructor(){this.children=[];this.dataset={};this.handlers={};this.attrs={};}append(...nodes){this.children.push(...nodes);}setAttribute(k,v){this.attrs[k]=v;}addEventListener(k,fn){this.handlers[k]=fn;}removeEventListener(k){delete this.handlers[k];}querySelector(s){return this.children.find(e=>'.'+e.className===s)||null;}remove(){this.removed=true;}}
 const mount=new El(),body=new El(),windowEvents={},storage=memory(),events=[];
 try{
  Object.assign(globalThis,{location:{pathname:'/repo/halloween-exhibition/preview/admin/'},localStorage:storage,document:{body,createElement:()=>new El(),dispatchEvent:e=>events.push(e)},window:{innerWidth:400,addEventListener:(k,fn)=>windowEvents[k]=fn,removeEventListener:k=>delete windowEvents[k]}});
  const controls=initDisplayMode({controlsParent:mount,page:'admin'});assert.ok(controls);
  const section=mount.children[0],select=section.children[1],status=section.children[3];
  assert.deepEqual(select.children.map(o=>o.value),DISPLAY_MODES);assert.equal(select.children[0].textContent,'自動（画面幅に合わせる）');
  assert.equal(body.dataset.layout,'phone');assert.equal(body.dataset.layoutPage,'admin');assert.equal(status.attrs['aria-live'],'polite');
  select.value='desktop';select.handlers.change();assert.equal(body.dataset.layout,'desktop');assert.equal(globalThis.window.innerWidth,400);
  window.innerWidth=900;windowEvents.resize();assert.equal(body.dataset.layout,'desktop');
  select.value='auto';select.handlers.change();assert.equal(body.dataset.layout,'tablet');
  storage.setItem(DISPLAY_MODE_KEY,JSON.stringify({mode:'phone'}));windowEvents.storage({key:DISPLAY_MODE_KEY,storageArea:storage});assert.equal(body.dataset.layout,'phone');
  assert.equal(initDisplayMode({controlsParent:mount}),null,'mount only once');
  assert.ok(events.every(e=>e.type==='yearbook:layout-change'));
  controls.destroy();assert.equal(section.removed,true);assert.deepEqual(Object.keys(windowEvents),[]);
 }finally{for(const [name,descriptor]of previous){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}}
});

test('adventure library wording accepts genuine articles of every genre without changing IDs',async()=>{
 const app=await read('admin/app.js');assert.match(html,/宮殿の地下に進む/);assert.match(admin,/冒険室の書庫/);
 assert.match(app,/horror:'冒険室の書庫'/);assert.match(app,/ジャンルを問わず、実際の記事/);
 assert.doesNotMatch(app,/ホラーの記事は/);assert.match(admin,/data-collection="horror"/);
});

test('roster portrait geometry contains the complete image and pagination has usable native controls',async()=>{
 const styles=await read('gallery-controls.css');
 assert.match(styles,/inset:12px 6px 8px;width:calc\(100% - 12px\);height:calc\(100% - 20px\)/);
 assert.match(styles,/object-fit:contain;object-position:center/);
 assert.match(styles,/body \.roster-card\{grid-template-columns:72px minmax\(0,1fr\)/);
 assert.match(styles,/\.roster-pagination button\{min-width:44px;min-height:44px/);
 assert.match(html,/id="roster-previous" type="button" aria-controls="roster-grid"/);
 assert.match(html,/id="roster-next" type="button" aria-controls="roster-grid"/);
});

test('Halloween title is prominent in its own compact flow row with static motion alternatives',()=>{
 assert.match(css,/grid-template-areas:"brand brand" "navigation actions"/);
 assert.match(css,/grid-template-areas:"brand" "navigation" "actions";grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/font:600 clamp\(26px,3.2vw,42px\)/);
 assert.match(css,/font-size:clamp\(22px,6.2vw,28px\)/);
 assert.match(css,/#site-title>span\{font:500 10px/);assert.match(css,/#site-title>small\{font:500 14px/);
 assert.match(css,/@keyframes atelier-title-arrive\{from\{opacity:\.65;transform:translateY\(4px\)\}/);
 assert.match(css,/prefers-reduced-motion:reduce[^}]*data-mode=halloween[^}]*animation:none!important/);
 assert.match(css,/data-ambient-paused=true[^}]*animation:none!important/);
 assert.doesNotMatch(css,/min-height:800px|@keyframes[^}]*flash/i);
 assert.match(html,/<span>無名S note<\/span><strong>🎃Halloween Atelier<\/strong><small>魔法の入口🚪<\/small>/);
});

test('phone gallery fills its available width without changing other page contracts',async()=>{
 const responsive=await read('phone-layout.css');
 assert.match(responsive,/body\[data-layout-page=gallery\]\[data-layout=phone\]\{--display-content-max:100%\}/);
 assert.doesNotMatch(responsive,/zoom:|scale\(|min-width:(?:520|768|980)px|!important/);
 assert.match(responsive,/\.palace-toolbar\{flex-wrap:wrap;gap:8px\}/);
 assert.match(responsive,/\.header-actions\{flex:1 1 auto;flex-wrap:wrap;gap:8px\}/);
 assert.match(responsive,/min-width:44px;min-height:44px;height:auto;font-size:14px/);
 assert.match(responsive,/white-space:normal;overflow-wrap:anywhere/);
 assert.ok(bundledStyles.indexOf('./phone-layout.css?v=20261017-phone1')>bundledStyles.indexOf('./palace-entrance.css'));
 assert.doesNotMatch(admin,/phone-layout.css/);
 assert.doesNotMatch(await read('maze/index.html'),/phone-layout.css/);
 // Width contract for portrait, landscape and wide browser layouts. Real browser
 // geometry still needs separate visual QA; this guards the CSS sizing contract.
 const fill=responsive.match(/--display-content-max:([^;}]+)/)[1];
 for(const width of [320,390,430,568,844,932,980,1180]){
  assert.equal(fill,'100%');
  assert.equal(resolveDisplayMode('phone',width),'phone');
  if(width<=680)assert.equal(resolveDisplayMode('auto',width),'phone');
 }
 assert.match(css,/padding-right:var\(--safe-right\)/);assert.match(css,/padding-left:var\(--safe-left\)/);
});
