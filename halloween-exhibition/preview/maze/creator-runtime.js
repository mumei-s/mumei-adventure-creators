import {locomotionPhase} from './movement-runtime.js?v=20261017-review1';
import {createActorPatrol,samplePatrolPosition,patrolSegmentSafe} from './patrol-model.js?v=20261017-review1';
import { blocked, CELL } from './maze-model.js?v=20261014-adventure2';
import { inFurniture } from './rpg-model.js?v=20261014-adventure2';

export const CHARACTER_DIRECTIONS = Object.freeze(['down','left','right','up']);
export const CREATOR_FICTION_NOTICE = 'この会話はゲーム内の創作です。作者本人の発言ではありません。';
export const CHARACTER_BUDGET = Object.freeze({ concurrent:2, resident:8, decodedBytes:32*1024*1024, active:5 });
const array = value => Array.isArray(value) ? value : [];
const CNA_ID='grand_daisy8632',CNA_PROFILE='https://note.com/grand_daisy8632',CNA_APPROVAL='cna-three-character-reference-20261017',CNA_GROUP='cna-profile-guests';
const CNA_ENTITIES=Object.freeze(['cna-black-bob','cna-star-twintails','cna-orange-glasses']);
const exactEntities=(actual,expected)=>Array.isArray(actual)&&actual.length===expected.length&&new Set(actual).size===expected.length&&actual.every(id=>expected.includes(id));
const referenceHash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const finite = (value,min,max) => Number.isFinite(value) && value>=min && value<=max;
const idOkay = value => typeof value==='string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}$/.test(value);
export function noteArticleURL(value) {
  try { const u=new URL(value); return u.protocol==='https:' && u.hostname==='note.com' && !u.port && !u.username && !u.password && /^\/[^/]+\/n\/n[a-zA-Z0-9]+\/?$/.test(u.pathname) ? u.origin+u.pathname.replace(/\/$/,'') : null; } catch { return null; }
}
export function characterAssetPath(value) { return typeof value==='string' && /^assets\/(?:creator-npcs|residents)\/[a-zA-Z0-9_-]+\.(png|webp)$/.test(value); }
export function layoutProblem(asset) {
  if (!asset || !characterAssetPath(asset.src) || !finite(asset.width,64,4096) || !finite(asset.height,64,4096)) return 'invalid-local-asset';
  const layout=asset.layout;
  if (!layout || JSON.stringify(layout.directions)!==JSON.stringify(CHARACTER_DIRECTIONS) || layout.columns!==4 || layout.rows!==4 ||
      !Number.isInteger(layout.idleColumn) || layout.idleColumn<0 || layout.idleColumn>3 ||
      JSON.stringify(layout.walkColumns)!==JSON.stringify([0,1,2,3])) return 'invalid-walk-layout';
  if (!Array.isArray(layout.frames) || layout.frames.length!==4) return 'missing-measured-frames';
  for (const row of layout.frames) {
    if (!Array.isArray(row) || row.length!==4) return 'missing-measured-frames';
    for (const cell of row) {
      if (!cell || !Array.isArray(cell.frame) || cell.frame.length!==4) return 'invalid-frame';
      const [x,y,w,h]=cell.frame;
      if (![x,y,w,h].every(Number.isFinite) || x<0 || y<0 || w<=0 || h<=0 || x+w>asset.width || y+h>asset.height ||
          !finite(cell.anchorX,0,1) || !finite(cell.anchorY,0,1) || !finite(cell.contentHeight,1,h)) return 'invalid-frame';
    }
  }
  return null;
}
function verifiedSource(source,creatorId,{profileGuest=false}={}) {
  if (!source || source.verified!==true) return false;
  if (source.kind==='user-upload') return referenceHash(source.referenceSHA256)&&((creatorId==='ss_yr'&&source.referenceId==='owner-lantern-reference-20261016')||(profileGuest&&creatorId===CNA_ID&&source.referenceId===CNA_APPROVAL));
  if(source.kind==='profile-avatar'){
    try{const profile=new URL(source.profileURL),image=new URL(source.imageURL);
      return source.userSelected===true&&profile.protocol==='https:'&&profile.hostname==='note.com'&&!profile.port&&!profile.username&&!profile.password&&profile.pathname.replace(/\/$/,'')==='/'+creatorId&&
        /^[a-f0-9]{64}$/.test(source.referenceSHA256||'')&&image.protocol==='https:'&&image.hostname==='assets.st-note.com'&&!image.port&&!image.username&&!image.password;
    }catch{return false;}
  }
  if (source.kind!=='article-art' || !noteArticleURL(source.articleURL) || new URL(source.articleURL).pathname.split('/')[1]!==creatorId) return false;
  try { const image=new URL(source.imageURL); return image.protocol==='https:' && !image.username && !image.password; } catch { return false; }
}

