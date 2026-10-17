#!/usr/bin/env node
/** Native Canvas review, never a browser or GPU capture.
 * node render-rig-proof.mjs --runtime /abs/owner-rig.mjs --manifest /abs/manifest.json
 *   --atlas /abs/atlas.png --output /abs/evidence/owner-rig
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import {createRigReviewSizeFrames,RIG_REVIEW_FPS,RIG_REVIEW_HEIGHTS} from '../rig-review-sequence.js';
import {drawRigReviewScene} from '../rig-review-draw.js';

const args=new Map();for(let i=2;i<process.argv.length;i+=2)args.set(process.argv[i],process.argv[i+1]);
for(const key of['--runtime','--manifest','--output'])if(!args.get(key)||!path.isAbsolute(args.get(key)))throw Error('Pass an absolute '+key+' path');
if(args.has('--atlas')&&!path.isAbsolute(args.get('--atlas')))throw Error('Pass an absolute --atlas path');
const runtimePath=args.get('--runtime'),manifestPath=args.get('--manifest'),atlasPath=args.get('--atlas'),out=args.get('--output'),prefix=args.get('--prefix')||'owner-rig';
if(!/^[a-z0-9-]+$/.test(prefix))throw Error('Use a simple filename prefix');
const {createOwnerRig,drawOwnerPose}=await import(pathToFileURL(runtimePath));
const require=createRequire(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'package.json'));
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));
const atlasPaths=atlasPath?{[manifest.atlas||'down']:atlasPath}:Object.fromEntries(Object.entries(manifest.atlases||{}).map(([key,value])=>[key,path.resolve(path.dirname(manifestPath),value)]));
if(!Object.keys(atlasPaths).length)throw Error('Pass --atlas or a manifest containing atlas files');
const atlas=Object.fromEntries(await Promise.all(Object.entries(atlasPaths).map(async([key,file])=>[key,await loadImage(file)])));
const frames=createRigReviewSizeFrames(createOwnerRig,{manifest});await fs.mkdir(out,{recursive:true});
const width=1100,height=340,canvas=createCanvas(width,height),context=canvas.getContext('2d');
const record={method:'Real rig runtime and authored atlas rendered by native @napi-rs/canvas. Independent 76/86px simulations use worldPixelsPerUnit=64 and groundDepthScale=.78. Deterministic review inputs; not browser gameplay, DOM, GPU, device or audio verification.',manifest:manifest.id,fps:RIG_REVIEW_FPS,frames:frames.length,heights:RIG_REVIEW_HEIGHTS,manifestContentHeight:manifest.contentHeight,authoredDirections:manifest.directions||Object.keys(manifest.views||{}),continuousTurnComplete:manifest.continuousTurnComplete===true,attackArtComplete:manifest.attackArtComplete===true,maxContinuousSupportDrift:0,maxFootReach:0,noSupportFrames:[],liveCanvasClippingFrames:[],alphaBounds:[],sources:{}};
const output=manifest.output||{},liveWidth=output.width||256,liveHeight=output.height||320,padding=64,live=createCanvas(liveWidth+padding*2,liveHeight+padding*2),lc=live.getContext('2d');
function clipsLiveCanvas(pose){
  lc.clearRect(0,0,live.width,live.height);drawOwnerPose(lc,atlas,manifest,pose,{x:padding+liveWidth*(output.anchorX??.5),y:padding+liveHeight*(output.anchorY??.94),scale:output.scale||1});
  const pixels=lc.getImageData(0,0,live.width,live.height).data;
  for(let y=0;y<live.height;y++)for(let x=0;x<live.width;x++)if((x<padding||x>=padding+liveWidth||y<padding||y>=padding+liveHeight)&&pixels[(y*live.width+x)*4+3]>24)return true;
  return false;
}
for(const[file,key]of[[runtimePath,'runtime'],[manifestPath,'manifest'],...Object.entries(atlasPaths).map(([key,file])=>[file,'atlas-'+key])])record.sources[key]={file:path.basename(file),sha256:createHash('sha256').update(await fs.readFile(file)).digest('hex')};
for(let i=0;i<frames.length;i++){
 for(const size of RIG_REVIEW_HEIGHTS){const pose=frames[i].poses[size];record.maxFootReach=Math.max(record.maxFootReach,pose.diagnostics.leftFootReach,pose.diagnostics.rightFootReach);
  if(!pose.feet.left.contact&&!pose.feet.right.contact)record.noSupportFrames.push({time:frames[i].time,height:size,modes:[pose.feet.left.mode,pose.feet.right.mode],action:pose.action.stage});
  if(clipsLiveCanvas(pose))record.liveCanvasClippingFrames.push({time:frames[i].time,height:size,view:pose.view});
  if(i)for(const side of['left','right']){const a=frames[i-1].poses[size].feet[side],b=pose.feet[side];if(a.contact&&b.contact&&a.mode==='stance'&&b.mode==='stance')record.maxContinuousSupportDrift=Math.max(record.maxContinuousSupportDrift,Math.hypot(a.world.x-b.world.x,a.world.z-b.world.z));}
 }
}
function alphaBounds(frame,size){
  const cv=createCanvas(180,200),c=cv.getContext('2d');drawOwnerPose(c,atlas,manifest,frame.poses[size],{x:90,y:170,scale:size/manifest.contentHeight});
  const pixels=c.getImageData(0,0,180,200).data;let left=180,right=-1,top=200,bottom=-1;
  for(let y=0;y<200;y++)for(let x=0;x<180;x++)if(pixels[(y*180+x)*4+3]>24){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  return{time:frame.time,targetHeight:size,rect:right>=left?[left,top,right-left+1,bottom-top+1]:null,soleOffset:bottom-170};
}
const selectedTimes=[0,.9,1.2,1.5,2,2.5,3.6,3.75,4.6,5.1,5.8,6.8,7.2,7.6,8.1,8.6,9.8];
const contactHeight=270,contact=createCanvas(1100,Math.ceil(selectedTimes.length/3)*contactHeight),cc=contact.getContext('2d');cc.fillStyle='#16232c';cc.fillRect(0,0,contact.width,contact.height);
for(let n=0;n<selectedTimes.length;n++){
  const index=Math.min(frames.length-1,Math.round(selectedTimes[n]*RIG_REVIEW_FPS)),frame=frames[index],tile=createCanvas(360,contactHeight);
  drawRigReviewScene(tile.getContext('2d'),{width:360,height:contactHeight,frame,manifest,atlas,drawOwnerPose});
  cc.drawImage(tile,6+(n%3)*366,Math.floor(n/3)*contactHeight);for(const size of[76,86])record.alphaBounds.push(alphaBounds(frame,size));
}
await fs.writeFile(path.join(out,prefix+'-contact-sheet.png'),contact.toBuffer('image/png'));
const video=path.join(out,prefix+'-native-review.mp4');
const encoder=spawn('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgba','-s',width+'x'+height,'-r',String(RIG_REVIEW_FPS),'-i','pipe:0','-an','-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',video],{stdio:['pipe','ignore','pipe']});
let encoderErrors='';encoder.stderr.on('data',data=>encoderErrors+=String(data));const encoderClosed=once(encoder,'close');
for(const frame of frames){drawRigReviewScene(context,{width,height,frame,manifest,atlas,drawOwnerPose});if(!encoder.stdin.write(canvas.data()))await once(encoder.stdin,'drain');}
encoder.stdin.end();const[exitCode]=await encoderClosed;if(exitCode!==0)throw Error('ffmpeg failed: '+encoderErrors);
const gif=spawn('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',video,'-filter_complex','[0:v]fps=15,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=3','-loop','0',path.join(out,prefix+'-native-review.gif')],{stdio:['ignore','ignore','pipe']});
let gifErrors='';gif.stderr.on('data',data=>gifErrors+=String(data));const[gifCode]=await once(gif,'close');if(gifCode!==0)throw Error('GIF encoding failed: '+gifErrors);
record.gifFPS=15;await fs.writeFile(path.join(out,'native-review-method.json'),JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({output:out,frames:frames.length,maxContinuousSupportDrift:record.maxContinuousSupportDrift,maxFootReach:record.maxFootReach,limitation:record.method}));
