import {artworkBasis} from './artwork-basis.js?v=28.4.1';
import {creatorHandoff,creatorDisplayLabel,creatorEditableName} from './creator-handoff.js?v=28.4.1';
import {normalizeImageFile} from './image-files.js?v=28.4.1';
import {deliveryImageFiles} from './drawing-references.js?v=28.4.1';
import {stylePresetFor,loadStylePresets} from './style-presets.js?v=28.4.1';
import {sourceKinds,sourceSubjectFor} from './source-kind.js?v=28.4.1';
import {inspectImageResource,createImagePreview,decodeRasterForDraw,releaseCanvas} from './image-resources.js?v=28.4.1';
import {installNightStudio} from './night-studio.js?v=28.4.1';
import {candidateAvailability,selectionConflicts,selectionWarnings} from './compatibility.js?v=28.4.1';
import {updateSelectionFeedback} from './selection-feedback.js?v=28.4.1';
import {appendRecipeEvidence} from './recipe-evidence.js?v=28.4.1';
import {productionPlan,repairPrompt} from './production-plan.js?v=28.4.1';
import {stagePrompts} from './production-workflow.js?v=28.4.1';
import {createLayoutPanel} from './layout-export.js?v=28.4.1';
import {applyPose} from './poses.js?v=28.4.1';
import {applyCollection,dailyInspiration} from './collection.js?v=28.4.1';
import {setupEffects} from './effects.js?v=28.4.1';
import {colorWorlds} from './worlds.js?v=28.4.1';
import {compactCreatorProfile} from './creator.js?v=28.4.1';
import {createCropEditor} from './crop-editor.js?v=28.4.1';
import {createPicker} from './picker.js?v=28.4.1';
import {modeKeys,modeCopy,questionsForMode,initialSelections,effectiveSelections,proposalBatch} from './modes.js?v=28.4.1';
import {buildReferenceBoard} from './guide-board.js?v=28.4.1';
import {questions,visibleQuestions,defaults,AUTO,normalizeCreator,resolveSelections} from './catalog.js?v=28.4.1';
import {composePrompt,needsReference} from './prompt.js?v=28.4.1';
import {buildDirection} from './direction.js?v=28.4.1';
import {sampleFor,typePreview} from './examples.js?v=28.4.1';
import {makeZip} from './zip.js?v=28.4.1';
import {imageDeliveryRepairPrompt} from './output-contract.js?v=28.4.1';
import {editorialReferencesFor} from './editorial-reference-sources.js?v=28.4.1';
import {HISTORY_STORAGE_FORMAT,restoreHistoryRecord,restoreHistoryCore,mergeUsedRecords,clearRestoredHistoryCache} from './history-storage.js?v=28.4.1';
import {createHistoryPersistence,mergeHistoryStates} from './history-persistence.js?v=28.4.1';
import {createCreatorDraft} from './creator-draft.js?v=28.4.1';
import {randomItemSelection} from './random-selections.js?v=28.4.1';
const APP_VERSION='28.4.1';
const $=id=>document.getElementById(id),STORAGE='mumeis-halloween-v2';
let saved={history:[],used:[],count:0},view='auto',migrateHistory=false,historyWriteRevision=0,resultRequest=0,historyReady=Promise.resolve();
const historyPersistence=createHistoryPersistence({key:STORAGE});
const creatorDraft=createCreatorDraft();
let draftReady=Promise.resolve(),draftProfileRevision=0,draftReferenceRevision=0,referenceGeneration=0,inputRevision=0,resettingReferences=false;const profileTouched=new Set();
const draftMessages={profile:'',references:''};
function normalizeSavedHistory(value){return {...value,history:value.history.map(r=>({...r,values:{angle:AUTO,pose:AUTO,line:AUTO,...r?.values}})).filter(x=>x&&(typeof x.prompt==='string'||x.coreArchive)&&x.values&&questions.every(q=>typeof x.values[q.key]==='string')&&x.variant&&x.profile&&Array.isArray(x.references)).slice(0,12),used:value.used.filter(x=>x&&typeof x.signature==='string').slice(-2000),count:Number.isSafeInteger(value.count)?value.count:0};}
try{const v=JSON.parse(localStorage.getItem(STORAGE)||'null');if(v&&Array.isArray(v.history)&&Array.isArray(v.used)){saved=normalizeSavedHistory(v);migrateHistory=v.storageFormat!==HISTORY_STORAGE_FORMAT;}view=localStorage.getItem('halloween-view')||'auto';}catch{}
let selections=initialSelections(),refs=[],activeQuestion=null,currentResult=null,adding=false,creating=false,loadedProfile=null,profileController=null,toastTimer,textPart='type';
let sourceKind='unknown';try{const stored=localStorage.getItem('atelier-source-kind-v1');if(sourceKinds.some(kind=>kind.value===stored))sourceKind=stored;}catch{}
let disposeLayoutPreview=()=>{},resultObjectURLs=[];
function clearPreparedResult(){inputRevision++;resultRequest++;for(const url of resultObjectURLs)URL.revokeObjectURL(url);resultObjectURLs=[];disposeLayoutPreview();disposeLayoutPreview=()=>{};currentResult=null;$('result').hidden=true;$('result-refs').replaceChildren();$('result-summary').replaceChildren();$('prompt-output').value='';}
try{
 if(!localStorage.getItem(STORAGE)){
 const old=JSON.parse(localStorage.getItem('mumeis-halloween-v1')||'null');
 if(old?.history?.length){saved.count=Number.isSafeInteger(old.count)?old.count:0;saved.history=old.history.filter(r=>r&&typeof r.prompt==='string'&&r.values&&typeof r.values.size==='string'&&r.variant&&Array.isArray(r.references)).slice(0,12).map(r=>({...r,legacy:true,values:{angle:AUTO,pose:AUTO,line:AUTO,...r.values},profile:{displayName:'旧版 / '+r.creator,biography:'',topics:[]},variant:{...r.variant,face:r.variant.angle,distance:'旧版の演出'}}));migrateHistory=true;}
 }
}catch{}
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const rng=()=>{const b=new Uint32Array(1);crypto.getRandomValues(b);return b[0]/4294967296;};
const uid=()=>Date.now().toString(36).toUpperCase()+'-'+crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase();
const tell=s=>{$('toast').textContent=s;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4500);};
function renderSourceKinds(){
 const panel=$('source-kind-options');if(!panel)return;
 if(!panel.children.length)sourceKinds.forEach((kind,i)=>{const button=el('button','source-kind-choice');button.type='button';button.dataset.sourceKind=kind.value;button.append(el('span','source-kind-icon',['📷','🎨','▧','◆'][i]),el('b',null,kind.label));button.addEventListener('click',()=>{sourceKind=kind.value;selections.costume=kind.defaultSubject;for(const snapshot of Object.values(modeSnapshots))snapshot.costume=kind.defaultSubject;for(const state of Object.values(collectionSnapshots)){state.selections.costume=kind.defaultSubject;for(const snapshot of Object.values(state.modeSnapshots||{}))snapshot.costume=kind.defaultSubject;state.proposals=[];state.selectedProposal=null;}proposals=[];selectedProposal=null;try{localStorage.setItem('atelier-source-kind-v1',sourceKind);}catch{}renderSourceKinds();renderChoices();if(mode==='auto')makeProposals();tell(kind.label+'から作る設定にしました。作風・画材は自由に選べます。');});panel.append(button);});
 panel.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.sourceKind===sourceKind)));
 const kind=sourceKinds.find(item=>item.value===sourceKind);$('source-kind-hint').textContent=kind?kind.hint:'基本は、ご自身の添付キャラを主役にします。景色やマークを主役にするときは、その種類を選んでください。添付する場所と、出力の作風は別に選べます。';
 const upload=$('source-upload-label');if(upload)upload.textContent=kind?kind.label+'を添付':'キャラ・資料を添付';
}
async function persist({clearHistory=false}={}){
 const revision=++historyWriteRevision,snapshot={...saved,history:[...saved.history],used:[...saved.used],count:saved.count};
 let result;try{result=await historyPersistence[clearHistory?'clear':'save'](snapshot,{shouldWrite:()=>revision===historyWriteRevision});}catch{result={saved:false};}
 if(revision!==historyWriteRevision||result.cancelled)return null;
 if(result.saved){saved=normalizeSavedHistory(result.state);migrateHistory=false;return true;}
 if(result.conflict){saved=normalizeSavedHistory(result.state);tell('別の画面で履歴が消されたため、古い履歴は戻していません。今回の制作指示はコピー・共有できます。');return false;}
 tell(result.quota?'端末の保存容量に空きがなく、履歴を保存できませんでした。既存の保存データは残っています。制作セットを保存できます。':'このブラウザでは履歴を保存できません。既存の保存データは残っています。制作セットを保存できます。');return false;
}
async function initializeHistory(){
 try{const loaded=await historyPersistence.load();if(loaded.state)saved=normalizeSavedHistory(mergeHistoryStates(saved,loaded.state));renderHistory();if(loaded.needsMigration||migrateHistory){await persist();renderHistory();}}catch{}
}
async function syncSaved(){
 await historyReady;
 try{const loaded=await historyPersistence.load();if(loaded.state){const incoming=normalizeSavedHistory(loaded.state);saved=normalizeSavedHistory(mergeHistoryStates(saved,incoming));}}catch{}
}

