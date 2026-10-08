import {applyAngle} from './angles.js?v=28.4.1';
import {colorPolicy} from './palette-recipes.js?v=28.4.1';
import {opticalSignature,opticalColors} from './optical-effects.js?v=28.4.1';
import {detailedSubject} from './subject-recipes.js?v=28.4.1';
import {detailedFormat} from './format-recipes.js?v=28.4.1';
import {isPhotographicMedium} from './photo-design.js?v=28.4.1';
import {luminousWorldContract} from './luminous-world.js?v=28.4.1';

const flat=new Set(['線画','リノカット','木版画','浮世絵木版画','シルクスクリーン','ベクターグラフィック','フラットイラスト','ピクセルアート','構成主義','ミニマリズム']);
// Drawing atmosphere owns light and depth only. It never supplies a sample's
// person, outfit, palette, pose or props to a separately selected scene.
const worldStyleDirections=new Map([
 ['宝石光彩アニメ',{
  light:'精密な2Dアニメの描線と影面を残し、明るい主光、広く深い影、澄んだ薄い色層、反射、小さく鋭い最明部を分ける。肌や布をガラスへ変えず、露出して見える顔・耳・首・腕・手・脚・足と、髪・衣装・景物へ同じ光彩を素材別に連続させる。足が見えれば足にも適用し、顔と手だけに限定しない。肌には薄い反射と微小光、髪には束に沿う反射、布には折れと織りに沿う光を描き分ける。瞳の暗い芯と透明な内部色は、今回の開いて見える目だけへ描く。覆われた部位を透視せず、画角外や遮蔽された部位を光彩のために追加しない。光を背景だけへ集めず、全面の白い霧と均一な粒子で陰影を埋めない。',
  lightScenery:'精密な2Dアニメの描線と影面を残し、明るい主光、広く深い影、澄んだ薄い色層、反射、小さく鋭い最明部を分ける。可視の景物・物体・支持面全体へ、粗い素材の弱い散乱、布の折れと織りに沿う光、金属の硬い反射、既存の透明素材の透過を描き分けて同じ光彩を連続させる。画角外や遮蔽された面を光彩のために追加せず、全面の白い霧と均一な粒子で陰影を埋めない。',
  depth:'固定した視点に見える輪郭の重なりと遮蔽へ、澄んだ色層、深い内部影、細い縁光と微小反射を配分する。焦点の描線と素材の境界を最も精密にし、周囲は光の密度とコントラストを落とす。'
 }],
 ['宝石光彩リアル',{
  light:'自然な写真の眼球・肌・髪・衣服の材質を保ち、明るい主光、広く深い影、薄い色の散乱と環境反射、小さく鋭い最明部を連続した露光階調で分ける。透明な色層は光の重なりであり、身体や衣装を透明な結晶へ変えない。見える瞳の暗い瞳孔と微細な虹彩を残し、露出して見える顔・耳・首・腕・手・脚・足と、髪・衣装・景物へ素材別の光彩を連続させる。足が見えれば足にも適用し、顔と手だけに限定しない。皮膚は自然な散乱と微小反射、髪は毛流と束の反射、布は繊維と折れ、金属は硬い反射として描き分ける。覆われた部位を透視せず、画角外や遮蔽された部位を光彩のために追加しない。写真をアニメの瞳やセル影、滑らかなCGの肌へ戻さない。',
  lightScenery:'自然な写真の景物・物体・支持面の材質を保ち、明るい主光、広く深い影、薄い色の散乱と環境反射、小さく鋭い最明部を連続した露光階調で分ける。透明な色層は光の重なりであり、不透明な素材を透明な結晶へ変えない。可視の景物全域に粗い素材の弱い散乱、布の繊維と折れの反射、金属の硬い反射、既存の透明素材の透過を描き分けて同じ光彩を連続させる。画角外や遮蔽された面を追加せず、写真をセル影や滑らかなCGの景物へ戻さない。',
  depth:'固定したカメラの一つのレンズ像、自然な材質の重なり、接触影と露光差で距離を作る。見えている部分全体の必要な細部が読める焦点深度を取り、光の層は距離と遮蔽へ対応させる。光のためにレンズぼけを増やしたり、別の画角へ変えたりしない。'
 }],
 ['花霞の透明アニメ',{
  light:'細い有色線と透ける薄い重ね色を、柔らかな主光と明るい余白へ結ぶ。淡い面を白く飛ばさず、重なる形の接点と目鼻口へ小さな締まった影を残す。透明は描いた色層の透明感とし、肌や衣装を透視しない。花・光粒・朝日などの具体物は世界観・シーンで選んだ場合だけ用いる。',
  depth:'可視範囲の重なり、薄い色層の濃度差、細線の硬軟で前後を示す。焦点の輪郭を繊細に締め、周辺は少ない線と抜けた余白へ解放する。白い霞を全画面へ重ねて識別形を消さない。'
 }],
 ['ミルキーパステルアニメ',{
  light:'選択色の明るい低彩度面と柔らかな拡散光を主にし、少量の中間影と接触影で丸み・布の重なり・支持を読む。白や桃色などの特定色へ固定せず、限定色では許可色の明度差を使う。強い宝石鏡面や全面発光へ変えず、柔らかな光の中にも瞳・指・衣装の境界を残す。',
  depth:'大きく柔らかな形の重なりと、小さな接触影・色面の明度差で前後を作る。主題をぼかさず、奥へ向かって細線と模様の密度を減らす。画風を理由に頭身や年齢感を幼く変更しない。'
 }],
 ['夢彩ファンタジーアニメ',{
  light:'選択した世界の主光と素材反射を細密な2Dアニメの描線・薄い重ね色へつなぎ、広い影面、複数尺度の光の面と小さなきらめきを一つの空間に配分する。高密度の光を焦点へ、静かな陰を周囲へ置く。星・水・花・魔法・透明な物体などの内容はシーンで選んだものだけとし、見本の道具や配色を移さない。',
  depth:'選択シーンの構造を一つの視点へ接続し、可視の前景・主題・奥の環境の重なり、反射の距離差、細部の密度差で幻想の広がりを作る。接写では写っている素材の重なりへ圧縮し、奥行きのために画角外の建物や生き物を追加しない。'
 }],
 ['宵彩ゴシックアニメ',{
  light:'広く深い選択色の暗部に、細い方向光と小さな反射面を隣接させる。暗部にもレース等の選択素材の厚みと描線を残し、主題の識別点と手の輪郭を局所光で読む。光源の色は選択配色で決め、黒・赤・紫へ固定しない。礼拝堂・薔薇・十字架・蝋燭などはシーンと衣装で選ばれた場合だけ描く。',
  depth:'固定した視点の重なりと連続する深暗部、狭い光の縁と小さな反射で前後を分ける。焦点の描線と素材の細部を締め、奥は輪郭の省略と明度差で後退させる。画風名から西洋建築や別の衣装を追加しない。'
 }]
]);
function worldStyleLight(values,{color,source,noPerson}){
 const direction=worldStyleDirections.get(values.medium);if(!direction)return null;
 const subject=noPerson?'景物・物体・図案だけが対象。人物・顔・瞳・手を追加しない。':'人体の光は露出して実際に見える面だけに用い、閉眼・髪なし・被覆・今回の表情を保つ。';
 const light=noPerson?direction.lightScenery||sceneryStyleText(direction.light):direction.light;
 return source+'を光の起点にする。'+subject+' '+light+' 最暗部は'+color.dark+'、最明部は'+color.bright+'。'+(color.restricted?'光・反射・透明な色層も'+color.allowed+'だけで描く。':'基調と反射色は選択配色に従い、'+(noPerson?'景物の':'髪や瞳の')+'識別色を保持する。');
}
function sceneryStyleText(text){
 return text.replace(/肌や布/g,'不透明な景物や布').replace(/身体や衣装/g,'不透明な景物')
  .replace(/肌や衣装/g,'不透明な景物').replace(/目鼻口/g,'主景の識別点')
  .replace(/瞳・指・衣装/g,'主景・接点・表面').replace(/手の輪郭/g,'主景の輪郭')
  .replace(/顔と手を含む/g,'接点と表面を含む').replace(/頭身や年齢感を幼く変更しない/g,'景物へ人体の頭身や年齢感を与えない');
}
function sourceFor(values,collection){
 const place=values.place||'',theme=values.theme||'';
 if(/水中|海底/.test(place))return '選択された水面から届く環境光と水中の散乱';
 if(/抽象|色面|和紙|金箔|無地/.test(place))return '指定された背景面と主題の関係から決めた画面内の明暗';
 if(/宇宙|星海/.test(place+' '+theme))return '選択舞台へ連続する宇宙の恒星光と、その場所の既存の照明';
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
 const luminous=luminousWorldContract(values,{noPerson});
 if(luminous)return source+'を光の起点にする。'+luminous.lighting;
 const worldLight=worldStyleLight(values,{color,source,noPerson});
 if(worldLight)return worldLight;
 const signature=opticalSignature(values,{noPerson});
 if(signature.length)return source+'を光の起点にし、最明部を'+color.bright+'に置く。主題の深い影面を保ちながら、画風固有の透過と反射を描く。小さく見ても強い局所的な明度差と光学層の前後が分かること。'+signature.join(' ');
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
 if(variant.directionVariation?.lightDirection)next.light+=' 今回の主光方向：'+variant.directionVariation.lightDirection+'。選択場面に存在する同じ光源を使い、この方向を景物・主題・支持面の明部と影へ一貫して反映する。カメラ・時刻・天候・画材・許可色を変えず、別の照明や発光物を追加しない。平面の技法ではこの明暗方向を色面と余白へ翻訳する。';
 const format=detailedFormat(values.design,{values,noPerson});
 next.layout='選択形式「'+values.design+'」の画像領域と余白を使う。'+(format.sections[1]?.text||'主題と許可された文字を、指定された用途の画面内へ配置する。')+(noPerson?'人物を補わず、選択主題の主要な輪郭を安全領域へ収める。':'その画像領域内で今回の顔角度・ポーズ・撮影距離を保ち、重要な身体の輪郭を見切れさせない。');
 next.background='選択した舞台「'+values.place+'」の構造を、物語「'+values.theme+'」の世界へ接続する。環境・素材・背景面・奥行きを一つの空間に揃え、別の場所の雲・机・建物を定型で足さない。';
 next.motif='道具は選択した物語・衣装・舞台の個別仕様に必要なものだけを置く。指定ポーズで手がふさがる場合は支持面や周囲へ移し、新しい持ち物を握らせない。画風が指定する透光層・投影面・干渉色は光学表現として実行し、道具の制限で削除しない。';
 next.motion=noPerson?'選択主題の支持・重力・面の重なりを保つ。図案は配置と余白、風景や物体は選択場面にある自然な動きで変化を示し、未選択の風・煙・浮遊を追加しない。':/走|跳|ジャンプ|踊|回転|蹴|駆け/.test(values.pose)?'今回の選択動作に沿って重心・支持点・慣性を描く。動く衣装はその素材の可動範囲で遅れ、顔・手足の形を失わない。風や煙は選択場面に根拠がある場合だけ描く。':'今回の指定姿勢と支持点を保ち、手足の位置を別の動作へ変えない。静かな姿勢に走行の慣性・大きな風・煙・浮遊を自動追加しない。';
 next.depth='今回のカメラと撮影距離に合う大小・重なり・遮蔽で前後を示す。奥行きの描き方は選択画風の個別工程を使い、平面の技法は色面と輪郭、立体素材は厚みと支持として読む。別の画角の強い広角や接写を後付けしない。';
 const luminous=luminousWorldContract(values,{noPerson,variant});
 if(luminous)next.depth=luminous.depth;
 const worldStyle=worldStyleDirections.get(values.medium);
 if(worldStyle)next.depth='指定カメラ・投影・撮影距離・'+(noPerson?'景物の自然な支持':'ポーズ・支持点')+'を先に固定する。'+(noPerson?sceneryStyleText(worldStyle.depth):worldStyle.depth)+' その可視範囲だけで成立させ、別の背景・物体・人物を追加しない。';

 if(!noPerson&&values.costume==='人魚'){next.pose=detailedSubject('pose',values.pose,{values,variant,noPerson}).sections.map(s=>s.text).join(' ');next.distance=(next.distance||'').replace(/足先|足元|両足|つま先/g,'尾びれ');}
 if(flat.has(values.medium))next.depth='前後関係と距離を、選択した平面技法の色面・輪郭・大小・重なり・余白へ翻訳する。滑らかな3Dの材質へ置換しない。';
 return applyAngle(values,next);
}
export function interactionContract(values,{noPerson=false}={}){
 const color=colorPolicy(values),optics=opticalColors(values);
 return [
  '主役の識別と描画方法を分ける。'+(noPerson?'参照がある場合は景物の形・構造・模様を保ち、人物を補わない。':isPhotographicMedium(values.medium)?'主参照の髪型・識別色・顔立ちの特徴の組合せ・年齢感・性別表現を保ち、同じキャラクターと識別できる自然な人物立体と実物の材質へ再構成する。イラストの描線・セル色面・細寸法の比率は固定しない。表情・顔向きは今回の選択を優先する。':'主参照の顔の形・配置・髪型・年齢感・性別の表現を保ち、その同じ特徴を選択画風の線と素材で描き直す。表情・顔向きは今回の選択を優先する。'),
  '画風は描線・陰影の形と強さ・画材・光学を決める。配色は色相と面積を決める。配色の名称や見本から、画風を低コントラスト・マット・発光・版画など別の方法へ変更しない。',
  color.restricted?'この組み合わせの許可色は'+color.allowed+'。画風の白い点光や虹色という表現は、この許可色の最明部と濃淡に翻訳する。元の色を例外で残さない。':'光と影の基調を指定配色の中で組み立てる。'+optics.instruction+(noPerson?'景物を見分ける形と明度差を保つ。':'人物の識別に必要な固有色がある場合は保ち、反射だけで別の髪色・瞳色へ変えない。'),
  noPerson?'形式が画像と文字の領域を決め、その画像領域へ主景と視点を配置する。主要な景物と綴じ余白が重なる場合は主画像を片側の安全な領域へ収める。':'形式が画像と文字の領域を決め、その画像領域の中で今回のポーズと画角を実行する。身体を誌面の綴じ位置へ割り当てず、関節や主要モチーフと綴じ余白が重なる場合は主画像を片側の安全な領域へ収める。',
  noPerson?'物語の世界を、選択舞台とつながる景物・素材・光へ反映する。出来事は自然現象や直前直後の痕跡で示し、人や人型へ擬人化しない。':'物語の世界と選択舞台を同じ空間・光・素材で結ぶ。物語の行為と指定ポーズが異なる場合はポーズを保持し、相手・周囲の景物・直前直後の痕跡で出来事を示す。',
  '世界と舞台は、一つの場所の環境・素材・奥行きとして組み合わせる。細部は制作側で決めて進める。同時に成立しない明示指定が残る場合だけ、その衝突を短く示す。片方の選択を無言で捨てたり、満たしたと主張したりしない。'
 ];
}
