import {decodeRasterForDraw,releaseCanvas} from './image-resources.js?v=28.1.2';
// Only the creator's own uploaded images can enter a reference bundle.
export async function buildReferenceBoard(refs,metadata){
 if(!refs.length)return null;
 if(refs.length===1)return new File([refs[0].file],metadata[0].name,{type:refs[0].file.type});
 const canvas=document.createElement('canvas');canvas.width=2560;canvas.height=refs.length===2?1600:2400;
 try{
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('参照画像をまとめられませんでした。');
 ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
 for(let i=0;i<refs.length;i++){const r=refs[i],cols=2,cellW=1280,cellH=canvas.height/Math.ceil(refs.length/cols),x=(i%cols)*cellW,y=Math.floor(i/cols)*cellH;
  ctx.fillStyle='#191919';ctx.font='bold 30px sans-serif';ctx.fillText('参照'+(i+1)+' / '+(r.role==='identity'?'主参照':r.role==='avoid'?'似せない前作':'補助参照'),x+30,y+48);
  const decoded=await decodeRasterForDraw(r.file,{maxWidth:cellW-60,maxHeight:cellH-105});
  try{const scale=Math.min((cellW-60)/decoded.sourceWidth,(cellH-105)/decoded.sourceHeight),w=decoded.sourceWidth*scale,h=decoded.sourceHeight*scale;
   ctx.drawImage(decoded.image,x+(cellW-w)/2,y+75+(cellH-105-h)/2,w,h);
  }finally{decoded.dispose();}
 }
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.96));if(!blob)throw new Error('参照画像をまとめられませんでした。');
 return new File([blob],'creator-references.jpg',{type:'image/jpeg'});
 }finally{releaseCanvas(canvas);}
}
