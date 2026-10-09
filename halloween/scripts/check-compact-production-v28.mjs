import assert from 'node:assert/strict';
import {productionPlan} from '../production-plan.js?v=28.4.3';
import {renderSelectionMaterial,renderInput,compileProduction} from '../compiled-production.js?v=28.4.3';
import {renderCompactChatInput} from '../compact-production.js?v=28.4.3';
import {cameraContract} from '../angles.js?v=28.4.3';
import {composePrompt} from '../prompt.js?v=28.4.3';
import {selectionReferenceManifest} from '../selection-references.js?v=28.4.3';

// Compare actual selected plans with the detailed audit renderer. Length is a
// bloat signal only; identity, fixed projection, engineering and copy are the
// correctness checks. This does not claim that an image model obeys the prompt.
const base={sceneUnified:true,medium:'透明水彩',theme:'旅先で見つけた景色',place:'街角の歩道',design:'通常の一枚絵',costume:'参照画像の衣装を生かす',pose:'椅子に腰掛ける',mood:'目を閉じて安らぐ',angle:'目線の高さ・正面',palette:'群青 × 月白 × 銀',type:'文字を一切入れない',line:'セリフなし',size:'A4縦・300dpi目安｜2480×3508｜210:297',sourceKind:'illustration-person'};
const profile={displayName:'確認作者',activityEnabled:false};
const make=(overrides={},collection='halloween',author=profile)=>productionPlan(author,{...base,...overrides},{},collection,()=>.23);
const clauses=text=>text.match(/[^。！？]+[。！？]?/gu).map(clause=>clause.trim());
const includes=(text,clause,label)=>assert.ok(text.includes(clause),label+' lost: '+clause);
const refs=plan=>[
 {name:'reference-01-character.png',role:'identity'},
 {name:'selected-style-full.png',role:'style-preset'},
 {name:'selection-references.jpg',role:'selection-sheet',items:plan.conditions.map(condition=>({key:condition.key,value:condition.value,label:condition.name,scope:condition.key==='medium'?'描線・塗り・光のみ':'その項目の構造だけ'}))}
];
let cases=0,maxRatio=0;
for(const medium of ['透明水彩','水墨画','発光幻想アニメ','発光幻想リアル','クリスタル透光アニメ','宝石光彩アニメ','宝石光彩リアル']){
 const plan=make({medium,...(medium==='水墨画'?{palette:'墨一色'}:{})}),before=JSON.stringify(plan);
 assert.equal(plan.issues.filter(issue=>issue.severity==='error').length,0,medium+' test must be a valid selection');
 const compact=renderCompactChatInput(plan,refs(plan)),detailed=renderSelectionMaterial(plan),audit=renderInput(plan);
 assert.equal(JSON.stringify(plan),before,'The compact renderer changed its audit plan');
 for(const condition of plan.conditions)includes(compact,condition.value,medium+' selection '+condition.key);
 assert.doesNotMatch(compact,/undefined|NaN|両手の全指|隠れる指や足をすべて見せる/);
 assert.match(compact,/主参照から同じ人物/);
 assert.match(compact,/年齢感・性別表現・基礎体格/);
 assert.match(compact,/衣装の被覆、閉眼、髪なし/);
 assert.match(compact,/人物・衣装・小道具・構図・舞台は借用しない/);
 assert.match(compact,/シートの文字・複数図版を作品へ描かず/);
 assert.match(compact,/見本未確認と短く伝え、本文の作画仕様で生成する/);
 assert.equal(compact.split('作風見本がないことだけを理由に制作を止めない。').length-1,1,'The optional style fallback must have one owner');
 assert.match(compact,/文字・数字・署名なし/);
 assert.match(compact,/出来事と目的/);
 assert.match(compact,/10月31日/);
 assert(compact.length<detailed.length*.8,medium+' compact material did not remove substantial duplication');
 includes(audit,'【全選択の個別レシピ】','full audit export');
 const material=plan.conditions.find(condition=>condition.key==='medium');
 const selectedEngineering=material.sections.filter(section=>['材質を保つ6段の色層','光の大小と密度の配分','世界観ベース／素材を保つ描画','世界観ベース／焦点にも届く鋭い光'].includes(section.label));
 for(const section of selectedEngineering)for(const clause of clauses(section.text))includes(compact,clause,medium+' unique '+section.label);
 if(medium==='発光幻想アニメ')assert.match(compact,/2D|平面陰影/);
 if(['発光幻想アニメ','発光幻想リアル'].includes(medium)){
  assert.match(compact,/見本の広い深暗部と鋭い最明部の差/,'The compact material lost the selected benchmark contrast');
  assert.match(compact,/透明な色層と反射の密度/,'The compact material lost benchmark layer/reflection density');
 }
 if(medium==='透明水彩'){
  assert.match(compact,/FACE FIRST when visible in the selected framing/);
  assert.match(compact,/fingers actually visible in the selected pose/);
  assert.doesNotMatch(compact,/the reaching foreground fingers/);
 }
 if(medium==='発光幻想リアル')assert.match(compact,/自然な頭蓋・眼球・人体/);
 if(medium==='宝石光彩アニメ'||medium==='宝石光彩リアル'){
  for(const section of material.sections.filter(section=>section.label==='画風プリセットの使い方'&&/^配色変更|^光彩は/.test(section.text)))for(const clause of clauses(section.text))includes(compact,clause,medium+' independent original quality');
  assert.match(compact,/反射密度|光彩/);
 }
 maxRatio=Math.max(maxRatio,compact.length/detailed.length);cases++;
}

