// Portable: copy this file into preview/maze/tests/ to run with the project suite.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DISPLAY_MODE_KEY,createDisplayModeController,normalizeDisplayMode,resolveDisplayMode} from '../../display-mode.js';
const read=file=>readFile(new URL('../'+file,import.meta.url),'utf8');
test('layout storage availability is accurately reported at first load and reload',()=>{
 for(const storage of [undefined,{getItem(){throw Error('denied')},setItem(){throw Error('denied')}}]){
  const c=createDisplayModeController({storage});assert.equal(c.getState().mode,'auto');assert.equal(c.getState().saved,false);assert.equal(c.reload().saved,false);
  assert(c.setMode('desktop'));assert.equal(c.getState().layout,'desktop');assert.equal(c.getState().saved,false);
 }
});
test('every allowlisted layout persists alone and unknown inputs cannot mutate it',()=>{
 const data=new Map(),writes=[],storage={getItem:k=>data.get(k)??null,setItem(k,v){data.set(k,v);writes.push(k)}};
 const c=createDisplayModeController({storage,getWidth:()=>320});
 for(const mode of ['auto','phone','tablet','desktop']){assert(c.setMode(mode));assert.deepEqual(JSON.parse(data.get(DISPLAY_MODE_KEY)),{mode});assert.equal(createDisplayModeController({storage}).getState().mode,mode);}
 for(const unknown of ['',null,'PC','constructor',{},[]]){assert.equal(c.setMode(unknown),false);assert.equal(c.getState().mode,'desktop');assert.equal(normalizeDisplayMode(unknown),'auto');}
 assert(writes.every(k=>k===DISPLAY_MODE_KEY));assert.equal(data.size,1);
});
test('saved PC choice does not override viewport and Auto obeys exact breakpoints',()=>{
 for(const [w,want]of [[320,'phone'],[360,'phone'],[390,'phone'],[430,'phone'],[680,'phone'],[681,'tablet'],[1100,'tablet'],[1101,'desktop']]){
  assert.equal(resolveDisplayMode('auto',w),want);assert.equal(resolveDisplayMode('desktop',w),'desktop');
 }
});
test('maze keeps the display section reference outside disposable panel content',async()=>{
 const app=await read('app.js');assert.match(app,/const displaySection=visitorSection\.querySelector\('\.display-preferences'\)/);
 const menu=app.slice(app.indexOf('function showExploreMenu()'),app.indexOf('function updateHUD()'));
 assert.match(menu,/if\(displaySection\)/);assert.match(menu,/content\.append\(displaySection\)/);
 assert.doesNotMatch(menu,/const displaySection=/);
});
test('small viewport clamp matches preset selector specificity and dialog safe-area positioning',async()=>{
 const css=await read('resident-ui.css');
 assert.match(css,/@media\(max-width:680px\)\{\s*body\[data-layout-page=maze\]\[data-layout\]\{--game-menu-columns:1\}/);
 assert.match(css,/#panel:not\(\.battle-mode\)\{inset:var\(--safe-top,0px\) var\(--safe-right,0px\) var\(--safe-bottom,0px\) var\(--safe-left,0px\);margin:auto/);
});
test('creator-visible landscape dock cannot retain the old two-column display',async()=>{
 const css=await read('resident-ui.css'),landscape=css.slice(css.indexOf('@media(max-height:580px) and (orientation:landscape)'));
 assert.match(landscape,/body\[data-view\] #game:has\(#creator-open:not\(\[hidden\]\)\) \.nearby\{[^}]*display:flex/);
});
