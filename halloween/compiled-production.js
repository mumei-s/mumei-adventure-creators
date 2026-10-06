import {imageOutputContract} from './output-contract.js?v=17';
import {opticalSignature} from './optical-effects.js?v=17';

export const conditionOwners=Object.freeze({
 medium:'描線・陰影・画材・光学',design:'画像と原稿の領域・読み順',
 theme:'出来事・相手・前後の痕跡',costume:'主役の役柄・衣服と道具の構造',
 mood:'表情・視線・顔の角度',place:'一つの舞台・構造・時刻',
 pose:'身体の配置・支持点・重心',palette:'基調色・副色・面積配分',
 type:'印字を許可する原稿・文字量',size:'作品の縦横比・希望寸法'
});
const unique=items=>[...new Set(items.filter(Boolean))];
const contract=c=>({selected:c.value,applicability:c.execution.applicability,
 method:c.execution.method,visible_requirements:c.execution.evidence,
 incomplete_if:c.execution.reject,...(c.execution.line?{line:c.execution.line}:{})});
export function renderInput(plan){
 const byKey=Object.fromEntries(plan.conditions.map(c=>[c.key,c]));
 const v=plan.variant,selected=plan.values;
 const material=byKey.medium;
 const input={
  output:'完成画像を1枚。仕様書・ツール画面として描かない。',
  canvas:{...contract(byKey.size),format:selected.design},
  drawing:{...contract(material),medium:selected.medium,
   visible_signature:material.checks,optics:opticalSignature(selected,{noPerson:plan.noPerson})},
  identity:plan.noPerson?'選択した景物・物体・図案。人物なし。':'添付した主参照の顔の形と配置比率・髪型・年齢感・性別表現を保ち、同じ人を指定画風で描き起こす。',
  scene:Object.fromEntries(['theme','costume','place','pose','mood','palette'].map(key=>[key,contract(byKey[key])])),
  camera:plan.noPerson?'人物用の表情・顔向き・身体動作は適用しない。':{face:v.face,expression:v.expression,body:v.pose,distance:v.distance,angle:v.camera},
  layout:contract(byKey.design),
  typography:contract(byKey.type),
  copy:plan.copy.slots.map(s=>({role:s.role,text:s.text})),
  text_rule:plan.copy.mode==='none'?'文字・数字・署名なし。':'copyの原稿だけを正確に印字。画風名・ページ番号・制作ID・未指定の文字を加えない。',
  combination_rules:plan.interactions,notes:plan.notes
 };
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

// One normal generation request for every format. Exact per-option recipes stay
// once; SVG templates, repairs and verification records remain separate actions.
export function compileProduction(plan,originalLines){
 const medium=plan.conditions.find(c=>c.key==='medium'),v=plan.variant;
 const optics=opticalSignature(plan.values,{noPerson:plan.noPerson});
 const executed=plan.noPerson?['人物の顔・表情・ポーズ：適用しない。']:[
  '顔の向き：'+v.face,'明確な表情：'+v.expression,
  '選んだポーズ：'+plan.values.pose,'身体の動き：'+v.pose,
  '撮影距離：'+v.distance,'カメラ：'+v.camera,
  ...(/真横/.test(v.camera||'')?['胴体・肩・膝はカメラに対して真横90度。顔は指定した自然な首の回旋で合わせる。']:[])
 ];
 return [
  originalLines[0],...imageOutputContract,
  '【通常制作：完成画像を1回で生成】',
  '選択条件を固定し、完成した画像そのものを1枚、直ちにこの会話へ表示する。非表示の再生成ループは行わない。生成前の追加検索・仕様書作成・SVG組版を開始しない。',
  '下の詳細仕様を照合に使い、画像生成機能へは「画像生成へ渡す入力」のブロックを渡す。操作・検査・納品の説明を描画用の指示へ混ぜない。入力内の各項目は確定値。画風の特徴と個別レシピが食い違う場合は、項目の担当規則で同時に成立させてから1回だけ生成する。',
  '【画像生成へ渡す入力：開始】',renderInput(plan),'【画像生成へ渡す入力：終了】',
  '【画像で必ず見える画風の特徴】',
  medium.value+'：'+medium.checks.join(' / '),...optics,
  'この特徴を主役・衣装・背景へ同じ描画方法で通す。参照は識別の形の資料。元の表面を残して小物やフィルターだけを足す処理にしない。',
  ...between(originalLines,'【作品モード】','【10の選択】'),
  ...between(originalLines,'【10の選択】','【選択を具体的に実行する制作条件】'),
  '【選択条件の担当】',...Object.entries(conditionOwners).map(([key,owner])=>plan.conditions.find(c=>c.key===key).name+'：'+owner),
  ...plan.interactions,...plan.notes,
  '【今回実行する構図と動作】',...executed,
  '光：'+v.light,'奥行き：'+v.depth,'動き：'+v.motion,'追加物：'+v.motif,
  v.locked?'固定と変更の方針：'+v.locked:'',
  ...(v.previous||[]).map((p,i)=>'直近'+(i+1)+'から繰り返さない未指定の演出：'+(plan.noPerson?[p.layout]:[p.face,p.expression,p.distance,p.pose,p.layout]).filter(Boolean).join(' / ')+'。今回明示した条件は変更しない。'),
  ...between(originalLines,'【物語と舞台を一場面に統合】','【色・光・素材の設計】'),
  '【作品内へ印字する確定原稿】',
  plan.copy.mode==='none'?'文字・数字・署名のない完成。':plan.copy.slots.map(s=>s.role+'：'+JSON.stringify(s.text)).join('\n'),
  '原稿は上記のみ。画風名・技法名・制作ID・未指定のページ番号・日付・号数は印字しない。原稿の語句を変更せず、空きを疑似文字で埋めない。',
  '【実画像での完成検査】',
  ...plan.conditions.filter(c=>c.key!=='medium').map(c=>c.name+'：'+unique(c.key==='type'?c.checks.map(t=>t.split('：')[0]):c.checks).join(' / ')),
  '画像を先に表示し、選んだ特徴が実際に見えるか確認する。指示を記載した事実だけで合格としない。不足があれば箇所を短く伝え、自動で再生成しない。希望寸法や60秒以内の達成は実測せず断言しない。文章だけで完成扱いにしない。'
 ].join('\n');
}
