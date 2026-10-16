import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ADVENTURE_BEAT_SECONDS,ADVENTURE_PREFERENCE_KEY,adventureScore,createAdventurePlayer,initAdventureAudio} from '../adventure-audio.js';
class Audio {
  static all=[];
  constructor(){this.state='suspended';this.currentTime=0;this.destination={};this.voices=[];this.gains=[];this.closed=0;Audio.all.push(this);}
  async resume(){this.state='running';}
  async close(){this.state='closed';this.closed++;}
  createGain(){const n={gain:{value:0,events:[],cancelScheduledValues(t){this.events=this.events.filter(e=>e.t<t);},setTargetAtTime(v,t){this.events.push({v,t});},setValueAtTime(v,t){this.events.push({v,t});},linearRampToValueAtTime(v,t){this.events.push({v,t});},exponentialRampToValueAtTime(v,t){this.events.push({v,t});}},connect(){},disconnect(){this.disconnected=true;}};this.gains.push(n);return n;}
  createOscillator(){const n={frequency:{value:0},connect(){},disconnect(){this.disconnected=true;},start(t){this.startTime=t;},stop(t){this.stopTime=t;this.stopped=true;}};this.voices.push(n);return n;}
}
function clock(){let id=0;const jobs=new Map();return {jobs,schedule:fn=>{jobs.set(++id,fn);return id;},cancel:id=>jobs.delete(id),deadline:fn=>{jobs.set(++id,fn);return id;},cancelDeadline:id=>jobs.delete(id)};}
const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('original game score has a full melodic phrase, two sections and articulated accompaniment',()=>{
 const {notes,beats}=adventureScore();assert.equal(beats,48);assert.equal(beats*ADVENTURE_BEAT_SECONDS,24);
 assert.equal(notes.filter(n=>n.part==='melody').length,68);assert(new Set(notes.filter(n=>n.part==='melody').map(n=>n.midi)).size>=9);
 assert.deepEqual(new Set(notes.map(n=>n.part)),new Set(['melody','pulse','harp']));
 assert(notes.every(n=>n.duration<=.82&&n.midi>=52&&n.midi<=81&&n.beat>=0&&n.beat+n.duration<=beats));
 let peak=0;for(let t=0;t<24;t+=.001){peak=Math.max(peak,notes.filter(n=>t>=n.beat*.5&&t<(n.beat+n.duration)*.5+.03).reduce((sum,n)=>sum+n.level,0));}assert(peak<=.41,`${peak}`);
 assert.notDeepEqual(notes.filter(n=>n.part==='melody'&&n.beat<24).map(n=>n.midi),notes.filter(n=>n.part==='melody'&&n.beat>=24).map(n=>n.midi));
});
test('construction and setting volume alone never start; ON respects zero and OFF disposes all voices',async()=>{
 const c=clock(),states=[],before=Audio.all.length,p=createAdventurePlayer({AudioContextCtor:Audio,...c,onState:(...s)=>states.push(s)});
 p.setVolume(40);assert.equal(Audio.all.length,before);p.setVolume(0);await p.start();const a=Audio.all.at(-1);
 assert(p.isPlaying());assert.equal(a.gains[0].gain.events.at(-1).v,0);assert(a.voices.length>=2);
 for(const v of [0,20,50,100]){p.setVolume(v);assert.equal(a.gains[0].gain.events.at(-1).v,v/100);}
 p.setVolume(1000);assert.equal(a.gains[0].gain.events.at(-1).v,1);
 p.stop();assert(!p.isActive());assert.equal(a.closed,1);assert(a.voices.every(v=>v.disconnected&&v.stopped));assert(a.gains.slice(1).every(g=>g.disconnected));assert.equal(c.jobs.size,0);assert.equal(states.at(-1)[0],false);
});
test('scheduler advances a full loop with finite envelopes and never replays a stalled backlog',async()=>{
 const c=clock(),p=createAdventurePlayer({AudioContextCtor:Audio,...c});await p.start();const a=Audio.all.at(-1),tick=[...c.jobs.values()][0];
 for(a.currentTime=.05;a.currentTime<25;a.currentTime+=.05)tick();assert(a.voices.length>adventureScore().notes.length);
 assert(a.voices.every(v=>v.stopTime>v.startTime&&v.stopTime-v.startTime<.45));assert(a.gains.slice(1).every(g=>g.gain.events[0].v===0&&g.gain.events.at(-1).v===0));
 const before=a.voices.length;a.currentTime=1000;tick();assert(a.voices.length-before<=3);assert(a.voices.slice(before).every(v=>v.startTime>=1000));
 p.stop();const count=a.voices.length;tick();assert.equal(a.voices.length,count);
});
test('late ON cancellation and rapid ON/OFF/ON cannot start or close a newer context',async()=>{
 const releases=[];class Deferred extends Audio{resume(){return new Promise(r=>releases.push(()=>{this.state='running';r();}));}}
 const c=clock(),p=createAdventurePlayer({AudioContextCtor:Deferred,...c});const first=p.start(),old=Audio.all.at(-1);await p.start();assert.equal(Audio.all.at(-1),old);
 p.stop();const second=p.start(),latest=Audio.all.at(-1);releases[1]();await second;releases[0]();await first;
 assert(p.isPlaying());assert.equal(old.voices.length,0);assert.equal(latest.closed,0);assert(latest.voices.length>0);p.stop();assert.equal(c.jobs.size,0);
});
test('canceling an unresolved permission wait settles the start immediately without a late voice',async()=>{
 const c=clock();class Never extends Audio{resume(){return new Promise(()=>{});}}const p=createAdventurePlayer({AudioContextCtor:Never,...c});const pending=p.start(),a=Audio.all.at(-1);p.stop();await pending;assert.equal(a.closed,1);assert.equal(a.voices.length,0);assert.equal(c.jobs.size,0);
});
test('blocked, interrupted and stalled audio produce OFF and require a new explicit action',async()=>{
 for(const state of ['suspended','interrupted','closed']){class Blocked extends Audio{async resume(){this.state=state;}}
  const c=clock(),states=[],p=createAdventurePlayer({AudioContextCtor:Blocked,...c,onState:(...s)=>states.push(s)});await p.start();assert(!p.isActive());assert(states.every(s=>!s[0]));assert.match(states.at(-1)[1],/開始できません/);assert.equal(c.jobs.size,0);
 }
 const c=clock(),states=[],p=createAdventurePlayer({AudioContextCtor:Audio,...c,onState:(...s)=>states.push(s)});await p.start();const a=Audio.all.at(-1);a.state='interrupted';a.onstatechange();assert(!p.isActive());assert.match(states.at(-1)[1],/中断/);assert.equal(c.jobs.size,0);
 let release;class Stalled extends Audio{resume(){return new Promise(r=>release=r);}}
 const sc=clock(),sp=createAdventurePlayer({AudioContextCtor:Stalled,...sc});const pending=sp.start(),old=Audio.all.at(-1);[...sc.jobs.values()][0]();await pending;release();await Promise.resolve();assert(!sp.isActive());assert.equal(old.voices.length,0);assert.equal(old.closed,1);
});
class Element {
 constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.listeners=new Map();this.attributes={};}
 append(...children){this.children.push(...children);}
 setAttribute(k,v){this.attributes[k]=v;}
 addEventListener(k,fn){const set=this.listeners.get(k)||new Set();set.add(fn);this.listeners.set(k,set);}
 removeEventListener(k,fn){this.listeners.get(k)?.delete(fn);}
 emit(k,detail={}){for(const fn of [...(this.listeners.get(k)||[])])fn({target:this,...detail});}
 remove(){this.removed=true;}
}
const flush=()=>new Promise(r=>setImmediate(r));
async function ui(run,{saved={brightness:125,volume:100,playing:true},storageBlocked=false}={}){
 const old=Object.fromEntries(['document','window','localStorage'].map(k=>[k,globalThis[k]]));const doc=new Element('document'),win=new Element('window');doc.hidden=false;doc.createElement=tag=>new Element(tag);
 const data=new Map([[ADVENTURE_PREFERENCE_KEY,JSON.stringify(saved)]]),writes=[];Object.assign(globalThis,{document:doc,window:win,localStorage:{getItem:k=>{if(storageBlocked)throw Error('blocked');return data.get(k)??null;},setItem:(k,v)=>{if(storageBlocked)throw Error('blocked');writes.push(k);data.set(k,v);}}});
 const container=new Element('div'),settingsContainer=new Element('div'),c=clock();let interactions=0;const bright=[];
 const settings=initAdventureAudio({container,settingsContainer,legacyBrightness:130,onBrightness:v=>bright.push(v),onAudioInput:()=>interactions++,playerFactory:opts=>createAdventurePlayer({...opts,AudioContextCtor:Audio,...c})});
 const [button,label,input,output,status]=container.children[0].children,section=settingsContainer.children[0],[modalButton,,modalInput,modalOutput,modalStatus]=section.children[1].children;
 try{await run({settings,doc,win,button,label,input,output,status,modalButton,modalInput,modalOutput,modalStatus,section,bright,data,writes,interactions:()=>interactions,c});}
 finally{settings.destroy();for(const [k,v]of Object.entries(old)){if(v===undefined)delete globalThis[k];else globalThis[k]=v;}}
}
test('game HUD and settings both expose matching native ON/OFF and 0–100 range controls at initial zero',async()=>{
 const before=Audio.all.length;await ui(async h=>{
  assert.equal(Audio.all.length,before);assert.deepEqual(h.settings.getPreferences(),{brightness:125,volume:0});assert.equal(h.button.attributes['aria-pressed'],'false');assert.equal(h.input.value,'0');assert.equal(h.input.min,'0');assert.equal(h.input.max,'100');assert.equal(h.input.step,'1');assert.equal(h.label.htmlFor,h.input.id);assert.equal(h.writes.length,0);
  h.input.value='30';h.input.emit('input');await flush();assert.equal(h.button.attributes['aria-pressed'],'true');assert.equal(h.modalButton.attributes['aria-pressed'],'true');assert.equal(h.modalInput.value,'30');assert.equal(h.modalOutput.textContent,'30%');assert.match(h.status.textContent,/灯りの散歩道/);
  const a=Audio.all.at(-1);assert.equal(a.gains[0].gain.events.at(-1).v,.3);h.modalInput.value='0';h.modalInput.emit('input');assert.equal(a.gains[0].gain.events.at(-1).v,0);assert.equal(h.input.value,'0');assert.match(h.status.textContent,/ミュート/);
  h.modalButton.emit('click');assert.equal(h.button.attributes['aria-pressed'],'false');assert.equal(a.closed,1);
  h.button.emit('click');await flush();assert.equal(h.input.value,'0');assert.equal(Audio.all.at(-1).gains[0].gain.events.at(-1).v,0);
  assert(h.interactions()>=4);
 });
});
test('background, pagehide and blur stop game BGM with no automatic return or modal-close restart',async()=>{
 await ui(async h=>{
  for(const event of ['visibilitychange','pagehide','blur']){
   h.input.value='20';h.input.emit('input');await flush();const a=Audio.all.at(-1);assert.equal(h.button.attributes['aria-pressed'],'true');
   if(event==='visibilitychange'){h.doc.hidden=true;h.doc.emit(event);h.doc.hidden=false;h.doc.emit(event);}else h.win.emit(event);
   assert.equal(h.button.attributes['aria-pressed'],'false');assert.equal(a.closed,1);const count=Audio.all.length;h.win.emit('focus');h.section.emit('close');assert.equal(Audio.all.length,count);
  }
  h.input.value='50';h.input.emit('input');await flush();h.win.emit('pagehide');const restoredCount=Audio.all.length;h.win.emit('pageshow',{persisted:true});assert.equal(h.input.value,'0');assert.equal(h.modalInput.value,'0');assert.equal(h.button.attributes['aria-pressed'],'false');assert.equal(Audio.all.length,restoredCount);
  h.doc.hidden=true;const count=Audio.all.length;h.input.value='50';h.input.emit('input');h.button.emit('click');await flush();assert.equal(Audio.all.length,count);
 });
});
test('brightness keeps existing namespace/range; failed storage is safe; no audio preference is restored',async()=>{
 await ui(async h=>{h.section.children[0].children[2].value='175';h.section.children[0].children[2].emit('input');assert.equal(h.bright.at(-1),175);assert.deepEqual(h.writes,[ADVENTURE_PREFERENCE_KEY]);assert.deepEqual(JSON.parse(h.data.get(ADVENTURE_PREFERENCE_KEY)),{brightness:175,volume:0});});
 await ui(async h=>{assert.equal(h.settings.getPreferences().volume,0);h.settings.setBrightness(0);assert.equal(h.bright.at(-1),75);h.settings.setBrightness(999);assert.equal(h.bright.at(-1),175);},{storageBlocked:true});
});
test('game wiring is independent of gallery audio, visible above the stage, and safe around dialogs/exits/check tone',()=>{
 const app=read('app.js'),html=read('index.html'),css=read('adventure-controls.css'),source=read('adventure-audio.js');
 assert(!app.includes('initVisitorPreferences'));assert(!source.includes('fetch('));assert(!source.includes('https://'));assert(html.includes('id="game-audio-controls"'));
 assert(app.includes("container:$('game-audio-controls'),settingsContainer:visitorSection"));assert(app.includes("onAudioInput:()=>soundCheck.stop('')"));assert(app.includes('visitorSettings.stopMusic();soundCheck.play'));
 assert(app.includes("clearInput();soundCheck.stop('');visitorSettings.stopMusic();save()"));assert(app.includes("panel.addEventListener('close',()=>{soundCheck.stop('')"));
 assert(css.includes('grid-template-rows:44px 44px'));assert(css.includes('#game-audio-controls{grid-area:2/1/3/3'));assert(css.includes('minmax(64px,1fr)'));
 for(const width of [320,360,390,400])assert(width-20-96-30-38-18>=64);
 assert(html.includes('./app.js?v=20261016-music1'));assert(html.includes('./adventure-controls.css?v=20261016-music1'));assert(html.includes('../safe-navigation.css?v=20261016-fate1'));
});
