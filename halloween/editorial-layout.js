import {formatFor} from './formats.js?v=18.0.1';
import {colorPolicy} from './palette-recipes.js?v=18.0.1';
import {colorWorlds} from './worlds.js?v=18.0.1';

const MAX_EDGE=4096;
const SERIF='"Noto Serif CJK JP", "Yu Mincho", "Hiragino Mincho ProN", Georgia, serif';
const SANS='"Noto Sans CJK JP", "Yu Gothic", "Hiragino Kaku Gothic ProN", Arial, sans-serif';
const supported=new Set(['cover','interview','spread','newspaper']);
const wordSegmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter('ja',{granularity:'word'}):null;
const escapeXML=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
const num=value=>Number(value.toFixed(6));
const basePalettes={
 '漆黒 × 琥珀 × 象牙':['#171513','#db7d20','#f4ebd4'],
 '深紅 × 黒 × 古金':['#811722','#171513','#b79538'],
 '群青 × 月白 × 銀':['#263774','#f1f5fc','#bbc5d1'],
 '紫 × 黒 × 酸性グリーン':['#623084','#171513','#d7ed26'],
 '藍墨 × 朱 × 和紙の白':['#263d51','#c54022','#ebe4d7'],
 '桃色 × 墨黒 × 真珠':['#ec92b6','#262122','#f1eaed'],
 '翡翠 × 銅 × 濃紺':['#348c75','#b87349','#142840'],
 '白 × 白銀 × 氷青':['#ffffff','#c9d3dd','#a8d2e4'],
 '秋色のブラウン × 生成り':['#76513a','#eee3cd'],
 '退色したフィルムカラー':['#a98c72','#7c9896','#ece1cc'],
 'ネオンピンク × シアン':['#ec369b','#22c6df','#101a29'],
 '原色のポップカラー':['#d33e34','#255ac0','#e8c448','#ffffff','#111111']
};

