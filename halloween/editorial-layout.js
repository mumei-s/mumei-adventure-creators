import {formatFor} from './formats.js?v=28.4.5';
import {colorPolicy} from './palette-recipes.js?v=28.4.5';
import {colorWorlds} from './worlds.js?v=28.4.5';
import {limitedNewspaperLayout} from './format-recipes.js?v=28.4.5';
import {typographyLayoutFor} from './layout-preview-specs.js?v=28.4.5';

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

// Typography chooses the direction of each permitted manuscript role. The
// language of the text and the page design must not override that choice.
function typographyFrameFor(spec,role){
 if(!spec)return null;
 const aliases={
  '主見出し':['主見出し','宣言','見出し'],
  '作品タイトル':['作品名','短い題名'],
  'キャラクター名':['名前'],
  '作品名':['作品名','名前'],
  'テーマ名':['HALLOWEEN'],
  '作者名':['作者名','作者'],
  '主特集の補足':['主特集補足'],
  '補助特集':['特集'],
  '補助特集の補足':['補足'],
  '図版キャプション':['図版説明'],
  'リード文':['リード'],
  '紹介文':['紹介文','紹介'],
  '商品紹介':['紹介'],
  '企画紹介':['紹介'],
  '展示紹介':['紹介'],
  '物語紹介':['紹介'],
  'キャラクター紹介':['紹介'],
  '主題紹介':['紹介'],
  '主題の分類':['役柄'],
  'ブランドコピー':['補足'],
  '短い補足':['補足'],
  'クエスト':['目標'],
  '縦書きコピー':['短い一文']
 };
 const names=[role,...(aliases[role]||[])];
 if(/^本文\d+$/.test(role))names.push('本文');
 if(/^副見出し\d+$/.test(role))names.push('副見出し');
 if(/^副記事本文\d+$/.test(role))names.push('副記事');
 if(/^情報(?:見出し|本文)\d+$/.test(role))names.push('情報');
 if(/^ビリング\d+$/.test(role))names.push('制作情報');
 if(/^特徴\d+$/.test(role))names.push(spec.value==='キャラクター名鑑・役柄とスキル'?'スキル':'特徴');
 if(/^スキル\d+$/.test(role))names.push('スキル');
 if(/^見どころ\d+$/.test(role))names.push('見どころ');
 if(/^詩行\d+$/.test(role))names.push('詩の一行');
 return spec.frames.find(frame=>names.includes(frame.role))||null;
}

