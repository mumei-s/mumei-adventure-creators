import {selectedRecipes} from './recipes.js?v=10';
const names={medium:'画風・質感',design:'デザイン',theme:'物語',costume:'衣装',mood:'表情・角度',place:'舞台',palette:'配色',pose:'ポーズ'};
async function loadImage(src){return new Promise((resolve,reject)=>{const img=new Image(),timer=setTimeout(()=>reject(new Error('作例の画像を読み込めませんでした。通信を確認して、もう一度制作してください。')),12000);img.onload=()=>{clearTimeout(timer);resolve(img);};img.onerror=()=>{clearTimeout(timer);reject(new Error('作例の画像を読み込めませんでした。'));};img.src=src;});}
function wrap(ctx,text,x,y,maxWidth,lineHeight,maxLines=3){let line='',row=0;for(const ch of text){if(ctx.measureText(line+ch).width>maxWidth){ctx.fillText(line,x,y+row*lineHeight);line=ch;if(++row>=maxLines)return;}else line+=ch;}if(row<maxLines)ctx.fillText(line,x,y+row*lineHeight);}
export async function buildGuideBoard(values,primary){
 const recipes=selectedRecipes(values);
 const images=await Promise.all(recipes.map(r=>r.file?loadImage(new URL('./'+r.file,import.meta.url).href):r.value.startsWith('参照')&&primary?.url?loadImage(primary.url):null));
 const canvas=document.createElement('canvas');canvas.width=1440;canvas.height=1920;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('作例の画像セットを準備できませんでした。');
 ctx.fillStyle='#fff7e8';ctx.fillRect(0,0,1440,1920);
 const cells=[];
 recipes.forEach((r,i)=>{
  const x=(i%3)*480,y=Math.floor(i/3)*480;ctx.fillStyle='#2b1b12';ctx.fillRect(x+12,y+12,456,42);ctx.fillStyle='#fff7e8';ctx.font='bold 24px sans-serif';ctx.fillText(String(i+1).padStart(2,'0')+' / '+names[r.key],x+24,y+42);
  if(images[i]){const im=images[i],scale=Math.min(340/im.naturalWidth,340/im.naturalHeight),w=im.naturalWidth*scale,h=im.naturalHeight*scale;ctx.drawImage(im,x+70+(340-w)/2,y+62+(340-h)/2,w,h);}
  else{ctx.fillStyle='#ead6ba';ctx.fillRect(x+70,y+62,340,340);ctx.fillStyle='#2b1b12';ctx.font='bold 29px sans-serif';wrap(ctx,r.value,x+64,y+180,350,46);ctx.font='22px sans-serif';wrap(ctx,r.file?'':'作例なし：選択文を優先',x+64,y+320,350,34);}
  ctx.fillStyle='#2b1b12';ctx.font='bold 23px sans-serif';wrap(ctx,r.value,x+25,y+435,430,28,2);cells.push({cell:i+1,key:r.key,value:r.value,file:r.file,text:r.text});
 });
 const x=960,y=960;ctx.fillStyle='#2b1b12';ctx.fillRect(x+12,y+12,456,42);ctx.fillStyle='#fff7e8';ctx.font='bold 24px sans-serif';ctx.fillText('09 / 文字・セリフ',x+24,y+42);ctx.fillStyle='#2b1b12';ctx.font='bold 30px sans-serif';wrap(ctx,values.type,x+38,y+140,405,43,3);ctx.font='26px sans-serif';wrap(ctx,values.line==='セリフなし'?'セリフを入れない':values.line,x+38,y+310,405,38,4);
 const sx=0,sy=1440;ctx.fillStyle='#2b1b12';ctx.fillRect(sx+12,sy+12,456,42);ctx.fillStyle='#fff7e8';ctx.font='bold 24px sans-serif';ctx.fillText('10 / サイズ',sx+24,sy+42);const [,pixels,ratio]=values.size.split('｜');ctx.fillStyle='#2b1b12';ctx.font='bold 35px sans-serif';ctx.fillText(ratio||'',sx+35,sy+133);ctx.font='27px sans-serif';wrap(ctx,pixels+'px',sx+35,sy+198,410,38);ctx.font='23px sans-serif';wrap(ctx,values.size.split('｜')[0],sx+35,sy+280,410,34,3);
 ctx.fillStyle='#2b1b12';ctx.font='bold 32px sans-serif';wrap(ctx,'顔は、あなたの添付から。',540,1560,820,50,2);ctx.font='27px sans-serif';wrap(ctx,'作例は技法・場面・動作の参考。人物や構図をそのままコピーせず、選んだ条件で新しい一枚へ。',540,1660,820,45,4);
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.94));if(!blob)throw new Error('作例セットの保存に失敗しました。');
 return {file:new File([blob],'selected-style-guide.jpg',{type:'image/jpeg'}),cells};
}
export async function buildReferenceBoard(guide,refs){
 const guideURL=URL.createObjectURL(guide);const images=await Promise.all([loadImage(guideURL).finally(()=>URL.revokeObjectURL(guideURL)),...refs.map(r=>loadImage(r.url))]);
 const canvas=document.createElement('canvas');canvas.width=2560;canvas.height=1800;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff7e8';ctx.fillRect(0,0,2560,1800);
 function drawContained(img,x,y,w,h){const scale=Math.min(w/img.naturalWidth,h/img.naturalHeight),a=img.naturalWidth*scale,b=img.naturalHeight*scale;ctx.drawImage(img,x+(w-a)/2,y+(h-b)/2,a,b);}
 ctx.fillStyle='#2b1b12';ctx.font='bold 42px sans-serif';ctx.fillText('左：キャラの主参照 ／ 右：選んだ作例（顔は参考にしない）',35,65);
 ctx.fillStyle='#e8d0ae';ctx.fillRect(25,110,1060,1160);drawContained(images[1],35,120,1040,1140);ctx.fillStyle='#2b1b12';ctx.font='bold 32px sans-serif';ctx.fillText('参照1 / 同じキャラクターを保つ',40,1315);
 drawContained(images[0],1120,180,1440,1440);
 refs.slice(1).forEach((r,i)=>{const x=35+i*350;ctx.fillStyle='#e8d0ae';ctx.fillRect(x,1370,330,350);drawContained(images[i+2],x+5,1375,320,285);ctx.fillStyle='#2b1b12';ctx.font='bold 24px sans-serif';ctx.fillText('参照'+(i+2)+' / '+(r.role==='avoid'?'似せない前作':'補助参照'),x+8,1702);});
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.94));if(!blob)throw new Error('まとめ画像を保存できませんでした。');return new File([blob],'reference-board.jpg',{type:'image/jpeg'});
}
