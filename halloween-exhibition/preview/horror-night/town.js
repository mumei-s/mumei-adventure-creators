import {initialTownState,moveTown,getTownMap,isTownWalkable,recoverTownPosition} from '../town/town-model.js?v=20261019-homes2';
import {createTownCharacterArt} from '../town/character-art.js?v=20261019-homes2';
import {createStoryCast} from './cast-art.js?v=20261031-startup-1';
import {STAGES,findPath,reached,distance} from './model.js';
const deadline=(promise,ms)=>new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('The town took too long to load')),ms);Promise.resolve(promise).then(v=>{clearTimeout(t);resolve(v);},e=>{clearTimeout(t);reject(e);});});
/** Separate controller: no main-game store, preference writes, battle or quests. */
export async function createStoryTown({canvas3d,canvas2d,root,onNear=()=>{},onProgress=()=>{},onPosition=()=>{},onNotice=()=>{},onView=()=>{},onMarker=()=>{},onCastStatus=()=>{},view='3d',muted=true}){
 const abort=new AbortController(),reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let disposed=false,active=false,frameId=0,lastTime=0,time=0,walkPhase=0,saveTime=0,viewBusy=false;
 let state=initialTownState(),stage=STAGES[0],index=0,draw3d=null,draw2d=null,mode=view,near=false,lastDistance=-1;
 let dx=0,dz=0,vx=0,vz=0,path=[],auto=false,lastPosition={...state.position},stuck=0;
 const map=getTownMap('lantern-town'),originalNPCs=map.npcs;
 const characterArt=createTownCharacterArt({signal:abort.signal,deferEnhancements:true,initialState:{...state,position:STAGES[0].spawn}});
 let audioContext=null,oscillator=null,gain=null,storyCast=null,castRevealed=false;
 const ghost=makeVisitor();
 try{await deadline(characterArt.ready,26000);storyCast=createStoryCast(characterArt.visitors(),{signal:abort.signal,onChange:status=>{if(disposed)return;onCastStatus(status);if(draw2d||draw3d)render(0,false);}});void storyCast.ready.catch(()=>{if(!disposed)onNotice('一部の参加者の姿を読み込めませんでした。本文はそのまま読めます。');});await selectView(mode);}catch(error){dispose();throw error;}
 function sound(){
  if(muted||!active){if(gain&&audioContext)gain.gain.setTargetAtTime(0,audioContext.currentTime,.2);return;}
  try{if(!audioContext){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;audioContext=new AC();gain=audioContext.createGain();gain.gain.value=0;gain.connect(audioContext.destination);oscillator=audioContext.createOscillator();oscillator.type='sine';oscillator.frequency.value=58;oscillator.connect(gain);oscillator.start();}void audioContext.resume();oscillator.frequency.setTargetAtTime(index===0?73:index===1?55:49,audioContext.currentTime,.6);gain.gain.setTargetAtTime(.012,audioContext.currentTime,.8);}catch{}
 }
 async function selectView(wanted){
  if(disposed)return;
  if(wanted==='3d'){
   try{if(!draw3d){const m=await import('../town/world-3d.js?v=20261019-homes2');if(disposed)return;draw3d=m.createTownWorld3D({canvas:canvas3d,art:characterArt.art,onContextLost(){pause();onNotice('立体表示が中断されました。見下ろし表示に切り替えます。');void selectView('2d').then(resume);}});await deadline(draw3d.ready,22000);}mode='3d';}
   catch(error){draw3d?.destroy();draw3d=null;mode='2d';onNotice('この端末では見下ろし表示で続けます。');}
  }else mode='2d';
  if(mode==='2d'&&!draw2d){const m=await import('../town/renderer.js?v=20261030-sprite1');if(disposed)return;draw2d=m.createTownRenderer({art:characterArt.art,deferAssets:false});void draw2d.ready.catch(()=>{});}
  canvas3d.hidden=mode!=='3d';canvas2d.hidden=mode!=='2d';resize();onView(mode);
 }
 function resize(){if(disposed)return;const ratio=Math.min(2,window.devicePixelRatio||1),r=root.getBoundingClientRect();if(r.width<1||r.height<1)return;if(mode==='2d'){const w=Math.round(r.width*ratio),h=Math.round(r.height*ratio);if(canvas2d.width!==w||canvas2d.height!==h){canvas2d.width=w;canvas2d.height=h;draw2d?.invalidate();}}}
 function actors(dt,walking){
  const info={state,time,motion:!reduce,dt,view3D:mode==='3d',cameraYaw:0,clock:time};
  let people=index===1&&!castRevealed?[]:storyCast?.actors()||[];
  const companions=index===0?characterArt.companionActors({...info,walking,canStand:p=>isTownWalkable(map,p.x,p.z)}):[];
  if(index===0)people.push({id:'uninvited-guest',x:26.2,z:21.9,heightPx:93,interactive:false,sprite:ghost.sprite(time,reduce)});
  if(index===1&&distance(state.position,stage.goal)>4)people.push({id:'following-guest',x:state.position.x-.65,z:state.position.z+5.2,heightPx:96,interactive:false,sprite:ghost.sprite(time,reduce)});
  if(index===1&&castRevealed||index===2){const im=characterArt.art.images.playerAtlas,layout=characterArt.art.playerLayout;if(im&&layout){/* use the exact approved owner atlas, not a replacement face */
   const sprite=ownerSprite(im,layout,time);if(sprite)people.push({id:'false-host',x:stage.goal.x+1.4,z:stage.goal.z-.6,heightPx:76,interactive:false,sprite});
  }}
  return [...people,...companions];
 }
 function ownerSprite(image,layout,t){
  // The renderer exposes the same atlas layout to its playerPose helper.
  return ownerPose?.(characterArt.art,'down',false,0)||null;
 }
 let ownerPose=null;try{const r=await import('../maze/rpg-art.js?v=20261019-unified1');ownerPose=r.playerPose;}catch{}
 function render(dt,walking){
  const ratio=Math.min(2,window.devicePixelRatio||1),renderer=mode==='3d'?draw3d:draw2d;
  if(!renderer||disposed)return;
  const packet={state,time,dt,motion:!reduce,pixelRatio:ratio,walking,walkPhase,facing:state.facing,brightness:stage.brightness,lantern:true,cameraDistance:'normal',cameraZoom:1,cameraOffsetY:0,creatorActors:actors(dt,walking)};
  if(mode==='2d')packet.canvas=canvas2d;
  renderer.render(packet);
  const p=renderer.worldToScreen?.(stage.goal.x,stage.goal.z),r=root.getBoundingClientRect();
  if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y))onMarker({x:Math.max(45,Math.min(r.width-45,p.x)),y:Math.max(52,Math.min(r.height-24,p.y-10))});else onMarker(null);
 }
 function tick(now){
  if(!active||disposed)return;const dt=Math.min(.05,Math.max(0,(now-lastTime)/1000||.016));lastTime=now;time+=dt;
  let x=dx,z=dz;if(auto){while(path.length&&distance(state.position,path[0])<.18)path.shift();if(path.length){const p=path[0],d=distance(state.position,p);x=(p.x-state.position.x)/Math.max(.001,d);z=(p.z-state.position.z)/Math.max(.001,d);}else{auto=false;x=0;z=0;}}
  const n=Math.hypot(x,z);if(n>1){x/=n;z/=n;}const smoothing=1-Math.exp(-13*dt);vx+=(x*3.5-vx)*smoothing;vz+=(z*3.5-vz)*smoothing;
  const before=state.position;state=moveTown(state,vx*dt,vz*dt);const travelled=distance(before,state.position),walking=travelled>.0001;walkPhase+=travelled/1.15;
  if(auto&&!walking){stuck+=dt;if(stuck>1.5){auto=false;path=[];stop();onNotice('道順が見つかりません。方向ボタンで進むか、下の「歩かずに場面を見る」を使えます。');}}else stuck=0;
  const d=distance(state.position,stage.goal),at=reached(state.position,stage.goal);if(at!==near){near=at;onNear(near);if(near&&auto){auto=false;path=[];stop();}}
  if(Math.ceil(d)!==lastDistance){lastDistance=Math.ceil(d);onProgress(d);}
  saveTime+=dt;if(saveTime>1){saveTime=0;onPosition({...state.position});}
  try{render(dt,walking);}catch(error){pause();onNotice('表示を続けられません。「本文へ」または「歩かずに場面を見る」から続けられます。');console.error(error);return;}
  lastPosition={...state.position};frameId=requestAnimationFrame(tick);
 }
 async function enter(chapter,position){pause();index=Math.max(0,Math.min(2,chapter));castRevealed=false;stage=STAGES[index];map.npcs=[];storyCast.enter(stage,(x,z)=>isTownWalkable(map,x,z));state={...initialTownState(),position:recoverTownPosition(map,position||stage.spawn),facing:'up',flags:{lamps:index===0?['lamp-market','lamp-plaza','lamp-garden']:[],stamps:[],gearNotes:[]}};near=false;lastDistance=-1;time=0;walkPhase=0;saveTime=0;onNear(false);draw2d?.invalidate();draw3d?.invalidate();resize();resume();}
 function stop(){dx=0;dz=0;vx=0;vz=0;auto=false;path=[];stuck=0;}
 function pause(){active=false;stop();cancelAnimationFrame(frameId);sound();}
 function resume(){if(disposed||document.hidden)return;active=true;lastTime=performance.now();cancelAnimationFrame(frameId);sound();frameId=requestAnimationFrame(tick);}
 function toggleAuto(){if(auto){stop();return false;}path=findPath(state.position,stage.goal,(x,z)=>isTownWalkable(map,x,z),map.width,map.height);if(!path.length){onNotice(near?'到着しています。調べるボタンを押してください。':'道順を見つけられません。方向ボタンか「歩かずに場面を見る」で進めます。');return false;}auto=true;dx=0;dz=0;return true;}
 async function switchView(){if(viewBusy||disposed)return;viewBusy=true;const running=active;pause();try{await selectView(mode==='3d'?'2d':'3d');}finally{viewBusy=false;if(running)resume();}}
 function capture(){try{render(0,false);return (mode==='3d'?canvas3d:canvas2d).toDataURL('image/jpeg',.84);}catch{return null;}}
 function dispose(){disposed=true;active=false;cancelAnimationFrame(frameId);abort.abort();map.npcs=originalNPCs;characterArt.destroy();storyCast?.destroy();draw2d?.destroy();draw3d?.destroy();oscillator?.stop();void audioContext?.close();}
 return {enter,pause,resume,resize,stop,revealCast(){castRevealed=true;render(0,false);},direction(x,z){auto=false;path=[];dx=x;dz=z;},toggleAuto,switchView,capture,setMuted(value){muted=!!value;sound();},destroy:dispose};
}
/** A purpose-built in-world silhouette; the separate reveal uses the approved illustration. */
function makeVisitor(){
 const canvas=document.createElement('canvas');canvas.width=192;canvas.height=384;const c=canvas.getContext('2d');let frame=-1;
 const sprite={image:canvas,frame:[0,0,192,384],anchorX:.5,anchorY:.97,contentHeight:355,poseVersion:0};
 return {sprite(time,reduced){const next=reduced?0:Math.floor(time*9);if(next===frame)return sprite;frame=next;c.clearRect(0,0,192,384);const t=reduced?0:time,lean=Math.sin(t*.45)*3;
 c.save();c.translate(96+lean,0);const coat=c.createLinearGradient(-60,80,60,360);coat.addColorStop(0,'#111017');coat.addColorStop(.5,'#27202a');coat.addColorStop(1,'#08090f');
 c.fillStyle='#0a090e';c.beginPath();c.ellipse(0,83,42,62,.1,0,Math.PI*2);c.fill();c.fillStyle=coat;c.beginPath();c.moveTo(-30,117);c.bezierCurveTo(-55,148,-48,260,-68,356);c.lineTo(-32,347);c.lineTo(-12,365);c.lineTo(4,351);c.lineTo(26,367);c.lineTo(61,350);c.bezierCurveTo(46,260,60,155,30,117);c.closePath();c.fill();
 c.strokeStyle='#443640';c.lineWidth=1.4;for(const x of[-28,-12,14,31]){c.beginPath();c.moveTo(x*.7,155);c.quadraticCurveTo(x+Math.sin(t)*2,244,x*1.5,346);c.stroke();}
 const mask=c.createRadialGradient(-9,65,5,1,85,62);mask.addColorStop(0,'#dcd9cd');mask.addColorStop(.65,'#aaa8a6');mask.addColorStop(1,'#45414a');c.save();c.translate(0,82);c.rotate(.13+Math.sin(t*.33)*.03);c.fillStyle=mask;c.beginPath();c.ellipse(0,0,29,45,0,0,Math.PI*2);c.fill();c.strokeStyle='#612d32';c.lineWidth=2;c.beginPath();c.moveTo(-18,20);c.quadraticCurveTo(2,32,21,17);c.stroke();c.strokeStyle='#55505a';c.lineWidth=1;c.beginPath();c.moveTo(9,-37);c.lineTo(7,-15);c.lineTo(14,0);c.lineTo(11,14);c.stroke();c.restore();
 for(const s of[-1,1]){const sway=Math.sin(t*.5+s)*4;c.strokeStyle='#1b1720';c.lineWidth=15;c.lineCap='round';c.beginPath();c.moveTo(s*34,140);c.quadraticCurveTo(s*(57+sway),190,s*(58+sway),241);c.stroke();c.strokeStyle='#9e9894';c.lineWidth=3;for(let f=0;f<4;f++){c.beginPath();c.moveTo(s*(57+sway)+f*3-5,240);c.quadraticCurveTo(s*(66+sway)+f*3-5,258,s*(59+sway)+f*3-5,274-f*3);c.stroke();}}
 c.restore();sprite.poseVersion=next;return sprite;}};
}

