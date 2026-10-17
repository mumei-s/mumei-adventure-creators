import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import path from 'node:path';
import {layoutProblem} from '../../maze/creator-runtime.js?v=20261017-cna1';

const repo=path.resolve(fileURLToPath(new URL('../../../../',import.meta.url)));
const hash=b=>createHash('sha256').update(b).digest('hex');
const CREATOR_MANIFEST='halloween-exhibition/preview/maze/data/creator-characters.json';
const CNA_ID='grand_daisy8632',CNA_PROFILE='https://note.com/grand_daisy8632',CNA_GROUP='cna-profile-guests';
const APPROVAL='cna-three-character-reference-20261017';
const REFERENCE_SHA='a57e9b0109b670f224cbbeca4fe9221543dbe3b3beabb1bc244bff545081d4be';
const CROP_SHA='55d78eb195c199db23f8ec1b9bcf584345c4f45d1421a63c3fea80d230d26ce9';
const AVATAR_SHA='6589dc2a6b83f495d40325f94354458b3ec399f4268f90d4eba5077de1e52397';
const CNA_ASSETS=Object.freeze({
 'cna-black-bob':{label:'CNA運営（黒髪のキャラ）',sha256:'162b3af364f51806d97aa482e896189be33ad528de36d529eb2c3b9a92343335',sourceSHA256:'b7dce243ded47989fdfd38d43d6d2b20eb06b6671f8766a25d476cc2877a6340'},
 'cna-star-twintails':{label:'CNA運営（星のツインテールのキャラ）',sha256:'a74a6d5a998d8991318d938fdb215339220bf7dcaabb6fdfd5651e0cbbe1d4fb',sourceSHA256:'0a0271c32e5bc649914a2ed47e61ac3caf0ada636216c17fa3f72205731f5ca2'},
 'cna-orange-glasses':{label:'CNA運営（眼鏡のキャラ）',sha256:'0ed06f8b543bf4a35711b89003b593cca84589414c5d0d6ac7f4b59f1327ebd2',sourceSHA256:'8e0be1a7016971e0190d4f860dbc6dad19b607133eafa3d82e1ec4a1677620ed'},
});
const CNA_ENTITIES=Object.keys(CNA_ASSETS);
const array=value=>Array.isArray(value)?value:[];
const without=(object,keys)=>Object.fromEntries(Object.entries(object||{}).filter(([key])=>!keys.includes(key)));
const exactKeys=(object,keys)=>isDeepStrictEqual(Object.keys(object||{}).sort(),[...keys].sort());

/** Compare to the immutable git baseline. Only this named three-character user
 * approval can extend the manifest; all prior cast/data remain deep-equal.
 * assetInfo contains actual local file hashes and sizes, not manifest claims. */
