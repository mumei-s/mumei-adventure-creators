/** Visual audit sheets for the new Doyle rig; development-only native Canvas. */
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createOwnerRig,drawOwnerPose} from '../maze/owner-rig.js';
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas'),base=fileURLToPath(new URL('../',import.meta.url));
const out=process.argv[2];if(!out)throw Error('Pass an output directory for review artifacts.');fs.mkdirSync(out,{recursive:true});
const manifest=JSON.parse(fs.readFileSync(path.join(base,'maze/assets/rigs/doyle-halloween-boy/rig.json'))),atlas={main:await loadImage(path.join(base,'maze/assets/rigs/doyle-halloween-boy/parts.webp'))};
const cellW=300,cellH=390,sheet=createCanvas(cellW*5,cellH*4),ctx=sheet.getContext('2d');ctx.fillStyle='#eee8d7';ctx.fillRect(0,0,sheet.width,sheet.height);ctx.font='16px sans-serif';ctx.fillStyle='#332b4b';
const records=[],directions=['down','left','right','up'];
for(const [row,direction]of directions.entries()){
 const heading=manifest.views[direction].heading,rig=createOwnerRig({manifest,...manifest.motion}),idle=rig.reset({x:0,z:0},heading),samples=[];
 for(let i=0;i<360;i++){const moving=i>10&&i<300,d=Math.max(0,Math.min(i-10,290))*.8/60; samples.push(rig.update({position:{x:Math.sin(heading)*d,z:Math.cos(heading)*d},heading,dt:1/60,moving,worldPixelsPerUnit:48,displayHeightPx:86,groundDepthScale:.78}));}
 const high=samples.reduce((a,b)=>a.joints.neck.y<b.joints.neck.y?a:b),low=samples.reduce((a,b)=>a.joints.neck.y>b.joints.neck.y?a:b),poses=[idle,high,low];
 for(const yawOffset of [-Math.PI/4+.01,Math.PI/4-.01]){const turnRig=createOwnerRig({manifest,...manifest.motion}),yaw=heading+yawOffset;let pose;for(let i=0;i<120;i++){const d=i*.8/60;pose=turnRig.update({position:{x:Math.sin(yaw)*d,z:Math.cos(yaw)*d},heading:yaw,dt:1/60,moving:true,worldPixelsPerUnit:48,displayHeightPx:86,groundDepthScale:.78});}poses.push(pose);turnRig.destroy();}
 const labels=['idle','highest walking neck','lowest walking neck','turn -44.4 degrees','turn +44.4 degrees'];
 poses.forEach((pose,col)=>{drawOwnerPose(ctx,atlas,manifest,pose,{x:col*cellW+150,y:row*cellH+300,scale:1});ctx.fillText(`${direction}: ${labels[col]}`,col*cellW+14,row*cellH+370);records.push({direction,label:labels[col],neck:pose.joints.neck,headRotation:pose.layers.find(layer=>layer.part==='head').rotation,view:pose.view,feet:pose.feet});});rig.destroy();
}
fs.writeFileSync(path.join(out,'doyle-motion-extremes.png'),sheet.toBuffer('image/png'));fs.writeFileSync(path.join(out,'doyle-motion-extremes.json'),JSON.stringify(records,null,2)+'\n');
// Also inspect the actual runtime projection at the two tested display heights.
const projection=createCanvas(600,220),p=projection.getContext('2d');p.fillStyle='#eee8d7';p.fillRect(0,0,600,220);p.fillStyle='#332b4b';p.font='12px sans-serif';
for(let row=0;row<2;row++)for(let col=0;col<4;col++){const height=[76,86][row],direction=directions[col],rig=createOwnerRig({manifest,...manifest.motion}),heading=manifest.views[direction].heading;drawOwnerPose(p,atlas,manifest,rig.reset({x:0,z:0},heading),{x:75+col*150,y:row*110+94,scale:height/manifest.contentHeight});p.fillText(`${direction} ${height}px`,col*150+36,row*110+108);rig.destroy();}
fs.writeFileSync(path.join(out,'doyle-game-scale.png'),projection.toBuffer('image/png'));console.log(JSON.stringify({sheet:path.join(out,'doyle-motion-extremes.png'),samples:records.length}));
