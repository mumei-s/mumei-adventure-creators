#!/usr/bin/env node
// Deterministic packing only: pixels come from newly authored transparent parts.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const require=createRequire(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'package.json'));
const sharp=require('sharp');
const hash=buffer=>createHash('sha256').update(buffer).digest('hex');
async function atomic(file,data){await fs.mkdir(path.dirname(file),{recursive:true});const temp=file+'.packing';await fs.writeFile(temp,data);await fs.rename(temp,file);}

/** Input {manifestPath,atlases:{key:PNGpath},output,authoringOutput,id,review}.
 * One source atlas scales to1024. Multiple directional sources each occupy a
 * padded512square tile, at most4across. Skeleton dimensions remain unchanged.
 */
export async function compactRigArt(config){
 const original=JSON.parse(await fs.readFile(config.manifestPath,'utf8')),manifest=structuredClone(original),keys=Object.keys(config.atlases);
 if(config.outputSettings)manifest.output={...manifest.output,...config.outputSettings};
 if(!keys.length||keys.length>16)throw Error('One to sixteen authoring atlases are required');
 const one=keys.length===1,columns=one?1:Math.min(4,keys.length),rows=one?1:Math.ceil(keys.length/columns),tile=one?1024:512,width=columns*tile,height=rows*tile;
 const transforms={},sources=[],composites=[];
 for(const[key,index]of keys.map((key,i)=>[key,i])){
  const bytes=await fs.readFile(config.atlases[key]),meta=await sharp(bytes).metadata();
  if(!meta.width||!meta.height||!meta.hasAlpha)throw Error('A nonempty transparent authoring atlas is required: '+key);
  const scale=Math.min(tile/meta.width,tile/meta.height),w=Math.round(meta.width*scale),h=Math.round(meta.height*scale),x=(index%columns)*tile,y=Math.floor(index/columns)*tile;
  const resized=await sharp(bytes).resize(w,h,{kernel:'lanczos3'}).png().toBuffer();composites.push({input:resized,left:x,top:y});transforms[key]={scale,x,y};
  const authoring=await sharp(bytes).webp({quality:96,alphaQuality:100}).toBuffer();
  await atomic(path.join(config.authoringOutput,key+'.webp'),authoring);
  sources.push({key,originalSHA256:hash(bytes),authoringSHA256:hash(authoring),sourceWidth:meta.width,sourceHeight:meta.height,transform:transforms[key]});
 }
 function parts(items,atlas){
  for(const part of Object.values(items||{})){
   const key=part.atlas||atlas||original.atlas||keys[0],t=transforms[key];if(!t)throw Error('Unmapped part atlas '+key);
   const rect=part.rect||part.frame;if(rect){const next=[rect[0]*t.scale+t.x,rect[1]*t.scale+t.y,rect[2]*t.scale,rect[3]*t.scale];if(part.rect)part.rect=next;else part.frame=next;}
   for(const property of['pivot','end'])if(part[property])part[property]=part[property].map(n=>n*t.scale);
   for(const property of['contentHeight','span'])if(Number.isFinite(part[property]))part[property]*=t.scale;
   if(part.atlas)part.atlas='main';
  }
 }
 parts(manifest.parts,manifest.atlas);
 for(const view of Object.values(manifest.views||{})){parts(view.parts,view.atlas);view.atlas='main';delete view.src;}
 manifest.atlas='main';manifest.atlases={main:'./parts.webp'};manifest.width=width;manifest.height=height;
 manifest.id=config.id||manifest.id;manifest.review={...manifest.review,...config.review};
 manifest.provenance={...manifest.provenance,deliveryPacking:'Only atlas packing and Lanczos resampling; rig dimensions, costume pixels and alpha remain authored.',authoringSources:sources};
 const production=await sharp({create:{width,height,channels:4,background:'#00000000'}}).composite(composites).webp({quality:94,alphaQuality:100}).toBuffer();
 await atomic(path.join(config.output,'parts.webp'),production);
 await atomic(path.join(config.output,'rig.json'),JSON.stringify(manifest,null,2)+'\n');
 const authoringManifest=structuredClone(original);authoringManifest.atlases=Object.fromEntries(keys.map(key=>[key,'./'+key+'.webp']));
 for(const view of Object.values(authoringManifest.views||{}))delete view.src;
 await atomic(path.join(config.authoringOutput,'manifest.json'),JSON.stringify(authoringManifest,null,2)+'\n');
 await atomic(path.join(config.authoringOutput,'packing.json'),JSON.stringify({sources,width,height,productionSHA256:hash(production),skeletonRescaled:false},null,2)+'\n');
 return{id:manifest.id,output:config.output,bytes:production.length,width,height,sha256:hash(production)};
}
if(process.argv[2]){const config=JSON.parse(await fs.readFile(process.argv[2],'utf8'));console.log(JSON.stringify(await compactRigArt(config)));}
