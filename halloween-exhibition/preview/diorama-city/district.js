import { decodeArtwork } from '../../../tower/public-directory.js?v=20261119-review';
import {streetResidents} from './residents.js?v=20261119-scene';
import { areaFor, firstScene, sceneArt } from './scene-entry.js?v=20261119-scene';
import { canWalkFloorSegment, facilityRoute } from '../../../tower/facility-floors.js?v=20261118-city2';
import { makeWalkPad, bindWalking } from './walk-controls.js?v=202611181820';
import { avatarSnapshot, hostWalker, autoResidentWalker } from './host-avatar.js?v=20261119-scene';
import { applyDistrictLight } from './scene-time.js?v=1';
import { distance, streetAreas, walkable, walkingRoute } from './paths.js?v=20261119-scene';
import { districtTraffic } from './traffic.js?v=202611181820';
import { cafeStory, venues, venueSpawn, venueFloor } from './venues.js?v=20261118-city2';
import { vehicleStudio } from '../../../tower/vehicle-studio.js?v=20261119-scene';
import { bindActivities, createCityVisit, playgroundPose } from './district-activities.js?v=20261119-scene';
import { bindSpotIllustration } from './spot-illustration.js?v=20261120-spot-series';
import { districtCamera, exteriorHeight } from './camera.js?v=20261118';
import { TOWER_API, OWNER_STORAGE, readWalkDraft, draftTraveler, visitor, residentTraveler, hasRoomKey, createPlayerSession } from '../../../tower/avatar-travel.js?v=20261119-scene';
import { initGameShell } from '../../../tower/game-shell.js?v=20261118-controls';

const gameShell=initGameShell({page:'city'});

const el=id=>document.getElementById(id);
const root=el('district'), view=el('city-view'), world=el('city-world'), citizen=el('citizen');
const pad=makeWalkPad(), clock=el('clock'), dialog=el('place-dialog'), visit=el('visit');
let paintAvatar=()=>{};
const drawTraffic=districtTraffic(el('transit'));
let currentUrl=new URL(location.href);
// Old shared links still open their destination. The local player comes from this device.
if(currentUrl.searchParams.has('resident')){
  currentUrl.searchParams.delete('resident');
  history.replaceState(history.state,'',currentUrl);
}
let areaId=areaFor(currentUrl);
let area=streetAreas[areaId], places=area.places;
const arrival=currentUrl.searchParams.get('arrival');
function arrivalPoint(key) {
  return Object.hasOwn(area.arrivals,key) ? area.arrivals[key] : (areaId==='canal' ? area.arrivals.station : area.arrivals.gate);
}
let spawn=arrivalPoint(arrival);
const towerHome=new URL('../../../tower/?from=diorama', location.href);
let owner;
try {owner=JSON.parse(localStorage.getItem(OWNER_STORAGE));} catch {}
const player=createPlayerSession(()=>owner);
const localDraft=readWalkDraft();
const onDraft=(!hasRoomKey(owner) || (currentUrl.searchParams.get('walker')==='draft' && localDraft?.noteId===owner.noteId)) ? localDraft : null;
window.addEventListener('storage',event=>{if(event.key===OWNER_STORAGE || event.key===null) location.reload();});
const visitTower=new URL(towerHome);
if (onDraft) {
  visitTower.searchParams.set('resume','walk');
  visitTower.hash='prompt-import';
}
let position=[...spawn], stride=0, vector=null, route=[], active=true, transition=false, overview=false;
let camera={x:0,y:0,scale:1};
let lighting='auto', lightLevel=.3, lastLight=-Infinity, lastTraffic=-Infinity, trafficSeconds=0;
let frame=0, lastTick=0, nearby='', priorTarget='';
let venueId='', venue=null, directions=[], motion=null;
let scenePending=false, sceneRequest=0, currentBackdrop;
const visits=new Map();
const spotStatus=el('place-note'), placeLink=el('place-link');
const controls=el('locations'), guide=el('venue-guide');
const defaultStreetAlt=el('city-plate').alt;
const streetGuide=[...guide.children];
const activityDialog=el('activity-dialog'), spotDialog=el('spot-dialog'), spotButton=el('spot-prompt');
const motionControls=el('motion-controls'), pump=el('pump-swing');
const reflections=el('mirror-reflections'), destinations=el('destination-menu');
const seatedFrame=document.createElement('canvas');
seatedFrame.className='pose-frame';
seatedFrame.setAttribute('aria-hidden','true');
seatedFrame.hidden=true;
citizen.append(seatedFrame);
const actorFrame=()=>citizen.querySelector('canvas:not(.pose-frame):not([hidden]), img:not([hidden])');
let visitStorage;
try { visitStorage=window.sessionStorage; } catch { /* A private walk still works in memory. */ }
const traveller=onDraft ? 'draft.'+onDraft.noteId : hasRoomKey(owner) ? owner.id : 'guest';
const journey=createCityVisit(visitStorage,traveller);
const activities=bindActivities(activityDialog,{
  journey,
  openArticle:()=>openSpot(true),
  motionAllowed:gameShell.motionAllowed,
  avatar:pose=>{
    paintAvatar(stride,false,pose==='saddle'?-1:0,pose==='saddle'?0:1);
    return avatarSnapshot(actorFrame(),pose,{host:activeSpotActor?.host===true});
  },
  status:text=>{spotStatus.textContent=text;},
});
const showSpotPrompt=bindSpotIllustration(spotDialog);
const blocked=()=>transition || scenePending ||
  (Boolean(root.dataset.walkerState)&&root.dataset.walkerState!=='ready') ||
  Boolean(motion) || Boolean(document.querySelector('dialog[open]'));
