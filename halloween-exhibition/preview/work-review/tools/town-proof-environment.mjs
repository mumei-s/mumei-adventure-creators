import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

let foundRoot=path.dirname(fileURLToPath(import.meta.url));
for(let level=0;level<9;level++){
  try{await fs.access(path.join(foundRoot,'halloween-exhibition/preview/town/story-data.js'));break;}
  catch{const parent=path.dirname(foundRoot);if(parent===foundRoot||level===8)throw Error('Run this proof tool from a checkout containing halloween-exhibition/preview/town.');foundRoot=parent;}
}
export const repoRoot=foundRoot;
export const previewRoot=path.join(repoRoot,'halloween-exhibition/preview');
export const outputRoot=path.resolve(process.env.TOWN_PROOF_OUTPUT||fileURLToPath(new URL('../evidence/town/',import.meta.url)));
const localRequire=createRequire(import.meta.url);
let canvas;
try{canvas=localRequire('@napi-rs/canvas');}
catch(error){const modules=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;if(!modules)throw new Error('Install @napi-rs/canvas, or set CODEX_PRIMARY_RUNTIME_NODE_MODULES to the directory that provides it.',{cause:error});canvas=createRequire(path.join(modules,'package.json'))('@napi-rs/canvas');}
export const {createCanvas,loadImage,GlobalFonts}=canvas;
export const fontName=process.env.TOWN_PROOF_FONT?path.basename(process.env.TOWN_PROOF_FONT):null;
if(process.env.TOWN_PROOF_FONT&&!GlobalFonts.registerFromPath(process.env.TOWN_PROOF_FONT,'Yu Gothic'))throw Error('TOWN_PROOF_FONT could not be registered.');
await fs.mkdir(outputRoot,{recursive:true});
export async function localJSON(input){return JSON.parse(await fs.readFile(fileURLToPath(new URL(input,new URL('file://'+previewRoot+'/town/'))),'utf8'));}
export async function localImage(input){return loadImage(fileURLToPath(input));}
export {fs,path,fileURLToPath};