for(const angle of ['真上から・90度','真下から・90度','顔のクローズアップ','手元・動作の接写']){
 const plan=make({angle}),compact=renderCompactChatInput(plan),camera=cameraContract(plan.values);
 assert.equal(plan.issues.filter(issue=>issue.severity==='error').length,0,angle+' must remain valid');
 for(const clause of clauses(camera.instructions[0]))includes(compact,clause,'fixed selected angle');
 for(const clause of clauses(camera.framing_instruction))includes(compact,clause,'visible framing');
 assert.match(compact,/距離調整は同じ光軸上だけ/);
 assert.doesNotMatch(compact,/必要ならカメラの位置|両手の全指/);
 if(/接写|クローズアップ/.test(angle))assert.match(compact,/接写の指定を全身へ引き直さない/);
 cases++;
}

for(const sourceKind of ['scenery','mark-object'])for(const costume of ['参照画像の衣装を生かす','風景を主役にする']){
 const plan=make({sourceKind,costume,medium:'発光幻想リアル',...(costume==='風景を主役にする'?{mood:'おまかせ',pose:'おまかせ'}:{})}),compact=renderCompactChatInput(plan);
 if(plan.noPerson){
  assert.match(compact,/人物なし/);
  assert.match(compact,/人型の影・マネキンを追加しない/);
  assert.doesNotMatch(compact,/主参照から同じ人物|独自の主役を設計する/);
 }else{
  assert.match(compact,/人物の識別基準がない/);
  assert.match(compact,/独自の主役を設計する/);
  assert.doesNotMatch(compact,/主参照から同じ人物/);
 }
 cases++;
}

for(const collection of ['halloween','everyday'])for(const type of ['HALLOWEENのみ','文字を一切入れない','セリフのみ']){
 const plan=make({design:'新聞の一面',type,line:type==='セリフのみ'?'この場所で、また。':'セリフなし'},collection),compact=renderCompactChatInput(plan);
 for(const slot of plan.copy.slots)includes(compact,slot.role+'：'+JSON.stringify(slot.text),'exact newspaper copy');
 assert.match(compact,/6列/);
 assert.match(compact,/40%以上|40%/);
 assert.match(compact,/x6〜63%・y24〜78%/);
 if(collection==='everyday')assert.doesNotMatch(compact,/Halloween版：全形式/);
 if(type==='HALLOWEENのみ')assert.deepEqual(plan.copy.slots.map(slot=>slot.text),['HALLOWEEN']);
 cases++;
}

