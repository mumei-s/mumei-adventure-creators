import fs from 'node:fs';
import {createRequire} from 'node:module';
import {buildEditorial} from '../editorial.js?v=22.0.2';
import {renderEditorialLayout} from '../editorial-layout.js?v=22.0.2';
const require=createRequire(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/sharp/package.json');
const sharp=require('sharp');
const root=new URL('../',import.meta.url).pathname;
const dataUrl='data:image/png;base64,'+fs.readFileSync(root+'/japan-photo-v18.png').toString('base64');

for(const [name,design] of [['fashion','ファッション雑誌の表紙'],['weekly','週刊誌の表紙'],['newspaper','新聞の一面'],['culture','カルチャー誌の表紙']]){
 const values={design,medium:'実写風ファッション写真',theme:'街角のファッション',costume:'現代のテーラードスーツ',place:'街角の歩道',palette:design==='週刊誌の表紙'?'原色のポップカラー':'モノクローム',type:'デザインに合わせて自動編集',line:'セリフなし',size:'縦見本｜1024×1536｜2:3',collection:'everyday'};
 const copy=buildEditorial({displayName:'春野 澪',topics:['秋の装い','色と暮らし']},values,()=>.26);
 if(design==='週刊誌の表紙'){const title=copy.slots.find(s=>s.role==='誌名');if(title)title.text='週刊創作';}
 const plan={values,copy};
 const layout=renderEditorialLayout(plan,{dataUrl,artworkWidth:1024,artworkHeight:1536});
 if(process.argv.includes('--svg'))fs.writeFileSync(root+'/verification/v18/japan-'+name+'-sample.svg',layout.svg);
 fs.writeFileSync(root+'/verification/v18/japan-'+name+'-sample.json',JSON.stringify({values,copy,placements:layout.placements,notes:layout.notes},null,2));
 await sharp(Buffer.from(layout.svg)).png().toFile(root+'/japan-'+name+'-v18.png');
 console.log(name,layout.notes);
}

