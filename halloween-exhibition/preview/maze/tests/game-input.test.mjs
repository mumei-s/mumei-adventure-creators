import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {protectGameSurface,bindHeldGameButton,EDITABLE_SURFACE,GAME_SURFACE} from '../game-input.js';
class Element{
  constructor(tag,{parent=null,cls='',editable=false}={}){this.tagName=tag.toUpperCase();this.parentElement=parent;this.cls=cls;this.editable=editable;this.handlers={};this.disabled=false;this.active=false;this.captures=[];this.classList={toggle:(_,v)=>this.active=v};}
  closest(selector){for(let node=this;node;node=node.parentElement){if(selector===EDITABLE_SURFACE&&(['INPUT','TEXTAREA','SELECT'].includes(node.tagName)||node.editable))return node;if(selector===GAME_SURFACE&&(['BUTTON','A','CANVAS','FOOTER'].includes(node.tagName)||['place','minimap','move-pad','look-pad','nearby'].includes(node.cls)))return node;}return null;}
  contains(node){for(;node;node=node.parentElement)if(node===this)return true;return false;}
  addEventListener(type,handler){(this.handlers[type]||=[]).push(handler);}
  emit(type,values={}){const event={target:this,cancelable:true,defaultPrevented:false,button:0,pointerId:1,key:'',preventDefault(){this.defaultPrevented=true;},...values};for(const handler of this.handlers[type]||[])handler(event);if(type==='click'&&!event.defaultPrevented)this.onclick?.();return event;}
  focus(options){this.focusOptions=options;}
  setPointerCapture(id){if(this.captureError)throw Error('Pointer no longer active');this.captures.push(id);}
}
const root=()=>new Element('main');
function hold(options={}){const button=new Element('button'),changes=[];const binding=bindHeldGameButton(button,{onChange:active=>changes.push(active),...options});return {button,changes,...binding};}
test('game HUD long-press selection, drag and callout are prevented only in the game root',()=>{
  const game=root();protectGameSurface(game);
  for(const tag of ['button','a','canvas'])for(const type of ['selectstart','contextmenu','dragstart']){const el=new Element(tag,{parent:game});assert(game.emit(type,{target:el}).defaultPrevented);}
  const button=new Element('button',{parent:game}),label=new Element('span',{parent:button});assert(game.emit('selectstart',{target:label}).defaultPrevented);
  assert(game.emit('selectstart',{target:{parentElement:label}}).defaultPrevented,'Text nodes follow their parent control');
  const outside=new Element('button');assert(!game.emit('contextmenu',{target:outside}).defaultPrevented);
});
test('article prose, form controls and editable descendants keep selection and native menus',()=>{
  const game=root();protectGameSurface(game);const hud=new Element('footer',{parent:game});
  for(const tag of ['input','textarea','select'])for(const type of ['selectstart','contextmenu','dragstart'])assert(!game.emit(type,{target:new Element(tag,{parent:hud})}).defaultPrevented);
  const editor=new Element('div',{parent:hud,editable:true}),child=new Element('span',{parent:editor});assert(!game.emit('selectstart',{target:child}).defaultPrevented);
  const article=new Element('p',{parent:new Element('dialog')});assert(!game.emit('selectstart',{target:article}).defaultPrevented);
});
test('lantern retains its native click handler without touch-driven duplicate activation',()=>{
  const game=root();protectGameSurface(game);const lantern=new Element('button',{parent:game});let toggles=0;lantern.onclick=()=>toggles++;
  for(const type of ['pointerdown','pointerup'])assert(!game.emit(type,{target:lantern}).defaultPrevented);
  lantern.emit('click');assert.equal(toggles,1);assert.equal(game.handlers.click,undefined);assert.equal(game.handlers.pointerdown,undefined);
});
test('held movement starts once, captures the pointer, and ends on release',()=>{
  const {button,changes}=hold();assert(button.emit('pointerdown').defaultPrevented);assert.deepEqual(button.focusOptions,{preventScroll:true});assert.deepEqual(button.captures,[1]);assert(button.active);
  button.emit('pointermove');button.emit('pointerdown');assert.deepEqual(changes,[true]);button.emit('pointerup');assert.deepEqual(changes,[true,false]);assert(!button.active);button.emit('lostpointercapture');assert.deepEqual(changes,[true,false]);
});
test('pointer cancellation and lost capture cannot leave movement held',()=>{
  for(const type of ['pointercancel','lostpointercapture']){const {button,changes}=hold();button.emit('pointerdown');button.emit(type);assert.deepEqual(changes,[true,false]);assert(!button.active);}
});
test('multiple pointers release independently without a stale held direction',()=>{
  const {button,changes}=hold();button.emit('pointerdown',{pointerId:1});button.emit('pointerdown',{pointerId:2});button.emit('pointerup',{pointerId:1});assert(button.active);button.emit('pointercancel',{pointerId:2});assert(!button.active);assert.deepEqual(changes,[true,false]);
});
test('blocked, disabled, right-click and failed capture cannot initiate movement',()=>{
  const blocked=hold({blocked:()=>true});assert(!blocked.button.emit('pointerdown').defaultPrevented);assert.deepEqual(blocked.changes,[]);
  const disabled=hold();disabled.button.disabled=true;disabled.button.emit('pointerdown');assert.deepEqual(disabled.changes,[]);
  const secondary=hold();assert(!secondary.button.emit('pointerdown',{button:2}).defaultPrevented);assert.deepEqual(secondary.changes,[]);
  const failed=hold();failed.button.captureError=true;failed.button.emit('pointerdown');assert.deepEqual(failed.changes,[]);
});
test('Space and Enter hold natively focusable controls; keyup and focus loss stop them',()=>{
  for(const key of [' ','Enter']){const {button,changes}=hold();assert(button.emit('keydown',{key}).defaultPrevented);button.emit('keydown',{key,repeat:true});assert.deepEqual(changes,[true]);assert(button.emit('keyup',{key}).defaultPrevented);assert.deepEqual(changes,[true,false]);}
  const {button,changes}=hold();button.emit('keydown',{key:' '});button.emit('blur');assert.deepEqual(changes,[true,false]);button.emit('keyup',{key:' '});assert.deepEqual(changes,[true,false]);
});
test('clearing input resets all pointer and keyboard state before a later press',()=>{
  const {button,changes,reset}=hold();button.emit('pointerdown');button.emit('keydown',{key:' '});reset();assert(!button.active);button.emit('pointerup');button.emit('keyup',{key:' '});assert.deepEqual(changes,[true,false]);button.emit('pointerdown',{pointerId:2});button.emit('pointerup',{pointerId:2});assert.deepEqual(changes,[true,false,true,false]);
});
test('a held pointer continues when keyboard focus moves, then cancels cleanly',()=>{
  const {button,changes}=hold();button.emit('pointerdown');button.emit('keydown',{key:' '});button.emit('blur');assert(button.active);button.emit('pointercancel');assert.deepEqual(changes,[true,false]);
});
test('touch styling is scoped, supports WebKit and leaves zoom and article copy outside game',()=>{
  const css=fs.readFileSync(new URL('../rpg-ui.css',import.meta.url),'utf8'),input=fs.readFileSync(new URL('../game-input.js',import.meta.url),'utf8');
  assert(css.includes('-webkit-user-select:none;user-select:none;-webkit-touch-callout:none'));
  assert(css.includes('#game :is(button,a){touch-action:manipulation}'));assert(css.includes('#game :is([data-move],#turn-left,#turn-right){touch-action:none}'));
  assert(css.includes('-webkit-user-select:text;user-select:text;-webkit-touch-callout:default;touch-action:auto'));
  assert(!input.includes('getSelection'));assert(!input.includes('removeAllRanges'));assert(!input.includes('touchstart'));assert(!input.includes('document.addEventListener'));
});
test('app integrates scoped guards, resets holds on interruption and cache-busts only changed entries',()=>{
  const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8'),html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert(app.includes("protectGameSurface($('game'))"));assert(app.includes('for(const control of heldControls)control.reset()'));assert(app.includes("window.addEventListener('blur',clearInput)"));assert(app.includes('e.target.isContentEditable'));
  assert(app.includes("$('lantern').onclick=toggleLantern"));assert(!app.includes("$('lantern').addEventListener('pointerdown'"));
  assert(html.includes('./app.js?v=20261014-touch1'));assert(html.includes('./rpg-ui.css?v=20261014-touch1'));assert(app.includes('./game-input.js?v=20261014-touch1'));assert(html.includes('width=device-width,initial-scale=1,viewport-fit=cover'));assert(!html.includes('user-scalable=no'));
});
