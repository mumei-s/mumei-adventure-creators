import {renderEditorialLayout} from './editorial-layout.js?v=28.4.5';
import {inspectImageResource,decodeRasterForDraw,releaseCanvas} from './image-resources.js?v=28.4.5';

const node=(tag,text,className)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(className)e.className=className;return e;};
const placeholder='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/aWQAAAAASUVORK5CYII=';
let rendering=false;
async function acceptedRaster(file){
 if(!file||file.size>20*1024*1024)throw new Error('20MB以下のPNG・JPEG・WebP画像を選んでください。');
 const h=new Uint8Array(await file.slice(0,12).arrayBuffer());
 const png=h.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>h[i]===v);
 const jpeg=h[0]===255&&h[1]===216&&h[2]===255;
 const webp=h.length>=12&&String.fromCharCode(...h.slice(0,4))==='RIFF'&&String.fromCharCode(...h.slice(8,12))==='WEBP';
 if(!png&&!jpeg&&!webp)throw new Error('PNG・JPEG・WebPの主画像を選んでください。');
 return new Blob([file],{type:png?'image/png':jpeg?'image/jpeg':'image/webp'});
}

// The original bitmap is drawn once, without cropping or recoloring. Only
// text/rules are rasterized from SVG; no full-image base64 string is retained.
// Standalone self-contained SVG output remains in renderEditorialLayout.
export async function renderLayoutPng(plan,file,{shouldContinue=()=>true}={}){
 if(rendering)throw new Error('誌面を作成中です。完了してから次の画像を選んでください。');
 rendering=true;let decoded=null,page=null,svgUrl=null,canvas=null,measuringCanvas=null;
 const check=()=>{if(!shouldContinue())throw new DOMException('誌面の作成を中止しました。','AbortError');};
 try{
  const raster=await acceptedRaster(file),info=await inspectImageResource(raster);check();
  if(document.fonts?.ready)await document.fonts.ready;check();
  measuringCanvas=document.createElement('canvas');const measuring=measuringCanvas.getContext('2d');if(!measuring)throw new Error('この端末では文字を配置できません。');
  const measureText=(text,{fontSize,fontFamily,fontWeight})=>{measuring.font=(fontWeight||400)+' '+fontSize+'px '+fontFamily;return measuring.measureText(text).width;};
  const {svg,...layout}=renderEditorialLayout(plan,{dataUrl:placeholder,artworkWidth:info.width,artworkHeight:info.height,measureText});
  const background=svg.match(/<rect x="0" y="0"[^>]+fill="([^"]+)"\/>/);if(!background)throw new Error('誌面の背景を配置できません。');
  const overlay=svg.replace(background[0],'').replace(/<image\s[^>]*\/>/,'');
  const frame=layout.placements.image,scale=Math.min(frame.width/info.width,frame.height/info.height),width=info.width*scale,height=info.height*scale;
  decoded=await decodeRasterForDraw(raster,{dimensions:info,maxWidth:width,maxHeight:height});check();
  canvas=document.createElement('canvas');canvas.width=layout.width;canvas.height=layout.height;
  const context=canvas.getContext('2d');if(!context)throw new Error('この端末では誌面を保存できません。');
  context.fillStyle=background[1];context.fillRect(0,0,canvas.width,canvas.height);context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
  context.drawImage(decoded.image,frame.x+(frame.width-width)/2,frame.y+(frame.height-height)/2,width,height);decoded.dispose();decoded=null;
  svgUrl=URL.createObjectURL(new Blob([overlay],{type:'image/svg+xml;charset=utf-8'}));page=new Image();page.src=svgUrl;await page.decode();check();
  context.drawImage(page,0,0);
  const png=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  check();
  if(!png)throw new Error('完成PNGを作れませんでした。小さいサイズでお試しください。');
  return {...layout,png};
 }finally{decoded?.dispose();page?.removeAttribute('src');if(svgUrl)URL.revokeObjectURL(svgUrl);releaseCanvas(canvas);releaseCanvas(measuringCanvas);rendering=false;}
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
 let job=0,disposed=false,busy=false,output=null,previewUrl=null;
 function clearPreview(){preview.removeAttribute('src');if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=null;output=null;figure.hidden=true;save.disabled=true;}
 input.addEventListener('change',async()=>{
  const file=input.files?.[0];if(!file||busy||disposed)return;const ticket=++job;busy=true;input.disabled=true;clearPreview();status.textContent='主画像と文字を配置しています…';
  try{
   const result=await renderLayoutPng(plan,file,{shouldContinue:()=>!disposed&&ticket===job});if(disposed||ticket!==job)return;
   output=result;previewUrl=URL.createObjectURL(result.png);preview.src=previewUrl;figure.hidden=false;
   caption.textContent=result.width+' × '+result.height+' px / '+plan.values.design;
   status.textContent='完成PNGを表示しました。'+(result.notes?.length?result.notes.join(' '):'画像全体と文字の収まりを確認して保存できます。');
   save.disabled=false;
  }catch(error){if(disposed||ticket!==job)return;clearPreview();status.textContent=error.message||'誌面を作れませんでした。';}
  finally{busy=false;input.value='';if(!disposed)input.disabled=false;}
 });
 save.addEventListener('click',()=>{
  if(!output||!previewUrl)return;const a=node('a');a.href=previewUrl;a.download='finished-layout-'+output.width+'x'+output.height+'.png';document.body.append(a);a.click();a.remove();tell('完成PNGを保存しました。');
 });
 return {element:panel,dispose(){disposed=true;job++;input.value='';input.disabled=true;clearPreview();}};
}
