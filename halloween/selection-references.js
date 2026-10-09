import {visibleQuestions} from './catalog.js?v=28.4.5';
import {sampleFor} from './examples.js?v=28.4.5';
import {releaseCanvas,readRasterDimensions,validateRasterDimensions} from './image-resources.js?v=28.4.5';
import {stylePresetFor} from './style-presets.js?v=28.4.5';
import {makeZip} from './zip.js?v=28.4.5';
import {attachmentConditionPolicy,selectionAttachmentPolicy,focusedReferenceMedia} from './attachment-policy.js?v=28.4.5';

export const SELECTION_SHEET_NAME='selection-references.jpg';
export function selectionReferenceManifest(values,{sample=sampleFor,questions=visibleQuestions}={}){
 const conditions=questions.map((q,index)=>({key:q.key,value:values[q.key],label:q.name,...attachmentConditionPolicy(q.key,values),selectionIndex:index+1}));
 const items=conditions.filter(condition=>condition.deliverVisual).map(condition=>({...condition,sample:sample(condition.key,condition.value)}));
 const diagnosticItems=questions.map((q,index)=>({key:q.key,value:values[q.key],label:q.name,...attachmentConditionPolicy(q.key,values,{comparison:true}),selectionIndex:index+1})).filter(condition=>condition.deliverVisual).map(condition=>({...condition,sample:items.find(item=>item.key===condition.key)?.sample||sample(condition.key,condition.value)}));
 const medium=conditions.find(condition=>condition.key==='medium'),master=medium&&stylePresetFor(medium.value);
 const mediumReference=medium?{...medium,name:master?.name||null,file:master?.file||null,role:master?.role||'selected-medium',delivery:master?'separate-original':'text-only',inSheet:false}:null;
 return {schemaVersion:2,name:SELECTION_SHEET_NAME,role:'selection-sheet',label:'画風以外の選択項目の見本と役割',conditions,items,diagnosticItems,mediumReference,attachmentPolicy:selectionAttachmentPolicy(conditions),counts:{selected:conditions.length,sheet:items.length,separateStyle:master?1:0}};
}
// Legacy histories had ten images in `items`. Keep every selection as
// metadata, but never duplicate their medium master in a rebuilt sheet.
export function selectionReferenceConditions(manifest){return manifest.conditions||manifest.items.map(({sample,...condition},index)=>({...condition,selectionIndex:condition.selectionIndex||index+1}));}
export function selectionSheetItems(manifest,{comparison=false}={}){const conditions=selectionReferenceConditions(manifest),values=Object.fromEntries(conditions.map(condition=>[condition.key,condition.value]));return (comparison?manifest.diagnosticItems||manifest.items:manifest.items).filter(item=>attachmentConditionPolicy(item.key,values,{comparison}).deliverVisual).map(item=>({...item,selectionIndex:item.selectionIndex||conditions.find(condition=>condition.key===item.key)?.selectionIndex}));}
export function selectionReferenceCounts(manifest){const conditions=selectionReferenceConditions(manifest),medium=conditions.find(condition=>condition.key==='medium');return {selected:conditions.length,sheet:selectionSheetItems(manifest).length,separateStyle:medium&&stylePresetFor(medium.value)?1:0};}
export function selectionReferenceRules(manifest){
 const counts=selectionReferenceCounts(manifest);
 return [manifest.name+' は全'+counts.selected+'選択のうち見本が必要な'+counts.sheet+'項目だけを載せる見本シート。画風は別添原寸で読み、寸法・文字なし・人物なしの表情やポーズ・主参照で指定した衣服や色は文章と主参照で保持し、重複図を添付しない。各枠はその役割だけを読む。画像内の見本名・番号・説明・文字やシートの複数図版を完成作品に描かない。',...selectionSheetItems(manifest).map(item=>item.label+'「'+item.value+'」：'+item.scope),'主参照だけが人物の識別基準。描線・塗り・光・材質は別添の原寸画風見本を優先し、シート内の別画風・別人物の顔や配色を混ぜない。全選択の条件は制作仕様に保持し、明示した姿勢・カメラ・文字範囲は文章の確定条件を優先する。'];
}
function wrap(ctx,text,x,y,maxWidth,lineHeight,maxLines=3){
 let line='',row=0;for(const character of String(text)){if(ctx.measureText(line+character).width>maxWidth&&line){ctx.fillText(line,x,y+row*lineHeight);line='';if(++row>=maxLines)return;}line+=character;}if(line)ctx.fillText(line,x,y+row*lineHeight);
}
function loadImage(src,ImageClass,timeoutMs){return new Promise((resolve,reject)=>{const im=new ImageClass();let timer;const finish=(error)=>{clearTimeout(timer);im.onload=im.onerror=null;error?reject(error):resolve(im);};im.onload=()=>finish();im.onerror=()=>finish(new Error('選択見本を読み込めませんでした：'+src));timer=setTimeout(()=>finish(new Error('選択見本の読み込みが時間内に終わりませんでした。再度制作してください。')),timeoutMs);try{im.src=new URL(src,import.meta.url).href;}catch(error){finish(error);}});}
function paintConditionCell(ctx,item,x,y,cellWidth=1024,cellHeight=670){
 const sample=item.sample;
 ctx.fillStyle='#172536';ctx.font='bold 25px sans-serif';wrap(ctx,String(item.selectionIndex).padStart(2,'0')+' '+item.label+' / '+item.value,x+26,y+38,cellWidth-52,31,2);
 ctx.fillStyle='#f1f3f6';ctx.fillRect(x+24,y+100,cellWidth-48,430);
 if(sample.kind==='size'){
  const width=sample.ratio>1?720:350*sample.ratio,height=width/sample.ratio;ctx.strokeStyle='#233a52';ctx.lineWidth=5;ctx.strokeRect(x+(cellWidth-width)/2,y+315-height/2,width,height);ctx.fillStyle='#233a52';ctx.font='28px sans-serif';wrap(ctx,item.value,x+70,y+360,cellWidth-140,35,3);
 }else if(sample.kind==='type'){
  // Empty copy regions are examples of permission and placement. Only a
  // literally selected word may be used as their illustrative manuscript.
  ctx.fillStyle='#233a52';ctx.strokeStyle='#233a52';ctx.lineWidth=3;ctx.font='bold 30px sans-serif';ctx.strokeRect(x+170,y+140,cellWidth-340,330);
  if(item.value==='HALLOWEENのみ'||item.value==='HALLOWEEN＋クリエイター名')wrap(ctx,'HALLOWEEN',x+230,y+240,cellWidth-460,36,1);
  else if(item.value!=='文字を一切入れない')for(let j=0;j<3;j++)ctx.strokeRect(x+230,y+205+j*60,cellWidth-460,24);
 }else if(sample.kind!=='image'){
  ctx.fillStyle='#233a52';ctx.font='32px sans-serif';wrap(ctx,sample.kind==='reference'?'この項目はご自身の主参照を使う':sample.text||item.value,x+80,y+240,cellWidth-160,42,5);
 }
 ctx.fillStyle='#233a52';ctx.font='22px sans-serif';wrap(ctx,'読む役割：'+item.scope,x+26,y+563,cellWidth-52,30,3);ctx.strokeStyle='#a9b4c0';ctx.lineWidth=1;ctx.strokeRect(x+8,y+8,cellWidth-16,cellHeight-16);
}
async function canvasFile(canvas,name,type,FileClass,quality){const blob=await new Promise(resolve=>canvas.toBlob(resolve,type,quality));if(!blob?.size)throw new Error('選択見本の画像を保存できませんでした。');return new FileClass([blob],name,{type});}
export async function buildSelectionReferenceSheet(manifest,{documentImpl=globalThis.document,ImageClass=globalThis.Image,FileClass=globalThis.File,imageTimeoutMs=15000}={}){
 const items=selectionSheetItems(manifest);if(!items.length)return null;
 const canvas=documentImpl.createElement('canvas'),columns=3,cellWidth=1024,cellHeight=670;canvas.width=columns*cellWidth;canvas.height=Math.ceil(items.length/columns)*cellHeight;
 try{
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('選択見本をまとめられませんでした。');
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);
  // Sequential decoding bounds memory; the style master remains a separate
  // original file, so it cannot compete with a reduced duplicate here.
  for(let i=0;i<items.length;i++){
   const item=items[i],x=(i%columns)*cellWidth,y=Math.floor(i/columns)*cellHeight,sample=item.sample;paintConditionCell(ctx,item,x,y,cellWidth,cellHeight);
   if(sample.kind==='image'){
    const image=await loadImage(sample.src,ImageClass,imageTimeoutMs);const width=image.naturalWidth||image.width,height=image.naturalHeight||image.height;if(!width||!height)throw new Error(item.value+'の見本画像を確認できませんでした。');
    const ratio=Math.min((cellWidth-68)/width,410/height);ctx.drawImage(image,x+(cellWidth-width*ratio)/2,y+110+(410-height*ratio)/2,width*ratio,height*ratio);image.onload=image.onerror=null;
   }
  }
  return await canvasFile(canvas,manifest.name,'image/jpeg',FileClass,.91);
 }finally{releaseCanvas(canvas);}
}

