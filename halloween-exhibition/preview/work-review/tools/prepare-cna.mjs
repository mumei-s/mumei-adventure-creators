/** Pack user-confirmed CNA artwork. No archive/submission/old actor edits. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),sharp=require('sharp');
const root=path.resolve(new URL('../../../../',import.meta.url).pathname),review=path.join(root,'halloween-exhibition/preview/work-review'),maze=path.join(root,'halloween-exhibition/preview/maze');
const sha=b=>createHash('sha256').update(b).digest('hex');
const manifestFile=path.join(maze,'data/creator-characters.json'),m=JSON.parse(await fs.readFile(manifestFile));
const archive=JSON.parse(await fs.readFile(path.join(maze,'../data/archive.json'))),creator=archive.creators.find(c=>c.id==='grand_daisy8632');
const ref=path.resolve(process.argv[2]||path.join(root,'../upload/01-1000016225.jpg'));
const referenceSHA256=sha(await fs.readFile(ref)),crop=await fs.readFile(path.join(review,'assets/cna-originals/reference-characters.png'));
const ids=['cna-black-bob','cna-star-twintails','cna-orange-glasses'];
const labels=['CNA運営（黒髪のキャラ）','CNA運営（星のツインテールのキャラ）','CNA運営（眼鏡のキャラ）'];
const greetings=['城の街へ、ようこそ。三人で街の灯りを見に来たよ。','星の灯りをたどって、城下町を歩いてみよう。','街の道と灯りを、ゆっくり見て回っているよ。'];
const assets=[];
for(let n=0;n<ids.length;n++){
 const id=ids[n],original=await fs.readFile(path.join(review,'assets/cna-originals',id+'.png'));
 const info=await sharp(original).metadata();
 if(info.width!==info.height)throw Error('CNA source atlas must be square');
 const encoded=await sharp(original).resize(1024,1024).webp({quality:90,alphaQuality:100}).toBuffer();
 await fs.writeFile(path.join(maze,'assets/creator-npcs',id+'-walk.webp'),encoded);
 const {data,info:raw}=await sharp(encoded).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const frames=[];
 for(let row=0;row<4;row++){
  const cells=[];
  for(let col=0;col<4;col++){
   let minX=256,minY=256,maxX=-1,maxY=-1;
   for(let y=0;y<256;y++)for(let x=0;x<256;x++)if(data[((row*256+y)*raw.width+col*256+x)*4+3]>48){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
   if(maxX<0)throw Error('Empty CNA cell');
   cells.push({frame:[col*256,row*256,256,256],anchorX:.5,anchorY:(maxY+1)/256,contentHeight:maxY-minY+1});
  }
  frames.push(cells);
 }
 const asset={src:'assets/creator-npcs/'+id+'-walk.webp',width:1024,height:1024,sha256:sha(encoded),sourceSHA256:sha(original),originalDimensions:[info.width,info.height],encoding:{format:'WebP',quality:90,alpha:'preserved',runtimeMaxDimension:1024},layout:{directions:['down','left','right','up'],columns:4,rows:4,idleColumn:0,walkColumns:[0,1,2,3],frames}};
 assets.push(asset);
 const entry={id,creatorId:creator.id,groupId:'cna-profile-guests',groupOrder:n,role:'npc',participationRole:'profile-guest',label:labels[n],entityIds:[id],articleURL:null,profileURL:creator.profileURL,ready:true,identityReviewed:true,animationReviewed:true,continuousAnimationReviewed:false,source:{kind:'user-upload',referenceId:'cna-three-character-reference-20261017',referenceSHA256,croppedReferenceSHA256:sha(crop),verified:true},asset,heightPx:76,heightWorld:2.1,greeting:greetings[n],greetingKind:'fictional-game-dialogue',technicalNotes:['User explicitly approved the three attached CNA characters on 2026-10-17. Article remains pending; link is profile only.','Four-direction atlas identity and layout reviewed. Continuous turn/attack artwork is not certified.']};
 const index=m.characters.findIndex(c=>c.id===id);if(index<0)m.characters.push(entry);else m.characters[index]=entry;
}
m.profileGuests=[{creatorId:creator.id,approved:true,approvalId:'cna-three-character-reference-20261017',referenceSHA256,entityIds:ids,profileURL:creator.profileURL,submissionStatus:'pending'}];
const group={id:'cna-profile-guests',requiredEntityIds:ids,actorCapacity:3};
const gi=m.groups.findIndex(g=>g.id===group.id);if(gi<0)m.groups.push(group);else m.groups[gi]=group;
m.slotAssignments[group.id]='archive-mid-west';
const avatar=await fs.readFile(path.join(review,'evidence/cast-comparison/avatars/grand_daisy8632.png'));
m.referenceReviews[creator.id]={decision:'user-confirmed-profile-guest',reviewed:true,avatarVisuallyInspected:true,entityIds:ids,avatarReference:{kind:'profile-avatar',profileURL:creator.profileURL,imageURL:creator.avatarSource,referenceSHA256:sha(avatar),verified:true,userSelected:true,verifiedAtUTC:new Date().toISOString()},userApproval:{referenceId:'cna-three-character-reference-20261017',referenceSHA256,scope:'Three visual game guests only. Submission status and article links unchanged.'}};
m.revision='20261017-cna-profile-guests1';
const allActors=[...m.characters,...(m.companions||[])],totalEntities=allActors.reduce((n,c)=>n+(c.entityIds?.length||1),0);
const allCharacterTransferBytes=(await Promise.all(allActors.map(c=>fs.stat(path.join(maze,c.asset.src))))).reduce((n,s)=>n+s.size,0);
m.runtimeSummary={...m.runtimeSummary,creatorCharacters:m.characters.length,preservedEntities:totalEntities,atlasFrames:allActors.length*16,npcAtlases:m.characters.filter(c=>c.role==='npc').length,interactiveNPCs:18,allCharacterTransferBytes,profileGuestAtlases:3,profileGuestEntities:3,totalCastAtlases:allActors.length,totalCastEntities:totalEntities};
await fs.writeFile(manifestFile,JSON.stringify(m,null,2)+'\n');
await fs.writeFile(path.join(review,'assets/cna-originals/provenance.json'),JSON.stringify({referenceId:'cna-three-character-reference-20261017',referenceSHA256,croppedReferenceSHA256:sha(crop),source:'User attached CNA chibi banner and explicit approval; unrelated note account chrome excluded from distributed reference.',generation:'Built-in image generation, three separate atlases',adoptedForIdentity:true,continuousAnimationCertified:false,assets},null,2)+'\n');
console.log(JSON.stringify({actors:ids,atlases:m.characters.length+(m.companions||[]).length,entities:m.runtimeSummary.totalCastEntities,articleStillPending:archive.years.some(y=>y.entries.some(e=>e.creatorId===creator.id&&e.submissionStatus==='pending'))}));