/** A named user approval permits exactly these three CNA profile characters.
 * It is a visual guest exception, never proof that a pending article exists. */
function profileGuestApproval(manifest,creators,pendingCreators){
 const grants=array(manifest.profileGuests).filter(item=>item?.creatorId===CNA_ID),grant=grants[0],creator=creators.get(CNA_ID),review=manifest.referenceReviews?.[CNA_ID];
 const groups=array(manifest.groups).filter(item=>item?.id===CNA_GROUP);
 if(grants.length!==1||!creator||!pendingCreators.has(CNA_ID)||creator.profileURL!==CNA_PROFILE||grant.approved!==true||grant.approvalId!==CNA_APPROVAL||
   grant.profileURL!==CNA_PROFILE||grant.submissionStatus!=='pending'||!referenceHash(grant.referenceSHA256)||!exactEntities(grant.entityIds,CNA_ENTITIES)||
   groups.length!==1||!exactEntities(groups[0].requiredEntityIds,CNA_ENTITIES)||
   review?.reviewed!==true||review.avatarVisuallyInspected!==true||review.decision!=='user-confirmed-profile-guest'||!exactEntities(review.entityIds,CNA_ENTITIES)||
   review.avatarReference?.kind!=='profile-avatar'||review.avatarReference.profileURL!==CNA_PROFILE||review.avatarReference.imageURL!==creator.avatar||!verifiedSource(review.avatarReference,CNA_ID))return null;
 return grant;
}

