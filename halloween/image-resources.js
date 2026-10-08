// Read dimensions before any pixel decoder is opened. Original files remain
// unchanged; previews are separate, disposable UI resources.
export const IMAGE_RESOURCE_LIMITS=Object.freeze({maxPixels:64_000_000,maxEdge:16_384,previewEdge:1200});
const text=(bytes,start,count)=>String.fromCharCode(...bytes.subarray(start,start+count));
const u16=(bytes,at,little=false)=>new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint16(at,little);
const u32=(bytes,at,little=false)=>new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(at,little);
const u24=(bytes,at)=>bytes[at]|bytes[at+1]<<8|bytes[at+2]<<16;
const dimensions=(width,height,format,orientation=1)=>({width:orientation>=5&&orientation<=8?height:width,height:orientation>=5&&orientation<=8?width:height,encodedWidth:width,encodedHeight:height,orientation,format});
function exifOrientation(bytes){
 if(text(bytes,0,6)!=='Exif\0\0'||bytes.length<14)return 1;
 const start=6,little=text(bytes,start,2)==='II';if(!little&&text(bytes,start,2)!=='MM')return 1;
 try{const offset=start+u32(bytes,start+4,little),count=u16(bytes,offset,little);for(let i=0;i<Math.min(count,256);i++){const at=offset+2+i*12;if(at+12>bytes.length)break;if(u16(bytes,at,little)===0x0112&&u16(bytes,at+2,little)===3&&u32(bytes,at+4,little)===1){const value=u16(bytes,at+8,little);return value>=1&&value<=8?value:1;}}}catch{}
 return 1;
}
function ispeDimensions(bytes){
 // ISO BMFF image dimensions occur inside meta/iprp/ipco, not compressed data.
 const containers=new Set(['meta','iprp','ipco']);let found=null,boxes=0;
 function scan(start,end,depth){if(depth>5)return;for(let at=start;at+8<=end&&boxes++<512;){let size=u32(bytes,at),header=8;const kind=text(bytes,at+4,4);if(size===1){if(at+16>end)return;const high=u32(bytes,at+8),low=u32(bytes,at+12);if(high)return;size=low;header=16;}else if(size===0)size=end-at;if(size<header||at+size>end)return;const body=at+header;if(kind==='ispe'&&body+12<=at+size){const width=u32(bytes,body+4),height=u32(bytes,body+8);if(width&&height&&(!found||width*height>found.width*found.height))found={width,height};}else if(containers.has(kind))scan(body+(kind==='meta'?4:0),at+size,depth+1);at+=size;}}
 scan(0,bytes.length,0);return found;
}
export async function readRasterDimensions(file){
 if(!file?.slice)throw new Error('画像ファイルを選んでください。');
 const bytes=new Uint8Array(await file.slice(0,262144).arrayBuffer());
 if(bytes.length>=24&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v)&&text(bytes,12,4)==='IHDR')return dimensions(u32(bytes,16),u32(bytes,20),'png');
 if(bytes.length>=10&&/^GIF8[79]a$/.test(text(bytes,0,6)))return dimensions(u16(bytes,6,true),u16(bytes,8,true),'gif');
 if(bytes.length>=26&&text(bytes,0,2)==='BM'){const dib=u32(bytes,14,true);if(dib===12)return dimensions(u16(bytes,18,true),u16(bytes,20,true),'bmp');if(dib>=40&&bytes.length>=26){const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);return dimensions(Math.abs(view.getInt32(18,true)),Math.abs(view.getInt32(22,true)),'bmp');}}
 if(bytes.length>=16&&text(bytes,0,4)==='RIFF'&&text(bytes,8,4)==='WEBP'){
  for(let at=12;at+8<=bytes.length;){const kind=text(bytes,at,4),size=u32(bytes,at+4,true),body=at+8;if(body+Math.min(size,10)>bytes.length)break;
   if(kind==='VP8X'&&size>=10)return dimensions(u24(bytes,body+4)+1,u24(bytes,body+7)+1,'webp');
   if(kind==='VP8 '&&size>=10&&bytes[body+3]===157&&bytes[body+4]===1&&bytes[body+5]===42)return dimensions(u16(bytes,body+6,true)&16383,u16(bytes,body+8,true)&16383,'webp');
   if(kind==='VP8L'&&size>=5&&bytes[body]===47){const bits=u32(bytes,body+1,true);return dimensions((bits&16383)+1,((bits>>>14)&16383)+1,'webp');}
   at=body+size+(size&1);
  }
 }
 if(bytes[0]===255&&bytes[1]===216){
  let at=2,orientation=1;const sof=new Set([192,193,194,195,197,198,199,201,202,203,205,206,207]);
  // Large ancillary JPEG segments are skipped without reading their body.
  for(let markers=0;markers<512&&at+4<=file.size;markers++){
   const header=at+4<=bytes.length?bytes.subarray(at,at+4):new Uint8Array(await file.slice(at,at+4).arrayBuffer());if(header[0]!==255)break;if(header[1]===255){at++;continue;}const marker=header[1];if(marker===217||marker===218)break;if(marker===1||marker>=208&&marker<=215){at+=2;continue;}const size=u16(header,2);if(size<2||at+size+2>file.size)break;
   if(marker===225){const segment=at+size+2<=bytes.length?bytes.subarray(at+4,at+size+2):new Uint8Array(await file.slice(at+4,at+size+2).arrayBuffer());orientation=exifOrientation(segment);}
   if(sof.has(marker)){const segment=at+9<=bytes.length?bytes.subarray(at+4,at+9):new Uint8Array(await file.slice(at+4,at+9).arrayBuffer());if(segment.length>=5)return dimensions(u16(segment,3),u16(segment,1),'jpeg',orientation);}
   at+=size+2;
  }
 }
 if(bytes.length>=16&&text(bytes,4,4)==='ftyp'){const found=ispeDimensions(bytes);if(found)return dimensions(found.width,found.height,/avif|avis/.test(text(bytes,8,Math.min(bytes.length-8,32)))?'avif':'heif');}
 throw new Error('この画像の寸法を事前に確認できません。PNG・JPEG・WebPで保存して選んでください。');
}
export function validateRasterDimensions(value,{maxPixels=IMAGE_RESOURCE_LIMITS.maxPixels,maxEdge=IMAGE_RESOURCE_LIMITS.maxEdge}={}){
 if(!Number.isSafeInteger(value?.width)||!Number.isSafeInteger(value?.height)||value.width<1||value.height<1)throw new Error('画像の幅と高さを確認できません。');
 if(Math.max(value.width,value.height)>maxEdge||value.width*value.height>maxPixels)throw new Error('画像が大きすぎます。長辺16,384px・6,400万画素以内に縮小してください。');
 return value;
}
export async function inspectImageResource(file,limits){return validateRasterDimensions(await readRasterDimensions(file),limits);}
export function fittedRasterSize(width,height,maxEdge=IMAGE_RESOURCE_LIMITS.previewEdge){const scale=Math.min(1,maxEdge/Math.max(width,height));return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};}
export function releaseCanvas(canvas){if(canvas){canvas.width=1;canvas.height=1;}}
export async function decodeRasterForDraw(file,{dimensions:info,maxWidth,maxHeight,bitmapFactory=globalThis.createImageBitmap}={}){
 const size=info||await inspectImageResource(file),scale=Math.min(1,(maxWidth||size.width)/size.width,(maxHeight||size.height)/size.height),width=Math.max(1,Math.round(size.width*scale)),height=Math.max(1,Math.round(size.height*scale));
 if(typeof bitmapFactory==='function'){
  const bitmap=await bitmapFactory(file,{resizeWidth:width,resizeHeight:height,resizeQuality:'high',imageOrientation:'from-image'});
  let disposed=false;return {image:bitmap,width,height,sourceWidth:size.width,sourceHeight:size.height,dispose(){if(!disposed){disposed=true;bitmap.close();}}};
 }
 const url=URL.createObjectURL(file),image=new Image();try{image.src=url;await image.decode();return {image,width:image.naturalWidth,height:image.naturalHeight,sourceWidth:image.naturalWidth,sourceHeight:image.naturalHeight,dispose(){image.removeAttribute('src');URL.revokeObjectURL(url);}};}catch(error){image.removeAttribute('src');URL.revokeObjectURL(url);throw error;}
}
export async function createImagePreview(file,{maxEdge=IMAGE_RESOURCE_LIMITS.previewEdge,dimensions:info}={}){
 const size=info||await inspectImageResource(file),target=fittedRasterSize(size.width,size.height,maxEdge);
 const decoded=await decodeRasterForDraw(file,{dimensions:size,maxWidth:target.width,maxHeight:target.height});
 const canvas=document.createElement('canvas');canvas.width=target.width;canvas.height=target.height;
 try{const context=canvas.getContext('2d');if(!context)throw new Error('画像の表示用プレビューを作れませんでした。');context.drawImage(decoded.image,0,0,target.width,target.height);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.9));if(!blob)throw new Error('画像の表示用プレビューを作れませんでした。');return {file:blob,width:target.width,height:target.height,sourceWidth:size.width,sourceHeight:size.height};}finally{decoded.dispose();releaseCanvas(canvas);}
}
