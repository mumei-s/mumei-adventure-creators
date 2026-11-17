import { makeWalkPad, bindWalking } from './walk-controls.js?v=1';
import { hostWalker } from './host-avatar.js?v=2';
import { applyDistrictLight } from './scene-time.js?v=1';
import { distance, places, walkable, walkingRoute } from './paths.js?v=2';
import { districtTraffic } from './traffic.js?v=1';
import { cafeStory, venues, venueSpawn, venueWalkable } from './venues.js?v=1';

const el=id=>document.getElementById(id);
const root=el('district'), view=el('city-view'), world=el('city-world'), citizen=el('citizen');
const pad=makeWalkPad(), clock=el('clock'), dialog=el('place-dialog'), visit=el('visit');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const paintAvatar=hostWalker(citizen.querySelector('img'));
const drawTraffic=districtTraffic(el('transit'));
const arrival=new URLSearchParams(location.search).get('arrival');
const spawn=arrival==='tower' ? [503,320] : [251,512];
let position=[...spawn], stride=0, vector=null, route=[], active=true, transition=false, overview=false;
let camera={x:0,y:0,scale:1};
let lighting='auto', lightLevel=.3, lastLight=-Infinity, lastTraffic=-Infinity;
let frame=0, lastTick=0, nearby='', priorTarget='';
let venueId='', venue=null, streetReturn=null, directions=[];
const spotStatus=el('place-note'), placeLink=el('place-link');
const controls=el('locations'), venuePhoto=el('venue-plate'), guide=el('venue-guide');
const streetGuide=[...guide.children];

el('pad-dock').append(pad);
function renderLocations() {
  directions=Object.entries(venue?.spots ?? places);
  controls.replaceChildren();
  for (const [id,place] of directions) {
    const pin=document.createElement('button');
    pin.type='button';
    pin.className='location';
    pin.dataset.location=id;
    pin.textContent=place.label;
    pin.style.left=place.sign[0]+'px';
    pin.style.top=place.sign[1]+'px';
    pin.addEventListener('click',()=>{
      if (nearby===id) openPlace();
      else goTo(place.point);
    });
    controls.append(pin);
  }
  guide.setAttribute('aria-label',`${venue?.title ?? '街区'}の行き先`);
  if (venue) guide.replaceChildren(...directions.map(([id,place])=>{
    const shortcut=document.createElement('button');
    shortcut.type='button';
    shortcut.dataset.headTo=id;
    shortcut.textContent=place.label+'へ';
    return shortcut;
  }));
  else guide.replaceChildren(...streetGuide);
}

function centerCamera() {
  const width=view.clientWidth,height=view.clientHeight;
  if (!width || !height) return;
  const fit=Math.min(width/1000,height/667);
  const cover=Math.max(width/1000,height/667);
  const scale=overview ? fit : venue ? cover : Math.max(cover,fit*1.6);
  const bound=(span,art,focus,center)=>art<=span ? (span-art)/2 : Math.max(span-art,Math.min(0,span*center-focus*scale));
  const x=bound(width,1000*scale,position[0],.5);
  const y=bound(height,667*scale,position[1],.66);
  camera={x,y,scale};
  world.style.transform=`translate(${x.toFixed(2)}px,${y.toFixed(2)}px) scale(${scale.toFixed(4)})`;
  world.style.setProperty('--marker-scale',String(Math.min(1.45,1/scale)));
}

function showPlaceLink(link=venue?.link) {
  placeLink.hidden=!link;
  if (!link) {placeLink.removeAttribute('href');return;}
  placeLink.textContent=link.label;
  placeLink.href=link.href;
}