export function compileCharacterRoster(archive, manifest, selectedYear) {
  const years=array(archive?.years), selected=years.find(y=>y.year===selectedYear)||[...years].sort((a,b)=>b.year-a.year)[0];
  const creators=new Map(array(archive?.creators).map(c=>[c.id,c])), submissions=new Set(), visibleCreators=new Set(), pendingCreators=new Set();
  for (const entry of array(selected?.entries)) {
    if (entry.visible===false) continue;
    visibleCreators.add(entry.creatorId);
    if(entry.submissionStatus==='pending')pendingCreators.add(entry.creatorId);
    if (entry.submissionStatus!=='submitted') continue;
    for (const link of [...array(entry.works),...array(entry.links)]) {
      const url=noteArticleURL(link?.url); if (link.visible!==false && url) submissions.add(entry.creatorId+'|'+url);
    }
  }
  const ready=[], omitted=[], usedIds=new Set(), entityOwners=new Map();
  const guestApproval=profileGuestApproval(manifest||{},creators,pendingCreators);
  if (manifest?.schemaVersion!==1) return {hero:null,npcs:[],omitted:[{id:null,reason:'invalid-schema'}],year:selected?.year,visibleCreatorCount:visibleCreators.size};
  for (const entry of array(manifest.characters)) {
    const skip=reason=>omitted.push({id:entry?.id||null,creatorId:entry?.creatorId||null,reason});
    if (!idOkay(entry?.id) || !idOkay(entry?.creatorId) || !creators.has(entry.creatorId)) {skip('invalid-identity');continue;}
    if (usedIds.has(entry.id)) {skip('duplicate-id');continue;} usedIds.add(entry.id);
    if (entry.ready!==true) {skip('not-ready');continue;}
    if (entry.blockedReason || manifest.blockedCreators?.[entry.creatorId]) {skip('blocked-reference');continue;}
    const profileGuest=entry.participationRole==='profile-guest';
    if(profileGuest&&(!guestApproval||entry.creatorId!==CNA_ID||entry.role!=='npc'||entry.groupId!==CNA_GROUP||entry.articleURL!==null||entry.profileURL!==CNA_PROFILE||
      (entry.submissionStatus!==undefined&&entry.submissionStatus!=='pending')||array(entry.entityIds).length!==1||!CNA_ENTITIES.includes(entry.entityIds[0])||
      entry.source?.kind!=='user-upload'||entry.source.referenceId!==CNA_APPROVAL||entry.source.referenceSHA256!==guestApproval.referenceSHA256)){skip('unapproved-profile-guest');continue;}
    if(!profileGuest&&manifest.referencePolicy?.requireReviewed){
      const review=manifest.referenceReviews?.[entry.creatorId];
      if(review?.reviewed!==true||review.avatarVisuallyInspected!==true||!['profile-avatar-replacement','profile-avatar-match','article-fallback','owner-user-reference','official-character-sheet'].includes(review.decision)||
        !array(entry.entityIds).every(id=>array(review.entityIds).includes(id))||!verifiedSource(review.avatarReference,entry.creatorId)){skip('avatar-review-pending');continue;}
      if((review.decision==='owner-user-reference'&&(entry.creatorId!=='ss_yr'||entry.source?.kind!=='user-upload'))||
        (review.decision==='official-character-sheet'&&entry.creatorId!=='koakumako')||
        (review.decision==='profile-avatar-replacement'&&entry.source?.kind!=='profile-avatar')){skip('reference-policy-mismatch');continue;}
    }
    const articleURL=noteArticleURL(entry.articleURL);
    if (!profileGuest&&!submissions.has(entry.creatorId+'|'+articleURL)) {skip('not-a-visible-submission');continue;}
    const entityIds=array(entry.entityIds);
    if (!entityIds.length || entityIds.some(id=>!idOkay(id)||entityOwners.has(id))) {skip('invalid-or-duplicate-entities');continue;}
    if (!verifiedSource(entry.source,entry.creatorId,{profileGuest}) || entry.identityReviewed!==true || entry.animationReviewed!==true) {skip('unreviewed-source-or-animation');continue;}
    const issue=layoutProblem(entry.asset);if(issue){skip(issue);continue;}
    if (!['hero','npc'].includes(entry.role) || (entry.role==='hero'&&entry.creatorId!=='ss_yr') ||
        (entry.role==='npc'&&entry.creatorId==='ss_yr')) {skip('invalid-owner-role');continue;}
    if (entry.role==='npc' && entry.interactive!==false && (typeof entry.greeting!=='string'||!entry.greeting.trim()||entry.greeting.length>180||entry.greetingKind!=='fictional-game-dialogue')) {skip('missing-fictional-dialogue');continue;}
    const creator=creators.get(entry.creatorId);
    for(const id of entityIds)entityOwners.set(id,entry.id);
    ready.push({...entry,...(profileGuest?{submissionStatus:'pending',profileURL:CNA_PROFILE}:{}),articleURL,name:creator.name,label:entry.label||creator.name,groupId:entry.groupId||entry.creatorId,
      asset:structuredClone(entry.asset),entityIds:[...entityIds],heightPx:finite(entry.heightPx,24,120)?entry.heightPx:86,
      heightWorld:finite(entry.heightWorld,.5,3.5)?entry.heightWorld:2.35});
  }
  // Explicit expected entity groups prevent dropping a companion silently.
  const incomplete=new Set();
  for(const group of array(manifest.groups)) {
    if(!group.requiredEntityIds?.length)continue;
    if(group.requiredEntityIds.some(id=>!entityOwners.has(id)))incomplete.add(group.id);
  }
  const guests=ready.filter(entry=>entry.participationRole==='profile-guest');
  const guestsComplete=guests.length===3&&exactEntities(guests.flatMap(entry=>entry.entityIds),CNA_ENTITIES)&&new Set(guests.map(entry=>entry.asset.src)).size===3;
  const accepted=ready.filter(entry=>{if(entry.participationRole==='profile-guest'&&!guestsComplete){omitted.push({id:entry.id,creatorId:entry.creatorId,reason:'incomplete-profile-guest-group'});return false;}if(!incomplete.has(entry.groupId))return true;omitted.push({id:entry.id,creatorId:entry.creatorId,reason:'incomplete-group'});return false;});
  const heroes=accepted.filter(entry=>entry.role==='hero'),readyCreators=new Set(accepted.map(entry=>entry.creatorId)),missingCreators=[...new Set([...submissions].map(key=>key.split('|')[0]))].filter(id=>!readyCreators.has(id));
  return {missingCreators,readyCreatorCount:readyCreators.size,hero:heroes.length===1?heroes[0]:null,npcs:accepted.filter(entry=>entry.role==='npc'),omitted,year:selected?.year,
    visibleCreatorCount:visibleCreators.size,submittedCreatorCount:new Set([...submissions].map(key=>key.split('|')[0])).size};
}