const rich=make({design:'週刊誌の表紙',type:'デザインに合わせて自動編集'},'halloween',{...profile,activityEnabled:true,biography:'旅と日々の出来事を文章で公開している。'}),richText=renderCompactChatInput(rich);
for(const slot of rich.copy.slots)includes(richText,slot.role+'：'+JSON.stringify(slot.text),'fixed rich manuscript');
for(const slot of rich.copy.generatedSlots)includes(richText,slot.role+' / '+slot.maxCharacters+'字以内 / 階層'+slot.priority,'generated role and limit');
assert.match(richText,/描画条件・制作仕様・カメラ・画材・配色・解像度は原稿のネタにしない/);
assert.match(richText,/未確認の実績・本人の発言を捏造しない/);
cases++;

// New literal engineering remains intact even when it is longer than any
// informal length budget; a character limit cannot delete selected clauses.
const custom=make({medium:'特殊な独自画材',appearance:'髪なし・閉眼',proportions:'明示された比率'}),method='専用工程：金属箔を三層重ね、左縁だけを磨く。',extra='固有工程：右の支持点だけを選択した床へ接続する。';
custom.conditions[0].execution.method=method;
custom.conditions[0].sections.push({label:'追加した固有工程',text:extra});
const customText=renderCompactChatInput(custom);
includes(customText,method,'custom making method');includes(customText,extra,'new unique engineering');
includes(customText,JSON.stringify('髪なし・閉眼'),'additional explicit appearance');
custom.conditions[0].sections.push({label:'長い独自工程',text:('選択した独自工程を保持する。').repeat(700)+'末尾の接合部を残す。'});
includes(renderCompactChatInput(custom),'末尾の接合部を残す。','long literal tail');
cases++;

const blocked=make();blocked.issues.push({severity:'error',reason:'固定カメラと明示した顔向きが両立しない。'});
const blockedText=renderCompactChatInput(blocked,refs(blocked));
assert.match(blockedText,/画像生成を停止/);assert.match(blockedText,/選択を変えるまで画像生成へ進まない/);
assert.doesNotMatch(blockedText,/完成作品を1枚生成|選択固有の制作工程/);cases++;

