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
const directions = {
  ArrowUp: [0,-1], w: [0,-1], ArrowDown: [0,1], s: [0,1],
  ArrowLeft: [-1,0], a: [-1,0], ArrowRight: [1,0], d: [1,0],
};
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

function attachMotion(scene, walker, obstacles) {
  const pressed=new Map();
  const started=new Map();
  let x=.50,z=.79, target=null, frame=0,last=0;
  const valid=(a,b)=>a>=.065&&a<=.935&&b>=.045&&b<=.965
    && !obstacles.some(item=>Math.abs(a-item.x)<item.rx+.022&&Math.abs(b-item.z)<item.rz+.038);
  function pose() {
    positioned(walker,x,z,20);
    walker.dataset.position = `${x.toFixed(3)},${z.toFixed(3)}`;
  }
  function stop() {
    pressed.clear();
    started.clear();
    target=null;
    walker.classList.remove('is-walking');
    if(frame) cancelAnimationFrame(frame);
    frame=0;
    last=0;
  }
  function tick(time) {
    frame=0;
    if(!walker.isConnected) { stop(); return; }
    const elapsed=last ? Math.min((time-last)/1000,.045) : .016;
    last=time;
    let dx=0,dz=0;
    for (const [horizontal,vertical] of pressed.values()) { dx+=horizontal; dz+=vertical; }
    if(!dx&&!dz&&target) { dx=target.x-x; dz=target.z-z; }
    const amount=Math.hypot(dx,dz);
    if(amount<.009) { stop(); return; }
    const speed=Math.min(elapsed*.60, target && !pressed.size ? amount : Infinity);
    const a=x+dx/amount*speed;
    const b=z+dz/amount*speed*.72;
    const oldX=x, oldZ=z;
    if(valid(a,z)) x=a;
    if(valid(x,b)) z=b;
    const moved=x!==oldX||z!==oldZ;
    if(moved&&Math.abs(dx)>.008) walker.dataset.left=String(dx<0);
    walker.classList.toggle('is-walking',moved);
    if(moved) pose();
    if(pressed.size||moved&&target) frame=requestAnimationFrame(tick);
    else { target=null; last=0; }
  }
  function run() {
    if(!frame) frame=requestAnimationFrame(tick);
  }
  function start(key, vector) {
    target=null;
    if(!pressed.has(key)) started.set(key,performance.now());
    pressed.set(key,vector);
    run();
  }
  function destination(a,b) {
    pressed.clear();
    target={x:clamp(a,.07,.93),z:clamp(b,.06,.95)};
    run();
  }
  function release(key, allowStep) {
    const vector=pressed.get(key);
    const startTime=started.get(key);
    pressed.delete(key);
    started.delete(key);
    if(allowStep&&vector&&!pressed.size&&performance.now()-startTime<130) {
      const [dx,dz]=vector;
      destination(x+dx*.075,z+dz*.075);
    }
  }
  pose();
  scene.addEventListener('keydown',event=>{
    const key=event.key.length===1?event.key.toLowerCase():event.key;
    if(!directions[key]) return;
    event.preventDefault();
    start(key,directions[key]);
  });
  scene.addEventListener('keyup',event=>release(event.key.length===1?event.key.toLowerCase():event.key,true));
  scene.addEventListener('blur',stop);
  scene.addEventListener('click',event=>{
    const bounds=scene.getBoundingClientRect();
    const screenX=(event.clientX-bounds.left)/bounds.width;
    const screenY=(event.clientY-bounds.top)/bounds.height;
    const depth=clamp((screenY-.61)/.36,.08,.95);
    destination(.5+(screenX-.5)/(.74+.29*depth),depth);
  });
  const controls=make('div','world-walk-pad');
  controls.setAttribute('role','group');
  controls.setAttribute('aria-label','住人を歩かせる');
  for(const [label,char,key] of [['上へ','↑','ArrowUp'],['左へ','←','ArrowLeft'],['下へ','↓','ArrowDown'],['右へ','→','ArrowRight']]){
    const arrow=make('button','world-direction');
    arrow.type='button';
    arrow.textContent=char;
    arrow.setAttribute('aria-label',label);
    arrow.addEventListener('pointerdown',event=>{
      event.preventDefault();
      arrow.setPointerCapture(event.pointerId);
      start(event.pointerId,directions[key]);
    });
    arrow.addEventListener('pointerup',event=>release(event.pointerId,true));
    for (const eventName of ['pointercancel','lostpointercapture']) {
      arrow.addEventListener(eventName,event=>release(event.pointerId,false));
    }
    arrow.addEventListener('click',event=>{
      if(event.detail===0) {
        const [dx,dz]=directions[key];
        destination(x+dx*.16,z+dz*.16);
      }
    });
    controls.append(arrow);
  }
  return controls;
}

export function roomStage(room,source,{mini=false,avatarName}={}) {
  const theme=themeFor(room);
  const world=worldFor(room);
  const scene=make('div',mini?'world-stage world-mini':'world-stage room-scene');
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
  scene.append(back,left,right,ceiling,floor,rug,glazing,light);
  const poster=(room.profile?.articles ?? []).find(article=>article.url===room.design?.pin&&article.image) ??
    (room.profile?.articles ?? []).find(article=>article.image);
  if(poster&&!mini) scene.append(art(poster.image,'world-poster',poster.title));
  const placement=placements[world.layout] ?? placements[0];
  const obstacles=[];
  theme.furniture.forEach((type,index)=>{
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
  const sprite=art(source,'world-sprite',mini?'':(avatarName||'住人キャラクター'),mini);
  sprite.addEventListener('error',()=>{
    if(sprite.getAttribute('src')!=='./assets/resident.webp') sprite.src='./assets/resident.webp';
  });
  walker.append(sprite);
  scene.append(walker);
  if(mini) {
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
  title.textContent=`${viewNames[world.view]}の${theme.name}`;
  const text=make('span');
  text.textContent='床をタップ · 方向ボタン · 矢印キー';
  hint.append(title,text);
  dock.append(hint,attachMotion(scene,walker,obstacles));
  frame.append(scene,dock);
  return frame;
}
