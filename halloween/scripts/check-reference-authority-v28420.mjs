import {qualityContext} from './quality-vm-fixtures.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {File} from 'node:buffer';
import {referenceAuthorityInstructions,deliveryReferenceNotice,identityRepairInstructions} from '../reference-authority.js';
import {productionPlan,repairPrompt} from '../production-plan.js';
import {composePrompt} from '../prompt.js';
import {applyCollection} from '../collection.js';
import {initialSelections} from '../modes.js';
import {resolveSelections,questions} from '../catalog.js';
import {buildDirection} from '../direction.js';
import {stylePresetFor} from '../style-presets.js';
import {deliveryImageFiles} from '../drawing-references.js';
import {imageGenerationRequest} from '../output-contract.js';
const profile={displayName:'参照検査',activityEnabled:false},random=()=>.34;
let cases=0;
for(const collection of ['halloween','everyday']){
 applyCollection(collection);
 for(const medium of questions.find(q=>q.key==='medium').groups.flatMap(g=>g.values)){
  const values=resolveSelections({...initialSelections(),medium,costume:'参照画像の衣装を生かす'},random);values.sourceKind='photo-person';
  const plan=productionPlan(profile,values,buildDirection([],values.mood,random,collection,values),collection,random);
  if(plan.issues.some(i=>i.severity==='error'))continue;
  const style=stylePresetFor(medium);plan.referenceManifest=[{role:'identity',name:'ChatGPTへ直接添付する主参照'},...(style?[style]:[])];
  const prompt=composePrompt({profile,values,variant:plan.variant,collection,preparedPlan:plan,references:plan.referenceManifest});
  assert(prompt.indexOf('画像の役割を先に確定')>=0);assert(prompt.indexOf('画像の役割を先に確定')<prompt.indexOf('ChatGPTが画像生成前に行う統合')); 
  assert.match(prompt,/見本だけ届いた場合.*生成せず/);
  assert.match(prompt,/先頭の画像や最後に添付された画像を自動で主参照にしない/);
  assert.doesNotMatch(prompt,/原寸の選択画風見本[^\n]*を制作の土台・編集の基準にする/);
  assert.match(repairPrompt({production:plan,values,prompt}),/誤った生成顔を保持対象にせず/);
  cases++;
 }
}
for(const sourceKind of ['photo-person','illustration-person','unknown','scenery','mark-object']){
 const text=referenceAuthorityInstructions({sourceKind,costume:'参照画像の衣装を生かす'},[{role:'identity',name:'original.png'},{role:'avoid',name:'old.png'}]).join('\n');
 assert.match(text,/主参照「original.png」/);assert(!text.includes('主参照「original.png・old.png」'));
 assert.match(text,/主参照セルだけを識別に使い/);
}
const multiple=referenceAuthorityInstructions({sourceKind:'photo-person'},[{role:'identity',name:'a.png'},{role:'identity',name:'b.png'}]).join('\n');assert.match(multiple,/主参照「a.png・b.png」/);assert.match(multiple,/複数の元画像で主役が判別できない場合は対象を確認/);
const direct={values:{sourceKind:'photo-person',costume:'参照画像の衣装を生かす'},localRefs:[]};
assert.match(deliveryReferenceNotice(direct),/この共有に含まれません.*元画像を追加/);
assert.match(deliveryReferenceNotice({...direct,localRefs:[{role:'support',file:{}}]}),/この共有に含まれません/);
assert.doesNotMatch(deliveryReferenceNotice({values:{costume:'風景を主役にする'}}),/ご自身の主参照/);
const primary=new File(['IDENTITY'],'user.png',{type:'image/png'}),style=new File(['STYLE'],'style.png',{type:'image/png'});
for(const medium of ['発光幻想アニメ','立体光彩リアル','水彩画']){
 const images=deliveryImageFiles({values:{medium},localRefs:[{file:primary,role:'identity'}],references:[{name:'user.png'}],localDrawingRefs:[{file:style}]},{FileClass:File});assert.equal(await images[0].text(),'IDENTITY');assert.equal(await images[1].text(),'STYLE');
}
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const remove=app.match(/remove\.addEventListener\('click',\(\)=>\{([\s\S]*?)\}\);const role=/)?.[1];assert(remove);
for(const secondRole of ['support','avoid']){
 const refs=[{role:'identity',url:'one'},{role:secondRole,url:'two'}];
 vm.runInNewContext("(()=>{"+remove+"})()",{refs,r:refs[0],i:0,resettingReferences:false,URL:{revokeObjectURL(){}},renderRefs(){},persistDraftReferences(){}});
 assert.equal(refs[0].role,secondRole,'Removing primary cannot silently promote support or avoid');
}
const share=app.slice(app.indexOf('async function shareAll(){'),app.indexOf('function showShareFallback('));
let payload;const context={currentResult:direct,shareFiles:()=>[style,new File(['prompt'],'prompt.txt')],deliveryReferenceNotice,imageGenerationRequest,canShareFiles:()=>true,navigator:{share:async value=>{payload=value;}},$:()=>({textContent:''}),showShareFallback(){throw new Error('unexpected fallback');}};
vm.runInContext(share,qualityContext(context));await context.shareAll();assert.match(payload.text,/見本だけなら生成せず/);assert.equal(payload.files[0],style);
assert.match(app,/pendingReferences:\(r.references\|\|\[\]\)\.filter/);
assert.match(identityRepairInstructions({sourceKind:'photo-person'}),/修正対象と元の主参照の実画像を画像作成機能へ渡し/);
console.log('PASS reference authority: '+cases+' all-style/two-mode prompt paths, missing/direct/combined references, shared original bytes/order, actual removal and direct-share handlers, identity-aware repair. Generated image fidelity not executed.');
