import test from 'node:test';
import assert from 'node:assert/strict';
import {PREFERENCE_KEY, normalizePreferences, readPreferences, writePreferences, createAmbientPlayer, initVisitorPreferences} from '../visitor-preferences.js';

test('visitor defaults are bounded and contain no autoplay preference',()=>{
 assert.deepEqual(normalizePreferences(),{brightness:100,volume:20});
 for(const value of [null,[],true,'invalid'])assert.deepEqual(normalizePreferences(value),{brightness:100,volume:20});
 assert.deepEqual(normalizePreferences({brightness:0,volume:1000,playing:true}),{brightness:75,volume:100});
 assert.deepEqual(normalizePreferences({brightness:1000,volume:-5}),{brightness:175,volume:0});
 assert.deepEqual(normalizePreferences({brightness:NaN,volume:Infinity}),{brightness:100,volume:20});
});
test('legacy brightness migrates only when shared key is absent',()=>{
 assert.deepEqual(readPreferences({getItem:()=>null},125),{brightness:125,volume:20});
 assert.deepEqual(readPreferences({getItem:()=>'{broken'},125),{brightness:100,volume:20});
 assert.deepEqual(readPreferences({getItem:()=>'{"brightness":90,"volume":35}'},125),{brightness:90,volume:35});
});
test('storage denied reads and writes safely preserve scoped behavior',()=>{
 const blocked={getItem(){throw Error('denied')},setItem(){throw Error('denied')}};
 assert.deepEqual(readPreferences(blocked),{brightness:100,volume:20});
 assert.equal(writePreferences(blocked,{brightness:100,volume:0}),false);
 let saved;assert.equal(writePreferences({setItem(k,v){saved={k,v}}},{brightness:125,volume:40,playing:true}),true);
 assert.equal(saved.k,PREFERENCE_KEY);assert.deepEqual(JSON.parse(saved.v),{brightness:125,volume:40});
});
class FakeAudio {
 static instances=[];
 constructor(){this.state='suspended';this.currentTime=0;this.destination={};this.closed=0;this.gains=[];this.voices=[];FakeAudio.instances.push(this)}
 async resume(){this.state='running'}
 async close(){this.closed++;this.state='closed'}
 createGain(){const gain={value:0,events:[],setTargetAtTime(v,t,d){this.events.push({v,t,d})}};const n={gain,connect(){}};this.gains.push(n);return n}
 createOscillator(){const frequency={value:0,setTargetAtTime(){}};const n={frequency,detune:{value:0},connect(){},start(){this.started=true}};this.voices.push(n);return n}
}
test('creating ambient player never starts audio or creates a context',()=>{
 const before=FakeAudio.instances.length;const p=createAmbientPlayer({AudioContextCtor:FakeAudio});
 p.setVolume(50);assert.equal(FakeAudio.instances.length,before);assert.equal(p.isPlaying(),false);
});
test('explicit music start creates quiet original voices; zero volume mutes; OFF closes context',async()=>{
 const states=[],p=createAmbientPlayer({AudioContextCtor:FakeAudio,onState:x=>states.push(x)});
 p.setVolume(25);await p.start();const audio=FakeAudio.instances.at(-1);
 assert.equal(p.isPlaying(),true);assert.equal(audio.voices.length,3);assert.ok(audio.voices.every(v=>v.started));
 assert.equal(audio.gains[0].gain.events.at(-1).v,.0175);
 p.setVolume(0);assert.equal(audio.gains[0].gain.events.at(-1).v,0);
 p.stop();assert.equal(p.isPlaying(),false);assert.equal(audio.closed,1);assert.deepEqual(states,[false,true,false]);
});
test('repeated ON starts only one context and cancellation prevents late audio',async()=>{
 let resume;class Deferred extends FakeAudio {resume(){return new Promise(r=>{resume=r})}}
 const before=FakeAudio.instances.length,p=createAmbientPlayer({AudioContextCtor:Deferred});
 const starting=p.start();await p.start();assert.equal(FakeAudio.instances.length,before+1);
 p.stop();resume();await starting;assert.equal(p.isPlaying(),false);assert.equal(FakeAudio.instances.at(-1).voices.length,0);
});
test('unavailable audio provides a clear status without blocking settings',async()=>{
 const messages=[];class Failed extends FakeAudio {async resume(){throw Error('blocked')}}
 const p=createAmbientPlayer({AudioContextCtor:Failed,onState:(playing,message)=>messages.push(message)});
 await p.start();assert.equal(p.isPlaying(),false);assert.ok(messages.some(x=>x?.includes('開始できません')));
});

