import fs from 'node:fs';
import {questions} from '../catalog.js';
import {applyCollection} from '../collection.js';
import {sampleFor} from '../examples.js';
import {optionRecipe} from '../option-recipes.js';
const unique=new Map;
for(const mode of ['halloween','everyday']){applyCollection(mode);for(const q of questions)for(const g of q.groups)for(const value of g.values){const s=sampleFor(q.key,value);if(q.key!=='palette'&&((s.kind==='image'&&!s.src.includes('japan-'))||(q.key==='theme'&&s.kind==='custom'))){const id=q.key+'\0'+value;if(!unique.has(id))unique.set(id,{key:q.key,value,oldSample:s.src||null});}}}
const groups={};for(const row of unique.values())(groups[row.key]??=[]).push(row);
const jobs=[];
const context='基準は日本の人物・街並み・生活寸法・アニメ作画。舞台を要する場合は日本の建物、路地、庭、駅、自然を使う。選択タイトルが明示する西洋の衣装・歴史・技法・建築はその特徴を保ち、日本風に無断改変しない。衣装は架空の明確な成人日本人モデルに着せる。表情・ポーズは成人日本人のアニメキャラクターで、背景は淡い日本のアトリエ。物語は日本を基盤にした一場面の出来事を描く。舞台は人物を描かず空間の固有形と距離を見せる。画風は各セルで指定技法が一目でわかるように線・影・画材・造形を完全に別々にする。陰影は局所発光と深い影を分ける。全セルを同じ艶のあるAI絵や同じ顔の正面肖像にしない。';
for(const [key,rows]of Object.entries(groups))for(let start=0;start<rows.length;start+=16){const items=rows.slice(start,start+16);const id=key+'-'+String(1+Math.floor(start/16)).padStart(2,'0');const cells=items.map((row,i)=>{const recipe=optionRecipe(key,row.value,{values:{costume:'参照画像の衣装を生かす',palette:'群青 × 月白 × 銀',medium:'現代アニメの一枚絵',collection:'halloween'}});return `セル${i+1}（${Math.floor(i/4)+1}行${i%4+1}列）：${row.value}。${recipe.sections.slice(0,4).map(x=>x.text).join(' ').slice(0,650)}`;});for(let i=items.length;i<16;i++)cells.push(`セル${i+1}：淡い無地の灰色。`);jobs.push({id,key,items,prompt:'Use case: stylized-concept. Website illustration preview atlas. 2048×2048 square image. EXACTLY FOUR COLUMNS AND FOUR ROWS, 16 equally sized square cells, strict edge-to-edge tessellation, no gutters, no dividers, NO captions, NO numbers, NO text, NO watermark. Every cell is a separate completed composition, never an object crossing cells. Order is left to right, top to bottom. These tiles will be cropped into individual website sample images, so do not make a poster or UI. '+context+'\n'+cells.join('\n')});}
fs.writeFileSync(new URL('../verification/v21/preview-jobs.json',import.meta.url),JSON.stringify({scope:'Replacement of all remaining legacy artwork preview tiles, plus missing Japanese landscape examples. Palette previews use exact native swatches separately.',jobs},null,2));
console.log(JSON.stringify({total:unique.size,groups:Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,v.length])),jobs:jobs.length}));
