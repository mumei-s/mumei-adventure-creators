import {colorPolicy} from './palette-recipes.js?v=21.0.0';
import {opticalSignature,opticalColors} from './optical-effects.js?v=21.0.0';
import {detailedSubject} from './subject-recipes.js?v=21.0.0';
import {detailedFormat} from './format-recipes.js?v=21.0.0';

const luminous=new Set(['発光幻想アニメ']);
const flat=new Set(['線画','リノカット','木版画','浮世絵木版画','シルクスクリーン','ベクターグラフィック','フラットイラスト','ピクセルアート','構成主義','ミニマリズム']);
function sourceFor(values,collection){
 const place=values.place||'',theme=values.theme||'';
 if(/水中|海底/.test(place))return '選択された水面から届く環境光と水中の散乱';
 if(/宇宙|星海/.test(place))return '選択された宇宙空間の恒星や既存の照明';
 if(/抽象|色面|和紙|金箔|無地/.test(place))return '指定された背景面と主題の関係から決めた画面内の明暗';
 if(/スタジオ/.test(place))return '選択したスタジオの主光と補助光';
 const time=/朝|夜明け|曙/.test(place)?'朝':/夕|黄昏|日没/.test(place)?'夕方':/真昼|昼|日中/.test(place)?'昼':/夜|月下|真夜中|深夜|星空/.test(place)?'夜':/夜|月下|真夜中|深夜|星空/.test(theme)?'夜':'';
 const inside=/キッチン|読書室|工房|アトリエ|広間|書斎|店|室|改札|劇場|舞台/.test(place);
 if(time==='夜')return inside?'選択した夜の室内に存在する窓や照明':'選択した夜の場面に存在する月や街灯などの光源';
 if(time)return inside?'明示された'+time+'の窓光と室内の反射':'明示された'+time+'の太陽と空の自然光';
 if(inside)return '窓・天窓・選択された室内照明';
 return collection==='everyday'?'選択した天候と時刻に合う太陽と空の自然光':'選択した舞台と時刻に成立する主光';
}
export function lightingContract(values,{collection='halloween',noPerson=false}={}){
 const medium=values.medium||'',color=colorPolicy(values),surface=noPerson?'主題の景物と空間':'見えている顔・身体・衣装と景物';
 const source=sourceFor(values,collection);
 const signature=opticalSignature(values,{noPerson});
 if(signature.length)return source+'を光の起点にし、最明部を'+color.bright+'に置く。主題の深い影面を保ちながら、画風固有の透過と反射を描く。小さく見ても強い局所的な明度差と光学層の前後が分かること。'+signature.join(' ');
 if(luminous.has(medium))return source+'の位置を先に決める。'+surface+'を一続きの深い'+(color.restricted?'許可色':'有彩色')+'の影面と明るい面に分け、'+color.bright+'を細い逆光の縁と小さな点光へ絞る。明部の隣に暗部を残し、小さく見ても強い局所的な明度差が読めるようにする。光源・透過面・照り返し先を同じ方向で結び、全体を淡い霞や均等な光の粒で覆わない。色域は'+color.allowed+'。';
 if(/透明水彩|油彩・薄塗り/.test(medium))return source+'を、薄い色層の重なりと塗らない明部で表す。明部は'+(color.restricted?color.bright:'下地や紙の明るさ')+'、影は'+color.dark+'の透ける重ね塗りとして描き、画材の濃淡と縁の差を残す。不透明な塗りつぶしで深さを失わず、主題が読める部分だけ境界を締める。光をレンズフレアや白い霧として後付けせず、選んだ画材の色層で成立させる。';
 if(/水墨|南画|禅画|書と墨|鉛筆|木炭|ボールペン|ペン画|スクラッチ/.test(medium))return source+'による明暗を、選択画材の線密度・濃淡・かすれ・白抜きへ翻訳する。写真の鏡面反射やCGの発光を別の層として貼らない。最も濃い面と残す余白を先に配分し、描線と紙面の両方で主題を読み取れるようにする。';
 if(flat.has(medium))return source+'から得る明暗を、選択技法で扱える少数の色面・線幅・白抜き・重なりへ整理する。陰影の説明のために写真の立体、滑らかな鏡面CG、立体的な発光を付け足さない。';
 if(/写真|トイフォト|ミニチュア|ジオラマ|ストップモーション/.test(medium))return source+'と被写体の位置を対応させ、主光、弱い環境反射、接地影を一つの撮影空間で揃える。光源に近い面と遠い面、粗い素材と滑らかな素材で反射を分け、選択画風の露出・粒子・レンズ描写を保つ。場面を別のスタジオや別の時間帯へ変えない。';
 if(/アニメ|セル画|OVA|漫画|アメコミ|バンド・デシネ|ウェブトゥーン|ちびキャラ/.test(medium))return source+'から、選択した描線と色面に合う影の境界を設計する。大きな明部と影を先に分け、その上に必要な反射だけを置く。'+(noPerson?'景物だけを写真の陰影や滑らかな3Dの質感へ戻さず、':'顔だけ写真の陰影や滑らかな3Dの質感へ戻さず、')+'同じ線と塗りで空間まで統一する。';
 return source+'の方向と影・反射先を揃える。主題の明部と暗部の面積を先に決め、選択画風の描画工程で光を表す。別の照明テンプレートや別の材質を重ねず、選択した画材・造形方法の具体仕様を優先する。';
}
export function resolveArtDirection(values,variant={},collection='halloween'){
 const noPerson=/風景を主役|モチーフだけ|紋章・アイコン/.test(values.costume||'');
 const next={...variant,light:lightingContract(values,{collection,noPerson})};
 const format=detailedFormat(values.design,{values,noPerson});
 next.layout='選択形式「'+values.design+'」の画像領域と余白を使う。'+(format.sections[1]?.text||'主題と許可された文字を、指定された用途の画面内へ配置する。')+(noPerson?'人物を補わず、選択主題の主要な輪郭を安全領域へ収める。':'その画像領域内で今回の顔角度・ポーズ・撮影距離を保ち、重要な身体の輪郭を見切れさせない。');
 next.background='選択した舞台「'+values.place+'」の固有の構造・素材・背景面だけを使う。別の場所の雲・机・建物・天候を定型として追加しない。';
 next.motif='道具は選択した物語・衣装・舞台の個別仕様に必要なものだけを置く。指定ポーズで手がふさがる場合は支持面や周囲へ移し、新しい持ち物を握らせない。画風が指定する透光層・投影面・干渉色は光学表現として実行し、道具の制限で削除しない。';
 next.motion=noPerson?'選択主題の支持・重力・面の重なりを保つ。図案は配置と余白、風景や物体は選択場面にある自然な動きで変化を示し、未選択の風・煙・浮遊を追加しない。':/走|跳|ジャンプ|踊|回転|蹴|駆け/.test(values.pose)?'今回の選択動作に沿って重心・支持点・慣性を描く。動く衣装はその素材の可動範囲で遅れ、顔・手足の形を失わない。風や煙は選択場面に根拠がある場合だけ描く。':'今回の指定姿勢と支持点を保ち、手足の位置を別の動作へ変えない。静かな姿勢に走行の慣性・大きな風・煙・浮遊を自動追加しない。';
 next.depth='今回のカメラと撮影距離に合う大小・重なり・遮蔽で前後を示す。奥行きの描き方は選択画風の個別工程を使い、平面の技法は色面と輪郭、立体素材は厚みと支持として読む。別の画角の強い広角や接写を後付けしない。';

 if(!noPerson&&values.costume==='人魚'){next.pose=detailedSubject('pose',values.pose,{values,variant,noPerson}).sections.map(s=>s.text).join(' ');next.distance=(next.distance||'').replace(/足先|足元|両足|つま先/g,'尾びれ');}
 if(flat.has(values.medium))next.depth='前後関係と距離を、選択した平面技法の色面・輪郭・大小・重なり・余白へ翻訳する。滑らかな3Dの材質へ置換しない。';
 return next;
}
export function interactionContract(values,{noPerson=false}={}){
 const color=colorPolicy(values),optics=opticalColors(values);
 return [
  '主役の識別と描画方法を分ける。'+(noPerson?'参照がある場合は景物の形・構造・模様を保ち、人物を補わない。':'主参照の顔の形・配置・髪型・年齢感・性別の表現を保ち、その同じ特徴を選択画風の線と素材で描き直す。表情・顔向きは今回の選択を優先する。'),
  '画風は描線・陰影の形と強さ・画材・光学を決める。配色は色相と面積を決める。配色の名称や見本から、画風を低コントラスト・マット・発光・版画など別の方法へ変更しない。',
  color.restricted?'この組み合わせの許可色は'+color.allowed+'。画風の白い点光や虹色という表現は、この許可色の最明部と濃淡に翻訳する。元の色を例外で残さない。':'光と影の基調を指定配色の中で組み立てる。'+optics.instruction+(noPerson?'景物を見分ける形と明度差を保つ。':'人物の識別に必要な固有色がある場合は保ち、反射だけで別の髪色・瞳色へ変えない。'),
  noPerson?'形式が画像と文字の領域を決め、その画像領域へ主景と視点を配置する。主要な景物と綴じ余白が重なる場合は主画像を片側の安全な領域へ収める。':'形式が画像と文字の領域を決め、その画像領域の中で今回のポーズと画角を実行する。身体を誌面の綴じ位置へ割り当てず、関節や主要モチーフと綴じ余白が重なる場合は主画像を片側の安全な領域へ収める。',
  noPerson?'物語の出来事は、選択した景物と道具、直前直後の痕跡で示し、人や人型へ擬人化しない。物語名の場所を別背景として増やさず、唯一の選択舞台を保持する。':'物語が示す行為と指定ポーズが異なる場合は、ポーズを保持し、相手・道具・行為の直前直後の痕跡で物語を示す。物語名の場所を背景に増やさず、唯一の選択舞台に必要な対象を置く。',
  '一枚の画像で同時に成立しない明示指定は、無言で片方を捨てたり満たしたと主張したりしない。既定の分担で決められない衝突だけを生成前に短く示し、確認を求める。細部の通常の組み立ては制作側で決めて進める。'
 ];
}
