import { scanAtlas } from './atlas-layout.js?v=20261118-sprites-2';
const frameWidth=152, frameHeight=224;
const atlasURL=new URL('./assets/host-walk.webp?v=1',import.meta.url);
export const hostPortrait=new URL('./assets/host-portrait.webp?v=1',import.meta.url).href;

let atlas;
let seatedAtlas;
function loadSeatedAtlas(){
  seatedAtlas??=new Image();
  if(!seatedAtlas.src)seatedAtlas.src=new URL('./assets/host-seated.webp?v=1',import.meta.url).href;
  return seatedAtlas;
}
function loadAtlas() {
  atlas ??= new Image();
  if (!atlas.src) atlas.src=atlasURL.href;
  return atlas;
}

function walkAtlas(image,sheet,cellSize,idle,walkingFrames) {
  const canvas=document.createElement('canvas');
  canvas.className=image.className;
  canvas.hidden=true;
  canvas.setAttribute('role','img');
  canvas.setAttribute('aria-label',image.alt);
  if (!image.alt) canvas.setAttribute('aria-hidden','true');
  image.after(canvas);
  const context=canvas.getContext('2d');
  let facing=0, fixedFrame='', last=[0,false];
  if (!context) return () => {};
  function update(distance,walking,dx,dy) {
    if (dx || dy) facing=(Math.round(Math.atan2(dx,dy)*4/Math.PI)+8)%8;
    last=[distance,walking,dx,dy];
    if (!sheet.complete || !sheet.naturalWidth || !canvas.isConnected) return;
    const [width,height]=cellSize(sheet);
    if (!Number.isInteger(width) || !Number.isInteger(height)) return;
    const row=[0,0,1,2,3,2,1,0][facing];
    const mirror=facing>0 && facing<4;
    const column=walking ? walkingFrames[Math.floor(distance)%walkingFrames.length] : idle;
    const key=[row,mirror,column].join(':');
    if (fixedFrame===key) return;
    fixedFrame=key;
    if (canvas.width!==width || canvas.height!==height) {canvas.width=width;canvas.height=height;}
    context.setTransform(1,0,0,1,0,0);
    context.clearRect(0,0,width,height);
    if (mirror) context.setTransform(-1,0,0,1,width,0);
    context.drawImage(sheet,column*width,row*height,width,height,0,0,width,height);
    canvas.hidden=false;
    image.hidden=true;
  }
  if (sheet.complete && sheet.naturalWidth) queueMicrotask(()=>update(...last));
  else sheet.addEventListener('load',()=>update(...last),{once:true});
  return update;
}

export function hostWalker(image) {
  loadSeatedAtlas();
  return walkAtlas(image,loadAtlas(),()=>[frameWidth,frameHeight],1,[0,1,2,3]);
}

export function residentWalker(image) {
  const source=image.src;
  const update=walkAtlas(image,image,sheet=>sheet.src===source ? [sheet.naturalWidth/4,sheet.naturalHeight/4] : [],0,[1,2,3,2]);
  image.classList.add('sprite-atlas-source');
  image.addEventListener('error',()=>image.classList.remove('sprite-atlas-source'),{once:true});
  return update;
}

