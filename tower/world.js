import { makeWalkPad, bindWalking } from '../halloween-exhibition/preview/diorama-city/walk-controls.js?v=1';
import { hostPortrait, hostWalker, residentWalker, autoResidentWalker } from '../halloween-exhibition/preview/diorama-city/host-avatar.js?v=20261118-spaces';
import { applyDistrictLight } from '../halloween-exhibition/preview/diorama-city/scene-time.js?v=1';
import { TOWER_API } from './avatar-travel.js?v=20261118';

const viewNames = ['雨上がりの街', '木立と丘', '海辺の朝焼け', '星明かりの街'];
const views = ['city', 'grove', 'coast', 'stars'];
const motifs = {
  reading: { hue: 38, furniture: ['shelf', 'desk', 'plant'], view: 1, name: '書斎' },
  gallery: { hue: 163, furniture: ['desk', 'sofa', 'plant'], view: 2, name: '制作室' },
  cinema: { hue: 215, furniture: ['sofa', 'shelf', 'plant'], view: 0, name: 'ラウンジ' },
  story: { hue: 266, furniture: ['shelf', 'desk', 'plant'], view: 3, name: '物語室' },
};
const furnitureSizes = {
  desk: { width: 29, height: 30, rx: .15, rz: .12 },
  sofa: { width: 34, height: 27, rx: .20, rz: .14 },
  shelf: { width: 25, height: 38, rx: .13, rz: .10 },
  plant: { width: 14, height: 32, rx: .07, rz: .08 },
};
const placements = [
  [[.22,.18],[.76,.25],[.87,.13]],
  [[.77,.14],[.23,.34],[.13,.12]],
  [[.21,.34],[.71,.14],[.89,.25]],
  [[.76,.31],[.31,.15],[.12,.25]],
  [[.27,.18],[.75,.36],[.86,.13]],
  [[.74,.20],[.25,.27],[.12,.12]],
];
const clamp = (number,min,max) => Math.min(max,Math.max(min,number));

function hash(text) {
  let value = 2166136261;
  for (const char of text) value = Math.imul(value ^ char.codePointAt(0),16777619);
  return value >>> 0;
}

function themeFor(room) {
  return motifs[room.design?.theme] ?? motifs.reading;
}

export function designWorld(room, signature) {
  const theme = themeFor(room);
  const articles = room.profile?.articles ?? [];
  const text = [room.profile?.description, ...articles.slice(0,6).map(article=>article.title)].filter(Boolean).join(' ');
  const seed = hash([room.noteId || room.id || 'atelier', text, signature?.fingerprint ?? ''].join('|'));
  const places = [/夜景|街|雨|都会|音楽|映画|カフェ/g, /山|森|木漏れ日|庭|花|植物|読書/g,
    /海|波|島|旅|旅行|風景|写真/g, /星|宇宙|月|幻想|魔法|異世界|物語|小説/g];
  const scores = places.map((pattern,index)=>(text.match(pattern)?.length ?? 0)*2 + Number(theme.view===index));
  const best = Math.max(...scores);
  const leading = scores.map((score,index)=>score===best ? index : -1).filter(index=>index>=0);
  const view = text ? leading[seed % leading.length] : theme.view;
  const hue = signature && signature.chroma >= 8 ? signature.hue : (theme.hue + seed % 35 + 343) % 360;
  return {
    seed,
    hue,
    accent: signature && signature.chroma >= 8 ? signature.accent : (hue + 23 + seed % 65) % 360,
    lightness: signature ? signature.lightness : 45 + seed % 29,
    view,
    layout: ((seed >>> 8) + (signature?.fingerprint ?? 0)) % placements.length,
    character: Boolean(signature),
  };
}

export function worldFor(room) {
  return room.design?.world ?? designWorld({ ...room, profile: undefined });
}

function rgbHue(red, green, blue) {
  const min = Math.min(red,green,blue);
  const max = Math.max(red,green,blue);
  const delta = max-min;
  let hue = 0;
  if (delta && max===red) hue = 60*((green-blue)/delta%6);
  else if (delta && max===green) hue = 60*((blue-red)/delta+2);
  else if (delta) hue = 60*((red-green)/delta+4);
  return {hue:(hue+360)%360,chroma:delta/255,lightness:(min+max)/510};
}

