import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {drawingReferenceFor,drawingReferenceInstructions,loadDrawingReferences,deliveryImageFiles} from '../drawing-references.js?v=28.4.6';
import {sampleFor} from '../examples.js?v=28.4.6';
import {compactHistoryRecord,restoreHistoryRecord} from '../history-storage.js?v=28.4.6';
import {makeZip} from '../zip.js?v=28.4.6';
import {applyCollection} from '../collection.js?v=28.4.6';
import {initialSelections} from '../modes.js?v=28.4.6';
import {resolveSelections} from '../catalog.js?v=28.4.6';
import {buildDirection} from '../direction.js?v=28.4.6';
import {productionPlan,repairPrompt} from '../production-plan.js?v=28.4.6';
import {composePrompt} from '../prompt.js?v=28.4.6';
import {composeArtworkStage,composeArtworkRepair} from '../artwork-stage.js?v=28.4.6';

const root=new URL('../',import.meta.url),anime=drawingReferenceFor('宝石光彩アニメ'),real=drawingReferenceFor('宝石光彩リアル');
assert.notEqual(anime.file,real.file);
for(const ref of [anime,real]){
 const bytes=fs.readFileSync(new URL(ref.file,root));
 assert.equal(bytes.subarray(1,4).toString(),'PNG');
 assert.equal(bytes[25],6,'The completed drawing reference must retain an RGBA transparency channel');
 const preview=sampleFor('medium',ref.medium);
 assert.equal(preview.src,'./'+ref.file);
 assert.match(preview.label,/制作時に添付/);
}
for(const medium of ['現代アニメの一枚絵','花霞の透明アニメ','ミルキーパステルアニメ','夢彩ファンタジーアニメ','宵彩ゴシックアニメ','透明水彩アニメ','未登録の自由作風']){
 assert.equal(drawingReferenceFor(medium),null);
 assert.deepEqual(drawingReferenceInstructions(medium),[],'Other genres must not acquire a jewel master');
}
let calls=0;
const fetchImpl=async url=>{calls++;return new Response(fs.readFileSync(url),{headers:{'Content-Type':'image/png'}});};
const drawingRefs=await loadDrawingReferences([anime],{fetchImpl});
assert.equal(calls,1);
assert.deepEqual(Buffer.from(await drawingRefs[0].file.arrayBuffer()),fs.readFileSync(new URL(anime.file,root)),'Do not flatten, recolor or replace the transparent master');
await loadDrawingReferences([anime],{fetchImpl});assert.equal(calls,1,'Repeated preparation reuses the bounded original file');
await assert.rejects(loadDrawingReferences([real],{fetchImpl:async()=>new Response('missing',{status:404})}),/画風原画を読み込めません/);
assert.equal((await loadDrawingReferences([real],{fetchImpl})).length,1,'A failed load must be retryable');
await assert.rejects(loadDrawingReferences([{...real,file:'https://example.test/other.png'}],{fetchImpl}),/画風原画の指定/);

const localRefs=Array.from({length:4},(_,i)=>({file:new File(['ORIGINAL USER IMAGE '+i],'user-'+i+'.png',{type:'image/png'}),role:i?'support':'identity'}));
const result={isFresh:true,prompt:'CHARACTER IDENTITY + DRAWING ONLY + ALL SELECTED CONDITIONS',values:{medium:anime.medium},references:localRefs.map((r,i)=>({name:'reference-'+i+'.png',role:r.role})),localRefs,drawingReferences:[anime],localDrawingRefs:drawingRefs};
const images=deliveryImageFiles(result);assert.equal(images.length,5,'Four user uploads plus one separate drawing input');
for(let i=0;i<4;i++)assert.equal(await images[i].text(),await localRefs[i].file.text());
assert.equal(images[4].name,anime.name);assert.equal(images[4].type,'image/png');
assert.equal(deliveryImageFiles({...result,localRefs:[]}).length,1,'Direct ChatGPT attachment mode still transfers the drawing master');

