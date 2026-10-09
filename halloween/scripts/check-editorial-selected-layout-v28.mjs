import assert from 'node:assert/strict';
import {buildEditorial} from '../editorial.js?v=28.4.6';
import {typographyValues} from '../typography-options.js?v=28.4.6';
import {applyCollection} from '../collection.js?v=28.4.6';
import {renderEditorialLayout} from '../editorial-layout.js?v=28.4.6';
import {typographyLayoutValues,designLayoutFor} from '../layout-preview-specs.js?v=28.4.6';

// Exercise the original failure: selected primary copy must have real editorial
// space, rather than disappear into an incidental 1.8% footer. No image model
// or manuscript editing service runs in this deterministic composition check.
const designs=['週刊誌の表紙','ファッション雑誌の表紙','カルチャー誌の表紙','ゴシック雑誌の表紙','文芸誌の表紙','インタビュー誌面','見開き特集','新聞の一面','ゲームのパッケージ'];
const limited=['クリエイター名だけ','HALLOWEENのみ','HALLOWEEN＋クリエイター名','短いタイトル＋名前','クリエイター名＋自由な見出し','セリフのみ','手書きサイン風の名前','墨の落款風の名前'];
const legacy=['雑誌風・見出しと特集をたっぷり','映画ポスター風・タイトルとクレジット','広告チラシ風・情報をたっぷり','新聞風・記事と段組み','物語の装丁風・タイトルと紹介'];
const pictures=[{artworkWidth:1,artworkHeight:1},{artworkWidth:2,artworkHeight:1},{artworkWidth:1,artworkHeight:2}];
const profile={displayName:'原稿 <確認> & "工房"',activityEnabled:false};
const base={medium:'現代アニメの一枚絵',theme:'迷いの森の帰り道',place:'霧の森',costume:'ミイラ',line:'選んだ言葉を、そのまま。',palette:'漆黒 × 琥珀 × 象牙',size:'A4縦・300dpi目安｜2480×3508｜210:297'};
const dataUrl='data:image/png;base64,AA==';
const inside=(a,b)=>a.x>=b.x-.01&&a.y>=b.y-.01&&a.x+a.width<=b.x+b.width+.01&&a.y+a.height<=b.y+b.height+.01;
const overlaps=(a,b)=>a.x<b.x+b.width-.01&&a.x+a.width>b.x+.01&&a.y<b.y+b.height-.01&&a.y+a.height>b.y+.01;
let cases=0;
for(const collection of ['halloween','everyday']){
 applyCollection(collection);
 for(const design of designs)for(const type of [...typographyValues,...limited,...legacy,'文字を一切入れない'])for(const picture of pictures){
  const values={...base,collection,design,type},copy=buildEditorial(profile,values,()=>.28);
  const output=renderEditorialLayout({values,copy},{...picture,dataUrl}),label=[collection,design,type,picture.artworkWidth+':'+picture.artworkHeight].join(' / ');
  assert.equal(copy.authority,type==='文字を一切入れない'?'none':'selected',label+' lost the effective manuscript authority');
  const {image,gutter,textRuns,textFrames}=output.placements;
  assert.equal((output.svg.match(/<image\b/g)||[]).length,1,label+' duplicated the supplied picture');
  assert(output.svg.includes(dataUrl),label+' changed the supplied picture bytes');
  assert.equal(image.preserveAspectRatio,'xMidYMid meet',label+' no longer contains the complete picture');
  assert(inside(image,image.container),label+' clips the complete picture');
  assert(Math.abs(image.width/image.height-picture.artworkWidth/picture.artworkHeight)<1e-6,label+' changes the camera projection through stretching');
  assert.equal(textRuns.length,copy.slots.length,label+' omitted or duplicated a copy block');
  assert.equal(new Set(textRuns.map(run=>run.slotIndex)).size,copy.slots.length,label+' prints a block more than once');
  for(const run of textRuns){
   const slot=copy.slots[run.slotIndex],frame=textFrames.find(frame=>frame.id===run.frameId);
   assert.deepEqual([run.role,run.text],[slot.role,slot.text],label+' invented or altered manuscript');
   assert.equal(run.lines.join(''),slot.text.replace(/\r?\n/g,''),label+' loses characters while wrapping');
   assert(frame&&inside(run,frame),label+' overflows its allotted area: '+run.role);
   assert(!/additional-copy/.test(frame.id),label+' relegates selected manuscript to incidental copy: '+run.role);
   assert(Number.isFinite(run.fontSize)&&run.fontSize>0,label+' invalid font size');
   if(gutter)assert(!overlaps(frame,gutter),label+' crosses the spread gutter');
   if(['ゴシック雑誌の表紙','インタビュー誌面','見開き特集','ゲームのパッケージ'].includes(design))assert(!overlaps(frame,image.container),label+' covers the reserved complete-picture region');
  }
  for(let i=0;i<textFrames.length;i++)for(let j=i+1;j<textFrames.length;j++)assert(!overlaps(textFrames[i],textFrames[j]),label+' has colliding copy frames: '+textFrames[i].id+' / '+textFrames[j].id);
  if(type==='商品広告・キャッチと特徴3点'){
   assert.deepEqual(copy.slots.map(slot=>slot.role),['主見出し','商品紹介','特徴1','特徴2','特徴3','作者名']);
   for(const run of textRuns)assert(run.fontSize>=output.width*.012,label+' repeats the microscopic primary-copy regression: '+run.role);
  }
  if(type==='縦書きコピー・一文を大きく'){
   const run=textRuns.find(run=>run.role==='縦書きコピー');
   assert(run&&run.direction==='vertical-rl'&&run.lines.length<=3,label+' lost the selected three-column vertical copy');
  }
  if(design==='見開き特集'){
   assert(gutter&&Math.abs(gutter.width-output.width*.06)<.01,label+' loses the physical spread gutter');
   assert(Math.abs(image.container.x-output.width*.07)<.01&&Math.abs(image.container.width-output.width*.34)<.01,label+' changes the approved source-image safety box');
  }
  cases++;
 }
 // Check all 26 menu choices including AUTO and NONE against the physical
 // preview geometry. The selected manuscript may change direction/count, but
 // cannot turn these distinct page structures back into their former layouts.
 for(const design of ['ゴシック雑誌の表紙','インタビュー誌面','ゲームのパッケージ'])for(const type of typographyLayoutValues)for(const picture of pictures){
  const values={...base,collection,design,type},copy=buildEditorial(profile,values,()=>.28),output=renderEditorialLayout({values,copy},{...picture,dataUrl});
  const label=[collection,design,type,picture.artworkWidth+':'+picture.artworkHeight].join(' / '),{image,textFrames,textRuns}=output.placements;
  const expected=designLayoutFor(design).image.map((v,i)=>v/100*(i%2?output.height:output.width)),actual=[image.container.x,image.container.y,image.container.width,image.container.height];
  actual.forEach((v,i)=>assert(Math.abs(v-expected[i])<.01,label+' native image region differs from selector preview'));
  assert.equal(textRuns.length,copy.slots.length,label+' drops or duplicates a permitted role');
  assert.equal(new Set(textRuns.map(r=>r.slotIndex)).size,copy.slots.length,label+' repeats manuscript');
  assert.equal(image.preserveAspectRatio,'xMidYMid meet',label+' crops the supplied picture');
  for(const frame of textFrames){
   assert(!overlaps(frame,image.container),label+' places text across its reserved image region');
   if(design==='ゴシック雑誌の表紙'&&!frame.roles.every(r=>r==='作者名'))assert(frame.x>=output.width*.68-.01,label+' moves Gothic copy away from its single right axis');
   if(design==='インタビュー誌面')assert(frame.y+frame.height<=output.height*.22+.01||frame.y>=output.height*.56-.01,label+' returns to text beside the interview image');
   if(design==='ゲームのパッケージ')assert(frame.y+frame.height<=output.height*.21+.01||frame.y>=output.height*.72-.01,label+' abandons upper title/lower information areas');
  }
  for(let i=0;i<textFrames.length;i++)for(let j=i+1;j<textFrames.length;j++)assert(!overlaps(textFrames[i],textFrames[j]),label+' collides in distinct structural regions');
  if(type==='文字を一切入れない')assert.doesNotMatch(output.svg,/<text\b/,label+' prints text in a blank manuscript');
  cases++;
 }
}
applyCollection('halloween');
console.log('PASS selected editorial layout: '+cases+' collection/design/explicit-copy/source-aspect cases preserve every manuscript block exactly once in primary copy frames; one complete image, spread safety, no copy-frame collisions, and readable six-role advertising fixtures. No images were generated.');
