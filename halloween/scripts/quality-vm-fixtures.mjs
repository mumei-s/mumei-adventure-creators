import fs from 'node:fs';
import vm from 'node:vm';
import {prepareGenerationDelivery,inspectDelivery,inspectDeliveryFiles,scopeGenerationStages,qualityAssistEnabled,setQualityAssistEnabled} from '../generation-quality-delivery.js';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const start=app.indexOf('function ensureQualityDelivery('),end=app.indexOf('\nfunction canShareFiles(',start);
if(start<0||end<=start)throw new Error('Actual quality delivery handler was not found.');
const actualGuard=app.slice(start,end);

// The existing tests extract actual app handlers into a tiny DOM fixture.
// Bind the real data/check functions as imports, and the actual app guard as
// source. Panel layout is outside these fixtures; its lifecycle is harmless.
export function qualityContext(fields){
 const retained={...fields};Object.assign(fields,{File:globalThis.File,Blob:globalThis.Blob,prepareGenerationDelivery,inspectDelivery,inspectDeliveryFiles,scopeGenerationStages,qualityAssistEnabled,setQualityAssistEnabled,
  mountQualityPanel:()=>()=>{},disposeQualityPanel:()=>{},tell(){}},retained);
 const context=vm.createContext(fields);
 vm.runInContext(actualGuard,context);
 return context;
}
