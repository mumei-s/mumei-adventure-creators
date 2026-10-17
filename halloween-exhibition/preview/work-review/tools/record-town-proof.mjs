import {fs,path,fileURLToPath,previewRoot as root,outputRoot,createCanvas,loadImage,fontName,localJSON} from './town-proof-environment.mjs';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
const {createTownRenderer}=await import(root+'/town/renderer.js');
const {createTownSession}=await import(root+'/town/controller.js');
const {isTownWalkable}=await import(root+'/town/story-data.js');
const {createTownCharacterArt}=await import(root+'/town/character-art.js');
const {createCharacterAssets}=await import(root+'/maze/creator-runtime.js');
const assets=createCharacterAssets({loadImage:async input=>{const im=await loadImage(fileURLToPath(input));if(Math.max(im.width,im.height)<=1024)return im;const s=1024/Math.max(im.width,im.height),cv=createCanvas(Math.round(im.width*s),Math.round(im.height*s));cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height);return cv;}});
const characters=createTownCharacterArt({fetcher:localJSON,assets});
const renderer=createTownRenderer({makeCanvas:createCanvas,art:characters.art,loadImage:src=>loadImage(fileURLToPath(src)),fetcher:async url=>({ok:true,json:()=>localJSON(url)})});
await Promise.all([renderer.ready,characters.ready]);
const ratio=Math.max(1,Math.min(2,Number(process.env.TOWN_PROOF_DPR)||2));
const session=createTownSession({store:{save:()=>({ok:true})}}),cv=createCanvas(390*ratio,600*ratio),c=cv.getContext('2d'),fps=30,frames=540;
const output=path.join(outputRoot,'native-town-validation.mp4'),temporary=path.join(outputRoot,'.native-town-validation.tmp.mp4');
const encoder=spawn(process.env.TOWN_FFMPEG||'ffmpeg',['-y','-hide_banner','-loglevel','error','-f','image2pipe','-vcodec','png','-framerate',String(fps),'-i','pipe:0','-c:v','libx264','-preset','fast','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart',temporary]);
let stderr='';encoder.stderr.on('data',data=>stderr+=data);const completed=once(encoder,'close');
let destination=0,dialogue=null,dialogueUntil=0,firstTalk=false,secondTalk=false;
const waypoints=[{x:32.5,z:8.5},{x:29.5,z:8.5},{x:29.5,z:13.5},{x:21.5,z:13.5},{x:21.5,z:14.5}];
let maxVisitors=0;
for(let frame=0;frame<frames;frame++){
 const t=frame/fps,now=session.snapshot();let x=0,z=0;
 if(!dialogue){
   const goal=waypoints[destination];if(goal){const dx=goal.x-now.state.position.x,dz=goal.z-now.state.position.z,dist=Math.hypot(dx,dz);if(dist<.12){destination++;session.stop();}else{x=dx/dist;z=dz/dist;}}
   if(destination===2&&!firstTalk){const result=session.interact('keeper');dialogue=result?.dialogue;dialogueUntil=t+2.6;firstTalk=true;}
   if(destination===waypoints.length&&!secondTalk){const result=session.interact('masked');dialogue=result?.dialogue;dialogueUntil=t+3;secondTalk=true;}
 }else if(t>=dialogueUntil){if(firstTalk&&destination===2)session.interact('keeper','accept');dialogue=null;}
 const s=session.tick(1/fps,{x,z,paused:!!dialogue,speed:3.05});
 let visitors=characters.visitorActors({state:s.state,time:s.time,motion:true});if(frame%15===0){await new Promise(resolve=>setTimeout(resolve,0));visitors=characters.visitorActors({state:s.state,time:s.time,motion:true});}
 maxVisitors=Math.max(maxVisitors,visitors.length);
 const companions=characters.companionActors({state:s.state,walking:s.walking,canStand:p=>isTownWalkable(s.state.mapId,p.x,p.z)});
 renderer.render({canvas:cv,state:s.state,time:s.time,dt:1/fps,motion:true,pixelRatio:ratio,walking:s.walking,walkPhase:s.walkPhase,facing:s.state.facing,brightness:75,lantern:true,creatorActors:[...companions,...visitors]});
 c.setTransform(ratio,0,0,ratio,0,0);c.font='600 11px "Yu Gothic"';c.textBaseline='top';c.textAlign='left';c.fillStyle='#102434de';c.fillRect(7,8,376,28);c.fillStyle='#e5cf9f';c.fillText('Canvas 描画検証｜実ゲームの移動・会話データ',15,16);
 if(dialogue){c.fillStyle='#142333ee';c.beginPath();c.roundRect(10,414,370,171,12);c.fill();c.strokeStyle='#c2a36b';c.stroke();c.fillStyle='#ead6aa';c.font='600 15px "Yu Gothic"';c.fillText(dialogue.title,24,428);c.font='13px "Yu Gothic"';c.fillStyle='#f0e6d0';let line='',row=0;for(const char of dialogue.text){if(c.measureText(line+char).width>340){c.fillText(line,24,455+row*22);line='';row++;}line+=char;if(row>=4)break;}if(row<5)c.fillText(line,24,455+row*22);}
 if(!encoder.stdin.write(cv.toBuffer('image/png')))await once(encoder.stdin,'drain');
}
encoder.stdin.end();const [code]=await completed;if(code!==0)throw Error(stderr);
const probe=spawn(process.env.TOWN_FFPROBE||'ffprobe',['-v','error','-count_frames','-select_streams','v:0','-show_entries','stream=width,height,nb_read_frames,avg_frame_rate','-show_entries','format=duration','-of','json',temporary]);
let probeText='';probe.stdout.on('data',data=>probeText+=data);const[probeCode]=await once(probe,'close');if(probeCode!==0)throw Error('Encoded video verification failed.');
const verified=JSON.parse(probeText),stream=verified.streams?.[0];if(Number(stream?.nb_read_frames)!==frames||Math.abs(Number(verified.format?.duration)-frames/fps)>.05||stream.width!==cv.width||stream.height!==cv.height)throw Error('Encoded video is incomplete.');
await fs.rename(temporary,output);
const measurement={file:path.basename(output),method:'Native Canvas capture of the actual town renderer/controller/character distance loading. The conversation panel is an evidence overlay of actual story text, not a DOM recording.',font:fontName,frames,fps,seconds:frames/fps,cssViewport:{width:390,height:600},pixelRatio:ratio,encoded:verified,maxVisitors,scene:renderer.status(),characters:characters.status(),final:session.snapshot().state.position,firstTalk,secondTalk,limitations:['Not a browser/DOM/input/audio test or a phone frame-rate measurement.','No new full-body walk/turn frames were generated for the ten fictional residents.','Adopted character sprite animation limitations remain.']};
await fs.writeFile(path.join(outputRoot,'record-method.json'),JSON.stringify(measurement,null,2)+'\n');console.log(JSON.stringify(measurement));characters.destroy();renderer.destroy();
