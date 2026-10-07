import {modeFoundation} from './japan-direction.js?v=22.0.0';
import {imageOutputContract} from './output-contract.js?v=22.0.0';
import {opticalSignature} from './optical-effects.js?v=22.0.0';
import {colorPolicy} from './color-policy.js?v=22.0.0';

export const conditionOwners=Object.freeze({
 medium:'描線・陰影・画材・光学',design:'画像と原稿の領域・読み順',
 theme:'出来事・相手・前後の痕跡',costume:'主役の役柄・衣服と道具の構造',
 mood:'表情・視線・顔の角度',place:'一つの舞台・構造・時刻',
 pose:'身体の配置・支持点・重心',palette:'基調色・副色・面積配分',
 type:'印字を許可する原稿・文字量',size:'作品の縦横比・希望寸法'
});
const unique=items=>[...new Set(items.filter(Boolean))];
const contract=c=>({selected:c.value,applicability:c.execution.applicability,
 method:c.execution.method,...(c.execution.line?{line:{selected:c.execution.line.selected,method:c.execution.line.method}}:{})});
function renderInputObject(plan){
 const byKey=Object.fromEntries(plan.conditions.map(c=>[c.key,c]));
 const v=plan.variant,selected=plan.values;
 const material=byKey.medium;
 const color=colorPolicy(selected);
 const [,pixels,ratio]=selected.size.split('｜');
 const [width,height]=pixels.split('×').map(Number);
 const side=!plan.noPerson&&/真横/.test(v.camera||'');
 const optical=selected.medium==='クリスタル透光アニメ'?'透明面の境界で背後の輪郭がずれ、その内部に二重反射が見える広い結晶透光層。'
  :selected.medium==='宝石ホログラムアニメ'?'前後に離れた広い半透明投影面、面ごとの二重輪郭と途切れた走査線。':'';
 const input={
  output:'完成画像を1枚。仕様書・ツール画面として描かない。',
  cultural_foundation:modeFoundation(plan.collection),
  required_before_details:{
   layout:byKey.design.execution.method,
   medium:material.execution.method,
   palette:color.restricted?'全領域の使用色：'+color.allowed+'。参照の髪・肌・瞳、光、反射、文字もこの色域で描き直す。':byKey.palette.execution.method,
   ...(optical?{optical_geometry:optical+'主題と周囲の空間をまたぐ面として描き、宝飾の点光だけにしない。'+(color.restricted?'透過・屈折・反射も許可色だけ。':'')}:{}),
   frame:plan.noPerson?'選択した主題の全景を指定形式の画像領域へ収める。':v.distance+(/全身|足先|靴から頭/.test(v.distance)?'。文字枠の下に手足を隠さず、頭・手・足・支持面を画像領域内へ収める。':'。指定した画角の対象を文字枠で隠さない。'),
   ...(side?{body_projection:'胴体・肩・骨盤・膝の向きはカメラに対して真横90度。奥側の肩と骨盤が手前側に重なる側面投影。身体を正面や斜め前へ回さない。'}:{})
  },
  canvas:{width_px:width,height_px:height,aspect_ratio:ratio,...contract(byKey.size),format:selected.design},
  drawing:{...contract(material),medium:selected.medium,
   visible_signature:material.checks,optics:opticalSignature(selected,{noPerson:plan.noPerson})},
  identity:plan.noPerson?'選択した景物・物体・図案。人物なし。':'主参照は顔の形・目鼻の配置比率・髪の形・年齢感・性別表現を識別する資料。参照の撮影角度・表情・肌の質感を複製せず、今回の画風と配色で新しく描く。'+(color.restricted?'参照の肌色・髪色・瞳色も許可色へ変換し、形と明度差で同じ人を表す。':''),
  scene:Object.fromEntries(['theme','costume','place','pose','mood','palette'].map(key=>[key,contract(byKey[key])])),
  camera:plan.noPerson?'人物用の表情・顔向き・身体動作は適用しない。':{face:v.face,expression:v.expression,body:v.pose,distance:v.distance,angle:v.camera,...(side?{torso_yaw_degrees:90,projection:'肩・骨盤・膝は側面投影。顔向きの指定を理由に胴体を鑑賞者側へ回さない。'}:{})},
  layout:contract(byKey.design),
  typography:contract(byKey.type),
  copy:plan.copy.slots.map(s=>({role:s.role,text:s.text})),
  text_rule:plan.copy.mode==='none'?'文字・数字・署名なし。':'copyの原稿だけを正確に印字。画風名・ページ番号・制作ID・未指定の文字を加えない。',
  combination_rules:plan.interactions,notes:plan.notes
 };
 return input;
}
export function renderInput(plan){
 const input=renderInputObject(plan);
 // Every selected clause belongs inside the actual image-call input, including
 // safety margins and the prohibition on unsolicited inset illustrations.
 return JSON.stringify(input,null,2)+'\n\n【全選択の個別レシピ】\n'+plan.conditions.flatMap(c=>[
  c.index+'. '+c.name+'：'+c.value,...unique(c.sections.map(s=>s.label+'：'+s.text)).map(t=>'・'+t)
 ]).join('\n');
}
function between(lines,start,end){
 const from=lines.findIndex(s=>s.startsWith(start));
 if(from<0)return [];
 const to=lines.findIndex((s,i)=>i>from&&s.startsWith(end));
 return lines.slice(from,to<0?undefined:to);
}

