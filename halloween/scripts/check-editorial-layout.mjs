import assert from 'node:assert/strict';
import {applyCollection} from '../collection.js?v=24.0.0';
import {resolveSelections} from '../catalog.js?v=24.0.0';
import {initialSelections} from '../modes.js?v=24.0.0';
import {buildDirection} from '../direction.js?v=24.0.0';
import {applyPose} from '../poses.js?v=24.0.0';
import {productionPlan} from '../production-plan.js?v=24.0.0';
import {renderEditorialLayout} from '../editorial-layout.js?v=24.0.0';

// Native SVG composition preserves supplied pixels; it does not generate images.
// Solid-color, dimensionally correct test PNGs. No person's artwork is stored.
const pictures=[
 {artworkWidth:1,artworkHeight:1,dataUrl:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGMwSAj4DwADhAHgN+DvxQAAAABJRU5ErkJggg=='},
 {artworkWidth:2,artworkHeight:1,dataUrl:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEUlEQVR4nGM0SAj4z8DAwAAACw0B4UtUcJ0AAAAASUVORK5CYII='},
 {artworkWidth:1,artworkHeight:2,dataUrl:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVR4nGMwSAj4z8TAwMAAAAzuAeJu1b/HAAAAAElFTkSuQmCC'}
];
const selected={design:'見開き特集',medium:'宝石ホログラムアニメ',theme:'真夜中の魔女のアトリエ',costume:'ミイラ',mood:'正面・首をまっすぐ',place:'魔女の書斎',pose:'床であぐらをかく',palette:'夜紺 × 翡翠 × 蛍光緑',type:'デザインに合わせて自動編集',line:'隠した想いも、今夜の衣装。',size:'A4縦・300dpi目安｜2480×3508｜210:297'};
const profile={displayName:'組版検証',activityEnabled:false,topics:[],biography:''},random=()=>.28;
function planFor(overrides={},owner=profile){
 applyCollection('halloween');
 const values=resolveSelections({...initialSelections(),...selected,...overrides},random);
 const variant=applyPose(buildDirection([],values.mood,random,'halloween',values),values.pose);
 return productionPlan(owner,values,variant,'halloween',random);
}
const near=(actual,expected,label,tolerance=.01)=>assert.ok(Math.abs(actual-expected)<=tolerance,label+': expected '+expected+', got '+actual);
const inside=(inner,outer)=>inner.x>=outer.x-.01&&inner.y>=outer.y-.01&&inner.x+inner.width<=outer.x+outer.width+.01&&inner.y+inner.height<=outer.y+outer.height+.01;
const overlaps=(a,b)=>a.x<b.x+b.width-.01&&a.x+a.width>b.x+.01&&a.y<b.y+b.height-.01&&a.y+a.height>b.y+.01;
const decodeXML=text=>text.replace(/&#x([0-9a-f]+);|&#(\d+);|&(amp|lt|gt|quot|apos);/gi,(_,hex,dec,named)=>hex?String.fromCodePoint(parseInt(hex,16)):dec?String.fromCodePoint(Number(dec)):({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"})[named.toLowerCase()]);
const leafText=svg=>[...svg.matchAll(/<(text|tspan)\b[^>]*>([^<]*)<\/\1>/g)].map(m=>decodeXML(m[2]));
const counts=items=>items.reduce((map,item)=>map.set(item,(map.get(item)||0)+1),new Map());
const slotKey=slot=>JSON.stringify([slot.role,slot.text]);

function checkSourceAndGeometry(output,picture,label){
 const {svg,width,height,placements}=output,image=placements.image;
 assert.ok(Number.isInteger(width)&&width>0&&Number.isInteger(height)&&height>0,label+' must return positive integer output dimensions');
 assert.ok(Math.max(width,height)<=4096,label+' exceeds the native canvas size limit');
 assert.equal((svg.match(/<image\b/g)||[]).length,1,label+' must embed exactly one original image');
 assert.ok(svg.includes(picture.dataUrl),label+' must retain the supplied image bytes');
 const tag=svg.match(/<image\b[^>]*>/)?.[0]||'';
 assert.ok(/preserveAspectRatio="xMidYMid meet"/.test(tag),label+' must contain the whole source image');
 assert.ok(!/\b(?:transform|clip-path|mask|filter)\s*=/.test(tag),label+' must not transform or clip the source image');
 assert.ok(!/<(?:clipPath|mask|filter|foreignObject|script)\b/.test(svg),label+' must not hide or rewrite image content');
 assert.equal(image.preserveAspectRatio,'xMidYMid meet');
 assert.equal(image.sourceWidth,picture.artworkWidth);assert.equal(image.sourceHeight,picture.artworkHeight);
 for(const [key,value]of Object.entries({x:image.x,y:image.y,width:image.width,height:image.height}))assert.ok(Number.isFinite(value)&&(key==='width'||key==='height'?value>0:value>=0),label+' invalid image '+key);
 assert.ok(inside(image,image.container),label+' image extends outside its allotted container');
 assert.ok(inside(image.container,{x:0,y:0,width,height}),label+' image container extends outside the output');
 near(image.width/image.height,picture.artworkWidth/picture.artworkHeight,label+' changed the original aspect ratio',.00001);
 for(const key of ['x','y','width','height'])near(Number(tag.match(new RegExp('\\b'+key+'="([^"]+)"'))?.[1]),image[key],label+' SVG disagrees with image placement '+key);
 if(placements.gutter)assert.ok(!overlaps(image,placements.gutter),label+' image crosses the central safety gutter');
}

function checkCopy(output,plan,label){
 const runs=output.placements.textRuns;
 assert.deepEqual(counts(runs.map(slotKey)),counts(plan.copy.slots.map(slotKey)),label+' omitted, duplicated, or invented an original copy block');
 const rendered=counts(leafText(output.svg));
 for(const run of runs){
  assert.ok(Array.isArray(run.lines)&&run.lines.length,label+' has no visible lines for '+run.role);
  assert.equal(run.lines.join(''),run.text.replace(/\r?\n/g,''),label+' changed the characters or spaces in '+run.role);
  const frame=output.placements.textFrames.find(f=>f.id===run.frameId);
  assert.ok(frame,label+' has no frame for '+run.role);
  assert.ok(inside(run,frame),label+' text overflows its frame: '+run.role);
  for(const line of run.lines){const n=rendered.get(line)||0;assert.ok(n>0,label+' reports text that is missing from SVG: '+run.role);rendered.set(line,n-1);}
 }
 assert.ok([...rendered].every(([text,n])=>!text.trim()||n===0),label+' contains unapproved visible text');
}

const formats=['週刊誌の表紙','カルチャー誌の表紙','ファッション雑誌の表紙','インタビュー誌面','見開き特集','新聞の一面'];
for(const design of formats){
 const plan=planFor({design});
 for(const picture of pictures){
  const label=design+' / '+picture.artworkWidth+':'+picture.artworkHeight,output=renderEditorialLayout(plan,picture);
  checkSourceAndGeometry(output,picture,label);checkCopy(output,plan,label);
  if(design==='インタビュー誌面'){
   const {width,height,placements}=output;
   assert.ok(placements.image.width*placements.image.height/(width*height)>=.28,'Interview artwork must be a large lead image, not an inset covering 8% of the page');
   for(const frame of placements.textFrames)assert.ok(!overlaps(placements.image,frame),'Interview image crosses text frame '+frame.id);
   assert.ok(!plan.copy.slots.some(s=>s.role==='ノンブル'),'A standalone interview must not invent a page number');
   assert.ok(!plan.copy.slots.some(s=>s.text.includes(selected.medium)),'Medium labels must not leak into printed editorial copy');
  }
  if(design==='見開き特集'){
   const {width,height,placements}=output,{image,gutter,textFrames}=placements;
   assert.ok(gutter,'The spread must preserve a physical central safety gutter');
   near(gutter.x,width*.47,'Gutter left edge');near(gutter.width,width*.06,'Gutter width');
   near(image.container.x,width*.07,'Image safety box left');near(image.container.y,height*.12,'Image safety box top');
   near(image.container.width,width*.34,'Image safety box width');near(image.container.height,height*.75,'Image safety box height');
   const a=textFrames.find(f=>f.roles.includes('本文1')),b=textFrames.find(f=>f.roles.includes('本文2'));
   assert.ok(a&&b&&a.id!==b.id,'The spread must retain two separate body-text frames');
   assert.ok(b.roles.includes('本文3'),'Body 3 must continue in frame B');
   near(a.x,width*.56,'Frame A left');near(a.width,width*.18,'Frame A width');near(a.y,height*.44,'Frame A start');
   near(b.x,width*.78,'Frame B left');near(b.width,width*.18,'Frame B width');near(b.y,a.y,'Both body frames start at the same height');
   for(const frame of textFrames){assert.ok(!overlaps(image,frame),'Source image crosses text frame '+frame.id);assert.ok(!overlaps(gutter,frame),'Text frame crosses the central gutter: '+frame.id);}
  }
 }
}

// Restricting text changes the actual SVG content, not just an explanatory note.
for(const type of ['文字を一切入れない','クリエイター名だけ','短いタイトル＋名前']){
 const plan=planFor({type}),output=renderEditorialLayout(plan,pictures[0]);
 checkSourceAndGeometry(output,pictures[0],type);checkCopy(output,plan,type);
 if(type==='文字を一切入れない')assert.equal((output.svg.match(/<text\b/g)||[]).length,0,'Text-off output must contain no visible text elements');
 else assert.equal(output.placements.textRuns.length,type==='クリエイター名だけ'?1:2,'Limited text must not regenerate standard editorial copy');
}

const specialName='検証 <工房> & "光" O\'Neil 🧵';
const special=planFor({line:'A&B <em title="記録">形</em> > "光"'}, {...profile,displayName:specialName});
const escaped=renderEditorialLayout(special,pictures[0]);checkCopy(escaped,special,'XML escaping');
assert.ok(!escaped.svg.includes('<工房>')&&!escaped.svg.includes('<em title='),'User text must not become SVG markup');
assert.ok(escaped.svg.includes('&lt;')&&escaped.svg.includes('&amp;')&&escaped.svg.includes('&gt;'),'Special characters must be escaped in SVG');

function paintedColors(svg){return [...new Set([...svg.matchAll(/\b(?:fill|stroke)="(#[0-9a-f]{3,8})"/gi)].map(m=>m[1].toLowerCase()))].map(hex=>{const digits=hex.slice(1),full=digits.length===3?[...digits].map(c=>c+c).join(''):digits;return [0,2,4].map(i=>parseInt(full.slice(i,i+2),16));});}
for(const palette of ['墨一色','金と黒の二色']){
 const output=renderEditorialLayout(planFor({palette}),pictures[0]),colors=paintedColors(output.svg);
 assert.ok(colors.length,'Native page colors must be explicitly declared');
 for(const [r,g,b]of colors){
  if(palette==='墨一色')assert.ok(r===g&&g===b,'Monochrome layout added a colored fill or stroke');
  else assert.ok(Math.max(r,g,b)<=32&&Math.max(r,g,b)-Math.min(r,g,b)<=3||r>=g&&g>=b&&r-b>=20,'Gold/black layout added white or an unrelated hue');
 }
}

const base=planFor();
for(const dataUrl of [undefined,'','https://example.test/image.png','data:text/html;base64,PGgxPng8L2gxPg==','data:image/svg+xml;base64,PHN2Zy8+','data:image/png;base64,','data:image/png;base64,not base64!'])assert.throws(()=>renderEditorialLayout(base,{...pictures[0],dataUrl}),'Missing or invalid artwork data must be rejected');
for(const dimensions of [{artworkWidth:0},{artworkHeight:-1},{artworkWidth:NaN},{artworkHeight:Infinity}])assert.throws(()=>renderEditorialLayout(base,{...pictures[0],...dimensions}),'Invalid source dimensions must be rejected');

const capped=renderEditorialLayout(planFor({size:'上限検証｜8192×12288｜2:3'}),pictures[1]);
checkSourceAndGeometry(capped,pictures[1],'Capped output');
assert.equal(capped.width,2731);assert.equal(capped.height,4096);
assert.ok(capped.notes.length,'Downscaled output must report the size limitation');
assert.ok(capped.svg.includes('width="2731"')&&capped.svg.includes('height="4096"'),'SVG dimensions must match the actual capped output');

applyCollection('halloween');
console.log('PASS native editorial layout: six formats × square/wide/tall original images; one uncropped image with contain geometry; spread gutter and aligned A/B body frames; every copy block and escaped character; limited text/colors; invalid image inputs rejected; 4096px size cap reported.');