export const CREATOR_SLOTS = Object.freeze([
  {id:'hall-west',x:5.7,z:8.4,capacity:3,zone:'hall'},{id:'hall-upper-west',x:7,z:7.7,capacity:3,zone:'hall'},
  {id:'hall-west-mid',x:5.15,z:10,capacity:2,zone:'hall'},{id:'hall-west-south',x:5.6,z:12.2,capacity:2,zone:'hall'},
  {id:'hall-south-east',x:10.2,z:13,capacity:3,zone:'hall'},{id:'hall-east',x:10.9,z:10.1,capacity:2,zone:'hall'},
  {id:'east-north',x:13.3,z:8.3,capacity:2,zone:'east'},{id:'east-upper',x:14.3,z:8.5,capacity:2,zone:'east'},
  {id:'east-south',x:14.9,z:11.8,capacity:2,zone:'east'},
  {id:'west-north',x:1.5,z:8.2,capacity:2,zone:'west',needsCorridor:true},{id:'west-east',x:2.9,z:10.2,capacity:2,zone:'west',needsCorridor:true},
  {id:'west-south',x:1.5,z:12,capacity:2,zone:'west',needsCorridor:true},
  {id:'archive-north-west',x:5.7,z:1.8,capacity:3,zone:'archive',needsKey:true},{id:'archive-north-east',x:10.3,z:1.8,capacity:3,zone:'archive',needsKey:true},
  {id:'archive-west',x:5.8,z:4.5,capacity:3,zone:'archive',needsKey:true},{id:'archive-east',x:10.3,z:4.4,capacity:3,zone:'archive',needsKey:true},
  {id:'archive-mid-west',x:6.5,z:3,capacity:3,zone:'archive',needsKey:true},{id:'archive-mid-east',x:9.8,z:3,capacity:3,zone:'archive',needsKey:true},
]);
export function placeCreatorNPCs(npcs, assignments={}) {
  const groups=new Map(), used=new Set(), placed=[], omitted=[];
  for(const slotId of Object.values(assignments)){if(!CREATOR_SLOTS.some(slot=>slot.id===slotId)||used.has(slotId))throw Error('Invalid creator slot assignments');used.add(slotId);}
  for(const npc of npcs){if(!groups.has(npc.groupId))groups.set(npc.groupId,[]);groups.get(npc.groupId).push(npc);}
  for(const [id,members]of groups){
    const assigned=Object.hasOwn(assignments,id)?assignments[id]:null;
    const slot=assigned?CREATOR_SLOTS.find(slot=>slot.id===assigned):CREATOR_SLOTS.find(slot=>!used.has(slot.id)&&slot.capacity>=members.length);
    if(!slot||members.length>slot.capacity||members.length>3){omitted.push({groupId:id,reason:'no-safe-capacity'});continue;}used.add(slot.id);
    members.sort((a,b)=>(a.groupOrder??0)-(b.groupOrder??0)||a.id.localeCompare(b.id));const offsets=members.length===1?[0]:members.length===2?[-.3,.3]:[-.55,0,.55];
    members.forEach((npc,index)=>placed.push({...npc,...slot,slotId:slot.id,id:npc.id,x:slot.x+offsets[index]}));
  }
  return {placed,omitted};
}
export const creatorAvailable=(npc,state={})=>(!npc.needsKey||state.unlocked)&&(!npc.needsCorridor||state.horrorAccepted);
const actorPatrols=new WeakMap();
export function creatorPose(npc,time=0,motion=true,state={}){
 if(!npc.slotId&&npc.actorKind!=='resident')return{x:npc.x,z:npc.z,facing:'down',walking:false,phase:0};
 let route=actorPatrols.get(npc);if(!route){route=createActorPatrol(npc,{role:npc.actorKind==='resident'?'resident':'creator'});actorPatrols.set(npc,route);}
 return samplePatrolPosition(route,time,{motion,state});
}