function renderDraftStatus(){const status=$('draft-status');if(status)status.textContent=[draftMessages.profile,draftMessages.references].filter(Boolean).join(' ')||'ID・名前・参照画像はこの端末に保持します。リセットで解除できます。';}
function draftSaveMessage(result,label){return result.saved?label+'をこの端末に保持しました。':result.conflict?'別の画面で'+label+'がリセットされています。再読み込みして確認してください。':(result.message||'端末内への保存を完了できませんでした。')+' '+label+'の以前の保存内容は残っています。今回の変更は再読み込みで戻る場合があります。';}
async function prepareReferenceView(file){const dimensions=await inspectImageResource(file),preview=await createImagePreview(file,{dimensions,maxEdge:1200});return {previewFile:preview.file,url:URL.createObjectURL(preview.file),width:dimensions.width,height:dimensions.height};}
async function persistDraftProfile(field){
 if(field)profileTouched.add(field);clearPreparedResult();const revision=++draftProfileRevision;draftMessages.profile='ID・名前・活動を端末に保存中…';renderDraftStatus();await draftReady;if(revision!==draftProfileRevision)return;
 const snapshot={creator:$('creator').value,name:$('creator-name').value,activity:$('activity').value};
 const result=await creatorDraft.saveProfile(snapshot,{shouldWrite:()=>revision===draftProfileRevision});if(revision!==draftProfileRevision||result.cancelled)return;draftMessages.profile=draftSaveMessage(result,'ID・名前・活動');renderDraftStatus();
}
async function persistDraftReferences(){
 const revision=++draftReferenceRevision,snapshot=refs.map(r=>({...r,id:r.draftId}));draftMessages.references='参照画像を端末に保存中…';renderDraftStatus();await draftReady;
 const result=await creatorDraft.saveReferences(snapshot,{shouldWrite:()=>revision===draftReferenceRevision});if(revision!==draftReferenceRevision||result.cancelled)return;if(result.saved)for(const ref of refs){const retained=result.state.references.find(r=>r.id===ref.draftId);if(retained){ref.original=retained.original;if(ref.crop)delete ref.originalFile;}}draftMessages.references=draftSaveMessage(result,'参照画像');renderDraftStatus();return result;
}
async function initializeCreatorDraft(){
 const loaded=await creatorDraft.load();if(!loaded.loaded){draftMessages.references=(loaded.message||'端末内の保存内容を読み込めませんでした。')+' 以前の保存内容は削除していません。';renderDraftStatus();return;}
 for(const [field,id]of [['creator','creator'],['name','creator-name'],['activity','activity']])if(!profileTouched.has(field))$(id).value=loaded.profile[field];loadedProfile=null;syncProfilePreview();renderBoard();if(Object.values(loaded.profile).some(Boolean)&&!draftProfileRevision)draftMessages.profile='ID・名前・活動をこの端末から復元しました。';
 const restored=[],warnings=[];for(const r of loaded.references){let preview;try{preview=await prepareReferenceView(r.file);}catch(e){warnings.push(e.message);const placeholder=new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320"><rect width="480" height="320" fill="#e9e3da"/><text x="240" y="165" text-anchor="middle" fill="#333" font-size="20">参照画像を表示できません</text></svg>'],{type:'image/svg+xml'});preview={previewFile:placeholder,url:URL.createObjectURL(placeholder)};}restored.push({...r,...preview,draftId:r.id});}
 clearPreparedResult();refs.forEach(r=>URL.revokeObjectURL(r.url));refs=restored;if(refs.length){setAttachmentMode('bundle');draftMessages.references=refs.length+'枚の参照画像をこの端末から復元しました。'+(warnings.length?' 原画像の保存内容は残っていますが、表示用画像を準備できませんでした。 '+warnings[0]:'');}renderRefs();renderDraftStatus();
}
async function resetCreatorDraft(){
 for(const field of ['creator','name','activity'])profileTouched.add(field);const revision=++draftProfileRevision,fields=['reset-profile','creator','creator-name','activity','load-profile'].map($);fields.forEach(n=>n.disabled=true);await draftReady;
 try{const result=await creatorDraft.resetProfile();if(revision!==draftProfileRevision)return;if(result.saved){$('creator').value=$('creator-name').value=$('activity').value='';loadedProfile=null;syncProfilePreview();renderBoard();$('profile-status').className='profile-status';$('profile-status').textContent='ID・名前・活動をリセットしました。';draftMessages.profile='ID・名前・活動の固定を解除しました。';}else draftMessages.profile=draftSaveMessage(result,'ID・名前・活動');renderDraftStatus();}finally{fields.forEach(n=>n.disabled=false);}
}
async function resetReferenceDraft(){
 if(resettingReferences)return;resettingReferences=true;const generation=++referenceGeneration,revision=++draftReferenceRevision,b=$('reset-references');b.disabled=true;if($('crop-dialog').open)$('crop-dialog').close();await draftReady;
 try{const result=await creatorDraft.resetReferences();if(generation!==referenceGeneration||revision!==draftReferenceRevision)return;if(result.saved){clearPreparedResult();refs.forEach(r=>URL.revokeObjectURL(r.url));refs=[];renderRefs();draftMessages.references='参照画像の固定を解除しました。';}else draftMessages.references=draftSaveMessage(result,'参照画像');renderDraftStatus();}finally{resettingReferences=false;b.disabled=false;}
}

function displayValue(q,v){return q.key==='size'?v.split('｜')[0]:v;}
function sampleNode(key,value){
 const sample=sampleFor(key,value),n=el('span','sample-thumb'+(key==='design'?' design-sample':''));
 n.setAttribute('role','img');n.setAttribute('aria-label',sample.label+'：'+value);n.title=sample.label;
 const image=(src,cls='sample-image')=>{const img=el('img',cls);img.src=src;img.alt='';img.loading='lazy';img.decoding='async';return img;};
 if(sample.kind==='image')n.append(image(sample.src));
 else if(sample.kind==='reference'){
 const ref=refs.find(r=>r.role==='identity');if(ref)n.append(image(ref.url));else n.append(el('span','sample-text','添付から\nつくる'));
 n.append(el('span','sample-caption','主参照を生かす'));
 }else if(sample.kind==='line'){
 n.className+=' line-sample';n.append(image(sampleFor('medium','実写風フィルム写真').src));
 if(sample.text)n.append(el('span','sample-line',sample.text));else n.append(el('span','sample-caption','セリフなし'));
 }else if(sample.kind==='size'){
 n.className+=' size-sample';const frame=el('span','size-frame');
 if(sample.ratio>=1){frame.style.width='88%';frame.style.aspectRatio=String(sample.ratio);}else{frame.style.height='88%';frame.style.aspectRatio=String(sample.ratio);}
 frame.append(image(sampleFor('design','通常の一枚絵').src));n.append(frame);
 }else if(sample.kind==='type'){
 const plan=typePreview(sample.mode);n.className+=' type-sample '+plan.className;
 if(!plan.className.includes('news'))n.append(image(sampleFor('design','通常の一枚絵').src));
 const copy=el('span','type-copy');plan.blocks.forEach((s,i)=>copy.append(el('span','type-block block-'+i,s)));n.append(copy);
 }else if(sample.kind==='auto'&&sample.srcs.length){
 const grid=el('span','auto-sample-grid');sample.srcs.forEach(src=>grid.append(image(src)));n.append(grid,el('span','sample-caption',key==='mood'?'毎回、表情も角度も':'おまかせの一例'));
 }else n.append(el('span','sample-text',sample.text));
 return n;
}
let boardArtKey='',attachmentMode='bundle';const effects=setupEffects();
let collection='halloween',collectionSnapshots={},mode='detail',modeSnapshots={detail:{...selections}},proposals=[],selectedProposal=null;
let tagsEnabled=false,excludedTopics=new Set(),ideaSnapshot=null,ideaApplied=null;
const cropEditor=createCropEditor({$,tell,onApply:async(ref,edit)=>{if(!refs.includes(ref))return;const generation=referenceGeneration,originalFile=ref.originalFile||ref.file,preview=await prepareReferenceView(edit.file);if(generation!==referenceGeneration||!refs.includes(ref)){URL.revokeObjectURL(preview.url);return;}URL.revokeObjectURL(ref.url);Object.assign(ref,{...preview,originalFile,file:edit.file,name:edit.file.name,crop:edit.crop});renderRefs();await persistDraftReferences();}});
function randomizeItem(q){
 const input=mode==='auto'&&selectedProposal?{...selectedProposal,size:selections.size}:effectiveSelections(mode,selections);
 const draw=randomItemSelection(q,input,rng);
 if(!draw.value){tell(draw.reason);return;}
 selections[q.key]=draw.value;
 if(mode==='auto'&&selectedProposal)selectedProposal={...selectedProposal,[q.key]:draw.value};
 renderChoices(q.key);
 tell(q.name+'：'+displayValue(q,draw.value)+(draw.warnings?.[0]?.reason?'。'+draw.warnings[0].reason:''));
 return true;
}
function renderChoices(picked){
 const existing=new Map([...$('choices').children].map(row=>[row.dataset.choiceKey,row])),nodes=[],buttons=[];
 questionsForMode(mode).forEach((q,i)=>{
  const stamp=collection+'|'+mode+'|'+i+'|'+q.name+'|'+selections[q.key]+(q.key==='type'?'|'+selections.line:'')+'|'+(q.key==='costume'?refs.find(r=>r.role==='identity')?.url||'':'');
  const old=existing.get(q.key);
  if(old?.dataset.stamp===stamp){const button=old.querySelector('.choice');button.classList.remove('just-picked');buttons.push(button);nodes.push(old);return;}
  const row=el('div','choice-item');row.dataset.choiceKey=q.key;row.dataset.stamp=stamp;
  const b=el('button','choice'+(picked===q.key?' just-picked':''));b.type='button';b.dataset.key=q.key;b.setAttribute('aria-haspopup','dialog');b.setAttribute('aria-label',q.name+'：'+displayValue(q,selections[q.key])+'。選択を変更');
  const copy=el('span','choice-content');copy.append(el('span','choice-name',String(i+1).padStart(2,'0')+' / '+q.name),el('b','choice-value',displayValue(q,selections[q.key])),el('span','choice-hint',q.hint));
  b.append(copy,sampleNode(q.key,selections[q.key]),el('span','choice-plus','＋'));b.addEventListener('click',()=>openPicker(q));
  const random=el('button','choice-random','🎲 ランダム');random.type='button';random.dataset.randomKey=q.key;random.setAttribute('aria-label',q.name+'だけをランダムに変更');random.addEventListener('click',()=>randomizeItem(q));
  row.append(b,random);buttons.push(b);nodes.push(row);
 });
 $('choices').replaceChildren(...nodes);
 const input=mode==='auto'&&selectedProposal?{...selectedProposal,size:selections.size}:effectiveSelections(mode,selections);
 updateSelectionFeedback({panel:$('selection-notice'),choices:buttons,questions,values:input,el,onEdit:openPicker,issues:[...selectionConflicts(input).map(issue=>({...issue,status:'blocked'})),...selectionWarnings(input).map(issue=>({...issue,status:'warning'}))]});
 renderBoard(mode==='auto'&&selectedProposal?{...selectedProposal,size:selections.size}:selections);syncActivity();
}
const paletteColors={'漆黒 × 琥珀 × 象牙':['#171513','#db7d20','#f4ebd4'],'深紅 × 黒 × 古金':['#811722','#171513','#b79538'],'群青 × 月白 × 銀':['#263774','#f1f5fc','#bbc5d1'],'紫 × 黒 × 酸性グリーン':['#623084','#171513','#d7ed26'],'藍墨 × 朱 × 和紙の白':['#263d51','#c54022','#ebe4d7'],'桃色 × 墨黒 × 真珠':['#ec92b6','#262122','#f1eaed'],'墨一色':['#141414','#707070','#f3f1eb'],'モノクローム':['#191919','#777','#eee'],'セピア':['#533e26','#ab8353','#e7caa2']};
colorWorlds.forEach(x=>paletteColors[x.value]=x.colors);
function renderBoard(values=selections,variant=null){
 clearPreparedResult();
 renderStylePreset(values);
 const name=$('creator-name').value.trim();$('stage-id').textContent=name||'YOUR NAME';
 $('stage-line').textContent=values.type==='文字を一切入れない'||values.line==='セリフなし'?'':values.line===AUTO?(collection==='everyday'?'今日の景色を、一枚に。':'まだ見ぬ、一夜へ。'):values.line;
 $('direction-title').textContent=values.theme===AUTO?'物語は、これから。':values.theme;$('direction-medium').textContent=values.medium+' / '+values.design;$('format-badge').textContent=values.size.split('｜')[2]||'おまかせ';
 $('direction-tags').replaceChildren(...[values.costume,values.mood,values.place].map(v=>el('span',null,v)));
 $('swatches').replaceChildren(...(paletteColors[values.palette]||['#f97818','#19120e','#fff6e9']).map(c=>{const n=el('span');n.style.background=c;return n;}));
 $('variant-summary').replaceChildren(el('b',null,'✦'),el('p',null,variant?[variant.face,variant.expression,variant.distance,variant.depth,variant.motion].join('\n'):'キャラは表情・動きを変え、風景は視点と奥行きで構図をつくります。'));
 $('issue-number').textContent='No. '+String(saved.count+1).padStart(3,'0');const artKey=JSON.stringify(['medium','theme','costume','palette','design'].map(k=>values[k]));if(artKey!==boardArtKey){boardArtKey=artKey;$('board-samples').replaceChildren(sampleNode('medium',values.medium),sampleNode('design',values.design));renderHangingGallery(values);}
}
function setView(mode){if(!['auto','phone','tablet','pc'].includes(mode))mode='auto';view=mode;document.body.dataset.view=mode;document.querySelectorAll('.view-switch button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===mode)));$('view-status').textContent={auto:'画面幅に合わせて表示',phone:'スマホの幅・大きな文字',tablet:'タブレットの幅・大きな選択枠',pc:'PCの幅・広い作業スペース'}[mode];try{localStorage.setItem('halloween-view',mode);}catch{}}
const picker=createPicker({$,el,sampleNode,readSelection:()=>effectiveSelections(mode,selections),choose,onRandom:q=>randomizeItem(q),onCustom:buildCustom,tell,artworkBasis});
function renderStylePreset(values=selections){
 const select=$('style-preset-select');if(!select)return;
 if(!select.options.length){const auto=el('option',null,'おまかせ（制作時に見本も選びます）');auto.value=AUTO;select.append(auto);for(const group of questions.find(q=>q.key==='medium').groups){const node=el('optgroup');node.label=group.label;for(const medium of group.values){const option=el('option',null,medium);option.value=medium;node.append(option);}select.append(node);}}
 select.querySelector('[data-custom-preset]')?.remove();
 const preset=stylePresetFor(values.medium),custom=values.medium&&values.medium!==AUTO&&!preset;
 if(custom){const option=el('option',null,'自由指定：'+values.medium);option.value=values.medium;option.dataset.customPreset='true';select.append(option);}
 select.value=preset||custom?values.medium:AUTO;
 $('style-preset-preview').replaceChildren(sampleNode('medium',preset||custom?values.medium:AUTO));
 $('style-preset-status').textContent=preset?values.medium+' / 共有・制作セットにこの見本画像が入ります。':custom?'自由指定の画風です。用意済みの見本画像はなく、文章の条件で制作します。':'おまかせ：制作する画風が決まったら、その見本を一緒に準備します。';
}
$('style-preset-select').addEventListener('change',e=>{const value=e.target.value;if(mode==='auto'){modeSnapshots.detail={...(selectedProposal||selections)};setMode('detail');}activeQuestion=questions.find(q=>q.key==='medium');choose(value);});
$('style-preset-browse').addEventListener('click',()=>{if(mode==='auto'){modeSnapshots.detail={...(selectedProposal||selections)};setMode('detail');}openPicker(questions.find(q=>q.key==='medium'));});
function openPicker(q){const text=q.key==='type'||q.key==='line';if(text){if(q.key==='line')textPart='line';q=questions.find(x=>x.key===textPart);}$('text-subtabs').hidden=true;document.querySelectorAll('[data-text-part]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.textPart===q.key)));activeQuestion=q;const activeQuestions=questionsForMode(mode),i=activeQuestions.findIndex(x=>x.key===(q.key==='line'?'type':q.key));$('picker-index').textContent=String(i+1).padStart(2,'0')+' / '+activeQuestions.length;picker.open(q);}
function buildCustom(q){const form=el('form','custom-form');if(q.key==='size'){const w=el('input'),h=el('input');w.type=h.type='number';w.min=h.min='256';w.max=h.max='16000';w.required=h.required=true;w.placeholder='幅px';h.placeholder='高さpx';w.setAttribute('aria-label','希望の幅');h.setAttribute('aria-label','希望の高さ');form.append(w,el('span',null,'×'),h);form.addEventListener('submit',e=>{e.preventDefault();const a=Number(w.value),b=Number(h.value);if(!Number.isInteger(a)||!Number.isInteger(b)||a<256||b<256||a>16000||b>16000)return;const gcd=(x,y)=>y?gcd(y,x%y):x;const d=gcd(a,b);choose('自由サイズ｜'+a+'×'+b+'｜'+a/d+':'+b/d);});}else{const input=el('input');input.required=true;input.maxLength=160;input.placeholder='希望する'+q.name;input.setAttribute('aria-label',q.name+'を自由入力');form.append(input);form.addEventListener('submit',e=>{e.preventDefault();const v=input.value.trim().replace(/[\r\n]/g,' ');if(v)choose(v);});}const b=el('button','dark-button','この内容にする');b.type='submit';form.append(b);$('custom-area').append(form,el('p','microcopy',q.key==='size'?'256〜16,000px。生成環境に対応する実寸で出力されます。':'具体的な技法や角度も指定できます。160文字まで。'));form.querySelector('input').focus();}
function choose(v){const availability=candidateAvailability(activeQuestion.key,v,effectiveSelections(mode,selections));if(!availability.enabled){tell(availability.reason);return;}selections[activeQuestion.key]=v;const key=activeQuestion.key;renderChoices(key==='line'?'type':key);$('picker').close();document.querySelector('[data-key="'+(key==='line'?'type':key)+'"]')?.focus();const note=availability.warnings?.[0]?.reason;tell(note?activeQuestion.name+'を選びました。'+note:activeQuestion.name+'を選びました');}
function summarizeName(raw){const bracket=raw.match(/^[〖【「『]([^〗】」』]+)[〗】」』]/);return bracket?bracket[1].trim():raw;}
async function loadProfile(){
 await draftReady;
 const id=normalizeCreator($('creator').value);
 if(!id){tell('noteのIDまたはプロフィールURLを入力してください。');$('creator').focus();return false;}
 loadedProfile=creatorHandoff(id);syncProfilePreview();renderBoard();
 $('profile-status').textContent='IDを設定しました。名前と公開活動はChatGPTで確認します。';
 $('profile-status').className='profile-status success';await persistDraftProfile();return true;
}
function currentProfile(){return creatorHandoff(normalizeCreator($('creator').value)||'',$('creator-name').value,$('activity').value);}
function artworkProfile(){return currentProfile();}
function syncProfilePreview(){clearPreparedResult();const p=currentProfile();$('profile-preview').hidden=!(p.id||p.name);$('profile-name').textContent=p.name||'ChatGPTで作者名を確認';$('profile-bio').textContent=p.biography||'公開プロフィールと、選択に関係する記事をChatGPTで確認します。';}
function syncActivity(){}
function setActivity(on){clearPreparedResult();tagsEnabled=on;syncProfilePreview();}
async function addFiles(files){
 if(resettingReferences){tell('参照画像をリセット中です。');return;}if(adding){tell('画像を読み込み中です。');return;}const incoming=Array.from(files);if(!incoming.length)return;clearPreparedResult();const generation=referenceGeneration;adding=true;$('generate').disabled=true;
 try{await draftReady;if(generation!==referenceGeneration)return;setAttachmentMode('bundle');let changed=false;for(const incomingFile of incoming){if(generation!==referenceGeneration)break;const file=normalizeImageFile(incomingFile);if(!file){tell('画像ファイルを選んでください。');continue;}if(refs.length>=4){tell('添付は最大4枚です。');break;}if(file.size>12*1024*1024){tell('画像は1枚12MBまでです。');continue;}const name=file.name.replace(/[\r\n<>]/g,'_').slice(0,120)||'reference.png';if(refs.some(r=>r.name===name&&r.file.size===file.size&&r.file.lastModified===file.lastModified)){tell('同じ画像は添付済みです。');continue;}let preview;try{preview=await prepareReferenceView(file);if(generation!==referenceGeneration){URL.revokeObjectURL(preview.url);break;}refs.push({draftId:uid(),file,name,...preview,role:refs.length?'support':'identity'});changed=true;renderRefs();}catch(e){if(preview)URL.revokeObjectURL(preview.url);tell(e.message);}}if(changed&&generation===referenceGeneration)await persistDraftReferences();}finally{adding=false;$('generate').disabled=creating;$('image-input').value='';}
}
function renderRefs(refresh=true){
 $('references').replaceChildren();refs.forEach((r,i)=>{const f=el('figure','reference-thumb'),img=el('img');img.src=r.url;img.alt=r.name;const remove=el('button','remove-ref','×');remove.type='button';remove.setAttribute('aria-label',r.name+'を取り除く');remove.addEventListener('click',()=>{if(resettingReferences)return;URL.revokeObjectURL(r.url);refs.splice(i,1);if(refs.length&&!refs.some(x=>x.role==='identity'))refs[0].role='identity';renderRefs();persistDraftReferences();});const role=el('select');role.setAttribute('aria-label',r.name+'の画像の役割');for(const [v,label]of [['identity','主参照'],['support','補助参照'],['avoid','似せない前作']]){const o=el('option',null,label);o.value=v;role.append(o);}role.value=r.role;role.addEventListener('change',()=>{if(resettingReferences){role.value=r.role;return;}if(role.value==='identity')refs.forEach(x=>{if(x!==r&&x.role==='identity')x.role='support';});r.role=role.value;renderRefs();persistDraftReferences();});const edit=el('button','edit-ref','切り抜き・拡大縮小');edit.type='button';edit.addEventListener('click',async()=>{if(resettingReferences)return;try{await draftReady;if(!refs.includes(r))return;if(r.crop&&!r.originalFile)r.originalFile=await creatorDraft.original({...r,id:r.draftId});if(refs.includes(r))await cropEditor.open(r);}catch(e){draftMessages.references='切り抜き前の画像を読み込めませんでした。 '+e.message;renderDraftStatus();tell(e.message);}});f.append(img,remove,edit,el('figcaption',null,String(i+1).padStart(2,'0')+' / '+r.width+'×'+r.height),role);$('references').append(f);});const primary=refs.find(r=>r.role==='identity');if(primary){$('main-reference').src=primary.url;$('main-reference').hidden=false;$('empty-reference').hidden=true;}else{$('main-reference').removeAttribute('src');$('main-reference').hidden=true;$('empty-reference').hidden=false;}$('form-error').hidden=true;if(refresh)renderChoices();
}
function formError(s,focus){$('form-error').textContent=s;$('form-error').hidden=false;focus?.focus();}
async function generate(lockedValues=null){
 await historyReady;
 await draftReady;
 if(creating||adding||resettingReferences)throw new Error('制作の準備中です。');const draftGeneration=referenceGeneration,profileRevision=draftProfileRevision,preparedRevision=inputRevision;
 const ensureCurrent=()=>{if(preparedRevision!==inputRevision||draftGeneration!==referenceGeneration||profileRevision!==draftProfileRevision)throw new Error('準備中に画像や選択が変更されました。現在の条件で「制作プロンプトをつくる」を押してください。');};
 const started=performance.now();
 creating=true;$('generate').disabled=true;$('generate').textContent='制作条件を準備中…';$('generation-status').hidden=false;$('generation-status').textContent='制作に使う設定を確認中…';
 try{
 await new Promise(resolve=>requestAnimationFrame(()=>resolve()));ensureCurrent();
 if(mode==='auto'&&!selectedProposal){formError('気に入った組み合わせを一つ選んでください。',$('propose'));throw new Error('組み合わせを選んでください。');}
 const creator=normalizeCreator($('creator').value);if(creator===null){formError('noteのIDまたはURLの形式を確認してください。',$('creator'));throw new Error('ID形式が正しくありません。');}
 const profile=artworkProfile();if(!profile.displayName){$('profile-editor').open=true;formError('noteのIDかクリエイター名を入力してください。',$('creator'));throw new Error('作者の情報がありません。');}
 $('generation-status').textContent='選んだ項目と参照画像を確認しています…';
  await syncSaved();ensureCurrent();const input=lockedValues?{...lockedValues}:mode==='auto'&&selectedProposal?{...selectedProposal,size:selections.size}:effectiveSelections(mode,selections);
  if(input.theme===AUTO&&profile.inspiration?.themes?.length){const publicThemes=new Set(questions.find(q=>q.key==='theme').groups.flatMap(g=>g.values)),themes=collection==='halloween'?profile.inspiration.themes.filter(theme=>publicThemes.has(theme)):profile.inspiration.themes;if(themes.length)input.theme=themes[Math.floor(rng()*themes.length)];}
  if(input.line===AUTO&&profile.inspiration?.phrases?.length)input.line=profile.inspiration.phrases[Math.floor(rng()*profile.inspiration.phrases.length)];
  const inputKind=lockedValues?(lockedValues.sourceKind||'unknown'):sourceKind;input.costume=sourceSubjectFor(inputKind,input.costume,{selectedCostume:lockedValues?undefined:selections.costume});
  input.sceneUnified=true;input.line='セリフなし';const values=resolveSelections(input,rng,{recent:saved.history.filter(r=>(r.collection||'halloween')===collection).map(r=>r.values).reverse()});values.sourceKind=inputKind;values.collection=collection;values.line='セリフなし';const conflicts=selectionConflicts(values);if(conflicts.length){formError(conflicts[0].reason,$('generate'));throw new Error(conflicts[0].reason);}
  if(attachmentMode==='bundle'&&needsReference(values)&&!refs.some(r=>r.role==='identity')){formError('主参照を添付してください。人物なしの風景は、参照を使う項目を選んでいなければ画像なしでも作れます。',$('image-input'));throw new Error('主参照画像がありません。');}
  let variant=applyPose(buildDirection(saved.used,values.mood,rng,collection,values),values.pose);
  const edition=uid(),ordered=attachmentMode==='bundle'?[refs.find(r=>r.role==='identity'),...refs.filter(r=>r.role!=='identity')].filter(Boolean).map(ref=>({...ref})):[];
  const metadata=ordered.length?ordered.map((r,i)=>({name:'reference-'+String(i+1).padStart(2,'0')+'-'+r.name,role:r.role,width:r.width,height:r.height})):needsReference(values)?[{name:'ChatGPTへ直接添付する主参照',role:'identity'}]:[];
  const drawing=stylePresetFor(values.medium),drawingReferences=drawing?[drawing]:[];
  if(drawing)$('generation-status').textContent='選んだ画風見本を準備しています…';
  const localDrawingRefs=await loadStylePresets(drawingReferences);ensureCurrent();
  $('generation-status').textContent='項目名から画風・形式・場面を制作指示にしています…';
  const production=productionPlan(profile,values,variant,collection,rng);variant=production.variant;
  // A one-image bundle preserves the uploaded bytes. Multi-image flattening is optional.
  // Original files are ready immediately; combine only on explicit request.
  const referenceBoardFile=ordered.length===1?new File([ordered[0].file],metadata[0].name,{type:ordered[0].file.type}):null;
  const prompt=composePrompt({collection,creator:creator||'',profile,values,variant,references:[...drawingReferences,...metadata],edition,referenceBundle:ordered.length>1?{name:'creator-references.jpg',combined:true}:null,preparedPlan:production});
  ensureCurrent();saved.count++;const r={version:APP_VERSION,collection,creator:creator||'',profile,values,variant,edition,prompt,production,stages:stagePrompts(production),date:new Date().toISOString(),references:metadata,drawingReferences,localDrawingRefs,localRefs:ordered.map(r=>({...r})),referenceBoardFile,attachmentMode,isFresh:true,preparationMs:Math.round(performance.now()-started),count:saved.count};
  const {localRefs,localDrawingRefs:localDrawings,referenceBoardFile:boardFile,isFresh,...record}=r;
  saved.used.push({signature:variant.signature,family:variant.family,face:variant.face,expression:variant.expression,distance:variant.distance,pose:variant.pose,poseChoice:values.pose,layout:variant.layout,camera:variant.camera,directionSignature:variant.directionSignature,directionVariation:variant.directionVariation,automaticCamera:variant.automaticCamera,randomization:variant.randomization,directionWarnings:variant.directionWarnings});saved.used=saved.used.slice(-2000);saved.history.unshift({...record,profile:compactCreatorProfile(record.profile)});saved.history=saved.history.slice(0,12);await persist();renderHistory();ensureCurrent();$('form-error').hidden=true;renderBoard(values,variant);$('issue-number').textContent='No. '+String(saved.count).padStart(3,'0');$('stage').classList.remove('flash');void $('stage').offsetWidth;$('stage').classList.add('flash');await showResult(r);effects.celebrate();return r;
 }finally{creating=false;$('generate').disabled=false;$('generate').textContent='制作プロンプトをつくる ✦';$('generation-status').hidden=true;}
}
function shareFiles(r){return [...deliveryImageFiles(r),new File([r.prompt],'prompt.txt',{type:'text/plain'})];}
function canShareFiles(files){try{return !!navigator.share&&(!navigator.canShare||navigator.canShare({files}));}catch{return false;}}
async function showResult(r){
 const request=++resultRequest,revision=inputRevision;let restored=r,detailError=false;try{restored=await restoreHistoryRecord(r);}catch{detailError=true;try{restored=await restoreHistoryCore(r);}catch{if(request===resultRequest)tell('履歴の本文を読み込めませんでした。保存データは削除していません。');return;}}
 if(request!==resultRequest||revision!==inputRevision)return;
 try{if(!restored.localDrawingRefs&&restored.drawingReferences?.length)restored={...restored,localDrawingRefs:await loadStylePresets(restored.drawingReferences)};}catch(e){if(request===resultRequest)tell(e.message);return;}
 if(request!==resultRequest||revision!==inputRevision)return;
 clearPreparedResult();
 r=restored;if(detailError)tell('履歴の制作詳細を読み込めませんでした。保存されたプロンプトは使用できます。');
 if(r.localRefs?.length){r={...r,localRefs:r.localRefs.map(ref=>{const url=URL.createObjectURL(ref.previewFile||ref.file);resultObjectURLs.push(url);return {...ref,url};})};}
 if(r.localDrawingRefs?.length){r={...r,localDrawingRefs:r.localDrawingRefs.map(ref=>{const url=URL.createObjectURL(ref.file);resultObjectURLs.push(url);return {...ref,url};})};}
 currentResult=r;$('copy-repair').hidden=!r.production;$('prompt-output').value=r.prompt;$('result-edition').textContent='EDITION / '+r.edition;
 const live=Array.isArray(r.localRefs)&&r.localRefs.length>0,drawingLive=!!r.localDrawingRefs?.length,transferLive=live||drawingLive,fresh=!!r.isFresh,requires=needsReference(r.values),noPerson=/風景を主役|モチーフだけ|紋章・アイコン/.test(r.values.costume);
 $('result-intro').textContent=r.version!==APP_VERSION?'以前の仕様で作成した履歴です。新仕様で作る場合は、入力画面から制作してください。':live?'参照画像と制作指示の準備ができました。ChatGPTへ送り、画像を生成します。':requires?'ChatGPTで自分の参照画像を添付し、この指示と一緒に送ります。':'参照画像なしで作れる風景・モチーフです。この指示をChatGPTへ送って画像を生成します。';
 $('result-summary').replaceChildren(el('h3',null,r.values.theme),el('p',null,creatorDisplayLabel(r.profile)+' / '+r.values.medium+' / '+r.values.design),el('p',null,r.values.size.split('｜').slice(0,2).join(' / ')+'px'),el('p','detail',noPerson?'人物なし / '+r.values.place:[r.variant.face,r.variant.expression,r.variant.distance].join(' / ')));
 if(r.values.angle&&r.values.angle!==AUTO)$('result-summary').append(el('p','detail','アングル：'+r.values.angle));
 const source=sourceKinds.find(kind=>kind.value===r.values.sourceKind);if(source)$('result-summary').append(el('p','detail','添付の種類：'+source.label));
 if(r.production){const details=el('details','production-details');details.append(el('summary',null,'この作品に反映する'+r.production.conditions.length+'項目と文字原稿'));const list=el('ol');r.production.conditions.forEach(c=>{const li=el('li');const item=el('details','recipe-specs');item.append(el('summary',null,c.name+'：'+c.value));for(const section of c.sections||[{label:'制作条件',text:c.text}]){const p=el('p');p.append(el('b',null,section.label+'：'),document.createTextNode(section.text));item.append(p);}appendRecipeEvidence(item,c.key,c.value,{known:c.known});li.append(item);list.append(li);});details.append(list);if(r.production.copy.slots.length){details.append(el('h4',null,'作品内の文字原稿'));r.production.copy.slots.forEach(slot=>details.append(el('p',null,slot.role+'：'+slot.text)));}r.production.notes.forEach(n=>details.append(el('p','production-note',n)));const sources=editorialReferencesFor(r.values.design);if(sources.length){details.append(el('h4',null,'誌面の構成を確認した資料'));for(const source of sources){const a=el('a',null,source.publisher+' / '+source.location);a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';const item=el('p');item.append(a);details.append(item);}}$('result-summary').append(details);}
 if(r.stages){const workflow=el('details','production-details');workflow.id='staged-workflow';workflow.open=false;workflow.append(el('summary',null,'文字を厳密に配置したい場合の段階制作'));workflow.append(el('p',null,'通常制作は完成画像を1回で直接生成します。文字を厳密に配置したい場合は、下の段階制作も使えます。'));workflow.append(el('p',null,'段階ごとに進める場合は、下の指示を順に送れます。画風の修正には作成途中の主画像を、誌面編集には確認した主画像を添付してください。'));const actions=el('div','result-actions');for(const [key,label] of [['artwork','① 主画像の指示をコピー'],['repair','主画像の画風を直す指示'],['layout','② 誌面の指示をコピー']]){const button=el('button','secondary-button',label);button.type='button';button.dataset.stage=key;button.addEventListener('click',()=>copyStage(key));actions.append(button);}workflow.append(actions);const native=createLayoutPanel(r.production,tell);workflow.append(native.element);disposeLayoutPreview=native.dispose;$('result-summary').append(workflow);}
 $('result-refs').replaceChildren();
 if(drawingLive)r.localDrawingRefs.forEach(x=>{const f=el('figure'),im=el('img');im.src=x.url;im.alt=x.label;f.append(im,el('figcaption',null,'共有する画風見本 / '+x.medium));const save=el('button','secondary-button','画風見本を保存');save.type='button';save.addEventListener('click',()=>download(x.file,x.file.name));f.append(save);$('result-refs').append(f);});
 if(live)r.localRefs.forEach((x,i)=>{const f=el('figure'),im=el('img');im.src=x.url;im.alt=x.name;f.append(im,el('figcaption',null,'共有する参照 '+String(i+1).padStart(2,'0')+' / '+(x.role==='avoid'?'似せない前作':x.role==='identity'?'主参照':'補助')));$('result-refs').append(f);});
 $('download-guide').disabled=!r.production;$('download-kit').disabled=false;$('copy-image').disabled=!live;$('share-all').hidden=true;$('again').hidden=!fresh;$('download-board').hidden=!live;$('download-board').textContent=live&&r.localRefs.length===1?'参照画像を保存':'参照だけを１枚に保存';$('share-board').hidden=!live;
 $('share-board').hidden=!transferLive;
 $('transfer-title').textContent=drawingLive?(live?'主参照・画風見本＋プロンプト':'画風見本＋プロンプト'):live?'参照画像＋プロンプト':'プロンプトのみ';
 $('transfer-instruction').textContent=live?'「画像＋プロンプトを共有」で、ご自身の参照画像と指示の本文を渡します。共有先に画像と指示が届いたことを確認して送信してください。見本の人物や背景は送信しません。':requires?'「プロンプトをコピー」を押し、ChatGPTで自分の参照画像を添付して同じメッセージで送ってください。':'「プロンプトをコピー」を押し、ChatGPTへ送ってください。この選択では人物の参照画像は必要ありません。';
 if(drawingLive)$('transfer-instruction').textContent=live?'「画像＋プロンプトを共有」で、ご自身の参照画像・選んだ画風見本・指示を一緒に渡します。見本は描線・塗り・陰影・材質の参照です。人物・衣装・背景・配色はご自身の画像と選択から作ります。':requires?'画風見本を共有するか「画風見本を保存」で保存し、ChatGPTでご自身の主参照と一緒に添付してください。プロンプトのコピーだけでは見本画像は渡りません。':'「画像＋プロンプトを共有」で、画風原画と指示を渡します。見本の人物は描かず、選択した風景や物体へ描き方を移します。';
 $('transfer-instruction').textContent+=' ChatGPTの通常の画像作成を使います。5.5でもWorkやコード実行を前提にしません。';
 $('transfer-status').textContent=live?(canShareFiles(shareFiles(r).filter(f=>f.type.startsWith('image/')))?'画像と制作指示の本文を一緒に共有できます。共有先で両方を確認してください。':'このブラウザでは参照画像を長押しでコピーし、指示と一緒に送れます。'):fresh?'完成画像はChatGPT側に表示されます。':'履歴に画像データはありません。必要な場合は元の参照画像をChatGPTへ添付してください。';
 if(drawingLive)$('transfer-status').textContent=canShareFiles(deliveryImageFiles(r))?'画風見本を含む画像と指示を共有できます。共有先にすべて届いたことを確認して送ってください。':'画風見本を含む表示画像を長押しで保存し、プロンプトと一緒に添付してください。';
 $('kit-note').textContent=live?'「制作セットを保存」を使う場合は、ZIPを解凍して参照画像と prompt.txt を同じメッセージに添付してください。':'生成した画像が表示されない場合は「画像が出ないときの指示」をコピーして、同じチャットへ送れます。';
 if(drawingLive)$('kit-note').textContent='「制作セットを保存」のZIPには選んだ画風見本も入ります。解凍した画像と prompt.txt を同じメッセージへ添付してください。'+(!live&&requires?'ご自身の主参照も添付してください。':'');
 $('transfer-fallback').hidden=true;delete $('result-refs').dataset.manual;$('result').hidden=false;$('result').scrollIntoView({behavior:document.body.dataset.motion==='off'?'instant':'smooth',block:'start'});
}
async function copyPrompt(){if(!currentResult)return false;try{await navigator.clipboard.writeText(currentResult.prompt);tell(currentResult.drawingReferences?.length?(needsReference(currentResult.values)?'プロンプトをコピーしました。ご自身の主参照と、表示された画風見本を一緒に添付してください。':'プロンプトをコピーしました。表示された画風見本も一緒に添付してください。'):needsReference(currentResult.values)?'プロンプトをコピーしました。自分の参照画像と一緒に送ってください。':'プロンプトをコピーしました。ChatGPTへ送って画像を生成します。');return true;}catch{const ta=$('prompt-output');ta.closest('details').open=true;ta.focus();ta.select();try{if(document.execCommand('copy')){tell('プロンプトをコピーしました。');return true;}}catch{}tell('全文を選択しました。長押しでコピーできます。');return false;}}
async function copyStage(key){const text=currentResult?.stages?.[key];if(!text)return;try{await navigator.clipboard.writeText(text);tell(currentResult.drawingReferences?.length&&['artwork','repair'].includes(key)?(key==='repair'?'修正指示をコピーしました。制作途中の主画像と、表示された画風見本を添付してください。':needsReference(currentResult.values)?'主画像の指示をコピーしました。ご自身の主参照と、表示された画風見本を添付してください。':'主画像の指示をコピーしました。表示された画風見本を添付してください。'):key==='artwork'?(needsReference(currentResult.values)?'主画像の指示をコピーしました。自分の主参照と一緒に送ってください。':'主画像の指示をコピーしました。ChatGPTへ送ってください。'):key==='repair'?'画風の修正指示をコピーしました。制作途中の主画像と一緒に送ってください。':'誌面の指示をコピーしました。確認した主画像と一緒に送ってください。');}catch{download(new Blob([text],{type:'text/plain;charset=utf-8'}),'stage-'+key+'.txt');tell('この段階の指示を保存しました。対象の画像と一緒に送ってください。');}}
async function shareAll(){
 const r=currentResult;if(!r)return;
 const files=shareFiles(r),images=files.filter(f=>f.type.startsWith('image/'));
 let payload;if(images.length&&canShareFiles(images))payload={files:images,text:r.prompt,title:'画像と制作指示'};else if(canShareFiles(files))payload={files,text:r.prompt,title:'画像と制作指示'};
 if(!payload){showShareFallback();return;}
 try{await navigator.share(payload);$('transfer-status').textContent='参照画像を共有しました。共有先で指示の本文も届いたか確認し、表示されない場合は「プロンプトをコピー」で追加してください。';}
 catch(e){if(e.name==='AbortError'){$('transfer-status').textContent='共有を取り消しました。もう一度共有できます。';return;}showShareFallback();}
}
function showShareFallback(){
 const canShareText=typeof navigator.share==='function';
 $('transfer-status').textContent=canShareText?'参照画像と指示を別々に渡せます。画像のコピーと指示の共有を使ってください。':'このブラウザは共有機能に対応していません。画像とプロンプトのコピーを使ってください。';
 $('transfer-fallback-instruction').textContent=canShareText?'画像は上の参照を長押ししてコピーできます。下の「指示の本文を共有」を押し、同じメッセージへ画像を添付してください。':'画像は上の参照を長押ししてコピーできます。上の「プロンプトをコピー」を押してChatGPTへ貼り付け、同じメッセージへ画像を添付してください。';
 $('transfer-fallback').hidden=false;$('share-text').hidden=!canShareText;$('result-refs').dataset.manual='true';
 $('transfer-fallback').scrollIntoView({block:'nearest'});
}
async function shareText(){
 if(!currentResult)return;
 try{await navigator.share({title:'画像の制作指示',text:currentResult.prompt});$('transfer-status').textContent='指示の本文を共有しました。同じメッセージへ参照画像も添付してください。';}
 catch(e){$('transfer-status').textContent=e.name==='AbortError'?'共有を取り消しました。':'本文の共有に対応していません。「プロンプトをコピー」を使ってください。';}
}
async function imagePNG(r){if(r.file.type==='image/png')return r.file;const decoded=await decodeRasterForDraw(r.file),canvas=document.createElement('canvas');canvas.width=decoded.sourceWidth;canvas.height=decoded.sourceHeight;try{canvas.getContext('2d').drawImage(decoded.image,0,0,canvas.width,canvas.height);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('画像を変換できませんでした。');return blob;}finally{decoded.dispose();releaseCanvas(canvas);}}
async function copyImage(){const r=currentResult?.localRefs?.find(x=>x.role==='identity');if(!r)return;if(!navigator.clipboard?.write||typeof ClipboardItem==='undefined'){showShareFallback();tell('表示された主参照画像を長押ししてコピーしてください。');return;}try{const promise=imagePNG(r);await navigator.clipboard.write([new ClipboardItem({'image/png':promise})]);$('transfer-status').textContent='主参照画像をコピーしました。ChatGPTへ貼り付けた後、プロンプトも貼り付けてください。';tell('主参照の画像をコピーしました。ChatGPTで貼り付けてください。');}catch{showShareFallback();tell('表示された主参照画像を長押ししてコピーしてください。');}}
function download(blob,name){const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
async function downloadKit(){const r=currentResult;if(!r)return;const b=$('download-kit');b.disabled=true;b.textContent='セットを準備中…';try{
 const images=deliveryImageFiles(r),imageNames=images.map(file=>file.name);
 const help=['画像制作セット','','1. ZIPを解凍します。',needsReference(r.values)&&!r.localRefs?.some(ref=>ref.role==='identity')?'2. ご自身の主参照を追加し、画風原画がある場合はその原画と prompt.txt を同じChatGPTのメッセージへ添付します。':imageNames.length?'2. 下の参照画像と prompt.txt を同じChatGPTのメッセージへ添付します。':needsReference(r.values)?'2. prompt.txt とご自身の主参照画像を、同じChatGPTのメッセージへ添付します。':'2. prompt.txt をChatGPTへ添付するか、中の指示をコピーして送ります。','3. prompt.txt の条件で画像を1枚描き、ChatGPTの通常の生成画像としてチャットに表示するよう送信します。','4. 完成画像が出ない場合は、ツールの「画像が出ないときの指示」を同じチャットへ送ります。','','添付する参照画像：',...imageNames,'',r.drawingReferences?.length?(r.drawingReferences.some(ref=>ref.role==='drawing')?'宝石光彩の専用画風原画を含みます。人物・衣装・背景をそのまま流用せず、光彩と描画の参照として使います。':'選んだ画風見本を含みます。描き方だけを参照し、人物・衣装・ポーズ・構図・背景・配色は今回の入力で決めます。'):'自由指定の画風には用意済みの見本はありません。' ,'名前：'+creatorDisplayLabel(r.profile),'制作番号：'+r.edition].join('\n');
 const files=[{name:'prompt.txt',data:new TextEncoder().encode(r.prompt)},{name:'使い方.txt',data:new TextEncoder().encode(help)}];
 for(const file of images)files.push({name:file.name,data:new Uint8Array(await file.arrayBuffer())});
 download(makeZip(files),'Artwork-'+r.edition+'.zip');tell('制作セットを保存しました。');
 }catch{tell('保存に失敗しました。プロンプトと参照画像を個別に保存してください。');}finally{b.disabled=false;b.textContent='制作セットを保存';}}
function renderHistory(){$('history').replaceChildren();if(!saved.history.length){$('history').append(el('p','history-empty','まだ白紙のコレクション。最初の一夜をつくろう。'));return;}saved.history.forEach(r=>{const b=el('button','history-card');b.type='button';b.append(sampleNode('medium',r.values.medium),el('span','hist-id','No. '+String(r.count).padStart(3,'0')),el('b',null,r.values.theme),el('p',null,creatorDisplayLabel(r.profile)+' / '+r.values.medium),el('small',null,r.variant.face));b.addEventListener('click',()=>showResult(r));$('history').append(b);});}
function setAttachmentMode(next){clearPreparedResult();attachmentMode=next==='bundle'?'bundle':'chatgpt';document.querySelectorAll('[name="attachment-mode"]').forEach(r=>r.checked=r.value===attachmentMode);$('drop-zone').hidden=false;$('reference-note').hidden=false;$('attachment-mode-note').textContent=attachmentMode==='bundle'?'ここにご自身のキャラ・資料を添付し、制作指示と一緒に共有します。選んだ画風見本も別の画像として加わります。':'ご自身のキャラ・資料はChatGPTで直接添付します。このツールへの画像登録は不要です。用意済みの画風見本も、共有または制作セットから一緒に添付します。ここに画像を登録すると「このツールで添付」に切り替わります。';}
document.querySelectorAll('[name="attachment-mode"]').forEach(r=>r.addEventListener('change',()=>setAttachmentMode(r.value)));
$('download-board').addEventListener('click',async()=>{const r=currentResult;if(!r?.localRefs?.length)return;const b=$('download-board');b.disabled=true;const label=b.textContent;b.textContent='参照をまとめています…';try{r.referenceBoardFile||=await buildReferenceBoard(r.localRefs,r.references);download(r.referenceBoardFile,r.referenceBoardFile.name);}catch{tell('まとめられませんでした。元の参照画像はそのまま共有できます。');}finally{b.disabled=false;b.textContent=label;}});
$('share-board').addEventListener('click',shareAll);
$('load-profile').addEventListener('click',loadProfile);$('creator').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();loadProfile();}});$('creator').addEventListener('input',()=>{loadedProfile=null;$('profile-status').className='profile-status';$('profile-status').textContent='このIDの名前と公開活動はChatGPTで確認します。';syncProfilePreview();renderBoard();persistDraftProfile('creator');});
$('creator-name').addEventListener('input',()=>{syncProfilePreview();renderBoard();$('form-error').hidden=true;persistDraftProfile('name');});$('activity').addEventListener('input',()=>{syncProfilePreview();persistDraftProfile('activity');});$('image-input').addEventListener('change',e=>addFiles(e.target.files));
$('reset-profile')?.addEventListener('click',resetCreatorDraft);$('reset-references')?.addEventListener('click',resetReferenceDraft);
$('pick-image').addEventListener('click',()=>$('image-input').click());
$('paste-image').addEventListener('click',async()=>{try{if(!navigator.clipboard?.read)throw new Error('unsupported');const items=await navigator.clipboard.read(),files=[];for(const item of items){const type=item.types.find(t=>['image/png','image/jpeg','image/webp','image/gif'].includes(t));if(type){const blob=await item.getType(type);files.push(new File([blob],'paste-'+Date.now()+'.'+(type==='image/jpeg'?'jpg':type.split('/')[1]),{type}));}}if(!files.length)throw new Error('no image');await addFiles(files);$('paste-target').hidden=true;}catch{$('paste-target').hidden=false;$('paste-target').focus();tell('貼り付け欄を長押しして貼り付けてください。写真を選ぶこともできます。');}});
document.addEventListener('paste',e=>{const files=Array.from(e.clipboardData?.items||[]).filter(i=>i.kind==='file').map(i=>i.getAsFile()).filter(Boolean);if(files.length&&!$('picker').open&&!$('crop-dialog').open){e.preventDefault();$('paste-target').hidden=true;addFiles(files);}else if(e.target===$('paste-target'))e.preventDefault();});$('drop-zone').addEventListener('dragover',e=>{e.preventDefault();$('drop-zone').classList.add('dragover');});$('drop-zone').addEventListener('dragleave',()=>$('drop-zone').classList.remove('dragover'));$('drop-zone').addEventListener('drop',e=>{e.preventDefault();$('drop-zone').classList.remove('dragover');addFiles(e.dataTransfer.files);});window.addEventListener('dragover',e=>{if(e.dataTransfer?.types.includes('Files'))e.preventDefault();});window.addEventListener('drop',e=>{if(e.dataTransfer?.types.includes('Files'))e.preventDefault();});
$('shuffle').addEventListener('click',()=>{const size=selections.size,input={...Object.fromEntries(questions.map(q=>[q.key,AUTO])),size,sceneUnified:true};input.costume=sourceSubjectFor(sourceKind,input.costume,{selectedCostume:selections.costume});selections=resolveSelections(input,rng,{recent:[selections]});if(mode==='auto')selectedProposal={...selections};renderChoices();tell('サイズを保ったまま、新しい組み合わせを選びました。');});$('generate').addEventListener('click',async()=>{try{await generate();}catch(e){if($('form-error').hidden)tell(e.message);}});$('copy').addEventListener('click',copyPrompt);$('copy-repair').addEventListener('click',async()=>{if(!currentResult?.production)return;const text=repairPrompt(currentResult);try{await navigator.clipboard.writeText(text);tell('修正指示をコピーしました。完成画像と同じチャットへ送ってください。');}catch{download(new Blob([text],{type:'text/plain;charset=utf-8'}),'finish-instructions.txt');tell('修正指示を保存しました。完成画像と一緒に送ってください。');}});$('share-all').addEventListener('click',shareAll);$('share-text').addEventListener('click',shareText);$('copy-image').addEventListener('click',copyImage);$('chatgpt').addEventListener('click',()=>{window.open('https://chatgpt.com/','_blank','noopener,noreferrer');tell(currentResult?.drawingReferences?.length?'このボタンはChatGPTを開きます。画像は自動で添付されません。「画像＋プロンプトを共有」または制作セットから、画風見本・必要な主参照・指示を添付してください。':currentResult&&!needsReference(currentResult.values)?'コピーした制作指示を送信してください。':'ご自身の参照画像とプロンプトを両方添付してから送信してください。');});$('download-kit').addEventListener('click',downloadKit);$('download-text').addEventListener('click',()=>{if(currentResult)download(new Blob([currentResult.prompt],{type:'text/plain;charset=utf-8'}),'Halloween-'+currentResult.edition+'.txt');});
$('again').addEventListener('click',async()=>{try{const old=currentResult;if((old.collection||'halloween')!==collection)setCollection(old.collection||'halloween');sourceKind=sourceKinds.some(kind=>kind.value===old.values.sourceKind)?old.values.sourceKind:'unknown';renderSourceKinds();selections={angle:AUTO,...old.values};if(mode==='auto')selectedProposal={...old.values};renderChoices();await generate(old.values);}catch(e){tell(e.message);}});$('help').addEventListener('click',()=>$('help-dialog').showModal());document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>{const target=$(b.dataset.close);if(target instanceof HTMLDialogElement)target.close();else target.hidden=true;}));document.querySelectorAll('.view-switch button').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));$('clear-history').addEventListener('click',async()=>{await historyReady;if(!saved.history.length)return tell('履歴はありません。');if(window.confirm('この端末の制作履歴を消しますか？演出の重複回避記録は残ります。')){const stored=await persist({clearHistory:true});renderHistory();if(stored){clearRestoredHistoryCache();tell('履歴を消しました。');}}});
document.querySelectorAll('.mode-switch button').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));$('propose').addEventListener('click',makeProposals);document.querySelectorAll('[data-text-part]').forEach(b=>b.addEventListener('click',()=>{textPart=b.dataset.textPart;openPicker(questions.find(q=>q.key===textPart));}));$('download-guide').addEventListener('click',()=>{if(!currentResult?.production)return;download(new Blob([[...(currentResult.production.interactions||[]),...currentResult.production.conditions.map(c=>c.name+'：'+c.value+'\n'+(c.sections||[{label:'制作条件',text:c.text}]).map(s=>s.label+'：'+s.text).join('\n'))].join('\n\n')],{type:'text/plain;charset=utf-8'}),'selected-conditions.txt');});
$('copy-delivery').addEventListener('click',async()=>{if(!currentResult)return;const text=imageDeliveryRepairPrompt(currentResult);try{await navigator.clipboard.writeText(text);tell('再表示の指示をコピーしました。画像が出なかった同じチャットへ送ってください。');}catch{download(new Blob([text],{type:'text/plain;charset=utf-8'}),'show-finished-image.txt');tell('再表示の指示を保存しました。同じチャットへ送ってください。');}});
const motionMedia=window.matchMedia('(prefers-reduced-motion: reduce)');let motion=true;try{motion=localStorage.getItem('halloween-motion')!=='off';}catch{}function setMotion(on){motion=on;const enabled=on&&!motionMedia.matches;document.body.dataset.motion=enabled?'on':'off';$('motion-label').textContent=motionMedia.matches?'OFF：端末の省動作設定を優先':enabled?(collection==='everyday'?'ON：彩りが動きます':'ON：魔法が動きます'):'OFF：動きと遊びを停止';$('motion-off').setAttribute('aria-pressed',String(!enabled));$('motion-toggle').setAttribute('aria-pressed',String(enabled));$('motion-toggle').disabled=motionMedia.matches;$('play-state').textContent=enabled?(collection==='everyday'?'彩りが動いています':'魔法が動いています'):'演出は止まっています';$('playground').dataset.paused=String(!enabled);['play-spell','play-ghosts'].forEach(id=>$(id).disabled=!enabled);effects.sync();try{localStorage.setItem('halloween-motion',on?'on':'off');}catch{}}setMotion(motion);motionMedia.addEventListener('change',()=>setMotion(motion));$('motion-toggle').addEventListener('click',()=>setMotion(true));$('motion-off').addEventListener('click',()=>setMotion(false));installNightStudio(effects);
document.querySelectorAll('.collection-switch button').forEach(b=>b.addEventListener('click',()=>setCollection(b.dataset.collection)));
document.querySelectorAll('[data-decoration]').forEach(b=>{if(b.tagName!=='BUTTON')return;b.addEventListener('click',()=>{document.body.dataset.decoration=b.dataset.decoration;document.querySelectorAll('button[data-decoration]').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));effects.celebrate();});});
function setCollection(next){if(!['halloween','everyday'].includes(next))return;collectionSnapshots[collection]={mode,selections:{...selections},modeSnapshots:structuredClone(modeSnapshots),proposals,selectedProposal};collection=next;applyCollection(collection);const state=collectionSnapshots[next];mode=state?.mode||'detail';selections=state?.selections||initialSelections();modeSnapshots=state?.modeSnapshots||{detail:{...selections}};proposals=[];selectedProposal=state?.selectedProposal||null;document.body.dataset.collection=collection;const daily=collection==='everyday';document.querySelectorAll('.collection-switch button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.collection===collection)));$('tool-name').replaceChildren(document.createTextNode(daily?'イラスト工房':'Halloween '),...(!daily?[el('i',null,'Atelier')]:[]));$('tool-brand').textContent='無名S note / '+(daily?'イラスト工房':'Halloween Atelier');document.title='無名S note — '+(daily?'イラスト工房':'Halloween Atelier');$('hero-eyebrow').textContent=daily?'EVERYDAY / ILLUSTRATION STUDIO':'HALLOWEEN / CREATE YOUR WORLD';$('studio-title').replaceChildren(document.createTextNode(daily?'日々を、作品に。':'遊ぶ。描く。'),el('br'),document.createTextNode(daily?'好きな世界を描こう。':'変身する。'));$('hero-copy').textContent=daily?'日常、旅、ファッション、幻想。季節を問わず、自由な一枚へ。':'写真から墨絵まで。あなたの主役で、まだ見ぬ一夜を。';$('intro-copy').textContent=daily?'あなたのキャラで、毎日に新しい一枚を。':'あなたのキャラで、いつもと違うHalloween。';$('stage-brand').textContent=daily?'YOUR ILLUSTRATION':'YOUR HALLOWEEN';$('playground').setAttribute('aria-label',daily?'彩りの遊び場':'魔法の遊び場');$('playground-title').textContent=daily?'彩りの遊び場':'魔法の遊び場';$('play-spell').textContent=daily?'✦ 彩りをひろげる':'✦ 魔法を飛ばす';$('spell-status').textContent=daily?'花・紙片・光の演出を楽しめます。':'７種類の魔法。次は何が起きる？';setMotion(motion);$('play-copy').textContent=daily?'色や写真、身近なモチーフ。飾りに触って、創作のひらめきを。':'飾りをタップして魔法を発見。制作の合間にも、ひと遊び。';$('play-ghosts').textContent=daily?'モチーフをあつめる':'おばけとお菓子集め';$('ghost-title').textContent=daily?'モチーフをあつめる':'おばけとお菓子集め';boardArtKey='';setMode(mode);syncProfilePreview();effects.refresh();try{localStorage.setItem('halloween-collection',collection);}catch{}}
let mainCollection='halloween';try{mainCollection=localStorage.getItem('atelier-main-collection-v1')||'halloween';}catch{}
function orderCollections(){const group=document.querySelector('.collection-switch');for(const key of [mainCollection,mainCollection==='everyday'?'halloween':'everyday'])group.append(group.querySelector('[data-collection="'+key+'"]'));$('main-collection').textContent=mainCollection==='everyday'?'Halloweenをメインに':'普段使いをメインに';$('main-collection').setAttribute('aria-label','TOPの順番を切り替える');}
$('main-collection').addEventListener('click',()=>{mainCollection=mainCollection==='everyday'?'halloween':'everyday';try{localStorage.setItem('atelier-main-collection-v1',mainCollection);}catch{}orderCollections();setCollection(mainCollection);});orderCollections();
setView(view);renderSourceKinds();renderRefs(false);setMode('detail');let initialCollection='halloween';try{initialCollection=localStorage.getItem('halloween-collection')||'halloween';}catch{}setCollection(initialCollection);renderHistory();historyReady=initializeHistory();draftReady=initializeCreatorDraft();renderDraftStatus();

function setMode(next){if(!modeKeys[next])return;const selectedCostume=selections.costume;modeSnapshots[mode]={...selections};mode=next;selections={...(modeSnapshots[next]||initialSelections()),size:selections.size};selections.costume=sourceSubjectFor(sourceKind,selections.costume,{selectedCostume});document.body.dataset.mode=mode;document.querySelectorAll('.mode-switch button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));$('mode-description').textContent=modeCopy[mode];$('choice-heading').textContent={detail:'2. 10項目で決める',simple:'2. 5項目だけ選ぶ',auto:'2. 見本の組み合わせで決める'}[mode];$('auto-proposals').hidden=mode!=='auto';$('shuffle').hidden=mode==='auto';renderChoices();if(mode==='auto'&&!proposals.length)makeProposals();}
function makeProposals(){const input={...selections};input.costume=sourceSubjectFor(sourceKind,input.costume);const batch=proposalBatch(input,rng,{recent:[...proposals,...saved.history.filter(r=>(r.collection||'halloween')===collection).map(r=>r.values)],count:3});proposals=batch.proposals;selectedProposal=null;if(batch.issues.length)formError(batch.issues.map(issue=>issue.reason).join(' '));else $('form-error').hidden=true;$('proposal-cards').replaceChildren();proposals.forEach((values,i)=>{const b=el('button','proposal-card');b.type='button';b.setAttribute('aria-pressed','false');const arts=el('span','proposal-art');arts.append(sampleNode('medium',values.medium),sampleNode('design',values.design));b.append(arts,el('b',null,values.medium),el('span',null,values.design),el('small',null,values.theme+' / '+values.palette));b.addEventListener('click',()=>{selectedProposal={...values,size:selections.size};document.querySelectorAll('.proposal-card').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));renderChoices();renderBoard(selectedProposal);$('form-error').hidden=true;tell('この作例の組み合わせを選びました。');});$('proposal-cards').append(b);});renderBoard({...initialSelections(),size:selections.size});$('generation-status').hidden=true;}
function renderHangingGallery(values){if(!$('hanging-gallery'))return;$('hanging-gallery').replaceChildren();for(const key of ['medium','design','theme','costume','palette']){const card=el('div','hanging-card');const label=questions.find(q=>q.key===key).name;card.append(sampleNode(key,values[key]),el('b',null,label),el('span',null,values[key]));$('hanging-gallery').append(card);}}
const mc=document.modelContext;if(mc?.registerTool){const lifecycle=new AbortController();const register=tool=>{try{Promise.resolve(mc.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}};register({name:'read_halloween_settings',title:'Halloweenの選択を読む',description:'現在の10項目、クリエイター名と添付数を読む。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:()=>({mode,profile:currentProfile(),selections:mode==='auto'&&selectedProposal?{...selectedProposal,size:selections.size}:effectiveSelections(mode,selections),referenceCount:refs.length})});register({name:'create_halloween_prompt',title:'Halloween制作プロンプトを作る',description:'画面で設定した名前、参照、10項目を使って制作指示を作成し、画面と端末履歴へ反映する。画像生成や画像転送はしない。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute:async input=>{if(!input||typeof input!=='object'||Object.keys(input).length)throw new Error('入力は空のオブジェクトにしてください。');const r=await generate();return {edition:r.edition,prompt:r.prompt,referenceCount:r.references.length};}});window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});}
