/** Regenerate only review PNGs and gallery.json from current stored references/adopted atlases.
 * No network, browser, runtime mutation, article submission, or counter request.
 * Run from repo: node halloween-exhibition/preview/work-review/evidence/cast-comparison/build-gallery.mjs
 */
import fs from 'node:fs/promises';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
const out=path.dirname(fileURLToPath(import.meta.url)),review=path.resolve(out,'../..'),preview=path.resolve(review,'..'),maze=path.join(preview,'maze'),require=createRequire(import.meta.url);
const{createCanvas,loadImage,GlobalFonts}=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules','@napi-rs/canvas'));
const font=process.env.EVIDENCE_CJK_FONT||path.resolve(preview,'../../../evidence-fonts/NotoSansCJKjp-Regular.otf');GlobalFonts.registerFromPath(font,'CJK');
const read=async f=>JSON.parse(await fs.readFile(f,'utf8')),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const [archive,manifest,icons]=await Promise.all([read(path.join(preview,'data/archive.json')),read(path.join(maze,'data/creator-characters.json')),read(path.join(out,'icon-provenance.json'))]);
const labels={'owner-lantern-hero':'主人公','owner-black-cat':'黒猫の同行者',iris:'人物','koakumako-base-devil':'公式キャラクター','minato-shio-witch':'人物','naemo-masquerade':'人物','yamakon-navy-figure':'紺色の服の人物','yamakon-pink-figure':'桃色の服の人物','marimo-headcat':'人物と頭上の猫','tantan-streetwalker':'人物','tantan-avatar-hedgehogs':'名のないハリネズミの同行者','takechi-bread-avatar':'パンの姿のキャラクター','chamomile-flower-avatar':'花の姿のキャラクター','tenkai-moon-robed-avatar':'ローブ姿の人物','aihan-avatar-woman':'人物','aihan-avatar-shiba':'柴犬の相棒','mama-avatar-pair':'人物とクリーム色の同行者','lokiron-avatar':'人物','cna-black-bob':'黒髪の人物','cna-star-twintails':'星のツインテールの人物','cna-orange-glasses':'橙髪と眼鏡の人物'};
const dirs=['正面','左向き','右向き','後ろ'];
const theme={bg:'#111a23',ink:'#f6efd9',muted:'#becabd',gold:'#e7cb8e',line:'#4e645c'};
function text(c,t,x,y,size=14,color=theme.ink){c.font=`${size}px CJK`;c.fillStyle=color;c.textBaseline='top';c.textAlign='left';c.fillText(t,x,y);}
function blank(w,h){const cv=createCanvas(w,h),c=cv.getContext('2d');c.fillStyle=theme.bg;c.fillRect(0,0,w,h);return cv;}
function wrap(c,t,x,y,maxWidth,size=16){c.font=`${size}px CJK`;let line='',yy=y;for(const ch of t){if(c.measureText(line+ch).width>maxWidth){text(c,line,x,yy,size);line='';yy+=size*1.55;}line+=ch;}if(line)text(c,line,x,yy,size);return yy+size*1.55;}
async function save(name,cv){await fs.writeFile(path.join(out,name),cv.toBuffer('image/png'));return'evidence/cast-comparison/'+name;}
function cropFor(image,cell){
 const[x,y,w,h]=cell.frame,cv=createCanvas(Math.ceil(w),Math.ceil(h)),c=cv.getContext('2d');c.drawImage(image,x,y,w,h,0,0,cv.width,cv.height);
 const d=c.getImageData(0,0,cv.width,cv.height);let x0=cv.width,y0=cv.height,x1=0,y1=0;for(let yy=0;yy<cv.height;yy++)for(let xx=0;xx<cv.width;xx++)if(d.data[(yy*cv.width+xx)*4+3]>12){x0=Math.min(x0,xx);x1=Math.max(x1,xx);y0=Math.min(y0,yy);y1=Math.max(y1,yy);}
 return{image:cv,rect:[x0,y0,Math.max(1,x1-x0+1),Math.max(1,y1-y0+1)]};
}
function figure(c,crop,x,y,h){const[xx,yy,w,hh]=crop.rect,ww=w/hh*h;c.drawImage(crop.image,xx,yy,w,hh,x-ww/2,y-h,ww,h);}
const creators=[],assetProvenance=[];
for(const creator of archive.creators){
 const icon=icons.icons.find(i=>i.creatorId===creator.id);if(!icon||icon.error)throw Error('Missing recorded icon '+creator.id);
 const original=await loadImage(await fs.readFile(path.join(review,icon.localPath))),avatar= createCanvas(180,180),ac=avatar.getContext('2d'),scale=Math.min(160/original.width,160/original.height);ac.drawImage(original,(180-original.width*scale)/2,(180-original.height*scale)/2,original.width*scale,original.height*scale);
 const avatarPath=await save(creator.id+'-official.png',avatar),entries=archive.years.flatMap(y=>y.entries.filter(e=>e.creatorId===creator.id)),submitted=entries.some(e=>e.submissionStatus==='submitted');
 const characters=manifest.characters.filter(c=>c.creatorId===creator.id);if(creator.id==='ss_yr')characters.push(...manifest.companions);
 const rows=[];
 for(const actor of characters){
  const raw=await fs.readFile(path.join(maze,actor.asset.src));if(sha(raw)!==actor.asset.sha256)throw Error('Adopted asset hash mismatch '+actor.id);
  const image=await loadImage(raw),layout=actor.asset.layout,description=labels[actor.id]||actor.label||'人物';
  const crops=layout.frames.map(row=>row.map(cell=>cropFor(image,cell)));
  const representative=createCanvas(180,180);figure(representative.getContext('2d'),crops[0][layout.idleColumn],90,170,160);const previewPath=await save(actor.id+'-adopted.png',representative);
  const contact=blank(720,660),cc=contact.getContext('2d');wrap(cc,creator.name.replace(/\p{Extended_Pictographic}|\p{Variation_Selector}/gu,''),15,10,690,16);text(cc,description,15,68,13,theme.muted);
  for(let r=0;r<4;r++){text(cc,dirs[r],12,126+r*130,12,theme.gold);for(let col=0;col<4;col++){const x=135+col*160,y=198+r*130;cc.strokeStyle=theme.line;cc.beginPath();cc.moveTo(x-62,y);cc.lineTo(x+62,y);cc.stroke();figure(cc,crops[r][col],x,y,100);}}
  const contactPath=await save(actor.id+'-directions.png',contact);
  rows.push({renderRoleId:actor.id,description,entityCount:actor.entityIds?.length||1,interactive:actor.interactive!==false,preview:previewPath,contact:contactPath,assetPath:'../maze/'+actor.asset.src,assetSHA256:actor.asset.sha256,source:actor.source});
  assetProvenance.push({id:actor.id,creatorId:creator.id,asset:actor.asset.src,sha256:actor.asset.sha256,source:actor.source});
 }
 const articleURLs=new Set(),articles=[];for(const e of entries)for(const l of [...(e.works||[]),...(e.links||[])])if(l.visible!==false&&/^https:\/\/note\.com\/[^/]+\/n\//.test(l.url)&&!articleURLs.has(l.url)){articleURLs.add(l.url);articles.push({url:l.url,introduction:e.submissionStatus==='introduction'});}
 const pendingCNA=creator.id==='grand_daisy8632'&&!rows.length;
 let note='';if(creator.id==='ss_yr')note='主人公は明示採用済みのランタン参照、黒猫は同行者です。';if(creator.id==='koakumako')note='公式キャラクター設定資料を優先した採用です。';if(creator.id==='soh_style_work')note='登録記事内の別イラストを基にした、人物と頭上の猫の一組です。記事表紙の仮面・緑と金のドレスとは衣装が異なります。';if(creator.id==='glossy_guppy6230')note='人物とは別の画像で、名のないハリネズミの同行者を保持しています。';if(creator.id==='grand_daisy8632')note=rows.length?'アイコンの三人をゲストとして追加。記事は未提出のままです。':'アイコンの三人を追加予定です。記事は未提出のままです。';
 const item={creatorId:creator.id,name:creator.name,profileURL:creator.profileURL,avatar:avatarPath,originalAvatar:icon.localPath,referenceRecordedDateUTC:icon.referenceRecordedDateUTC,fetchDateUTC:icon.fetchDateUTC,submitted,characters:rows,articles,note,marimo:creator.id==='soh_style_work',pendingVisuals:pendingCNA};
 if(creator.id==='grand_daisy8632'&&rows.length){item.userReference='assets/cna-originals/reference-characters.png';item.userReferenceProvenance='assets/cna-originals/provenance.json';}
 if(item.marimo){item.articleCover='evidence/cast-comparison/marimo-article-cover.png';item.articleSource='evidence/cast-comparison/marimo-article-source.png';}
 creators.push(item);
 const width=Math.max(900,250+rows.length*190),pair=blank(width,340),pc=pair.getContext('2d');wrap(pc,creator.name.replace(/\p{Extended_Pictographic}|\p{Variation_Selector}/gu,''),18,14,width-36,18);text(pc,'公式アイコン',30,80,13,theme.gold);pc.drawImage(avatar,25,110);text(pc,rows.length?'採用中のゲーム画像':'三人を追加予定・記事は未提出',250,80,13,theme.gold);
 for(let i=0;i<rows.length;i++){const game=await loadImage(await fs.readFile(path.join(review,rows[i].preview)));pc.drawImage(game,240+i*190,110);text(pc,rows[i].description,240+i*190,302,12,theme.muted);}
 item.comparison=await save(creator.id+'-comparison.png',pair);
}
const sourceFiles=['data/archive.json','maze/data/creator-characters.json'];const sourceHashes=[];for(const f of sourceFiles){const raw=await fs.readFile(path.join(preview,f));sourceHashes.push({path:f,sha256:sha(raw)});}
const data={generatedAtUTC:new Date().toISOString(),referencePurpose:'Recorded official icons compared with currently adopted character atlas crops; not a claim that every artwork is approved or natural animation is complete.',normalization:{sourceImagesEdited:false,sourceCrop:'Actual manifest frame rectangles followed by alpha bounds for equal-height visual comparison',portraitHeight:160,gameFigureHeight:160,canvas:180,warning:'Equal height is for visual identity comparison, not game-world relative heights.'},sourceHashes,creatorCount:creators.length,submittedCreators:creators.filter(c=>c.submitted).length,pendingArticleCreators:creators.filter(c=>!c.submitted).map(c=>c.creatorId),adoptedRenderRoles:creators.reduce((n,c)=>n+c.characters.length,0),creators};
await fs.writeFile(path.join(out,'gallery.json'),JSON.stringify(data,null,2)+'\n');await fs.writeFile(path.join(out,'adopted-asset-provenance.json'),JSON.stringify(assetProvenance,null,2)+'\n');
const overview=blank(1280,creators.length*250),oc=overview.getContext('2d');for(let i=0;i<creators.length;i++){const row=creators[i],pair=await loadImage(await fs.readFile(path.join(review,row.comparison)));const s=Math.min(1,1240/pair.width,235/pair.height);oc.drawImage(pair,20,i*250,pair.width*s,pair.height*s);}
await save('all-creators-comparison.png',overview);
console.log(JSON.stringify({creators:data.creatorCount,submitted:data.submittedCreators,roles:data.adoptedRenderRoles,CNA:creators.find(c=>c.creatorId==='grand_daisy8632').characters.length,sourceHashes},null,2));
