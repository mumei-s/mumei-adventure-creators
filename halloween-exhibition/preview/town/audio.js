import {createAdventurePlayer} from '../maze/adventure-audio.js?v=20261016-ios1';
const volumeValue=value=>Number.isFinite(Number(value))?Math.max(0,Math.min(100,Math.round(Number(value)))):0;
/** A separate town player. No settings from the exhibition or labyrinth are read. */
export function createTownAudio({playerFactory=createAdventurePlayer,onChange=()=>{}}={}){
 let volume=0,enabled=false,revision=0,message='音楽はOFFです。音量を決めてからONにできます。';
 const player=playerFactory({onState(playing,reason,pending=false){if(!playing&&!pending&&enabled){enabled=false;revision++;message=reason||'音楽を停止しました。再開はONを押してください。';publish();}}});
 const snapshot=()=>({volume,enabled,message});
 function publish(){onChange(snapshot());}
 function setVolume(value){volume=volumeValue(value);player.setVolume(volume);if(volume===0){enabled=false;revision++;player.stop();message='音量0・音楽OFFです。';}publish();return snapshot();}
 async function start({gesture=false}={}){
  if(!gesture)return false;
  if(volume===0){message='音量を上げてから「音楽をON」を押してください。';publish();return false;}
  const token=++revision;enabled=true;message='音楽を準備しています…';publish();
  try{await player.start();if(token!==revision)return false;enabled=player.isPlaying();message=enabled?'城下町の音楽：ON':'音楽を開始できませんでした。もう一度ONを押せます。';publish();return enabled;}
  catch{if(token===revision){enabled=false;player.stop();message='音楽を開始できませんでした。もう一度ONを押せます。';publish();}return false;}
 }
 function stop({resetVolume=false}={}){revision++;enabled=false;player.stop();if(resetVolume){volume=0;player.setVolume(0);}message=resetVolume?'音楽はOFF・音量0に戻りました。':'音楽を停止しました。';publish();}
 publish();return {snapshot,setVolume,start,stop,resumeFromGesture(){if(enabled&&volume>0)player.resumeFromGesture?.();},destroy(){stop({resetVolume:true});}};
}