// This is an optional comparison route. It never changes the default sheet,
// the selections, or the number of images accepted by another application.
export function individualSelectionReferenceManifest(manifest){
 return selectionSheetItems(manifest,{comparison:true}).map(item=>{
  const source=item.sample.kind==='image'?new URL(item.sample.src,import.meta.url):null;
  const raster=source&&!source.hash&&!/\.svg$/i.test(source.pathname),extension=raster?(source.pathname.match(/\.([a-z0-9]+)$/i)?.[1]||'png'):'png';
  return {key:item.key,value:item.value,label:item.label,scope:item.scope,applicable:item.applicable,selectionIndex:item.selectionIndex,role:'selection-condition',name:'selection-'+String(item.selectionIndex).padStart(2,'0')+'-'+item.key+'.'+extension,source:item.sample.kind==='image'?item.sample.src:null,sourceKind:raster?'original-raster':source?'native-svg-view':'condition-diagram'};
 });
}
export async function buildIndividualSelectionReferences(manifest,{documentImpl=globalThis.document,ImageClass=globalThis.Image,FileClass=globalThis.File,fetchImpl=globalThis.fetch,imageTimeoutMs=15000}={}){
 const items=selectionSheetItems(manifest,{comparison:true}),references=individualSelectionReferenceManifest(manifest),ready=[];
 for(let index=0;index<items.length;index++){
  const item=items[index],reference=references[index];
  if(reference.sourceKind==='original-raster'){
   const response=await fetchImpl(new URL(reference.source,import.meta.url));if(!response.ok)throw new Error('選択見本を読み込めませんでした：'+item.value);
   const blob=await response.blob(),dimensions=validateRasterDimensions(await readRasterDimensions(blob));
   const type={png:'image/png',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',bmp:'image/bmp',avif:'image/avif'}[dimensions.format];if(!type)throw new Error('選択見本の画像形式を確認できませんでした。');
   ready.push({...reference,width:dimensions.width,height:dimensions.height,file:new FileClass([blob],reference.name,{type})});continue;
  }
  const canvas=documentImpl.createElement('canvas');
  try{
   let image;if(reference.sourceKind==='native-svg-view'){
    // Retain #viewBox fragments. Decoding the base SVG would merge multiple
    // unrelated examples into this one condition.
    image=await loadImage(reference.source,ImageClass,imageTimeoutMs);canvas.width=image.naturalWidth||image.width;canvas.height=image.naturalHeight||image.height;validateRasterDimensions({width:canvas.width,height:canvas.height});
   }else{canvas.width=1024;canvas.height=670;}
   const ctx=canvas.getContext('2d');if(!ctx)throw new Error('選択見本をまとめられませんでした。');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);
   if(image)ctx.drawImage(image,0,0,canvas.width,canvas.height);else paintConditionCell(ctx,item,0,0);
   const file=await canvasFile(canvas,reference.name,'image/png',FileClass);ready.push({...reference,width:canvas.width,height:canvas.height,file});
  }finally{releaseCanvas(canvas);}
 }
 return ready;
}
export async function buildIndividualSelectionReferenceZip({manifest,identityReferences=[],styleReferences=[],composeIndividualPrompt,conditionsText=''},dependencies={}){
 if(typeof composeIndividualPrompt!=='function')throw new Error('個別添付用の制作原稿を用意してください。');
 const localSelectionReferences=await buildIndividualSelectionReferences(manifest,dependencies);
 const conditions=selectionReferenceConditions(manifest),styleFirst=focusedReferenceMedia.includes(conditions.find(condition=>condition.key==='medium')?.value);
 const supplied=[...(styleFirst?[...styleReferences,...identityReferences]:[...identityReferences,...styleReferences]),...localSelectionReferences];
 if(supplied.some(ref=>!ref.file?.arrayBuffer||!ref.name||/[\/\\]/.test(ref.name)))throw new Error('個別見本と主参照のファイルを確認できませんでした。');
 if(new Set(supplied.map(ref=>ref.name)).size!==supplied.length)throw new Error('個別見本のファイル名が重複しています。');
 const FileClass=dependencies.FileClass||globalThis.File,attached=supplied.map(ref=>ref.file.name===ref.name?ref:{...ref,file:new FileClass([ref.file],ref.name,{type:ref.file.type})});
 const references=attached.map(({file,...reference})=>reference),counts={selected:conditions.length,individual:localSelectionReferences.length,attached:attached.length,identity:identityReferences.length,separateStyle:styleReferences.length};
 const kitManifest={schemaVersion:2,kind:'individual-reference-comparison',conditions,references,counts,attachmentPolicy:selectionAttachmentPolicy(conditions,{mode:'individual'}),
  execution:{status:'not-executed',observedTool:'image_gen',observedMaxReferenceImages:5,canUseObservedSingleCall:counts.attached<=5,qualityStatus:'not-accepted',reason:counts.attached>5?'この構成は今回の検証に使った image_gen の参照5枚上限を超える。個別全画像の一括生成は未実行。利用先が異なる場合はその実際の上限を確認する。':'実際に同じ条件を生成して照合するまでは未実行。'},
  acceptance:'全有効見本を個別画像で渡す選択肢。今回の検証に使った image_gen は参照5枚が上限で、これを超える全画像一括添付は実行できなかった。他の利用先へ一律の上限として当てはめず、実際に受け付ける枚数を確認する。全画像を渡せない場合は、主参照＋原寸画風＋役割別シートの通常経路を使い、条件を無言で減らさない。枚数だけで精度が高いと判定せず、同じ選択の完成画像で照合する。'};
 const productionPrompt=await composeIndividualPrompt(kitManifest);
 if(typeof productionPrompt!=='string'||!productionPrompt.trim()||productionPrompt.includes(manifest.name)||conditions.some(condition=>!productionPrompt.includes(condition.value)))throw new Error('個別添付用の原稿と実際の添付ファイルが一致していません。');
 const prompt=['【全有効見本を個別画像で渡す場合】','この資料に含まれる画像は合計'+counts.attached+'枚（主参照'+counts.identity+'枚・原寸画風'+counts.separateStyle+'枚・条件見本'+counts.individual+'枚）。役割別シートは含まれない。全'+counts.selected+'選択の条件は下の制作本文に保持している。',kitManifest.acceptance,...references.map(ref=>ref.name+'：'+(ref.role==='identity'?'人物の識別資料。':ref.role==='selection-condition'?ref.key+'「'+ref.value+'」／'+ref.scope:'選択作風の原寸原画。')),'以下の本文と各資料の担当条件を一つの完成場面へ統合する。見本の別人・別の画風・複数のパネル・見本文字をそのまま作品へ描かない。',productionPrompt].join('\n');
 const encode=text=>new TextEncoder().encode(text),files=[{name:'prompt.txt',data:encode(prompt)},{name:'references.json',data:encode(JSON.stringify(kitManifest,null,2))},{name:'selected-conditions.txt',data:encode(conditionsText||conditions.map(item=>item.label+'：'+item.value+'\n読む役割：'+item.scope).join('\n\n'))}];
 for(const ref of attached)files.push({name:ref.name,data:new Uint8Array(await ref.file.arrayBuffer())});
 return {blob:makeZip(files),prompt,manifest:kitManifest,localSelectionReferences,files:attached.map(ref=>ref.file)};
}
