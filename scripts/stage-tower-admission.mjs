import {cp, mkdir, readFile, readdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {exclusionReason} from './stage-pages.mjs';

const [revision, site] = process.argv.slice(2);
if (!revision || !site) throw new Error('Expected the reviewed checkout and staged site');
const base = path.resolve(revision);
const output = path.resolve(site,'admission');
await mkdir(output, {recursive:true});
async function copyPublic(root) {
  const src=path.join(base,root);
  for(const entry of await readdir(src,{withFileTypes:true})){
    const relative=path.join(root,entry.name);
    if(exclusionReason(relative))continue;
    if(entry.isDirectory())await copyPublic(relative);
    else if(entry.isFile()){
      await mkdir(path.dirname(path.join(output,relative)),{recursive:true});
      await cp(path.join(base,relative),path.join(output,relative));
    }
  }
}
for(const folder of ['tower','halloween-exhibition/preview/diorama-city'])await copyPublic(folder);
const shared='halloween-exhibition/preview/';
const visit=shared+'castle-visit-counter.js';
await cp(path.join(base,visit),path.join(output,visit));
const seen=new Set();
async function copyModule(file){
  if(seen.has(file))return;
  seen.add(file);
  const source=path.join(site,file);
  const text=await readFile(source,'utf8');
  const dest=path.join(output,file);
  await mkdir(path.dirname(dest),{recursive:true});
  await cp(source,dest);
  for(const match of text.matchAll(/(?:from\s*|import\s*)['"](\.{1,2}\/[^'"]+\.js)(?:\?[^'"]*)?['"]/g)){
    await copyModule(path.normalize(path.join(path.dirname(file),match[1])));
  }
}
for(const name of ['control-preferences.js','display-mode.js','town/audio.js','town/preferences.js','maze/game-input.js'])await copyModule(shared+name);
for(const name of ['halloween','halloween-exhibition/preview','halloween-exhibition/preview/town']){
  const folder=path.join(output,name);
  await mkdir(folder,{recursive:true});
  const href='/mumei-adventure-creators/'+name+'/';
  await writeFile(path.join(folder,'index.html'),`<!doctype html><html lang="ja"><meta charset="utf-8"><title>Atelierへ戻る</title><a href="${href}">Atelierへ戻る</a><script>location.replace('${href}'+location.search+location.hash)</script></html>`);
}
