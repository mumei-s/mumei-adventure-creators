import {fs,path,fileURLToPath,previewRoot as root,outputRoot,createCanvas,loadImage,fontName} from './town-proof-environment.mjs';
const {createTownRenderer}=await import(root+'/town/renderer.js');
const {initialTownState}=await import(root+'/town/town-model.js');
const {scaledCharacterLayout,characterSprite}=await import(root+'/maze/creator-runtime.js');
const manifest=JSON.parse(await fs.readFile(root+'/maze/data/creator-characters.json','utf8'));
const hero=manifest.characters.find(a=>a.role==='hero'&&a.ready),cat=manifest.companions.find(a=>a.id==='owner-black-cat');
const heroIm=await loadImage(root+'/maze/'+hero.asset.src),catIm=await loadImage(root+'/maze/'+cat.asset.src);
const art={images:{playerAtlas:heroIm},playerLayout:scaledCharacterLayout(hero.asset,heroIm),version:1,monsterLayouts:{}};
const renderer=createTownRenderer({makeCanvas:createCanvas,art,loadImage:src=>loadImage(fileURLToPath(src)),fetcher:async url=>({ok:true,json:async()=>JSON.parse(await fs.readFile(fileURLToPath(url),'utf8'))})});
await renderer.ready;
const views=[{name:'gate-phone',width:390,height:600,x:32.5,z:7.5},{name:'gate-desktop',width:1280,height:720,x:32.5,z:7.5},{name:'market-phone',width:390,height:600,x:19.5,z:14.5},{name:'market-desktop',width:1280,height:720,x:19.5,z:14.5},{name:'garden-desktop',width:1280,height:720,x:50.5,z:38.5},{name:'library-desktop',width:1280,height:720,x:9.5,z:10.5,mapId:'library'}];
for(const item of views){
const state={...initialTownState(),mapId:item.mapId||'lantern-town',position:{x:item.x,z:item.z}};
const canvas=createCanvas(item.width,item.height);
renderer.render({canvas,state,time:4,dt:.016,motion:false,pixelRatio:1,creatorActors:[{x:item.x-.4,z:item.z+.5,sprite:characterSprite(cat.asset,catIm,'down',false,0),heightPx:35,interactive:false}]});
if(item.mapId){await new Promise(resolve=>setTimeout(resolve,100));renderer.invalidate();renderer.render({canvas,state,time:4,motion:false,pixelRatio:1});}
await fs.writeFile(path.join(outputRoot,item.name+'.png'),canvas.toBuffer('image/png'));
}
const measurement={method:'Actual Canvas renderer with native @napi-rs/canvas; no browser or DOM interaction',font:fontName,views,artStatus:renderer.status(),limitations:['Static render proof does not verify mobile input, focus, CSS, browser audio or actual hardware frame rate.','Fictional town residents have one authored standing pose each; no walk or turn frames.','Adopted visitor/owner sprite sets retain their existing animation limitations.']};
await fs.writeFile(path.join(outputRoot,'render-method.json'),JSON.stringify(measurement,null,2)+'\n');
console.log(JSON.stringify(measurement.artStatus));renderer.destroy();
