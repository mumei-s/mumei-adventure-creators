import {visibleQuestions} from './catalog.js?v=28.4.3';
import {sampleFor} from './examples.js?v=28.4.3';
import {releaseCanvas} from './image-resources.js?v=28.4.3';

export const SELECTION_SHEET_NAME='selection-references.jpg';
const scopes={medium:'描線・形の整理・塗り・光・材質のみ。人物や背景は借りない',theme:'出来事と場所の構造のみ。別人の顔や画風は借りない',costume:'選択衣装の形・重なり・留め具・被覆のみ',pose:'関節・重心・支持点のみ。人物・衣服・カメラは借りない',mood:'選択表情と顔の向きのみ。別人の顔立ちは借りない',angle:'カメラ位置と投影のみ。数値と今回の姿勢を優先する',palette:'選択色と大きな面積配分のみ',design:'画像枠・文字枠・余白・罫線のみ。見本文字は印字しない',type:'今回許可された文字量のみ。見本文字は印字しない',size:'今回の縦横比と安全余白のみ。描画内容は借りない'};
export function selectionReferenceManifest(values,{sample=sampleFor,questions=visibleQuestions}={}){
 const items=questions.map(q=>({key:q.key,value:values[q.key],label:q.name,scope:scopes[q.key]||'この項目の選択条件だけ',sample:sample(q.key,values[q.key])}));
 return {name:SELECTION_SHEET_NAME,role:'selection-sheet',label:'選んだ全項目の見本と役割',items};
}
export function selectionReferenceRules(manifest){
 return [manifest.name+' は選んだ全項目の見本シート。各枠の見本は、その枠の役割だけを読む。画像内の見本名・番号・説明・文字やシートの複数図版を完成作品に描かない。',...manifest.items.map(item=>item.label+'「'+item.value+'」：'+item.scope),'主参照だけが人物の識別基準。画風は別添の高解像度画風見本を優先し、他の枠の人物・配色・画材を混ぜない。明示した姿勢・カメラ・文字範囲は文章の確定条件を優先する。'];
}
function wrap(ctx,text,x,y,maxWidth,lineHeight,maxLines=3){
 let line='',row=0;for(const character of String(text)){if(ctx.measureText(line+character).width>maxWidth&&line){ctx.fillText(line,x,y+row*lineHeight);line='';if(++row>=maxLines)return;}line+=character;}if(line)ctx.fillText(line,x,y+row*lineHeight);
}
function loadImage(src,ImageClass,timeoutMs){return new Promise((resolve,reject)=>{const im=new ImageClass();let timer;const finish=(error)=>{clearTimeout(timer);im.onload=im.onerror=null;error?reject(error):resolve(im);};im.onload=()=>finish();im.onerror=()=>finish(new Error('選択見本を読み込めませんでした：'+src));timer=setTimeout(()=>finish(new Error('選択見本の読み込みが時間内に終わりませんでした。再度制作してください。')),timeoutMs);im.src=new URL(src,import.meta.url).href;});}
export async function buildSelectionReferenceSheet(manifest,{documentImpl=globalThis.document,ImageClass=globalThis.Image,FileClass=globalThis.File,imageTimeoutMs=15000}={}){
 const canvas=documentImpl.createElement('canvas'),columns=2,cellWidth=1024,cellHeight=670;canvas.width=columns*cellWidth;canvas.height=Math.ceil(manifest.items.length/columns)*cellHeight;
 try{
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('選択見本をまとめられませんでした。');
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);
  // Sequential image decoding keeps memory bounded even with large style PNGs.
  for(let i=0;i<manifest.items.length;i++){
   const item=manifest.items[i],x=(i%columns)*cellWidth,y=Math.floor(i/columns)*cellHeight,sample=item.sample;
   ctx.fillStyle='#172536';ctx.font='bold 25px sans-serif';wrap(ctx,String(i+1).padStart(2,'0')+' '+item.label+' / '+item.value,x+26,y+38,cellWidth-52,31,2);
   ctx.fillStyle='#f1f3f6';ctx.fillRect(x+24,y+100,cellWidth-48,430);
   if(sample.kind==='image'){
    const image=await loadImage(sample.src,ImageClass,imageTimeoutMs);const width=image.naturalWidth||image.width,height=image.naturalHeight||image.height;if(!width||!height)throw new Error(item.value+'の見本画像を確認できませんでした。');
    const ratio=Math.min((cellWidth-68)/width,410/height);ctx.drawImage(image,x+(cellWidth-width*ratio)/2,y+110+(410-height*ratio)/2,width*ratio,height*ratio);image.onload=image.onerror=null;
   }else if(sample.kind==='size'){
    const width=sample.ratio>1?720:350*sample.ratio,height=width/sample.ratio;ctx.strokeStyle='#233a52';ctx.lineWidth=5;ctx.strokeRect(x+(cellWidth-width)/2,y+315-height/2,width,height);ctx.fillStyle='#233a52';ctx.font='28px sans-serif';wrap(ctx,item.value,x+70,y+360,cellWidth-140,35,3);
   }else if(sample.kind==='type'){
    // Picker examples contain illustrative titles, creator-name placeholders
    // and articles. They are not this work's manuscript. Show empty copy
    // regions, retaining only the explicitly selected literal HALLOWEEN.
    ctx.fillStyle='#233a52';ctx.strokeStyle='#233a52';ctx.lineWidth=3;ctx.font='bold 30px sans-serif';
    ctx.strokeRect(x+170,y+140,cellWidth-340,330);
    if(item.value==='HALLOWEENのみ'||item.value==='HALLOWEEN＋クリエイター名')wrap(ctx,'HALLOWEEN',x+230,y+240,cellWidth-460,36,1);
    else if(item.value!=='文字を一切入れない')for(let j=0;j<3;j++)ctx.strokeRect(x+230,y+205+j*60,cellWidth-460,24);
   }else{
    ctx.fillStyle='#233a52';ctx.font='32px sans-serif';wrap(ctx,sample.kind==='reference'?'この項目はご自身の主参照を使う':sample.text||item.value,x+80,y+240,cellWidth-160,42,5);
   }
   ctx.fillStyle='#233a52';ctx.font='22px sans-serif';wrap(ctx,'読む役割：'+item.scope,x+26,y+563,cellWidth-52,30,3);ctx.strokeStyle='#a9b4c0';ctx.lineWidth=1;ctx.strokeRect(x+8,y+8,cellWidth-16,cellHeight-16);
  }
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.91));if(!blob?.size)throw new Error('選択見本シートを保存できませんでした。');return new FileClass([blob],manifest.name,{type:'image/jpeg'});
 }finally{releaseCanvas(canvas);}
}
