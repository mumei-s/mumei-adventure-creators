#!/usr/bin/env node
/** Real createRigLibrary + native Canvas with an in-memory candidate sidecar.
 * No source registry is changed. This is neither HTTP nor browser/GPU testing.
 * --maze /abs/game/maze --manifest /abs/rig.json --output /abs/evidence
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const options=new Map();for(let i=2;i<process.argv.length;i+=2)options.set(process.argv[i],process.argv[i+1]);
for(const key of['--maze','--manifest','--output'])assert.ok(path.isAbsolute(options.get(key)||''),'An absolute '+key+' path is required');
const maze=options.get('--maze'),manifestPath=options.get('--manifest'),out=options.get('--output'),original=JSON.parse(await fs.readFile(manifestPath,'utf8')),manifest=structuredClone(original),id=options.get('--id')||'native-rig-candidate';
const {createRigLibrary}=await import(pathToFileURL(path.join(maze,'rig-animation.js')));
const require=createRequire(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'package.json')),{createCanvas,loadImage}=require('@napi-rs/canvas');
const images=new Map(),canvases=[];for(const[key,value]of Object.entries(original.atlases||{})){const file=path.resolve(path.dirname(manifestPath),value),name='native-candidate-'+key+'.webp';images.set(name,await loadImage(file));manifest.atlases[key]='./data/'+name;}
assert.ok(images.size>0,'Candidate manifest must name atlas files');
function makeCanvas(w,h){const native=createCanvas(w,h);let width=w,height=h;const canvas={native,getContext:kind=>native.getContext(kind),get width(){return width;},set width(value){width=value;native.width=Math.max(1,value);},get height(){return height;},set height(value){height=value;native.height=Math.max(1,value);}};canvases.push(canvas);return canvas;}
const library=createRigLibrary({fetcher:async()=>({ok:true,json:async()=>({schemaVersion:1,rigs:[{id,approved:true,manifest}]})}),loadImage:async url=>{const value=images.get(path.basename(new URL(url).pathname));assert.ok(value,'Unexpected atlas request');return value;},makeCanvas});
const record={method:'Real game rig-animation.js and its rig runtime, injected in-memory candidate sidecar, authored images decoded and rendered with native @napi-rs/canvas. No source registry change. Not browser, HTTP, WebGL, GPU, device or gameplay validation.',id,manifest:original.id,sourceManifestSHA256:createHash('sha256').update(await fs.readFile(manifestPath)).digest('hex'),runtimeSHA256:createHash('sha256').update(await fs.readFile(path.join(maze,'owner-rig.js'))).digest('hex'),cardinalViews:[],samples:0,maxFootReach:0,unsupportedFrames:0,canvasStable:true,statuses:{}};
await library.ready;await library.retry(id);record.statuses.loaded=library.status();assert.equal(record.statuses.loaded.loaded,1);assert.equal(record.statuses.loaded.failures.length,0);
const sheet=createCanvas(1120,650),ctx=sheet.getContext('2d');ctx.fillStyle='#223b45';ctx.fillRect(0,0,sheet.width,sheet.height);ctx.fillStyle='#f4e0b0';ctx.textAlign='center';
function drawSprite(sprite,x,y,height){const scale=height/sprite.contentHeight,[sx,sy,w,h]=sprite.frame;ctx.drawImage(sprite.image.native||sprite.image,sx,sy,w,h,x-w*sprite.anchorX*scale,y-h*sprite.anchorY*scale,w*scale,h*scale);}
for(const[di,direction]of ['down','right','up','left'].entries()){
 const heading=[0,Math.PI/2,Math.PI,-Math.PI/2][di],x=140+di*280;let sprite=library.update(id,{position:{x:0,z:0},heading,motion:false,worldPixelsPerUnit:64,displayHeightPx:76,groundDepthScale:.78,time:di*5,mapId:'native-review'});assert.ok(sprite?.liveRig);assert.equal(sprite.rigPose.view,direction);assert.equal(library.get(id),sprite);record.cardinalViews.push(direction);const image=sprite.image;
 ctx.font='600 18px serif';ctx.fillText(direction.toUpperCase()+' · library / 76px',x,35);drawSprite(sprite,x,150,76);ctx.font='15px serif';ctx.fillText('3× inspection · same live Canvas',x,195);drawSprite(sprite,x,470,228);
 for(let i=1;i<=60;i++){
  sprite=library.update(id,{position:{x:Math.sin(heading)*1.2*i/30,z:Math.cos(heading)*1.2*i/30},heading,motion:true,moving:true,dt:1/30,worldPixelsPerUnit:64,displayHeightPx:76,groundDepthScale:.78,time:di*5+i/30,mapId:'native-review'});assert.ok(sprite);record.canvasStable&&=sprite.image===image;record.samples++;const p=sprite.rigPose;record.maxFootReach=Math.max(record.maxFootReach,p.diagnostics?.leftFootReach||0,p.diagnostics?.rightFootReach||0);if(!p.feet.left.contact&&!p.feet.right.contact)record.unsupportedFrames++;
 }
 drawSprite(sprite,x-65,590,76);sprite=library.battle(id,{effect:{type:'shine',started:0,duration:2.4},time:1.55,heading,motion:true});assert.ok(sprite?.liveRig);assert.equal(sprite.rigPose.view,direction);drawSprite(sprite,x+65,590,86);
}
record.statuses.active=library.status();assert.equal(record.statuses.active.sourceBytes,[...new Set(images.values())].reduce((total,image)=>total+image.width*image.height*4,0));assert.equal(canvases.length,2);assert.ok(record.canvasStable);assert.equal(record.unsupportedFrames,0);
library.prune({activeIds:[]});assert.equal(library.status().active,0);assert.ok(canvases.every(canvas=>canvas.width<=1&&canvas.height<=1));library.destroy();record.statuses.destroyed=library.status();assert.equal(record.statuses.destroyed.sourceBytes,0);
await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,'native-library-proof.png'),sheet.toBuffer('image/png'));await fs.writeFile(path.join(out,'native-library-proof.json'),JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify(record));
