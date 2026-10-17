import test from 'node:test';
import assert from 'node:assert/strict';
import {createTownAudio} from '../audio.js';
function harness(){let active=false,starts=0,stops=0,volume=0,release;const audio=createTownAudio({playerFactory:()=>({start(){starts++;active=true;return new Promise(resolve=>release=resolve);},stop(){stops++;active=false;},setVolume:value=>volume=value,isPlaying:()=>active})});return {audio,starts:()=>starts,stops:()=>stops,volume:()=>volume,release:()=>release?.()};}
test('town music always begins OFF/0 and gain changes alone never play',async()=>{const h=harness();assert.equal(h.audio.snapshot().volume,0);assert.equal(h.audio.snapshot().enabled,false);h.audio.setVolume(50);assert.equal(h.starts(),0);assert.equal(await h.audio.start(),false);assert.equal(h.starts(),0);const pending=h.audio.start({gesture:true});assert.equal(h.starts(),1);h.release();assert.equal(await pending,true);h.audio.stop({resetVolume:true});assert.equal(h.audio.snapshot().volume,0);assert.equal(h.audio.snapshot().enabled,false);});
test('mute/cancel during pending start cannot revive playback after late success',async()=>{const h=harness();h.audio.setVolume(30);const pending=h.audio.start({gesture:true});h.audio.stop({resetVolume:true});h.release();assert.equal(await pending,false);assert.equal(h.audio.snapshot().enabled,false);assert.equal(h.audio.snapshot().volume,0);assert.equal(h.volume(),0);h.audio.setVolume(40);assert.equal(h.starts(),1);});

test('the underlying player pending-state callback does not cancel an explicitly requested start',async()=>{
 let active=false,release;const audio=createTownAudio({playerFactory:({onState})=>({setVolume(){},stop(){active=false;},isPlaying:()=>active,start(){onState(false,'BGMを準備しています',true);return new Promise(resolve=>{release=()=>{active=true;onState(true);resolve();};});}})});
 audio.setVolume(35);const pending=audio.start({gesture:true});assert.equal(audio.snapshot().enabled,true);release();assert.equal(await pending,true);assert.equal(audio.snapshot().enabled,true);audio.stop();assert.equal(audio.snapshot().enabled,false);
});
