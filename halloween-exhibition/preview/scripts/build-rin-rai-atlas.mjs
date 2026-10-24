/** Reproduce Rai's original four-view, four-phase fallback with the live rig.
 * Uses the optional development-only @napi-rs/canvas backend; no game dependency.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createOwnerRig,drawOwnerPose} from '../maze/owner-rig.js';

export const RAI_FALLBACK=Object.freeze({cell:256,scale:.83,anchorX:128,anchorY:238,samplesPerStride:240,directions:Object.freeze(['down','left','right','up'])});
export function raiFallbackPoses(manifest,direction){
 const heading=manifest.views[direction].heading,rig=createOwnerRig({manifest,...manifest.motion}),poses=[rig.reset({x:0,z:0},heading)],steps=RAI_FALLBACK.samplesPerStride;
 for(let step=1;step<=steps*.75;step++){
  const distance=step*manifest.motion.strideLength/steps;
  const pose=rig.update({position:{x:Math.sin(heading)*distance,z:Math.cos(heading)*distance},heading,dt:1/steps,moving:true});
  if(step%(steps/4)===0)poses.push(pose);
 }
 rig.destroy();return poses;
}
export function measureAlphaBounds(context,x,y,width,height){
 const {data}=context.getImageData(x,y,width,height);let minX=width,minY=height,maxX=-1,maxY=-1;
 for(let py=0;py<height;py++)for(let px=0;px<width;px++)if(data[(py*width+px)*4+3]){minX=Math.min(minX,px);minY=Math.min(minY,py);maxX=Math.max(maxX,px);maxY=Math.max(maxY,py);}
 if(maxX<0)throw Error('An empty Rai fallback frame was rendered');
 return[x+minX,y+minY,x+maxX+1,y+maxY+1];
}
export function renderRaiAtlas({manifest,atlas,createCanvas}){
 const {cell,scale,anchorX,anchorY,directions}=RAI_FALLBACK,canvas=createCanvas(cell*4,cell*4),context=canvas.getContext('2d'),frameCanvas=createCanvas(cell,cell),frameContext=frameCanvas.getContext('2d'),frames=[];
 for(const [row,direction]of directions.entries()){
  const cells=[];for(const [column,pose]of raiFallbackPoses(manifest,direction).entries()){
   const x=column*cell,y=row*cell;frameContext.clearRect(0,0,cell,cell);
   // Keep the original cell-local transform: large atlas offsets can round
   // subpixel limb edges differently even when their geometry is identical.
   drawOwnerPose(frameContext,{main:atlas},manifest,pose,{x:anchorX,y:anchorY,scale});context.drawImage(frameCanvas,x,y);
   cells.push({frame:[x,y,cell,cell],anchorX:anchorX/cell,anchorY:anchorY/cell,contentHeight:manifest.contentHeight*scale,runtimeAlphaBounds:measureAlphaBounds(context,x,y,cell,cell)});
  }frames.push(cells);
 }
 return{canvas,frames};
}
async function main(){
 const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas'),root=new URL('../',import.meta.url);
 const rigURL=new URL('maze/assets/rigs/rin-rai-lion/rig.json',root),manifest=JSON.parse(fs.readFileSync(rigURL)),atlas=await loadImage(fileURLToPath(new URL('maze/assets/rigs/rin-rai-lion/parts.webp',root)));
 const {canvas,frames}=renderRaiAtlas({manifest,atlas,createCanvas}),bytes=await canvas.encode('webp',90),imageURL=new URL('maze/assets/creator-npcs/rin-rai-lion-walk.webp',root),dataURL=new URL('maze/data/creator-characters.json',root),data=JSON.parse(fs.readFileSync(dataURL)),character=data.characters.find(item=>item.id===manifest.id);
 // Encoding must retain the renderer's exact alpha, including joint overlaps.
 const decoded=await loadImage(bytes),check=createCanvas(canvas.width,canvas.height);check.getContext('2d').drawImage(decoded,0,0);
 const before=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data,after=check.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
 for(let index=3;index<before.length;index+=4)if(before[index]!==after[index])throw Error('WebP encoding changed fallback alpha');
 const sha256=crypto.createHash('sha256').update(bytes).digest('hex');
 if(process.argv.includes('--check')){
  if(!fs.readFileSync(imageURL).equals(bytes)||character.asset.sha256!==sha256||JSON.stringify(character.asset.layout.frames)!==JSON.stringify(frames))throw Error('Rai fallback or measured metadata is stale');
 }else{
  character.asset.layout.frames=frames;character.asset.sha256=sha256;fs.writeFileSync(imageURL,bytes);fs.writeFileSync(dataURL,JSON.stringify(data,null,2)+'\n');
 }
 console.log(JSON.stringify({id:manifest.id,sha256,frames:frames.flat().length,bytes:bytes.length,alphaPreserved:true,check:process.argv.includes('--check')}));
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])await main();