function valuesFor(plan){
 const values=Object.fromEntries((plan?.conditions||[]).filter(c=>typeof c?.key==='string'&&typeof c.value==='string').map(c=>[c.key,c.value]));
 return {...values,...(plan?.values||{})};
}
function luminance(hex){
 const parts=hex.match(/[a-f\d]{2}/gi).map(s=>parseInt(s,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 return .2126*parts[0]+.7152*parts[1]+.0722*parts[2];
}
const contrast=(a,b)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
const darken=hex=>'#'+hex.match(/[a-f\d]{2}/gi).map(s=>Math.round(parseInt(s,16)*.22).toString(16).padStart(2,'0')).join('');
function pageColors(values,notes){
 const policy=colorPolicy(values);
 const restricted={
  monochrome:['#ffffff','#111111','#111111'],
  cyanotype:['#ffffff','#123c69','#123c69'],
  'gold-black':['#090909','#d2ae55','#d2ae55'],
  'black-white-red':['#ffffff','#111111','#c94331'],
  sepia:['#eadbc4','#493420','#795334'],
  'brown-cyan':['#392725','#42bccd','#42bccd']
 }[policy.mode];
 if(restricted)return {background:restricted[0],ink:restricted[1],accent:restricted[2],allowed:policy.allowed};
 let colors=colorWorlds.find(p=>p.value===values.palette)?.colors;
 if(!colors&&Object.hasOwn(basePalettes,values.palette||''))colors=basePalettes[values.palette];
 if(!colors){colors=['#f5f2eb','#282724'];notes.push('この配色の誌面用HEX定義がないため、地色と文字には中立色を使用しました。主画像の色は変更していません。');}
 // Newspaper stock uses the lightest selected paper tone; the main scene still
 // retains its palette. Limited inks keep their explicit mode above.
 const background=(formatFor(values.design).kind==='newspaper'||values.design==='週刊誌の表紙')?[...colors].sort((a,b)=>luminance(b)-luminance(a))[0]:colors[0];
 const candidates=colors.filter(c=>/^#[a-f\d]{6}$/i.test(c)).sort((a,b)=>contrast(background,b)-contrast(background,a));
 let ink=candidates[0]||'#202020';
 if(contrast(background,ink)<4.5)ink=darken(colors[0]);
 const accent=candidates.find(c=>c!==ink&&contrast(background,c)>=4.5)||ink;
 return {background,ink,accent,allowed:policy.allowed};
}
function outputSize(value,notes){
 const match=String(value||'').match(/｜(\d+)×(\d+)｜(\d+):(\d+)$/);
 if(!match)throw new Error('組版する画像の希望寸法と縦横比を確認してください。');
 const requestedWidth=Number(match[1]),requestedHeight=Number(match[2]);
 if(!Number.isFinite(requestedWidth)||!Number.isFinite(requestedHeight)||requestedWidth<=0||requestedHeight<=0)throw new Error('画像の幅と高さは正の数で指定してください。');
 const scale=Math.min(1,MAX_EDGE/Math.max(requestedWidth,requestedHeight));
 const width=Math.max(1,Math.round(requestedWidth*scale)),height=Math.max(1,Math.round(requestedHeight*scale));
 if(scale<1)notes.push('希望寸法'+requestedWidth+'×'+requestedHeight+'pxは長辺4096pxを上限に同率縮小し、'+width+'×'+height+'pxで組版しました。');
 return {width,height};
}
function fallbackWidth(text,{fontSize}){
 let units=0;
 for(const char of Array.from(text)){
  if(/[\u0300-\u036f\ufe00-\ufe0f]/u.test(char))continue;
  units+=/\s/u.test(char)?.34:/[ilI.,:;'!|]/.test(char)?.3:/[MW@#%&]/.test(char)?.86:/[\u0000-\u00ff]/.test(char)?.57:1;
 }
 return units*fontSize;
}
function textMeasurer(callback,notes){
 const cache=new Map();let fallbackUsed=false;
 return (text,style)=>{
  const key=style.fontSize+'|'+style.fontFamily+'|'+style.fontWeight+'|'+text;
  if(cache.has(key))return cache.get(key);
  let width;
  if(typeof callback==='function')try{const result=callback(text,style);width=typeof result==='number'?result:result?.width;}catch{}
  if(!Number.isFinite(width)||width<0||(width===0&&text.length>0)){
   width=fallbackWidth(text,style);
   if(!fallbackUsed){notes.push('文字幅は一部または全部を近似計測しています。使用環境のフォントによって字幅が変わる場合があります。');fallbackUsed=true;}
  }
  if(cache.size>30000)cache.clear();cache.set(key,width);return width;
 };
}
function wrapText(text,maxWidth,style,measure){
 const lines=[];
 for(const paragraph of text.replace(/\r\n?/g,'\n').split('\n')){
  const chars=Array.from(paragraph);if(!chars.length){lines.push('');continue;}
  const wordEnds=new Set();if(wordSegmenter){let count=0;for(const part of wordSegmenter.segment(paragraph)){count+=Array.from(part.segment).length;wordEnds.add(count);}}
  let start=0;
  while(start<chars.length){
   let low=start+1,high=chars.length,end=start;
   while(low<=high){const mid=Math.floor((low+high)/2);if(measure(chars.slice(start,mid).join(''),style)<=maxWidth){end=mid;low=mid+1;}else high=mid-1;}
   if(end===start)end=start+1;
   if(end<chars.length&&end-start>2){
    if(/[、。，．！？!?）］」』】〉》]/u.test(chars[end]))end--;
    if(/[（［「『【〈《]/u.test(chars[end-1]))end--;
    if(/[A-Za-z0-9]/.test(chars[end-1])&&/[A-Za-z0-9]/.test(chars[end])){
     for(let p=end-1;p>start+Math.floor((end-start)*.45);p--)if(/[\s-]/u.test(chars[p])){end=p+1;break;}
    }
    if(wordSegmenter&&!wordEnds.has(end))for(let p=end-1;p>start+Math.floor((end-start)*.5);p--)if(wordEnds.has(p)&&!/[、。，．！？!?）］」』】〉》]/u.test(chars[p])){end=p;break;}
   }
   lines.push(chars.slice(start,end).join(''));start=end;
  }
 }
 return lines;
}
function wrapVertical(text,capacity){
 const lines=[];
 for(const paragraph of text.replace(/\r\n?/g,'\n').split('\n')){
  const chars=Array.from(paragraph);
  if(!chars.length)lines.push('');
  for(let start=0;start<chars.length;start+=capacity)lines.push(chars.slice(start,start+capacity).join(''));
 }
 return lines;
}

/** Preserve one supplied PNG/JPEG/WebP and compose only SVG layout and exact copy. */
export function renderEditorialLayout(plan,{dataUrl,artworkWidth,artworkHeight,measureText}={}){
 if(typeof dataUrl!=='string'||!/^data:image\/(?:png|jpeg|webp);base64,[a-z\d+/=\r\n]+$/i.test(dataUrl))throw new Error('組版にはPNG・JPEG・WebPの画像データが必要です。');
 const sourceWidth=Number(artworkWidth),sourceHeight=Number(artworkHeight);
 if(!Number.isFinite(sourceWidth)||!Number.isFinite(sourceHeight)||sourceWidth<=0||sourceHeight<=0)throw new Error('主画像の実際の幅と高さが必要です。');
 const values=valuesFor(plan),kind=formatFor(values.design).kind;
 if(!supported.has(kind))throw new Error('この形式は誌面組版の対象ではありません。');
 if(!Array.isArray(plan?.copy?.slots))throw new Error('組版する確定原稿がありません。');
 const notes=[],{width,height}=outputSize(values.size,notes),colors=pageColors(values,notes),measure=textMeasurer(measureText,notes);
 const slots=plan.copy.mode==='none'?[]:plan.copy.slots.map((slot,index)=>{
  if(typeof slot.role!=='string'||typeof slot.text!=='string')throw new Error('原稿の役割と本文は文字列で指定してください。');
  return {...slot,index};
 });
 const rect=(x,y,w,h)=>({x:x*width,y:y*height,width:w*width,height:h*height});
 const frames=[],assigned=new Set(),rules=[];
 const pick=test=>slots.filter(s=>!assigned.has(s.index)&&(typeof test==='string'?s.role===test:test(s))).map(s=>s.index);
 const add=(id,box,indexes,options={})=>{
  if(!indexes.length)return;
  for(const index of indexes)assigned.add(index);
  frames.push({id,...box,indexes,fontSize:width*.014,fontFamily:SERIF,fontWeight:400,align:'left',lineHeight:1.45,headingScale:1.2,gap:.7,...options});
 };
 const role=(id,box,test,options)=>add(id,box,pick(test),options);
 const remaining=(id,box,options)=>add(id,box,pick(()=>true),options);
 let imageBox,gutter=null;

 if(kind==='spread'){
  imageBox=rect(.07,.12,.34,.75);gutter=rect(.47,0,.06,1);
  role('running-head',rect(.56,.04,.4,.025),'柱',{fontSize:width*.014,align:'left',fontFamily:SANS});
  role('feature-title',rect(.56,.08,.4,.17),s=>['特集見出し','主見出し','作品タイトル','テーマ名'].includes(s.role),{fontSize:width*.07,lineHeight:1.15,fontWeight:600});
  role('lead',rect(.56,.27,.4,.075),'リード文',{fontSize:width*.015,lineHeight:1.45});
  role('author',rect(.56,.35,.4,.02),'作者名',{fontSize:width*.013,align:'right'});
  role('quote',rect(.56,.375,.4,.04),'引き抜き引用',{fontSize:width*.024,lineHeight:1.25,fontWeight:600,color:colors.accent});
  add('A',rect(.56,.44,.18,.46),[...pick('本文小見出し1'),...pick('本文1')],{sharedScale:'spread-body'});
  add('B',rect(.78,.44,.18,.46),[...pick('本文小見出し2'),...pick('本文2'),...pick('本文小見出し3'),...pick('本文3')],{sharedScale:'spread-body'});
  role('caption',rect(.07,.91,.34,.037),s=>/キャプション/.test(s.role),{fontSize:width*.011,lineHeight:1.3});
  role('folio',rect(.87,.957,.09,.023),'ノンブル',{fontSize:width*.013,align:'right'});
  remaining('additional-copy',rect(.07,.04,.34,.06),{fontSize:width*.012});
 }else if(kind==='interview'){
  role('running-head',rect(.05,.027,.59,.025),s=>s.role==='柱'||s.role==='欄名',{fontSize:width*.014,fontFamily:SANS});
  role('author',rect(.67,.027,.28,.025),'作者名',{fontSize:width*.014,align:'right'});
  role('feature-title',rect(.05,.065,.9,.067),'特集見出し',{fontSize:width*.065,lineHeight:1.1,fontWeight:600});
  role('lead',rect(.05,.14,.9,.055),'リード文',{fontSize:width*.018,lineHeight:1.4});
  if(sourceWidth>=sourceHeight){
   // Square/wide artwork is a large horizontal lead image, not a tiny inset
   // centered in a narrow portrait container.
   const imageHeight=Math.min(.5,.9*width/height*sourceHeight/sourceWidth);
   imageBox=rect(.05,.21,.9,imageHeight);
   const captionY=.21+imageHeight+.009,bodyY=captionY+.04;
   role('caption',rect(.05,captionY,.9,.03),s=>/キャプション/.test(s.role),{fontSize:width*.013});
   for(let i=1;i<=3;i++)add('interview-'+i,rect(.05+(i-1)*.31,bodyY,.28,.905-bodyY),[...pick('質問'+i),...pick('回答'+i)],{fontSize:width*.018,sharedScale:'interview-body'});
  }else{
   imageBox=rect(.05,.21,.58,.65);
   add('interview-body',rect(.67,.21,.28,.65),[...pick('質問1'),...pick('回答1'),...pick('質問2'),...pick('回答2'),...pick('質問3'),...pick('回答3')],{fontSize:width*.018,lineHeight:1.5,gap:1});
   role('caption',rect(.05,.875,.9,.027),s=>/キャプション/.test(s.role),{fontSize:width*.013});
  }
  role('quote',rect(.05,.92,.9,.045),'引き抜き引用',{fontSize:width*.032,fontWeight:600,color:colors.accent});
  role('folio',rect(.85,.972,.1,.018),'ノンブル',{fontSize:width*.013,align:'right'});
  remaining('additional-copy',rect(.05,.973,.72,.018),{fontSize:width*.011});
 }else if(kind==='cover'&&values.design==='週刊誌の表紙'){
  imageBox=rect(.17,.15,.66,.64);
  role('masthead',rect(.035,.02,.93,.105),'誌名',{fontSize:width*.14,fontWeight:900,fontFamily:SANS});
  role('label',rect(.035,.125,.93,.025),'特集ラベル',{fontSize:width*.022,fontFamily:SANS});
  role('title',rect(.80,.17,.165,.59),'主特集',{fontSize:width*.065,fontWeight:900,fontFamily:SANS,vertical:true});
  role('deck',rect(.20,.725,.58,.065),'主特集の補足',{fontSize:width*.03,fontWeight:800,fontFamily:SANS});
  const heads=pick('補助特集'),decks=pick('補助特集の補足');
  heads.forEach((index,i)=>{const vertical=i<2,x=vertical?.035:.035+((i-2)%2)*.48,y=vertical?.17+i*.30:.805+Math.floor((i-2)/2)*.079,w=vertical?.14:.45,h=vertical?.28:.074;add('weekly-feature-'+i,rect(x,y,w,h),[index,decks[i]].filter(Number.isInteger),{fontSize:width*.032,fontWeight:900,fontFamily:SANS,vertical,headingScale:1.65,gap:.12,lineHeight:1.05});});
  role('author',rect(.035,.973,.93,.018),'作者名',{fontSize:width*.016,fontFamily:SANS,align:'right'});
  remaining('additional-copy',rect(.035,.96,.60,.018),{fontSize:width*.012});
 }else if(kind==='cover'){
  const culture=values.design==='カルチャー誌の表紙';
  imageBox=culture?rect(.035,.20,.62,.67):rect(.08,.15,.84,.77);
  role('masthead',rect(.035,.02,.93,.115),'誌名',{fontSize:width*.12,fontWeight:700,lineHeight:1.05,align:'left',fontFamily:culture?SANS:SERIF});
  role('label',rect(.035,.14,.93,.025),'特集ラベル',{fontSize:width*.018,fontFamily:SANS});
  role('main-feature',rect(.06,.865,.88,.057),'主特集',{fontSize:width*.055,fontWeight:700,lineHeight:1.1});
  role('main-deck',rect(.06,.927,.88,.03),'主特集の補足',{fontSize:width*.020});
  const headlineIndexes=pick('補助特集'),deckIndexes=pick('補助特集の補足');
  for(let i=0;i<Math.max(headlineIndexes.length,deckIndexes.length);i++){
   const x=culture?.69:(i%2===0?.035:.815),y=culture?.21+i*.15:.23+Math.floor(i/2)*.28,w=culture?.275:.15,h=culture?.14:.20;
   add('cover-feature-'+(i+1),rect(x,y,w,h),[headlineIndexes[i],deckIndexes[i]].filter(Number.isInteger),{fontSize:width*.025,lineHeight:1.15,headingScale:1.5,fontFamily:culture?SANS:SERIF,vertical:!culture});
  }
  role('author',rect(.06,.968,.88,.021),'作者名',{fontSize:width*.014,align:'right'});
  remaining('additional-copy',rect(.035,.175,.93,.021),{fontSize:width*.015});
 }else if(/[\u3040-\u30ff\u3400-\u9fff]/u.test(slots.map(s=>s.text).join(''))){
  imageBox=rect(.035,.215,.36,.275);
  role('masthead',rect(.845,.025,.12,.18),'新聞題字',{fontSize:width*.053,fontWeight:700,vertical:true});
  role('feature-title',rect(.035,.025,.77,.085),'特集見出し',{fontSize:width*.055,fontWeight:700,lineHeight:1.05});
  role('lead',rect(.035,.115,.77,.065),'リード文',{fontSize:width*.019,lineHeight:1.2});
  role('author',rect(.035,.182,.77,.02),'作者名',{fontSize:width*.012,align:'right'});
  role('classification',rect(.845,.182,.12,.02),'紙面分類',{fontSize:width*.012,align:'center'});
  role('caption',rect(.035,.492,.36,.027),s=>/キャプション/.test(s.role),{fontSize:width*.010,lineHeight:1.15});
  const bodyBoxes=[rect(.62,.215,.19,.30),rect(.415,.215,.19,.30),rect(.415,.545,.395,.385)];
  for(let i=1;i<=3;i++)add('newspaper-main-'+i,bodyBoxes[i-1],[...pick('本文小見出し'+i),...pick('本文'+i)],{fontSize:width*.014,vertical:true,headingScale:1.25,gap:.35,sharedScale:'newspaper-body'});
  for(let i=1;i<=2;i++)add('newspaper-secondary-'+i,rect(.035+(i-1)*.19,.545,.175,.385),[...pick('副記事見出し'+i),...pick('副記事本文'+i)],{fontSize:width*.014,vertical:true,headingScale:1.25,gap:.35,sharedScale:'newspaper-body'});
  role('quote',rect(.845,.215,.12,.715),'引き抜き引用',{fontSize:width*.031,fontWeight:700,vertical:true});
  role('folio',rect(.845,.96,.12,.022),'ノンブル',{fontSize:width*.013,align:'right'});
  remaining('additional-copy',rect(.035,.955,.77,.027),{fontSize:width*.011});
  rules.push({x1:width*.035,y1:height*.208,x2:width*.965,y2:height*.208});
  rules.push({x1:width*.035,y1:height*.533,x2:width*.81,y2:height*.533});
  rules.push({x1:width*.825,y1:height*.215,x2:width*.825,y2:height*.93});
 }else{
  imageBox=rect(.05,.36,.36,.25);
  role('masthead',rect(.05,.035,.9,.065),'新聞題字',{fontSize:width*.059,fontWeight:700,lineHeight:1.1});
  role('feature-title',rect(.05,.12,.9,.093),'特集見出し',{fontSize:width*.042,fontWeight:700,lineHeight:1.2});
  role('lead',rect(.05,.235,.9,.075),'リード文',{fontSize:width*.016});
  role('author',rect(.05,.32,.52,.023),'作者名',{fontSize:width*.013});
  role('classification',rect(.7,.32,.25,.023),'紙面分類',{fontSize:width*.013,align:'right'});
  role('caption',rect(.05,.625,.36,.04),s=>/キャプション/.test(s.role),{fontSize:width*.01});
  for(let i=1;i<=3;i++)add('newspaper-main-'+i,rect(.45+(i-1)*.17,.36,.15,.55),[...pick('本文小見出し'+i),...pick('本文'+i)],{fontSize:width*.013,sharedScale:'newspaper-body'});
  for(let i=1;i<=2;i++)add('newspaper-secondary-'+i,rect(.05+(i-1)*.19,.69,.17,.22),[...pick('副記事見出し'+i),...pick('副記事本文'+i)],{fontSize:width*.012});
  role('quote',rect(.05,.922,.76,.037),'引き抜き引用',{fontSize:width*.019,fontWeight:600});
  role('folio',rect(.86,.96,.09,.022),'ノンブル',{fontSize:width*.013,align:'right'});
  remaining('additional-copy',rect(.05,.96,.74,.022),{fontSize:width*.01});
  rules.push({x1:width*.05,y1:height*.105,x2:width*.95,y2:height*.105});
 }

 const scale=Math.min(imageBox.width/sourceWidth,imageBox.height/sourceHeight);
 const imageWidth=sourceWidth*scale,imageHeight=sourceHeight*scale;
 const image={x:imageBox.x+(imageBox.width-imageWidth)/2,y:imageBox.y+(imageBox.height-imageHeight)/2,width:imageWidth,height:imageHeight,container:{...imageBox},sourceWidth,sourceHeight,preserveAspectRatio:'xMidYMid meet'};
 const layoutFrame=(frame,scaleFactor)=>{
  if(frame.vertical){
   let right=frame.x+frame.width,lastGap=0;const runs=[];
   for(const index of frame.indexes){
    const slot=slots[index],heading=/小見出し|^質問\d|^補助特集$|^副記事見出し/.test(slot.role);
    const fontSize=frame.fontSize*scaleFactor*(heading?frame.headingScale:1),advance=fontSize*1.15,columnWidth=fontSize*1.45;
    const capacity=Math.max(1,Math.floor((frame.height-fontSize*.3)/advance)),lines=wrapVertical(slot.text,capacity);
    const runWidth=lines.length*columnWidth,runHeight=Math.max(0,...lines.map(line=>Array.from(line).length))*advance+fontSize*.3;
    const x=right-runWidth;
    runs.push({role:slot.role,text:slot.text,slotIndex:index,frameId:frame.id,x,y:frame.y,width:runWidth,height:runHeight,fontSize,fontFamily:frame.fontFamily,fontWeight:heading?600:frame.fontWeight,lines,lineHeight:advance,align:'left',direction:'vertical-rl',columnWidth,letterSpacing:fontSize*.15,color:frame.color||(heading?colors.accent:colors.ink)});
    lastGap=frame.fontSize*scaleFactor*(heading?.3:frame.gap);right=x-lastGap;
   }
   return {runs,fits:right+lastGap>=frame.x-.00001&&runs.every(run=>run.height<=frame.height+.00001)};
  }
  let y=frame.y;const runs=[];
  for(const index of frame.indexes){
   const slot=slots[index],heading=/小見出し|^質問\d|^補助特集$|^副記事見出し/.test(slot.role);
   const fontSize=frame.fontSize*scaleFactor*(heading?frame.headingScale:1),fontWeight=heading?600:frame.fontWeight;
   const style={fontSize,fontFamily:frame.fontFamily,fontWeight};
   const lines=wrapText(slot.text,frame.width,style,measure),lineHeight=fontSize*frame.lineHeight;
   const measuredWidth=Math.max(0,...lines.map(line=>measure(line,style))),runHeight=lines.length*lineHeight;
   const x=frame.align==='right'?frame.x+frame.width-measuredWidth:frame.align==='center'?frame.x+(frame.width-measuredWidth)/2:frame.x;
   runs.push({role:slot.role,text:slot.text,slotIndex:index,frameId:frame.id,x,y,width:measuredWidth,height:runHeight,...style,lines,lineHeight,align:frame.align,color:frame.color||(heading?colors.accent:colors.ink)});
   y+=runHeight+frame.fontSize*scaleFactor*(heading?.3:frame.gap);
  }
  if(runs.length)y-=frame.fontSize*scaleFactor*(/小見出し|^質問\d|^補助特集$|^副記事見出し/.test(runs.at(-1).role)?.3:frame.gap);
  return {runs,fits:y<=frame.y+frame.height+.00001&&runs.every(run=>run.width<=frame.width+.00001)};
 };
 const scales=new Map(),shared=new Map();
 for(const frame of frames){
  let chosen=1;
  if(!layoutFrame(frame,1).fits){let low=.00001,high=1;for(let i=0;i<24;i++){const mid=(low+high)/2;if(layoutFrame(frame,mid).fits)low=mid;else high=mid;}chosen=low;}
  scales.set(frame.id,chosen);if(frame.sharedScale)shared.set(frame.sharedScale,Math.min(shared.get(frame.sharedScale)??1,chosen));
 }
 const textRuns=[],textFrames=[];
 for(const frame of frames){
  const chosen=frame.sharedScale?shared.get(frame.sharedScale):scales.get(frame.id),result=layoutFrame(frame,chosen);
  if(!result.fits)throw new Error('原稿を割り当てた文字枠へ収められませんでした。');
  if(chosen<.6)notes.push('文字枠「'+frame.id+'」は原稿を全文収めるため標準の'+Math.round(chosen*100)+'%へ縮小しました。');
  textRuns.push(...result.runs);textFrames.push({id:frame.id,x:frame.x,y:frame.y,width:frame.width,height:frame.height,roles:frame.indexes.map(i=>slots[i].role)});
 }
 const bands=values.design==='週刊誌の表紙'?frames.filter(f=>/weekly-feature|^title$/.test(f.id)).map((f,i)=>({frame:f,fill:i%2?colors.accent:colors.ink})):[];
 for(const band of bands){const ink=contrast(band.fill,colors.background)>4.5?colors.background:colors.ink;for(const run of textRuns.filter(r=>r.frameId===band.frame.id))run.color=ink;}
 const elements=['<rect x="0" y="0" width="'+width+'" height="'+height+'" fill="'+colors.background+'"/>',
  '<image x="'+num(image.x)+'" y="'+num(image.y)+'" width="'+num(image.width)+'" height="'+num(image.height)+'" preserveAspectRatio="xMidYMid meet" href="'+escapeXML(dataUrl)+'"/>'];
 for(const {frame:f,fill} of bands)elements.push('<rect x="'+num(f.x-width*.005)+'" y="'+num(f.y-height*.003)+'" width="'+num(f.width+width*.010)+'" height="'+num(f.height+height*.006)+'" fill="'+fill+'"/>');
 for(const rule of rules)elements.push('<line x1="'+num(rule.x1)+'" y1="'+num(rule.y1)+'" x2="'+num(rule.x2)+'" y2="'+num(rule.y2)+'" stroke="'+colors.ink+'" stroke-width="'+num(Math.max(.5,width*.0007))+'"/>');
 for(const run of textRuns){
  if(run.direction==='vertical-rl'){
   elements.push('<text data-role="'+escapeXML(run.role)+'" data-frame="'+escapeXML(run.frameId)+'" fill="'+run.color+'" font-family="'+escapeXML(run.fontFamily)+'" font-size="'+num(run.fontSize)+'" font-weight="'+run.fontWeight+'" writing-mode="vertical-rl" text-orientation="upright" dominant-baseline="central" letter-spacing="'+num(run.letterSpacing)+'" xml:space="preserve">'+run.lines.map((line,i)=>'<tspan x="'+num(run.x+run.width-run.columnWidth/2-i*run.columnWidth)+'" y="'+num(run.y+run.fontSize*.15)+'">'+escapeXML(line)+'</tspan>').join('')+'</text>');
   continue;
  }
  const frame=frames.find(f=>f.id===run.frameId),anchor=run.align==='right'?'end':run.align==='center'?'middle':'start';
  const x=run.align==='right'?frame.x+frame.width:run.align==='center'?frame.x+frame.width/2:frame.x;
  elements.push('<text data-role="'+escapeXML(run.role)+'" data-frame="'+escapeXML(run.frameId)+'" fill="'+run.color+'" font-family="'+escapeXML(run.fontFamily)+'" font-size="'+num(run.fontSize)+'" font-weight="'+run.fontWeight+'" text-anchor="'+anchor+'" dominant-baseline="text-before-edge" xml:space="preserve">'+run.lines.map((line,i)=>'<tspan x="'+num(x)+'" y="'+num(run.y+i*run.lineHeight)+'">'+escapeXML(line)+'</tspan>').join('')+'</text>');
 }
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+'" viewBox="0 0 '+width+' '+height+'" role="img" aria-label="'+escapeXML(values.design)+'">'+elements.join('')+'</svg>';
 return {svg,width,height,placements:{image,gutter,textFrames,textRuns},notes:[...new Set(notes)]};
}