export function characterSprite(asset,image,facing='down',walking=false,phase=0) {
  if(!image)return null;const layout=asset.layout,row=Math.max(0,layout.directions.indexOf(facing));
  const index=walking?Math.floor(((phase%(Math.PI*2)+Math.PI*2)%(Math.PI*2))/(Math.PI*2)*4):0;
  const column=walking?layout.walkColumns[index]:layout.idleColumn,cell=layout.frames[row][column];
  const sx=image.width/asset.width,sy=image.height/asset.height;
  return {image,frameIndex:column,animationAssetComplete:false,frame:[cell.frame[0]*sx,cell.frame[1]*sy,cell.frame[2]*sx,cell.frame[3]*sy],
    anchorX:cell.anchorX,anchorY:cell.anchorY,contentHeight:cell.contentHeight*sy};
}
export function lineOfSight(player,target,state={}) {
  const steps=Math.max(1,Math.ceil(Math.hypot(target.x-player.x,target.z-player.z)*10));
  for(let n=1;n<=steps;n++){const t=n/steps;if(blocked((player.x+(target.x-player.x)*t)*CELL,(player.z+(target.z-player.z)*t)*CELL,state))return false;}return true;
}
export function nearestCreator(actors,player,state={},range=1.35) {
  return actors.filter(actor=>actor.interactive!==false&&creatorAvailable(actor,state)).map(actor=>({actor,distance:Math.hypot(actor.x-player.x,actor.z-player.z)}))
    .filter(item=>item.distance<=range&&lineOfSight(player,item.actor,state)).sort((a,b)=>a.distance-b.distance)[0]?.actor||null;
}
export function creatorGuide(npc,state={}) {
  if(npc.needsKey&&!state.unlocked)return{x:8,z:7.4,yaw:0,hint:'北の格子扉をひらくと会えます。東の間で鍵を探しましょう。'};
  if(npc.needsCorridor&&!state.horrorAccepted)return{x:5,z:10,yaw:Math.PI/2,hint:'西の扉から肖像の回廊へ入れます。'};
  for(const [dx,dz]of[[0,.8],[.8,0],[-.8,0],[0,-.8]]){
    const x=npc.x+dx,z=npc.z+dz;if(!blocked(x*CELL,z*CELL,state)&&!inFurniture(x*CELL,z*CELL))return{x,z,yaw:Math.atan2(dx,dz),hint:npc.label+'の近くです。名前か「話す」を選んでください。'};
  }
  return{x:8,z:12,yaw:0,hint:'入口に戻りました。記事は仲間の一覧からいつでも読めます。'};
}
export function chooseCreatorAssets(npcs,player,state={},max=CHARACTER_BUDGET.active,{time=0,motion=true}={}) {
  const groups=new Map();
  for(const npc of npcs.filter(npc=>creatorAvailable(npc,state))){if(!groups.has(npc.groupId))groups.set(npc.groupId,[]);groups.get(npc.groupId).push(npc);}
  const distance=npc=>{const pose=creatorPose(npc,time,motion,state);return Math.hypot(pose.x-player.x,pose.z-player.z);};
  const sorted=[...groups.values()].sort((a,b)=>Math.min(...a.map(distance))-Math.min(...b.map(distance)));
  const chosen=[];for(const group of sorted){if(chosen.length+group.length<=max)chosen.push(...group);}return chosen;
}
export function buildCreatorActors(npcs,assets,{state,time=0,motion=true}={}) {
  const result=[],groups=new Map();
  for(const npc of npcs){if(!groups.has(npc.groupId))groups.set(npc.groupId,[]);groups.get(npc.groupId).push(npc);}
  const loadedGroups=new Set([...groups].filter(([,members])=>members.every(npc=>assets.get(npc.asset.src))).map(([id])=>id));
  for(const npc of npcs){if(!creatorAvailable(npc,state)||!loadedGroups.has(npc.groupId))continue;const image=assets.get(npc.asset.src);if(!image)continue;
    const pose=creatorPose(npc,time,motion,state);result.push({...npc,...pose,sprite:characterSprite(npc.asset,image,pose.facing,pose.walking,pose.phase),interactive:npc.interactive!==false});}
  return result;
}

