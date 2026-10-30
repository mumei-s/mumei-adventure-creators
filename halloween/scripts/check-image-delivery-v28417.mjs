import {qualityContext} from './quality-vm-fixtures.mjs';
import {deliveryReferenceNotice} from '../reference-authority.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {File} from 'node:buffer';
import {imageGenerationRequest,nativeImageRequest,imageOutputContract,compactImageOutputContract,imageDeliveryRepairPrompt} from '../output-contract.js?v=28.4.6';
import {assertDeliveryRetry} from './image-delivery-assertions-v28417.mjs';

// Exercise the requests and actual UI/share handlers. An external ChatGPT
// image-generation result cannot be produced or guaranteed by this web app.
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
function actual(start,next){const from=app.indexOf(start),to=app.indexOf(next,from);assert(from>=0&&to>from,'Missing actual application handler: '+start);return app.slice(from,to);}
const longPrompt='ORIGINAL_CONDITIONS_MUST_NOT_BE_REPEATED\n'+'各項目の詳しい作画条件。'.repeat(5000);
assert.equal(nativeImageRequest,imageGenerationRequest());
for(const hasImages of [false,true])for(const attachedPrompt of [false,true]){
 const request=imageGenerationRequest(hasImages,attachedPrompt);
 assert(request.length<160,'The share request must not expand the full specification into the chat');
 assert.match(request,/ChatGPTの画像作成機能.*完成画像を1枚生成.*このチャットに通常の生成画像として表示/);
 if(hasImages)assert.match(request,/添付の参照画像/);else assert.doesNotMatch(request,/参照画像/,'Scenery without references must not be blocked by a false attachment request');
 if(attachedPrompt){assert.match(request,/添付の prompt\.txt の作画条件/);assert.doesNotMatch(request,/以下の作画条件/,'File sharing has no inline specification below the short request');}
 else assert.match(request,/以下の作画条件/);
}
for(const contract of [imageOutputContract,compactImageOutputContract]){
 const text=contract.join('\n');
 assert.match(text,/画像作成機能.*実行/);
 assert.match(text,/文章・コード・ダウンロードリンクを画像の代わりにしない/);
 assert.match(text,/画像が(?:実際に)?返るまでは.*完成しました.*表示しました.*伝えない/);
 assert.match(text,/参照不足.*利用不可.*上限.*生成失敗/,'Actual failures must not turn into a success message');
 assert.match(text,/画像.*表示.*先|(?:検査|補足).*表示を待たせない/,'Dpi inspection must not take priority over image delivery');
}
for(const result of [undefined,null,{prompt:longPrompt},{prompt:longPrompt,production:{},status:'generated'}])assertDeliveryRetry(imageDeliveryRepairPrompt(result),longPrompt);

const help=html.match(/<aside class="delivery-help">([\s\S]*?)<\/aside>/)?.[1];
assert(help,'Image recovery must have an always-visible result control');
assert.match(help,/画像が出ない・文章だけで終わったとき/);
assert.match(help,/画像が表示されるまで生成は完了していません/);
assert.match(help,/<button id="copy-delivery"[^>]*aria-controls="delivery-retry-panel"/);
assert.match(help,/<textarea id="delivery-retry-text"[^>]*readonly/);
assert.doesNotMatch(help,/<details|<button id="copy-delivery"[^>]*hidden/,'Recovery must not be hidden in optional editing stages');
assert.match(app,/\$\('copy-delivery'\)\.addEventListener\('click',copyDeliveryRequest\)/);
assert.match(app,/currentResult=r;\$\('delivery-retry-panel'\)\.hidden=true;\$\('delivery-retry-text'\)\.value=''/,'A new result must clear the previous retry text');
const retryHandler=actual('async function copyDeliveryRequest(){',"$('copy-delivery').addEventListener");
let retryCases=0;
for(const clipboardMode of ['success','denied','missing']){
 const nodes=new Map(),events=[],writes=[];
 const $=id=>{if(!nodes.has(id))nodes.set(id,{hidden:true,value:'',focus(){events.push(id+':focus');},select(){events.push(id+':select');},scrollIntoView(){events.push(id+':scroll');}});return nodes.get(id);};
 const navigator=clipboardMode==='missing'?{}:{clipboard:{writeText:async text=>{writes.push(text);if(clipboardMode==='denied')throw new Error('Clipboard unavailable');}}};
 const context=qualityContext({$,navigator,imageDeliveryRepairPrompt,currentResult:{prompt:longPrompt},tell:message=>events.push(message)});
 vm.runInContext(retryHandler,context);await context.copyDeliveryRequest();
 const field=$('delivery-retry-text');assert.equal($('delivery-retry-panel').hidden,false,'The retry text remains reviewable even after automatic copying');
 assertDeliveryRetry(field.value,longPrompt,'UI '+clipboardMode);
 if(clipboardMode==='success'){assert.deepEqual(writes,[field.value]);assert(!events.some(event=>event.endsWith(':select')));}
 else {assert(events.includes('delivery-retry-text:focus'));assert(events.includes('delivery-retry-text:select'));assert(events.some(event=>event.includes('長押しでコピー')),'Clipboard failure must offer manual copy in place');}
 context.currentResult=null;const before=[...events];await context.copyDeliveryRequest();assert.deepEqual(events,before,'No active result must not fabricate recovery success');
 retryCases++;
}

