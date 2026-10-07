import {compileProduction} from './compiled-production.js?v=18';
import {composeArtworkStage,composeArtworkRepair} from './artwork-stage.js?v=18';
import {needsStagedProduction,composeLayoutStage} from './staged-production.js?v=18';

const stagedInputs=new WeakMap();
export function stagePrompts(plan){
 if(!needsStagedProduction(plan))return null;
 if(stagedInputs.has(plan))return stagedInputs.get(plan);
 const stages=Object.freeze({artwork:composeArtworkStage(plan),repair:composeArtworkRepair(plan),layout:composeLayoutStage(plan)});
 stagedInputs.set(plan,stages);return stages;
}

function between(lines,start,end){
 const from=lines.findIndex(s=>s.startsWith(start));
 if(from<0)return [];
 const to=end?lines.findIndex((s,i)=>i>from&&s.startsWith(end)):-1;
 return lines.slice(from,to<0?undefined:to);
}

// The master is an execution plan for the conversation assistant. Each image
// call receives one delimited input, never the entire publication specification.
export function composeStagedMaster(plan,originalLines,{verbose=false}={}){
 if(!verbose)return compileProduction(plan,originalLines);
 if(!needsStagedProduction(plan))return compileProduction(plan,originalLines);
 const stages=stagePrompts(plan);
 return [
  originalLines[0],
  '【制作手順：主画像を確認してから誌面を組む】',
  '完成品は1枚。第1段階で主画像を生成し、実画像を検査してから、第2段階でSVGの組版によりその画像を誌面へ配置する。この仕様書全体を一回の画像生成へ渡さない。',
  '会話の担当者が下の参照の役割と選択を読み、第1段階と必要な画風修正の入力だけを画像生成機能へ渡す。第2段階は同梱するSVGテンプレートをコードまたはブラウザーで描画する。照合用の全体資料や別段階の原稿を画像生成の入力に混ぜない。',
  (plan.noPerson?'第1段階は選択主題を人物なしで描く。参照を使う項目が明示されている場合だけ、その景物や配色の参照を使う。':'第1段階では作成者の主参照と、その選択に必要な補助参照だけを使う。')+'出力した主画像を実際に拡大し、画風・主題・姿勢・配色・全外形を確認する。生成した事実だけで合格としない。',
  '画風が不適合なら、制作途中の主画像だけを添付して「画風修正用入力」を実行する。姿勢や主題の問題はその箇所を直して再検査する。未達の主画像を第2段階へ進めない。',
  '第2段階は、確認に合格した第1段階の生成画像1枚だけを素材にする。元の人物写真や選択画面の見本を再添付しない。SVGの画像枠へ元画像を埋め込み、同じ外形・画風の1図版として収める。画像生成による再描画では誌面を作らない。',
  '生成機能や確認に制約があり、この手順を完了できない場合は、どの段階が未完了か伝える。一括生成へ無言で戻したり、未検査の画像を完成扱いしたりしない。',
  '',
  '【会話担当者が先に読む参照の役割と選択】',
  ...between(originalLines,'【作品モード】','【10の選択】'),
  ...between(originalLines,'【10の選択】','【選択を具体的に実行する制作条件】'),
  '',
  '【第1段階の生成用入力：開始】',stages.artwork,'【第1段階の生成用入力：終了】',
  '',
  '【必要な場合の画風修正用入力：開始】',stages.repair,'【必要な場合の画風修正用入力：終了】',
  '',
  '【第2段階の生成用入力：開始】',stages.layout,'【第2段階の生成用入力：終了】',
  '',
  '【照合用の全体資料：画像生成へ一括で渡さない】',
  '次は完成品の照合に使う形式・文字・用途の全条件。主画像を描く第1段階の入力へ追加しない。画風・衣装・場面などの全条件は第1段階用入力に記載した。',
  ...plan.conditions.filter(c=>['design','type','size'].includes(c.key)).flatMap(c=>[c.name+'：'+c.value,...c.sections.map(s=>'・'+s.label+'：'+s.text)]),
  ...between(originalLines,'【物語と舞台を一場面に統合】','【色・光・素材の設計】'),
  ...between(originalLines,'【今回必須の演出】','【似た作品への回帰を防ぐ】'),
  ...(plan.interactions||[]),...plan.notes,
  '【実画像での完成検査】',
  ...plan.conditions.map(c=>'検査'+c.index+' / '+c.name+'：'+c.checks.join(' / ')),
  ...between(originalLines,'【似た作品への回帰を防ぐ】','【作品内の文字・広告編集】'),
  ...between(originalLines,'【技法と品質】'),
 ].join('\n');
}