const app=fs.readFileSync(new URL('app.js',root),'utf8'),nodes=new Map();let payload,zipBlob;
const $=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',disabled:false,hidden:true,dataset:{},scrollIntoView(){}});return nodes.get(id);};
const context={currentResult:result,deliveryImageFiles,shareFiles:r=>[...deliveryImageFiles(r),new File([r.prompt],'prompt.txt',{type:'text/plain'})],canShareFiles:()=>true,navigator:{share:async data=>{payload=data;}},$,makeZip,TextEncoder,Uint8Array,download:blob=>{zipBlob=blob;},tell(){},needsReference:()=>true,creatorDisplayLabel:()=>''};
vm.createContext(context);
vm.runInContext(app.slice(app.indexOf('async function shareAll()'),app.indexOf('async function imagePNG')),context);
await context.shareAll();assert.equal(payload.files.length,5);assert.equal(payload.text,result.prompt);assert.equal(payload.files[4].name,anime.name);
vm.runInContext(app.slice(app.indexOf('async function downloadKit()'),app.indexOf('function renderHistory()')),context);
await context.downloadKit();assert.ok(zipBlob,'The production ZIP must be generated');
const archive=Buffer.from(await zipBlob.arrayBuffer()),entries=new Map();let offset=0;
while(archive.readUInt32LE(offset)===0x04034b50){const size=archive.readUInt32LE(offset+18),nameLength=archive.readUInt16LE(offset+26),extraLength=archive.readUInt16LE(offset+28),start=offset+30+nameLength+extraLength;entries.set(archive.subarray(offset+30,offset+30+nameLength).toString(),archive.subarray(start,start+size));offset=start+size;}
assert.equal(entries.size,7);assert.equal(entries.get('prompt.txt').toString(),result.prompt);assert.deepEqual(entries.get(anime.name),fs.readFileSync(new URL(anime.file,root)));
assert.match(entries.get('使い方.txt').toString(),/専用画風原画を含みます/);
const compact=await compactHistoryRecord(result);assert.deepEqual(compact.drawingReferences,[anime]);assert.ok(!compact.localDrawingRefs&&!compact.localRefs,'History metadata must not store image blobs');
assert.deepEqual((await restoreHistoryRecord(compact)).drawingReferences,[anime]);
context.currentResult={...result,localRefs:[],references:[{role:'identity',name:'主参照を直接添付'}]};await context.downloadKit();assert.ok(zipBlob);const directBytes=Buffer.from(await zipBlob.arrayBuffer());assert.ok(directBytes.includes(Buffer.from('ご自身の主参照を追加し')),'A ZIP with only a drawing base must ask for the user character input');
for(const noPerson of [false,true])for(const ref of [anime,real]){
 applyCollection('everyday');const random=()=>.34,profile={displayName:'参照経路の検査',activityEnabled:false};
 const values=resolveSelections({...initialSelections(),sceneUnified:true,medium:ref.medium,theme:'街角アニメ日和',costume:noPerson?'風景を主役にする':'参照画像の衣装を生かす',palette:'モノクローム',type:'文字を一切入れない',line:'セリフなし'},random),variant=buildDirection([],values.mood,random,'everyday',values),plan=productionPlan(profile,values,variant,'everyday',random);
 const prompt=composePrompt({collection:'everyday',profile,values,variant:plan.variant,preparedPlan:plan,references:[ref,{role:'identity',name:'user.png'}],edition:'DRAWING-PATH'});
 const routes=[prompt,composeArtworkStage(plan),composeArtworkRepair(plan),composeArtworkRepair(plan,{compact:true}),repairPrompt({production:plan,values})];
 for(const route of routes){assert.ok(route.includes(ref.name));assert.match(route,/明暗差と反射密度を保つ/);assert.match(route,/名称や説明文だけで原画を見たと扱わない/);}
 const drawing=drawingReferenceInstructions(ref.medium,{noPerson}).join('\n');
 if(noPerson){assert.match(drawing,/原画の人体を完全に除外/);assert.doesNotMatch(drawing,/人物と今回の選択項目を差し替える|人物・衣装・背景を一つの光/);}
 else{assert.match(drawing,/閉眼は開かず/);assert.match(drawing,/髪がない主参照へ髪を足さない/);assert.match(drawing,/脚・足/);}
}
applyCollection('halloween');
console.log('PASS actual drawing transfer: separate anime/real transparent assets, unrelated genres excluded, cached/retryable preparation, unchanged user bytes, 5-image native share + full prompt, original PNG in ZIP, history metadata without image blobs. Image-model fidelity is assessed separately.');
