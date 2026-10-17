// Executes the real actor/resource path with Three objects; no GPU allocation is claimed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../vendor/three.module.js';
import {spriteTextureUV} from '../monster-motion.js';

const source=fs.readFileSync(new URL('../world.js',import.meta.url),'utf8'),actorsSource=source.slice(source.indexOf('  const creatorNodes='),source.indexOf('  function pickCreator('));
function canvas(width=256,height=320){const image={width,height,alpha:255};let painted=image;const context={drawImage(source){painted=source;},getImageData:()=>({width:image.width,height:image.height,data:new Uint8ClampedArray(image.width*image.height*4).fill(painted.alpha??255)})};image.getContext=()=>context;return image;}
function harness(){
 const resources=new Set(),scene=new THREE.Scene(),contactMaterial=new THREE.MeshBasicMaterial();
 const context=vm.createContext({THREE,resources,scene,CELL:4,document:{createElement:()=>canvas()},creatorNameTexture:()=>new THREE.CanvasTexture(canvas()),
  contactShadow(x,z){const geometry=new THREE.PlaneGeometry(1,1);resources.add(geometry);const object=new THREE.Mesh(geometry,contactMaterial);object.position.set(x,0,z);scene.add(object);return object;},
 });
 vm.runInContext(`${actorsSource}\nglobalThis.api={update:updateCreatorActors,pixel:creatorPixelVisible,nodes:creatorNodes};`,context);
 return {api:context.api,resources,scene,dispose(){context.api.update([]);for(const resource of resources)resource.dispose();resources.clear();contactMaterial.dispose();}};
}
test('palace live poses retain one texture allocation and invalidate cached alpha pixels on revision',()=>{
 const h=harness(),image=canvas(),actor={id:'live',x:8,z:8,interactive:false,sprite:{image,frame:[0,0,256,320],anchorY:.94,contentHeight:280,poseVersion:0}};
 h.api.update([actor]);const entry=h.api.nodes.get(actor.id),texture=entry.texture,initialVersion=texture.version,baseline=h.resources.size;let disposals=0;texture.addEventListener('dispose',()=>disposals++);assert.equal(h.api.pixel(entry,{x:.5,y:.5}),true);
 for(let poseVersion=1;poseVersion<=120;poseVersion++){image.alpha=poseVersion===120?0:255;actor.sprite={...actor.sprite,poseVersion};h.api.update([actor]);assert.equal(entry.texture,texture);assert.equal(entry.material.map,texture);assert.equal(h.resources.size,baseline);}
 assert.equal(texture.version,initialVersion+120);assert.equal(h.api.pixel(entry,{x:.5,y:.5}),false);h.api.update([actor]);assert.equal(texture.version,initialVersion+120);assert.equal(disposals,0);
 h.api.update([]);assert.equal(h.api.nodes.size,0);assert.equal(h.resources.size,0);assert.equal(disposals,1);h.dispose();assert.equal(disposals,1);
});
test('palace static atlas frame changes retain their texture and live canvas replacements release old allocations',()=>{
 const h=harness(),image=canvas(1024,1024),actor={id:'actor',x:8,z:8,interactive:false,sprite:{image,frame:[0,0,256,256],contentHeight:220}};h.api.update([actor]);const entry=h.api.nodes.get(actor.id),first=entry.texture,version=first.version;let firstDisposals=0;first.addEventListener('dispose',()=>firstDisposals++);
 actor.sprite={...actor.sprite,frame:[256,0,256,256]};h.api.update([actor]);assert.equal(entry.texture,first);assert.equal(first.version,version);assert.equal(first.offset.x,.25);
 actor.sprite={image:canvas(),frame:[0,0,256,320],contentHeight:280,poseVersion:0};h.api.update([actor]);const second=entry.texture;let secondDisposals=0;second.addEventListener('dispose',()=>secondDisposals++);assert.notEqual(second,first);assert.equal(firstDisposals,1);h.dispose();assert.equal(firstDisposals,1);assert.equal(secondDisposals,1);
});
test('palace monsters switch from the original atlas to one stable live pose texture and release replaced sources',()=>{
 const resources=new Set(),context=vm.createContext({THREE,resources,spriteTextureUV});
 const start=source.indexOf('  function updateSpiritSprite('),end=source.indexOf('  // A drifting orbital mobile',start);
 vm.runInContext(source.slice(start,end)+'\nglobalThis.update=updateSpiritSprite;',context);
 const material=new THREE.SpriteMaterial(),spirit={id:'pumpkin',sprite:new THREE.Sprite(material),model:new THREE.Group(),node:new THREE.Group()};
 const old=new THREE.Texture(canvas(512,512));resources.add(old);material.map=old;let oldDisposed=0;old.addEventListener('dispose',()=>oldDisposed++);
 const image=canvas(),pose={image,frame:[0,0,256,320],contentHeight:256,anchorX:.5,anchorY:.94,poseVersion:0};context.update(spirit,pose);
 const texture=material.map;assert.equal(texture.image,image);assert.equal(oldDisposed,1);assert.equal(resources.size,1);assert.equal(spirit.model.visible,false);
 const initial=texture.version;for(let version=1;version<=120;version++){context.update(spirit,{...pose,poseVersion:version});assert.equal(material.map,texture);assert.equal(resources.size,1);}
 assert.equal(texture.version,initial+120);context.update(spirit,{...pose,poseVersion:120});assert.equal(texture.version,initial+120);
 let liveDisposed=0;texture.addEventListener('dispose',()=>liveDisposed++);context.update(spirit,{image:canvas(512,512),frame:[0,0,256,256]});assert.equal(liveDisposed,1);assert.equal(resources.size,1);
 for(const resource of resources)resource.dispose();material.dispose();
});