const shareHandler=[actual('function shareFiles(r){','async function showResult('),actual('async function shareAll(){','function showShareFallback(')].join('\n');
let shareCases=0;
for(const imageCount of [0,1,4]){
 const images=Array.from({length:imageCount},(_,index)=>new File(['REFERENCE-'+index],'reference-'+index+'.png',{type:'image/png'}));
 const payloads=[],status={textContent:''};let fallback=0;
 const context=qualityContext({File,deliveryReferenceNotice,imageGenerationRequest,currentResult:{prompt:longPrompt},deliveryImageFiles:()=>images,$:()=>status,showShareFallback:()=>{fallback++;},navigator:{canShare:()=>true,share:async payload=>{payloads.push(payload);}}});
 vm.runInContext(shareHandler,context);await context.shareAll();
 assert.equal(payloads.length,1);assert.equal(fallback,0);
 const payload=payloads[0];assert.equal(payload.text,imageGenerationRequest(imageCount>0,true));assert(!payload.text.includes(longPrompt));
 assert.equal(payload.files.length,imageCount+1,'File sharing must preserve all reference images and the full prompt file');
 const promptFile=payload.files.at(-1);assert.equal(promptFile.name,'prompt.txt');assert.equal(await promptFile.text(),longPrompt);
 for(let index=0;index<imageCount;index++)assert.equal(await payload.files[index].text(),await images[index].text(),'Reference bytes must not change');
 assert.match(status.textContent,/共有操作へ渡しました/);assert.doesNotMatch(status.textContent,/生成しました|表示しました|完成しました/,'Opening a share sheet is not image generation');
 context.navigator.canShare=()=>false;await context.shareAll();assert.equal(fallback,1);assert.equal(payloads.length,1,'Unsupported file sharing must not silently drop attachments');
 context.navigator.canShare=()=>true;context.navigator.share=async()=>{throw Object.assign(new Error('cancel'),{name:'AbortError'});};await context.shareAll();assert.equal(fallback,1);assert.match(status.textContent,/取り消しました/);
 context.navigator.share=async()=>{throw new Error('Sharing failed');};await context.shareAll();assert.equal(fallback,2,'A real share error must expose the manual transfer path');
 shareCases++;
}
const kit=actual('async function downloadKit(){','async function downloadIndividualKit(');
assert.match(kit,/imageGenerationRequest\(imageNames\.length>0,true\)/,'Saved sets must tell ChatGPT to read the attached prompt.txt');
assert.match(kit,/imageDeliveryRepairPrompt\(r\)/,'Saved sets must include the same short recovery instruction');
assert.doesNotMatch(kit,/ChatGPTが内部で順に描いて実画像を確認/,'Saved sets must not retain the old internal generation loop');
console.log(`PASS image delivery: native/file requests, honest unavailable/error states, short same-chat retry, ${retryCases} actual clipboard/manual-copy cases and ${shareCases} actual file-share/cancel/failure cases preserve image bytes and the full attached prompt. External image generation is not executed or guaranteed by this regression.`);
