import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createSoundCheck} from '../sound-check.js';
class Audio{
 static all=[];
 constructor(){this.state='suspended';this.currentTime=0;this.destination={};this.voices=[];Audio.all.push(this)}
 async resume(){this.state='running'}
 async close(){this.state='closed'}
 createGain(){return {connect(){},gain:{setValueAtTime(){},linearRampToValueAtTime(){}}}}
 createOscillator(){const node={frequency:{},connect(){},start(){this.started=true},stop(){this.stopped=true}};this.voices.push(node);return node;}
}
test('speaker check requires explicit play, respects mute and closes after one second',async()=>{
 let finish;const statuses=[],check=createSoundCheck({AudioContextCtor:Audio,onState:(...s)=>statuses.push(s),schedule:cb=>{finish=cb;return 1},cancel:()=>{}});
 const before=Audio.all.length;assert.equal(before,Audio.all.length);await check.play();assert.equal(Audio.all.length,before);await check.play(0);assert.equal(Audio.all.length,before);assert.match(statuses.at(-1)[1],/0%/);
 await check.play(20);const a=Audio.all.at(-1);assert.equal(a.voices.length,3);assert(a.voices.every(v=>v.started&&v.stopped));assert.equal(statuses.at(-1)[0],true);finish();assert.equal(a.state,'closed');assert.equal(statuses.at(-1)[0],false);
});
test('failed resume and canceled pending checks cannot emit late notes',async()=>{
 class Suspended extends Audio{async resume(){}}
 const statuses=[],bad=createSoundCheck({AudioContextCtor:Suspended,onState:(...s)=>statuses.push(s)});await bad.play(20);assert.equal(Audio.all.at(-1).voices.length,0);assert.equal(statuses.at(-1)[0],false);
 let resolve;class Delayed extends Audio{resume(){return new Promise(r=>resolve=r)}}
 const check=createSoundCheck({AudioContextCtor:Delayed});const pending=check.play(20);check.stop();resolve();await pending;assert.equal(Audio.all.at(-1).voices.length,0);
});
test('menu labels identify ON/OFF and result; sound test is scoped and no autoplay',()=>{
 const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');assert(!app.includes('演出の動きを切り替え'));assert(app.includes('演出：ON → 停止する'));assert(app.includes('演出：OFF → 再開する'));assert(app.includes("toggle.disabled=reducedMotion.matches"));assert(app.includes('メニューを閉じると確認できます'));assert(app.includes("if(document.hidden)soundCheck.stop('')"));assert(app.includes('soundCheck.play(visitorSettings.getPreferences().volume)'));
});

test('unresolved resume times out, and a late resume cannot start notes or timers',async()=>{
 let resolve;class Delayed extends Audio{resume(){return new Promise(r=>resolve=()=>{this.state='running';r()})}}
 const jobs=new Map(),statuses=[];let serial=0;
 const check=createSoundCheck({AudioContextCtor:Delayed,onState:(...s)=>statuses.push(s),schedule:(cb,delay)=>{const id=++serial;jobs.set(id,{cb,delay});return id},cancel:id=>jobs.delete(id)});
 const pending=check.play(20);const a=Audio.all.at(-1);assert.equal(jobs.get(1).delay,5000);jobs.get(1).cb();await pending;
 assert.equal(a.state,'closed');assert.equal(a.voices.length,0);assert.match(statuses.at(-1)[1],/開始できません/);
 const count=statuses.length;resolve();await Promise.resolve();await Promise.resolve();assert.equal(a.voices.length,0);assert.equal(statuses.length,count);
});
test('successful resume and explicit stop cancel the pending resume deadline',async()=>{
 const jobs=new Map(),canceled=[];let serial=0;
 const schedule=(cb,delay)=>{jobs.set(++serial,{cb,delay});return serial},cancel=id=>{canceled.push(id);jobs.delete(id)};
 const check=createSoundCheck({AudioContextCtor:Audio,schedule,cancel});await check.play(20);assert(canceled.includes(1));assert.equal(jobs.get(2).delay,1100);check.stop();assert.equal(jobs.size,0);
 let resolve;class Delayed extends Audio{resume(){return new Promise(r=>resolve=r)}}
 const delayed=createSoundCheck({AudioContextCtor:Delayed,schedule,cancel});const pending=delayed.play(20);delayed.stop();assert.equal(jobs.size,0);resolve();await pending;assert.equal(Audio.all.at(-1).voices.length,0);
});
