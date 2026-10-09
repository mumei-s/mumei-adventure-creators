import assert from 'node:assert/strict';
import {applyCollection} from '../collection.js?v=28.4.5';
import {buildEditorial} from '../editorial.js?v=28.4.5';
import {typographyLayoutValues} from '../layout-preview-specs.js?v=28.4.5';
import {renderEditorialLayout} from '../editorial-layout.js?v=28.4.5';

// Inspect the actual SVG, not just the wording in typography recipes. An
// advertising manuscript stays horizontal in a newspaper; the newspaper's
// structural columns do not grant permission to turn its characters vertical.
const designs=['週刊誌の表紙','ファッション雑誌の表紙','カルチャー誌の表紙','ゴシック雑誌の表紙','文芸誌の表紙','インタビュー誌面','見開き特集','新聞の一面','ゲームのパッケージ'];
const types=typographyLayoutValues.filter(value=>value!=='デザインに合わせて自動編集');
const base={medium:'現代アニメの一枚絵',theme:'迷いの森の帰り道',place:'霧の森',costume:'ミイラ',line:'選んだ言葉を、そのまま。',palette:'漆黒 × 琥珀 × 象牙',size:'A4縦・300dpi目安｜2480×3508｜210:297'};
const picture={dataUrl:'data:image/png;base64,AA==',artworkWidth:1,artworkHeight:1};
const inside=(a,b)=>a.x>=b.x-.01&&a.y>=b.y-.01&&a.x+a.width<=b.x+b.width+.01&&a.y+a.height<=b.y+b.height+.01;
const overlaps=(a,b)=>a.x<b.x+b.width-.01&&a.x+a.width>b.x+.01&&a.y<b.y+b.height-.01&&a.y+a.height>b.y+.01;
function expectedDirection(type,role){
 if(type==='手書きサイン風の名前'&&role==='作者名')return 'diagonal';
 if(type==='墨の落款風の名前'&&role==='作者名')return 'vertical-rl';
 if(type==='縦書きコピー・一文を大きく'&&['縦書きコピー','作者名'].includes(role))return 'vertical-rl';
 if(type==='物語の装丁風・タイトルと紹介'&&['作品タイトル','作者名'].includes(role))return 'vertical-rl';
 if(type==='漫画表紙・大見出しと煽り文'&&role==='煽り文')return 'vertical-rl';
 if(type==='雑誌風・見出しと特集をたっぷり'&&['補助特集','補助特集の補足'].includes(role))return 'vertical-rl';
 if(type==='新聞風・記事と段組み'&&/^(?:本文|副見出し|副記事本文)\d+$/.test(role))return 'vertical-rl';
 return 'horizontal';
}
let cases=0;
for(const collection of ['halloween','everyday']){
 applyCollection(collection);
 for(const design of designs)for(const type of types)for(const language of ['Japanese','Latin']){
  const values={...base,collection,design,type},copy=buildEditorial({displayName:'文字方向確認',activityEnabled:false},values,()=>.28);
  if(language==='Latin')copy.slots=copy.slots.map((slot,index)=>({...slot,text:'Copy '+(index+1)}));
  const output=renderEditorialLayout({values,copy},picture),label=[collection,design,type,language].join(' / '),{textRuns,textFrames,image,gutter}=output.placements;
  assert.equal(textRuns.length,copy.slots.length,label+' adds, drops or duplicates permitted copy');
  for(const run of textRuns){
   const direction=expectedDirection(type,run.role),frame=textFrames.find(frame=>frame.id===run.frameId);
   assert.equal(run.direction,direction,label+' changes the selected writing direction of '+run.role);
   assert(frame&&inside(run,frame),label+' text escapes its real writing/rotation bounds: '+run.role);
   assert.equal(run.lines.join(''),copy.slots[run.slotIndex].text.replace(/\r?\n/g,''),label+' alters copy while wrapping');
   if(gutter)assert(!overlaps(frame,gutter),label+' crosses the spread gutter');
   if(['ゴシック雑誌の表紙','インタビュー誌面','見開き特集','新聞の一面','ゲームのパッケージ'].includes(design))assert(!overlaps(frame,image.container),label+' writes across the reserved artwork region');
   const tags=[...output.svg.matchAll(/<text\b[^>]*>/g)].map(match=>match[0]),tag=tags.find(tag=>tag.includes('data-frame="'+run.frameId+'"')&&tag.includes('data-role="'+run.role+'"'));
   assert(tag,label+' lacks its visible SVG copy role');
   assert.equal(tag.includes('writing-mode="vertical-rl"'),direction==='vertical-rl',label+' SVG writing direction differs from placement');
   assert.equal(tag.includes('transform="rotate('),direction==='diagonal',label+' rotates the wrong manuscript role');
   if(direction==='diagonal')assert.equal(run.rotation,-12,label+' signature rotation differs from its preview');
  }
  if(type==='詩のコピー・短い言葉を3行'){
   const poem=textRuns.filter(run=>/^詩行\d$/.test(run.role));
   assert.equal(poem.length,3,label+' changes the three-line poem quantity');
   assert(poem.every(run=>run.lines.length===1),label+' wraps a selected poem line into additional lines');
   assert(poem[0].y<poem[1].y&&poem[1].y<poem[2].y,label+' places poem lines into columns rather than three ordered rows');
  }
  if(design==='新聞の一面'){
   const box=image.container;
   assert(Math.abs(box.width*box.height/(output.width*output.height)-.3078)<1e-8,label+' abandons the newspaper preview image area');
   assert.equal((output.svg.match(/<line\b/g)||[]).length,9,label+' drops the six-column, three-band newspaper structure');
  }
  if(type==='文字を一切入れない')assert.doesNotMatch(output.svg,/<text\b/,label+' prints unauthorized text');
  cases++;
 }
}
applyCollection('halloween');
console.log('PASS actual editorial writing directions: '+cases+' mode/design/type/language cases preserve the selected horizontal, vertical or diagonal roles, exact copy quantity, three poem rows, safe bounds and one complete artwork; newspapers retain the matching 31% artwork and six-column/three-band skeleton. No images generated.');