function updateLocation() {
  const closest=directions.reduce((best,[id,place])=>{
    const gap=distance(position,place.point);
    return gap<best.distance ? {id,distance:gap} : best;
  },{id:'',distance:Infinity});
  nearby=closest.distance<=(venue ? 55 : 46) ? closest.id : '';
  if (nearby===priorTarget) return;
  priorTarget=nearby;
  const place=(venue?.spots ?? places)[nearby];
  el('place-name').textContent=place?.label ?? venue?.title ?? '近未来街区';
  spotStatus.textContent=nearby==='gate' ? '結界は創り手の街区につながっています。' :
    nearby==='tower' ? '見学室とフロア案内はマンションの中にあります。' :
    venue?.note ?? '道をタップすると歩いて向かいます。';
  visit.textContent=place?.action ?? '近くを調べる';
  visit.disabled=!nearby;
  for (const pin of controls.children) pin.classList.toggle('near',pin.dataset.location===nearby);
  showPlaceLink();
}
function paint(dx=0,dy=0,moving=false) {
  citizen.style.left=position[0]+'px';
  citizen.style.top=position[1]+'px';
  citizen.dataset.position=position.map(n=>n.toFixed(1)).join(',');
  citizen.style.scale=String(.8+.22*(position[1]/580));
  citizen.style.transformOrigin='50% 100%';
  paintAvatar(stride,moving,dx,dy);
  centerCamera();
  updateLocation();
}
function goTo(point) {
  if (transition||dialog.open) return;
  const next=venue ? (venueWalkable(point) ? [point] : []) : walkingRoute(position,point);
  if (!next.length) return;
  vector=null;
  route=next;
  run();
}
const movement=bindWalking(root,pad,{
  blocked:()=>dialog.open||transition,
  change(value) {
    vector=value;
    if (vector) route=[];
    if (vector) run();
  },
  step([dx,dy]) {goTo([position[0]+dx*20,position[1]+dy*20]);},
});

function run() {
  if (!frame && active && !document.hidden) frame=requestAnimationFrame(tick);
}
function tick(time) {
  frame=0;
  if (!active || document.hidden) {lastTick=0;return;}
  const elapsed=lastTick ? Math.min(.048,(time-lastTick)/1000) : .016;
  lastTick=time;
  if (time-lastLight>650) {
    const update=applyDistrictLight(root,lighting);
    lightLevel=update.night;
    root.style.setProperty('--deep-night',String(Math.max(0,(lightLevel-.72)/.28)));
    clock.textContent=update.time;
    lastLight=time;
  }
  if (!venue && (!reduced.matches || lastTraffic===-Infinity) && time-lastTraffic>34) {
    drawTraffic(reduced.matches ? 0 : time/1000,lightLevel);
    lastTraffic=time;
  }
  if (!dialog.open && !transition && (vector || route.length)) {
    const target=route[0];
    const move=vector || [target[0]-position[0],target[1]-position[1]];
    const length=Math.hypot(...move);
    const step=Math.min(elapsed*88,vector ? Infinity : length);
    let dx=0,dy=0;
    if (length>.001) {
      const next=[position[0]+move[0]/length*step,position[1]+move[1]/length*step];
      const isPath=venue ? venueWalkable : walkable;
      if (isPath(next)) [dx,dy]=[next[0]-position[0],next[1]-position[1]];
      else if (vector && isPath([next[0],position[1]])) dx=next[0]-position[0];
      else if (vector && isPath([position[0],next[1]])) dy=next[1]-position[1];
      position=[position[0]+dx,position[1]+dy];
    }
    if (target && (!dx && !dy || distance(position,target)<=.05)) route.shift();
    const advance=Math.hypot(dx,dy);
    stride+=advance/11;
    paint(dx,dy,advance>0);
  } else {
    paintAvatar(stride,false);
  }
  run();
}

function setCamera(whole) {
  overview=whole;
  view.dataset.camera=overview?'overview':'walk';
  el('camera').setAttribute('aria-pressed',String(overview));
  el('camera').textContent=overview?'歩く視点へ':'全景を見る';
  centerCamera();
}

function changeVenue(id) {
  if (id===venueId) return;
  if (!venue) streetReturn={position:[...position],overview};
  movement.reset();
  route=[];
  venueId=id;
  venue=venues[id] ?? null;
  position=[...(venue ? venueSpawn : streetReturn.position)];
  el('district-scene').hidden=Boolean(venue);
  venuePhoto.hidden=!venue;
  if (venue) {
    venuePhoto.src=venue.image;
    venuePhoto.alt=venue.alt;
    world.dataset.venue=id;
  } else delete world.dataset.venue;
  el('leave-venue').hidden=!venue;
  view.setAttribute('aria-label',`${venue?.title ?? '近未来街区'}。方向パッド、矢印キー、床のタップで歩けます。`);
  priorTarget=null;
  renderLocations();
  setCamera(venue ? view.clientWidth>=770 : streetReturn.overview);
  paint(0,-1);
  view.focus({preventScroll:true});
}