document.addEventListener('atelier:menu-open',()=>{vector=null;route=[];});

function warmDestination(place) {
  if(!place || navigator.connection?.saveData || /(^|-)2g$/.test(navigator.connection?.effectiveType || ''))return;
  const source=place.venue ? venues[place.venue].image : place.cross ? streetAreas[place.cross.area].image : place.image;
  if(source)sceneArt(source,'low');
}

async function loadBackdrop(id, source, alt) {
  const request=++sceneRequest;
  currentBackdrop={id,source,alt};
  const message=el('scene-load-status'), retry=el('retry-scene');
  const item=sceneArt(source,'high'), image=item.image, previous=el(id);
  if(previous!==image){
    image.className=previous.className;
    image.width=previous.width; image.height=previous.height;
    image.id=id;
    image.hidden=false;
    const slot=previous.closest('picture') || previous;
    slot.replaceWith(item.frame);
  }
  image.alt=alt;
  message.textContent='風景を読み込んでいます…';
  message.hidden=item.decoded;
  retry.hidden=true;
  scenePending=!item.decoded;
  if(item.decoded)return;
  let timer;
  try {
    await Promise.race([item.ready,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('timeout')),12000);})]);
    if(request===sceneRequest)message.hidden=true;
  } catch {
    if(request!==sceneRequest)return;
    item.discard();
    message.textContent='風景を読み込めませんでした。再読み込みできます。';
    retry.hidden=false;
  } finally {
    clearTimeout(timer);
    if(request===sceneRequest)scenePending=false;
  }
}
el('retry-scene').addEventListener('click',()=>{
  if(currentBackdrop)void loadBackdrop(currentBackdrop.id,currentBackdrop.source,currentBackdrop.alt);
});

function showStreet() {
  if(!el('shopfront-art').hasAttribute('src'))el('shopfront-art').src='./assets/shopfronts.webp';
  streetPeople.scene(area,false);
  void loadBackdrop('city-plate',area.image,area.alt || defaultStreetAlt);
  if(areaId==='tower'){
    for(const image of world.querySelectorAll('.city-cast img[data-src]')){
      image.src=image.dataset.src;
      image.removeAttribute('data-src');
    }
  }
}
function setAreaInfo() {
  el('district-title').textContent=area.title;
  world.dataset.area=areaId;
  document.title=area.title+'｜Atelier Tower';
}
setAreaInfo();

