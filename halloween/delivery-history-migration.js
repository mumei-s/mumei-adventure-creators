import {visibleQuestions} from './catalog.js?v=28.4.5';
import {selectionReferenceManifest,selectionReferenceCounts} from './selection-references.js?v=28.4.5';
import {stylePresetFor} from './style-presets.js?v=28.4.5';
import {composePrompt} from './prompt.js?v=28.4.5';
import {stagePrompts} from './production-workflow.js?v=28.4.5';
import {normalizeSelectionLabels,canonicalSelectionLabel} from './legacy-selection-aliases.js?v=28.4.5';
import {productionPlan} from './production-plan.js?v=28.4.5';

export const DELIVERY_HISTORY_SCHEMA=1;
const plain=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const mismatch=()=>new Error('この履歴は現在の制作仕様との互換性を確認できません。保存データは変更していません。入力画面から制作し直してください。');
function compatiblePlan(record){
 const plan=record.production,values=record.values;
 if(!plain(plan)||!plain(values)||!plain(plan.values)||!plain(record.variant)||!plain(plan.variant)||!plain(plan.copy)||typeof plan.copy.mode!=='string'||!Array.isArray(plan.copy.slots)||!Array.isArray(plan.conditions)||!Array.isArray(plan.notes)||!Array.isArray(plan.format)||!Array.isArray(record.references))throw mismatch();
 // Unknown future schemas and inconsistent selections are not guesses at a
 // migration. The saved copy and direction are never generated a second time.
 if(plan.schemaVersion!=null&&plan.schemaVersion!==DELIVERY_HISTORY_SCHEMA)throw mismatch();
 if(record.selectionReference?.schemaVersion!=null&&![1,2].includes(record.selectionReference.schemaVersion))throw mismatch();
 const keys=[...visibleQuestions.map(q=>q.key),'place','line'];
 for(const key of keys)if(typeof values[key]!=='string'||!values[key].trim()||plan.values[key]!==values[key])throw mismatch();
 if(plan.values.sourceKind!==values.sourceKind||typeof plan.noPerson!=='boolean')throw mismatch();
 const conditions=new Map();
 for(const condition of plan.conditions){
  if(!plain(condition)||typeof condition.key!=='string'||conditions.has(condition.key)||condition.value!==values[condition.key]||!Array.isArray(condition.checks)||!(typeof condition.text==='string'||Array.isArray(condition.sections)))throw mismatch();
  conditions.set(condition.key,condition);
 }
 for(const q of visibleQuestions)if(!conditions.has(q.key))throw mismatch();
 if(plan.copy.slots.some(slot=>!plain(slot)||typeof slot.role!=='string'||typeof slot.text!=='string'))throw mismatch();
 if(record.references.some(ref=>!plain(ref)||typeof ref.name!=='string'||typeof ref.role!=='string'))throw mismatch();
 return plan;
}

// This is a delivery view, not a stored-history migration. Keep the archived
// record and restoration cache intact; replace prompt and attachments together
// only after all compatibility checks and compilation succeed.
export function recomposeHistoryDelivery(record,{version,selectionManifest=selectionReferenceManifest,stylePreset=stylePresetFor,compose=composePrompt,stages=stagePrompts}={}){
 if(record.isFresh)return record;
 const saved=compatiblePlan(record),values=normalizeSelectionLabels(structuredClone(record.values)),variant=structuredClone(record.variant);
 if(variant.tone)variant.tone=canonicalSelectionLabel('mood',variant.tone);
 const production=productionPlan(record.profile||{},values,variant,record.collection||saved.collection||'halloween',()=>.5);
 production.copy=structuredClone(saved.copy);
 const drawing=stylePreset(values.medium),drawingReferences=drawing?[drawing]:[],selectionReference=selectionManifest(values),references=structuredClone(record.references);
 production.values=values;production.variant=variant;production.referenceManifest=[...drawingReferences,...(selectionReferenceCounts(selectionReference).sheet?[selectionReference]:[]),...references];
 const prompt=compose({collection:record.collection||saved.collection||'halloween',creator:record.creator||'',profile:record.profile||{},values,variant,references:production.referenceManifest,edition:record.edition,referenceBundle:record.referenceBundle||null,preparedPlan:production});
 if(typeof prompt!=='string'||!prompt.trim())throw mismatch();
 const compiledStages=stages(production);
 // Never reuse cached old image bytes after their descriptor changes. The
// caller loads these current descriptors before presenting the compiled text.
 const delivery={...record,values,variant,production,prompt,stages:compiledStages,references,drawingReferences,selectionReference,deliveryMigration:{schemaVersion:DELIVERY_HISTORY_SCHEMA,fromVersion:record.version,toVersion:version,label:'現在の仕様で再構成'}};
 delete delivery.localDrawingRefs;delete delivery.localSelectionReference;
 return delivery;
}
