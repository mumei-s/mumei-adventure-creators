import {fetchJSON,withDeadline} from '../transition-effects.js?v=20261016-living1';
import {createCharacterAssets,scaledCharacterLayout,characterSprite,compileCharacterRoster,compileCompanions,CREATOR_FICTION_NOTICE,noteArticleURL} from '../maze/creator-runtime.js?v=20261017-cna1';
import {createDistanceTrail} from '../maze/movement-runtime.js?v=20261017-review1';
import {MONSTER_MOTION_DATA} from '../maze/monster-motion-data.js?v=20261016-living1';
import {motionSprite} from '../maze/monster-motion.js?v=20261017-review1';
import {placeTownVisitors,sampleTownVisitors,chooseTownVisitorGroups,nearestTownVisitor} from './visitor-model.js?v=20261017-town1';
import {loadArtImage} from '../maze/rpg-art.js?v=20261017-review1';
/** Adopted owner/cat identity is preserved; no new participant identities are inferred. */
export function createTownCharacterArt({onState=()=>{},fetcher=fetchJSON,loadMonsterImage=loadArtImage,assets=createCharacterAssets()}={}){
 let destroyed=false,hero,cat,lastMap=null,roster=null,placed=[],archive=null,selected=[],selectionAt=-1,visibleVisitors=[],lastOwner=null,lastCat=null;const trail=createDistanceTrail({maxDistance:3,strideLength:1.15,teleportDistance:3});
 const pending=new Map(),art={images:{},monsterLayouts:{},playerLayout:null,version:0};
 const ready=(async()=>{
  const [manifest,source]=await Promise.all([fetcher('../maze/data/creator-characters.json?v=20261017-cna1'),fetcher('../data/archive.json')]);archive=source;roster=compileCharacterRoster(archive,manifest);const placement=placeTownVisitors(roster);placed=placement.visitors;
  if(placement.omitted.length||roster.missingCreators?.length)throw Error('街の仲間の配置を完了できませんでした。');
  hero=roster.hero;cat=compileCompanions(manifest).find(character=>character.id==='owner-black-cat');
  if(!hero||!cat)throw Error('採用済みの主人公と黒猫を読み込めませんでした。');
  assets.setPinned([hero.asset.src,cat.asset.src]);const images=await withDeadline(Promise.all([assets.request(hero.asset),assets.request(cat.asset)]),{timeout:16000});
  if(destroyed)return;if(images.some(image=>!image))throw Error('主人公と黒猫の画像を読み込めませんでした。');
  art.images.playerAtlas=images[0];art.playerLayout=scaledCharacterLayout(hero.asset,images[0]);art.version++;onState('ready');
 })();
 function visitorActors({state,time=0,clock=time,motion=true}={}){
  if(!roster||!state)return[];const poses=sampleTownVisitors(placed,{state,time,motion:true}).map(visitor=>motion?visitor:{...visitor,walking:false});
  if(clock>=selectionAt||state.mapId!==lastMap){
   const candidates=chooseTownVisitorGroups(poses,state,3),groups=new Map();for(const visitor of candidates){if(!groups.has(visitor.groupId))groups.set(visitor.groupId,[]);groups.get(visitor.groupId).push(visitor);}
   selected=[];for(const group of groups.values())if(selected.length+group.length<=6)selected.push(...group);
   const pinned=[hero.asset.src,cat.asset.src,...selected.map(visitor=>visitor.asset.src)];assets.setPinned(pinned);for(const visitor of selected)void assets.request(visitor.asset);selectionAt=clock+.4;
  }
  const chosen=new Set(selected.map(visitor=>visitor.id)),chosenPoses=poses.filter(visitor=>chosen.has(visitor.id)),completeGroups=new Set();
  for(const visitor of chosenPoses)if(chosenPoses.filter(peer=>peer.groupId===visitor.groupId).every(peer=>assets.get(peer.asset.src)))completeGroups.add(visitor.groupId);
  visibleVisitors=chosenPoses.filter(visitor=>completeGroups.has(visitor.groupId)).map(visitor=>({...visitor,sprite:characterSprite(visitor.asset,assets.get(visitor.asset.src),visitor.facing,visitor.walking&&motion,visitor.phase),interactive:visitor.interactive!==false}));return visibleVisitors;
 }
 function visitors(){return placed.map(visitor=>({...visitor,profileURL:visitor.profileURL||archive?.creators?.find(person=>person.id===visitor.creatorId)?.profileURL,articleLinks:(archive?.years?.find(year=>year.year===roster.year)?.entries||[]).filter(entry=>entry.creatorId===visitor.creatorId&&entry.visible!==false&&entry.submissionStatus==='submitted').flatMap(entry=>[...(entry.works||[]),...(entry.links||[])]).filter(link=>link.visible!==false&&noteArticleURL(link.url))}));}
 function visitor(id){return visitors().find(person=>person.id===id)||null;}
 function nearbyVisitor(state){return nearestTownVisitor(visibleVisitors,state);}
 function companionActors({state,walking=false,canStand=()=>true}={}){
  if(!cat||!state?.position)return[];const image=assets.get(cat.asset.src);if(!image)return[];
  if(lastMap!==state.mapId||lastOwner&&Math.hypot(lastOwner.x-state.position.x,lastOwner.z-state.position.z)>3){lastMap=state.mapId;trail.reset();lastCat=null;const point=state.position;for(const offset of [{x:-.3,z:.28},{x:.3,z:.28},{x:0,z:.4}]){const seed={x:point.x+offset.x,z:point.z+offset.z,facing:state.facing};if(canStand(seed)){trail.push(seed);break;}}}
  trail.push({...state.position,facing:state.facing});lastOwner={...state.position};const pose=trail.sample(.45)||{...state.position,facing:state.facing,phase:0},moving=walking&&lastCat&&Math.hypot(pose.x-lastCat.x,pose.z-lastCat.z)>.00001;lastCat={x:pose.x,z:pose.z};
  return[{id:cat.id,name:'黒猫',interactive:false,x:pose.x,z:pose.z,facing:pose.facing,heightPx:35,heightWorld:1,walking:!!moving,phase:pose.phase,sprite:characterSprite(cat.asset,image,pose.facing,!!moving,pose.phase)}];
 }
 async function ensureMonster(id){
  const layout=MONSTER_MOTION_DATA[id];if(!layout)return false;if(art.images[id])return true;if(pending.has(id))return pending.get(id);
  const promise=(async()=>{try{const image=await loadMonsterImage(new URL(layout.src,new URL('../maze/',import.meta.url)).href,{timeout:10000});if(destroyed)return false;if(image.width!==layout.width||image.height!==layout.height)throw Error('Monster image dimensions do not match the approved layout');art.monsterLayouts[id]=layout;art.images[id]=motionSprite(image,layout,{motion:false});art.version++;onState('monster-ready');return true;}catch{return false;}finally{pending.delete(id);}})();pending.set(id,promise);return promise;
 }
 return {art,ready,companionActors,visitorActors,visitors,visitor,nearbyVisitor,fictionNotice:CREATOR_FICTION_NOTICE,retryVisitors(){assets.retry();selectionAt=-1;},ensureMonster,destroy(){destroyed=true;assets.dispose();pending.clear();trail.reset();},status:()=>assets.status()};
}