export function avatarSnapshot(source, pose = 'stand', {host=false} = {}) {
  const width = source?.naturalWidth ?? source?.width;
  const height = source?.naturalHeight ?? source?.height;
  if (!width || !height) return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return null;
  if(host&&pose!=='stand'){
    const sheet=loadSeatedAtlas();
    if(sheet.complete&&sheet.naturalWidth){
      const half=sheet.naturalWidth/2;
      const x=pose==='saddle'?0:half;
      canvas.width=Math.round(half);canvas.height=sheet.naturalHeight;
      context.drawImage(sheet,x,0,half,sheet.naturalHeight,0,0,half,sheet.naturalHeight);
      return canvas;
    }
  }
  if (pose === 'stand') {
    context.drawImage(source, 0, 0);
    return canvas;
  }
  // Retain the creator's original face, costume, texture and proportions.
  // Only articulated leg regions move; the torso is never stretched or rotated.
  const hip=height*.60,knee=height*.80;
  if(pose==='saddle'){
    canvas.width=Math.max(width,Math.round(height*.76));
    const offset=(canvas.width-width)/2;
    context.drawImage(source,0,0,width,hip,offset,0,width,hip);
    const pivotX=offset+width*.5,pivotY=hip-1,thigh=knee-hip;
    context.save();context.translate(pivotX,pivotY);context.rotate(-Math.PI/3);
    context.drawImage(source,0,hip,width,thigh,-width/2,0,width,thigh);
    context.restore();
    context.drawImage(source,0,knee-2,width,height-knee+2,pivotX+thigh*.866-width/2,pivotY+thigh*.5-2,width,height-knee+2);
  }else{
    context.drawImage(source,0,0,width,hip,0,0,width,hip);
    context.drawImage(source,0,hip,width,knee-hip,0,hip-1,width,(knee-hip)*.3);
    context.drawImage(source,0,knee-2,width,height-knee+2,0,hip+(knee-hip)*.3-2,width,height-knee+2);
  }
  return canvas;
}

// Auto-detect legacy sheets even if the saved atlas flag was false. The original
// image is hidden while detecting; no full sheet is shown as a game character.
export function autoResidentWalker(image,{atlas=false}={}) {
  if(atlas)return residentWalker(image);
  image.classList.add('sprite-atlas-source');
  let updateFrame=null,last=[0,false], facing=0;
  let singleFacing=1;
  const single=(distance,walking,dx)=>{
    if(dx)singleFacing=dx<0?-1:1;
    const phase=distance*Math.PI/2;
    image.style.transform=`translateY(${walking?-Math.abs(Math.sin(phase))*1.8:0}%) rotate(${walking?Math.sin(phase)*.65:0}deg) scaleX(${singleFacing})`;
  };
  function restore(){image.classList.remove('sprite-atlas-source');updateFrame=single;updateFrame(...last);}
  function inspect(){
    if(!image.naturalWidth){restore();return;}
    let boxes;
    try{boxes=scanAtlas(image);}catch{restore();return;}
    if(!boxes){restore();return;}
    const canvas=document.createElement('canvas');
    canvas.className=image.className.replace('sprite-atlas-source','').trim();
    canvas.setAttribute('role','img');canvas.setAttribute('aria-label',image.alt);
    if(!image.alt)canvas.setAttribute('aria-hidden','true');
    canvas.width=canvas.height=240;
    const ctx=canvas.getContext('2d');
    if(!ctx){restore();return;}
    const scale=230/Math.max(...boxes.map(q=>Math.max(q[2]-q[0],q[3]-q[1])));
    image.after(canvas);image.hidden=true;
    let previous='';
    updateFrame=(distance,walking,dx,dy)=>{
      if(dx||dy)facing=(Math.round(Math.atan2(dx||0,dy||0)*4/Math.PI)+8)%8;
      const row=[0,0,1,2,3,2,1,0][facing];
      const col=walking?[1,2,3,2][Math.floor(distance)%4]:0;
      const mirror=facing>0&&facing<4,key=[row,col,mirror].join(':');
      if(key===previous)return;previous=key;
      const [l,t,r,b]=boxes[row*4+col],w=r-l,h=b-t;
      ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,240,240);
      if(mirror)ctx.setTransform(-1,0,0,1,240,0);
      ctx.drawImage(image,l,t,w,h,(240-w*scale)/2,236-h*scale,w*scale,h*scale);
    };
    updateFrame(...last);
  }
  if(image.complete&&image.naturalWidth)queueMicrotask(inspect);
  else {image.addEventListener('load',inspect,{once:true});image.addEventListener('error',restore,{once:true});}
  return (...args)=>{last=args;updateFrame?.(...args);};
}