/** Preserve one supplied PNG/JPEG/WebP and compose only SVG layout and exact copy. */
export function renderEditorialLayout(plan,{dataUrl,artworkWidth,artworkHeight,measureText}={}){
 if(typeof dataUrl!=='string'||!/^data:image\/(?:png|jpeg|webp);base64,[a-z\d+/=\r\n]+$/i.test(dataUrl))throw new Error('組版にはPNG・JPEG・WebPの画像データが必要です。');
 const sourceWidth=Number(artworkWidth),sourceHeight=Number(artworkHeight);
 if(!Number.isFinite(sourceWidth)||!Number.isFinite(sourceHeight)||sourceWidth<=0||sourceHeight<=0)throw new Error('主画像の実際の幅と高さが必要です。');
 const values=valuesFor(plan),kind=formatFor(values.design).kind;
 const gamePackage=kind==='package'&&values.design==='ゲームのパッケージ';
 if(!supported.has(kind)&&!gamePackage)throw new Error('この形式は誌面組版の対象ではありません。');
 if(!Array.isArray(plan?.copy?.slots))throw new Error('組版する確定原稿がありません。');
 const notes=[],{width,height}=outputSize(values.size,notes),colors=pageColors(values,notes),measure=textMeasurer(measureText,notes);
 const slots=plan.copy.mode==='none'||plan.copy.authority==='none'?[]:plan.copy.slots.map((slot,index)=>{
  if(typeof slot.role!=='string'||typeof slot.text!=='string')throw new Error('原稿の役割と本文は文字列で指定してください。');
  return {...slot,index};
 });
 const selectedCopy=plan.copy.authority==='selected'||plan.copy.authority===undefined&&!!plan.copy.mode&&!['none','デザインに合わせて自動編集'].includes(plan.copy.mode);
 const typography=selectedCopy?typographyLayoutFor(values.type||plan.copy.mode):null;
 const directionFor=index=>typographyFrameFor(typography,slots[index].role)?.direction||'horizontal';
 const verticalAuthor=typographyFrameFor(typography,'作者名')?.direction==='vertical';
 const rect=(x,y,w,h)=>({x:x*width,y:y*height,width:w*width,height:h*height});
 const frames=[],assigned=new Set(),rules=[],decorations=[];
 const pick=test=>slots.filter(s=>!assigned.has(s.index)&&(typeof test==='string'?s.role===test:test(s))).map(s=>s.index);
 const add=(id,box,indexes,options={})=>{
  if(!indexes.length)return;
  for(const index of indexes)assigned.add(index);
  const directions=typography?indexes.map(directionFor):indexes.map(()=>options.vertical?'vertical':'horizontal');
  const poem=typography?.value==='詩のコピー・短い言葉を3行'&&indexes.some(index=>/^詩行\d+$/.test(slots[index].role));
  const groups=[];
  indexes.forEach((index,i)=>{
   const direction=directions[i],last=groups.at(-1);
   if(!poem&&last?.direction===direction)last.indexes.push(index);
   else groups.push({direction,indexes:[index]});
  });
  let y=box.y;
  groups.forEach((group,i)=>{
   const h=box.height/groups.length;
   frames.push({id:groups.length===1?id:id+'-direction-'+(i+1),...box,y,height:h,indexes:group.indexes,fontSize:width*.014,fontFamily:SERIF,fontWeight:400,align:'left',lineHeight:1.45,headingScale:1.2,gap:.7,...options,vertical:group.direction==='vertical',direction:group.direction,rotation:group.direction==='diagonal'?-12:0,...(poem?{maxLines:1}:{}),...(/中央揃え/.test(typography?.direction||'')?{align:'center'}:{})});
   y+=h;
  });
 };
 const role=(id,box,test,options)=>add(id,box,pick(test),options);
 const remaining=(id,box,options)=>add(id,box,pick(()=>true),options);
 let imageBox,gutter=null;
 const limitedNewspaper=kind==='newspaper'?limitedNewspaperLayout(values):null;
 const newspaperStructure=kind==='newspaper'?limitedNewspaperLayout({...values,type:'文字を一切入れない'}):null;
 // A selected manuscript replaces the design's usual article roles. Give its
 // actual blocks the main information areas instead of the incidental footer.
 const selectedParts=()=>{
  const content=pick(s=>s.role!=='作者名'),priority=index=>Number.isFinite(slots[index].priority)?slots[index].priority:2;
  const highest=Math.min(...content.map(priority));
  const headline=content.filter(index=>priority(index)===highest);
  const introductions=content.filter(index=>!headline.includes(index)&&/^(?:主特集の補足|キャッチ|商品紹介|ブランドコピー|企画紹介|展示紹介|物語紹介|世界紹介|世界観紹介|あらすじ|紹介文|短い補足|リード文|煽り文)$/.test(slots[index].role));
  const captions=content.filter(index=>!headline.includes(index)&&/キャプション/.test(slots[index].role));
  const detail=content.filter(index=>!headline.includes(index)&&!introductions.includes(index)&&!captions.includes(index)),groups=[];
  for(let i=0;i<detail.length;i++){
   const index=detail[i],next=detail[i+1],name=slots[index].role,nextName=slots[next]?.role;
   const paired=name==='補助特集'&&nextName==='補助特集の補足'||name==='補助見出し'&&nextName==='説明'||
    /^(?:情報見出し|副見出し|本文小見出し|質問)\d+$/.test(name)&&nextName===name.replace(/^情報見出し/,'情報本文').replace(/^副見出し/,'副記事本文').replace(/^本文小見出し/,'本文').replace(/^質問/,'回答');
   groups.push(paired?[index,detail[++i]]:[index]);
  }
  return {headline,introductions,captions,groups};
 };
 const groupWeight=group=>Math.max(24,group.reduce((count,index)=>count+Array.from(slots[index].text).length,0));
 const stackSelected=(prefix,box,groups,options={})=>{
  if(!groups.length)return;
  const weights=groups.map(groupWeight),total=weights.reduce((sum,n)=>sum+n,0),gap=box.height*.015,available=box.height-gap*(groups.length-1);
  let y=box.y;
  groups.forEach((indexes,i)=>{const h=available*weights[i]/total;add(prefix+'-'+(i+1),{x:box.x,y,width:box.width,height:h},indexes,{fontSize:width*.021,lineHeight:1.25,gap:.25,...options});y+=h+gap;});
 };
 const columnsSelected=(prefix,boxes,groups,options={})=>{
  const columns=boxes.map(()=>[]),weights=boxes.map(()=>0);
  for(const group of groups){const column=weights.indexOf(Math.min(...weights));columns[column].push(group);weights[column]+=groupWeight(group);}
  columns.forEach((items,i)=>stackSelected(prefix+'-column-'+(i+1),boxes[i],items,options));
 };
 const panelsSelected=(prefix,boxes,groups,options={})=>{
  const columns=boxes.map(()=>[]),weights=boxes.map(()=>0),capacities=boxes.map(box=>box.width*box.height);
  for(const group of groups){const loads=weights.map((weight,i)=>weight/capacities[i]),column=loads.indexOf(Math.min(...loads));columns[column].push(group);weights[column]+=groupWeight(group);}
  columns.forEach((items,i)=>stackSelected(prefix+'-panel-'+(i+1),boxes[i],items,options));
 };

 if(values.design==='ゴシック雑誌の表紙'){
  imageBox=rect(.09,.26,.49,.61);
  const parts=selectedParts(),vertical=parts.headline.some(index=>directionFor(index)==='vertical');
  add(selectedCopy?'selected-headline':'masthead',vertical?rect(.82,.08,.13,.72):rect(.68,.08,.27,.16),parts.headline,{fontSize:width*.055,fontWeight:700,lineHeight:1.1,maxColumns:vertical?3:undefined});
  const infoWidth=vertical?.12:.27,information=[...parts.introductions.map(index=>[index]),...parts.groups];
  stackSelected(selectedCopy?'selected-detail':'gothic-information',rect(.68,.33,infoWidth,.47),information,{fontSize:width*.022,lineHeight:1.25,sharedScale:'gothic-information'});
  add('gothic-caption',rect(.68,.84,.27,.055),parts.captions,{fontSize:width*.013,lineHeight:1.1});
  role(selectedCopy?'selected-author':'author',rect(.09,.91,.49,.04),'作者名',{fontSize:width*.016,align:'left'});
  const p=(x,y)=>num(x*width)+' '+num(y*height);
  decorations.push('<path data-layout-feature="gothic-arch" d="M '+p(.075,.89)+' V '+num(.30*height)+' Q '+p(.075,.225)+' '+p(.335,.18)+' Q '+p(.595,.225)+' '+p(.595,.30)+' V '+num(.89*height)+' Z" fill="none" stroke="'+colors.ink+'" stroke-width="'+num(Math.max(.5,width*.0012))+'"/>');
  rules.push({x1:width*.65,y1:height*.07,x2:width*.65,y2:height*.90});
 }else if(gamePackage){
  imageBox=rect(.05,.21,.90,.45);
  const parts=selectedParts(),vertical=parts.headline.some(index=>directionFor(index)==='vertical');
  const left=rect(.05,.72,.58,.19),right=rect(.68,.72,.27,.19),information=[...parts.introductions.map(index=>[index]),...parts.groups,...parts.captions.map(index=>[index])];
  add(selectedCopy?'selected-headline':'game-title',rect(.05,.05,.90,.12),parts.headline,{fontSize:width*.065,fontWeight:700,lineHeight:1.1,maxColumns:vertical?3:undefined});
  const authorInPanel=verticalAuthor||parts.groups.length===0;
  panelsSelected(selectedCopy?'selected-detail':'game-information',authorInPanel?[left]:[left,right],information,{fontSize:width*.023,lineHeight:1.25,sharedScale:'game-information'});
  role(selectedCopy?'selected-author':'author',authorInPanel?rect(.70,.76,.23,.11):rect(.05,.933,.90,.015),'作者名',{fontSize:width*.018,align:'left'});
  for(const [name,box] of [['game-left-information',left],['game-right-information',right]])decorations.push('<rect data-layout-region="'+name+'" x="'+num(box.x)+'" y="'+num(box.y)+'" width="'+num(box.width)+'" height="'+num(box.height)+'" fill="none" stroke="'+colors.ink+'" stroke-width="'+num(Math.max(.5,width*.0007))+'"/>');
  rules.push({x1:width*.05,y1:height*.70,x2:width*.95,y2:height*.70},{x1:width*.65,y1:height*.72,x2:width*.65,y2:height*.91});
 }else if(selectedCopy&&kind!=='newspaper'){
  const parts=selectedParts(),vertical=parts.headline.some(index=>directionFor(index)==='vertical');
  if(kind==='spread'){
   imageBox=rect(.07,.12,.34,.75);gutter=rect(.47,0,.06,1);
   add('selected-headline',vertical?rect(.84,.08,.12,.79):rect(.56,.08,.4,.17),parts.headline,{fontSize:width*.04,fontWeight:600,lineHeight:1.15,vertical,maxColumns:vertical?3:undefined});
   add('selected-introduction',rect(.56,.27,vertical?.25:.4,.14),parts.introductions,{fontSize:width*.021,lineHeight:1.3,gap:.3});
   columnsSelected('selected-detail',vertical?[rect(.56,.44,.11,.46),rect(.69,.44,.12,.46)]:[rect(.56,.44,.18,.46),rect(.78,.44,.18,.46)],parts.groups,{sharedScale:'selected-detail'});
   add('selected-caption',rect(.07,.91,.34,.037),parts.captions,{fontSize:width*.013,lineHeight:1.3});
   role('selected-author',verticalAuthor?rect(.88,.925,.075,.07):rect(.56,plan.copy.limited?.35:.95,.4,.025),'作者名',{fontSize:width*.016,align:'right'});
  }else if(kind==='interview'){
   imageBox=rect(.05,.22,.90,.34);
   const verticalIntroductions=parts.introductions.filter(index=>directionFor(index)==='vertical'),reserveRight=vertical||verticalIntroductions.length>0;
   add('selected-headline',vertical?rect(.67,.64,.28,.26):rect(.05,.05,.90,.08),parts.headline,{fontSize:width*.05,fontWeight:600,lineHeight:1.1,maxColumns:vertical?3:undefined});
   add('selected-introduction',rect(.05,.15,.90,.05),parts.introductions.filter(index=>directionFor(index)!=='vertical'),{fontSize:width*.021,lineHeight:1.25,gap:.25});
   add('selected-side-copy',rect(.67,.64,.28,.26),verticalIntroductions,{fontSize:width*.034,fontWeight:600,maxColumns:3});
   columnsSelected('selected-detail',[rect(.05,.64,.28,.26),rect(.36,.64,.28,.26),...(!reserveRight?[rect(.67,.64,.28,.26)]:[])],parts.groups,{sharedScale:'selected-detail'});
   add('selected-caption',rect(.05,.57,.90,.03),parts.captions,{fontSize:width*.013,lineHeight:1.25});
   role('selected-author',verticalAuthor?rect(.05,.915,.90,.035):rect(.67,.925,.28,.025),'作者名',{fontSize:width*.016,align:'right'});
  }else{
   const weekly=values.design==='週刊誌の表紙',culture=values.design==='カルチャー誌の表紙';
   imageBox=weekly?rect(.17,.15,.66,.64):culture?rect(.035,.20,.62,.67):rect(.08,.15,.84,.77);
   const headlineBox=vertical?(weekly?rect(.035,.17,.125,.59):culture?rect(.69,.21,.275,.67):rect(.035,.21,.15,.62)):rect(.035,.02,.93,weekly?.105:.115);
   add('selected-headline',headlineBox,parts.headline,{fontSize:width*.065,fontWeight:weekly?900:700,fontFamily:weekly||culture?SANS:SERIF,lineHeight:1.1,vertical,maxColumns:vertical?3:undefined});
   add('selected-introduction',weekly?rect(.035,.805,.93,verticalAuthor?.12:.14):culture?rect(.035,.90,verticalAuthor?.84:.93,.055):rect(.06,.855,.88,verticalAuthor?.07:.10),parts.introductions,{fontSize:width*.022,lineHeight:1.25,gap:.25});
   if(culture)stackSelected('selected-detail',rect(.69,.21,.275,.67),parts.groups,{sharedScale:'selected-detail'});
   else columnsSelected('selected-detail',weekly?[rect(.035,.17,.125,.59),rect(.845,.17,.12,.59)]:[rect(.035,.21,.15,.62),rect(.815,.21,.15,.62)],parts.groups,{sharedScale:'selected-detail',fontFamily:weekly?SANS:SERIF});
   // A caption is supplied copy, not permission to invent a second picture.
   add('selected-caption',rect(.035,weekly?.765:culture?.88:.835,.93,culture?.015:.019),parts.captions,{fontSize:width*.013,lineHeight:1.1});
   role('selected-author',verticalAuthor?rect(.9,.93,.065,.065):rect(.035,.968,.93,.021),'作者名',{fontSize:width*.016,align:'right'});
  }
 }else if(kind==='spread'){
  imageBox=rect(.07,.12,.34,.75);gutter=rect(.47,0,.06,1);
  role('running-head',rect(.56,.04,.4,.025),'柱',{fontSize:width*.014,align:'left',fontFamily:SANS});
  role('feature-title',rect(.56,.08,.4,.17),s=>['特集見出し','主見出し','作品タイトル','テーマ名'].includes(s.role),{fontSize:width*.04,lineHeight:1.15,fontWeight:600});
  role('lead',rect(.56,.27,.4,.075),'リード文',{fontSize:width*.015,lineHeight:1.45});
  role('author',rect(.56,.35,.4,.02),'作者名',{fontSize:width*.013,align:'right'});
  role('quote',rect(.56,.375,.4,.04),'引き抜き引用',{fontSize:width*.024,lineHeight:1.25,fontWeight:600,color:colors.accent});
  add('A',rect(.56,.44,.18,.46),[...pick('本文小見出し1'),...pick('本文1')],{sharedScale:'spread-body'});
  add('B',rect(.78,.44,.18,.46),[...pick('本文小見出し2'),...pick('本文2'),...pick('本文小見出し3'),...pick('本文3')],{sharedScale:'spread-body'});
  role('caption',rect(.07,.91,.34,.037),s=>/キャプション/.test(s.role),{fontSize:width*.011,lineHeight:1.3});
  role('folio',rect(.87,.957,.09,.023),'ノンブル',{fontSize:width*.013,align:'right'});
  remaining('additional-copy',rect(.07,.04,.34,.06),{fontSize:width*.012});
 }else if(kind==='interview'){
  imageBox=rect(.05,.22,.90,.34);
  role('feature-title',rect(.05,.05,.90,.08),'特集見出し',{fontSize:width*.065,lineHeight:1.1,fontWeight:600});
  role('lead',rect(.05,.15,.90,.05),'リード文',{fontSize:width*.018,lineHeight:1.4});
  role('caption',rect(.05,.57,.90,.03),s=>/キャプション/.test(s.role),{fontSize:width*.013});
  for(let i=1;i<=3;i++)add('interview-'+i,rect(.05+(i-1)*.31,.64,.28,.26),[...pick('質問'+i),...pick('回答'+i)],{fontSize:width*.018,sharedScale:'interview-body'});
  role('quote',rect(.05,.605,.90,.025),'引き抜き引用',{fontSize:width*.023,fontWeight:600,color:colors.accent});
  role('running-head',rect(.05,.915,.55,.035),s=>s.role==='柱'||s.role==='欄名',{fontSize:width*.012,fontFamily:SANS,lineHeight:1.25});
  role('author',rect(.67,.925,.28,.025),'作者名',{fontSize:width*.014,align:'right'});
  role('folio',rect(.85,.965,.1,.015),'ノンブル',{fontSize:width*.013,align:'right'});
  remaining('additional-copy',rect(.05,.965,.72,.015),{fontSize:width*.011});
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
 }else if(limitedNewspaper){
  const box=limitedNewspaper.imageBox,header=limitedNewspaper.headerBox;
  imageBox=rect(box.x,box.y,box.width,box.height);
  add('newspaper-limited-header',rect(header.x,header.y,header.width,header.height),pick(()=>true),{fontSize:Math.min(width*.04,height*.05),fontWeight:700,headingScale:1,lineHeight:1.1,gap:.2});
  rules.push(...limitedNewspaper.rules.map(rule=>({x1:width*rule.x1,y1:height*rule.y1,x2:width*rule.x2,y2:height*rule.y2})));
 }else if(kind==='newspaper'&&plan.copy.roleScoped){
  // Explicit advertising/story roles retain a newspaper grid; they must not
  // fall into the tiny catch-all footer intended for incidental extra copy.
  imageBox=rect(.06,.24,.57,.54);
  const verticalCopy=typography?.frames.some(frame=>frame.size==='large'&&frame.direction==='vertical');
  const headlineRoles=new Set(['主見出し','作品名','企画名','作品タイトル','キャラクター名','縦書きコピー','主語句']);
  add('newspaper-selected-headline',verticalCopy?rect(.825,.24,.125,.54):rect(.05,.05,.90,.075),pick(s=>headlineRoles.has(s.role)),{fontSize:width*.048,fontWeight:700,lineHeight:1.12,vertical:verticalCopy,maxColumns:verticalCopy?3:undefined});
  const introductions=pick(s=>/紹介|キャッチ|煽り文|役柄|分類/.test(s.role));
  add('newspaper-selected-side-copy',rect(.675,.24,.12,.54),introductions.filter(index=>directionFor(index)==='vertical'),{fontSize:width*.029,lineHeight:1.25});
  add('newspaper-selected-introduction',rect(.05,.135,.9,.05),introductions.filter(index=>directionFor(index)!=='vertical'),{fontSize:width*.021,lineHeight:1.25});
  const bodyIndexes=pick(s=>s.role!=='作者名'&&!/キャプション/.test(s.role));
  const count=Math.max(1,bodyIndexes.length),gap=.035,boxWidth=(.90-gap*(count-1))/count;
  const poem=typography?.value==='詩のコピー・短い言葉を3行';
  bodyIndexes.forEach((index,i)=>add('newspaper-selected-detail-'+(i+1),poem?rect(.05,.845+i*.08/count,.90,.08/count):rect(.05+(directionFor(index)==='vertical'?count-1-i:i)*(boxWidth+gap),.845,boxWidth,.08),[index],{fontSize:width*.023,lineHeight:1.2,sharedScale:'newspaper-selected-detail',...(poem?{maxLines:1}:{})}));
  role('author',verticalAuthor?rect(.06,.835,.075,.11):rect(.05,.933,.90,.015),'作者名',{fontSize:width*.016,align:'right'});
  remaining('newspaper-selected-remainder',rect(.06,.785,.57,.014),{fontSize:width*.013,lineHeight:1.1});
  rules.push(...newspaperStructure.rules.map(rule=>({x1:width*rule.x1,y1:height*rule.y1,x2:width*rule.x2,y2:height*rule.y2})));
 }else if(selectedCopy){
  imageBox=rect(.06,.24,.57,.54);
  const parts=selectedParts(),shortColumns=[rect(.05,.845,.28,.08),rect(.365,.845,.28,.08),rect(.68,.845,.27,.08)],articleColumns=[rect(.675,.24,.12,.54),rect(.825,.24,.125,.54),...shortColumns];
  const verticalHeadline=parts.headline.some(index=>directionFor(index)==='vertical');
  add('newspaper-selected-headline',verticalHeadline?rect(.825,.24,.125,.54):rect(.05,.05,.90,.075),parts.headline,{fontSize:width*.048,fontWeight:700,lineHeight:1.12});
  add('newspaper-selected-introduction',rect(.05,.135,.90,.05),parts.introductions,{fontSize:width*.021,lineHeight:1.25,gap:.25});
  columnsSelected('newspaper-selected-detail',values.type==='広告チラシ風・情報をたっぷり'?shortColumns:articleColumns,parts.groups,{sharedScale:'newspaper-selected-detail',fontSize:width*.018});
  add('newspaper-selected-caption',rect(.06,.785,.57,.014),parts.captions,{fontSize:width*.013,lineHeight:1.1});
  role('author',verticalAuthor?rect(.06,.835,.075,.11):rect(.05,.933,.90,.015),'作者名',{fontSize:width*.016,align:'right'});
  rules.push(...newspaperStructure.rules.map(rule=>({x1:width*rule.x1,y1:height*rule.y1,x2:width*rule.x2,y2:height*rule.y2})));
 }else if(/[\u3040-\u30ff\u3400-\u9fff]/u.test(slots.map(s=>s.text).join(''))){
  imageBox=rect(.06,.24,.57,.54);
  role('masthead',rect(.83,.05,.12,.115),'新聞題字',{fontSize:width*.053,fontWeight:700,vertical:true});
  role('feature-title',rect(.05,.05,.75,.075),'特集見出し',{fontSize:width*.055,fontWeight:700,lineHeight:1.05});
  role('lead',rect(.05,.135,.75,.065),'リード文',{fontSize:width*.019,lineHeight:1.2});
  role('author',rect(.05,.933,.75,.015),'作者名',{fontSize:width*.012,align:'right'});
  role('classification',rect(.83,.17,.12,.015),'紙面分類',{fontSize:width*.012,align:'center'});
  role('caption',rect(.06,.785,.57,.014),s=>/キャプション/.test(s.role),{fontSize:width*.010,lineHeight:1.15});
  const bodyBoxes=[rect(.825,.24,.125,.54),rect(.675,.24,.12,.54),rect(.68,.845,.27,.08)];
  for(let i=1;i<=3;i++)add('newspaper-main-'+i,bodyBoxes[i-1],[...pick('本文小見出し'+i),...pick('本文'+i)],{fontSize:width*.014,vertical:true,headingScale:1.25,gap:.35,sharedScale:'newspaper-body'});
  for(let i=1;i<=2;i++)add('newspaper-secondary-'+i,rect(.05+(i-1)*.315,.845,.28,.08),[...pick('副記事見出し'+i),...pick('副記事本文'+i)],{fontSize:width*.014,vertical:true,headingScale:1.25,gap:.35,sharedScale:'newspaper-body'});
  role('quote',rect(.05,.205,.90,.022),'引き抜き引用',{fontSize:width*.019,fontWeight:700});
  role('folio',rect(.83,.933,.12,.015),'ノンブル',{fontSize:width*.013,align:'right'});
  remaining('additional-copy',rect(.05,.95,.90,.015),{fontSize:width*.011});
  rules.push(...newspaperStructure.rules.map(rule=>({x1:width*rule.x1,y1:height*rule.y1,x2:width*rule.x2,y2:height*rule.y2})));
 }else{
  imageBox=rect(.06,.24,.57,.54);
  role('masthead',rect(.05,.05,.9,.055),'新聞題字',{fontSize:width*.059,fontWeight:700,lineHeight:1.1});
  role('feature-title',rect(.05,.115,.9,.05),'特集見出し',{fontSize:width*.042,fontWeight:700,lineHeight:1.2});
  role('lead',rect(.05,.205,.9,.022),'リード文',{fontSize:width*.016});
  role('author',rect(.05,.933,.52,.015),'作者名',{fontSize:width*.013});
  role('classification',rect(.70,.17,.25,.015),'紙面分類',{fontSize:width*.013,align:'right'});
  role('caption',rect(.06,.785,.57,.014),s=>/キャプション/.test(s.role),{fontSize:width*.01});
  const bodyBoxes=[rect(.675,.24,.12,.54),rect(.825,.24,.125,.54),rect(.68,.845,.27,.08)];
  for(let i=1;i<=3;i++)add('newspaper-main-'+i,bodyBoxes[i-1],[...pick('本文小見出し'+i),...pick('本文'+i)],{fontSize:width*.013,sharedScale:'newspaper-body'});
  for(let i=1;i<=2;i++)add('newspaper-secondary-'+i,rect(.05+(i-1)*.315,.845,.28,.08),[...pick('副記事見出し'+i),...pick('副記事本文'+i)],{fontSize:width*.012});
  role('quote',rect(.05,.17,.62,.015),'引き抜き引用',{fontSize:width*.019,fontWeight:600});
  role('folio',rect(.86,.933,.09,.015),'ノンブル',{fontSize:width*.013,align:'right'});
  remaining('additional-copy',rect(.05,.95,.90,.015),{fontSize:width*.01});
  rules.push(...newspaperStructure.rules.map(rule=>({x1:width*rule.x1,y1:height*rule.y1,x2:width*rule.x2,y2:height*rule.y2})));
 }

 const scale=Math.min(imageBox.width/sourceWidth,imageBox.height/sourceHeight);
 const imageWidth=sourceWidth*scale,imageHeight=sourceHeight*scale;
 const image={x:imageBox.x+(imageBox.width-imageWidth)/2,y:imageBox.y+(imageBox.height-imageHeight)/2,width:imageWidth,height:imageHeight,container:{...imageBox},sourceWidth,sourceHeight,preserveAspectRatio:'xMidYMid meet'};
 const headingRole=role=>/小見出し|^質問\d|^補助(?:特集|見出し)$|^(?:副記事見出し|副見出し|情報見出し)\d/.test(role);
 const layoutFrame=(frame,scaleFactor)=>{
  if(frame.vertical){
   let right=frame.x+frame.width,lastGap=0;const runs=[];
   for(const index of frame.indexes){
    const slot=slots[index],heading=headingRole(slot.role);
    const fontSize=frame.fontSize*scaleFactor*(heading?frame.headingScale:1),advance=fontSize*1.15,columnWidth=fontSize*1.45;
    const capacity=Math.max(1,Math.floor((frame.height-fontSize*.3)/advance)),lines=wrapVertical(slot.text,capacity);
    const runWidth=lines.length*columnWidth,runHeight=Math.max(0,...lines.map(line=>Array.from(line).length))*advance+fontSize*.3;
    const x=right-runWidth;
    runs.push({role:slot.role,text:slot.text,slotIndex:index,frameId:frame.id,x,y:frame.y,width:runWidth,height:runHeight,fontSize,fontFamily:frame.fontFamily,fontWeight:heading?600:frame.fontWeight,lines,lineHeight:advance,align:'left',direction:'vertical-rl',columnWidth,letterSpacing:fontSize*.15,color:frame.color||(heading?colors.accent:colors.ink)});
    lastGap=frame.fontSize*scaleFactor*(heading?.3:frame.gap);right=x-lastGap;
   }
   return {runs,fits:right+lastGap>=frame.x-.00001&&runs.every(run=>run.height<=frame.height+.00001&&(!frame.maxColumns||run.lines.length<=frame.maxColumns))};
  }
  let y=frame.y;const runs=[];
  for(const index of frame.indexes){
   const slot=slots[index],heading=headingRole(slot.role);
   const fontSize=frame.fontSize*scaleFactor*(heading?frame.headingScale:1),fontWeight=heading?600:frame.fontWeight;
   const style={fontSize,fontFamily:frame.fontFamily,fontWeight};
   const lines=wrapText(slot.text,frame.width,style,measure),lineHeight=fontSize*frame.lineHeight;
   const measuredWidth=Math.max(0,...lines.map(line=>measure(line,style))),runHeight=lines.length*lineHeight;
   let x=frame.align==='right'?frame.x+frame.width-measuredWidth:frame.align==='center'?frame.x+(frame.width-measuredWidth)/2:frame.x;
   const run={role:slot.role,text:slot.text,slotIndex:index,frameId:frame.id,x,y,width:measuredWidth,height:runHeight,...style,lines,lineHeight,align:frame.align,direction:'horizontal',color:frame.color||(heading?colors.accent:colors.ink)};
   if(frame.rotation){
    const radians=Math.abs(frame.rotation)*Math.PI/180,rotatedWidth=measuredWidth*Math.cos(radians)+runHeight*Math.sin(radians),rotatedHeight=measuredWidth*Math.sin(radians)+runHeight*Math.cos(radians);
    // Rotate only the name/copy, around its own centre. Reserve its actual
    // rotated bounds so it cannot escape the chosen information frame.
    x=frame.align==='right'?frame.x+frame.width-rotatedWidth:frame.align==='center'?frame.x+(frame.width-rotatedWidth)/2:frame.x;
    Object.assign(run,{x,width:rotatedWidth,height:rotatedHeight,direction:'diagonal',rotation:frame.rotation,rotationX:x+rotatedWidth/2,rotationY:y+rotatedHeight/2,glyphX:x+(rotatedWidth-measuredWidth)/2,glyphY:y+(rotatedHeight-runHeight)/2,glyphWidth:measuredWidth});
   }
   runs.push(run);
   y+=run.height+frame.fontSize*scaleFactor*(heading?.3:frame.gap);
  }
  if(runs.length)y-=frame.fontSize*scaleFactor*(headingRole(runs.at(-1).role)?.3:frame.gap);
  return {runs,fits:y<=frame.y+frame.height+.00001&&runs.every(run=>run.width<=frame.width+.00001&&(!frame.maxLines||run.lines.length<=frame.maxLines))};
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
 elements.push(...decorations);
 for(const {frame:f,fill} of bands)elements.push('<rect x="'+num(f.x-width*.005)+'" y="'+num(f.y-height*.003)+'" width="'+num(f.width+width*.010)+'" height="'+num(f.height+height*.006)+'" fill="'+fill+'"/>');
 for(const rule of rules)elements.push('<line x1="'+num(rule.x1)+'" y1="'+num(rule.y1)+'" x2="'+num(rule.x2)+'" y2="'+num(rule.y2)+'" stroke="'+colors.ink+'" stroke-width="'+num(Math.max(.5,width*.0007))+'"/>');
 // A selected horizontal copy block may span several structural columns.
 // Keep the outer grid visible without drawing rules through its characters.
 if(kind==='newspaper'&&!limitedNewspaper)for(const frame of textFrames)elements.push('<rect data-copy-background="'+escapeXML(frame.id)+'" x="'+num(frame.x)+'" y="'+num(frame.y)+'" width="'+num(frame.width)+'" height="'+num(frame.height)+'" fill="'+colors.background+'"/>');
 for(const run of textRuns){
  if(run.direction==='vertical-rl'){
   elements.push('<text data-role="'+escapeXML(run.role)+'" data-frame="'+escapeXML(run.frameId)+'" fill="'+run.color+'" font-family="'+escapeXML(run.fontFamily)+'" font-size="'+num(run.fontSize)+'" font-weight="'+run.fontWeight+'" writing-mode="vertical-rl" text-orientation="upright" dominant-baseline="central" letter-spacing="'+num(run.letterSpacing)+'" xml:space="preserve">'+run.lines.map((line,i)=>'<tspan x="'+num(run.x+run.width-run.columnWidth/2-i*run.columnWidth)+'" y="'+num(run.y+run.fontSize*.15)+'">'+escapeXML(line)+'</tspan>').join('')+'</text>');
   continue;
  }
  const frame=frames.find(f=>f.id===run.frameId),anchor=run.align==='right'?'end':run.align==='center'?'middle':'start';
  const x=run.direction==='diagonal'?run.glyphX+(run.align==='right'?run.glyphWidth:run.align==='center'?run.glyphWidth/2:0):run.align==='right'?frame.x+frame.width:run.align==='center'?frame.x+frame.width/2:frame.x;
  const transform=run.direction==='diagonal'?' transform="rotate('+num(run.rotation)+' '+num(run.rotationX)+' '+num(run.rotationY)+')"':'';
  elements.push('<text data-role="'+escapeXML(run.role)+'" data-frame="'+escapeXML(run.frameId)+'" data-direction="'+run.direction+'"'+transform+' fill="'+run.color+'" font-family="'+escapeXML(run.fontFamily)+'" font-size="'+num(run.fontSize)+'" font-weight="'+run.fontWeight+'" text-anchor="'+anchor+'" dominant-baseline="text-before-edge" xml:space="preserve">'+run.lines.map((line,i)=>'<tspan x="'+num(x)+'" y="'+num((run.glyphY??run.y)+i*run.lineHeight)+'">'+escapeXML(line)+'</tspan>').join('')+'</text>');
 }
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+'" viewBox="0 0 '+width+' '+height+'" role="img" aria-label="'+escapeXML(values.design)+'">'+elements.join('')+'</svg>';
 return {svg,width,height,placements:{image,gutter,textFrames,textRuns},notes:[...new Set(notes)]};
}
