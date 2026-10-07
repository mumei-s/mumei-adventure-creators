import {renderEditorialLayout} from './editorial-layout.js?v=20.0.0';

const node=(tag,text,className)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(className)e.className=className;return e;};
function asDataUrl(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('主画像を読み込めませんでした。'));reader.readAsDataURL(file);});}
async function decodeImage(src){const image=new Image();image.src=src;await image.decode();return image;}
async function acceptedRaster(file){
 if(!file||file.size>20*1024*1024)throw new Error('20MB以下のPNG・JPEG・WebP画像を選んでください。');
 const h=new Uint8Array(await file.slice(0,12).arrayBuffer());
 const png=h.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>h[i]===v);
 const jpeg=h[0]===255&&h[1]===216&&h[2]===255;
 const webp=h.length>=12&&String.fromCharCode(...h.slice(0,4))==='RIFF'&&String.fromCharCode(...h.slice(8,12))==='WEBP';
 if(!png&&!jpeg&&!webp)throw new Error('PNG・JPEG・WebPの主画像を選んでください。');
 return new Blob([file],{type:png?'image/png':jpeg?'image/jpeg':'image/webp'});
}

// Render a publication document from a finished image. The imported bitmap is
// embedded once without pixel edits; SVG fixes the geometry and typesetting.
export async function renderLayoutPng(plan,file){
 const raster=await acceptedRaster(file),dataUrl=await asDataUrl(raster),artwork=await decodeImage(dataUrl);
 if(document.fonts?.ready)await document.fonts.ready;
 const measuring=document.createElement('canvas').getContext('2d');
 const measureText=(text,{fontSize,fontFamily,fontWeight})=>{measuring.font=(fontWeight||400)+' '+fontSize+'px '+fontFamily;return measuring.measureText(text).width;};
 const layout=renderEditorialLayout(plan,{dataUrl,artworkWidth:artwork.naturalWidth,artworkHeight:artwork.naturalHeight,measureText});
 const svgUrl=URL.createObjectURL(new Blob([layout.svg],{type:'image/svg+xml;charset=utf-8'}));
 try{
  const page=await decodeImage(svgUrl),canvas=document.createElement('canvas');canvas.width=layout.width;canvas.height=layout.height;
  const context=canvas.getContext('2d');if(!context)throw new Error('この端末では誌面を保存できません。');
  context.drawImage(page,0,0);
  const png=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  if(!png)throw new Error('完成PNGを作れませんでした。小さいサイズでお試しください。');
  return {...layout,png};
 }finally{URL.revokeObjectURL(svgUrl);}
}

export function createLayoutPanel(plan,tell=()=>{}){
 const panel=node('section',null,'native-layout');panel.id='layout-builder';
 const title=node('h4','主画像を取り込んで、完成PNGを作る');
 const intro=node('p','確認した主画像を選ぶと、この画面で誌面を組みます。主画像を切り抜かずに配置し、文字・列・余白を固定します。');
 const label=node('label','確認した主画像を選ぶ','layout-file-label');
 const input=node('input');input.type='file';input.accept='image/png,image/jpeg,image/webp';input.id='layout-artwork';label.htmlFor=input.id;
 const status=node('p','PNG・JPEG・WebPに対応。画像はこの端末内で配置します。','microcopy');status.id='layout-status';status.setAttribute('role','status');
 const figure=node('figure',null,'layout-preview');figure.hidden=true;
 const preview=node('img');preview.id='layout-preview';preview.alt='主画像と文字を配置した完成誌面';
 const caption=node('figcaption');figure.append(preview,caption);
 const save=node('button','完成PNGを保存','primary-button');save.type='button';save.id='save-layout-png';save.disabled=true;
 panel.append(title,intro,label,input,status,figure,save);
 let job=0,disposed=false,output=null,previewUrl=null;
 input.addEventListener('change',async()=>{
  const file=input.files?.[0];if(!file)return;const ticket=++job;save.disabled=true;status.textContent='主画像と文字を配置しています…';
  try{
   const result=await renderLayoutPng(plan,file);if(disposed||ticket!==job)return;
   if(previewUrl)URL.revokeObjectURL(previewUrl);output=result;previewUrl=URL.createObjectURL(result.png);preview.src=previewUrl;figure.hidden=false;
   caption.textContent=result.width+' × '+result.height+' px / '+plan.values.design;
   status.textContent='完成PNGを表示しました。'+(result.notes?.length?result.notes.join(' '):'画像全体と文字の収まりを確認して保存できます。');
   save.disabled=false;
  }catch(error){if(disposed||ticket!==job)return;output=null;figure.hidden=true;status.textContent=error.message||'誌面を作れませんでした。';}
 });
 save.addEventListener('click',()=>{
  if(!output||!previewUrl)return;const a=node('a');a.href=previewUrl;a.download='finished-layout-'+output.width+'x'+output.height+'.png';document.body.append(a);a.click();a.remove();tell('完成PNGを保存しました。');
 });
 return {element:panel,dispose(){disposed=true;job++;if(previewUrl)URL.revokeObjectURL(previewUrl);output=null;}};
}
