import {requiresPrimaryReference} from './reference-authority.js';
import {createProductionRequest,buildQualityPrompt,finalizeProductionRequest,safeInspectProductionRequest} from './generation-quality.js';
import {applyUserReferenceScope} from './reference-scope.js';

const preference='atelier-generation-quality-v1';
export function qualityAssistEnabled(storage){try{return (storage||globalThis.localStorage)?.getItem(preference)!=='off';}catch{return true;}}
export function setQualityAssistEnabled(enabled,storage){try{(storage||globalThis.localStorage)?.setItem(preference,enabled?'on':'off');return true;}catch{return false;}}
const manifestFor=result=>result.production?.referenceManifest||[...(result.references||[]),...(result.drawingReferences||[]),...(result.selectionReference?[result.selectionReference]:[])];

// This snapshot belongs to one edition. It contains descriptors, never image bytes.
// Source values and delivered text are supplied separately to the inspector.
export function prepareGenerationDelivery(result,{enabled=qualityAssistEnabled()}={}){
 if(!enabled)return {...result,qualityEnabled:false,qualityRequest:null,qualityInspection:{status:'uninspected',findings:[],imageStatus:'uninspected'}};
 try{
  // History stores descriptors, not private image bytes. Reopening a record
  // must ask for its original files in ChatGPT, never borrow the current draft.
  if(!result.isFresh&&result.references?.length){
   const local=result.localRefs||[],references=result.references.map(ref=>({...ref,pending:ref.pending||!local.some(item=>(ref.id||ref.draftId)?(item.id||item.draftId)===(ref.id||ref.draftId):item.name===ref.name)}));
   const pending=new Map(references.map(ref=>[ref.id||ref.name,ref]));
   result={...result,references,production:result.production?{...result.production,referenceManifest:manifestFor(result).map(ref=>pending.get(ref.id||ref.name)||ref)}:result.production};
  }
  const references=manifestFor(result),request=createProductionRequest({edition:result.edition,collection:result.collection,creator:result.creator,values:result.values,profile:result.profile,variant:result.variant,production:result.production,references,attachmentMode:result.attachmentMode,referenceRequired:requiresPrimaryReference(result.values)});
  const sourcePrompt=result.qualityRequest?.outputPrompt===result.prompt?result.prompt:buildQualityPrompt(request,applyUserReferenceScope(result.prompt,result.values,{contract:request}));
  const finalized=finalizeProductionRequest(request,sourcePrompt);
  const inspection=safeInspectProductionRequest(finalized,{values:result.values,references,prompt:sourcePrompt,conflicts:result.production?.issues||[]});
  return {...result,prompt:sourcePrompt,qualityEnabled:true,qualityRequest:finalized,qualityInspection:inspection};
 }catch{
  // Failure leaves the original prompt, all inputs and image objects intact.
  return {...result,qualityEnabled:true,qualityRequest:null,qualityInspection:{status:'error',findings:[{message:'条件を確認できませんでした。入力と画像は保持しています。'}],imageStatus:'uninspected'}};
 }
}

export function inspectDelivery(result,{files,copyPrompt=result.prompt,filePrompt=result.prompt}={}){
 if(!result.qualityEnabled||!result.qualityRequest)return result.qualityInspection||{status:'uninspected',findings:[]};
 return safeInspectProductionRequest(result.qualityRequest,{values:result.values,references:manifestFor(result),prompt:result.prompt,copyPrompt,filePrompt,
  ...(files?{deliveryNames:files.filter(file=>file.type?.startsWith('image/')).map(file=>file.name)}:{}),conflicts:result.production?.issues||[]});
}

// Inspect the actual outgoing text file, without decoding or duplicating images.
export async function inspectDeliveryFiles(result,files){
 const promptFile=files.find(file=>file.name==='prompt.txt');
 if(!result.qualityEnabled||!result.qualityRequest)return inspectDelivery(result,{files});
 if(!promptFile)return {status:'problems',imageStatus:'uninspected',findings:[{severity:'error',code:'missing-prompt-file',message:'制作指示ファイルが見つかりません。元の条件は保持しています。'}]};
 try{return inspectDelivery(result,{files,filePrompt:await promptFile.text()});}
 catch{return {status:'error',imageStatus:'uninspected',findings:[{severity:'notice',code:'file-uninspected',message:'指示ファイルを確認できませんでした。本文と元の画像は保持しています。'}]};}
}

export function qualityRequestForArchive(request){if(!request)return null;const {outputPrompt,...snapshot}=request;return snapshot;}

export function scopeGenerationStages(result,stages){
 if(!stages||!result.qualityEnabled||!result.qualityRequest)return stages;
 const scoped={...stages};
 for(const key of ['identity','identityRepair','final','artwork','repair','layout'])if(typeof scoped[key]==='string')scoped[key]=buildQualityPrompt(result.qualityRequest,applyUserReferenceScope(scoped[key],result.qualityRequest.selections,{contract:result.qualityRequest}));
 return scoped;
}
