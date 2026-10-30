// Local, deterministic delivery checks. This module never decodes an image,
// contacts an image model, or turns a generation instruction into a verdict.
export const GENERATION_QUALITY_SCHEMA = 1;

const optionKeys = new Set(['medium','theme','costume','pose','mood','angle','palette','design','type','size','place']);
const explicitKeys = new Set(['hair','hairstyle','appearance','proportions','characterProportions','headRatio','expression','verticalFovDegrees']);
const noPersonSelection = values => /風景を主役|モチーフだけ|紋章・アイコン/.test(values.costume || '');
const plain = value => value && typeof value === 'object' && !Array.isArray(value);
const string = value => value == null ? '' : String(value);
const list = value => (Array.isArray(value) ? value : typeof value === 'string' ? value.split('\n') : []).filter(value => value != null && string(value).trim());
const copy = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
function freeze(value) {
  if (value && typeof value === 'object') { for (const child of Object.values(value)) freeze(child); Object.freeze(value); }
  return value;
}
const roleNames = Object.freeze({identity:'主参照',support:'補助参照',auxiliary:'補助参照',avoid:'似せない前作',drawing:'画風参照','style-preset':'画風参照',style:'画風参照',pose:'ポーズ参照',clothing:'衣装参照',costume:'衣装参照',background:'背景参照',composition:'構図参照','selection-sheet':'役割別選択見本','selection-condition':'項目見本'});
function referenceSnapshot(reference) {
  const name = string(reference.name || (typeof reference.file === 'string' ? reference.file : reference.file?.name));
  const role = string(reference.role || 'support');
  return {
    id:string(reference.id || reference.draftId || reference.referenceId || 'file:' + name + ':' + role),
    name, role,
    ...(reference.target != null ? {target:copy(reference.target)} : {}),
    ...(reference.targetId != null ? {targetId:string(reference.targetId)} : {}),
    ...(reference.scope != null ? {scope:copy(reference.scope)} : {}),
    ...(reference.assetId != null ? {assetId:string(reference.assetId)} : {}),
    ...(reference.roles ? {roles:copy(reference.roles)} : {}),
    pending:reference.pending === true || reference.attached === false || /ChatGPTへ直接添付する主参照/.test(name)
  };
}
function constraintSnapshot(values, production) {
  const source = plain(values.constraints) ? values.constraints : plain(production?.qualityConstraints) ? production.qualityConstraints : {};
  return {
    required:copy(source.required || source.fixed || []),
    allowedChanges:copy(source.allowedChanges || source.changeable || []),
    requestedChanges:copy(source.requestedChanges || source.change || []),
    forbidden:copy(source.forbidden || []),
    assignments:copy(source.assignments || values.assignments || [])
  };
}

export function createProductionRequest({edition,collection,creator,values={},profile={},variant={},production={},references=[],attachmentMode='direct',referenceRequired=false}={}) {
  const selections = copy(values), noPerson = production.noPerson === true || noPersonSelection(selections);
  const suppliedSubjects = values.subjects || production.qualityConstraints?.subjects;
  const subjects = Array.isArray(suppliedSubjects) ? copy(suppliedSubjects) : [{kind:noPerson ? 'non-person' : ['scenery','mark-object'].includes(values.sourceKind) ? 'derived-subject' : 'character',count:null,source:'existing-selection'}];
  const slots = (production.copy?.slots || []).map(slot => ({role:string(slot.role),text:string(slot.text),...(slot.position != null ? {position:copy(slot.position)} : {})}));
  return freeze({
    schemaVersion:GENERATION_QUALITY_SCHEMA, productionId:string(edition), collection:string(collection || values.collection || production.collection || 'halloween'),
    selections, subjects, noPerson,
    references:(Array.isArray(references) ? references : references?.references || []).map(referenceSnapshot),
    attachmentMode, referenceRequired:!!referenceRequired,
    // These are this visitor's entered context, never operator defaults.
    author:{name:string(profile.displayName),creator:string(creator || profile.creator || profile.id),activity:string(profile.biography),activityEnabled:profile.activityEnabled !== false},
    text:{mode:production.copy?.mode || (values.type === '文字を一切入れない' ? 'none' : 'unspecified'),slots,generatedSlots:copy(production.copy?.generatedSlots || [])},
    constraints:constraintSnapshot(values,production), variant:copy(variant),
    plannedValues:copy(production.values || values),
    conditionValues:(production.conditions || []).map(condition => ({key:condition.key,value:copy(condition.value)})),
    outputPrompt:null
  });
}

