// Only the creator's own uploaded images can enter a reference bundle.
function loadImage(src){return new Promise((resolve,reject)=>{const img=new Image(),timer=setTimeout(()=>reject(new Error('参照画像を読み込めませんでした。')),12000);img.onload=()=>{clearTimeout(timer);resolve(img);};img.onerror=()=>{clearTimeout(timer);reject(new Error('参照画像を読み込めませんでした。'));};img.src=src;});}
export async function buildReferenceBoard(refs,metadata){
 if(!refs.length)return null;
 if(refs.length===1)return new File([refs[0].file],metadata[0].name,{type:refs[0].file.type});
 const images=await Promise.all(refs.map(r=>loadImage(r.url)));
 const canvas=document.createElement('canvas');canvas.width=2560;canvas.height=refs.length===2?1600:2400;
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('参照画像をまとめられませんでした。');
 ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
 refs.forEach((r,i)=>{const cols=2,cellW=1280,cellH=canvas.height/Math.ceil(refs.length/cols),x=(i%cols)*cellW,y=Math.floor(i/cols)*cellH;
  ctx.fillStyle='#191919';ctx.font='bold 30px sans-serif';ctx.fillText('参照'+(i+1)+' / '+(r.role==='identity'?'主参照':r.role==='avoid'?'似せない前作':'補助参照'),x+30,y+48);
  const im=images[i],scale=Math.min((cellW-60)/im.naturalWidth,(cellH-105)/im.naturalHeight),w=im.naturalWidth*scale,h=im.naturalHeight*scale;
  ctx.drawImage(im,x+(cellW-w)/2,y+75+(cellH-105-h)/2,w,h);
 });
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.96));if(!blob)throw new Error('参照画像をまとめられませんでした。');
 return new File([blob],'creator-references.jpg',{type:'image/jpeg'});
}