const mainOptions = { brightnessRange: { min: 0, max: 100, defaultValue: 75 }, preferenceKey: 'halloween-exhibition:main-preferences:v2', migrateFromKey: PREFERENCE_KEY };
test('main supports 0/75/100 and default75 without changing maze legacy range',()=>{
 assert.deepEqual(normalizePreferences({},undefined,mainOptions),{brightness:75,volume:20});
 for(const brightness of [0,75,100])assert.equal(normalizePreferences({brightness},undefined,mainOptions).brightness,brightness);
 assert.equal(normalizePreferences({brightness:175},undefined,mainOptions).brightness,100);
 assert.equal(normalizePreferences({brightness:0}).brightness,75);
 assert.equal(normalizePreferences({brightness:175}).brightness,175);
 assert.equal(normalizePreferences().brightness,100);
});
test('explicit main migration clamps older values and never writes maze namespace',()=>{
 const data=new Map([[PREFERENCE_KEY,JSON.stringify({brightness:175,volume:46,playing:true})]]);
 const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 assert.deepEqual(readPreferences(storage,undefined,mainOptions),{brightness:100,volume:46});
 const original=data.get(PREFERENCE_KEY);
 writePreferences(storage,{brightness:0,volume:100,playing:true},mainOptions);
 assert.deepEqual(readPreferences(storage,undefined,mainOptions),{brightness:0,volume:100});
 assert.equal(data.get(PREFERENCE_KEY),original);
 assert.deepEqual(readPreferences(storage),{brightness:175,volume:46});
 data.set(mainOptions.preferenceKey,'broken');
 assert.deepEqual(readPreferences(storage,undefined,mainOptions),{brightness:75,volume:20});
 data.delete(mainOptions.preferenceKey);data.set(PREFERENCE_KEY,'{"brightness":100}');
 assert.equal(readPreferences(storage,undefined,mainOptions).brightness,100);
 assert.equal(readPreferences({getItem(){throw Error()}},undefined,mainOptions).brightness,75);
});
test('successful resume promise with suspended or interrupted state never reports ON',async()=>{
 for(const state of ['suspended','interrupted','closed']){
  class NotRunning extends FakeAudio {async resume(){this.state=state}}
  const states=[],p=createAmbientPlayer({AudioContextCtor:NotRunning,onState:(on,msg)=>states.push({on,msg})});
  await p.start();assert.equal(p.isPlaying(),false);assert.equal(p.isActive(),false);
  assert.ok(states.every(s=>!s.on));assert.match(states.at(-1).msg,/開始できません/);
  assert.equal(FakeAudio.instances.at(-1).voices.length,0);
 }
});
test('suspension/interruption/closure clears ON and never resumes without another explicit start',async()=>{
 for(const state of ['suspended','interrupted','closed']){
  const states=[],p=createAmbientPlayer({AudioContextCtor:FakeAudio,onState:(on,msg)=>states.push({on,msg})});
  await p.start();const audio=FakeAudio.instances.at(-1);audio.state=state;audio.onstatechange();
  assert.equal(p.isPlaying(),false);assert.equal(p.isActive(),false);assert.match(states.at(-1).msg,/中断/);
  await p.start();assert.equal(p.isPlaying(),true);assert.notEqual(FakeAudio.instances.at(-1),audio);p.stop();
 }
});
test('rapid ON/OFF/ON cannot let an old pending resume close or start the newer context',async()=>{
 const pending=[];class Deferred extends FakeAudio {resume(){return new Promise(resolve=>pending.push(()=>{this.state='running';resolve()}))}}
 const states=[],p=createAmbientPlayer({AudioContextCtor:Deferred,onState:on=>states.push(on)});
 const first=p.start(),old=FakeAudio.instances.at(-1);assert.equal(p.isActive(),true);p.stop();
 const second=p.start(),latest=FakeAudio.instances.at(-1);pending[1]();await second;pending[0]();await first;
 assert.equal(p.isPlaying(),true);assert.equal(old.voices.length,0);assert.equal(latest.closed,0);assert.equal(latest.voices.length,3);
 assert.equal(states.filter(Boolean).length,1);p.stop();
});
test('volume covers zero to100 linearly with bounded gain and no automatic start',async()=>{
 const p=createAmbientPlayer({AudioContextCtor:FakeAudio});p.setVolume(0);assert.equal(p.isActive(),false);await p.start();
 const gain=FakeAudio.instances.at(-1).gains[0].gain;
 for(const volume of [0,20,50,100]){p.setVolume(volume);assert.equal(gain.events.at(-1).v,volume/100*.07)}
 p.setVolume(1000);assert.equal(gain.events.at(-1).v,.07);p.stop();
});