const streetPeople=streetResidents(el('street-residents'),el('street-roster'));
let activeSpotActor=null, walkerRequest=0;
async function chooseWalker() {
  const request=++walkerRequest;
  let actor=draftTraveler(onDraft) || visitor, keyNotice='';
  citizen.hidden=true;
  root.dataset.walkerState='loading';
  el('retry-walker').hidden=true;
  if(!onDraft && hasRoomKey(owner)){
    el('walker-name').textContent='部屋の鍵を確認中…';
    try{
      const room=await player.load();
      if(room) actor=residentTraveler(room);
      else keyNotice='部屋の鍵を確認できません。本人の部屋で鍵を再発行できます。';
    }catch{throw new Error('部屋の鍵を確認できませんでした。');}
  }
  if(request!==walkerRequest)return;
  activeSpotActor=actor;
  showSpotPrompt.updateActor(actor);
  const image=new Image();
  image.alt=actor.name;image.draggable=false;
  if(actor.source===visitor.source) image.className='visitor-art';
  if(actor.custom && actor.source.startsWith(TOWER_API))image.crossOrigin='anonymous';
  image.src=actor.source;
  let timer;
  try{
    await Promise.race([decodeArtwork(image),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('walker')),12000);})]);
  }finally{clearTimeout(timer);}
  if(request!==walkerRequest)return;
  streetPeople.setPlayer(actor.id || '');
  citizen.replaceChildren(image,seatedFrame);
  paintAvatar=actor.host ? hostWalker(image) : autoResidentWalker(image,{atlas:actor.atlas});
  paintAvatar(stride,false);
  if(paintAvatar.ready){
    try{
      const visible=await Promise.race([paintAvatar.ready,new Promise(resolve=>{timer=setTimeout(()=>resolve(false),12000);})]);
      if(!visible)throw new Error('歩行画像を準備できませんでした。');
    }finally{clearTimeout(timer);}
  }
  if(request!==walkerRequest)return;
  el('walker-name').textContent=actor.name+(keyNotice?' · '+keyNotice:'');
  const link=el('walker-room'),home=new URL(visitTower);
  if(actor.id)home.searchParams.set('room',actor.id);
  else if(!onDraft){home.search='';home.hash='prompt-play';}
  link.href=home.href;link.textContent=actor.id?'自分の部屋に戻る':onDraft?'部屋の下見に戻る':'自分のアバターをつくる';
  root.dataset.walkerState='ready';
  citizen.hidden=false;
  el('retry-walker').hidden=!keyNotice;
}

function failedWalker() {
  root.dataset.walkerState='error';
  el('walker-name').textContent='アバターを読み込めませんでした';
  el('retry-walker').hidden=false;
}
el('retry-walker').addEventListener('click',()=>void chooseWalker().catch(failedWalker));

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
      else {warmDestination(place);goTo(place.point);}
    });
    pin.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')warmDestination(place);},{once:true});
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

function centerCamera(elapsed=1) {
  const width=view.clientWidth,height=view.clientHeight;
  if (!width || !height) return;
  const focus=motion?.pose ?? position;
  const target=districtCamera({width,height,position:focus,overview,inside:Boolean(venue)});
  if (view.dataset.scale && camera.scale===target.scale &&
      Math.abs(target.x-camera.x)<.02 && Math.abs(target.y-camera.y)<.02) return;
  const follow=1-Math.exp(-Math.max(0,elapsed)*16);
  camera={x:camera.x+(target.x-camera.x)*follow,y:camera.y+(target.y-camera.y)*follow,scale:target.scale};
  world.style.transform=`translate(${camera.x.toFixed(2)}px,${camera.y.toFixed(2)}px) scale(${camera.scale.toFixed(4)})`;
  world.style.setProperty('--world-scale',String(camera.scale));
  world.style.setProperty('--marker-scale',String(1/camera.scale));
  view.dataset.scale=camera.scale.toFixed(4);
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
  return venue ? venue.scale[0]+(y-451)*venue.scale[1] : exteriorHeight(y);
}

function drawWalker(point,dx,dy,moving=false,groundY=point[1]) {
  citizen.style.left=point[0]+'px';
  citizen.style.top=point[1]+'px';
  citizen.dataset.position=point.map(n=>n.toFixed(1)).join(',');
  citizen.style.setProperty('--actor-height',`${actorHeight(groundY).toFixed(1)}px`);
  paintAvatar(stride,moving,dx,dy);
}
function paint(dx=0,dy=0,moving=false) {
  drawWalker(position,dx,dy,moving);
  updateLocation();
}
function goTo(point) {
  if (blocked()) return;
  const next=venue ? facilityRoute(venueFloor(venue),position,point) : walkingRoute(position,point,area);
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
  seatedFrame.hidden=true;
  citizen.style.removeProperty('--actor-tilt');
  if (exit) position=exit;
  paint(0,1);
  if (restoreFocus) view.focus({preventScroll:true});
  spotStatus.textContent=current.kind==='swing' ? 'ブランコから降りました。運河のほうから風が吹いてきます。' :
    current.kind==='bench' ? 'ベンチから立ち上がりました。' : '滑り台から降りました。';
}