// Natural-language handoff for ordinary ChatGPT (including 5.5).
// Full JSON execution exports remain available through renderInput for audits.
export function renderDetailedChatInput(plan){
 const v=plan.variant;
 const compiled=renderInputObject(plan);
 return [
  plan.collection==='everyday'?'【作品モード】普段使い':'【作品モード】Halloween',
  modeFoundation(plan.collection),
  ...Object.values(compiled.required_before_details),
  '主役：'+compiled.identity,
  '【画像で必ず見える画風の特徴】',
  ...plan.conditions.find(c=>c.key==='medium').checks,
  ...opticalSignature(plan.values,{noPerson:plan.noPerson}),
  '【全選択の個別レシピ】',
  ...plan.conditions.flatMap(c=>[
   c.index+'. '+c.name+'：'+c.value,
   '担当：'+conditionOwners[c.key],
   '描き分け：'+c.sections.map(s=>s.label).join('、'),
   ...unique([c.execution.method,...c.sections.map(s=>s.text).filter(t=>!c.execution.method.includes(t)),c.execution.line?.method]).map(t=>'・'+t)
  ]),
  '【今回の構図】',
  ...(plan.noPerson?['人物の顔・表情・ポーズ：適用しない。']:[
   '顔の向き：'+v.face,'明確な表情：'+v.expression,
   '選んだポーズ：'+plan.values.pose,'身体の動き：'+v.pose,
   '撮影距離：'+v.distance,'カメラ：'+v.camera,
   ...(/真横/.test(v.camera||'')?['胴体・肩・骨盤・膝はカメラに対して真横90度。']:[])
  ]),
  v.layout&&'画面設計：'+v.layout,v.background&&'背景の骨格：'+v.background,
  ...(v.tone?['作品全体の温度：'+v.tone]:[]),
  '光：'+v.light,'奥行き：'+v.depth,'動き：'+v.motion,'追加物：'+v.motif,
  ...(v.locked?['固定と変更の方針：'+v.locked]:[]),
  ...plan.interactions,
  ...unique(plan.notes.filter(n=>n!==modeFoundation(plan.collection))),
  ...(v.previous||[]).map((p,i)=>'直近'+(i+1)+'から繰り返さない未指定の演出：'+(plan.noPerson?[p.layout]:[p.face,p.expression,p.distance,p.pose,p.layout]).filter(Boolean).join(' / ')+'。明示した条件は変えない。'),
  '選択したセリフ：'+plan.values.line,
  '【作品内へ印字する確定原稿】',
  plan.copy.mode==='none'?'文字・数字・署名のない完成。':plan.copy.slots.map(slot=>slot.role+'：'+JSON.stringify(slot.text)).join('\n'),
  '原稿は上記だけ。項目名・制作番号・未指定の号数・日付・疑似文字を印字しない。'
 ].filter(Boolean).join('\n');
}
// Remove only exact duplicate whole lines; preserve every full recipe clause.
export function renderChatInput(plan){
 const seen=new Set();
 return renderDetailedChatInput(plan).split('\n').filter(line=>{
  const normalized=line.replace(/^・/,'').trim();
  if(!normalized||seen.has(normalized))return false;seen.add(normalized);return true;
 }).join('\n');
}
export function compileProduction(plan,originalLines){
 return [
  ...imageOutputContract,
  '【通常制作：完成画像を1回で生成】',
  originalLines[0],
  '【参照と人物】',
  '制作の基準は各項目のタイトルと具体条件。見本の人物は顔の参照ではない。見本の性別や構図へ置き換えない。',
  ...between(originalLines,'【作成者が添付する参照画像】','【10の選択】'),
  ...originalLines.filter(s=>/^(限定色|墨|水彩)の必須条件：/.test(s)),
  ...between(originalLines,'【10の選択】','用途：'),
  originalLines.find(s=>s.startsWith('用途：')),
  '【画像生成へ渡す作画条件：開始】',renderChatInput(plan),'【画像生成へ渡す作画条件：終了】',
  ...between(originalLines,'【物語と舞台を一場面に統合】','【色・光・素材の設計】'),
  ...between(originalLines,'【似た作品への回帰を防ぐ】','【作品内の文字・広告編集】'),
  '完成した画像そのものを1枚、画像作成機能の通常の生成画像として表示する。文章だけで完成扱いにしない。'
 ].join('\n');
}