export function buildQualityPrompt(request, basePrompt) {
  if (typeof basePrompt !== 'string') throw new TypeError('制作指示の本文を確認できません。');
  const marker = request.productionId ? '【今回の制作ID】' + request.productionId + '\n' : '';
  const constraints = request.constraints;
  const explicit = [
    ['必須条件',constraints.required],['変更してよい条件',constraints.allowedChanges],
    ['今回変える条件',constraints.requestedChanges],['禁止条件',constraints.forbidden],['対象と参照・持物の対応',constraints.assignments]
  ].filter(([,value]) => Array.isArray(value) ? value.length : value && Object.keys(value).length).map(([label,value]) => label + '：' + JSON.stringify(value));
  // No selected option or copy slot is added here: a missing renderer value
  // must be detected against the original selections, not hidden by a ledger.
  const scope = '【今回の指定の優先範囲】今回の明示指定を参照の既定解釈より優先する。主参照の固定範囲は指定された役割まで。髪型・髪色・服装・背景・姿勢を一括固定せず、変更指定はその属性だけへ適用する。資料内の文字は印字原稿にせず、過去の制作条件を追加しない。';
  const extraRoles = {style:'線・塗り・材質・光・色彩の描き方だけ。顔・髪・服・配置・文字を移さない',pose:'姿勢・関節・支持・接触先だけ。顔・髪・服・カメラを移さない',costume:'服・靴・装身具の形と構造だけ。顔・髪・身体の姿勢・背景を移さない',clothing:'服・靴・装身具の形と構造だけ。顔・髪・身体の姿勢・背景を移さない',background:'背景の形・空間・配置だけ。人物・顔・衣装・文字を移さない',composition:'主題と補助物の位置・大きさ・重なりだけ。顔・髪・衣装・文字を移さない'};
  const extraReferenceLines = request.references.filter(ref => extraRoles[ref.role]).map(ref => JSON.stringify(ref.name) + '＝' + roleNames[ref.role] + '。' + extraRoles[ref.role] + (ref.target || ref.targetId ? '。対象：' + JSON.stringify(ref.target || ref.targetId) : '') + (ref.scope ? '。今回指定した範囲：' + JSON.stringify(ref.scope) : ''));
  return [basePrompt.startsWith(marker) ? '' : marker.trimEnd(),basePrompt,
    basePrompt.includes(scope) ? '' : scope,
    ...extraReferenceLines.filter(line => !basePrompt.includes(line)),
    ...explicit.filter(line => !basePrompt.includes(line))
  ].filter(Boolean).join('\n');
}

export function finalizeProductionRequest(request, prompt) {
  if (typeof prompt !== 'string') throw new TypeError('実際の制作指示を確認できません。');
  return freeze({...copy(request),outputPrompt:prompt});
}

function literalPresent(prompt, value) {
  return typeof value === 'string' && (prompt.includes(value) || prompt.includes(JSON.stringify(value)));
}
function referenceLines(prompt, reference) {
  const quoted = JSON.stringify(reference.name);
  return prompt.split('\n').filter(line => line.includes(reference.name) || line.includes(quoted));
}
const roleEvidence = Object.freeze({
  identity:/主参照|識別基準/,support:/補助|support/,auxiliary:/補助|auxiliary/,avoid:/前作|避ける|似せない|比較/,
  drawing:/画風|作風|描法|描画方法/, 'style-preset':/画風|作風|描法|描画方法/,style:/画風|作風|描法|描画方法/,
  pose:/ポーズ|姿勢|関節/,clothing:/衣装|服装/,costume:/衣装|服装/,background:/背景|舞台/,composition:/構図|配置/,
  'selection-sheet':/シート|役割別/,'selection-condition':/個別見本|項目見本/
});
function typedConditions(value) {
  return list(value).filter(plain).filter(item => typeof item.attribute === 'string' && item.value != null).map(item => ({target:string(item.target || item.targetId),attribute:item.attribute,value:item.value}));
}

