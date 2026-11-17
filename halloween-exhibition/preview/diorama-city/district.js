import { makeWalkPad, bindWalking } from './walk-controls.js?v=1';
import { hostWalker, residentWalker } from './host-avatar.js?v=2';
import { applyDistrictLight } from './scene-time.js?v=1';
import { distance, streetAreas, walkable, walkingRoute } from './paths.js?v=4';
import { districtTraffic } from './traffic.js?v=1';
import { cafeStory, venues, venueSpawn, venueWalkable } from './venues.js?v=3';
import { bindActivities, playgroundPose } from './district-activities.js?v=1';
import { bindSpotIllustration } from './spot-illustration.js?v=2';
import { TOWER_API, OWNER_STORAGE, avatarImageUrl, readWalkDraft } from '../../../tower/avatar-travel.js?v=1';

const el=id=>document.getElementById(id);
const root=el('district'), view=el('city-view'), world=el('city-world'), citizen=el('citizen');
const pad=makeWalkPad(), clock=el('clock'), dialog=el('place-dialog'), visit=el('visit');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let paintAvatar=hostWalker(citizen.querySelector('img'));
const drawTraffic=districtTraffic(el('transit'));
const currentUrl=new URL(location.href);
const areaId=currentUrl.searchParams.get('area')==='canal' ? 'canal' : 'tower';
const area=streetAreas[areaId], places=area.places;
const arrival=currentUrl.searchParams.get('arrival');
const spawn=Object.hasOwn(area.arrivals,arrival) ? area.arrivals[arrival] :
  (areaId==='canal' ? area.arrivals.station : area.arrivals.gate);
const towerHome=new URL('../../../tower/?from=diorama', location.href);
const onDraft=currentUrl.searchParams.get('walker')==='draft' ? readWalkDraft() : null;
let owner;
try {owner=JSON.parse(localStorage.getItem(OWNER_STORAGE));} catch {}
const visitTower=new URL(towerHome);
if (onDraft) {
  visitTower.searchParams.set('resume','walk');
  visitTower.hash='prompt-import';
}
let position=[...spawn], stride=0, vector=null, route=[], active=true, transition=false, overview=false;
let camera={x:0,y:0,scale:1};
let lighting='auto', lightLevel=.3, lastLight=-Infinity, lastTraffic=-Infinity;
let frame=0, lastTick=0, nearby='', priorTarget='';
let venueId='', venue=null, directions=[], motion=null;
const visits=new Map();
const spotStatus=el('place-note'), placeLink=el('place-link');
const controls=el('locations'), venuePhoto=el('venue-plate'), guide=el('venue-guide');
const streetGuide=[...guide.children];
const activityDialog=el('activity-dialog'), spotDialog=el('spot-dialog'), spotButton=el('spot-prompt');
const motionControls=el('motion-controls'), pump=el('pump-swing');
const activities=bindActivities(activityDialog,{
  avatar:()=>citizen.querySelector('canvas:not([hidden]), img:not([hidden])'),
  status:text=>{spotStatus.textContent=text;},
});
const showSpotPrompt=bindSpotIllustration(spotDialog);
const blocked=()=>transition || Boolean(motion) || dialog.open || activityDialog.open || spotDialog.open;

if (area.image) {
  const art=el('city-plate');
  art.src=area.image;
  art.alt=area.alt;
  el('district-title').textContent=area.title;
  world.dataset.area=areaId;
  document.title=`${area.title}｜Atelier Tower`;
}

