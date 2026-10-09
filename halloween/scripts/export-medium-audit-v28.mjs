import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {questions} from '../catalog.js?v=28.4.5';
import {artworkBasisValues,artworkBasis,artworkBasisContract} from '../artwork-basis.js?v=28.4.5';
import {illustrationBases} from '../artwork-basis-illustration.js?v=28.4.5';
import {traditionalBases} from '../artwork-basis-traditional.js?v=28.4.5';
import {materialBases} from '../artwork-basis-material.js?v=28.4.5';
import {movementsPhotoBases} from '../artwork-basis-movements-photo.js?v=28.4.5';
import {luminousBases} from '../artwork-basis-luminous.js?v=28.4.5';
import {referenceWorldArtworkBases} from '../world-bases.js?v=28.4.5';
import {optionRecipe} from '../option-recipes.js?v=28.4.5';

// Reproducible documentation export. A reference registered in code is not
// evidence that its page was retrieved or that a generated image succeeded.
const output=path.resolve(process.argv[2]||fileURLToPath(new URL('../audit/',import.meta.url)));
fs.mkdirSync(output,{recursive:true});
const version=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8')).version;
const groups=[['illustration','artwork-basis-illustration.js',illustrationBases],['traditional','artwork-basis-traditional.js',traditionalBases],['material-digital','artwork-basis-material.js',materialBases],['movements-photography','artwork-basis-movements-photo.js',movementsPhotoBases],['luminous-optical','artwork-basis-luminous.js',luminousBases],['reference-world-synthesis','world-bases.js',referenceWorldArtworkBases]];
const family=new Map(groups.flatMap(([name,file,entries])=>entries.map(entry=>[entry.value,{name,file}])));
const mediumValues=questions.find(q=>q.key==='medium').groups.flatMap(group=>group.values);
const synthesizedWorldValues=referenceWorldArtworkBases.map(entry=>entry.value);
const generalProcessWorldValues=new Set(['薄膜光彩アニメ','白域幾何・宇宙彩アニメ','艶彩幻想アニメ']);
const reviewFiles=fs.readdirSync(output).filter(file=>file.endsWith('source-review.json')).sort();
const sourceReviews=reviewFiles.flatMap(file=>{
 const document=JSON.parse(fs.readFileSync(path.join(output,file),'utf8'));
 return (document.records||[]).map(record=>({...record,reviewFile:file,owner:document.owner||null}));
});
const methodsReviewPath=path.join(output,'creator-methods-research-v28.json');
const methodsReview=fs.existsSync(methodsReviewPath)?JSON.parse(fs.readFileSync(methodsReviewPath,'utf8')):null;
// Preserve the difference between a read component tutorial and an unknown
// complete workflow. Never fabricate review records for other registered URLs.
if(methodsReview?.status?.startsWith('public-source-methods-reviewed')){
 for(const source of methodsReview.sources||[]){
  if(!source.sourceURL||!source.readScope||!source.observedMethod?.length)continue;
  sourceReviews.push({url:source.sourceURL,status:'confirmed_text',textReviewed:true,supportScope:'general-process',
   reviewFile:'creator-methods-research-v28.json',reviewedDate:methodsReview.reviewedDate,readScope:source.readScope,
   comparison:source.observedMethod.join(' '),adoptedGenericMethod:source.adoptedGenericMethod||[],
   limits:[source.attribution,...source.explicitUnknown||[]].filter(Boolean).join(' '),citationRefs:source.citationRefs||[]});
 }
}
const reviewed=new Map();
for(const record of sourceReviews){const previous=reviewed.get(record.url)||[];reviewed.set(record.url,[...previous,record]);}
const supportedText=record=>record.textReviewed===true&&['confirmed_text','confirmed_text_cached_primary','confirmed_substitute_text'].includes(record.status);
const rank=record=>({confirmed_text:5,confirmed_text_cached_primary:4,confirmed_substitute_text:3,unsupported:2,retrieval_failed:1}[record.status]||0);
function verifyReference(reference){
 const records=reviewed.get(reference.url)||[],best=[...records].sort((a,b)=>rank(b)-rank(a))[0]||null;
 const contextOnly=best?.supportScope==='work_context_only'||best?.supportLevel==='medium_record_only';
 const scope=contextOnly?'work_context_only':best?.supportScope||best?.supportLevel||'see_comparison_and_limits';
 const verification=!best?'監査記録なし':best.status==='retrieval_failed'?'取得を試行したが本文取得不能':best.status==='unsupported'?'取得したページに工程を裏付ける本文なし':best.status==='confirmed_substitute_text'?'登録旧URLの本文取得不能／別の現行一次本文を代替照合':best.status==='confirmed_text_cached_primary'?'公式ページの一次検索キャッシュ本文を照合／直接open取得不能':contextOnly?'本文取得／作品・年代・媒体記録のみ（技法工程の直接実証なし）':scope==='linked_technique_text'?'登録URLは索引／関連する一次本文を追加照合':best.retrieval==='previous_body'?'前回実読した一次本文の記録を利用／今回の直接再取得なし':'一次本文を取得し技法・要素を部分照合（全工程の同一性や生成達成は別）';
 return {...reference,verification,verificationStatus:best?.status||'unreviewed',supportScope:scope,verificationRecord:best,verificationRecords:records,textSupported:records.some(supportedText),techniqueElementsSupported:records.some(record=>supportedText(record)&&record.supportScope!=='work_context_only'&&record.supportLevel!=='medium_record_only')};
}
function coverage(references){
 const counts={registered:references.length,attempted:0,supportedText:0,workContextOnly:0,cached:0,substitute:0,unsupported:0,retrievalFailed:0,unreviewed:0};
 for(const reference of references){
  if(reference.verificationRecord)counts.attempted++;
  if(reference.textSupported)counts.supportedText++;
  if(reference.supportScope==='work_context_only')counts.workContextOnly++;
  if(reference.verificationStatus==='confirmed_text_cached_primary')counts.cached++;
  if(reference.verificationStatus==='confirmed_substitute_text')counts.substitute++;
  if(reference.verificationStatus==='unsupported')counts.unsupported++;
  if(reference.verificationStatus==='retrieval_failed')counts.retrievalFailed++;
  if(reference.verificationStatus==='unreviewed')counts.unreviewed++;
 }
 return counts;
}
const testEvidencePath=path.join(output,'medium-test-evidence-v28.json');
const testEvidence=fs.existsSync(testEvidencePath)?JSON.parse(fs.readFileSync(testEvidencePath,'utf8')):{records:[],limits:['実行結果の外部記録なし。検査名だけでPASSとは扱わない。']};
const conversionPath=path.join(output,'medium-conversion-audit-v28.json');
const conversion=fs.existsSync(conversionPath)?JSON.parse(fs.readFileSync(conversionPath,'utf8')):null;
const conflicts=[
 {id:'CRYSTAL_IDENTITY',styles:['クリスタルホログラム造形アニメ','クリスタル透光アニメ','宝石ホログラムアニメ','水墨画'],before:'fixed facial geometry / feature spacing / 顔の形・配置比率を保持',after:'識別できる特徴の組合せ・髪型・年齢感を保ち、細寸法は選択された線・造形・材質へ翻訳',reason:'参照の細寸法を固定しない一般identity契約と、写真から2Dへ再構築する契約の実衝突。',files:['medium-execution.js','crystal-anime.js','japan-direction.js']},
 {id:'CRYSTAL_MOTION_CAMERA',styles:['クリスタルホログラム造形アニメ'],before:'静止でも微かな髪の動き／全カメラへ迫る近景と短縮遠近',after:'指定投影・距離で見える面の前後と遮蔽。移動・風が明示され、その材質に生じる場合だけ動勢。',reason:'静止ポーズや真横・垂直・遠景の選択へ、画風由来の動作と広角演出を追加していた。',files:['japan-direction.js','optical-effects.js','option-recipes.js','artwork-basis-luminous.js']},
 {id:'OPTICAL_CLOTHING_OCCLUSION',styles:['クリスタルホログラム造形アニメ','クリスタル透光アニメ','宝石ホログラムアニメ'],before:'人体全体と衣装に連続した透明材質＋被覆を減らさない',after:'画面に見える人体の透明造形を保ち、指定衣装の構造・重なり・被覆を保持。衣装で覆う人体を透視窓へ変えない（衣装の透けを明示した選択は実行）。',reason:'衣装の外形だけ残す解釈では、透明化した衣服を通して被覆域が見え得るという実際の指示の曖昧さ。拒否原因との因果関係は未確認。',files:['medium-execution.js','crystal-anime.js','japan-direction.js','optical-effects.js','artwork-basis-luminous.js']},
 {id:'SCENERY_METHOD_OMISSION',styles:artworkBasisValues.filter(value=>value!=='発光幻想アニメ'),before:'basisが先頭に追加されたsectionsからslice(0,4)を取るため、個別景物工程がmethodから脱落',after:'basisと日本補足を除く個別景物工程の先頭4件をmethodに含める。basisは既存どおり別途prepend。',reason:'個別レシピ全文は残るが、実行用methodへ景物専用工程が渡らない。107作風のnoPerson分岐で共通の実装不足。',files:['option-execution.js']}
];
const selected={medium:'クリスタルホログラム造形アニメ',costume:'アンティークの旅装',pose:'振り向く',angle:'真横90度',palette:'くすみシアン × 錆 × 象牙'};
const axes={line:/線|輪郭|描線|筆|stroke|contour/i,shape:/形|面|比例|構造|外形|立体|geometry/i,color:/色|配色|顔料|paint|value/i,material:/素材|材質|紙|墨|画材|絵具|顔料|ガラス|膜|層|木|布|繊維|粒|光学|写真|model/i,lighting:/光|影|反射|明暗|明度|露光|階調|shadow/i};
const rows=mediumValues.map((value,index)=>{
 const entry=artworkBasis(value),kind=family.get(value);
 const person=optionRecipe('medium',value,{values:{...selected,medium:value},noPerson:false});
 const scenery=optionRecipe('medium',value,{values:{...selected,medium:value,costume:'風景を主役にする'},noPerson:true});
 const own=scenery.sections.filter(s=>s.label!=='日本を基準にした個別条件'&&!s.label.startsWith('作画基準／')).slice(0,4);
 const perReference=entry.references.map(verifyReference),referenceCounts=coverage(perReference);
 const criteria=[...entry.basis,...entry.process];
 const domain=Object.fromEntries(Object.entries(axes).map(([key,regex])=>[key,criteria.filter(text=>regex.test(text))]));
 return {index:index+1,medium:value,family:kind.name,basisFile:kind.file,basisStatus:entry.status,
  basis:entry.basis,process:entry.process,sceneryProcess:entry.sceneryProcess,sourceNote:entry.sourceNote||null,checks:entry.checks,avoid:entry.avoid,domains:domain,
  references:perReference,referenceCounts,referenceCoverage:entry.references.length?'登録'+referenceCounts.registered+'件／取得試行'+referenceCounts.attempted+'件／本文または代替本文'+referenceCounts.supportedText+'件（作品情報のみ'+referenceCounts.workContextOnly+'件、公式cache'+referenceCounts.cached+'件、代替URL'+referenceCounts.substitute+'件）／工程本文なし'+referenceCounts.unsupported+'件／取得不能'+referenceCounts.retrievalFailed+'件／監査記録なし'+referenceCounts.unreviewed+'件':'ユーザー提示作例の分析由来の合成基準／外部資料URL登録なし',
  recipe:{known:person.known&&scenery.known,family:person.family,personSections:person.sections.length,scenerySections:scenery.sections.length,personMethodCharacters:person.execution.method.length,sceneryMethodCharacters:scenery.execution.method.length,sceneryOwnMethodRetained:value==='発光幻想アニメ'?scenery.execution.method.includes(scenery.executionMethod):own.every(section=>scenery.execution.method.includes(section.text))},
  fixedConflicts:conflicts.filter(conflict=>conflict.styles.includes(value)).map(({id,reason,after})=>({id,reason,after})),
  instructionChecks:['check-medium-conflicts-v28.mjs: 2モード×人物あり/なし、選択カメラ保持・専用景物工程・資料名URL非混入','check-artwork-reference-v28.mjs: 2モード×人物あり/なし×2配色、全'+mediumValues.length+'基準のnative/artwork/repairとactual compact伝播、一般工程の出典と個別作品工程の未確認を区別','check-character-identity-v27.mjs: 2モード×配色、写真作風は自然な人体/材質へ再構築','check-medium-conversion-v28.mjs: 2モード×人物/景物/モチーフ/図案、写真化と描画変換の実際のhandoff値を記録'],
  instructionTestResults:testEvidence.records.filter(record=>['check-medium-conflicts-v28.mjs','check-artwork-reference-v28.mjs','check-character-identity-v27.mjs','check-medium-conversion-v28.mjs'].includes(record.script)),conversionContracts:conversion?.rows.find(row=>row.medium===value)||null,evidenceType:entry.references.length?'一次本文の要素照合と命令契約の検査。作風名や技法記述の存在だけで生成画像の達成を判定しない。':'ユーザー提示作例の描画特性を整理した合成基準と命令契約の検査。外部資料の本文照合や生成画像の達成を主張しない。',
  generatedImageVerification:'この監査では生成なし・生成画像の'+mediumValues.length+'作風合格は未確認',
  rejectionCause:'内部判定は非公開。今回の拒否とこの作風の指示競合との因果関係は不明。'};
});
assert.equal(rows.length,mediumValues.length);assert.ok(rows.every(row=>row.recipe.known&&row.recipe.sceneryOwnMethodRetained));
assert.deepEqual(rows.map(row=>row.medium),artworkBasisValues,'Every public medium must retain its distinct exported basis');
assert.equal(rows.filter(row=>row.family!=='reference-world-synthesis').length,mediumValues.length-synthesizedWorldValues.length);
assert.ok(rows.filter(row=>row.family!=='reference-world-synthesis').every(row=>row.references.length>=1),'Established bases must retain their registered documentation');
assert.equal(rows.filter(row=>row.family==='reference-world-synthesis').length,synthesizedWorldValues.length);
for(const row of rows.filter(row=>row.family==='reference-world-synthesis')){
 assert.equal(row.basisStatus,'synthesis','Analyzed styles must never become documented exact artist workflows');
 if(generalProcessWorldValues.has(row.medium)){
  assert.match(row.sourceNote,/一般工程.*個別制作記事.*完全工程.*未確認/);
  assert.ok(row.references.length>0&&row.references.every(reference=>reference.scope==='general-process'),'New synthesized styles may reference only reviewed general components');
 }else assert.equal(row.references.length,0,'Unreviewed example provenance must not gain invented documentation URLs');
}
assert.ok(rows.every(row=>row.references.every(reference=>reference.verificationRecord||reference.verificationStatus==='unreviewed')),'Missing review records must remain explicitly unreviewed rather than be certified');
const sourceMap=new Map();
for(const row of rows)for(const reference of row.references){
 const current=sourceMap.get(reference.url)||{url:reference.url,title:reference.title,kind:reference.kind,styles:[],verification:reference.verification,verificationStatus:reference.verificationStatus,supportScope:reference.supportScope,verificationRecords:reference.verificationRecords};
 current.styles.push({medium:row.medium,family:row.family,entryIndex:row.index,comparison:reference.note,basis:row.basis,checks:row.checks});sourceMap.set(reference.url,current);
}
const uniqueReferences=[...sourceMap.values()];
const sourceSummary={registered:uniqueReferences.length,attempted:uniqueReferences.filter(reference=>reference.verificationRecords.length).length,directText:0,workContextOnly:0,linkedText:0,previousBody:0,cachedPrimaryText:0,substituteText:0,unsupported:0,retrievalFailed:0,unreviewed:0};
for(const reference of uniqueReferences){
 const best=[...reference.verificationRecords].sort((a,b)=>rank(b)-rank(a))[0];
 if(!best)sourceSummary.unreviewed++;
 else if(best.status==='unsupported')sourceSummary.unsupported++;
 else if(best.status==='retrieval_failed')sourceSummary.retrievalFailed++;
 else if(best.status==='confirmed_substitute_text')sourceSummary.substituteText++;
 else if(best.status==='confirmed_text_cached_primary')sourceSummary.cachedPrimaryText++;
 else if(reference.supportScope==='work_context_only')sourceSummary.workContextOnly++;
 else if(reference.supportScope==='linked_technique_text')sourceSummary.linkedText++;
 else if(best.retrieval==='previous_body')sourceSummary.previousBody++;
 else sourceSummary.directText++;
}
const watercolorScenery=optionRecipe('medium','透明水彩',{values:{medium:'透明水彩',costume:'風景を主役にする',palette:'くすみシアン × 錆 × 象牙'},noPerson:true});
const beforeScenery=artworkBasisContract('透明水彩',{noPerson:true}).sections.slice(0,4).map(section=>section.text).join(' ');
const afterScenery=watercolorScenery.sections.filter(s=>s.label!=='日本を基準にした個別条件'&&!s.label.startsWith('作画基準／')).slice(0,4);
const evidence={version,checkedOn:new Date().toISOString().slice(0,10),limits:['登録URLと本文の読取記録を区別し、技法本文・作品情報・工程本文なし・取得不能・公式cache・代替URL・監査記録なしを明示する。記録のないURLを取得済みと扱わない。','一般工程の部分照合であり、合成作風や個別添付作品の完全工程・作者のプロンプトを確認したという主張ではない。','コード検査のPASSは画像生成成功・作風忠実度・外部審査通過の保証ではない。','公開サイトの最新版の版数・配信成功はparentの別検証。'],reviewFiles:[...reviewFiles,...(methodsReview?['creator-methods-research-v28.json']:[])],sourceReviews,testEvidence,conversionSummary:conversion?{status:conversion.status,counts:conversion.counts,limits:conversion.limits}:null,conflicts,
 sceneryMethodExample:{medium:'透明水彩',beforeAlgorithm:'sections.slice(0,4)（basis prepend後）',beforeMethod:beforeScenery,omittedOwnSection:afterScenery[0],afterOwnSections:afterScenery,afterActualMethod:watercolorScenery.execution.method},
 summary:{styles:rows.length,documented:rows.filter(r=>r.basisStatus==='documented').length,synthesis:rows.filter(r=>r.basisStatus==='synthesis').length,uniqueRegisteredURLs:sourceMap.size,sourceSummary,reviewedUniqueURLs:reviewed.size,reviewRecords:sourceReviews.length,registeredURLsWithReview:rows.flatMap(r=>r.references).reduce((set,reference)=>(reference.verificationRecord&&set.add(reference.url),set),new Set()).size,registeredURLsMissingReview:[...new Set(rows.flatMap(r=>r.references.filter(s=>!s.verificationRecord).map(s=>s.url)))],registeredURLsWithSupportedText:[...new Set(rows.flatMap(r=>r.references.filter(s=>s.textSupported).map(s=>s.url)))].length,registeredURLsUnsupportedOrFailed:[...new Set(rows.flatMap(r=>r.references.filter(s=>!s.textSupported).map(s=>s.url)))],allRegisteredURLsAttempted:rows.every(r=>r.references.every(s=>s.verificationRecord)),generatedImages:0}};