export function characterSignature(image) {
  const canvas = document.createElement('canvas');
  canvas.width = 48;
  canvas.height = 48;
  const context = canvas.getContext('2d',{willReadFrequently:true});
  context.drawImage(image,0,0,48,48);
  const data = context.getImageData(0,0,48,48).data;
  const tones = Array(24).fill(0);
  let fingerprint = 2166136261;
  let mass=0, brightness=0, saturation=0;
  for (let y=2;y<46;y++) {
    for (let x=2;x<46;x++) {
      const index=(y*48+x)*4;
      if (data[index+3]<96) continue;
      const {hue,chroma,lightness}=rgbHue(data[index],data[index+1],data[index+2]);
      const weight=1+Number(x>10&&x<38&&y>6&&y<43);
      const hueWeight=chroma*(.4+lightness)*weight;
      tones[Math.floor(hue/15)]+=hueWeight;
      brightness+=lightness*weight;
      saturation+=chroma*weight;
      mass+=weight;
      fingerprint=Math.imul(fingerprint ^ ((data[index]>>4)*256+(data[index+1]>>4)*16+(data[index+2]>>4)),16777619);
    }
  }
  const dominant=tones.indexOf(Math.max(...tones));
  const accents=tones.map((amount,index)=>{
    const distance=Math.min(Math.abs(dominant-index),24-Math.abs(dominant-index));
    return distance>=2 ? amount : 0;
  });
  const secondary=accents.indexOf(Math.max(...accents));
  return {
    hue:dominant*15+7,
    accent:accents[secondary]>0 ? secondary*15+7 : (dominant*15+47)%360,
    lightness:Math.round(100*brightness/Math.max(1,mass)),
    chroma:Math.round(100*saturation/Math.max(1,mass)),
    fingerprint:fingerprint>>>0,
  };
}

const make = (tag, className) => {
  const el = document.createElement(tag);
  if(className) el.className = className;
  return el;
};

function art(source, css, alt = '', mini = false) {
  const image = make('img',css);
  if (source?.startsWith(TOWER_API)) image.crossOrigin='anonymous';
  image.src = source;
  image.alt = alt;
  image.draggable = false;
  if(mini) image.loading = 'lazy';
  return image;
}

function positioned(element,x,z,layer=0) {
  element.style.left = `${50+(x-.5)*(74+29*z)}%`;
  element.style.top = `${61+36*z}%`;
  element.style.zIndex = String(layer+1+Math.round(z*100));
  element.style.setProperty('--size-depth',String(.70+.30*z));
}

const floorBounds={left:.135,right:.865,far:.06,near:.91};

function attachMotion(frame,scene,walker,obstacles,updateAvatar,signal,inputRoot,shared=false) {
  const bounds=shared ? {left:.05,right:.95,far:.02,near:.94} : floorBounds;
  const controls=makeWalkPad();
  let x=.5,z=.74, vector=null, target=null, tickHandle=0,last=0,stride=0;
  let overview=shared&&matchMedia('(orientation: landscape) and (max-height: 540px)').matches;
  const viewport=shared?scene.parentElement:null;
  function camera(){
    if(!shared||!viewport?.clientWidth)return;
    const width=viewport.clientWidth,height=viewport.clientHeight;
    const fit=Math.min(width/1000,height/667);
    const scale=overview?fit:Math.max(width/1000,height/667,.52);
    const focus=[(50+(x-.5)*96)*10,(48+49*z)*6.67];
    const offset=(span,total,at)=>total<span?(span-total)/2:Math.max(span-total,Math.min(0,span*.58-at*scale));
    scene.style.transform=`translate(${offset(width,1000*scale,focus[0])}px,${offset(height,667*scale,focus[1])}px) scale(${scale})`;
  }
  const valid=(a,b)=>a>=bounds.left&&a<=bounds.right&&b>=bounds.far&&b<=bounds.near
    && !obstacles.some(item=>Math.abs(a-item.x)<item.rx+.022&&Math.abs(b-item.z)<item.rz+.038);
  function pose(dx=0,dz=0,moving=false) {
    positioned(walker,x,z,20);
    if(shared){walker.style.left=`${50+(x-.5)*96}%`;walker.style.top=`${48+49*z}%`;}
    walker.dataset.position=`${x.toFixed(3)},${z.toFixed(3)}`;
    updateAvatar?.(stride,moving,dx,dz);
    camera();
  }
  function tick(time) {
    tickHandle=0;
    if(!walker.isConnected||signal?.aborted) return;
    const elapsed=last ? Math.min((time-last)/1000,.045) : .016;
    last=time;
    const [dx,dz]=vector ?? (target ? [target.x-x,(target.z-z)/.78] : [0,0]);
    const length=Math.hypot(dx,dz);
    if(length<.003) {
      target=null;
      last=0;
      pose();
      return;
    }
    const speed=Math.min(elapsed*(shared ? .61 : .55),vector ? Infinity : length);
    const a=clamp(x+dx/length*speed,bounds.left,bounds.right);
    const b=clamp(z+dz/length*speed*.78,bounds.far,bounds.near);
    const oldX=x,oldZ=z;
    if(valid(a,z)) x=a;
    if(valid(x,b)) z=b;
    const advance=Math.hypot(x-oldX,(z-oldZ)*1.2);
    stride+=advance/.061;
    pose(x-oldX,z-oldZ,advance>0);
    if(vector || advance>0 && target) run();
    else {target=null;last=0;}
  }
  function run() {
    if(!tickHandle) tickHandle=requestAnimationFrame(tick);
  }
  function destination(a,b) {
    vector=null;
    target={x:clamp(a,bounds.left,bounds.right),z:clamp(b,bounds.far,bounds.near)};
    run();
  }
  pose();
  scene.addEventListener('click',event=>{
    const bounds=scene.getBoundingClientRect();
    const screenX=(event.clientX-bounds.left)/bounds.width;
    const screenY=(event.clientY-bounds.top)/bounds.height;
    const depth=clamp(shared?(screenY-.48)/.49:(screenY-.61)/.36,bounds.far,bounds.near);
    destination(shared ? .5+(screenX-.5)/.96 : .5+(screenX-.5)/(.74+.29*depth),depth);
    scene.focus({preventScroll:true});
  },{signal});
  bindWalking(inputRoot ?? frame,controls,{
    signal,
    blocked:()=>!frame.closest('dialog[open]')||Array.from(document.querySelectorAll('dialog[open]')).at(-1)!==frame.closest('dialog'),
    change(value){vector=value;target=null;run();},
    step([dx,dz]){destination(x+dx*.1,z+dz*.1);},
  });
  signal?.addEventListener('abort',()=>cancelAnimationFrame(tickHandle),{once:true});
  if(shared){
    const viewButton=make('button','quiet shared-camera');viewButton.type='button';viewButton.textContent=overview?'歩く視点へ':'全景を見る';viewButton.setAttribute('aria-pressed',String(overview));
    viewButton.addEventListener('click',()=>{overview=!overview;viewButton.textContent=overview?'歩く視点へ':'全景を見る';viewButton.setAttribute('aria-pressed',String(overview));camera();});
    frame.querySelector('.world-control-dock').append(viewButton);
    const observer=new ResizeObserver(camera);observer.observe(viewport);signal?.addEventListener('abort',()=>observer.disconnect(),{once:true});
  }
  return controls;
}

