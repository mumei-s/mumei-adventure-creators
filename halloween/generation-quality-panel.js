import {buildImageReviewPrompt,buildTargetedRepairPrompt} from './generation-quality.js';
import {inspectImageResource,createImagePreview} from './image-resources.js?v=28.4.6';

const node=(tag,text,className)=>{const element=document.createElement(tag);if(text!==undefined)element.textContent=text;if(className)element.className=className;return element;};
const button=(text,action)=>{const element=node('button',text,'secondary-button');element.type='button';element.addEventListener('click',action);return element;};
const safeName=file=>String(file?.name||'image.png').replace(/[\r\n]/g,' ');

// This panel holds at most an original and one revision in memory. It never
// uploads, interprets, replaces or automatically stores either image.
export function mountQualityPanel(container,{result,request,inspection,copyText,tell=()=>{},enabled=true,onEnabledChange}={}){
 const panel=node('details',undefined,'generation-quality');
 const summary=node('summary','生成品質アシスト');
 const checked=enabled&&inspection?.status==='checked';
 const state=enabled?(checked?'生成前の条件確認済み':inspection?.status==='problems'?'生成前の条件に確認点があります':'生成前の条件は未検査'):'生成前アシストはOFF';
 const summaryState=node('span',state+' / 完成画像は未検査','generation-quality-summary-state');
 summary.append(summaryState);panel.dataset.productionId=request?.productionId||result?.edition||'';
 const status=node('p',state+' / 完成画像は未検査','generation-quality-status');status.setAttribute('role','status');
 panel.append(summary,status);
 if(typeof onEnabledChange==='function'){
  const label=node('label',undefined,'generation-quality-enable'),toggle=node('input');toggle.type='checkbox';toggle.checked=enabled;
  toggle.addEventListener('change',()=>{onEnabledChange(toggle.checked);tell(toggle.checked?'次の制作から生成前アシストを使います。':'次の制作から生成前アシストをOFFにします。');});
  label.append(toggle,document.createTextNode('次の制作で生成前アシストを使う'));panel.append(label);
 }
 const note=node('p','選んだ条件と渡す指示の照合です。完成画像の顔・人数・文字・ポーズは自動判定していません。','microcopy');panel.append(note);
 const findings=Array.isArray(inspection?.findings)?inspection.findings:[];
 if(findings.length){
  const list=node('ul',undefined,'generation-quality-findings');
  for(const finding of findings){
   const item=node('li',finding.message||'この条件は確認できませんでした。');
   if(finding.evidence){const detail=node('details'),evidence=node('p',typeof finding.evidence==='string'?finding.evidence:JSON.stringify(finding.evidence));detail.append(node('summary','該当箇所'),evidence);item.append(detail);}
   list.append(item);
  }
  panel.append(list);
 }
 const fallback=node('textarea');fallback.readOnly=true;fallback.rows=6;fallback.hidden=true;fallback.setAttribute('aria-label','コピーできなかった確認・修正指示');
 let disposed=false,job=0,selected='original';
 const slots={original:null,revision:null};
 const instructionStatus=node('p','確認用の指示をコピーし、完成画像と必要な参照画像をChatGPTへ添付できます。','microcopy');instructionStatus.setAttribute('role','status');
 async function copy(text,message){
  if(disposed)return;
  try{if(copyText)await copyText(text);else await navigator.clipboard.writeText(text);if(disposed)return;fallback.hidden=true;fallback.value='';instructionStatus.textContent=message;tell(message);}
  catch{if(disposed)return;fallback.hidden=false;fallback.value=text;instructionStatus.textContent='この端末ではコピーできません。下の指示を選択してコピーできます。';fallback.focus();fallback.select();}
 }
 const review=button('完成画像を確認する指示をコピー',()=>{
  if(!request)return;
  try{copy(buildImageReviewPrompt(request),'確認用の指示をコピーしました。完成画像と必要な参照画像を同じチャットへ添付してください。');}
  catch(error){instructionStatus.textContent=error.message||'確認用の指示を作れませんでした。完成画像は未検査です。';}
 });review.disabled=!request;panel.append(review,instructionStatus);

 const images=node('details',undefined,'generation-quality-images');images.append(node('summary','完成画像を戻して、修正を準備する（任意）'));
 images.append(node('p','画像はこの画面だけで表示します。自動判定・再生成は行いません。元画像は修正版と分けて保持します。','microcopy'));
 const imageStatus=node('p','画像は選ばれていません。完成画像は未検査です。','microcopy');imageStatus.setAttribute('role','status');
 const grid=node('div',undefined,'generation-quality-grid');
 const views={};
 function save(slot){
  const value=slots[slot];if(!value)return;
  const link=node('a');link.href=value.originalURL;link.download=safeName(value.file);document.body.append(link);link.click();link.remove();
 }
 function release(slot){const value=slots[slot];if(value){URL.revokeObjectURL(value.previewURL);URL.revokeObjectURL(value.originalURL);}slots[slot]=null;}
 function refresh(){
  for(const slot of ['original','revision']){
   const view=views[slot],value=slots[slot];view.input.disabled=disposed||!!value||slot==='revision'&&!slots.original;
   view.figure.hidden=!value;view.save.disabled=!value;view.choose.disabled=!value;view.clear.hidden=!value;
   view.choose.setAttribute('aria-pressed',String(!!value&&selected===slot));
   if(value){view.preview.src=value.previewURL;view.caption.textContent=safeName(value.file)+' / '+value.dimensions.width+'×'+value.dimensions.height+' / 未検査';}
   else{view.preview.removeAttribute('src');view.caption.textContent='';}
  }
  const active=slots[selected];activeStatus.textContent=active?'修正指示の対象：'+(selected==='original'?'元画像':'修正版')+'「'+safeName(active.file)+'」':'修正指示の対象画像は未選択です。';
 }
 for(const [slot,title]of [['original','元画像'],['revision','修正版']]){
  const cell=node('section',undefined,'generation-quality-image');cell.append(node('h4',title));
  const label=node('label',title+'を選ぶ'),input=node('input');input.type='file';input.accept='image/png,image/jpeg,image/webp,image/avif';input.dataset.qualityImage=slot;label.append(input);
  const figure=node('figure'),preview=node('img'),caption=node('figcaption');preview.alt=title+'のプレビュー（内容は未検査）';figure.append(preview,caption);figure.hidden=true;
  const choose=button(title+'を修正対象にする',()=>{if(slots[slot]){selected=slot;refresh();}});choose.setAttribute('aria-pressed','false');
  const saveButton=button(title+'を保存',()=>save(slot));
  const clear=button(title+'の表示を解除',()=>{job++;release(slot);if(slot==='original'){release('revision');selected='original';}else if(selected==='revision')selected='original';refresh();imageStatus.textContent='表示を解除しました。端末の元ファイルは削除していません。';});
  input.addEventListener('change',async()=>{
   const file=input.files?.[0];input.value='';if(!file||disposed||slots[slot]||slot==='revision'&&!slots.original)return;
   const ticket=++job;input.disabled=true;imageStatus.textContent=title+'の表示を準備しています…';let previewURL=null,originalURL=null;
   try{
    if(file.size>20*1024*1024)throw new Error('画像は1枚20MB以下で選んでください。');
    const dimensions=await inspectImageResource(file),prepared=await createImagePreview(file,{dimensions,maxEdge:1000});
    if(disposed||ticket!==job)return;
    previewURL=URL.createObjectURL(prepared.file);originalURL=URL.createObjectURL(file);slots[slot]={file,dimensions,previewURL,originalURL};
    selected=slot;imageStatus.textContent=title+'を表示しました。画像の内容は未検査です。閉じる前に、必要な画像を端末へ保存してください。';
   }catch(error){if(previewURL)URL.revokeObjectURL(previewURL);if(originalURL)URL.revokeObjectURL(originalURL);if(!disposed&&ticket===job)imageStatus.textContent=(error.message||'画像を表示できませんでした。')+' 元画像と制作条件は変更していません。';}
   finally{if(!disposed)refresh();}
  });
  cell.append(label,figure,choose,saveButton,clear);grid.append(cell);views[slot]={input,figure,preview,caption,choose,save:saveButton,clear};
 }
 const activeStatus=node('p','修正指示の対象画像は未選択です。','microcopy');activeStatus.setAttribute('role','status');
 const edit=node('div',undefined,'generation-quality-edit');
 const fields={};
 for(const [key,label,placeholder]of [
  ['issues','確認した相違（任意）','画像で確認できた箇所と、どう違っているか'],
  ['changes','今回直す部分','例：右手も剣の柄に添える'],
  ['preserve','保持したい部分（任意）','例：顔、衣装、背景、文字と配置']
 ]){const wrapper=node('label',label),input=node('textarea');input.rows=2;input.maxLength=2000;input.placeholder=placeholder;input.dataset.qualityField=key;wrapper.append(input);fields[key]=input;edit.append(wrapper);}
 const repair=button('選んだ箇所の修正指示をコピー',()=>{
  if(!request)return;
  const image=slots[selected];
  if(!image){instructionStatus.textContent='修正対象の完成画像を選んでください。元画像はそのまま残ります。';return;}
  if(!fields.changes.value.trim()){instructionStatus.textContent='今回直す部分だけを入力してください。';fields.changes.focus();return;}
  try{copy(buildTargetedRepairPrompt(request,{imageName:safeName(image.file),issues:fields.issues.value,changes:fields.changes.value,preserve:fields.preserve.value}),'修正指示をコピーしました。選んだ完成画像と必要な参照画像を添付して送ってください。');}
  catch(error){instructionStatus.textContent=error.message||'修正指示を作れませんでした。画像は変更していません。';}
 });repair.disabled=!request;
 edit.append(node('p','上の相違は利用者の入力です。ツールによる画像判定ではありません。部分修正でも他の部分が変わることがあるため、修正後は保持した部分も確認してください。','microcopy'),repair);
 images.append(grid,imageStatus,activeStatus,edit);panel.append(images,fallback);container.append(panel);refresh();
 return ()=>{disposed=true;job++;for(const slot of ['original','revision']){views[slot].preview.removeAttribute('src');views[slot].input.value='';release(slot);}fallback.value='';panel.remove();};
}
