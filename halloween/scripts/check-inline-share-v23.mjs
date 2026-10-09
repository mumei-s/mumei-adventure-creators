import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {File} from 'node:buffer';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const take=(start,end)=>{const from=app.indexOf(start),to=app.indexOf(end,from);assert.ok(from>=0&&to>from);return app.slice(from,to);};
const functions=take('function shareFiles(r){','async function showResult(r){')+take('async function shareAll(){','async function imagePNG(')+take('async function copyPrompt(){','async function copyStage(');
const prompt='【制作条件】\n'+('すべての選択条件、許可原稿、人物と画風の参照を保つ。\n'.repeat(160));
let routes=0;
async function exercise({images=3,collection='halloween',supports=true,failure=null}={}){
 const files=['identity.png','style-preset-119.png','selection-references.jpg'].slice(0,images).map((name,index)=>new File([new Uint8Array([index+1,4,7])],name,{type:name.endsWith('.jpg')?'image/jpeg':'image/png'}));
 const nodes=new Map(),$=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',hidden:true,dataset:{},scrollIntoView(){}});return nodes.get(id);};
 let payload=null,clipboard=null;
 const context={File,currentResult:{prompt,collection,values:{costume:'ミイラ'},drawingReferences:[],localRefs:[]},deliveryImageFiles:()=>files,$,needsReference:()=>false,tell(){},navigator:{canShare:({files:provided})=>supports||provided.every(file=>file.type.startsWith('image/')),share:async value=>{if(failure)throw Object.assign(new Error('Native share failure'),{name:failure});payload=value;},clipboard:{writeText:async value=>{clipboard=value;}}}};
 vm.createContext(context);vm.runInContext(functions,context);await context.shareAll();
 if(!supports||failure==='TypeError'){
  assert.equal(payload,null,'An unsupported image/text-file bundle must never downgrade to image-only or inline-long-text sharing');
  assert.equal($('transfer-fallback').hidden,false);
  assert.match($('transfer-status').textContent,/prompt\.txt/);
  assert.match($('transfer-fallback-instruction').textContent,/全文を貼り付け/);
 }else if(failure==='AbortError'){
  assert.equal(payload,null);assert.match($('transfer-status').textContent,/取り消/);assert.equal($('transfer-fallback').hidden,true);
 }else{
  assert.equal(payload.files.length,images+1);
  for(let index=0;index<images;index++)assert.equal(payload.files[index],files[index],'Every original reference remains in the same share payload');
  const instructions=payload.files.at(-1);assert.equal(instructions.name,'prompt.txt');assert.equal(instructions.type,'text/plain');assert.equal(await instructions.text(),prompt,'File contains the exact complete prompt');
  assert.ok(payload.text.length<180,'Visible request remains short');assert.ok(!payload.text.includes('【制作条件】'),'Full specification is not expanded into chat text');assert.match(payload.text,/prompt\.txt/);assert.match(payload.text,/画像作成機能/);
  assert.match($('transfer-status').textContent,new RegExp('参照画像'+images+'枚'));assert.match($('transfer-status').textContent,/共有先で/);
 }
 if(!failure){await context.copyPrompt();assert.equal(clipboard,prompt,'Explicit full-text copy remains exact');await context.shareText();assert.equal(payload.text,prompt,'Explicit full-text share remains available');}
 routes++;
}
for(const collection of ['halloween','everyday'])for(const images of [0,3])await exercise({collection,images});
await exercise({supports:false});await exercise({failure:'TypeError'});await exercise({failure:'AbortError'});
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.match(html,/id="download-text"[^>]*>prompt\.txt を保存/);
assert.ok(app.includes("new Blob([currentResult.prompt],{type:'text/plain;charset=utf-8'}),'prompt.txt'"),'Direct file export keeps the full existing specification');
console.log('PASS compact handoff: '+routes+' actual file-first, text-copy/share, zero-image, unsupported-mixed-file, failure and cancellation routes; exact complete prompt.txt plus all original images; no automatic long-text expansion.');