async function chooseWalker() {
  let actor;
  const roomLink=new URL(visitTower);
  if (onDraft) {
    actor={ source:onDraft.avatar.source, atlas:onDraft.avatar.atlas, name:onDraft.name || onDraft.noteId };
  } else {
    const roomId=currentUrl.searchParams.get('resident') || owner?.id;
    if (!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(roomId ?? '')) return;
    const endpoint=new URL(TOWER_API);
    endpoint.search=new URLSearchParams({view:'room',id:roomId});
    const response=await fetch(endpoint,{cache:'no-store',signal:AbortSignal.timeout(8500)});
    if (!response.ok) return;
    const room=await response.json();
    if (room.design?.avatarMode!=='custom' || !room.avatarVersion) return;
    actor={source:avatarImageUrl(roomId,room.avatarVersion), atlas:room.design.world?.atlas,
      name:room.design.avatarName || room.profile.name || room.noteId};
    roomLink.searchParams.set('room',roomId);
  }
  const image=new Image();
  image.alt=actor.name;
  image.draggable=false;
  image.src=actor.source;
  await image.decode();
  citizen.replaceChildren(image);
  paintAvatar=actor.atlas ? residentWalker(image) : (_stride,_moving,dx) => {
    if (dx) image.style.transform=`scaleX(${dx<0?-1:1})`;
  };
  paintAvatar(stride,false);
  el('walker-name').textContent=actor.name;
  const link=el('walker-room');
  link.href=roomLink.href;
  link.textContent=onDraft ? '部屋の下見に戻る' : '自分の部屋に戻る';
}

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
  guide.setAttribute('aria-label',`${venue?.title ?? area.title}の行き先`);
  if (venue || areaId==='canal') guide.replaceChildren(...directions.map(([id,place])=>{
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
  const focus=motion?.pose ?? position;
  const x=bound(width,1000*scale,focus[0],.5);
  const y=bound(height,667*scale,focus[1],.66);
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
  el('place-name').textContent=place?.label ?? venue?.title ?? area.title;
  spotStatus.textContent=nearby==='gate' ? '結界は創り手の街区につながっています。' :
    nearby==='tower' ? '見学室とフロア案内はマンションの中にあります。' :
    venue?.note ?? '道をタップすると歩いて向かいます。';
  visit.textContent=place?.action ?? '近くを調べる';
  visit.disabled=!nearby;
  spotButton.hidden=!(place || venue);
  for (const pin of controls.children) pin.classList.toggle('near',pin.dataset.location===nearby);
  showPlaceLink();
}

function actorHeight(y) {
  return venue ? venue.scale[0]+(y-451)*venue.scale[1] : Math.max(13,8+y*.065);
}

function drawWalker(point,dx,dy,moving=false) {
  citizen.style.left=point[0]+'px';
  citizen.style.top=point[1]+'px';
  citizen.dataset.position=point.map(n=>n.toFixed(1)).join(',');
  citizen.style.setProperty('--actor-height',`${actorHeight(point[1]).toFixed(1)}px`);
  paintAvatar(stride,moving,dx,dy);
}
function paint(dx=0,dy=0,moving=false) {
  drawWalker(position,dx,dy,moving);
  centerCamera();
  updateLocation();
}
function goTo(point) {
  if (blocked()) return;
  const next=venue ? (venueWalkable(point) ? [point] : []) : walkingRoute(position,point,area);
  if (!next.length) return;
  vector=null;
  route=next;
  run();
}
const movement=bindWalking(root,pad,{
  blocked,
  change(value) {
    vector=value;
    if (vector) route=[];
    if (vector) run();
  },
  step([dx,dy]) {goTo([position[0]+dx*20,position[1]+dy*20]);},
});

function finishMotion(exit) {
  const current=motion;
  const restoreFocus=motionControls.contains(document.activeElement);
  motion=null;
  motionControls.hidden=true;
  delete view.dataset.playing;
  visit.disabled=!nearby;
  spotButton.disabled=false;
  delete citizen.dataset.seated;
  citizen.style.removeProperty('--actor-tilt');
  if (exit) position=exit;
  paint(0,1);
  if (restoreFocus) view.focus({preventScroll:true});
  spotStatus.textContent=current.kind==='swing' ?
    'ブランコから降りました。運河のほうから風が吹いてきます。' : '滑り台から降りました。';
}

function startMotion(kind) {
  motion={kind, started:performance.now(), origin:[...position], pumps:0};
  if (reduced.matches) {
    finishMotion(playgroundPose(motion,motion.started+10000).exit);
    return;
  }
  visit.disabled=true;
  spotButton.disabled=true;
  motionControls.hidden=false;
  view.dataset.playing=kind;
  pump.hidden=kind!=='swing';
  pump.disabled=false;
  spotStatus.textContent=kind==='swing' ? 'ブランコに乗りました。「もうひとこぎ」で振れ幅が大きくなります。' :
    '階段を上って、青い滑り台をすべります。';
  (kind==='swing' ? pump : el('end-motion')).focus({preventScroll:true});
}

function animateMotion(time) {
  const { pose, seated, tilt=0, facing, done, exit }=playgroundPose(motion,time);
  if (done) {finishMotion(exit);return;}
  if (motion.pose && !seated) stride+=distance(motion.pose,pose)/13;
  motion.pose=pose;
  citizen.dataset.seated=String(Boolean(seated));
  citizen.style.setProperty('--actor-tilt',tilt+'deg');
  drawWalker(pose,...facing,!seated);
  centerCamera();
}

function run() {
  if (!frame && active && !document.hidden) frame=requestAnimationFrame(tick);
}
function tick(time) {
  frame=0;
  if (!active || document.hidden) {lastTick=0;return;}
  const elapsed=lastTick ? Math.min(.12,(time-lastTick)/1000) : .016;
  lastTick=time;
  if (time-lastLight>650) {
    const update=applyDistrictLight(root,lighting);
    lightLevel=update.night;
    root.style.setProperty('--deep-night',String(Math.max(0,(lightLevel-.72)/.28)));
    clock.textContent=update.time;
    lastLight=time;
  }
  if (!venue && areaId==='tower' && (!reduced.matches || lastTraffic===-Infinity) && time-lastTraffic>34) {
    drawTraffic(reduced.matches ? 0 : time/1000,lightLevel);
    lastTraffic=time;
  }
  if (motion) animateMotion(time);
  else if (!blocked() && (vector || route.length)) {
    const target=route[0];
    const move=vector || [target[0]-position[0],target[1]-position[1]];
    const length=Math.hypot(...move);
    const step=Math.min(elapsed*88,vector ? Infinity : length);
    let dx=0,dy=0;
    if (length>.001) {
      const next=[position[0]+move[0]/length*step,position[1]+move[1]/length*step];
      const isPath=venue ? venueWalkable : point=>walkable(point,area);
      if (isPath(next)) [dx,dy]=[next[0]-position[0],next[1]-position[1]];
      else if (vector && isPath([next[0],position[1]])) dx=next[0]-position[0];
      else if (vector && isPath([position[0],next[1]])) dy=next[1]-position[1];
      position=[position[0]+dx,position[1]+dy];
    }
    if (target && (!dx && !dy || distance(position,target)<=.05)) route.shift();
    const advance=Math.hypot(dx,dy);
    stride+=advance/(venue ? 13 : Math.max(8,actorHeight(position[1])*.25));
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
  if (motion) finishMotion();
  for (const open of [dialog,activityDialog,spotDialog]) if (open.open) open.close();
  visits.set(venueId,{position:[...position],overview});
  movement.reset();
  route=[];
  venueId=id;
  venue=venues[id] ?? null;
  const last=visits.get(id);
  position=[...(last?.position ?? (venue ? venueSpawn : spawn))];
  el('district-scene').hidden=Boolean(venue);
  venuePhoto.hidden=!venue;
  if (venue) {
    venuePhoto.src=venue.image;
    venuePhoto.alt=venue.alt;
    world.dataset.venue=id;
  } else delete world.dataset.venue;
  const leave=el('leave-venue');
  leave.hidden=!venue;
  leave.textContent=venue?.parent ? '← 公園に戻る' : '← 街に戻る';
  el('district-title').textContent=venue?.title ?? area.title;
  view.setAttribute('aria-label',`${venue?.title ?? area.title}。方向パッド、矢印キー、床のタップで歩けます。`);
  priorTarget=null;
  renderLocations();
  setCamera(last?.overview ?? view.clientWidth>=770);
  paint(0,-1);
  if (window.scrollY) window.scrollTo(0,0);
  view.focus({preventScroll:true});
}

function enterVenue(id) {
  history.pushState({dioramaVenue:id},'');
  changeVenue(id);
}

function setLighting(mode) {
  lighting=mode;
  el('lighting').textContent='光景 '+{auto:'自動',dusk:'夕景',night:'夜景'}[lighting];
  lastLight=lastTraffic=-Infinity;
  run();
}

function openPlace() {
  if (!nearby || blocked()) return;
  route=[];
  movement.reset();
  const place=(venue?.spots ?? places)[nearby];
  if (place.venue) {
    enterVenue(place.venue);
    return;
  }
  if (venue) {
    if (place.shelf) activities.openShelf(place.shelf,place.label);
    if (place.ride) activities.openRide(place.ride,place.label);
    if (place.motion) startMotion(place.motion);
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
  if (place.link || place.cross) {
    const destination=place.cross ? new URL(currentUrl) : new URL(nearby==='tower' ? visitTower : place.link,location.href);
    if (place.cross) {
      destination.searchParams.delete('spot');
      if (place.cross.area==='tower') destination.searchParams.delete('area');
      else destination.searchParams.set('area',place.cross.area);
      destination.searchParams.set('arrival',place.cross.arrival);
    }
    transition=true;
    const veil=el('passage');
    veil.textContent=place.cross ? `${streetAreas[place.cross.area].title}へ` : nearby==='gate'?'クリエイターエリアへ':'Atelier Towerへ';
    veil.hidden=false;
    if (reduced.matches) location.assign(destination);
    else setTimeout(()=>location.assign(destination),510);
    return;
  }
  el('place-title').textContent=place.label;
  el('place-description').textContent=place.description;
  dialog.showModal();
}

function openSpot() {
  if (blocked()) return;
  const place=(venue?.spots ?? places)[nearby];
  const setting=venues[place?.venue] ?? venue;
  const label=setting && place && !place.venue ? `${setting.title}・${place.label}` : setting?.title ?? place?.label;
  if (!label) return;
  route=[];
  movement.reset();
  const scene=place?.scene ?? (place?.venue ? setting.scene : place?.description) ?? setting?.scene ??
    `雨上がりの${place.label}。街の灯りを受けた石畳を歩く主人公を斜め前から描く。`;
  const href=new URL(currentUrl.pathname,currentUrl);
  if (areaId==='canal') href.searchParams.set('area',areaId);
  href.searchParams.set('spot',place?.venue || [venueId || 'street',nearby].filter(Boolean).join('.'));
  const shopping=activities.shoppingMemory(place?.shelf);
  showSpotPrompt({
    label, scene:shopping ? scene+' '+shopping : scene, href:href.href, id:onDraft?.noteId || owner?.noteId,
  });
}

function arriveAtSpot() {
  const [building,key]=currentUrl.searchParams.get('spot')?.split('.') ?? [];
  if (building==='street' && Object.hasOwn(places,key)) {
    position=[...places[key].point];
    return;
  }
  if (!Object.hasOwn(venues,building)) return;
  const entry=Object.values(places).find(place=>place.venue===(venues[building].parent ?? building));
  if (!entry) return;
  position=[...entry.point];
  history.replaceState({dioramaVenue:building,inline:true},'');
  changeVenue(building);
  if (Object.hasOwn(venue.spots,key)) position=[...venue.spots[key].point];
}

visit.addEventListener('click',openPlace);
spotButton.addEventListener('click',openSpot);
pump.addEventListener('click',()=>{
  if (motion?.kind!=='swing') return;
  motion.pumps+=1;
  pump.disabled=motion.pumps>=5;
});
el('end-motion').addEventListener('click',()=>{
  if (motion) finishMotion();
});
guide.addEventListener('click',event=>{
  const destination=event.target.closest('[data-head-to]');
  if (!destination) return;
  goTo((venue?.spots ?? places)[destination.dataset.headTo].point);
  if (window.scrollY) window.scrollTo(0,0);
});
el('leave-venue').addEventListener('click',()=>{
  if (history.state?.dioramaVenue && !history.state.inline) history.back();
  else {
    const target=venue?.parent || '';
    history.replaceState({dioramaVenue:target,inline:true},'');
    changeVenue(target);
  }
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
else if (!history.state?.inline) arriveAtSpot();
paint(0,arrival==='tower' ? -1 : 0);
void chooseWalker().catch(()=>{});
run();
