import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GAME_DISPLAY_KEY,normalizeGameDisplayPreferences,createGameDisplayController,initPadPosition} from '../game-display.js';
const storage=initial=>{const values=new Map(Object.entries(initial||{}));return {values,getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)}};
test('unset or invalid position defaults center; explicit saved left and right migrate unchanged',()=>{
 for(const input of [undefined,{},null,{side:'other'}])assert.equal(normalizeGameDisplayPreferences(input).side,'center');
 for(const side of ['left','center','right'])assert.equal(createGameDisplayController({storage:storage({[GAME_DISPLAY_KEY]:JSON.stringify({side})})}).getPreferences().side,side);
});
test('town and basement share position without resetting progress, sizes or the utility side',()=>{
 const store=storage({progress:'untouched',[GAME_DISPLAY_KEY]:JSON.stringify({side:'right',size:85,controlSize:125})});
 const town=createGameDisplayController({storage:store});town.setPreferences({side:'center'});
 const basement=createGameDisplayController({storage:store});assert.deepEqual(basement.getPreferences(),{side:'center',utilitySide:'right',size:85,controlSize:125});
 basement.setPreferences({side:'left'});assert.equal(createGameDisplayController({storage:store}).getPreferences().side,'left');assert.equal(store.getItem('progress'),'untouched');
});
test('blocked storage still applies the chosen position',()=>{
 let applied;const controller=createGameDisplayController({storage:{getItem(){throw Error()},setItem(){throw Error()}},onChange:value=>applied=value});
 controller.setPreferences({side:'right'});assert.equal(applied.side,'right');
});
test('basement position-only selector has three labeled choices and applies changes',()=>{
 const previous=globalThis.document;const make=tag=>({tag,children:[],handlers:{},append(...children){this.children.push(...children)},addEventListener(event,fn){this.handlers[event]=fn}});
 globalThis.document={body:{dataset:{}},createElement:make};
 try{const ui=initPadPosition({storage:storage()}),label=ui.element,select=label.children[0];assert.equal(label.textContent,'十字キーの位置');assert.deepEqual(select.children.map(option=>option.value),['left','center','right']);assert.equal(document.body.dataset.padPosition,'center');select.value='right';select.handlers.change();assert.equal(document.body.dataset.padPosition,'right');}finally{globalThis.document=previous}
});
test('town center raises only the pad, retains 44px targets and clears both side lanes',async()=>{
 const css=await readFile(new URL('../town/touch-controls.css',import.meta.url),'utf8');
 assert.match(css,/data-pad-position=center\] #town-main \.direction-pad\{position:absolute;grid-area:auto;left:50%;bottom:20px;transform:translateX\(-50%\)/);
 for(const width of [300,320,340,390,560,844])for(const scale of [1,1.05,1.1,1.15,1.2,1.25]){
  const lane=(width-16-16-112*scale)/2;assert.ok(lane>=44*scale,`${width}px / ${scale}`);
 }
});
test('basement selector does not load frame CSS or resize its existing pad',async()=>{
 const read=path=>readFile(new URL('../maze/'+path,import.meta.url),'utf8');const [app,css,html]=await Promise.all([read('app.js'),read('touch-pad.css'),read('index.html')]);
 assert.match(app,/initPadPosition\(\{onChange:\(\)=>clearInput\(\)\}\)/);assert.match(app,/content.append\(padPositionPreferences.element\)/);
 assert.doesNotMatch(html,/game-display.css/);assert.match(css,/--touch-pad-size:144px;--touch-button-size:56px/);assert.match(css,/--touch-pad-size:136px;--touch-button-size:52px/);
 for(const width of [272,300,320,390])assert.ok((width-(width===272?136:144)-32)/2>=44);
});

test('nearby creator controls keep the side-lane width override',async()=>{
 const css=await readFile(new URL('../maze/touch-pad.css',import.meta.url),'utf8');
 assert.ok(css.includes('#game:has(#creator-open:not([hidden])) :is(.nearby,.lantern-dock){width:calc((100% - var(--touch-pad-size) - 32px)/2)!important'));
});
test('bfcache pageshow and cross-tab storage refresh both selectors and destroy detaches listeners',()=>{
 const events=new EventTarget(),store=storage({progress:'keep'});let a,b;
 const town=createGameDisplayController({storage:store,eventTarget:events,onChange:value=>a=value.side});
 const basement=createGameDisplayController({storage:store,eventTarget:events,onChange:value=>b=value.side});
 store.setItem(GAME_DISPLAY_KEY,JSON.stringify({side:'right'}));events.dispatchEvent(new Event('pageshow'));assert.equal(a,'right');assert.equal(b,'right');
 store.setItem(GAME_DISPLAY_KEY,JSON.stringify({side:'left'}));const unrelated=new Event('storage');unrelated.key='progress';events.dispatchEvent(unrelated);assert.equal(a,'right');
 const update=new Event('storage');update.key=GAME_DISPLAY_KEY;events.dispatchEvent(update);assert.equal(a,'left');assert.equal(b,'left');
 town.destroy();basement.destroy();store.setItem(GAME_DISPLAY_KEY,JSON.stringify({side:'center'}));events.dispatchEvent(new Event('pageshow'));assert.equal(a,'left');assert.equal(b,'left');assert.equal(store.getItem('progress'),'keep');
});
test('stale basement side change merges freshly stored frame and control sizes',()=>{
 const store=storage();const basement=createGameDisplayController({storage:store});const town=createGameDisplayController({storage:store});
 town.setPreferences({size:75,controlSize:125,side:'right'});basement.setPreferences({side:'center'});
 assert.deepEqual(JSON.parse(store.getItem(GAME_DISPLAY_KEY)),{size:75,controlSize:125,side:'center',utilitySide:'right'});
});
test('failed writes retain local choices through pageshow and later side changes',()=>{
 const events=new EventTarget();const store={getItem:()=>null,setItem(){throw Error('full')}};
 const controller=createGameDisplayController({storage:store,eventTarget:events});controller.setPreferences({size:80,side:'right'});events.dispatchEvent(new Event('pageshow'));assert.equal(controller.getPreferences().side,'right');controller.setPreferences({side:'center'});assert.equal(controller.getPreferences().size,80);controller.destroy();
});