export async function browserImage(url,asset) {
  const image=await new Promise((resolve,reject)=>{const im=new Image();let active=true;const finish=error=>{if(!active)return;active=false;clearTimeout(timer);im.onload=im.onerror=null;error?reject(error):resolve(im);};const timer=setTimeout(()=>finish(Error('Character image timed out')),10000);im.onload=()=>finish();im.onerror=()=>finish(Error('Character image failed'));im.src=url;});
  if(asset&&(image.width!==asset.width||image.height!==asset.height))throw Error('Character source dimensions mismatch');
  // Runtime decoding uses a bounded bitmap; original asset bytes remain intact.
  if(Math.max(image.width,image.height)>1024){
    const scale=1024/Math.max(image.width,image.height);
    const width=Math.round(image.width*scale),height=Math.round(image.height*scale);
    if(typeof createImageBitmap==='function'){try{return await createImageBitmap(image,{resizeWidth:width,resizeHeight:height,resizeQuality:'high'});}catch{}}
    const canvas=typeof OffscreenCanvas==='function'?new OffscreenCanvas(width,height):typeof document!=='undefined'?document.createElement('canvas'):null;
    if(!canvas)throw Error('Bounded character decoding unavailable');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d');if(!context)throw Error('Bounded character decoding unavailable');context.imageSmoothingEnabled=true;context.drawImage(image,0,0,width,height);return canvas;
  }
  return image;
}
export function createCharacterAssets({loadImage=browserImage,maxResident=CHARACTER_BUDGET.resident,maxBytes=CHARACTER_BUDGET.decodedBytes,
  concurrent=CHARACTER_BUDGET.concurrent,maxPending=64,maxFailures=64,onChange=()=>{}}={}) {
  if(!Number.isInteger(maxResident)||maxResident<1||!Number.isFinite(maxBytes)||maxBytes<1||!Number.isInteger(concurrent)||concurrent<1||!Number.isInteger(maxPending)||maxPending<concurrent||!Number.isInteger(maxFailures)||maxFailures<1)throw new TypeError('Invalid character cache budget');
  const cache=new Map(),pending=new Map(),failures=new Map(),queue=[],active=new Set();let running=0,disposed=false,clock=0,pinned=new Set(),rejectedRequests=0;
  const changed=()=>{try{onChange();}catch{/* View observers cannot turn successful decoding into a failed asset. */}};
  const bytes=image=>image.width*image.height*4;
  const total=()=>[...cache.values()].reduce((sum,item)=>sum+bytes(item.image),0);
  function evict(){
    while(cache.size>maxResident||total()>maxBytes){const item=[...cache.values()].filter(item=>!pinned.has(item.src)).sort((a,b)=>a.used-b.used)[0];if(!item)break;cache.delete(item.src);item.image.close?.();}
  }
  function pump(){
    while(!disposed&&running<concurrent&&queue.length){const task=queue.shift();running++;active.add(task);
      Promise.resolve().then(()=>loadImage(new URL('./'+task.asset.src+(task.asset.sha256?'?v='+task.asset.sha256.slice(0,12):''),import.meta.url).href,task.asset)).then(image=>{
        if(disposed){image.close?.();task.resolve(null);return;}
        if(!image||!finite(image.width,1,4096)||!finite(image.height,1,4096)||Math.abs(image.width/image.height-task.asset.width/task.asset.height)>.01){image?.close?.();throw Error('Character dimensions mismatch');}
        cache.set(task.asset.src,{src:task.asset.src,image,used:++clock});evict();
        if(!cache.has(task.asset.src))throw Error('Character cache capacity reached');
        if(cache.size>maxResident||total()>maxBytes){cache.delete(task.asset.src);image.close?.();throw Error('Character decode budget exceeded');}
        changed();task.resolve(image);
      }).catch(error=>{if(!disposed){failures.set(task.asset.src,String(error.message||error));while(failures.size>maxFailures)failures.delete(failures.keys().next().value);changed();}task.resolve(null);})
        .finally(()=>{running--;active.delete(task);pending.delete(task.asset.src);pump();});
    }
  }
  return {
    get(src){const item=cache.get(src);if(item){item.used=++clock;return item.image;}return null;},
    request(asset){
      if(disposed||layoutProblem(asset)||failures.has(asset.src))return Promise.resolve(null);
      if(cache.has(asset.src))return Promise.resolve(cache.get(asset.src).image);
      if(pending.has(asset.src))return pending.get(asset.src);
      if(pending.size>=maxPending){rejectedRequests++;return Promise.resolve(null);}
      const promise=new Promise(resolve=>queue.push({asset,resolve}));pending.set(asset.src,promise);pump();return promise;
    },
    setPinned(sources){pinned=new Set(sources);evict();},
    retry(){failures.clear();},
    status(){return{loaded:cache.size,pending:pending.size,failed:failures.size,decodedBytes:total(),rejectedRequests,failures:[...failures.keys()]};},
    dispose(){disposed=true;for(const task of active)task.resolve(null);for(const task of queue.splice(0))task.resolve(null);for(const item of cache.values())item.image.close?.();cache.clear();pending.clear();},
  };
}

