import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const repo=path.resolve(fileURLToPath(new URL('../../../../',import.meta.url)));
const inventory=JSON.parse(await readFile(new URL('../baseline-inventory.json',import.meta.url)));
const hash=b=>createHash('sha256').update(b).digest('hex');
const failures=[],checked=[];
for(const item of inventory.files){
  const actual=hash(await readFile(path.join(repo,item.path)));
  if(actual!==item.sha256)failures.push(item.path+' changed');
  checked.push(item.path);
}
for(const item of [...inventory.characterAssets,...inventory.monsterAssets]){
  const file=item.path||item.file;
  if(!file)continue;
  const original=execFileSync('git',['show',inventory.baselineCommit+':'+file],{cwd:repo,maxBuffer:16*1024*1024});
  if(hash(await readFile(path.join(repo,file)))!==hash(original))failures.push(file+' changed');
  checked.push(file);
}
const names=execFileSync('git',['diff','--name-only',inventory.baselineCommit],{cwd:repo,encoding:'utf8'}).trim().split('\n').filter(Boolean);
for(const name of names)if(!name.startsWith('halloween-exhibition/preview/'))failures.push('Outside authorized app scope: '+name);
for(const name of ['castle-visit-counter.js','castle-counter-bootstrap.js']){
  const file='halloween-exhibition/preview/'+name;
  if(hash(await readFile(path.join(repo,file)))!==hash(execFileSync('git',['show',inventory.baselineCommit+':'+file],{cwd:repo})))failures.push('Counter changed: '+name);
  checked.push(file);
}
console.log(JSON.stringify({baseline:inventory.baselineCommit,checked:checked.length,failures,passed:failures.length===0},null,2));
if(failures.length)process.exitCode=1;
