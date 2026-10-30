import assert from 'node:assert/strict';
import {File} from 'node:buffer';
import {applyUserReferenceScope} from '../reference-scope.js';
import {deliveryImageFiles} from '../drawing-references.js';
import {createCreatorDraft} from '../creator-draft.js';
import {initialSelections} from '../modes.js';
import {resolveSelections} from '../catalog.js';
import {productionPlan} from '../production-plan.js';
import {buildDirection} from '../direction.js';
import {applyPose} from '../poses.js';
import {composePrompt} from '../prompt.js';

const image=(id,role)=>({id,draftId:id,role,file:new File([id+' image bytes'],id+'.png',{type:'image/png'})});
const a=image('a','identity'),b=image('b','pose');
const result={localRefs:[b,a],references:[{id:'a',role:'identity',name:'a-delivery.png'},{id:'b',role:'pose',name:'b-delivery.png'}]};
const delivered=deliveryImageFiles(result,{FileClass:File});
assert.deepEqual(delivered.map(file=>file.name),['b-delivery.png','a-delivery.png']);
assert.deepEqual(await Promise.all(delivered.map(file=>file.text())),['b image bytes','a image bytes']);
assert.throws(()=>deliveryImageFiles({...result,references:result.references.slice(0,1)},{FileClass:File}),/対応を確認/);
assert.throws(()=>deliveryImageFiles({...result,references:result.references.map(ref=>({...ref,role:'avoid'}))},{FileClass:File}),/対応を確認/);
assert.throws(()=>deliveryImageFiles({...result,references:[result.references[0],result.references[0]]},{FileClass:File}),/重複/);
const legacy=deliveryImageFiles({localRefs:[a],references:[{name:'legacy.png',role:'identity'}]},{FileClass:File});
assert.equal(legacy[0].name,'legacy.png');

let state={format:1,profile:{creator:'',name:'',activity:''},references:[],profileEpoch:'initial',referenceEpoch:'initial'};const assets=new Map();
const database={
 async load(){return {state:structuredClone(state),blobs:new Map(state.references.map(ref=>[ref.id,assets.get(ref.assetKey)]))};},
 async update(updater){const result=updater(structuredClone(state));if(result.write===false)return result;for(const row of result.puts||[])assets.set(row.key,row.blob);for(const key of result.deletes||[])assets.delete(key);state=result.state;return {...result,saved:true};},close(){}
};
const draft=createCreatorDraft({database,FileClass:File});await draft.load();
for(const role of ['style','pose','costume','background','composition']){
 const ref=image('ref-'+role,role);assert.equal((await draft.saveReferences([ref])).saved,true);
 const loaded=await createCreatorDraft({database,FileClass:File}).load();assert.equal(loaded.references[0].role,role);assert.equal(await loaded.references[0].file.text(),ref.id+' image bytes');
}

const before='主参照から同じ人物の顔の輪郭・目鼻口と眉顎鼻首の特徴的な組合せ・髪型・識別色・固有の印・元々ある髭・民族的特徴・年齢感・性別表現・基礎体格を保つ。頭髪の識別形は保ち、帽子は今回の衣装。自然な髪・瞳・固有の印の識別色を保つ。';
const scoped=applyUserReferenceScope(before,{costume:'魔女',hair:'髪色は緑へ変更',hairstyle:'ボブへ変更'});
assert.doesNotMatch(scoped,/頭髪の識別形は保ち|髪型・識別色・固有の印/);
assert.match(scoped,/顔の輪郭・目鼻口と眉顎鼻首/);assert.match(scoped,/変更可の属性/);
assert.equal(applyUserReferenceScope(scoped,{costume:'魔女',hair:'髪色は緑へ変更'}),scoped,'Scope rendering is idempotent');
const literal='頭髪の識別形は保ち';
assert.ok(applyUserReferenceScope('利用者指定：'+literal,{costume:'魔女',appearance:literal}).includes(literal),'Do not rewrite user text even when it matches a generated clause');
assert.equal(applyUserReferenceScope('景観だけ',{costume:'風景を主役にする'}),'景観だけ','No face or hair conditions in a non-person work');
assert.equal(applyUserReferenceScope(null,{}),null);
for(const medium of ['発光幻想アニメ','立体光彩リアル','水彩画']){
 const values={...resolveSelections({...initialSelections(),medium},()=>.2),sourceKind:'illustration-person',hair:'髪色は緑へ変更',hairstyle:'短いボブへ変更'};
 const plan=productionPlan({displayName:'検証'},values,applyPose(buildDirection([],values.mood,()=>.2,'halloween',values),values.pose),'halloween',()=>.2);
 const prompt=composePrompt({profile:{displayName:'検証'},values,variant:plan.variant,preparedPlan:plan,references:[{name:'user.png',role:'identity'}]});
 const adjusted=applyUserReferenceScope(prompt,values);
 assert.doesNotMatch(adjusted,/頭髪の識別形は保ち|自然な髪・瞳[^。]*保|主参照の髪・肌・瞳の基礎色は識別のために残し|目鼻口・髪・固有の印/);
 assert.match(adjusted,/今回の参照範囲/);assert.ok(adjusted.includes(medium),'Retain the selected medium: '+medium);
}
console.log('Reference scope: stable image IDs, role persistence, legacy delivery, missing/misbound reference rejection, conditional hair scope and literal user input passed.');
