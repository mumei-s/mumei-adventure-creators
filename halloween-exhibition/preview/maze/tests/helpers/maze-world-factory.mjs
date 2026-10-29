import {readFile,writeFile,unlink} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';

// Run the product world and real Three scene graph. Only the GPU renderer,
// network image transfer and canvas text pixels are replaced in this harness.
export async function withMazeWorld(run){
 const url=new URL('../../world.js',import.meta.url),threeURL=new URL('../../vendor/three.module.js',import.meta.url);
 const THREE=await import(threeURL.href),saved={document:globalThis.document,window:globalThis.window,Image:globalThis.Image};
 const requests=[];
 const context=new Proxy({}, {get(_target,key){if(key==='createRadialGradient'||key==='createLinearGradient')return ()=>({addColorStop(){}});if(key==='measureText')return ()=>({width:100});return ()=>{};},set(){return true;}});
 globalThis.document={createElement(){return {width:512,height:512,getContext(){return context;}}}};
 globalThis.window={innerWidth:390,innerHeight:700,devicePixelRatio:1};
 globalThis.Image=class{
  set src(value){requests.push(value);this.width=this.naturalWidth=1024;this.height=this.naturalHeight=1536;queueMicrotask(()=>this.onload?.());}
  removeAttribute(){}
 };
 let source=await readFile(url,'utf8');
 source=source.replace(/import \* as THREE from ['"]\.\/vendor\/three\.module\.js['"];?/,`import * as REAL_THREE from ${JSON.stringify(threeURL.href)};
 class TestRenderer{constructor(){this.capabilities={getMaxAnisotropy(){return 1}};}setPixelRatio(){}setSize(){}render(scene,camera){scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);}dispose(){}}
 class TestTextureLoader{load(){return new REAL_THREE.Texture();}}
 const THREE={...REAL_THREE,WebGLRenderer:TestRenderer,TextureLoader:TestTextureLoader};`);
 source=source.replace(/from (['"])(\.\.?\/[^'"]+)\1/g,(_,q,p)=>`from ${JSON.stringify(new URL(p,url).href)}`);
 const temporary=new URL('./world-factory-'+randomUUID()+'.mjs',import.meta.url);let world;
 try{
  await writeFile(temporary,source);
  const {createWorld}=await import(temporary.href);
  world=createWorld({canvas:{clientWidth:390,clientHeight:700},art:{images:{}}});
  await run({world,THREE,requests,settle:()=>new Promise(resolve=>setImmediate(resolve))});
 }finally{
  world?.dispose();await unlink(temporary).catch(()=>{});
  for(const [key,value]of Object.entries(saved))if(value===undefined)delete globalThis[key];else globalThis[key]=value;
 }
}
