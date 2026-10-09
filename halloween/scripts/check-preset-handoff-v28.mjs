import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {questions,AUTO} from '../catalog.js?v=28.4.4';
import {stylePresets,stylePresetFor,loadStylePresets} from '../style-presets.js?v=28.4.4';
import {deliveryImageFiles} from '../drawing-references.js?v=28.4.4';
import {compactHistoryRecord,restoreHistoryRecord} from '../history-storage.js?v=28.4.4';
import {makeZip} from '../zip.js?v=28.4.4';
const root=new URL('../',import.meta.url),app=fs.readFileSync(new URL('app.js',root),'utf8');
class Node {
 constructor(tag,text=''){this.tagName=tag;this.textContent=text;this.children=[];this.dataset={};this.value='';this.hidden=false;}
 append(...nodes){for(const n of nodes){n.parent=this;this.children.push(n);}}
 replaceChildren(...nodes){this.children=[];this.append(...nodes);}
 get options(){return this.children.flatMap(n=>n.tagName==='optgroup'?n.children:[n]);}
 querySelector(){return this.children.find(n=>n.dataset.customPreset);}
 remove(){this.parent.children=this.parent.children.filter(n=>n!==this);}
 scrollIntoView(){}
}
const nodes=new Map(),$=id=>{if(!nodes.has(id))nodes.set(id,new Node(id==='style-preset-select'?'select':'div'));return nodes.get(id);};
let shared,zipBlob;const context={$,questions,AUTO,selections:{medium:AUTO},stylePresetFor,el:(tag,cls,text)=>new Node(tag,text),sampleNode:(key,value)=>new Node('sample',value),deliveryImageFiles,File,Uint8Array,TextEncoder,makeZip,download:b=>{zipBlob=b;},creatorDisplayLabel:()=>'',needsReference:()=>true,tell:s=>{$('toast').textContent=s;},canShareFiles:()=>true,navigator:{share:async data=>{shared=data;},clipboard:{writeText:async()=>{}}},shareFiles:r=>[...deliveryImageFiles(r),new File([r.prompt],'prompt.txt',{type:'text/plain'})]};
vm.createContext(context);
vm.runInContext(app.slice(app.indexOf('function renderStylePreset('),app.indexOf("$('style-preset-select').addEventListener")),context);
context.renderStylePreset({medium:AUTO});assert.equal($('style-preset-select').options.length,stylePresets.length+1);
for(const preset of stylePresets){context.renderStylePreset({medium:preset.medium});assert.equal($('style-preset-select').value,preset.medium);assert.equal($('style-preset-preview').children[0].textContent,preset.medium);assert.match($('style-preset-status').textContent,/共有・制作セット/);}
context.renderStylePreset({medium:'自由な独自画風'});assert.equal($('style-preset-select').value,'自由な独自画風');assert.match($('style-preset-status').textContent,/見本画像はなく/);
context.renderStylePreset({medium:AUTO});assert.equal($('style-preset-select').options.length,stylePresets.length+1,'Free text must not accumulate options');
const preset=stylePresetFor('発光幻想アニメ');
const fetchImpl=async url=>new Response(fs.readFileSync(url),{headers:{'Content-Type':'image/png'}});
const originals=await loadStylePresets([preset],{fetchImpl}),character=new File(['UNCHANGED ORIGINAL CHARACTER'],'character.png',{type:'image/png'});
context.currentResult={values:{medium:preset.medium},prompt:'FULL DRAWING INSTRUCTION WITH DISTINCT CHARACTER AND PRESET',drawingReferences:[preset],localDrawingRefs:originals,localRefs:[{file:character,role:'identity'}],references:[{name:'reference-01-character.png',role:'identity'}]};
vm.runInContext(app.slice(app.indexOf('async function shareAll()'),app.indexOf('async function imagePNG')),context);
await context.shareAll();assert.equal(shared.files.length,2);assert.equal(shared.text,context.currentResult.prompt);assert.equal(shared.files[0].name,'reference-01-character.png');assert.equal(await shared.files[0].text(),await character.text());assert.equal(shared.files[1].name,preset.name);
vm.runInContext(app.slice(app.indexOf('async function copyPrompt()'),app.indexOf('async function copyStage(')),context);
assert.equal(await context.copyPrompt(),true);assert.match($('toast').textContent,/主参照.*画風見本/);
vm.runInContext(app.slice(app.indexOf('async function downloadKit()'),app.indexOf('function renderHistory()')),context);
await context.downloadKit();const bytes=Buffer.from(await zipBlob.arrayBuffer());assert.ok(bytes.includes(Buffer.from(preset.name)));assert.ok(bytes.includes(Buffer.from('reference-01-character.png')));assert.ok(bytes.includes(Buffer.from('選んだ画風見本を含みます')));
const record=await compactHistoryRecord(context.currentResult);assert.ok(!record.localDrawingRefs&&!record.localRefs);const restored=await restoreHistoryRecord(record);assert.deepEqual(restored.drawingReferences,[preset]);
assert.ok(app.includes('localDrawingRefs:await loadStylePresets(restored.drawingReferences)'), 'History must reload preset image bytes');
const html=fs.readFileSync(new URL('index.html',root),'utf8');assert.match(html,/id="style-preset-select"/);assert.match(html,/画風見本を選ぶ/);assert.doesNotMatch(html,/id="style-image-input"|利用者.*画風.*添付/);
console.log('PASS preset UI and real app handoff: '+stylePresets.length+' options, AUTO/custom sync, distinct original character and luminous preset + full text share, copy warning, original images in ZIP, reloadable history metadata, no user-style-upload controls. Browser layout is not evaluated by this test.');
