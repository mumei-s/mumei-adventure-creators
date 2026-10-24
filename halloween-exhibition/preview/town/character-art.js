import {creatorHomeProfile} from './creator-home-profile.js?v=20261019-homes1';
import {fetchStartupJSON,loadRequiredCharacters} from '../maze/startup-assets.js?v=20261017-startup1';
import {createCharacterAssets,scaledCharacterLayout,characterSprite,compileCharacterRoster,compileCompanions,CREATOR_FICTION_NOTICE,noteArticleURL} from '../maze/creator-runtime.js?v=20261017-startup1';
import {createDistanceTrail} from '../maze/movement-runtime.js?v=20261017-review1';
import {MONSTER_MOTION_DATA} from '../maze/monster-motion-data.js?v=20261016-living1';
import {motionSprite} from '../maze/monster-motion.js?v=20261019-unified1';
import {placeTownVisitors,placeCreatorHomeVisitors,sampleTownVisitors,chooseTownVisitorGroups,nearestTownVisitor} from './visitor-model.js?v=20261019-homes2';
import {loadArtImage} from '../maze/rpg-art.js?v=20261019-unified1';
import {createRigLibrary} from '../maze/rig-animation.js?v=20261019-scene1';
import {TOWN_START_MAP,getTownMap} from './story-data.js?v=20261019-homes2';
/** Adopted owner/cat identity is preserved; no new participant identities are inferred. */
export function createTownCharacterArt({onState=()=>{},fetcher,signal,loadMonsterImage=loadArtImage,makeRigs=createRigLibrary,deferEnhancements=false,assets=createCharacterAssets(),initialState={mapId:TOWN_START_MAP,position:getTownMap().spawn}}={}){
 let destroyed=false,hero,cat,lastMap=null,roster=null,placed=[],archive=null,selected=[],selectionAt=-1,selectionMap=null,selectionPosition=null,visibleVisitors=[],lastOwner=null,lastCat=null;const trail=createDistanceTrail({maxDistance:3,strideLength:1.15,teleportDistance:3});
 const pending=new Map(),art={images:{},monsterLayouts:{},playerLayout:null,version:0};
 // The approved walking atlas already contains the full protagonist. Optional
 // articulated poses must not compete with those two required atlas requests.
 let rigs=null;art.rigs={update:(...args)=>rigs?.update(...args)||null,get:(...args)=>rigs?.get(...args)||null,battle:(...args)=>rigs?.battle(...args)||null,destroy:()=>rigs?.destroy()};
 function startEnhancements(){if(destroyed||rigs)return;rigs=makeRigs({loadImage:loadMonsterImage,onChange:()=>{art.version++;onState('rig-ready');}});}
 const ready=(async()=>{
  // Production embeds the current canonical data in the entry bundle. Source
  // mode and injected loaders retain bounded requests and the normal HTTP cache.
  const bundled=!fetcher&&globalThis.__ATELIER_CHARACTER_MANIFEST__&&globalThis.__ATELIER_ARCHIVE__;
  const data=fetcher||fetchStartupJSON;
  const [manifest,source]=bundled?[globalThis.__ATELIER_CHARACTER_MANIFEST__,globalThis.__ATELIER_ARCHIVE__]:await Promise.all([data('../maze/data/creator-characters.json?v=182ab7a3ff04',{signal}),data('../data/archive.json',{signal})]);archive=source;roster=compileCharacterRoster(archive,manifest);const placement=placeTownVisitors(roster),homePlacement=placeCreatorHomeVisitors(roster);placed=[...placement.visitors,...homePlacement.visitors];
  if(placement.omitted.length||homePlacement.omitted.length||roster.missingCreators?.length)throw Error('街の仲間の配置を完了できませんでした。');
  hero=roster.hero;cat=compileCompanions(manifest).find(character=>character.id==='owner-black-cat');
  if(!hero||!cat)throw Error('採用済みの主人公と黒猫を読み込めませんでした。');
  assets.setPinned([hero.asset.src,cat.asset.src]);const images=await loadRequiredCharacters(assets,[hero.asset,cat.asset],{signal,onRetry:()=>onState('retry')});
  if(destroyed)return;if(images.some(image=>!image))throw Error('主人公と黒猫の画像を読み込めませんでした。');
  art.images.playerAtlas=images[0];art.playerLayout=scaledCharacterLayout(hero.asset,images[0]);art.version++;onState('ready');
  // Warm only the guests near the saved position while the welcome panel is open.
  visitorActors({state:initialState,time:0,clock:0});
  if(!deferEnhancements)startEnhancements();
 })();
 function visitorActors({state,time=0,clock=time,motion=true,dt=0,view3D=false}={}){
  if(!roster||!state)return[];const poses=sampleTownVisitors(placed,{state,time,motion:true}).map(visitor=>motion?visitor:{...visitor,walking:false});
  if(clock>=selectionAt||state.mapId!==selectionMap||selectionPosition&&Math.hypot(state.position.x-selectionPosition.x,state.position.z-selectionPosition.z)>1.5){
   const candidates=chooseTownVisitorGroups(poses,state,3),groups=new Map();for(const visitor of candidates){if(!groups.has(visitor.groupId))groups.set(visitor.groupId,[]);groups.get(visitor.groupId).push(visitor);}
   selected=[];for(const group of groups.values())if(selected.length+group.length<=6)selected.push(...group);
   const pinned=[hero.asset.src,cat.asset.src,...selected.map(visitor=>visitor.asset.src)];assets.setPinned(pinned);for(const visitor of selected)void assets.request(visitor.asset);selectionAt=clock+.4;selectionMap=state.mapId;selectionPosition={...state.position};
  }
  const chosen=new Set(selected.map(visitor=>visitor.id)),chosenPoses=poses.filter(visitor=>chosen.has(visitor.id)),completeGroups=new Set();
  for(const visitor of chosenPoses)if(chosenPoses.filter(peer=>peer.groupId===visitor.groupId).every(peer=>assets.get(peer.asset.src)))completeGroups.add(visitor.groupId);
  visibleVisitors=chosenPoses.filter(visitor=>completeGroups.has(visitor.groupId)).map(visitor=>({...visitor,sprite:art.rigs.update(visitor.sourceCharacterId===hero.id?visitor.id:visitor.sourceCharacterId||visitor.id,{position:visitor,dt,time,facing:visitor.facing,heading:visitor.yaw,moving:visitor.walking,motion,mapId:state.mapId,worldPixelsPerUnit:view3D?1:64,displayHeightPx:view3D?(visitor.heightPx?visitor.heightPx/48:1.16):(visitor.heightPx||54),groundDepthScale:view3D?Math.sin(55*Math.PI/180):.78})||characterSprite(visitor.asset,assets.get(visitor.asset.src),visitor.facing,visitor.walking&&motion,visitor.phase),interactive:visitor.interactive!==false}));return visibleVisitors;
 }
 function visitors(){return placed.map(visitor=>({...visitor,profileURL:visitor.profileURL||archive?.creators?.find(person=>person.id===visitor.creatorId)?.profileURL,articleLinks:(archive?.years?.find(year=>year.year===roster.year)?.entries||[]).filter(entry=>entry.creatorId===visitor.creatorId&&entry.visible!==false&&entry.submissionStatus==='submitted').flatMap(entry=>[...(entry.works||[]),...(entry.links||[])]).filter(link=>link.visible!==false&&noteArticleURL(link.url))}));}
 function visitor(id){return visitors().find(person=>person.id===id)||null;}
 function nearbyVisitor(state){return nearestTownVisitor(visibleVisitors,state);}
 function reachableVisitor(id,state){return nearestTownVisitor(visibleVisitors.filter(visitor=>visitor.id===id),state);}
 function isHomeResidentVisible(targetId,state){return visibleVisitors.some(visitor=>visitor.fallbackTargetId===targetId&&visitor.mapId===state?.mapId);}
 function companionActors({state,walking=false,canStand=()=>true,dt=0,time=0,motion=true,view3D=false}={}){
  if(!cat||!state?.position)return[];const image=assets.get(cat.asset.src);if(!image)return[];
  if(lastMap!==state.mapId||lastOwner&&Math.hypot(lastOwner.x-state.position.x,lastOwner.z-state.position.z)>3){lastMap=state.mapId;trail.reset();lastCat=null;const point=state.position;for(const offset of [{x:-.3,z:.28},{x:.3,z:.28},{x:0,z:.4}]){const seed={x:point.x+offset.x,z:point.z+offset.z,facing:state.facing};if(canStand(seed)){trail.push(seed);break;}}}
  trail.push({...state.position,facing:state.facing});lastOwner={...state.position};const pose=trail.sample(.45)||{...state.position,facing:state.facing,phase:0},moving=walking&&lastCat&&Math.hypot(pose.x-lastCat.x,pose.z-lastCat.z)>.00001;lastCat={x:pose.x,z:pose.z};
  return[{id:cat.id,name:'黒猫',interactive:false,x:pose.x,z:pose.z,facing:pose.facing,heightPx:35,heightWorld:1,walking:!!moving,phase:pose.phase,sprite:art.rigs.update(cat.id,{position:pose,dt,time,facing:pose.facing,moving:!!moving,motion,mapId:state.mapId,worldPixelsPerUnit:view3D?1:64,displayHeightPx:view3D?35/48:35,groundDepthScale:view3D?Math.sin(55*Math.PI/180):.78})||characterSprite(cat.asset,image,pose.facing,!!moving,pose.phase)}];
 }
 async function ensureMonster(id){
  const layout=MONSTER_MOTION_DATA[id];if(!layout)return false;if(art.images[id])return true;if(pending.has(id))return pending.get(id);
  const promise=(async()=>{try{const image=await loadMonsterImage(new URL(layout.src,new URL('../maze/',import.meta.url)).href,{timeout:10000});if(destroyed)return false;if(image.width!==layout.width||image.height!==layout.height)throw Error('Monster image dimensions do not match the approved layout');art.monsterLayouts[id]=layout;art.images[id]=motionSprite(image,layout,{motion:false});art.version++;onState('monster-ready');return true;}catch{return false;}finally{pending.delete(id);}})();pending.set(id,promise);return promise;
 }
 return {art,ready,startEnhancements,creatorPage:creatorId=>creatorHomeProfile(archive,creatorId,roster?.year),companionActors,visitorActors,visitors,visitor,nearbyVisitor,reachableVisitor,isHomeResidentVisible,fictionNotice:CREATOR_FICTION_NOTICE,retryVisitors(){assets.retry();selectionAt=-1;},ensureMonster,destroy(){destroyed=true;assets.dispose();art.rigs.destroy();pending.clear();trail.reset();},status:()=>assets.status()};
}
