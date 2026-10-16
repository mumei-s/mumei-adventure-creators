import test from 'node:test';
import assert from 'node:assert/strict';
import {bindHeldGameButton,bindDirectionPad} from '../game-input.js';
import {createAdventurePlayer,initAdventureAudio} from '../adventure-audio.js';
import {createSoundCheck} from '../sound-check.js';
import {createAmbientPlayer,initVisitorPreferences} from '../../visitor-preferences.js';

// DOM/Web Audio contract tests only: these do not claim real Safari rendering,
// OS interruption behavior, autoplay permission, or physical touch verification.
class Element {
  constructor(tag='div') {
    this.tagName=tag.toUpperCase();this.children=[];this.listeners=new Map();this.attributes={};
    this.captures=new Set();this.released=[];this.dataset={};this.active=false;
    this.classList={toggle:(_,value)=>{this.active=value;}};
    this.style={setProperty:(key,value)=>{this.style[key]=value;}};
  }
  append(...children){this.children.push(...children);}
  setAttribute(key,value){this.attributes[key]=value;}
  addEventListener(type,fn){const listeners=this.listeners.get(type)||new Set();listeners.add(fn);this.listeners.set(type,listeners);}
  removeEventListener(type,fn){this.listeners.get(type)?.delete(fn);}
  emit(type,detail={}) {
    const event={target:this,button:0,pointerId:1,clientX:50,clientY:5,cancelable:true,preventDefault(){this.defaultPrevented=true;},...detail};
    for(const fn of [...(this.listeners.get(type)||[])])fn(event);
    return event;
  }
  closest(){return null;}
  focus(){}
  getBoundingClientRect(){return {left:0,top:0,width:100,height:100};}
  setPointerCapture(id){this.captures.add(id);}
  hasPointerCapture(id){return this.captures.has(id);}
  releasePointerCapture(id){this.captures.delete(id);this.released.push(id);this.emit('lostpointercapture',{pointerId:id});}
  remove(){this.removed=true;}
}

test('held resets release all browser captures before a later fresh touch',()=>{
  const button=new Element('button'),changes=[];
  const {reset}=bindHeldGameButton(button,{onChange:value=>changes.push(value)});
  button.emit('pointerdown');button.emit('pointerdown',{pointerId:2});button.emit('keydown',{key:' '});
  reset();assert.deepEqual(button.released,[1,2]);assert.equal(button.captures.size,0);assert.deepEqual(changes,[true,false]);
  button.emit('pointerup');button.emit('keyup',{key:' '});assert.deepEqual(changes,[true,false]);
  button.emit('pointerdown',{pointerId:3});button.emit('pointercancel',{pointerId:3});
  assert.deepEqual(changes,[true,false,true,false]);assert.equal(button.captures.size,0);
});

test('one held touch release cannot release another touch or duplicate its change callback',()=>{
  const button=new Element('button'),changes=[];bindHeldGameButton(button,{onChange:value=>changes.push(value)});
  button.emit('pointerdown');button.emit('pointerdown',{pointerId:2});button.emit('pointerup');
  assert.deepEqual([...button.captures],[2]);assert.equal(button.active,true);assert.deepEqual(changes,[true]);
  button.emit('pointerup',{pointerId:99});assert.deepEqual(button.released,[1]);
  button.emit('pointercancel',{pointerId:2});assert.deepEqual(changes,[true,false]);
});

test('direction pad reset tolerates synchronous lost capture and obsolete pointer events',()=>{
  const pad=new Element(),changes=[];const {reset}=bindDirectionPad(pad,{onChange:value=>changes.push(value)});
  pad.emit('pointerdown');reset();assert.equal(pad.captures.size,0);assert.deepEqual(changes,['forward',null]);
  pad.emit('pointermove',{clientX:95,clientY:50});pad.emit('pointerup');assert.deepEqual(changes,['forward',null]);
  pad.emit('pointerdown',{pointerId:2,clientX:95,clientY:50});pad.emit('lostpointercapture',{pointerId:1});
  assert.equal(changes.at(-1),'right');pad.emit('pointerup',{pointerId:2});assert.equal(changes.at(-1),null);
  assert.equal(pad.style['--pad-x'],'0px');assert.equal(pad.dataset.direction,'');
});

test('platform capture-release failures cannot prevent resetting input',()=>{
  for(const bind of [bindHeldGameButton,bindDirectionPad]){
    const element=new Element('button'),changes=[];const {reset}=bind(element,{onChange:value=>changes.push(value)});
    element.emit('pointerdown');element.releasePointerCapture=()=>{throw Error('Contact was already removed');};
    assert.doesNotThrow(reset);assert.equal(Boolean(changes.at(-1)),false);
  }
});

