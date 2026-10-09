import fs from 'node:fs';
import {designLayoutValues,designLayoutFor,typographyLayoutValues,typographyLayoutFor,manuscriptFrameBounds} from '../layout-preview-specs.js?v=28.4.6';
const root=new URL('../',import.meta.url),W=1000,H=1400;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const ink='#172638',imageFill='#d3e0ea',imageLine='#6b899f',copyFill='#f5d8a1',copyInk='#49321b',paper='#fffdf7';
const rect=(x,y,w,h,fill,stroke='none',extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" ${extra}/>`;
const path=(d,color=imageLine,width=4,extra='')=>`<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" ${extra}/>`;
const text=(value,x,y,size=36,extra='',fill=ink)=>`<text x="${x}" y="${y}" font-size="${size}" font-family="Noto Sans CJK JP,Arial,sans-serif" fill="${fill}" ${extra}>${esc(value)}</text>`;
function frame(f,index,typeOnly=false){
 const {x,y,w,h,direction,size,role}=f,a=x*10,b=y*14,c=w*10,d=h*14,vertical=direction==='vertical';
 const rotate=direction==='diagonal'?` transform="rotate(${f.rotation??-12} ${a+c/2} ${b+d/2})"`:'';
 const s=size==='large'?58:size==='medium'?42:32;
 const background=rect(a,b,c,d,copyFill,'#9b7840','rx="4"');
 const words=typeOnly?role:(size==='large'?role:role.replace(/左右/,'').replace('図版説明','短い説明'));
 const tx=vertical?a+c/2:a+Math.min(c*.07,22),ty=vertical?b+18:b+d*.63;
 const glyphs=Array.from(words).length;
 const labelSize=Math.min(s,vertical?c*.65:d*.6,vertical?(d-30)/Math.max(1,glyphs):c*.86/Math.max(1,glyphs));
 const label=text(words,tx,ty,labelSize,vertical?'writing-mode="vertical-rl" text-orientation="upright" text-anchor="start"':'',copyInk);
 return `<g data-frame="${index}" data-direction="${direction}" data-manuscript-role="${esc(role)}"${rotate}>${background}${label}</g>`;
}
function imagePlane(box,kind){
 const [x,y,w,h]=box.map((v,i)=>v*(i%2?14:10));
 let out=rect(x,y,w,h,imageFill,imageLine);
 if(['art','fantasy-landscape','landscape','film-scene','key-visual','wallpaper'].includes(kind)){
  // Plane layers demonstrate reserved depth/composition without a model or setting.
  out+=path(`M${x} ${y+h*.63}L${x+w} ${y+h*.63}`,imageLine,3);
  out+=path(`M${x} ${y+h}L${x+w*.42} ${y+h*.63}M${x+w} ${y+h}L${x+w*.62} ${y+h*.63}`,imageLine,5);
 }else out+=path(`M${x+20} ${y+20}L${x+w-20} ${y+h-20}M${x+w-20} ${y+20}L${x+20} ${y+h-20}`,imageLine,2,'stroke-dasharray="9 8"');
 return `<g data-role="single-main-image">${out}</g>`;
}
function ornaments(s){
 const o=s.ornament;
 if(o==='weekly-bands')return rect(35,305,165,745,'none',ink)+rect(800,305,165,745,'none',ink)+rect(40,1090,920,230,'none',ink);
 if(o==='gothic-arch')return `<g data-role="gothic-arch">${path('M75 1246V420Q75 315 335 252Q595 315 595 420V1246Z',ink,7)+path('M650 98V1260',ink,3)}</g>`;
 if(o==='game-panels')return `<g data-role="split-information-panels">${path('M50 980H950M650 1008V1274',ink,4)+rect(50,1008,580,266,'none',ink)+rect(680,1008,270,266,'none',ink)}</g>`;
 if(o==='zine-papers')return rect(50,190,900,30,'none',ink)+path('M80 310L60 1120L170 1210M840 1210L930 350',ink,4);
 if(o==='gutter')return rect(470,0,60,1400,'#f7f4e9')+path('M470 0V1400M530 0V1400','#bdb7a9',2,'stroke-dasharray="14 12"');
 if(o==='newspaper-rules')return path('M50 266H950M50 1134H950M650 300V1120M805 300V1120M200 1170V1340M350 1170V1340M500 1170V1340M650 1170V1340M800 1170V1340',ink,3);
 if(o==='annotation-lines')return path('M170 515L250 515L350 580M830 830L750 830L640 760',ink,3);
 if(o==='novel-obi')return rect(0,1160,1000,240,'none',ink);
 if(o==='stage-sides')return rect(60,230,60,890,'#c1cbd0')+rect(880,230,60,890,'#c1cbd0')+path('M130 1130H850',ink,7);
 if(o==='swiss-grid')return [0,1,2,3,4,5,6].map(i=>path(`M${70+i*143.3} 40V1360`,'#bdc8cc',2,'stroke-dasharray="12 10"')).join('');
 if(o==='bauhaus-shapes')return rect(65,75,85,955,'#b9c4cc')+`<circle cx="680" cy="275" r="135" fill="none" stroke="${ink}" stroke-width="7"/>`+path('M200 990L930 450',ink,6);
 if(o==='deco-steps')return [0,1,2,3].map(i=>path(`M${55+i*30} ${175+i*40}V${1300-i*35}H${945-i*30}V${175+i*40}`,ink,i?2:5)).join('');
 if(o==='nouveau-curve')return path('M175 1230C30 1000 270 855 120 600C20 420 60 150 250 180',ink,8);
 if(o==='psychedelic-bands')return [0,1,2,3].map(i=>`<ellipse cx="505" cy="755" rx="${430-i*45}" ry="${590-i*58}" fill="none" stroke="${i%2?'#9ab4c6':'#698ca4'}" stroke-width="16"/>`).join('');
 if(o==='punk-cuts')return path('M30 300L850 240M95 1240L940 1295M75 1160L180 1320',ink,8);
 if(o==='key-direction')return path('M165 1170C310 770 340 520 495 380M670 300L800 240L750 365',ink,5)+rect(620,370,310,615,'none',imageLine,'stroke-dasharray="13 12"');
 if(o==='landscape-depth')return path('M0 1050L185 890L375 1040L615 970L1000 1160M0 690L350 430L600 720L810 505L1000 700',imageLine,8);
 if(o==='scene-open-space')return rect(70,700,210,480,'none',ink,'stroke-dasharray="12 10"')+path('M410 930H890M825 890L890 930L825 970',ink,5);
 if(o==='soft-edges')return path('M70 375V1150M915 375V1150',paper,35,'stroke-dasharray="24 35"');
 if(o==='scroll-rolls')return rect(45,465,27,520,'#879ca8')+rect(930,465,27,520,'#879ca8')+path('M25 445H90M910 445H975M25 1000H90M910 1000H975',ink,6);
 if(o==='screen-folds')return [1,2,3,4].map(i=>path(`M${50+i*180} 315V1160`,ink,4)).join('')+path('M50 1160H950',ink,9);
 if(o==='hanging-mount')return rect(95,35,810,1285,'none',imageLine)+path('M75 35H925M75 1340H925',ink,15);
 if(o==='tarot-frame')return rect(40,30,920,1340,'none',ink)+rect(75,65,850,1270,'none',imageLine);
 if(o==='card-lines')return rect(40,35,920,1330,'none',ink)+path('M70 290H930M70 1160H930',ink,5);
 if(o==='repeat-grid')return Array.from({length:6},(_,y)=>Array.from({length:5},(_,x)=>`<path d="M${115+x*180+(y%2)*55} ${115+y*210}l45 55l-45 55l-45-55Z" fill="none" stroke="${imageLine}" stroke-width="5"/>`).join('')).join('');
 if(o==='circle-crop')return `<ellipse cx="500" cy="685" rx="380" ry="378" fill="none" stroke="${ink}" stroke-width="7"/>`+rect(120,307,760,756,'none',imageLine,'stroke-dasharray="13 12"');
 if(o==='emblem-outline')return path('M500 220L830 390V915Q830 1140 500 1260Q170 1140 170 915V390Z',ink,9);
 if(o==='die-cut')return path('M110 150Q65 150 65 230V1140Q65 1250 185 1260H815Q935 1250 935 1140V230Q935 150 870 150Z',ink,9);
 if(o==='perforations')return rect(110,295,780,930,'none',ink)+Array.from({length:13},(_,n)=>`<circle cx="${110+n*65}" cy="295" r="15" fill="${paper}" stroke="${ink}"/><circle cx="${110+n*65}" cy="1225" r="15" fill="${paper}" stroke="${ink}"/>`).join('')+Array.from({length:14},(_,n)=>`<circle cx="110" cy="${315+n*65}" r="15" fill="${paper}" stroke="${ink}"/><circle cx="890" cy="${315+n*65}" r="15" fill="${paper}" stroke="${ink}"/>`).join('');
 if(o==='wallpaper-safe')return rect(70,280,860,980,'none',imageLine,'stroke-dasharray="13 12"')+rect(0,0,1000,280,'#e8eef0')+text('低密度の余白',500,150,42,'text-anchor="middle"',imageLine);
 if(o==='urban-depth')return path('M70 1400V520L470 850M930 1400V360L470 850M130 850L470 850L880 850',imageLine,7);
 return '';
}
function createAtlas(values,read,prefix,file,typeOnly=false){
 const views=[],groups=[],rows=[];
 values.forEach((value,i)=>{
  const s=read(value),id=prefix+'-'+String(i+1).padStart(2,'0'),off=i*W;
  let artwork=rect(0,0,W,H,paper);
  if(!typeOnly)artwork+=imagePlane(s.image,s.kind)+ornaments(s);
  else if(s.frames.length)artwork+=rect(130,310,740,620,'none','#b9c8d0','stroke-dasharray="12 12"');
  artwork+=s.frames.map((f,index)=>frame(f,index,typeOnly)).join('');
  // Annotation is for the selector only and does not describe artwork content.
  // A no-copy preview contains no visible label, number or pseudo text. Its
  // name remains in the selector, outside the artifact reference.
  views.push(`<view id="${id}" viewBox="${off} 0 ${W} ${H}"/>`);
  groups.push(`<g transform="translate(${off} 0)" data-${typeOnly?'typography':'design'}="${esc(value)}" data-preview-scope="${typeOnly?'manuscript count and orientation only':'page geometry only'}">${artwork}</g>`);
  rows.push({...s,id,src:file+'#'+id,asset:null,characterReference:false,styleReference:false,frameBounds:s.frames.map(manuscriptFrameBounds),...(typeOnly?{manuscriptGroups:s.frames.length,roleLabelsAreCopy:false}:{imageAreaPercent:Number((s.image[2]*s.image[3]/100).toFixed(2))})});
 });
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${views.join('')}${groups.join('')}</svg>`;
 fs.writeFileSync(new URL(file,root),svg);
 return rows;
}
const design=createAtlas(designLayoutValues,designLayoutFor,'design','layout-previews-v28.svg');
const typography=createAtlas(typographyLayoutValues,typographyLayoutFor,'type','typography-previews-v28.svg',true);
const visualReview={
 date:'2026-10-09',method:'Four PNG contact sheets inspected by eye; three formerly similar families compared side by side before and after. Local captions use numbers; copy-role labels are omitted only in the private QA render because local CJK fonts are unavailable.',
 scope:'All 48 design diagrams and 26 manuscript diagrams; geometry review does not certify generated artwork, glyph legibility or any camera result.',
 unchangedDesigns:45,
 comparisons:[
  {design:'ゴシック雑誌の表紙',neighbors:['ファッション雑誌の表紙','アールデコポスター','タロットカード'],before:'Centered image and top/bottom information chiefly differed by edge ornament.',after:'Left narrow image and pointed arch, right-only information axis and lower-left author; asymmetry remains visible with ornament hidden.',status:'structurally-distinct'},
  {design:'インタビュー誌面',neighbors:['カルチャー誌の表紙','スイス式グリッドポスター','広告ビジュアル'],before:'Tall left image with stacked right information resembled other editorial layouts.',after:'Fixed full-width upper image and three aligned Q&A columns below, independent of source-image aspect ratio.',status:'structurally-distinct'},
  {design:'ゲームのパッケージ',neighbors:['絵本の表紙'],before:'Top title, large central picture and small lower information band resembled a picture book.',after:'Shorter central image and two deep, separate lower information panels with unequal widths; picture book retains one large picture and a small byline.',status:'structurally-distinct'}
 ],
 nativeVerification:'The three revised formats retain their exact preview image containers under all 26 visible copy choices, including automatic and no-copy modes; source aspect ratio is preserved by contain, permitted manuscript is neither omitted nor duplicated, and selected writing direction survives layout adaptation.'
};
fs.writeFileSync(new URL('format-preview-catalog.js',root),'// Pure page geometry: no character, photo or medium reference.\nexport const formatPreviews='+JSON.stringify(Object.fromEntries(design.map(s=>[s.value,s.src])),null,2)+';\n');
fs.writeFileSync(new URL('type-preview-catalog.js',root),'// Pure manuscript frames: no example artwork and no permission to print role labels.\nexport const typographyPreviews='+JSON.stringify(Object.fromEntries(typography.map(s=>[s.value,s.src])),null,2)+';\n');
fs.mkdirSync(new URL('audit/',root),{recursive:true});
fs.writeFileSync(new URL('audit/layout-distinction-v28.json',root),JSON.stringify({scope:'Selector engineering diagrams. Acceptance of generated artwork is a separate visual check.',visualReview,design,typography},null,2));
const md=['# デザイン・文字項目の区別監査','',
 '48形式と26文字設定の構造を人物・写真・画風なしの説明図で照合する。見本の枠名は作品へ印字しない。原稿量と書字方向は文字設定、画像領域・列・余白はデザインが決める。書字方向は撮影カメラを変えない。生成画像の合格判定は別の実画像比較が必要。','',
 '## デザイン48件','',
 '|項目名|識別する構造|主図版 x,y,w,h (%)|図版面積|枠の方向|',
 '|---|---|---|---|---|',...design.map(s=>`|${s.value}|${s.signature}|${s.image.join(',')}|${s.imageAreaPercent}%|${[...new Set(s.frames.map(f=>f.direction))].join(' / ')||'文字枠なし'}|`),'',
 '## 文字26件','',
 '|項目名|許可原稿量|見本の群数|書字方向|配置|',
 '|---|---|---|---|---|',...typography.map(s=>`|${s.value}|${s.quantity}|${s.manuscriptGroups}|${s.direction}|${s.placement}|`),'',
 '## 目視で似ていた3形式の再設計','',
 '48デザイン・26文字を4枚の一覧にして眼視し、次の3組は修正前・修正後・近似項目を横並びで再比較した。ローカルのQA画像ではCJKフォント不足のため枠名だけを省き、番号と物理的な配置で判断した。実際の見本SVGの枠名は保持している。','',
 '|修正形式|近似していた形式|修正前の問題|区別する修正後の版面|判定|','|---|---|---|---|---|',
 '|ゴシック雑誌の表紙|ファッション・アールデコ・タロット|中央画像と上下情報が飾り以外ほぼ同じ|左の細長いアーチ図版と右だけの情報軸、左下作者名|構造を眼視で区別|',
 '|インタビュー誌面|カルチャー・スイス式・広告|左画像と右の情報列が共通|上の幅90%図版と下のQ&A3列、縦長元画像でも同じ版面|構造を眼視で区別|',
 '|ゲームのパッケージ|絵本の表紙|上題字・大画像・下の細い一帯が共通|高さ45%の中央画像と下の深い二つの情報パネル|構造を眼視で区別|','',
 '他45形式の図形は変更していない。3修正形式は全26文字選択・縦横3種の元画像・2モードで見本と実SVGの領域一致、完全な画像保持、原稿数、非重複を確認する。書字方向は別の実SVG検査で縦・横・斜めを照合する。この監査は生成画像の作画やカメラの合格を示すものではない。','',
 '## 衝突を解消する規則','',
 '- 文字なしでは文字・数字・署名・疑似文字を作らない。見本も空白で、新聞は6列3段の細罫と主図版だけを残す。',
 '- 明示文字設定はデザインの標準原稿を置き換える。雑誌文字11群を新聞・見開きへ使っても、リードと本文を増やさない。',
 '- 新聞の列は構造の指定。広告の横書き、装丁の縦題名、漫画の縦煽り、斜めサインの指定を縦本文へ強制しない。',
 '- 紙面内の斜め文字は回転後の四隅で5%安全域を確保する。映画の制作情報3行は別の枠とし、下端への重ね合わせを防ぐ。',
 '- 文字が主役のタイポグラフィーポスターと文字なしは定義が両立しないため、選択衝突として示す。明示原稿を勝手に増やさない。',
 '- 短い原稿向け形式へ多量原稿を選ぶ場合は、文字が小さくなる警告を示す。原稿を省略したり別形式へ変更しない。','',
 '6列3段や配置%はツール独自の識別しやすい設計値であり、すべての実在新聞・誌面に共通する規格という意味ではない。見本には他の作者の画像・人物・誌名・文章を使用していない。',''];
fs.writeFileSync(new URL('audit/layout-distinction-v28.md',root),md.join('\n'));
console.log(`Built ${design.length} distinct personless design diagrams and ${typography.length} manuscript diagrams.`);
