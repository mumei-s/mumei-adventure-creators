// A short, explicitly requested speaker check. Never runs during loading/navigation.
export function createSoundCheck({AudioContextCtor,onState=()=>{},schedule=setTimeout,cancel=clearTimeout}={}){
 let context=null,timer=null,resumeTimer=null,cancelStart=null,version=0;
 function stop(message='音の確認を終了しました。'){
  version++;if(cancelStart){cancelStart();cancelStart=null;}if(resumeTimer!==null)cancel(resumeTimer);resumeTimer=null;if(timer!==null)cancel(timer);timer=null;const old=context;context=null;
  if(old){old.onstatechange=null;try{old.close()?.catch?.(()=>{});}catch{}}
  onState(false,message);
 }
 async function play(volume=0){
  stop('');const token=version;
  if(!(volume>0)){onState(false,'音量が0%です。音量を上げてからお試しください。');return;}
  const Ctor=AudioContextCtor||globalThis.AudioContext||globalThis.webkitAudioContext;
  if(!Ctor){onState(false,'このブラウザでは音を再生できません。');return;}
  try{
   const audio=new Ctor();context=audio;onState(false,'確認音を準備しています…');
   // Start within this explicit gesture before constructing its cancellation
   // promise; a synchronous device error must not leave a detached rejection.
   const resumed=audio.resume();
   const resumeDeadline=new Promise((_,reject)=>{cancelStart=()=>reject(Error('Audio start cancelled'));resumeTimer=schedule(()=>{resumeTimer=null;reject(Error('Audio resume timed out'));},5000);});
   await Promise.race([resumed,resumeDeadline]);
   if(token===version&&resumeTimer!==null){cancel(resumeTimer);resumeTimer=null;}
   if(token!==version)return;
   cancelStart=null;
   if(audio.state!=='running')throw Error('Audio not running');
   audio.onstatechange=()=>{if(context===audio&&audio.state!=='running')stop('音が中断されました。もう一度お試しください。');};
   const level=Math.min(100,volume)/100*.2;
   [523.25,659.25,783.99].forEach((frequency,index)=>{
    const tone=audio.createOscillator(),gain=audio.createGain(),start=audio.currentTime+index*.3;
    tone.type='triangle';tone.frequency.value=frequency;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(level,start+.025);gain.gain.linearRampToValueAtTime(0,start+.27);
    tone.connect(gain);gain.connect(audio.destination);tone.start(start);tone.stop(start+.29);
   });
   onState(true,'確認音を再生中です。聞こえない場合は端末のメディア音量・消音・Bluetooth出力先を確認してください。');
   timer=schedule(()=>stop('確認音が終了しました。音楽は「音楽をON」で再生できます。'),1100);
  }catch{if(token===version)stop('音を開始できませんでした。もう一度お試しください。');}
 }
 return {play,stop};
}
