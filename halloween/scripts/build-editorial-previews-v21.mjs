import fs from 'node:fs';import{createRequire}from'node:module';
import{renderEditorialLayout}from'../editorial-layout.js';import{japanPreviews}from'../japan-preview-catalog.js';
const require=createRequire(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/sharp/package.json'),sharp=require('sharp'),root=new URL('../',import.meta.url);
const cases=[
 ['fashion','v18','medium','実写風ファッション写真'],
 ['culture','v18','medium','実写風街角スナップ'],
 ['interview','v19','medium','実写風スタジオ写真'],
 ['spread','v19','medium','透明水彩']
];
const updates={};
for(const [name,version,key,value]of cases){const source=japanPreviews[key+'\u0000'+value],bytes=fs.readFileSync(new URL(source,root)),meta=await sharp(bytes).metadata();const plan=JSON.parse(fs.readFileSync(new URL('verification/'+version+'/japan-'+name+'-sample.json',root)));const layout=renderEditorialLayout(plan,{dataUrl:'data:image/jpeg;base64,'+bytes.toString('base64'),artworkWidth:meta.width,artworkHeight:meta.height});const file='japan-'+name+'-v21.jpg';await sharp(Buffer.from(layout.svg)).resize({width:1024}).jpeg({quality:86,mozjpeg:true}).toFile(new URL(file,root).pathname);updates['design\u0000'+plan.values.design]=file;fs.writeFileSync(new URL('verification/v21/'+name+'-preview.json',root),JSON.stringify({source,values:plan.values,copy:plan.copy,notes:layout.notes},null,2));}
for(const [name,path]of [['newspaper','/workspace/scratch/dadc3f79dbd6/generated_images/exec-645a1e2f-01e0-4ed8-ad0e-6964b1135ebf.png'],['weekly','/workspace/scratch/dadc3f79dbd6/generated_images/exec-371aa40d-5749-49a1-bd14-9d771fa0d017.png']]){const file='japan-'+name+'-v21.jpg';await sharp(path).jpeg({quality:90,mozjpeg:true}).toFile(new URL(file,root).pathname);updates['design\u0000'+(name==='newspaper'?'新聞の一面':'週刊誌の表紙')]=file;}
updates['design\u0000自然・都市の風景画']=japanPreviews['medium\u0000劇場アニメの背景美術'];
fs.writeFileSync(new URL('japan-preview-catalog.js',root),'// Japan-base explanatory previews only. Never sent as identity/style references.\nexport const japanPreviews='+JSON.stringify({...japanPreviews,...updates},null,2)+';\n');
console.log(updates);