const csvFields=['index','medium','family','basisStatus','referenceCoverage','line','shape','color','material','lighting','referenceURLs','sourceNotes','sourceVerification','sourceComparisons','instructionTestStatus','conversionContractStatus','fixedConflicts','instructionChecks','sceneryOwnMethodRetained','evidenceType','generatedImageVerification','rejectionCause'];
const flat=rows.map(row=>({...row,...Object.fromEntries(Object.entries(row.domains).map(([key,value])=>[key,value.join(' | ')||'独立項目としての明文なし（他基準と共同／適用範囲を要検討）'])),referenceURLs:row.references.map(r=>r.url).join(' | '),sourceNotes:row.references.map(r=>r.title+': '+r.note).join(' | '),sourceVerification:row.references.map(r=>r.url+': '+r.verification).join(' | '),sourceComparisons:row.references.map(r=>r.url+': '+(r.verificationRecord?.comparison||'本文照合記録なし')+'／限界：'+(r.verificationRecord?.limits||'根拠未確認')).join(' | '),instructionTestStatus:row.instructionTestResults.map(record=>record.script+': '+record.status+' ('+record.evidenceType+')').join(' | ')||'実行結果記録なし',conversionContractStatus:row.conversionContracts?'PASS instruction_contract; '+row.conversionContracts.cases.length+' cases; 実入力/生成画像は未確認':'未実行',fixedConflicts:row.fixedConflicts.map(c=>c.id+': '+c.reason+' → '+c.after).join(' | ')||'この監査で新たな実衝突を確定していない（完全な意味解釈保証ではない）',instructionChecks:row.instructionChecks.join(' | '),sceneryOwnMethodRetained:row.recipe.sceneryOwnMethodRetained}));
const quote=value=>'"'+String(value??'').replaceAll('"','""')+'"';
fs.writeFileSync(path.join(output,'medium-comparison-'+mediumValues.length+'-v28.json'),JSON.stringify({version,evidenceScope:evidence.limits,rows},null,2)+'\n');
fs.writeFileSync(path.join(output,'medium-comparison-'+mediumValues.length+'-v28.csv'),'\uFEFF'+[csvFields.map(quote).join(','),...flat.map(row=>csvFields.map(field=>quote(row[field])).join(','))].join('\r\n')+'\r\n');
fs.writeFileSync(path.join(output,'medium-audit-evidence-v28.json'),JSON.stringify(evidence,null,2)+'\n');
fs.writeFileSync(path.join(output,'source-index.json'),JSON.stringify({version,sourceCount:sourceMap.size,styles:rows.length,sourceSummary,sources:uniqueReferences},null,2)+'\n');
console.log(JSON.stringify({output,...evidence.summary}));
