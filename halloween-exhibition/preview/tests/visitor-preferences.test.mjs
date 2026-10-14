import test from 'node:test';
import assert from 'node:assert/strict';
import {PREFERENCE_KEY, normalizePreferences, readPreferences, writePreferences, createAmbientPlayer} from '../visitor-preferences.js';

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
 constructor(){this.currentTime=0;this.destination={};this.closed=0;this.gains=[];this.voices=[];FakeAudio.instances.push(this)}
 async resume(){}
 async close(){this.closed++}
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
 p.stop();assert.equal(p.isPlaying(),false);assert.equal(audio.closed,1);assert.deepEqual(states,[true,false]);
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
