import {opticalColors,opticalSignature} from './optical-effects.js?v=28.1.1';
import {colorPolicy} from './palette-recipes.js?v=28.1.1';
import {formatFor} from './formats.js?v=28.1.1';
import {cameraContract} from './angles.js?v=28.1.1';
import {selectionIntegrationInstructions} from './output-contract.js?v=28.1.1';
import {photoReconstruction} from './photo-design.js?v=28.1.1';
import {artworkBasisContract} from './artwork-basis.js?v=28.1.1';

const artworkKeys=['medium','theme','place','costume','pose','mood','angle','palette'];
const render=c=>[c.name+'：'+c.value,...c.sections.map(s=>'・'+s.label+'：'+s.text)];

// The first image call receives only the drawing task. Publication copy and
// layout are deliberately absent, so they cannot compete with style transfer.
export function composeArtworkStage(plan,{embedded=false}={}){
 const values=plan.values||Object.fromEntries(plan.conditions.map(c=>[c.key,c.value]));
 const selected=artworkKeys.map(key=>plan.conditions.find(c=>c.key===key)).filter(Boolean);
 const variant=plan.variant||{},color=colorPolicy(values),optics=opticalColors(values);
 const geometry=cameraContract(values,{noPerson:plan.noPerson});
 const photo=photoReconstruction(values.medium,{noPerson:plan.noPerson,values});
 const fullBody=!plan.noPerson&&/全身|足先|尾びれ|あぐら|床|椅子|座|寝|横た|立|走|跳|踊|浮/.test((values.pose||'')+' '+(variant.distance||''));
 const portraitInterview=formatFor(values.design).kind==='interview'&&/｜\d+×\d+｜(210:297|2:3|9:16|3:4|4:5)$/.test(values.size);
 const frame=embedded?'完成誌面の大きな主画像領域':portraitInterview?'縦2:3の画面':'正方形1:1の画面';
 const crystal=values.medium==='クリスタル透光アニメ';
 return [
  embedded?'【完成誌面の主画像を描く条件】':'【第1段階：選択画風の主画像を制作】',
  embedded?'完成画像の主画像領域を以下の画風で描く。人物・衣装・背景を同じ描画方法で統一し、文字組みと一緒に完成画像1枚へ仕上げる。':
   '以下の制作仕様を一つの場面へ統合した画像生成用プロンプトにまとめ、主画像を1枚生成して実際の画像を返す。文字・数字・署名・枠・複数画面を描かず、単独の一場面にする。',
  ...selectionIntegrationInstructions,
  ...render(selected.find(c=>c.key==='medium')),
  ...(geometry?['【固定カメラ：描画前に確定】',...geometry.instructions]:[]),
  ...(photo?['【写真化の基準】',...photo.sections.map(s=>s.label+'：'+s.text)]:[]),
  ...(crystal&&!plan.noPerson?['【最優先の描画方法】手描きの2Dアニメイラスト。輪郭と髪束を細い色線で描き、肌・髪・衣装を明快な色面で塗り、影の境界を鋭いセル影にする。顔の鼻は短い描線、口は簡潔な線と色面で構成する。光の質感も描線と透明な色層の組み合わせで描き、写真的な肌・実写の唇・3D人形の顔を残さない。参照は同じ人物と識別する造形だけに使う。']:[]),
  plan.noPerson?'選択主題の形・素材・配置を今回の画風で描く。人物や人型へ置換しない。':photo?'主参照から同じキャラクターと識別できる特徴を読み取り、自然な人物の立体と実物の材質へ再構成する。イラストの目の大きさ・各部の寸法比・セル影を固定せず、選択した衣装・表情・ポーズと識別特徴を保つ。':
   '作成者の主参照は人物の輪郭、目鼻口の特徴的な並び、髪の形、年齢感、体格の特徴、性別表現、固有の印を読み取るために使う。同じ人物と識別できる特徴の組合せを、選択作画の形の整理・誇張・省略・頭身へ翻訳して最初から描き起こす。ちびキャラでは大きな頭と短い身体へ変更し、参照の各部の寸法や頭身を固定しない。元画像の皮膚・髪の微細質感、照明、表情、顔の傾き、身体のポーズを完成画像の下地に残さない。衣装の名称から別人へ置換しない。',
  '項目の見本画像は入力しない。項目タイトルと次の制作条件だけから画風と場面を作る。',
  '【画風の必須特徴】',...plan.conditions.find(c=>c.key==='medium').checks,...opticalSignature(values,{noPerson:plan.noPerson}),
  ...selected.filter(c=>c.key!=='medium').flatMap(c=>['',...render(c)]),
  '',
  '【この主画像の画角】',
  geometry?frame+'を使う。'+geometry.framing_instruction:fullBody?frame+'を使い、主役の頭頂・飾り・両腕・両膝・足先または尾びれまで、姿勢全体を収める。輪郭の外側に必要な5〜8%の安全余白を確保し、人物は図版の高さの70〜85%を使って大きく描く。あぐらやしゃがむ姿勢では膝の横幅と足の接地を保ち、過剰な背景で人物を小さくしない。':
   frame+'を使い、選んだ主題と必要な周囲を一つの画像に収める。重要な輪郭に5〜8%の安全余白を残し、主題を大きく描く。',
  ...(plan.noPerson?[]:[
   '顔の向き：'+variant.face,
   '表情：'+variant.expression,
   '身体の動作：'+variant.pose,
   'カメラの向き：'+variant.camera,
   ...(/真横/.test(variant.camera||'')?['横位置の実行：カメラは胴体に対して真横の90度へ置く。肩・胴体・膝は横向きの輪郭を保ち、正面や斜め前の三分の一横顔構図へ戻さない。顔の回転はこの横向きの身体に対して自然な首の回旋で合わせ、頭と胴体を無理に同じ向きへ固定しない。']:[]),
   '顔角度と身体動作は参照画像から複写せず、今回の上記指定を実行する。正面の指定では首をまっすぐに保ち、参照の上目遣いと首の傾きを戻さない。'
  ]),
  '奥行き：'+variant.depth,
  '光：'+variant.light,
  '動き：'+variant.motion,
  '追加物：'+variant.motif,
  '基調色：'+color.allowed+'。'+(optics.instruction||'反射もこの色域へ収める。'),
  ...(plan.collection==='everyday'?['普段使いの作品。幻想・魔法・Halloweenの装飾は、それを明示的に選択したときだけ描く。']:[]),
  '',
  '【画像ができてから確認すること】',
  ...(geometry?geometry.checks:[]),
  ...(photo?photo.checks:[]),
  ...selected.map(c=>c.name+'：'+c.checks.join(' / ')),
  '出力画像を拡大して主題の描画方法・固有特徴・姿勢・配色と、切れている重要な輪郭がないか確認する。指示を書いた事実だけで合格としない。',
  embedded?'完成画像を会話に表示してから検査する。不足があれば短く伝え、画像を隠したまま自動再生成や別工程を繰り返さない。':
   '最初の画像を会話に表示してから検査する。画風の主要な特徴や選択した姿勢が不成立なら、不足箇所を示し、次の段階へ渡さない。今回の生成は1回までで自動の画風修正・再生成は追加しない。達成していない条件を達成したと主張しない。',
  '画像生成の結果を画像そのものとして返す。画像を出さずに、文章だけで完了したと返さない。'
 ].join('\n');
}

