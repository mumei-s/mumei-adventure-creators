import {sampleFor} from './examples.js?v=28.3.1';

// These are prepared by the tool owner. The creator never uploads style art.
// A picker thumbnail remains UI-only unless explicitly selected for delivery.
export const PRESET_CHOICES=Object.freeze([
 {key:'medium',label:'画風・質感'},
 {key:'theme',label:'世界観・シーン'},
 {key:'costume',label:'衣装・主役'},
 {key:'pose',label:'ポーズ'},
 {key:'design',label:'デザイン・誌面'}
]);
export const DEFAULT_PRESET_KEYS=Object.freeze(['medium','theme']);
const extensionType={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp'};
const cache=new Map();
export function presetReferenceFor(key,value,{sample=sampleFor}={}){
 if(!PRESET_CHOICES.some(choice=>choice.key===key)||!value||value==='おまかせ')return null;
 const preview=sample(key,value);
 if(preview.kind!=='image'||typeof preview.src!=='string'||!preview.src.startsWith('./')||preview.src.includes('#'))return null;
 const file=preview.src.slice(2);
 // Never attach an SVG diagram, the whole multi-page magazine sprite,
 // or an unknown/remote URL in place of a real image.
 if(file.startsWith('/')||file.includes('..')||!(/^[a-zA-Z0-9_\/-]+\.(?:jpe?g|png|webp)$/i).test(file))return null;
 const ext=file.split('.').at(-1).toLowerCase(),type=extensionType[ext];
 if(!type)return null;
 const safeFile=file.split('/').at(-1);
 return {role:'preset',key,value,file,name:'preset-'+key+'-'+safeFile,
  label:PRESET_CHOICES.find(choice=>choice.key===key).label+'：'+value,type};
}
export function selectPresetReferences(values,keys){
 const unique=new Set(keys);
 const result=[];
 for(const choice of PRESET_CHOICES){
  if(!unique.has(choice.key))continue;
  const reference=presetReferenceFor(choice.key,values[choice.key]);
  if(!reference)throw new Error('「'+choice.label+'」の選択には送信用の見本画像がありません。見本選択を外すか、別の項目を選んでください。');
  if(!result.some(existing=>existing.file===reference.file))result.push(reference);
 }
 if(!result.length)throw new Error('添付する見本を1つ以上選んでください。');
 if(result.length>4)throw new Error('見本画像の同時送信は4枚までです。');
 return result;
}
export async function loadPresetReferences(references,{fetchImpl=globalThis.fetch,FileClass=globalThis.File}={}){
 const requests=references.map(async ref=>{
  const verified=presetReferenceFor(ref.key,ref.value);
  if(!verified||verified.file!==ref.file||verified.name!==ref.name)throw new Error('見本画像の選択内容を確認できません。再度制作してください。');
  if(!cache.has(verified.file)){
   const pending=(async()=>{
    const response=await fetchImpl(new URL(verified.file,import.meta.url));
    if(!response.ok)throw new Error('「'+verified.label+'」の見本画像を読み込めませんでした。');
    const blob=await response.blob();
    if(blob.size===0||blob.size>10*1024*1024)throw new Error('見本画像の容量を確認できません。');
    const bytes=new Uint8Array(await blob.arrayBuffer());
    const jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
    const png=bytes.length>8&&bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;
    const webp=bytes.length>12&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
    if(!((verified.type==='image/jpeg'&&jpg)||(verified.type==='image/png'&&png)||(verified.type==='image/webp'&&webp)))throw new Error('「'+verified.label+'」の見本画像の形式が一致しません。');
    return new FileClass([bytes],verified.name,{type:verified.type});
   })();
   cache.set(verified.file,pending);
   pending.catch(()=>cache.delete(verified.file));
   if(cache.size>8)cache.delete(cache.keys().next().value);
  }
  return {...verified,fileObject:await cache.get(verified.file)};
 });
 return Promise.all(requests);
}
export function presetImageFiles(result){
 return (result.localPresetRefs||[]).map(ref=>ref.fileObject);
}