export function inspectProductionRequest(request,{values,references,prompt=request?.outputPrompt,deliveryNames,copyPrompt,filePrompt,conflicts=[]}={}) {
  const started = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (!request || request.schemaVersion !== GENERATION_QUALITY_SCHEMA) throw new TypeError('制作条件の形式を確認できません。');
  const findings = [], checked = [];
  const add = (code,message,evidence,severity='error') => findings.push({code,severity,message,evidence:string(evidence)});
  if (typeof prompt !== 'string' || !prompt.trim()) return {status:'uninspected',imageStatus:'uninspected',findings:[{code:'missing-output',severity:'notice',message:'生成前の本文をまだ確認していません。',evidence:'制作指示がありません。'}],checked:[],durationMs:0};
  if (!request.productionId) add('missing-id','制作番号を確認できません。','制作IDが空です。');
  else {
    const ids = [...prompt.matchAll(/^【今回の制作ID】([^\n]*)/gm)].map(match => match[1]);
    if (ids.length !== 1 || ids[0] !== request.productionId) add('production-id','今回の制作番号と指示が一致しません。',ids.join(' / ') || '制作IDの記載なし');
    else checked.push('制作番号');
  }
  if (request.outputPrompt != null && prompt !== request.outputPrompt) add('changed-output','保存した制作指示と渡す本文が異なります。','確定後の本文差分あり');
  if (values && !same(copy(values),request.selections)) add('stale-selections','今回の選択と保存した制作条件が異なります。','選択データの差分あり');
  else checked.push('今回の選択');
  for (const [key,value] of Object.entries(request.selections)) {
    if (!same(request.plannedValues[key],value)) add('plan-selection','選択が制作仕様で変更されています。',key + '：' + JSON.stringify(value));
    const plannedCondition = request.conditionValues.find(condition => condition.key === key);
    if (plannedCondition && !same(plannedCondition.value,value)) add('condition-selection','選択と項目の制作条件が一致しません。',key);
    const applicable = !(request.noPerson && ['pose','mood'].includes(key));
    if (applicable && (optionKeys.has(key) || explicitKeys.has(key)) && typeof value === 'string' && value && !literalPresent(prompt,value)) add('missing-selection','選んだ条件が本文から抜けています。',key + '：' + value);
  }
  if (!findings.some(item => ['plan-selection','condition-selection','missing-selection'].includes(item.code))) checked.push('選択と出力本文');
  if (request.text.mode === 'none') {
    if (request.text.slots.length || request.text.generatedSlots.length) add('unexpected-text','文字なしの指定に印字原稿が含まれています。','確定原稿または自動編集の原稿枠あり');
    if (!/文字[^\n]{0,24}(?:なし|入れない|印字しない|描かない)|無文字/.test(prompt)) add('missing-no-text','文字なしの指定を本文で確認できません。','文字なしの指示が見つかりません。');
  } else {
    for (const slot of request.text.slots) if (slot.text && !literalPresent(prompt,slot.text)) add('exact-text','印字する文字列が本文と一致しません。',slot.role + '：' + slot.text);
  }
  if (!findings.some(item => ['unexpected-text','missing-no-text','exact-text'].includes(item.code))) checked.push('文字原稿');
  const refIds = new Set(), refNames = new Set(), namedReferences = new Map();
  for (const ref of request.references) {
    if (!ref.id || refIds.has(ref.id)) add('duplicate-reference','参照画像の識別子が重複しています。',ref.id || '識別子なし');
    refIds.add(ref.id);
    const previousNamed = namedReferences.get(ref.name);
    const intentionalSharedImage = previousNamed && ref.assetId && previousNamed.assetId === ref.assetId && previousNamed.role !== ref.role;
    if (!ref.name || (refNames.has(ref.name) && !intentionalSharedImage)) add('reference-name','参照画像のファイル名を区別できません。',ref.name || 'ファイル名なし');
    refNames.add(ref.name);
    namedReferences.set(ref.name,ref);
    const lines = referenceLines(prompt,ref);
    if (!lines.length) add('missing-reference','参照画像の指定が本文から抜けています。',ref.name);
    else if (roleEvidence[ref.role] && !lines.some(line => roleEvidence[ref.role].test(line))) add('reference-role','参照画像の役割を本文で確認できません。',ref.name + ' / ' + (roleNames[ref.role] || ref.role));
    if (['style-preset','drawing','style'].includes(ref.role)) {
      // An explicit assignment of a style file as the primary is a concrete
      // contradiction. Mentions such as “主参照とは別” are not contradictions.
      const identityLists = [...prompt.matchAll(/主参照「([^」]*)」/g)].map(match => match[1]);
      if (identityLists.some(names => names.split('・').includes(ref.name))) add('reversed-reference-role','画風見本が主参照として指定されています。',ref.name);
      if (lines.some(line => line.includes(ref.name) && /(?:＝|：)\s*(?:作成者の)?主参照[。・、\s]/.test(line))) add('reversed-reference-role','画風見本が主参照として指定されています。',ref.name);
    }
    if (Array.isArray(deliveryNames) && !ref.pending && !deliveryNames.includes(ref.name)) add('missing-file','制作指示にある参照画像が共有ファイルにありません。',ref.name);
    if (ref.pending) add('pending-reference',(roleNames[ref.role]||'参照画像')+'はChatGPTで追加してください。',ref.name,'notice');
  }
  if (references) {
    const actual = references.map(referenceSnapshot), byId = new Map(actual.map(ref => [ref.id,ref]));
    for (const ref of request.references) {
      if (!same(byId.get(ref.id),ref)) add('reference-assignment','画像の役割または対象との対応が変わっています。',ref.id + ' / ' + ref.name);
    }
    if (actual.length !== request.references.length) add('reference-set','今回と別の参照画像が含まれています。','参照件数が一致しません。');
  }
  if (request.referenceRequired && !request.references.some(ref => ref.role === 'identity')) {
    add('missing-primary',request.attachmentMode === 'bundle' ? '必要な主参照が制作セットにありません。' : '主参照はChatGPTで追加してください。','主参照の記載なし',request.attachmentMode === 'bundle' ? 'error' : 'notice');
  }
  if (Array.isArray(deliveryNames)) {
    for (const name of deliveryNames) if (!refNames.has(name)) add('unexpected-file','今回の制作条件にない画像が共有ファイルにあります。',name);
  }
  if (!findings.some(item => /reference|file/.test(item.code) && item.severity === 'error')) checked.push('参照の役割と対応');
  const required = typedConditions(request.constraints.required), byAttribute = new Map();
  for (const item of required) {
    const key = item.target + '\u0000' + item.attribute;
    if (byAttribute.has(key) && !same(byAttribute.get(key),item.value)) add('constraint-conflict','同じ対象・同じ属性に異なる必須条件があります。',item.target + ' / ' + item.attribute);
    byAttribute.set(key,item.value);
  }
  for (const item of typedConditions(request.constraints.forbidden)) {
    const key = item.target + '\u0000' + item.attribute;
    if (byAttribute.has(key) && same(byAttribute.get(key),item.value)) add('constraint-conflict','同じ条件が必須と禁止の両方に指定されています。',item.target + ' / ' + item.attribute);
  }
  const subjectIds = new Set(request.subjects.map(subject => string(subject.id || subject.targetId)).filter(Boolean));
  for (const assignment of list(request.constraints.assignments).filter(plain)) {
    const refId = assignment.referenceId || assignment.refId;
    const targetId = string(assignment.targetId || assignment.target);
    if (refId && !refIds.has(string(refId))) add('assignment-reference','対象に対応する参照画像がありません。',string(refId));
    if (targetId && subjectIds.size && !subjectIds.has(targetId)) add('assignment-target','持物または参照の対応先がありません。',targetId);
  }
  // Only typed same-attribute requirements are compared. Camera location,
  // camera direction, face direction and body direction remain separate keys.
  for (const conflict of conflicts || []) if (conflict?.severity === 'error' || conflict?.severity == null) add('selection-conflict',conflict.reason || '選択した条件が両立しません。',JSON.stringify(conflict.keys || []));
  for (const [label,body] of [['copy',copyPrompt],['file',filePrompt]]) if (body !== undefined && body !== prompt) add('delivery-text','コピーとファイルの制作指示が一致しません。',label);
  if ((copyPrompt !== undefined || filePrompt !== undefined) && !findings.some(item => item.code === 'delivery-text')) checked.push('コピーとファイルの本文');
  const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return {status:findings.some(item => item.severity === 'error') ? 'problems' : 'checked',imageStatus:'uninspected',findings,checked,durationMs:Math.max(0,Math.round((end-started)*100)/100)};
}

