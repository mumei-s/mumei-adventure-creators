const frameWidth=152, frameHeight=224;
const atlasURL=new URL('./assets/host-walk.webp?v=1',import.meta.url);
export const hostPortrait=new URL('./assets/host-portrait.webp?v=1',import.meta.url).href;

let atlas;
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
  return walkAtlas(image,loadAtlas(),()=>[frameWidth,frameHeight],1,[0,1,2,3]);
}

export function residentWalker(image) {
  const source=image.src;
  const update=walkAtlas(image,image,sheet=>sheet.src===source ? [sheet.naturalWidth/4,sheet.naturalHeight/4] : [],0,[1,2,3,2]);
  image.classList.add('sprite-atlas-source');
  image.addEventListener('error',()=>image.classList.remove('sprite-atlas-source'),{once:true});
  return update;
}

export function avatarSnapshot(source, pose = 'stand') {
  const width = source?.naturalWidth ?? source?.width;
  const height = source?.naturalHeight ?? source?.height;
  if (!width || !height) return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return null;
  if (pose === 'stand') {
    context.drawImage(source, 0, 0);
    return canvas;
  }
  // Keep the head and torso at their original proportions, and bend each leg
  // at the hip and knee. The frame remains anchored at the soles.
  const hip = height * .62;
  const knee = height * .81;
  const top = height * .14;
  context.drawImage(source, 0, 0, width, hip, 0, top, width, hip);
  for (const side of [-1, 1]) {
    const left = side < 0 ? 0 : width / 2;
    const pivot = width * (side < 0 ? .42 : .58);
    context.save();
    context.translate(pivot, top + hip - 1);
    context.rotate(side * -.29);
    context.drawImage(source, left, hip, width / 2, knee - hip,
      left - pivot, 0, width / 2, (knee - hip) * .65);
    context.translate(0, (knee - hip) * .65);
    context.rotate(side * .38);
    context.drawImage(source, left, knee - 2, width / 2, height - knee + 2,
      left - pivot, -2, width / 2, height - knee + 2);
    context.restore();
  }
  return canvas;
}
