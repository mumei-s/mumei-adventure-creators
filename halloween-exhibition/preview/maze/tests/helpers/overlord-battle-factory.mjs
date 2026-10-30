import {readFile,writeFile,unlink} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
// Exercise the real battle factory and Three scene graph; only GPU submission,
// image transfer and tiny shadow canvas pixels are replaced. This is not GPU QA.
export async function withOverlordBattle(run){
 const url=new URL('../../overlord-battle-scene.js',import.meta.url),threeURL=new URL('../../vendor/three.module.js',import.meta.url);
 const saved={document:globalThis.document,Image:globalThis.Image},requests=[];
 const context=new Proxy({createRadialGradient:()=>({addColorStop(){}})},{get:(object,key)=>key in object?object[key]:()=>{},set(object,key,value){object[key]=value;return true;}});
 globalThis.document={createElement:()=>({width:64,height:64,getContext:()=>context})};
 globalThis.Image=class{set src(value){requests.push(value);[this.width,this.height]=value.startsWith('data:')?[312,136]:[1248,544];this.naturalWidth=this.width;this.naturalHeight=this.height;queueMicrotask(()=>this.onload?.());}removeAttribute(){}};
 let source=await readFile(url,'utf8');
 source=source.replace(/import \* as THREE from ['"]\.\/vendor\/three\.module\.js['"];?/,`import * as REAL_THREE from ${JSON.stringify(threeURL.href)};
 class TestRenderer{constructor(){this.shadowMap={};}setPixelRatio(){}setSize(){}render(scene,camera){scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);}dispose(){}}
 class TestPMREM{compileEquirectangularShader(){}fromEquirectangular(){return {texture:new REAL_THREE.Texture(),dispose(){}};}dispose(){}}
 const THREE={...REAL_THREE,WebGLRenderer:TestRenderer,PMREMGenerator:TestPMREM};`);
 source=source.replace(/from (['"])(\.\.?\/[^'"]+)\1/g,(_,q,path)=>`from ${JSON.stringify(new URL(path,url).href)}`);
 const temporary=new URL('./overlord-factory-'+randomUUID()+'.mjs',import.meta.url);let battle;
 try{await writeFile(temporary,source);const {createOverlordBattleScene}=await import(temporary.href);
  const canvas={clientWidth:390,clientHeight:518,addEventListener(){},removeEventListener(){}},art={images:{playerAtlas:{width:1024,height:1024}}};battle=createOverlordBattleScene({canvas,art});
  await battle.ready;await run({battle,canvas,art,requests});
 }finally{battle?.dispose();await unlink(temporary).catch(()=>{});for(const [key,value]of Object.entries(saved))if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
}