class Element {
 constructor(tag){this.tagName=tag;this.children=[];this.listeners={};this.attributes={}}
 append(...children){this.children.push(...children)}
 setAttribute(k,v){this.attributes[k]=v}
 addEventListener(k,v){this.listeners[k]=v}
 removeEventListener(k){delete this.listeners[k]}
 remove(){}
 emit(k){return this.listeners[k]?.()}
}
test('UI starts OFF, main slider uses range and hidden/pagehide stop pending or running audio',async()=>{
 const prior={document:globalThis.document,window:globalThis.window,localStorage:globalThis.localStorage,AudioContext:globalThis.AudioContext};
 const document=new Element('document'),window=new Element('window'),container=new Element('div');
 document.hidden=false;document.createElement=tag=>new Element(tag);
 const data=new Map();
 Object.assign(globalThis,{document,window,AudioContext:FakeAudio,localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)}});
 let settings;
 try{
  const before=FakeAudio.instances.length,brightnessValues=[];
  settings=initVisitorPreferences({container,...mainOptions,onBrightness:v=>brightnessValues.push(v)});
  const [brightness,music,volume,status]=container.children[0].children;
  assert.equal(FakeAudio.instances.length,before);assert.equal(music.attributes['aria-pressed'],'false');
  assert.equal(brightness.children[2].min,'0');assert.equal(brightness.children[2].max,'100');assert.equal(brightness.children[2].value,'75');
  for(const value of [0,75,100]){brightness.children[2].value=String(value);brightness.children[2].emit('input');assert.equal(brightnessValues.at(-1),value)}
  music.emit('click');await Promise.resolve();assert.equal(music.attributes['aria-pressed'],'true');
  document.hidden=true;document.emit('visibilitychange');assert.equal(music.attributes['aria-pressed'],'false');
  document.hidden=false;document.emit('visibilitychange');assert.equal(music.attributes['aria-pressed'],'false');
  music.emit('click');await Promise.resolve();window.emit('pagehide');assert.equal(music.attributes['aria-pressed'],'false');
  let release;class Pending extends FakeAudio {resume(){return new Promise(r=>release=r)}}
  globalThis.AudioContext=Pending;music.emit('click');assert.match(music.textContent,/キャンセル/);
  document.hidden=true;document.emit('visibilitychange');release();await Promise.resolve();
  assert.equal(music.attributes['aria-pressed'],'false');assert.equal(FakeAudio.instances.at(-1).voices.length,0);
  const count=FakeAudio.instances.length;music.emit('click');assert.equal(FakeAudio.instances.length,count);
  assert.equal(data.has(PREFERENCE_KEY),false);
 }finally{settings?.destroy();for(const [k,v]of Object.entries(prior)){if(v===undefined)delete globalThis[k];else globalThis[k]=v}}
});
