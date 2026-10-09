import assert from 'node:assert/strict';
import {productionPlan} from '../production-plan.js?v=28.4.4';
import {recomposeHistoryDelivery} from '../delivery-history-migration.js?v=28.4.4';
import {selectionReferenceManifest,selectionReferenceCounts} from '../selection-references.js?v=28.4.4';
import {stylePresetFor} from '../style-presets.js?v=28.4.4';
import {compactHistoryRecord,restoreHistoryRecord} from '../history-storage.js?v=28.4.4';
import {composePrompt} from '../prompt.js?v=28.4.4';

const values={sceneUnified:true,medium:'薄膜光彩アニメ',theme:'吸血鬼の晩餐会',place:'古城の大広間',design:'通常の一枚絵',costume:'亡霊騎士',pose:'低くしゃがむ',mood:'牙を見せて威嚇',angle:'目線の高さ・正面',palette:'菫 × マンゴー × 白',type:'クリエイター名だけ',line:'セリフなし',size:'A4縦・300dpi目安｜2480×3508｜210:297',sourceKind:'photo-person'};
const profile={displayName:'保存作者',activityEnabled:false},plan=productionPlan(profile,values,{},'halloween',()=>.23);
assert.ok(plan.copy.slots.length,'Use a real saved manuscript rather than an empty-copy fixture');
plan.copy.slots[0].text='保存済み原稿・再抽選しない☀';
const oldStyle={name:'style-old.png',file:'assets/retired-original.png',role:'style-preset',medium:values.medium};
const oldSheet={schemaVersion:1,name:'selection-references.jpg',role:'selection-sheet',items:plan.conditions.map(c=>({key:c.key,value:c.value,label:c.name,sample:{kind:'image',src:'retired-thumbnail.jpg'}}))};
plan.referenceManifest=[oldStyle,oldSheet,{name:'reference-01-person.jpg',role:'identity'}];
const source={version:'28.4.2',edition:'OLD-SAVED',count:7,date:'2026-10-08T00:00:00Z',collection:'halloween',creator:'saved-author',profile,values,variant:plan.variant,production:plan,prompt:'OLD PROMPT: style-old.png / ten-image sheet',stages:{artwork:'OLD ARTWORK'},drawingReferences:[oldStyle],selectionReference:oldSheet,references:[{name:'reference-01-person.jpg',role:'identity'}],localDrawingRefs:[{...oldStyle,file:new File(['OLD STYLE BYTES'],'style-old.png',{type:'image/png'})}],localSelectionReference:{...oldSheet,file:new File(['OLD SHEET BYTES'],'selection-references.jpg',{type:'image/jpeg'})}};
const packed=await compactHistoryRecord(source),packedBefore=JSON.stringify(packed),restored=await restoreHistoryRecord(packed),restoredBefore=JSON.stringify(restored);
const migrated=recomposeHistoryDelivery(restored,{version:'28.4.4'}),style=stylePresetFor(values.medium),manifest=selectionReferenceManifest(values);
assert.deepEqual(migrated.values,values);assert.deepEqual(migrated.variant,source.variant);assert.deepEqual(migrated.production.copy,source.production.copy);
assert.equal(migrated.values.sourceKind,'photo-person');assert.equal(migrated.count,7);assert.equal(migrated.edition,source.edition);assert.equal(migrated.date,source.date);
assert.deepEqual(migrated.drawingReferences,[style]);assert.deepEqual(migrated.selectionReference,manifest);assert.deepEqual(migrated.production.referenceManifest,[style,...(selectionReferenceCounts(manifest).sheet?[manifest]:[]),...source.references]);
assert.equal(selectionReferenceCounts(manifest).sheet,0,'Focused delivery excludes conflicting example sheets while retaining every selection');
assert.equal(migrated.selectionReference.conditions.length,10);
assert.ok(migrated.stages.identity.includes(source.references[0].name));
assert.ok(migrated.stages.final.includes('prepared-identity.png'));
assert.ok(!migrated.stages.final.includes(source.references[0].name),'Final input must not reinstate the source photograph');
assert.equal(migrated.prompt,composePrompt({...migrated,references:migrated.production.referenceManifest,preparedPlan:migrated.production}));
assert.ok(migrated.prompt.includes(style.name));assert.ok(!migrated.prompt.includes('style-old.png'));assert.ok(migrated.prompt.includes(source.production.copy.slots[0].text));
assert.equal(migrated.localDrawingRefs,undefined);assert.equal(migrated.localSelectionReference,undefined);assert.notDeepEqual(migrated.stages,source.stages);
assert.equal(migrated.deliveryMigration.label,'現在の仕様で再構成');
assert.equal(JSON.stringify(packed),packedBefore,'The archived saved record must remain byte-identical');
assert.equal(JSON.stringify(restored),restoredBefore,'The restored cache entry must not be rewritten');
assert.equal((await restoreHistoryRecord(packed)).prompt,source.prompt,'Opening history must not replace the original saved prompt');
const fresh={...source,isFresh:true};assert.equal(recomposeHistoryDelivery(fresh,{version:'28.4.4'}),fresh,'Already prepared creation keeps its loaded bytes');
for(const change of [
 r=>{r.production.schemaVersion=999;},r=>{r.selectionReference.schemaVersion=999;},r=>{delete r.production;},
 r=>{r.production.conditions=r.production.conditions.filter(c=>c.key!=='angle');},
 r=>{r.values.sourceKind='illustration-person';},r=>{r.values.pose='走る';},r=>{r.production.copy.slots[0].text=null;}
]){
 const bad=structuredClone(restored);change(bad);const before=JSON.stringify(bad);
 assert.throws(()=>recomposeHistoryDelivery(bad,{version:'28.4.4'}),/互換性を確認できません.*保存データは変更/);
 assert.equal(JSON.stringify(bad),before,'An incompatible history remains intact');
}
assert.throws(()=>recomposeHistoryDelivery(restored,{version:'28.4.4',compose(){throw new Error('compile failed');}}),/compile failed/);
assert.equal(JSON.stringify(restored),restoredBefore,'Failed compilation cannot partially update attachments');
console.log('PASS delivery history: old archive/cache preserved; current style and selection manifest paired with exact recompiled prompt; saved manuscript, direction, source kind and identifiers retained; old image bytes discarded; fresh preparation retained; incompatible schemas and compile failure fail atomically. No generated-image quality claim.');
