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

/** Reposition exact RGBA rectangles with two pixels of filter padding. This
 * changes atlas storage only. Every copied rectangle is byte-hash verified.
 */
export async function densifyRigAtlas(manifest,png){
 const {data,info}=await sharp(png).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const groups=new Map();
 for(const view of [manifest,...Object.values(manifest.views||{})])for(const part of Object.values(view.parts||{})){
  if(part.visible===false)continue;const rect=part.rect||part.frame;if(!rect)continue;
  const [x,y,w,h]=rect;if(![x,y,w,h].every(Number.isFinite)||x<0||y<0||w<=0||h<=0||x+w>info.width+1e-6||y+h>info.height+1e-6)throw Error('Part outside intermediate atlas');
  const left=Math.max(0,Math.floor(x)-2),top=Math.max(0,Math.floor(y)-2),right=Math.min(info.width,Math.ceil(x+w)+2),bottom=Math.min(info.height,Math.ceil(y+h)+2),key=[left,top,right,bottom].join(':');
  if(!groups.has(key))groups.set(key,{left,top,width:right-left,height:bottom-top,refs:[]});groups.get(key).refs.push({part,rect:[...rect]});
 }
 const items=[...groups.values()].sort((a,b)=>b.height-a.height||b.width-a.width||a.top-b.top||a.left-b.left);if(!items.length)throw Error('No visible authored parts');
 let best=null;
 for(const width of [256,512,768,1024,1536,2048,3072,4096]){
  if(items.some(item=>item.width>width))continue;let x=0,y=0,rowHeight=0;const positions=[];
  for(const item of items){if(x+item.width>width){x=0;y+=rowHeight;rowHeight=0;}positions.push({x,y});x+=item.width;rowHeight=Math.max(rowHeight,item.height);}
  const height=Math.max(64,Math.ceil((y+rowHeight)/64)*64);if(height>4096)continue;const score=width*height;
  if(!best||score<best.score)best={width,height,positions,score};
 }
 if(!best)throw Error('Dense atlas exceeds runtime image limit');
 const output=Buffer.alloc(best.width*best.height*4),receipts=[];
 for(const [index,item]of items.entries()){
  const at=best.positions[index],before=createHash('sha256'),after=createHash('sha256');
  for(let row=0;row<item.height;row++){
   const source=((item.top+row)*info.width+item.left)*4,target=((at.y+row)*best.width+at.x)*4,count=item.width*4;
   before.update(data.subarray(source,source+count));data.copy(output,target,source,source+count);after.update(output.subarray(target,target+count));
  }
  const sourceHash=before.digest('hex'),destinationHash=after.digest('hex');if(sourceHash!==destinationHash)throw Error('Dense atlas changed authored pixels');
  for(const {part,rect}of item.refs){const next=[at.x+rect[0]-item.left,at.y+rect[1]-item.top,rect[2],rect[3]];if(part.rect)part.rect=next;else part.frame=next;}
  receipts.push({sourceRect:[item.left,item.top,item.width,item.height],packedRect:[at.x,at.y,item.width,item.height],rgbaSHA256:sourceHash,byteExact:true,references:item.refs.length});
 }
 manifest.width=best.width;manifest.height=best.height;
 return{png:await sharp(output,{raw:{width:best.width,height:best.height,channels:4}}).png().toBuffer(),width:best.width,height:best.height,receipts,intermediateSize:[info.width,info.height]};
}

/** Input {manifestPath,atlases:{key:PNGpath},output,authoringOutput,id,review}.
 * One source atlas scales to1024. Multiple directional sources each occupy a
 * padded512square tile, at most4across. Skeleton dimensions remain unchanged.
 */
export async function compactRigArt(config){
 const original=JSON.parse(await fs.readFile(config.manifestPath,'utf8')),manifest=structuredClone(original),keys=Object.keys(config.atlases);
 if(config.outputSettings)manifest.output={...manifest.output,...config.outputSettings};
 if(!keys.length||keys.length>16)throw Error('One to sixteen authoring atlases are required');
 const one=keys.length===1,columns=one?1:Math.min(4,keys.length),rows=one?1:Math.ceil(keys.length/columns),tile=one?1024:512;
 let width=columns*tile,height=rows*tile,placements=keys.map((key,index)=>({size:tile,x:(index%columns)*tile,y:Math.floor(index/columns)*tile}));
 if(config.tileSizes){
  const limit=config.maxAtlasWidth||2048;let x=0,y=0,rowHeight=0;placements=[];width=0;
  for(const key of keys){const size=config.tileSizes[key]||tile;if(!Number.isInteger(size)||size<128||size>2048||size>limit)throw Error('Invalid authoring tile size');if(x+size>limit){x=0;y+=rowHeight;rowHeight=0;}placements.push({size,x,y});x+=size;rowHeight=Math.max(rowHeight,size);width=Math.max(width,x);}
  height=y+rowHeight;if(width>4096||height>4096)throw Error('Packed atlas exceeds runtime image limit');
 }
 const transforms={},sources=[],composites=[];
 for(const[key,index]of keys.map((key,i)=>[key,i])){
  const bytes=await fs.readFile(config.atlases[key]),meta=await sharp(bytes).metadata();
  if(!meta.width||!meta.height||!meta.hasAlpha)throw Error('A nonempty transparent authoring atlas is required: '+key);
  const {size:tile,x,y}=placements[index],scale=Math.min(tile/meta.width,tile/meta.height),w=Math.round(meta.width*scale),h=Math.round(meta.height*scale);
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
 let png=await sharp({create:{width,height,channels:4,background:'#00000000'}}).composite(composites).png().toBuffer(),dense=null;
 if(config.densePacking!==false){dense=await densifyRigAtlas(manifest,png);png=dense.png;width=dense.width;height=dense.height;manifest.provenance.deliveryPacking+=' Exact RGBA rectangles then densely packed with two-pixel filter padding; every copied rectangle byte-hash verified.';}
 const production=await sharp(png).webp({quality:94,alphaQuality:100}).toBuffer();
 await atomic(path.join(config.output,'parts.webp'),production);
 await atomic(path.join(config.output,'rig.json'),JSON.stringify(manifest,null,2)+'\n');
 const authoringManifest=structuredClone(original);authoringManifest.atlases=Object.fromEntries(keys.map(key=>[key,'./'+key+'.webp']));
 for(const view of Object.values(authoringManifest.views||{}))delete view.src;
 await atomic(path.join(config.authoringOutput,'manifest.json'),JSON.stringify(authoringManifest,null,2)+'\n');
 await atomic(path.join(config.authoringOutput,'packing.json'),JSON.stringify({sources,width,height,productionSHA256:hash(production),skeletonRescaled:false,...dense?{densePacking:{intermediateSize:dense.intermediateSize,receipts:dense.receipts}}:{}},null,2)+'\n');
 return{id:manifest.id,output:config.output,bytes:production.length,width,height,sha256:hash(production)};
}
if(process.argv[2]){const config=JSON.parse(await fs.readFile(process.argv[2],'utf8'));console.log(JSON.stringify(await compactRigArt(config)));}