// Exercise the actual app route, including a stale reference argument. The
// plan manifest is the attachment identity used by share/transfer and must
// survive once rather than being repeated by the old prompt role sections.
const occurrences=(text,needle)=>text.split(needle).length-1;
function manifest(plan){
 return [
  {name:'selected-style-full.png',role:'style-preset',label:'別添の原寸画風'},
  selectionReferenceManifest(plan.values,{sample:(key,value)=>({kind:'text',text:key+' '+value+' sample-only marker'})}),
  {name:'reference-01-character.png',role:'identity'}
 ];
}
function actualPrompt(plan,references=plan.referenceManifest){
 return composePrompt({collection:plan.collection,creator:'',profile,values:plan.values,variant:plan.variant,references,edition:'COMPACT-INTEGRATION',preparedPlan:plan});
}
let integrated=0;
const integrationPlans=[
 make(),
 make({medium:'発光幻想アニメ',angle:'真上から・90度',appearance:'髪なし'}),
 make({medium:'発光幻想リアル',angle:'手元・動作の接写'}),
 make({medium:'宝石光彩アニメ'}),
 make({medium:'宝石光彩リアル'}),
 make({design:'新聞の一面',type:'HALLOWEENのみ'}),
 make({design:'週刊誌の表紙',type:'デザインに合わせて自動編集'},'halloween',{...profile,activityEnabled:true,biography:'旅と日々の出来事を文章で公開している。'}),
 make({sourceKind:'scenery',costume:'風景を主役にする',mood:'おまかせ',pose:'おまかせ'},'everyday')
];
for(const plan of integrationPlans){
 plan.referenceManifest=manifest(plan);
 const sentinel='固有の接続工程：選択された支持面の左縁と一つの継ぎ目を連続させる。';
 plan.conditions.find(condition=>condition.key==='medium').sections.push({label:'新しい個別工程',text:sentinel});
 const layoutSentinel='配置の固有条件：指定画像枠の左寄りへ主題を置き、右側は地色の余白として保つ。';
 plan.variant.layout+=' '+layoutSentinel;
 const before=JSON.stringify(plan),compact=renderCompactChatInput(plan,plan.referenceManifest);
 const oldLines=['画像生成の制作仕様 / COMPACT-INTEGRATION','【今回の画像の役割】',...plan.referenceManifest.map(reference=>reference.name+'：旧役割の記述'),'【最初に確定する作画と画面】'];
 const routes={composePrompt:actualPrompt(plan),compileProduction:compileProduction(plan,oldLines),staleArgument:actualPrompt(plan,[{name:'obsolete-identity-name.png',role:'identity'}])};
 for(const [route,text] of Object.entries(routes)){
  includes(text,compact,route+' actual compact payload');
  assert.equal(occurrences(text,'【短い統合制作指示】'),1,route+' repeated the compact payload');
  for(const reference of plan.referenceManifest)assert.equal(occurrences(text,reference.name),1,route+' repeated/lost reference '+reference.role);
  const sheet=plan.referenceManifest.find(reference=>reference.role==='selection-sheet');
  assert.equal(sheet.items.length,10,'The actual role sheet lost a visible selection');
  for(const item of sheet.items)includes(text,item.key+'「'+item.value+'」：'+item.scope,route+' selected role '+item.key);
  for(const condition of plan.conditions)includes(text,condition.value,route+' actual selection '+condition.key);
  includes(text,sentinel,route+' new unique engineering');
  includes(text,layoutSentinel,route+' selected final layout');
  for(const slot of plan.copy.slots)includes(text,slot.role+'：'+JSON.stringify(slot.text),route+' exact print manuscript');
  for(const slot of plan.copy.generatedSlots)includes(text,slot.role+' / '+slot.maxCharacters+'字以内 / 階層'+slot.priority,route+' generated role and limit');
  const camera=cameraContract(plan.values,{noPerson:plan.noPerson});
  if(camera)for(const clause of clauses(camera.framing_instruction))includes(text,clause,route+' actual fixed visible framing');
  assert.doesNotMatch(text,/sample-only marker|obsolete-identity-name|undefined|NaN|両手の全指/);
  assert.doesNotMatch(text,/【全選択の個別レシピ】|【選択済みの仕様資料：一場面へ統合する】/,'The audit/detail dump leaked into the actual compact handoff');
 }
 assert.equal(JSON.stringify(plan),before,'The actual compose route mutated the manifest or audit plan');
 const audit=renderInput(plan),auditMarker='\n\n【全選択の個別レシピ】',structured=JSON.parse(audit.split(auditMarker)[0]);
 includes(audit,auditMarker,'actual plan audit export');
 for(const condition of plan.conditions)for(const section of condition.sections)includes(audit,section.text,'retained audit '+condition.key+' / '+section.label);
 assert.deepEqual(structured.copy,plan.copy.slots.map(slot=>({role:slot.role,text:slot.text})),'The audit lost exact copy during compact integration');
 integrated++;
}
blocked.referenceManifest=manifest(blocked);
for(const [route,text] of Object.entries({composePrompt:actualPrompt(blocked),compileProduction:compileProduction(blocked,['画像生成の制作仕様 / BLOCKED'])})){
 assert.match(text,/画像生成を停止/);assert.match(text,/固定カメラと明示した顔向きが両立しない/);
 assert.doesNotMatch(text,/画像生成の制作仕様|完成作品を1枚生成|完成画像.*生成|完成した画像そのもの|画像作成機能|【通常制作|【短い統合制作指示】/,route+' emitted image-generation instructions for a blocked plan');
}
integrated++;
console.log('compact production: '+cases+' semantic comparisons and '+integrated+' actual integration cases passed; maximum detailed-length ratio '+maxRatio.toFixed(3));