function clock(){let id=0;const jobs=new Map();return {jobs,schedule:fn=>{jobs.set(++id,fn);return id;},cancel:id=>jobs.delete(id),deadline:fn=>{jobs.set(++id,fn);return id;},cancelDeadline:id=>jobs.delete(id)};}
class Audio {
  static all=[];
  constructor(){this.state='suspended';this.currentTime=0;this.destination={};this.gains=[];this.voices=[];this.closed=0;this.resumeCalls=0;Audio.all.push(this);}
  resume(){this.resumeCalls++;this.state='running';return Promise.resolve();}
  close(){this.state='closed';this.closed++;return Promise.resolve();}
  createGain(){const gain={value:0,events:[],cancelScheduledValues(){},setTargetAtTime(value){this.events.push(value);},setValueAtTime(value){this.events.push(value);},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}};const node={gain,connect(){},disconnect(){this.disconnected=true;}};this.gains.push(node);return node;}
  createOscillator(){const node={frequency:{value:0},connect(){},start(){},stop(){this.stopped=true;},disconnect(){this.disconnected=true;}};this.voices.push(node);return node;}
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));

for(const [name,factory] of [['adventure',createAdventurePlayer],['gallery',createAmbientPlayer]]){
  test(`${name} resumes synchronously only after explicit start and handles a synchronous resume failure`,async()=>{
    const c=clock();class Failed extends Audio{resume(){this.resumeCalls++;throw Error('Device unavailable');}}
    const before=Audio.all.length,p=factory({AudioContextCtor:Failed,...c});p.setVolume(70);
    assert.equal(Audio.all.length,before);const pending=p.start(),audio=Audio.all.at(-1);assert.equal(audio.resumeCalls,1);
    await pending;await flush();assert.equal(p.isActive(),false);assert.equal(audio.closed,1);assert.equal(audio.voices.length,0);assert.equal(c.jobs.size,0);
  });
  test(`${name} OFF settles an unresolved resume and clears every deadline without a late voice`,async()=>{
    const c=clock();let release;class Pending extends Audio{resume(){return new Promise(resolve=>{release=resolve;});}}
    const p=factory({AudioContextCtor:Pending,...c});let settled=false;const start=p.start().then(()=>{settled=true;});const audio=Audio.all.at(-1);
    p.stop();await flush();assert.equal(settled,true);await start;assert.equal(audio.closed,1);assert.equal(c.jobs.size,0);
    release();await flush();assert.equal(audio.voices.length,0);assert.equal(p.isActive(),false);
  });
  test(`${name} catches interruption before statechange and disconnects the entire graph`,async()=>{
    const c=clock(),p=factory({AudioContextCtor:Audio,...c});await p.start();const audio=Audio.all.at(-1),count=audio.voices.length,tick=[...c.jobs.values()][0];
    audio.state='interrupted';audio.currentTime=1;tick();assert.equal(audio.voices.length,count);assert.equal(p.isActive(),false);
    assert.equal(c.jobs.size,0);assert(audio.voices.every(voice=>voice.stopped&&voice.disconnected));assert(audio.gains.every(gain=>gain.disconnected));
  });
}

test('the dedicated slider can retry a pending resume in its release gesture using one context/deadline',async()=>{
  const c=clock();class ReleaseGesture extends Audio{resume(){this.resumeCalls++;if(this.resumeCalls===1)return new Promise(()=>{});this.state='running';return Promise.resolve();}}
  const p=createAdventurePlayer({AudioContextCtor:ReleaseGesture,...c});const starting=p.start(),audio=Audio.all.at(-1),deadline=[...c.jobs.keys()][0];
  p.resumeFromGesture();assert.equal(audio.resumeCalls,2);assert.deepEqual([...c.jobs.keys()],[deadline]);await starting;
  assert.equal(p.isPlaying(),true);assert.equal(Audio.all.at(-1),audio);p.stop();p.resumeFromGesture();assert.equal(audio.resumeCalls,2);
});

test('adventure and gallery remain separate players when one is interrupted',async()=>{
  const firstClock=clock(),secondClock=clock(),game=createAdventurePlayer({AudioContextCtor:Audio,...firstClock}),gallery=createAmbientPlayer({AudioContextCtor:Audio,...secondClock});
  await game.start();const gameAudio=Audio.all.at(-1);await gallery.start();const galleryAudio=Audio.all.at(-1);
  game.stop();assert.equal(gameAudio.closed,1);assert.equal(galleryAudio.closed,0);assert.equal(gallery.isPlaying(),true);gallery.stop();
});

