import {createOwnerRig,drawOwnerPose} from '../maze/owner-rig.js?v=20261017-rig1';
import {createRigReviewSizeFrames,RIG_REVIEW_FPS,RIG_REVIEW_SECONDS} from './rig-review-sequence.js';
import {drawRigReviewScene} from './rig-review-draw.js';

const $=id=>document.getElementById(id),canvas=$('rig-canvas'),context=canvas.getContext('2d');
const mazeURL=new URL('../maze/',import.meta.url),registryURL=new URL('data/character-rigs.json',mazeURL);
let frames=[],manifest=null,atlas=null,index=0,playing=false,handle=null,last=null,time=0;
function localURL(input,base){const url=new URL(input,base);if(url.origin!==mazeURL.origin||!url.pathname.startsWith(mazeURL.pathname))throw Error('Review artwork must remain inside the game');return url;}
async function readJSON(url){const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),10000);try{const response=await fetch(url,{cache:'no-store',signal:abort.signal});if(!response.ok)throw Error('Review data unavailable');return await response.json();}finally{clearTimeout(timer);}}
function loadImage(url){return new Promise((resolve,reject)=>{const image=new Image();const timer=setTimeout(()=>finish(Error('Review image timeout')),12000);let settled=false;function finish(error){if(settled)return;settled=true;clearTimeout(timer);image.onload=image.onerror=null;error?reject(error):resolve(image);}image.onload=()=>finish();image.onerror=()=>finish(Error('Review image unavailable'));image.src=url.href;});}
function updatePlayButton(){$('play').textContent=playing?'一時停止':'再生する';$('play').setAttribute('aria-pressed',String(playing));}
function pause(){playing=false;last=null;if(handle!==null)cancelAnimationFrame(handle);handle=null;updatePlayButton();}
function draw(){
  if(!frames.length)return;const width=Math.max(240,Math.round(canvas.clientWidth)),height=Math.max(220,Math.round(canvas.clientHeight)),ratio=Math.min(devicePixelRatio||1,2);
  if(canvas.width!==Math.round(width*ratio)||canvas.height!==Math.round(height*ratio)){canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);}
  context.setTransform(ratio,0,0,ratio,0,0);const frame=frames[index];
  drawRigReviewScene(context,{width,height,frame,manifest,atlas,drawOwnerPose,markers:$('markers').checked});
  $('scrub').value=String(frame.time);$('clock').textContent=frame.time.toFixed(2)+'秒';
  const pose=frame.pose,left=pose.feet.left.contact?'接地':pose.feet.left.mode==='turn'?'向き直り中':'空中',right=pose.feet.right.contact?'接地':pose.feet.right.mode==='turn'?'向き直り中':'空中';
  $('pose-status').textContent=frame.label+' ／ 左足：'+left+'・右足：'+right+(pose.artwork.usingFallbackView?' ／ この向きの原画は未制作です。':'');
}
function tick(stamp){handle=null;if(!playing)return;const dt=last===null?0:Math.max(0,Math.min(.1,(stamp-last)/1000));last=stamp;time=Math.min(RIG_REVIEW_SECONDS,time+dt);index=Math.min(frames.length-1,Math.round(time*RIG_REVIEW_FPS));draw();if(time>=RIG_REVIEW_SECONDS){pause();return;}handle=requestAnimationFrame(tick);}
$('play').addEventListener('click',()=>{if(playing){pause();return;}if(time>=RIG_REVIEW_SECONDS){time=0;index=0;}playing=true;last=null;updatePlayButton();handle=requestAnimationFrame(tick);});
$('restart').addEventListener('click',()=>{pause();time=0;index=0;draw();});
$('scrub').addEventListener('input',()=>{pause();time=Math.max(0,Math.min(RIG_REVIEW_SECONDS,Number($('scrub').value)||0));index=Math.min(frames.length-1,Math.round(time*RIG_REVIEW_FPS));draw();});
$('markers').addEventListener('change',draw);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});window.addEventListener('pagehide',pause);window.addEventListener('resize',draw);window.addEventListener('pageshow',draw);
if(typeof ResizeObserver==='function')new ResizeObserver(draw).observe(canvas);
try{
  const registry=await readJSON(registryURL),entries=Array.isArray(registry.rigs)?registry.rigs:Object.entries(registry.rigs||registry.characters||{}).map(([id,value])=>({...value,id:value.id||id}));
  const owner=entries.find(entry=>entry.id==='owner-lantern-hero');if(!owner||owner.status==='rejected')throw Error('Owner pilot is not available');
  const manifestURL=owner.manifestURL?localURL(owner.manifestURL,new URL('rig-animation.js',mazeURL)):registryURL;
  manifest=owner.manifest||await readJSON(manifestURL);
  if(!Number.isFinite(manifest.contentHeight)||manifest.contentHeight<=0)throw Error('Missing calibrated character height');
  const sources={...manifest.atlases,...owner.atlases};for(const key of[manifest.atlas,...Object.values(manifest.views||{}).map(view=>view.atlas)].filter(Boolean))if(!sources[key])sources[key]=key;
  if(!Object.keys(sources).length&&owner.src)sources.main=owner.src;
  atlas=Object.fromEntries(await Promise.all(Object.entries(sources).map(async([key,value])=>[key,await loadImage(localURL(value,manifestURL))])));
  frames=createRigReviewSizeFrames(createOwnerRig,{manifest});
  const directions=Object.keys(manifest.views||{}).length||manifest.directions?.length||1;
  $('art-status').textContent='用意した原画：'+directions+'方向。原画のない向きは画面内に表示します。'+(manifest.continuousTurnComplete===true?'':'連続した向き直りの採用判定は未完了です。')+'全キャストの完成を示すページではありません。';
  for(const id of['play','restart','scrub'])$(id).disabled=false;draw();
}catch(error){pause();$('art-status').textContent='主人公の試作を準備できませんでした。';$('load-error').hidden=false;console.warn('Owner rig review could not load',error);}