// Canvas taps and 3D drag-look share this threshold; cancellation never talks.
export function isCharacterTap(start,end) {
  return !!start&&!!end&&start.pointerId===end.pointerId&&end.time-start.time>=0&&end.time-start.time<=350&&
    Math.hypot(end.x-start.x,end.y-start.y)<=8&&start.moved!==true;
}

export function scaledCharacterLayout(asset,image){
  const sx=image.width/asset.width,sy=image.height/asset.height;
  return {...asset.layout,frames:asset.layout.frames.map(row=>row.map(cell=>({...cell,frame:[cell.frame[0]*sx,cell.frame[1]*sy,cell.frame[2]*sx,cell.frame[3]*sy],contentHeight:cell.contentHeight*sy})))};
}
export function compileCompanions(manifest){return array(manifest?.companions).filter(c=>c.ready===true&&c.identityReviewed===true&&c.animationReviewed===true&&verifiedSource(c.source,'ss_yr')&&!layoutProblem(c.asset));}
const companionStarts=new WeakMap();
export function companionActor(definition,image,trail,state,{facing='down',walking=false,phase=0}={}){
  if(!image)return null;
  let goal;
  if(typeof trail?.sample==='function'){
    goal=trail.sample(.42);
    if(goal?.origin){
      let start=companionStarts.get(trail);
      if(start?.origin!==goal.origin){
        const vector=({down:[0,1],up:[0,-1],left:[-1,0],right:[1,0]})[goal.origin.facing]||[0,1];
        const behind=[.42,.32,.22,.12,0].find(length=>patrolSegmentSafe(goal.origin,{x:goal.origin.x-vector[0]*length,z:goal.origin.z-vector[1]*length},state,.07))??0;
        start={origin:goal.origin,vector,behind};companionStarts.set(trail,start);
      }
      const startup=Math.min(start.behind,Math.max(0,.42-goal.headDistance));
      if(startup>0)goal={...goal,x:goal.origin.x-start.vector[0]*startup,z:goal.origin.z-start.vector[1]*startup,facing:goal.origin.facing};
      const travelled=Math.max(0,goal.headDistance-(.42-start.behind));
      goal={...goal,phase:locomotionPhase(travelled,.68)};
      walking=walking&&travelled>1e-7;
    }
  }
  else if(Array.isArray(trail)&&trail.length){
    // Legacy callers also use distance interpolation rather than ten frame samples.
    let remaining=.42;goal={...trail[0]};
    for(let i=trail.length-1;i>0;i--){const a=trail[i-1],b=trail[i],length=Math.hypot(b.x-a.x,b.z-a.z);
      if(length>=remaining&&length>0){const f=1-remaining/length;goal={x:a.x+(b.x-a.x)*f,z:a.z+(b.z-a.z)*f,facing:b.facing||facing,phase:locomotionPhase(Math.max(0,(Number.isFinite(b.distance)?b.distance:0)-remaining),.68)};break;}remaining-=length;}
  }
  if(!goal||blocked(goal.x*CELL,goal.z*CELL,state)||inFurniture(goal.x*CELL,goal.z*CELL))return null;
  const direction=goal.facing||facing,gait=Number.isFinite(goal.phase)?goal.phase:phase;
  return {...definition,creatorId:'ss_yr',groupId:'owner-companion',label:'',name:'',x:goal.x,z:goal.z,facing:direction,walking,phase:gait,
    sprite:characterSprite(definition.asset,image,direction,walking,gait),heightPx:definition.heightPx||40,heightWorld:definition.heightWorld||1,interactive:false};
}
