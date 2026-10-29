// A single shared albedo sheet supplies four independently transformed native
// mesh textures. The separate original portrait is used only by the 2D
// identity composition; an incompatible 3D face projection is not enabled.
export const OVERLORD_ATLAS_URL=new URL('./assets/overlord/material-atlas-v2.webp',import.meta.url).href;
export const OVERLORD_TEXTURE_REGIONS=Object.freeze({face:[0,.5],armor:[.5,.5],hair:[0,0],cape:[.5,0]});
export const OVERLORD_GENERATED_TEXTURE_URLS=Object.freeze({
 generatedBase:new URL('./assets/overlord/queen-body-base.webp',import.meta.url).href,
 generatedNormal:new URL('./assets/overlord/queen-body-normal.jpg',import.meta.url).href,
 generatedFront:new URL('./assets/overlord/queen-body-front.webp',import.meta.url).href
});

export function loadOverlordImage(url,{timeout=14000,ImageClass=globalThis.Image,timers=globalThis}={}){
 return new Promise((resolve,reject)=>{
  if(typeof ImageClass!=='function'){reject(new Error('Image decoding is unavailable'));return;}
  const image=new ImageClass();let active=true;
  const finish=error=>{if(!active)return;active=false;timers.clearTimeout(timer);image.onload=image.onerror=null;if(error){image.removeAttribute?.('src');reject(error);}else resolve(image);};
  const timer=timers.setTimeout(()=>finish(new Error('Overlord material image timed out')),timeout);
  image.decoding='async';image.fetchPriority='high';image.onload=()=>finish();image.onerror=()=>finish(new Error('Overlord material image failed'));image.src=url;
 });
}

export function createOverlordMaterialSource({loadImage=loadOverlordImage,url=OVERLORD_ATLAS_URL}={}){
 let pending=null;
 return {load(){
  if(!pending)pending=(async()=>{let lastError;for(let attempt=0;attempt<2;attempt++){try{return await loadImage(attempt?url+(url.includes('?')?'&':'?')+'material-retry=1':url);}catch(error){lastError=error;}}throw lastError;})().catch(error=>{pending=null;throw error;});
  return pending;
 }};
}
const sharedSource=createOverlordMaterialSource();
/** Successful images survive a different image's failed transfer. A failed
 * bundle can be retried, while concurrent scenes share all image decoding. */
export function createOverlordGeneratedMaterialSource({loadImage=loadOverlordImage,urls=OVERLORD_GENERATED_TEXTURE_URLS}={}){
 const sources=Object.entries(urls).map(([name,url])=>[name,createOverlordMaterialSource({loadImage,url})]);let pending=null;
 return {load(){
  if(!pending)pending=Promise.all(sources.map(async([name,source])=>[name,await source.load()])).then(entries=>Object.fromEntries(entries)).catch(error=>{pending=null;throw error;});
  return pending;
 }};
}
const sharedGeneratedSource=createOverlordGeneratedMaterialSource();
export const OVERLORD_IDENTITY_URL=new URL('./assets/overlord/queen-face-reference.jpg',import.meta.url).href;
const sharedIdentitySource=createOverlordMaterialSource({url:OVERLORD_IDENTITY_URL});
export function getOverlordIdentityImage(){return sharedIdentitySource.load();}

/** Small generated light cards provide metallic reflections without another file. */
export function createOverlordReflectionEnvironment(THREE,renderer){
 const width=128,height=64,pixels=new Uint8Array(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const u=x/width,v=y/height,soft=(a,b,sx,sy)=>Math.exp(-((u-a)**2/sx+(v-b)**2/sy));
  const warm=soft(.18,.28,.007,.026),white=soft(.72,.36,.013,.045),crimson=soft(.5,.45,.025,.03),sky=Math.max(0,1-v),i=(y*width+x)*4;
  pixels[i]=Math.min(255,24+warm*210+white*145+crimson*80+sky*18);pixels[i+1]=Math.min(255,17+warm*162+white*165+sky*20);pixels[i+2]=Math.min(255,26+warm*100+white*205+crimson*22+sky*30);pixels[i+3]=255;
 }
 const source=new THREE.DataTexture(pixels,width,height);source.mapping=THREE.EquirectangularReflectionMapping;source.colorSpace=THREE.SRGBColorSpace;source.needsUpdate=true;
 const generator=new THREE.PMREMGenerator(renderer);let target;
 try{generator.compileEquirectangularShader();target=generator.fromEquirectangular(source);}catch(error){source.dispose();throw error;}finally{generator.dispose();}
 return {texture:target.texture,dispose(){target.dispose();source.dispose();}};
}

/** Textures belong to this attachment, not to the model or another renderer. */
export function attachOverlordMaterials(THREE,boss,{source=sharedSource,generatedSource=sharedGeneratedSource,onState=()=>{}}={}){
 let active=true,textures=null;const owned=new Set();
 const generated=boss.metadata?.surfaceSource==='queen-rigbase-v1';
 const notify=(state,error)=>{if(active){try{onState(state,error);}catch{/* UI reporting cannot stop the scene. */}}};
 const release=()=>{for(const texture of owned)texture.dispose();owned.clear();textures=null;};
 function imageTexture(image,{colorSpace=THREE.SRGBColorSpace,flipY=true,channel=0}={}){
  const texture=new THREE.Texture(image);texture.colorSpace=colorSpace;texture.flipY=flipY;texture.channel=channel;texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;owned.add(texture);return texture;
 }
 if(generated)boss.setSurfaceReady?.(false);
 notify('loading');
 const ready=Promise.all([source.load(),generated?generatedSource.load():null]).then(([image,generatedImages])=>{
  if(!active)return false;
  if(generated)for(const name of Object.keys(OVERLORD_GENERATED_TEXTURE_URLS))if(!generatedImages?.[name])throw new Error('Missing required Overlord surface: '+name);
  const atlas=imageTexture(image);
  textures={};const inset=2/Math.max(4,Math.min(image.width||2048,image.height||2048));
  for(const [name,offset]of Object.entries(OVERLORD_TEXTURE_REGIONS)){
   // The generated model keeps its own face and armour UVs; the old atlas is
   // used only for the independently authored hair and cape in this branch.
   if(generated&&name!=='hair'&&name!=='cape')continue;
   const texture=atlas.clone();texture.repeat.set(.5-inset*2,.5-inset*2);texture.offset.set(offset[0]+inset,offset[1]+inset);texture.needsUpdate=true;owned.add(texture);textures[name]=texture;
  }
  if(generated){
   textures.generatedBase=imageTexture(generatedImages.generatedBase,{flipY:false,channel:0});
   textures.generatedNormal=imageTexture(generatedImages.generatedNormal,{colorSpace:THREE.NoColorSpace,flipY:false,channel:0});
   textures.generatedFront=imageTexture(generatedImages.generatedFront,{flipY:false,channel:1});
  }
  if(boss.setTextures?.(textures)===false)throw new Error('Overlord model no longer accepts materials');
  if(generated)boss.setSurfaceReady?.(true);
  notify('ready');return true;
 }).catch(error=>{release();if(active&&generated){try{boss.setSurfaceReady?.(false);}catch{/* The failed surface must remain unavailable. */}}notify('error',error);return false;});
 return {ready,dispose(){if(!active)return;active=false;if(generated){try{boss.setSurfaceReady?.(false);}catch{/* Scene cleanup still owns every texture. */}}release();}};
}