const suiteArtwork='./assets/panorama-suite.webp?v=1';
export function usesHostModel(room) {
  return room.id==='showroom'||room.noteId==='ss_yr'&&!room.draftAvatar?.source
    && (room.design?.avatarMode??'resident')==='resident';
}

const roomArt = room => usesHostModel(room) ? suiteArtwork :
  `./assets/${Object.hasOwn(motifs,room.design?.theme)?room.design.theme:'reading'}.webp`;

export function generatedInterior(room) {
  if (room.draftInterior?.source) return room.draftInterior.source;
  if (!room.design?.world?.artwork) return '';
  const url=new URL(TOWER_API);
  url.search=new URLSearchParams({view:'interior',id:room.id,v:room.design.world.artwork});
  return url.href;
}

const usingAtlas=room=>room.draftAvatar?.atlas ?? room.design?.world?.atlas===true;

function interiorImage(room,source,css,alt,mini) {
  const image=art(source || roomArt(room),css,alt,mini);
  if(source) image.addEventListener('error',()=>{image.dataset.loadError='true';image.alt='登録した部屋画像を読み込めませんでした';});
  return image;
}

export function roomPreview(room,source) {
  const photo=make('span','room-photo');
  photo.append(interiorImage(room,generatedInterior(room),'room-photo-interior','',true));
  const resident=art(usesHostModel(room)?hostPortrait:source,'room-photo-resident','',true);
  if(room.design?.avatarMode==='profile'&&room.profile?.photo) resident.classList.add('profile-photo');
  photo.append(resident);
  if(!usesHostModel(room) && room.design?.avatarMode==='custom') {
    resident.addEventListener('error',()=>{resident.hidden=true;photo.dataset.avatarError='true';},{once:true});
    autoResidentWalker(resident,{atlas:usingAtlas(room)})(0,false);
  }
  return photo;
}

