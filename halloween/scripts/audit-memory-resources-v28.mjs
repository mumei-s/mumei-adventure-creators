import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';
import {resolveSelections} from '../catalog.js?v=28.4.6';
import {buildDirection} from '../direction.js?v=28.4.6';
import {productionPlan} from '../production-plan.js?v=28.4.6';
import {composePrompt} from '../prompt.js?v=28.4.6';
import {stagePrompts} from '../production-workflow.js?v=28.4.6';
import {createHistoryPersistence} from '../history-persistence.js?v=28.4.6';
import {restoreHistoryRecord,clearRestoredHistoryCache,restoredHistoryCacheInfo} from '../history-storage.js?v=28.4.6';
import {IMAGE_RESOURCE_LIMITS,fittedRasterSize} from '../image-resources.js?v=28.4.6';

const root=fileURLToPath(new URL('../',import.meta.url)),random=()=>.28,profile={displayName:'保存容量の検査',topics:[]};
const values=resolveSelections({sceneUnified:true,design:'新聞の一面',medium:'クリスタルホログラム造形アニメ',theme:'宇宙のHalloween',costume:'ヴィクトリア朝の正装',pose:'片手を差し出す',type:'新聞風・記事と段組み'},random);
const started=performance.now(),production=productionPlan(profile,values,buildDirection([],values.mood,random,'halloween',values),'halloween',random),planMs=performance.now()-started;
let tick=performance.now();const prompt=composePrompt({profile,values,variant:production.variant,references:[],edition:'LATEST',preparedPlan:production}),promptMs=performance.now()-tick;
tick=performance.now();const stages=stagePrompts(production),stageMs=performance.now()-tick;assert.equal(stagePrompts(production),stages,'Stage strings are reused for the same plan');
const record={version:'28.4.2',collection:'halloween',profile,values,variant:production.variant,production,stages,edition:'LATEST',references:[],date:'2026-10-08T00:00:00Z',count:12,prompt};
const original={history:Array.from({length:12},(_,i)=>({...record,edition:i?'OLD-'+i:'LATEST',date:new Date(Date.parse(record.date)-i*1000).toISOString(),count:12-i})),used:Array.from({length:2000},(_,i)=>({signature:'used-'+i,face:'left',pose:'手を上げる',layout:'中央配置'})),count:12};
const byteEstimate=value=>JSON.stringify(value).length*2,raw=JSON.stringify(original);
class Database{
 constructor(){this.state=null;this.reads=0;}
 async read(){this.reads++;return structuredClone(this.state);}
 async update(key,updater){const result=updater(structuredClone(this.state));if(result.write!==false)this.state=structuredClone(result.state);return {...result,saved:result.write!==false};}
}
const seedDB=new Database(),legacyStorage={getItem:()=>raw,setItem(){throw new DOMException('legacy origin is full','QuotaExceededError');}},seed=createHistoryPersistence({key:'audit',storage:legacyStorage,database:seedDB,now:()=>100});
await seed.load();const saved=await seed.save(original);assert.ok(saved.saved);seed.close();
const packed=seedDB.state,requests=101;
// Baseline recreates the original load path: parse the local key and read the
// entire database state for every request. This is not a live browser trace.
const oldDB=new Database();oldDB.state=packed;let beforeParses=0;tick=performance.now();
for(let i=0;i<requests;i++){JSON.parse(raw);beforeParses++;await oldDB.read();}
const beforeMs=performance.now()-tick;
const newDB=new Database();newDB.state=packed;let afterGets=0;
const channel={addEventListener(){},removeEventListener(){},postMessage(){},close(){}};
const session=createHistoryPersistence({key:'audit',database:newDB,storage:{getItem(){afterGets++;return raw;},setItem(){}},channelFactory:()=>channel,eventTarget:null,documentTarget:null});
tick=performance.now();for(let i=0;i<requests;i++)await session.load();const afterMs=performance.now()-tick;
assert.equal(oldDB.reads,101);assert.equal(newDB.reads,1);assert.equal(afterGets,1);assert.equal(session.cacheInfo().localParsed,false);
clearRestoredHistoryCache();for(const r of packed.history)await restoreHistoryRecord(r);assert.equal(restoredHistoryCacheInfo().records,2);const restoredInfo=restoredHistoryCacheInfo();clearRestoredHistoryCache();session.close();
const modules=new Map();
function readModule(file){if(modules.has(file))return;const code=fs.readFileSync(file,'utf8');modules.set(file,code);for(const match of code.matchAll(/(?:import|export)\s+(?:[^'";]*?\s+from\s+)?['"](\.[^'"]+)['"]/g)){const child=path.resolve(path.dirname(file),match[1].split('?')[0]);if(child.endsWith('.js')&&fs.existsSync(child))readModule(child);}}
readModule(path.join(root,'app.js'));
const fetchModules=[...modules].filter(([,code])=>/\bfetch\s*\(/.test(code)).map(([file])=>path.relative(root,file));assert.equal(fetchModules.length,0);
const sourcePixels=4000*3000,preview=fittedRasterSize(4000,3000),previewPixels=preview.width*preview.height;
const report={
 generatedAt:new Date().toISOString(),sourceVersion:'28.4.2',scope:'Halloween frontend and its reachable module graph; no INSIGHT repository changes, no article or image downloads, no generated images',
 measurement:{environment:process.version,kind:'Node instrumented control flow plus exact serialization and calculated raster bounds',timings:'One local execution, including structuredClone to model database reads; not a browser benchmark',notMeasured:['Live browser native heap/GPU memory','Native decoder peak memory during createImageBitmap resize','Device-specific canvas/clipboard/share limits','Visual fidelity of generated or composed images','INSIGHT runtime: supplied prior symptoms only']},
 sourceReads:{reachableModules:modules.size,directFetchModules:fetchModules,publicArticleFetchesInFrontend:0,explanation:'The current loadProfile only constructs creatorHandoff; the conversation assistant checks public source information. Supabase/profile article readers remain outside the frontend import graph.'},
 history:{fixture:{histories:12,signatures:2000,values},serializationUtf16ByteEstimate:{raw:raw.length*2,packedDatabase:byteEstimate(packed),reductionPercent:Number(((1-byteEstimate(packed)/(raw.length*2))*100).toFixed(1)),note:'String storage estimate, not measured JavaScript heap or IndexedDB disk size'},samePageRepeatedRequests:{requests,baselineFullDatabaseReads:oldDB.reads,updatedFullDatabaseReads:newDB.reads,baselineLocalParses:beforeParses,updatedLocalKeyReads:afterGets,baselineMs:Number(beforeMs.toFixed(2)),updatedMs:Number(afterMs.toFixed(2)),baseline:'Original load control flow reproduced against the same mock database fixture',updated:'Actual createHistoryPersistence implementation with a notification channel'},restoredDetailCache:{previousMaximumRecords:12,currentMeasuredRecords:restoredInfo.records,currentLimit:restoredInfo.limit},legacyParsedStateRetainedAfterDatabaseRead:false,correctness:'Cross-tab notifications, concurrent singleflight, visible/BFCache invalidation, no-channel fresh-read fallback, exact old prompt/plan/stages, clear epochs, atomic quota failure and database commit failure verified by check-memory-resources-v28 and check-history-persistence-v28',fallback:'Original local key and unrelated keys remain untouched after database migration. A later database failure can reparse the original key; a live tab keeps the latest committed clear epoch.'},
 production:{oneFixtureUtf16ByteEstimate:{prompt:prompt.length*2,production:byteEstimate(production),stages:byteEstimate(stages),stagesEach:Object.fromEntries(Object.entries(stages).map(([key,text])=>[key,text.length*2]))},oneRunMs:{plan:Number(planMs.toFixed(2)),prompt:Number(promptMs.toFixed(2)),stages:Number(stageMs.toFixed(2))},stageCache:'WeakMap reuses strings for the same plan. Current result retains one full plan, bounded restored cache retains at most two; persisted histories keep archives, not images. Stage preparation remains eager for compatible editorial formats.'},
 images:{sourceExample:{width:4000,height:3000,pixels:sourcePixels},displayPreview:{...preview,pixels:previewPixels},fourDisplayImagesRgbaEstimate:{beforeBytes:sourcePixels*4*4,afterBytes:previewPixels*4*4,reductionPercent:Number(((1-previewPixels/sourcePixels)*100).toFixed(1)),note:'Calculated 4-byte RGBA surfaces only; decoder, original compressed Blob, browser cache and GPU copies excluded'},originalFileBytes:'Preserved unchanged for save/share/ZIP. Preview Blob is separate and never stored in history or creator-draft.',limits:{...IMAGE_RESOURCE_LIMITS,referenceCount:4,sourceFileBytes:12*1024*1024,layoutInputBytes:20*1024*1024,layoutOutputMaxEdge:4096,layoutOutputMaxRgbaBytes:4096*4096*4,cropOutputMaxEdge:4096},metadata:'PNG/JPEG with EXIF orientation/WebP/GIF/BMP/AVIF/HEIF dimensions are checked before pixel decoding. Header fixture tests do not claim a native decoder measurement.',sourceDecodeConcurrencyForCombinedBoard:{before:4,afterInstrumentedMaximum:1},fallback:'Browsers without createImageBitmap decode one bounded original via Image; the final UI preview is still small. A resize request alone does not prove that native decoding avoids a temporary full-size surface.'},
 layout:{mainBitmapPlaced:1,mainBitmapCropping:false,fullImageBase64StringsRetained:0,svgOverlayContainsMainBitmap:false,simultaneousExports:1,cleanup:'Bitmaps closed, SVG URLs revoked, temporary canvases reset to 1x1, image src removed; success/failure/cancellation tested. Disposing the panel releases its output Blob and preview URL.'},
 renderingAndTimers:{choices:'Only current mode choices are rendered; unchanged stamped choices are reused.',picker:'Ring renders six choices; list renders the current 18/24/32-item page; comparisons max four and favorites max five per field.',previews:'Browser lazy/async images are used. Hidden auto proposal cards may remain as six small sample thumbnails, with no source decoding or generation loop.',effects:'Motion RAF and the game interval stop while document.hidden; spell animations are cancelled on sync. Background canvas remains viewport-sized with devicePixelRatio capped at 1.5.',downloads:'An explicitly downloaded Blob may remain behind its object URL for 30 seconds; repeated user downloads in that interval can temporarily accumulate memory. This bounded-time retention is unchanged.',referenceDraft:'Current references max four. Displayed Blobs are loaded once on startup; uncropped originals are requested on demand by crop editing.'},
 tests:['scripts/check-history-storage-v28.mjs','scripts/check-history-persistence-v28.mjs','scripts/check-memory-resources-v28.mjs','scripts/check-creator-draft-v28.mjs'],
 changedModules:['image-resources.js','layout-export.js','guide-board.js','crop-editor.js','history-storage.js','history-persistence.js'],
 appIntegration:'Root/ordinary_mode_fix owns app.js: small preview preparation and startup restore, unchanged-original sharing, clearing result DOM/textarea/preview resources. No app/index/version/package edits by this audit agent.'
};
const output=path.resolve(process.argv[2]||path.join(root,'audit/halloween-memory-resources-v28.json'));fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({result:'PASS performance audit',report:output,fixtureBeforeBytes:raw.length*2,fixtureAfterBytes:byteEstimate(packed),databaseReadsBefore:oldDB.reads,databaseReadsAfter:newDB.reads,previewPixelReductionPercent:report.images.fourDisplayImagesRgbaEstimate.reductionPercent,measurement:report.measurement.kind}));