export function auditCnaManifestAddition(baseline,current,archive,assetInfo={}){
 const failures=[],check=(condition,message)=>{if(!condition)failures.push(message);};
 const equal=(actual,expected,message)=>check(isDeepStrictEqual(actual,expected),message);
 const mutable=['revision','characters','groups','slotAssignments','runtimeSummary','referenceReviews','profileGuests'];
 equal(without(current,mutable),without(baseline,mutable),'Unrelated manifest fields changed');
 check(current.revision==='20261017-cna-profile-guests1','Unapproved manifest revision');
 check(array(baseline.characters).length===17&&array(baseline.companions).length===1,'Unexpected baseline cast contract');
 equal(array(current.characters).slice(0,baseline.characters.length),baseline.characters,'Existing character definitions/source references/layouts changed');
 const additions=array(current.characters).slice(baseline.characters.length);
 equal(additions.map(entry=>entry.id),CNA_ENTITIES,'Only the three approved CNA characters may be appended in their approved order');
 equal(current.companions,baseline.companions,'Existing cat/companion definition changed');
 equal(current.groups,[...baseline.groups,{id:CNA_GROUP,requiredEntityIds:CNA_ENTITIES,actorCapacity:3}],'Existing groups changed or unapproved group added');
 equal(current.slotAssignments,{...baseline.slotAssignments,[CNA_GROUP]:'archive-mid-west'},'Existing slots changed or CNA slot is not the approved free capacity-three slot');
 check(!Object.values(baseline.slotAssignments).includes('archive-mid-west'),'CNA slot was not free in baseline');
 equal(without(current.referenceReviews,[CNA_ID]),baseline.referenceReviews,'Existing creator/avatar reference reviews changed');
 const creator=array(archive.creators).find(item=>item.id===CNA_ID);
 check(creator?.profileURL===CNA_PROFILE,'CNA registered official profile changed');
 const pending=array(archive.years).find(year=>year.year===2026)?.entries.filter(entry=>entry.creatorId===CNA_ID)||[];
 check(pending.length===1&&pending[0].submissionStatus==='pending'&&pending[0].visible!==false&&array(pending[0].works).length===0&&array(pending[0].links).every(link=>link.url===CNA_PROFILE),'CNA must remain one pending entry without a submitted/fabricated article');
 equal(current.profileGuests,[{creatorId:CNA_ID,approved:true,approvalId:APPROVAL,referenceSHA256:REFERENCE_SHA,entityIds:CNA_ENTITIES,profileURL:CNA_PROFILE,submissionStatus:'pending'}],'Unapproved profile-guest grant or reference hash');
 const review=current.referenceReviews?.[CNA_ID],avatar=review?.avatarReference;
 check(exactKeys(review,['decision','reviewed','avatarVisuallyInspected','entityIds','avatarReference','userApproval']),'Unexpected CNA review fields');
 check(review?.decision==='user-confirmed-profile-guest'&&review.reviewed===true&&review.avatarVisuallyInspected===true,'CNA review is not the explicit approved visual exception');
 equal(review?.entityIds,CNA_ENTITIES,'CNA review must cover exactly three approved entities');
 check(exactKeys(avatar,['kind','profileURL','imageURL','referenceSHA256','verified','userSelected','verifiedAtUTC']),'Unexpected CNA avatar review fields');
 check(avatar?.kind==='profile-avatar'&&avatar.profileURL===CNA_PROFILE&&avatar.imageURL===creator?.avatar&&avatar.referenceSHA256===AVATAR_SHA&&avatar.verified===true&&avatar.userSelected===true&&Number.isFinite(Date.parse(avatar.verifiedAtUTC)),'CNA avatar review is not the verified current official avatar');
 equal(review?.userApproval,{referenceId:APPROVAL,referenceSHA256:REFERENCE_SHA,scope:'Three visual game guests only. Submission status and article links unchanged.'},'CNA approval scope changed');
 const allowedEntryKeys=['id','creatorId','groupId','groupOrder','role','participationRole','label','entityIds','articleURL','profileURL','ready','identityReviewed','animationReviewed','continuousAnimationReviewed','source','asset','heightPx','heightWorld','greeting','greetingKind','technicalNotes'];
 for(const [order,id]of CNA_ENTITIES.entries()){
  const entry=additions.find(item=>item.id===id),approved=CNA_ASSETS[id],info=assetInfo[id];
  if(!entry){failures.push('Missing approved CNA character: '+id);continue;}
  check(exactKeys(entry,allowedEntryKeys),'Unexpected CNA character fields: '+id);
  check(entry.creatorId===CNA_ID&&entry.groupId===CNA_GROUP&&entry.groupOrder===order&&entry.role==='npc'&&entry.participationRole==='profile-guest'&&entry.label===approved.label,'Unapproved CNA identity/group/role: '+id);
  equal(entry.entityIds,[id],'CNA definition must represent exactly its own entity: '+id);
  check(entry.articleURL===null&&entry.profileURL===CNA_PROFILE,'CNA may link only to its official profile: '+id);
  check(entry.ready===true&&entry.identityReviewed===true&&entry.animationReviewed===true&&entry.continuousAnimationReviewed===false,'CNA readiness/animation limitation changed: '+id);
  equal(entry.source,{kind:'user-upload',referenceId:APPROVAL,referenceSHA256:REFERENCE_SHA,croppedReferenceSHA256:CROP_SHA,verified:true},'Unapproved CNA source provenance: '+id);
  check(typeof entry.greeting==='string'&&entry.greeting.trim().length>0&&entry.greeting.length<=180&&entry.greetingKind==='fictional-game-dialogue','CNA greeting must remain explicitly game fiction: '+id);
  check(entry.heightPx===76&&entry.heightWorld===2.1&&array(entry.technicalNotes).length===2&&entry.technicalNotes.every(note=>typeof note==='string'&&note.length<=600),'Unexpected CNA display/review metadata: '+id);
  const asset=entry.asset;
  check(exactKeys(asset,['src','width','height','sha256','sourceSHA256','originalDimensions','encoding','layout']),'Unexpected CNA asset fields: '+id);
  check(asset?.src===`assets/creator-npcs/${id}-walk.webp`&&asset.width===1024&&asset.height===1024&&asset.sha256===approved.sha256&&asset.sourceSHA256===approved.sourceSHA256,'Unapproved CNA atlas path/hash/dimensions: '+id);
  equal(asset?.originalDimensions,[1254,1254],'CNA original dimensions changed: '+id);
  equal(asset?.encoding,{format:'WebP',quality:90,alpha:'preserved',runtimeMaxDimension:1024},'CNA delivery encoding changed: '+id);
  check(layoutProblem(asset)===null,'Invalid CNA measured frame layout: '+id);
  check(info?.sha256===approved.sha256&&Number.isSafeInteger(info.bytes)&&info.bytes>0,'Approved CNA atlas local byte integrity failed: '+id);
 }
 const addedBytes=CNA_ENTITIES.reduce((sum,id)=>sum+(assetInfo[id]?.bytes||0),0),allCharacters=[...array(current.characters),...array(current.companions)];
 const entities=allCharacters.reduce((sum,entry)=>sum+array(entry.entityIds).length,0);
 const expectedSummary={...baseline.runtimeSummary,creatorCharacters:baseline.characters.length+3,preservedEntities:baseline.runtimeSummary.preservedEntities+3,atlasFrames:baseline.runtimeSummary.atlasFrames+48,
  npcAtlases:baseline.runtimeSummary.npcAtlases+3,interactiveNPCs:baseline.runtimeSummary.interactiveNPCs+3,allCharacterTransferBytes:baseline.runtimeSummary.allCharacterTransferBytes+addedBytes,
  profileGuestAtlases:3,profileGuestEntities:3,totalCastAtlases:baseline.characters.length+baseline.companions.length+3,totalCastEntities:baseline.runtimeSummary.preservedEntities+3};
 equal(current.runtimeSummary,expectedSummary,'Manifest summary must equal preserved baseline plus exactly three measured CNA atlases/entities');
 check(allCharacters.length===21&&entities===25,'Cast totals must remain 21 atlases / 25 entities');
 return failures;
}