export function safeInspectProductionRequest(request,options) {
  try { return inspectProductionRequest(request,options); }
  catch { return {status:'error',imageStatus:'uninspected',findings:[{code:'inspection-error',severity:'notice',message:'生成前の条件確認を完了できませんでした。入力と画像は保持しています。',evidence:'確認処理の例外'}],checked:[],durationMs:0}; }
}

function reviewItems(request) {
  const selections = Object.entries(request.selections).filter(([key,value]) => optionKeys.has(key) && value && !(request.noPerson && ['pose','mood'].includes(key)));
  return [
    ...request.subjects.filter(subject => Number.isInteger(subject.count)).map(subject => '対象数：' + JSON.stringify(subject)),
    ...selections.map(([key,value]) => key + '：' + value),
    ...list(request.constraints.required).map(value => '必須条件：' + (typeof value === 'string' ? value : JSON.stringify(value))),
    ...list(request.constraints.forbidden).map(value => '禁止条件：' + (typeof value === 'string' ? value : JSON.stringify(value))),
    ...list(request.constraints.allowedChanges).map(value => '変更してよい条件（参照と異なるだけで失敗にしない）：' + (typeof value === 'string' ? value : JSON.stringify(value))),
    ...list(request.constraints.requestedChanges).map(value => '今回指定された変化（既に反映済みなら再変更しない）：' + (typeof value === 'string' ? value : JSON.stringify(value))),
    ...list(request.constraints.assignments).map(value => '対象と持物の対応：' + (typeof value === 'string' ? value : JSON.stringify(value))),
    ...Object.entries(request.variant||{}).filter(([key,value])=>value&&['camera','distance','layout',...(request.noPerson?[]:['face','expression','pose'])].includes(key)).map(([key,value])=>'今回の演出 '+key+'：'+value),
    ...(request.text.mode === 'none' ? ['文字・数字・署名を追加していないこと'] : request.text.slots.map(slot => '正確な文字：' + JSON.stringify(slot.text) + (slot.position ? ' / 位置：' + JSON.stringify(slot.position) : ' / 位置は選択デザインの文字領域'))),
    ...(request.text.mode === 'none'?[]:request.text.generatedSlots.map(slot=>'編集を許可した文字の役割（確定文字列ではない）：'+JSON.stringify(slot))),
    ...(request.noPerson ? ['人物・顔・手・人型を追加していないこと。顔や手の形の検査は非適用。'] : [])
  ];
}
const referenceRoles = request => request.references.map(ref => ref.name + '：' + (roleNames[ref.role] || ref.role) + (ref.target || ref.targetId ? ' / 対象：' + JSON.stringify(ref.target || ref.targetId) : '') + (ref.scope ? ' / 範囲：' + JSON.stringify(ref.scope) : ''));