function setLighting(mode) {
  lighting=mode;
  el('lighting').textContent='光景 '+{auto:'自動',dusk:'夕景',night:'夜景'}[lighting];
  lastLight=lastTraffic=-Infinity;
  run();
}

function openPlace() {
  if (!nearby || transition || dialog.open) return;
  route=[];
  movement.reset();
  if (venue) {
    if (nearby==='counter') spotStatus.textContent='コーヒーを受け取りました。窓辺の読書席に、誰かのしおりが置いてあります。';
    if (nearby==='reading') {
      spotStatus.textContent='しおりの裏に、小さく部屋番号が書かれていました。マンションの掲示板に手がかりがありそうです。';
      showPlaceLink(cafeStory);
    }
    if (nearby==='bench') spotStatus.textContent='水盤に映る光を眺めて、ひと休みしました。右奥のデッキからは街全体を見渡せます。';
    if (nearby==='lookout') {
      setLighting(lighting==='night'?'dusk':'night');
      spotStatus.textContent=lighting==='night' ? '夜景。窓明かりと駅の光が運河に映っています。' : '夕景。塔の向こうに夕方の空が残っています。';
    }
    return;
  }
  const place=places[nearby];
  if (place.venue) {
    history.pushState({dioramaVenue:place.venue},'');
    changeVenue(place.venue);
    return;
  }
  if (place.link) {
    transition=true;
    const veil=el('passage');
    veil.textContent=nearby==='gate'?'クリエイターエリアへ':'Atelier Towerへ';
    veil.hidden=false;
    if (reduced.matches) location.assign(place.link);
    else setTimeout(()=>location.assign(place.link),510);
    return;
  }
  el('place-title').textContent=place.label;
  el('place-description').textContent=place.description;
  dialog.showModal();
}

visit.addEventListener('click',openPlace);
guide.addEventListener('click',event=>{
  const destination=event.target.closest('[data-head-to]');
  if (destination) goTo((venue?.spots ?? places)[destination.dataset.headTo].point);
});
el('leave-venue').addEventListener('click',()=>{
  if (history.state?.dioramaVenue) history.back();
  else changeVenue('');
});
window.addEventListener('popstate',event=>changeVenue(Object.hasOwn(venues,event.state?.dioramaVenue) ? event.state.dioramaVenue : ''));
root.addEventListener('keydown',event=>{
  if (!event.repeat && !event.target.closest('button,a,dialog') && ['e','enter'].includes(event.key.toLowerCase())) {
    event.preventDefault();
    openPlace();
  }
});
view.addEventListener('click',event=>{
  if (event.target.closest('button')) return;
  const rect=view.getBoundingClientRect();
  goTo([(event.clientX-rect.left-camera.x)/camera.scale,(event.clientY-rect.top-camera.y)/camera.scale]);
  view.focus({preventScroll:true});
});
el('camera').addEventListener('click',()=>setCamera(!overview));
el('lighting').addEventListener('click',()=>setLighting({auto:'dusk',dusk:'night',night:'auto'}[lighting]));
document.addEventListener('visibilitychange',()=>{
  if (document.hidden) {movement.reset();route=[];}
  else run();
});
window.addEventListener('pagehide',()=>{
  active=false;
  movement.reset();
  route=[];
  cancelAnimationFrame(frame);
  frame=lastTick=0;
});
window.addEventListener('pageshow',()=>{
  active=true;
  transition=false;
  el('passage').hidden=true;
  run();
});
const resize=new ResizeObserver(centerCamera);
resize.observe(view);
renderLocations();
setCamera(view.clientWidth>=840);
if (Object.hasOwn(venues,history.state?.dioramaVenue)) changeVenue(history.state.dioramaVenue);
paint(0,arrival==='tower' ? -1 : 0);
run();
