import fs from 'node:fs';
import crypto from 'node:crypto';
const base=new URL('../',import.meta.url);
const version=JSON.parse(fs.readFileSync(new URL('package.json',base),'utf8')).version;
const [catalog,collection,examples,scenes]=await Promise.all(['catalog.js','collection.js','examples.js','scene-preview-catalog.js'].map(file=>import(new URL(file+'?v='+version,base))));
const {questions,visibleQuestions,AUTO}=catalog,{applyCollection}=collection,{sampleFor}=examples;
const rows=[],totals={},automatic=[],seenFiles=new Map();
function asset(file){
 const [path,fragment]=file.replace(/^\.\//u,'').split('#'),url=new URL(path,base);
 const exists=fs.existsSync(url);
 if(!exists)return {file:path+(fragment?'#'+fragment:''),exists:false};
 const bytes=fs.readFileSync(url),hash=crypto.createHash('sha256').update(bytes).digest('hex');
 seenFiles.set(path,hash);
 return {file:path+(fragment?'#'+fragment:''),exists:true,hash,...fragment?{fragmentExists:bytes.toString().includes('id="'+fragment+'"')}:{}};
}
try{
 for(const mode of ['halloween','everyday']){
  applyCollection(mode);
  const total={all:0,visible:0,kinds:{},missing:[],titleOnly:[],byKey:{}};
  for(const q of questions){
   const auto=sampleFor(q.key,AUTO);
   automatic.push({collection:mode,key:q.key,kind:auto.kind,assets:(auto.srcs||[]).map(asset)});
   for(const g of q.groups)for(const value of g.values){
    const sample=sampleFor(q.key,value),visible=visibleQuestions.some(x=>x.key===q.key);
    const row={collection:mode,key:q.key,question:q.name,visible,group:g.label,value,kind:sample.kind,label:sample.label,...sample.kind==='image'?asset(sample.src):{}};
    if(sample.kind==='auto')row.assets=sample.srcs.map(asset);
    rows.push(row);total.all++;if(visible)total.visible++;
    total.kinds[sample.kind]=(total.kinds[sample.kind]||0)+1;total.byKey[q.key]=(total.byKey[q.key]||0)+1;
    if(row.exists===false||row.fragmentExists===false)total.missing.push({key:q.key,value,file:row.file});
    if(sample.kind==='custom')total.titleOnly.push({key:q.key,value});
   }
  }
  totals[mode]=total;
 }
}finally{applyCollection('halloween');}
const unique=[...new Map(rows.map(row=>[row.key+'\0'+row.value,row])).values()];
const files=new Map();
for(const row of unique.filter(r=>r.file)){if(!files.has(row.file))files.set(row.file,[]);files.get(row.file).push({key:row.key,value:row.value});}
const shared=[...files].filter(([file,uses])=>uses.length>1).map(([file,uses])=>({
 file,uses,classification:uses.every(s=>s.value===uses[0].value)?'same selected scene shared between scene and internal place':'one actual explanatory image serves different named selections; see uses and semantic limits'
}));
const hashFiles=new Map();
for(const [file,hash]of seenFiles){if(!hashFiles.has(hash))hashFiles.set(hash,[]);hashFiles.get(hash).push(file);}
const duplicateFiles=[...hashFiles].filter(([hash,files])=>files.length>1).map(([hash,files])=>({hash,files}));
const sceneRecords=Object.entries(scenes.scenePreviews).map(([value,item])=>{
 const meta=JSON.parse(fs.readFileSync(new URL(item.file.replace('.jpg','.json'),base),'utf8'));
 return {value,file:item.file,dimensions:meta.dimensions,hash_sha256:meta.hash_sha256,visualQA:meta.visualQA};
});
const missingCount=Object.values(totals).reduce((n,t)=>n+t.missing.length,0);
const report={
 version,checkedAt:new Date().toISOString(),
 status:missingCount?'pending_other_asset_work':'file_coverage_complete',
 scope:'Every group option in both collections plus all implicit AUTO previews; physical availability is separate from visual semantic review.',
 totals,uniqueKeyValues:unique.length,uniqueVisibleKeyValues:new Set(rows.filter(r=>r.visible).map(r=>r.key+'\0'+r.value)).size,
 implicitAutomaticPreviews:automatic,
 nativePreviews:{palette:'49 precise SVG colour swatches; reference-colour option intentionally uses the upload',angle:'36 native camera position/projection diagrams',design:'41 native format layouts, with remaining actual artwork choices; SVG fragments are checked as named elements'},
 sharedFiles:shared,identicalBytesInDifferentPhysicalFiles:duplicateFiles,
 correctedOriginalScenePreviews:sceneRecords,
 semanticCorrections:[
 {values:Object.keys(scenes.scenePreviews).slice(0,12),before:'18 title-only scene/place option occurrences',after:'12 independently generated actual environments; repeated scene/place names share their own same environment'},
 {values:['花光のガラス庭園','街角アニメ日和','ふわ彩の祝祭室'],before:'Mountain-lake, beach and woman-with-cat portrait respectively',after:'Individual actual glass garden, urban corner and supported paper/fabric/ceramic celebration room'},
 {values:['和雅・花景','水鏡の幻想空間'],before:'Magazine fashion page and underwater woman-with-jellyfish portrait',after:'Original Japanese wood-and-flower garden and supported interior with water-light projection, transparent boundaries and floor-wall reflections'},
 {values:['死神の休日','鏡の向こうの自分','雨上がりの怪談'],before:'Generic cafe, ordinary reflection and ordinary rain portrait',after:'Visible reaper role and resting scythe; reflection mouth differs; wet footprints climb a vertical wall noticed by the person'},
 {values:['ユニコーン','エイリアン'],before:'Human beside a separate unicorn; human-skinned elf-like body',after:'One main character with unicorn horn/mane/ears/tail; one clothed main character with alien blue-green skin and wide membrane ears'},
 {values:['宝石ホログラムアニメ','クリスタル透光アニメ','クリスタルホログラム造形アニメ'],before:'Opaque face under nearby shiny panels or vague material treatment',after:'Individual new broad-face transmissive projection, thin anime coloured planes and thick crystal refraction samples; opaque garment coverage retained'}
 ],
 visualReview:{
  scope:['115 pre-existing medium samples inspected by material/technique at montage size; new styles use their individual generator QA records','121 costume samples inspected by role category, with suspicious ones inspected at full size','42 mood/expression samples inspected at montage size, without treating mood artwork as a source person','72 pose previews from the previous completed pose review, including all 24 new individual illustrations','All 20 new scene previews inspected individually; eight replaced scenes compared against current named scene contracts','Remaining 62 ordinary scene assets and original Halloween scene artwork reviewed at scene-category montage scale for named action/space'],
  remainingAmbiguities:['星糸のアトリエ shares the actual skylight atelier with 天窓のあるアトリエ; distinctive light-thread motif is less visible than the room structure','夢彩の魔法書庫 shares the actual witch library; 宵彩の色硝子堂 shares a chapel interior. The spaces are semantically close, but are not individual scene artwork.'],
  limits:['File existence, dimensions, distinct hashes and stored QA do not prove anatomy, physical optics, output identity or generated-image compliance.','Small montage review verifies visible category motifs, not every clothing hem, shoe, finger or whole-body detail.','Semantic scene previews are explanatory UI artwork and are not used as character or drawing-style source images.']
 },
 rows:unique.map(({collection,question,group,label,...row})=>row)
};
const destination=new URL('audit/sample-preview-audit-v28.json',base);
fs.writeFileSync(destination,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,all:Object.values(totals).reduce((n,t)=>n+t.all,0),visible:Object.values(totals).reduce((n,t)=>n+t.visible,0),unique:unique.length,missing:missingCount,titleOnly:Object.values(totals).reduce((n,t)=>n+t.titleOnly.length,0),newScenes:sceneRecords.length,sharedFiles:shared.length,duplicatePhysicalFiles:duplicateFiles.length,output:'audit/sample-preview-audit-v28.json'}));