export function buildImageReviewPrompt(request) {
  return [
    '完成画像の確認依頼 / 制作ID：' + request.productionId,
    'これは確認用の指示です。このツールでは完成画像を自動取得・判定していません。完成画像と必要な参照画像をこのメッセージへ添付し、実際に見える箇所だけを照合してください。新しい画像を生成・修正しないでください。',
    '【参照の役割】',...referenceRoles(request),
    '【今回の確認項目】',...reviewItems(request),
    '各項目を「確認済み」「明確な相違」「要確認」「未確認」に分け、根拠となる画像内の位置・見える特徴を短く示す。小さすぎる・遮蔽・見切れ・画像未添付は確認済みにしない。指定人数が不明なら推測せず、犬・ぬいぐるみを無条件に人物数へ加えない。',
    'ポーズの手・小物は数だけで判定せず、接触先と支持・握り方を確認する。「剣を両手で持つ」は二本の手がその剣を指定どおり握っているかを見る。カメラ位置・光軸・顔向き・身体向きは別々に照合する。固定指定のない髪色や衣装、許可された変化を相違にしない。',
    '顔は指定されたキャラクターの外見の参照として扱い、実在人物の身元の特定・認証をしない。かわいさや豪華さだけで自動失敗にしない。画像未取得や全項目未確認の場合に、作品全体の完全一致・100％・品質点数を作らない。'
  ].join('\n');
}

export function buildTargetedRepairPrompt(request,{imageName,issues=[],changes=[],preserve=[]}={}) {
  if (!string(imageName).trim()) throw new Error('修正する画像を選んでください。');
  const changed = list(changes), retained = list(preserve), observed = list(issues);
  if (!changed.length) throw new Error('今回直したい箇所を入力してください。');
  return [
    '選んだ箇所だけの修正依頼 / 制作ID：' + request.productionId,
    '修正対象画像：' + string(imageName),
    '元画像は比較と復元用に保持します。下の修正は利用者が選んだものです。修正対象・必要な参照が確認できなければ、足りない画像だけを求めてください。',
    ...(observed.length ? ['利用者が確認した問題：',...observed.map(value => '・' + string(value))] : ['ツールによる完成画像の自動判定は行っていません。利用者が指定した変更だけを行ってください。']),
    '今回直す箇所：',...changed.map(value => '・' + string(value)),
    '保持する箇所：',...(retained.length ? retained.map(value => '・' + string(value)) : ['・今回の修正で指定していない領域・特徴・文字・構図を保持する。']),
    '引き続き使う参照の役割：',...referenceRoles(request),
    '引き続き守る制作条件：',...reviewItems(request),
    '修正完了時は、変更箇所と保持対象の両方を元画像・参照・今回の条件で再確認する。部分修正でも他の領域が変わる可能性があるため、完全保持したと推測で断言しない。曖昧な所見だけで追加の再生成を繰り返さず、悪化したら元画像へ戻せるよう別画像として返す。',
    '修正版は画像作成機能の通常の生成画像として会話へ表示する。元画像を消さず、説明文やファイルリンクだけで修正版を代用しない。'
  ].join('\n');
}