export function roomStage(room,source,{mini=false,avatarName,signal,inputRoot,traveler}={}) {
  const theme=themeFor(room);
  const world=worldFor(room);
  const scene=make('div',mini?'world-stage world-mini':'world-stage room-scene');
  const hostModel=usesHostModel(room), host=hostModel&&!traveler, generated=generatedInterior(room), photo=hostModel||generated;
  scene.dataset.layout=String(world.layout);
  scene.dataset.view=views[world.view];
  scene.dataset.material=['timber','stone','tile'][(world.seed>>>6)%3];
  scene.dataset.light=room.design?.light ?? 'natural';
  const wallLight=clamp(35+Math.round(world.lightness*.46),35,78);
  scene.style.setProperty('--world-hue',String(world.hue));
  scene.style.setProperty('--world-accent',String(world.accent));
  scene.style.setProperty('--wall-light',`${wallLight}%`);
  const left=make('div','world-wall left-wall');
  const right=make('div','world-wall right-wall');
  const back=make('div','world-wall back-wall');
  const floor=make('div','world-floor');
  const ceiling=make('div','world-ceiling');
  const glazing=make('div','world-window');
  glazing.append(art(`./assets/view-${views[world.view]}.webp`,'window-scenery','',mini));
  const rug=make('div','world-rug');
  const light=make('div','world-glow');
  if(photo) {
    scene.classList.add('world-photo-suite');
    const interior=interiorImage(room,generated,'suite-interior',mini?'':generated?'住人がつくった部屋':'窓から街を見渡せる、マンションの室内',mini);
    scene.append(interior);
    if(generated&&!mini){
      const retry=make('button','scene-art-retry');retry.type='button';retry.hidden=true;retry.textContent='元の部屋画像を再読み込み';
      interior.addEventListener('error',()=>{retry.hidden=false;});
      interior.addEventListener('load',()=>{retry.hidden=true;delete interior.dataset.loadError;});
      retry.addEventListener('click',event=>{event.stopPropagation();retry.hidden=true;interior.src=generated;});
      scene.append(retry);
    }
    if(generated) scene.classList.add('world-generated');
    else {
      applyDistrictLight(scene);
      if(!mini&&signal) {
        const timer=setInterval(()=>{if(!document.hidden) applyDistrictLight(scene);},1700);
        signal.addEventListener('abort',()=>clearInterval(timer),{once:true});
      }
    }
  } else scene.append(back,left,right,ceiling,floor,rug,glazing,light);
  const poster=(room.profile?.articles ?? []).find(article=>article.url===room.design?.pin&&article.image) ??
    (room.profile?.articles ?? []).find(article=>article.image);
  if(poster&&!mini&&!photo) scene.append(art(poster.image,'world-poster',poster.title));
  const placement=placements[world.layout] ?? placements[0];
  const obstacles=[];
  if(!photo) theme.furniture.forEach((type,index)=>{
    const size=furnitureSizes[type];
    const [x,z]=placement[index];
    obstacles.push({x,z,rx:size.rx,rz:size.rz});
    const item=make('div',`world-furniture furniture-${type}`);
    item.style.setProperty('--prop-width',`${size.width}%`);
    item.style.setProperty('--prop-height',`${size.height}%`);
    positioned(item,x,z,20);
    item.append(art(`./assets/prop-${type}.webp`,'furniture-image','',mini));
    scene.append(item);
  });
  const walker=make('div','world-resident');
  if(room.design?.avatarMode==='profile'&&room.profile?.photo) walker.classList.add('portrait');
  if(world.character) walker.classList.add('custom-walker');
  const sprite=art(traveler?.source || (host?hostPortrait:source),'world-sprite',mini?'':(traveler?.name || (host?'無名S note':avatarName||'住人キャラクター')),mini);
  sprite.addEventListener('error',()=>{
    sprite.hidden=true;
    if(!mini){const warning=make('span','avatar-unavailable');warning.textContent='アバター画像を読み込めませんでした';walker.append(warning);}
  },{once:true});
  walker.append(sprite);
  const atlas=traveler ? traveler.atlas : usingAtlas(room);
  const custom=traveler ? (traveler.custom ?? (traveler.atlas || traveler.source?.startsWith(TOWER_API) || traveler.source?.startsWith('data:'))) : room.design?.avatarMode==='custom';
  const updateAvatar=host&&!mini ? hostWalker(sprite) : custom || atlas ? autoResidentWalker(sprite,{atlas:Boolean(atlas)}) : null;
  scene.append(walker);
  if(mini) {
    updateAvatar?.(0,false);
    scene.setAttribute('aria-hidden','true');
    walker.style.setProperty('--pace',`${5+world.seed%5}s`);
    walker.style.setProperty('--offset',`-${world.seed%7}s`);
    return scene;
  }
  scene.tabIndex=0;
  scene.setAttribute('role','group');
  scene.setAttribute('aria-label','部屋。矢印キーやWASDで歩きます。床のタップでも移動できます。');
  const frame=make('div','scene-frame');
  const dock=make('div','world-control-dock');
  const hint=make('div','world-control-hint');
  const title=make('strong');
  title.textContent=generated ? room.design.title || '生成した部屋' : `${viewNames[world.view]}の${theme.name}`;
  const text=make('span');
  text.textContent='床をタップ・方向パッド・矢印キー';
  hint.append(title,text);
  const shared=Boolean(room.sharedSpace);
  if(shared){const viewport=make('div','shared-viewport');viewport.append(scene);frame.append(viewport,dock);}
  else frame.append(scene,dock);
  dock.append(hint,attachMotion(frame,scene,walker,obstacles,updateAvatar,signal,inputRoot,shared));
  return frame;
}