export async function verifyPreservation(){
 const inventory=JSON.parse(await readFile(new URL('../baseline-inventory.json',import.meta.url))),failures=[],checked=[];
 const original=file=>execFileSync('git',['show',inventory.baselineCommit+':'+file],{cwd:repo,maxBuffer:16*1024*1024});
 let baselineManifest,currentManifest;
 for(const item of inventory.files){
  const bytes=await readFile(path.join(repo,item.path));
  if(item.path===CREATOR_MANIFEST){
   const baselineBytes=original(item.path);
   if(hash(baselineBytes)!==item.sha256)failures.push('Baseline inventory manifest hash no longer matches immutable git blob');
   baselineManifest=JSON.parse(baselineBytes);currentManifest=JSON.parse(bytes);
  }else if(hash(bytes)!==item.sha256)failures.push(item.path+' changed');
  checked.push(item.path);
 }
 for(const item of [...inventory.characterAssets,...inventory.monsterAssets]){
  const file=item.path||item.file;if(!file)continue;
  if(hash(await readFile(path.join(repo,file)))!==hash(original(file)))failures.push(file+' changed');checked.push(file);
 }
 const assetInfo={};for(const id of CNA_ENTITIES){
  const file='halloween-exhibition/preview/maze/assets/creator-npcs/'+id+'-walk.webp';
  try{const bytes=await readFile(path.join(repo,file));assetInfo[id]={bytes:bytes.length,sha256:hash(bytes)};}catch{failures.push('Missing approved CNA atlas: '+file);}
  checked.push(file);
 }
 const archive=JSON.parse(await readFile(path.join(repo,'halloween-exhibition/preview/data/archive.json')));
 if(!baselineManifest||!currentManifest)failures.push('Creator manifest baseline/current comparison missing');
 else failures.push(...auditCnaManifestAddition(baselineManifest,currentManifest,archive,assetInfo));
 const names=execFileSync('git',['diff','--name-only',inventory.baselineCommit],{cwd:repo,encoding:'utf8'}).trim().split('\n').filter(Boolean);
 for(const name of names)if(!name.startsWith('halloween-exhibition/preview/'))failures.push('Outside authorized app scope: '+name);
 for(const name of ['castle-visit-counter.js','castle-counter-bootstrap.js']){
  const file='halloween-exhibition/preview/'+name;
  if(hash(await readFile(path.join(repo,file)))!==hash(original(file)))failures.push('Counter changed: '+name);checked.push(file);
 }
 return {baseline:inventory.baselineCommit,checked:checked.length,bytePreservedJSON:inventory.files.length-1,bytePreservedAssets:inventory.characterAssets.length+inventory.monsterAssets.length,approvedProfileGuestAdditions:3,failures,passed:failures.length===0};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=await verifyPreservation();console.log(JSON.stringify(result,null,2));if(!result.passed)process.exitCode=1;
}