function startMotion(kind) {
  motion={kind, started:0, elapsed:0, origin:[...position], pumpTimes:[]};
  if (!gameShell.motionAllowed()) {
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
    kind==='bench' ? 'ベンチに腰をかけました。' :
    '階段を上って、青い滑り台をすべります。';
  (kind==='swing' ? pump : el('end-motion')).focus({preventScroll:true});
}

function animateMotion(time) {
  const { pose, seated, tilt=0, facing, done, exit, groundY }=playgroundPose(motion,time);
  if (done) {finishMotion(exit);return;}
  if (motion.pose && !seated) stride+=distance(motion.pose,pose)/13;
  motion.pose=pose;
  citizen.dataset.seated=String(Boolean(seated));
  citizen.style.setProperty('--actor-tilt',tilt+'deg');
  drawWalker(pose,...facing,!seated,groundY);
  if (seated && seatedFrame.hidden) {
    const poseImage=avatarSnapshot(actorFrame(),'sit',{host:activeSpotActor?.host===true});
    if (poseImage) {
      seatedFrame.dataset.poseArt=poseImage.dataset.poseArt;
      seatedFrame.width=poseImage.width;
      seatedFrame.height=poseImage.height;
      seatedFrame.getContext('2d').drawImage(poseImage,0,0);
      seatedFrame.hidden=false;
    }
  }
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
  if(!venue)streetPeople.tick(elapsed,gameShell.motionAllowed()&&!document.querySelector('dialog[open]'));
  if(!venue&&areaId==='tower'){
    const drive=gameShell.motionAllowed()&&!document.querySelector('dialog[open]');
    if(drive)trafficSeconds+=elapsed;
    if((drive||lastTraffic===-Infinity)&&time-lastTraffic>34){
      drawTraffic(trafficSeconds,lightLevel);
      lastTraffic=time;
    }
  }
  if (motion) {
    if (!gameShell.motionAllowed()) finishMotion(playgroundPose(motion,10000).exit);
    else if (!document.querySelector('dialog[open]')) {
      motion.elapsed+=elapsed;
      animateMotion(motion.elapsed*1000);
    }
  }
  else if (!blocked() && (vector || route.length)) {
    const target=route[0];
    const move=vector || [target[0]-position[0],target[1]-position[1]];
    const length=Math.hypot(...move);
    const step=Math.min(elapsed*88*gameShell.preferences.speed,vector ? Infinity : length);
    let dx=0,dy=0;
    if (length>.001) {
      const next=[position[0]+move[0]/length*step,position[1]+move[1]/length*step];
      const isPath=point=>venue ? canWalkFloorSegment(venueFloor(venue),position,point) : walkable(point,area);
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
  centerCamera(elapsed);
  run();
}

function setCamera(whole) {
  overview=whole;
  view.dataset.camera=overview?'overview':'walk';
  el('camera').setAttribute('aria-pressed',String(overview));
  el('camera').textContent=overview?'歩く視点へ':'全景を見る';
  centerCamera();
}

function changeVenue(id, districtArrival) {
  if (id===venueId && !districtArrival) return;
  if (motion) finishMotion();
  for (const open of [dialog,activityDialog,spotDialog,el('shop-dialog')]) if (open.open) open.close();
  if(!districtArrival)visits.set(areaId+':'+venueId,{position:[...position],overview});
  movement.reset();
  route=[];
  venueId=id;
  venue=venues[id] ?? null;
  const last=districtArrival || visits.get(areaId+':'+id);
  position=[...(last?.position ?? (venue ? venueSpawn : spawn))];
  el('district-scene').hidden=Boolean(venue);
  el('venue-plate').hidden=!venue;
  if (venue) {
    streetPeople.scene(area,true);
    void loadBackdrop('venue-plate',venue.image,venue.alt);
    if(id==='mirrorRoom')activities.restoreGlass(showReflections);
    world.dataset.venue=id;
  } else {
    delete world.dataset.venue;
    showStreet();
  }
  const leave=el('leave-venue');
  leave.hidden=!venue;
  el('shop-directory').hidden=Boolean(venue);
  leave.textContent=venue?.parent==='manor' ? '← 屋敷の外に戻る' : venue?.parent ? '← 公園に戻る' : '← 街に戻る';
  el('district-title').textContent=venue?.title ?? area.title;
  view.setAttribute('aria-label',`${venue?.title ?? area.title}。方向パッド、矢印キー、床のタップで歩けます。`);
  priorTarget=null;
  renderLocations();
  setCamera(last?.overview ?? false);
  paint(0,-1);
  if (window.scrollY) window.scrollTo(0,0);
  view.focus({preventScroll:true});
}

function switchDistrict(url, saved) {
  areaId=areaFor(url);
  currentUrl=url;
  area=streetAreas[areaId];
  places=area.places;
  spawn=arrivalPoint(url.searchParams.get('arrival'));
  setAreaInfo();
  lastTraffic=-Infinity;
  changeVenue('',saved || {position:spawn,overview:false});
}

function enterVenue(id) {
  history.pushState({dioramaVenue:id},'');
  changeVenue(id);
}

const shops=el('shop-dialog');
el('shop-directory').addEventListener('click',()=>{
  shops.querySelector('img').src='./assets/shopfronts.webp';
  route=[];movement.reset();shops.showModal();
});
function enterShop(event){
  const door=event.target.closest('[data-shop]');
  if(!door)return;
  const kind=door.dataset.shop,shop=venues.avenueShops.spots[kind];
  if(!shop?.vehicle)return;
  if(shops.open)shops.close();
  history.replaceState({...history.state,streetReturn:{position:[...position],overview}},'');
  const url=new URL(location.href);url.searchParams.set('spot','avenueShops.'+kind);
  history.pushState({dioramaVenue:'avenueShops',shop:kind},'',url);
  currentUrl=url;changeVenue('avenueShops');
  position=[...shop.point];paint(0,-1);centerCamera();
}
shops.addEventListener('click',enterShop);
el('street-shops').addEventListener('click',enterShop);

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
    if (place.vehicle) {
      activities.openVehicle(place.label,vehicleStudio(place.vehicle,{id:activeSpotActor?.noteId}),place.vehicle);
      return;
    }
    if (!(place.ride || nearby==='lookout')) journey.remember(venueId,nearby);
    if (place.shelf) activities.openShelf(place.shelf,place.label);
    if (place.ride) activities.openRide(place.ride,place.label);
    if (place.motion) startMotion(place.motion);
    if (place.lamp) activities.openGlass(place.label,showReflections);
    if (place.reflection) spotStatus.textContent=activities.reflectionStatus();
    if (place.description) showDescription(place);
    if (nearby==='counter') spotStatus.textContent='コーヒーを受け取りました。窓辺の読書席に、誰かのしおりが置いてあります。';
    if (nearby==='reading') {
      spotStatus.textContent='しおりの裏に、小さく部屋番号が書かれていました。マンションの掲示板に手がかりがありそうです。';
      showPlaceLink(cafeStory);
    }
    if (nearby==='bench'&&motion?.kind==='bench') spotStatus.textContent='ベンチに座って水盤に映る光を眺めています。右奥のデッキからは街全体を見渡せます。';
    if (nearby==='lookout') {
      setLighting(lighting==='night'?'dusk':'night');
      journey.remember('park',lighting);
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
    if(place.cross){
      history.replaceState({...history.state,streetReturn:{position:[...position],overview}},'');
      history.pushState({dioramaVenue:''},'',destination);
      switchDistrict(destination);
    } else {
      transition=true;
      const veil=el('passage');
      veil.textContent=nearby==='gate'?'クリエイターエリアへ':'Atelier Towerへ';
      veil.hidden=false;
      location.assign(destination);
    }
    return;
  }
  showDescription(place);
}

function showReflections(colors) {
  [...reflections.children].forEach((ray,index)=>ray.style.setProperty('--glass-light',colors[index]));
  reflections.hidden=false;
}

function showDescription(place) {
  el('place-title').textContent=place.label;
  el('place-description').textContent=place.description;
  const image=dialog.querySelector('.place-image');
  image.src=place.image || venue?.image || area.image;
  image.alt=place.alt || venue?.alt || place.label;
  dialog.showModal();
}

function openSpot(article=false) {
  if (transition || motion || document.querySelector('dialog[open]')) return;
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
  const card=setting?.card ? new URL(setting.card,location.href) : href;
  if (setting?.card && venue && nearby && !place?.venue) card.searchParams.set('point',nearby);
  const settingId=place?.venue || venueId;
  const experience=journey.experience(settingId,place?.venue ? '' : nearby==='lookout' ? '' : nearby);
  const articleScene=place?.articleScene || setting?.articleScene || place?.description || setting?.alt || label;
  showSpotPrompt({
    label, scene, experience, articleScene, article:article===true,
    href:card.href, id:activeSpotActor?.noteId || '',
    vehicles:activeSpotActor?.vehicles,vehiclePlace:place?.vehicle,
    occupied:Boolean(activeSpotActor?.id && player.room?.id===activeSpotActor.id),
    avatarSource:activeSpotActor?.custom||activeSpotActor?.profile||activeSpotActor?.host ? activeSpotActor.source : null,
    backgroundUrl:new URL(place?.image||setting?.image||area.image,location.href).href,
  });
}

visit.addEventListener('click',openPlace);
spotButton.addEventListener('click',()=>openSpot());
el('place-create').addEventListener('click',()=>{dialog.close();openSpot();});
pump.addEventListener('click',()=>{
  if (motion?.kind!=='swing') return;
  if(motion.dismount||motion.pumpTimes.length>=5||motion.elapsed>=4.9+motion.pumpTimes.length*.45)return;
  motion.pumpTimes.push(motion.elapsed);
  pump.disabled=motion.pumpTimes.length>=5;
});
el('end-motion').addEventListener('click',()=>{
  if(!motion||motion.dismount)return;
  if(!gameShell.motionAllowed()){finishMotion();return;}
  motion.dismount={at:motion.elapsed,from:motion.pose??position};
  pump.disabled=true;
});
guide.addEventListener('click',event=>{
  const destination=event.target.closest('[data-head-to]');
  if (!destination) return;
  destinations.open=false;
  const place=(venue?.spots ?? places)[destination.dataset.headTo];
  warmDestination(place);
  goTo(place.point);
  if (window.scrollY) window.scrollTo(0,0);
});
el('leave-venue').addEventListener('click',()=>{
  if (history.state?.dioramaVenue && !history.state.inline) history.back();
  else {
    const target=venue?.parent || '';
    const url=new URL(location.href);
    if(target)url.searchParams.set('spot',target);else url.searchParams.delete('spot');
    history.replaceState({dioramaVenue:target,inline:true},'',url);currentUrl=url;
    changeVenue(target);
  }
});
window.addEventListener('popstate',event=>{
  const url=new URL(location.href);
  if(areaFor(url)!==areaId){switchDistrict(url,event.state?.streetReturn);return;}
  currentUrl=url;
  const target=Object.hasOwn(venues,event.state?.dioramaVenue) ? event.state.dioramaVenue : '';
  changeVenue(target,target ? undefined : event.state?.streetReturn);
  if(target==='avenueShops' && Object.hasOwn(venues.avenueShops.spots,event.state.shop)){
    position=[...venues.avenueShops.spots[event.state.shop].point];paint(0,-1);centerCamera();
  }
});
root.addEventListener('keydown',event=>{
  if (!event.repeat && !event.target.closest('button,a,dialog') && ['e','enter'].includes(event.key.toLowerCase())) {
    event.preventDefault();
    openPlace();
  }
});
view.addEventListener('click',event=>{
  if (event.target.closest('button,details')) return;
  const rect=view.getBoundingClientRect();
  goTo([(event.clientX-rect.left-camera.x)/camera.scale,(event.clientY-rect.top-camera.y)/camera.scale]);
  view.focus({preventScroll:true});
});
el('camera').addEventListener('click',()=>setCamera(!overview));
el('lighting').addEventListener('click',()=>setLighting({auto:'dusk',dusk:'night',night:'auto'}[lighting]));
document.addEventListener('visibilitychange',()=>{
  if (document.hidden) {movement.reset();route=[];cancelAnimationFrame(frame);frame=lastTick=0;}
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
const resize=new ResizeObserver(()=>centerCamera());
resize.observe(view);
renderLocations();
setCamera(false);
if(firstScene.id){
  position=[...firstScene.entrance];
  if(firstScene.inline)history.replaceState({dioramaVenue:firstScene.id,inline:true},'');
  changeVenue(firstScene.id);
} else showStreet();
if(firstScene.point)position=[...firstScene.point];
paint(0,arrival==='tower' ? -1 : 0);
void chooseWalker().catch(failedWalker);
run();