export function composeArtworkRepair(plan,{compact=false}={}){
 const medium=plan.conditions.find(c=>c.key==='medium');
 const values=plan.values||Object.fromEntries(plan.conditions.map(c=>[c.key,c.value]));
 const color=colorPolicy(values);
 const geometry=cameraContract(values,{noPerson:plan.noPerson});
 const photo=photoReconstruction(values.medium,{noPerson:plan.noPerson,values});
 return [
  '【第1段階の画風を修正】',
  ...selectionIntegrationInstructions,
  ...(compact?(artworkBasisContract(medium.value,{noPerson:plan.noPerson,values})?.sections||[]).map(s=>s.label+'：'+s.text):render(medium)),
  ...(geometry?['【修正時も固定するカメラ】',...geometry.instructions,'既存画像のカメラがこの指定と違う場合は、誤った角度を固定して残さず指定へ直す。']:[]),
  ...(photo?['【写真化の基準】',...photo.sections.map(s=>s.label+'：'+s.text)]:[]),
  '添付した制作途中の主画像を、選択画風「'+medium.value+'」の描画方法へ全面的に描き直してください。'+(geometry?'主画像の人物・物と指定どおり成立している配置を保ち、誤ったカメラの角度は指定へ修正する。':'主画像の人物・物・構図を保ち、')+'描画そのものを変換する画像編集を実行してください。',
  '入力する画像は直前の主画像1枚だけ。元の人物写真や項目の見本は再入力しない。',
  plan.noPerson?'主題の外形、配置、固有の模様、背景、光の起点、画角と余白を保つ。人物や人型を追加しない。':photo?'同じキャラクターの識別特徴、年齢感、性別表現、髪型と識別色、選択衣装・表情・顔向き・身体配置と支持、背景、指定カメラを保つ。イラストの各部の細寸法・誇張された目の比率・描線と色面は固定せず、自然な人物立体と実物の材質へ作り直す。':'同じ人物の識別特徴の組合せ、年齢感、性別表現、髪の形、選択衣装・表情・顔角度・動作と支持、物体の配置、背景、指定カメラと余白を保つ。参照の各部の寸法や頭身を固定せず、選択作画の形の整理・誇張・省略・頭身へ翻訳する。ちびキャラは大きな頭と短い身体へ作り直す。別人へ変更しない。',
  ...(geometry?['上の保持条件は指定どおり成立している部分へ適用する。カメラの誤りがある部分の画角・短縮・遮蔽は固定カメラの条件で描き直す。']:[]),
  photo?'変えるのは人体や景物の立体、実物の材質、レンズ遠近、光源に対応する反射・散乱・露光階調。絵の上へ毛穴・粒子・ぼけを足すだけで済ませず、主題と背景を同じ撮影像へ再構成する。':'変えるのは描線、面の塗り方、明暗の境界、素材の表し方。元の表面へ少数の線や光を追加する加工で済ませず、主題の内部の面まで次の工程で置き換える。',
  ...(medium.value==='クリスタル透光アニメ'?[
   '【必須の作画変換】日本の手描き2Dアニメの一枚絵へ全面変換する。肌・布・髪・背景の物体の輪郭に細い色線を引き、内部を少数の澄んだ色面で塗る。顔・首・腕・膝は明るい面と暗い面を硬いセル影の境界で分け、光と反対側には濃い有彩色の影をまとまって置く。写真や3Dレンダリングの皮膚の艶・毛穴・滑らかな立体陰影は完全に描き直す。',
   ...opticalSignature(values,{noPerson:plan.noPerson})
  ]:[]),
  ...(compact?['画風の詳細条件は、この仕様の第1段階に記載した「'+medium.value+'」の描画工程を使う。']:[]),
  '使用色は'+color.allowed+'。同じ配色と色の配置を維持し、画風が必要とする明暗差と材質を成立させる。',
  '文字・数字・署名を入れない。場面や装飾を追加して描画の不一致を隠さず、同じ一場面として仕上げる。',
  '完成検査：'+medium.checks.join(' / '),
  ...(photo?photo.checks:[]),
  ...(geometry?geometry.checks:[]),
  '修正画像を拡大して検査する。見えていない特徴を達成したと主張せず、未達なら残る箇所を伝える。画像そのものを返す。'
 ].join('\n');
}
