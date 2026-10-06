import {colorPolicy} from './palette-recipes.js?v=13';

const artworkKeys=['medium','theme','costume','mood','place','pose','palette'];
const render=c=>[c.name+'：'+c.value,...c.sections.map(s=>'・'+s.label+'：'+s.text)];

// The first image call receives only the drawing task. Publication copy and
// layout are deliberately absent, so they cannot compete with style transfer.
export function composeArtworkStage(plan){
 const values=plan.values||Object.fromEntries(plan.conditions.map(c=>[c.key,c.value]));
 const selected=artworkKeys.map(key=>plan.conditions.find(c=>c.key===key)).filter(Boolean);
 const variant=plan.variant||{},color=colorPolicy(values);
 const fullBody=!plan.noPerson&&/全身|足先|尾びれ|あぐら|床|椅子|座|寝|横た|立|走|跳|踊|浮/.test((values.pose||'')+' '+(variant.distance||''));
 return [
  '【第1段階：選択画風の主画像を制作】',
  '以下の描画条件だけを画像生成機能へ渡し、主画像を1枚生成して実際の画像を返す。文字・数字・署名・枠・複数画面を描かず、単独の一場面にする。',
  plan.noPerson?'選択主題の形・素材・配置を今回の画風で描く。人物や人型へ置換しない。':
   '作成者の主参照は人物の輪郭、目鼻口の形と配置比率、髪の形、年齢感、体格、性別表現、固有の印を読み取るために使う。同じ人物を、選択した描画方法で最初から描き起こす。元画像の皮膚・髪の微細質感、照明、表情、顔の傾き、身体のポーズを完成画像の下地に残さない。衣装の名称から別人へ置換しない。',
  '項目の見本画像は入力しない。項目タイトルと次の制作条件だけから画風と場面を作る。',
  ...selected.flatMap(c=>['',...render(c)]),
  '',
  '【この主画像の画角】',
  fullBody?'正方形1:1の画面を使い、主役の頭頂・飾り・両腕・両膝・足先または尾びれまで、姿勢全体を周囲約12%の余白を残して収める。あぐらは左右の膝の横幅を先に収め、全身を一様に小さくする。広さが必要ならカメラを引き、頭や膝を切って埋めない。':
   '正方形1:1の画面を使い、選んだ主題と必要な周囲を一つの画像に収める。指定された範囲の重要な輪郭の外側に約12%の余白を残す。',
  ...(plan.noPerson?[]:[
   '顔の向き：'+variant.face,
   '表情：'+variant.expression,
   '身体の動作：'+variant.pose,
   'カメラの向き：'+variant.camera,
   '顔角度と身体動作は参照画像から複写せず、今回の上記指定を実行する。正面の指定では首をまっすぐに保ち、参照の上目遣いと首の傾きを戻さない。'
  ]),
  '奥行き：'+variant.depth,
  '光：'+variant.light,
  '動き：'+variant.motion,
  '追加物：'+variant.motif,
  '許可色：'+color.allowed+'。反射と投影もこの色域へ収める。',
  ...(plan.collection==='everyday'?['普段使いの作品。幻想・魔法・Halloweenの装飾は、それを明示的に選択したときだけ描く。']:[]),
  '',
  '【画像ができてから確認すること】',
  ...selected.map(c=>c.name+'：'+c.checks.join(' / ')),
  '出力画像を拡大して主題の描画方法・固有特徴・姿勢・配色と、切れている重要な輪郭がないか確認する。指示を書いた事実だけで合格としない。',
  '画風の主要な特徴や選択した姿勢が不成立なら、この段階の画像を修正し、成立するまで次の段階へ渡さない。修正できない場合は不足箇所を明示し、達成したと主張しない。',
  '画像生成の結果を画像そのものとして返す。画像を出さずに、文章だけで完了したと返さない。'
 ].join('\n');
}

export function composeArtworkRepair(plan){
 const medium=plan.conditions.find(c=>c.key==='medium');
 const values=plan.values||Object.fromEntries(plan.conditions.map(c=>[c.key,c.value]));
 const color=colorPolicy(values);
 return [
  '【第1段階の画風を修正】',
  '添付した制作途中の主画像を、選択画風「'+medium.value+'」の描画方法へ全面的に描き直してください。主画像の人物・物・構図を保ち、描画そのものを変換する画像編集を実行してください。',
  '入力する画像は直前の主画像1枚だけ。元の人物写真や項目の見本は再入力しない。',
  plan.noPerson?'主題の外形、配置、固有の模様、背景、光の起点、画角と余白を保つ。人物や人型を追加しない。':'今ある主題の外形、目鼻口の配置比率、年齢感、性別表現、髪の形、衣装、表情、顔角度、身体の動作、物体の配置、背景、光の起点、画角と余白を保つ。表面を塗り直すために別人へ変更しない。',
  '変えるのは描線、面の塗り方、明暗の境界、素材の表し方。元の表面へ少数の線や光を追加する加工で済ませず、主題の内部の面まで次の工程で置き換える。',
  ...render(medium),
  '使用色は'+color.allowed+'。同じ配色と色の配置を維持し、画風が必要とする明暗差と材質を成立させる。',
  '文字・数字・署名を入れない。場面や装飾を追加して描画の不一致を隠さず、同じ一場面として仕上げる。',
  '完成検査：'+medium.checks.join(' / '),
  '修正画像を拡大して検査する。見えていない特徴を達成したと主張せず、未達なら残る箇所を伝える。画像そのものを返す。'
 ].join('\n');
}
