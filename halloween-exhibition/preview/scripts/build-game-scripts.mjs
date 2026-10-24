import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const builder='scripts/build-game-scripts.mjs';
const esbuildVersion='0.25.12';
const releasePrefix='20261019-game-fast1';
export const gameNames=['town','maze'];
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const slash=value=>value.replaceAll(path.sep,'/');
const relativeModule=(directory,filename)=>{const relative=slash(path.relative(directory,filename));return relative.startsWith('.')?relative:`./${relative}`;};
const localPath=(directory,relative)=>{
 if(typeof relative!=='string'||!relative||path.isAbsolute(relative)||relative.split(/[\\/]/).includes('..'))throw Error('Invalid game bundle input path');
 return path.join(directory,relative);
};
async function fingerprint(relative){const bytes=await readFile(localPath(root,relative));return{path:relative,bytes:bytes.length,sha256:digest(bytes)};}

/** Optional imports keep the URL they had in their original source module. */
export function rebaseDynamicImport(specifier,importer,outputDirectory){
 if(!/^\.\.?\//.test(specifier))return specifier;
 const target=new URL(specifier,pathToFileURL(importer.split('?')[0]));
 return relativeModule(outputDirectory,fileURLToPath(target))+target.search+target.hash;
}
export function sourceModuleURL(filename,outputDirectory){return relativeModule(outputDirectory,filename);}
export function rebaseStyleURL(specifier,importer,outputDirectory){
 if(/^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(specifier))return specifier;
 const target=new URL(specifier,pathToFileURL(importer.split('?')[0]));
 return relativeModule(outputDirectory,fileURLToPath(target))+target.search+target.hash;
}

/** esbuild otherwise assigns the bundle's import.meta.url to every input. */
export function preserveSourceLocations({esbuild,outputDirectory,moduleURLs=[],externalVendor=false,worldSource,worldURL}){
 return{name:'preserve-source-locations',setup(build){
  build.onResolve({filter:/.*/},args=>{
   if(externalVendor&&args.kind==='import-statement'&&args.path.includes('/vendor/'))return{path:rebaseDynamicImport(args.path,args.importer,outputDirectory),external:true};
   if(args.kind!=='dynamic-import')return;
   if(worldSource&&/^\.\.?\//.test(args.path)&&fileURLToPath(new URL(args.path,pathToFileURL(args.importer)))===worldSource)return{path:worldURL,external:true};
   return{path:rebaseDynamicImport(args.path,args.importer,outputDirectory),external:true};
  });
  build.onLoad({filter:/\.js$/},async args=>{
   if(args.namespace!=='file')return;
   const source=await readFile(args.path,'utf8');
   if(!/\bimport\s*\.\s*meta\s*\.\s*url\b/.test(source))return;
   const relative=sourceModuleURL(args.path,outputDirectory);
   moduleURLs.push({path:slash(path.relative(root,args.path)),relative});
   const transformed=await esbuild.transform(source,{loader:'js',format:'esm',target:'es2020',define:{'import.meta.url':'__atelier_source_module_url__'},banner:`const __atelier_source_module_url__ = new URL(${JSON.stringify(relative)}, import.meta.url).href;`});
   return{contents:transformed.code,loader:'js',resolveDir:path.dirname(args.path)};
  });
 }};
}

async function importBuilder(){
 try{return await import('esbuild');}
 catch(error){if(!process.env.ATELIER_ESBUILD_PATH)throw Error('Run npm ci before npm run build:games.',{cause:error});return import(pathToFileURL(path.resolve(process.env.ATELIER_ESBUILD_PATH)).href);}
}
function stylesheetReferences(html){return[...html.matchAll(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^\"]+)"[^>]*>/g)].map(match=>match[1]);}
const releaseURL=(reference,hash)=>`${reference.split('?')[0]}?v=${releasePrefix}-${hash.slice(0,12)}`;
async function loadStyleSources(game){
 const filename=path.join(root,game,'game-style-sources.json');
 let sources;
 try{sources=JSON.parse(await readFile(filename,'utf8'));}
 catch(error){
  if(error.code!=='ENOENT')throw error;
  sources=stylesheetReferences(await readFile(path.join(root,game,'index.html'),'utf8'));
  if(!sources.length||sources.some(source=>source.split('?')[0]==='./game-styles.css'))throw Error(`Missing original ${game} stylesheet source order`);
  await writeFile(filename,`${JSON.stringify(sources,null,2)}\n`);
 }
 if(!Array.isArray(sources)||!sources.length||sources.some(source=>typeof source!=='string'||!/^\.\.?\/[^?#]+\.css(?:\?[^#]+)?$/.test(source)))throw Error(`Invalid ${game} stylesheet source order`);
 return sources;
}
async function buildGameStyles(esbuild,game){
 const output=`${game}/game-styles.css`,outputDirectory=path.join(root,game),sources=await loadStyleSources(game);
 const result=await esbuild.build({absWorkingDir:root,stdin:{contents:sources.map(source=>`@import ${JSON.stringify(source)};`).join('\n'),resolveDir:outputDirectory,sourcefile:`${game}-styles.virtual.css`,loader:'css'},outfile:path.join(root,output),bundle:true,minify:true,charset:'utf8',legalComments:'none',metafile:true,write:false,logLevel:'silent',banner:{css:'/* Generated by npm run build:games. Keep source order in game-style-sources.json. */'},plugins:[{name:'preserve-css-asset-locations',setup(build){build.onResolve({filter:/.*/},args=>args.kind==='url-token'?{path:rebaseStyleURL(args.path,args.importer,outputDirectory),external:true}:undefined);}}]});
 if(result.warnings.length)throw Error((await esbuild.formatMessages(result.warnings,{kind:'warning',color:false})).join('\n'));
 const stylesheet=result.outputFiles.find(file=>path.resolve(file.path)===path.join(root,output));
 if(!stylesheet)throw Error(`Missing ${game} stylesheet output`);
 const inputs=Object.keys(result.metafile.inputs).filter(input=>!input.endsWith(`${game}-styles.virtual.css`)&&!input.startsWith('<')).map(input=>input.split('?')[0]);
 await writeFile(path.join(root,output),stylesheet.contents);
 return{sources,inputs:[...inputs,`${game}/game-style-sources.json`],output:{path:output,bytes:stylesheet.contents.length,sha256:digest(stylesheet.contents)}};
}
async function buildGameWorld(esbuild,game){
 const outputDirectory=path.join(root,game),source=`${game}/${game==='town'?'world-3d.js':'world.js'}`,output=`${game}/game-world.js`,moduleURLs=[];
 const result=await esbuild.build({absWorkingDir:root,entryPoints:[source],outfile:path.join(root,output),bundle:true,minify:true,target:'es2020',format:'esm',platform:'browser',charset:'utf8',legalComments:'none',metafile:true,write:false,banner:{js:'/* Generated optional 3D world. Loaded after the playable scene. */'},plugins:[preserveSourceLocations({esbuild,outputDirectory,moduleURLs,externalVendor:true})]});
 const script=result.outputFiles.find(file=>path.resolve(file.path)===path.join(root,output));
 if(!script)throw Error(`Missing ${game} optional world output`);
 const imports=Object.values(result.metafile.outputs)[0]?.imports||[];
 if(imports.some(item=>item.kind!=='dynamic-import'&&!item.path.includes('/vendor/')))throw Error(`${game} optional world has an unbundled application dependency`);
 await writeFile(path.join(root,output),script.contents);
 return{source,inputs:Object.keys(result.metafile.inputs).map(input=>input.split('?')[0]),output:{path:output,bytes:script.contents.length,sha256:digest(script.contents),imports,moduleURLs:[...new Map(moduleURLs.map(item=>[item.path,item])).values()].sort((a,b)=>a.path.localeCompare(b.path))}};
}
async function prepareHTML(game,manifest){
 const filename=path.join(root,game,'index.html'),original=await readFile(filename,'utf8');
 let html=original,found=false;
 const scriptURL=releaseURL('./game-entry.js',manifest.output.sha256);
 html=html.replace(/<script\b[^>]*\btype="module"[^>]*\bsrc="([^\"]+)"[^>]*><\/script>/g,(tag,src)=>{
  const bare=src.split('?')[0];
  if(bare==='../adventure-atmosphere.js')return'';
  if(bare!=='./app.js'&&bare!=='./game-entry.js')return tag;
  if(found)throw Error(`Duplicate ${game} startup scripts`);found=true;
  let updated=tag.replace(`src="${src}"`,`src="${scriptURL}"`);
  if(!/\bid="/.test(updated))updated=updated.replace('<script','<script id="game-script"');
  if(!/\bfetchpriority="/.test(updated))updated=updated.replace('<script','<script fetchpriority="high"');
  return updated;
 });
 if(!found)throw Error(`Missing ${game} startup script`);
 let stylesheetFound=false;
 html=html.replace(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^\"]+)"[^>]*>/g,()=>{
  if(stylesheetFound)return'';stylesheetFound=true;
  return`<link id="game-stylesheet" rel="stylesheet" href="${releaseURL('./game-styles.css',manifest.styles.sha256)}">`;
 });
 if(!stylesheetFound)throw Error(`Missing ${game} stylesheet link`);
 if(html!==original)await writeFile(filename,html);
}

export async function buildGameScripts(){
 const esbuild=await importBuilder();
 if(esbuild.version!==esbuildVersion)throw Error(`Expected esbuild ${esbuildVersion}; found ${esbuild.version}`);
 const jsonFiles=['data/archive.json','maze/data/creator-characters.json','maze/data/catalog.json'];
 const [archive,characters,catalog]=await Promise.all(jsonFiles.map(async filename=>JSON.parse(await readFile(path.join(root,filename),'utf8'))));
 const manifests=[];
 for(const game of gameNames){
  const outputDirectory=path.join(root,game),output=`${game}/game-entry.js`,moduleURLs=[];
  const styles=await buildGameStyles(esbuild,game);
  const world=await buildGameWorld(esbuild,game);
  const worldURL=releaseURL('./game-world.js',world.output.sha256);
  const define=game==='maze'?{'globalThis.__HALLOWEEN_MAZE_BOOT__':JSON.stringify({archive,catalog,characters})}:{'globalThis.__ATELIER_ARCHIVE__':JSON.stringify(archive),'globalThis.__ATELIER_CHARACTER_MANIFEST__':JSON.stringify(characters)};
  define['globalThis.__ATELIER_GAME_WORLD_URL__']=JSON.stringify(worldURL);
  const result=await esbuild.build({absWorkingDir:root,stdin:{contents:`import './${game}/app.js';\nimport './adventure-atmosphere.js';`,resolveDir:root,sourcefile:`${game}-entry.virtual.js`,loader:'js'},outfile:path.join(root,output),bundle:true,minify:true,target:'es2020',format:'esm',platform:'browser',charset:'utf8',legalComments:'none',metafile:true,write:false,define,banner:{js:'/* Generated by npm run build:games. Edit source modules, then regenerate. */'},plugins:[preserveSourceLocations({esbuild,outputDirectory,moduleURLs,worldSource:path.join(root,world.source),worldURL})]});
  const script=result.outputFiles.find(file=>path.resolve(file.path)===path.join(root,output));
  if(!script)throw Error(`Missing ${game} script output`);
  const inputPaths=[...new Set([...Object.keys(result.metafile.inputs).filter(input=>!input.endsWith(`${game}-entry.virtual.js`)&&!input.startsWith('<')).map(input=>input.split('?')[0]),...styles.inputs,...world.inputs,...jsonFiles.filter(file=>game==='maze'||!file.endsWith('catalog.json')),builder,'package.json','package-lock.json'])].sort();
  const imports=Object.values(result.metafile.outputs)[0]?.imports||[];
  if(imports.some(item=>item.kind!=='dynamic-import'))throw Error(`${game} startup still has an external static dependency`);
  const contributionMap=new Map();
  for(const [input,detail]of Object.entries(Object.values(result.metafile.outputs)[0]?.inputs||{})){
   const filename=input.split('?')[0];if(detail.bytesInOutput)contributionMap.set(filename,(contributionMap.get(filename)||0)+detail.bytesInOutput);
  }
  const contributions=[...contributionMap].map(([path,bytes])=>({path,bytes})).sort((a,b)=>b.bytes-a.bytes||a.path.localeCompare(b.path));
  const manifest={schemaVersion:1,builder:`esbuild@${esbuildVersion}`,game,entrySources:[`${game}/app.js`,'adventure-atmosphere.js'],inputs:await Promise.all(inputPaths.map(fingerprint)),moduleURLs:[...new Map(moduleURLs.map(item=>[item.path,item])).values()].sort((a,b)=>a.path.localeCompare(b.path)),imports,contributions,output:{path:output,bytes:script.contents.length,sha256:digest(script.contents)},styleSources:styles.sources,styles:styles.output,world:world.output};
  await writeFile(path.join(root,output),script.contents);
  await prepareHTML(game,manifest);
  await writeFile(path.join(root,game,'game-script-manifest.json'),`${JSON.stringify(manifest,null,2)}\n`);
  manifests.push(manifest);
 }
 return manifests;
}

/** The publish check has no dependency on an installed esbuild package. */
export async function checkGameScripts(){
 const manifests=[];
 for(const game of gameNames){
  const manifest=JSON.parse(await readFile(path.join(root,game,'game-script-manifest.json'),'utf8'));
  if(manifest.schemaVersion!==1||manifest.game!==game||manifest.builder!==`esbuild@${esbuildVersion}`||manifest.output?.path!==`${game}/game-entry.js`||manifest.world?.path!==`${game}/game-world.js`||manifest.styles?.path!==`${game}/game-styles.css`||!Array.isArray(manifest.inputs)||!Array.isArray(manifest.styleSources))throw Error(`Invalid ${game} script manifest`);
  const paths=manifest.inputs.map(input=>input.path);
  if(new Set(paths).size!==paths.length||!paths.includes(builder)||!paths.includes('data/archive.json')||!paths.includes('maze/data/creator-characters.json'))throw Error(`Incomplete ${game} script inputs`);
  for(const expected of [...manifest.inputs,manifest.output,manifest.styles,manifest.world]){
   const actual=await fingerprint(expected.path);
   if(actual.sha256!==expected.sha256||actual.bytes!==expected.bytes)throw Error(`${expected.path} changed. Run npm run build:games.`);
  }
  const html=await readFile(path.join(root,game,'index.html'),'utf8');
  if(!html.includes(`src="${releaseURL('./game-entry.js',manifest.output.sha256)}"`))throw Error(`Outdated ${game} script URL`);
  const script=await readFile(path.join(root,manifest.output.path),'utf8');
  if(!script.includes(`import(${JSON.stringify(releaseURL('./game-world.js',manifest.world.sha256))})`))throw Error(`Outdated ${game} optional world URL`);
  if(stylesheetReferences(html).length!==1||!html.includes(`href="${releaseURL('./game-styles.css',manifest.styles.sha256)}"`))throw Error(`Outdated ${game} stylesheet URL`);
  manifests.push(manifest);
 }
 return manifests;
}
const invoked=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked){
 if(process.argv.includes('--check')){await checkGameScripts();console.log('Game script bundles are current.');}
 else for(const manifest of await buildGameScripts())console.log(`Wrote ${manifest.output.path} (${manifest.output.bytes} bytes; ${manifest.inputs.length} inputs).`);
}
