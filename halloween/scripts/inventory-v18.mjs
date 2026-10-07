import fs from 'node:fs';
import {questions} from '../catalog.js?v=19.0.0';
import {applyCollection} from '../collection.js?v=19.0.0';
import {sampleFor} from '../examples.js?v=19.0.0';
const entries=[];
for(const mode of ['halloween','everyday']){
 applyCollection(mode);
 for(const q of questions)for(const g of q.groups)for(const value of g.values){
  const sample=sampleFor(q.key,value);
  entries.push({mode,key:q.key,value,kind:sample.kind,...(sample.src?{file:sample.src}:{}),instruction:'individual-preset + Japan-context; actual render input tested',sampleStatus:sample.src?.includes('japan-')?'v18 replacement, visually reviewed':sample.kind==='image'?'existing sample retained; Japan-base replacement pending':'text/ratio/reference-specific preview',allCombinationsImageAcceptance:'not verified'});
 }
}
applyCollection('halloween');
fs.writeFileSync(new URL('../verification/v18/sample-inventory.json',import.meta.url),JSON.stringify({date:'2026-10-07',scope:'All options inventoried. Instruction coverage is separate from generated-image acceptance. Retained samples are explicitly not marked as Japan-base replacements.',entries},null,2));