test('stopping the speaker check settles an unresolved resume immediately without late notes',async()=>{
  const c=clock();let release;class Pending extends Audio{resume(){return new Promise(resolve=>{release=resolve;});}}
  const check=createSoundCheck({AudioContextCtor:Pending,schedule:c.deadline,cancel:c.cancelDeadline});let settled=false;
  const pending=check.play(20).then(()=>{settled=true;}),audio=Audio.all.at(-1);check.stop();await flush();
  assert.equal(settled,true);await pending;assert.equal(c.jobs.size,0);assert.equal(audio.closed,1);
  release();await flush();assert.equal(audio.voices.length,0);
});

test('speaker check synchronous failure closes cleanly and a new check survives old cancellation',async()=>{
  const c=clock();class Failed extends Audio{resume(){throw Error('Device unavailable');}}
  const failed=createSoundCheck({AudioContextCtor:Failed,schedule:c.deadline,cancel:c.cancelDeadline});await failed.play(20);await flush();
  assert.equal(Audio.all.at(-1).closed,1);assert.equal(c.jobs.size,0);
  const releases=[];class Pending extends Audio{resume(){return new Promise(resolve=>releases.push(()=>{this.state='running';resolve();}));}}
  const check=createSoundCheck({AudioContextCtor:Pending,schedule:c.deadline,cancel:c.cancelDeadline});
  const first=check.play(20),old=Audio.all.at(-1),second=check.play(20),latest=Audio.all.at(-1);releases[1]();await second;await first;
  releases[0]();await flush();assert.equal(old.voices.length,0);assert.equal(latest.closed,0);assert.equal(latest.voices.length,3);
  check.stop();assert.equal(c.jobs.size,0);
});

async function ui(kind,run,Ctor=Audio){
  const keys=['document','window','localStorage','AudioContext','setInterval','clearInterval','setTimeout','clearTimeout'];
  const previous=Object.fromEntries(keys.map(key=>[key,globalThis[key]])),doc=new Element(),win=new Element(),container=new Element(),c=clock();
  doc.hidden=false;doc.createElement=tag=>new Element(tag);doc.defaultView=win;
  const writes=[];Object.assign(globalThis,{document:doc,window:win,localStorage:{getItem:()=>JSON.stringify({brightness:120,volume:100}),setItem:(...entry)=>writes.push(entry)},AudioContext:Ctor,setInterval:c.schedule,clearInterval:c.cancel,setTimeout:c.deadline,clearTimeout:c.cancelDeadline});
  let settings;
  try{
    settings=kind==='adventure'?initAdventureAudio({settingsContainer:container}):initVisitorPreferences({container});
    const section=container.children[0];const [button,,input,output]=kind==='adventure'?section.children[1].children:[section.children[1],null,section.children[2].children[2],section.children[2].children[1]];
    await run({settings,doc,win,container,button,input,output,writes,c});
  }finally{settings?.destroy();for(const [key,value]of Object.entries(previous)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
}

test('adventure slider pointerup and change retry only pending visible music, never music stopped by leaving',async()=>{
  for(const gesture of ['pointerup','change']){
    class ReleaseGesture extends Audio{resume(){this.resumeCalls++;if(this.resumeCalls===1)return new Promise(()=>{});this.state='running';return Promise.resolve();}}
    await ui('adventure',async h=>{
      h.input.value='30';h.input.emit('input');const audio=Audio.all.at(-1);assert.equal(audio.resumeCalls,1);
      h.input.emit(gesture);await flush();assert.equal(audio.resumeCalls,2);assert.equal(h.button.attributes['aria-pressed'],'true');
      h.win.emit('blur');const count=Audio.all.length;h.input.emit('pointerup');h.win.emit('focus');await flush();assert.equal(Audio.all.length,count);assert.equal(audio.closed,1);
    },ReleaseGesture);
  }
});

for(const kind of ['adventure','gallery'])test(`${kind} BFCache return restores OFF/0 without changing brightness, storage or restarting`,async()=>{
  await ui(kind,async h=>{
    assert.equal(h.settings.getPreferences().volume,0);h.input.value='70';h.input.emit('input');if(kind==='gallery')h.button.emit('click');await flush();
    assert.equal(h.button.attributes['aria-pressed'],'true');h.win.emit('pagehide');const count=Audio.all.length,writes=h.writes.length;
    h.win.emit('pageshow',{persisted:true});h.win.emit('focus');h.doc.emit('visibilitychange');
    assert.deepEqual(h.settings.getPreferences(),{brightness:120,volume:0});assert.equal(h.input.value,'0');assert.equal(h.output.textContent,'0%');assert.equal(h.button.attributes['aria-pressed'],'false');
    assert.equal(Audio.all.length,count);assert.equal(h.writes.length,writes);h.settings.destroy();
    for(const type of ['blur','pagehide','pageshow'])assert.equal(h.win.listeners.get(type)?.size||0,0);assert.equal(h.doc.listeners.get('visibilitychange')?.size||0,0);
  });
});
