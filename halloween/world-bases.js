import {colorPolicy} from './color-policy.js?v=28.4.1';
import {isNonHumanSource} from './source-kind.js?v=28.4.1';

// Original semantic descriptions extracted from user-provided examples.
// UI thumbnails remain illustrative: none of their people, clothes, prompts,
// layouts, colours or distinctive objects is a production reference.
const section=(label,text)=>({label,text});
const mediaDefinitions=[
 {
  value:'宝石光彩アニメ',file:'assets/world-jewel-anime-v28.png',group:'宝石光彩',
  text:'精密な2Dアニメの有色線と薄い色層に、広い深暗部、澄んだ局所反射、鋭い点光を重ねる。露出して見える肌全域と、存在する髪・衣装・景物へ材質別に光をつなぎ、選択衣装の被覆を保つ。',
  drawing:'全域を先細りの細い有色線、設計した平面陰影、薄い絵画的な色層で最初から描く。焦点は精密な線と色層、中距離は少数の面、遠い部分は構造を保った低密度にする。写真や滑らかな3Dの下地へ光を足す処理にしない。',
  personDrawing:'主参照の識別できる特徴の組合せを、精密な少女漫画・日本2Dアニメとして描き直す。顔の輪郭と上眼瞼は強弱のある描線、開いて見える瞳は暗い芯と澄んだ重ね色、鼻は短い線と小さな影、口は少数の線と薄い色面で構成する。髪がある場合は大中小の描いた束と広い内部影に整理する。写真の寸法や皮膚の連続階調を固定せず、特徴と年齢感で同じ主役を保つ。',
  lighting:'大きな深暗部、中程度の透光色、小面積の強い反射、極小の鋭い最明部を明確に分ける。光源と面の向き、遮蔽、距離が周囲の素材と背景まで一貫する。暗部に弱い反射と色の深さを残し、白い霧や全面bloomで線と影を埋めない。',
  materials:'固有色→内部影→薄い色層→周囲の反射→局所的な光の斑→鋭い小ハイライトを描き分ける。薄い色層は描画の透明感であり、不透明な素材をガラスへ変える指定ではない。布は折れと織り、木や石は粗さと厚み、金属は硬い反射、既存のガラスは透過と屈折を保つ。',
  checks:['精密な2Dの有色線と描いた平面陰影','広い深暗部と極小の鋭い最明部','素材の固有色・内部影・薄い色層・局所反射の描き分け'],
  avoid:['写真の顔や滑らかな3Dの土台へ輝きだけを足す処理','肌をガラスへ変える処理、全面の均一なラメ、背景だけの発光']
 },
 {
  value:'宝石光彩リアル',file:'assets/world-jewel-real-v28.png',group:'宝石光彩',
  text:'写真として自然な形と素材を保ち、深い影、澄んだ反射、局所的な光の斑を一つの光学設計で組む。露出して見える肌全域と、存在する髪・衣装・景物へ材質別に光をつなぎ、自然な皮膚の階調と被覆を保つ。',
  drawing:'選択した主題を実写の高精細な写真表現として構築する。支持、接続、質量、表面の粗さと厚みが自然に読める形にし、光学的な反射と被写界深度を固定した撮影距離へ合わせる。写真の粒やぼけだけを足して実写と見なさず、造形・素材・照明が一体で成立すること。',
  personDrawing:'主参照の識別特徴、年齢感、性別表現を自然な実写の顔立ちと身体構造へ翻訳する。目鼻口、手の関節、皮膚、髪がある場合の毛束を写真の解剖と光学で構成し、アニメの描線や平面セル影を残さない。ちびの比率が明示されている場合だけ、その識別比率を選択された造形として保ち、写実化を理由に別の年齢や別人へ変更しない。',
  lighting:'方向のある主光、弱い環境光、面に沿う局所的な反射を分ける。深い影を広く残し、反射の最明部は小さく鋭くする。光の色・投影・遮蔽は周囲の素材まで一貫させ、環境の光を人物だけに貼り付けない。露出を上げて影を失うことや、全域へ同じ霧を敷くことを避ける。',
  materials:'元の材質を、粗さ、厚み、拡散反射、鏡面反射の差で描き分ける。澄んだ宝石のような光は反射と照明の性質であり、すべてを結晶化する意味ではない。既存の透明素材だけに透過と屈折を描き、布・木・石にはそれぞれの反射を返す。',
  checks:['自然な写真の造形・支持・素材','方向と遮蔽が揃う主光・環境光・局所反射','深い影の広い面と小さく鋭い反射'],
  avoid:['アニメのセル影や描線を残した写真加工','人形CGの皮膚、人体のガラス化、全面ラメや不自然な均一発光']
 },
 {
  value:'花霞の透明アニメ',file:'world-034.jpg',group:'花霞・パステル・夢彩・宵彩',
  text:'淡い輪郭、透明な重ね色、柔らかな逆光、繊細な局所反射で明るく澄んだ空気を描く。白く薄めるだけにせず、接触影と主要な線を残す。花や衣装を作画名だけから追加しない。',
  drawing:'細く淡い有色線と、下の色が読める透明な薄塗りを重ねる。焦点では輪郭と細かな反射を締め、周辺では境界を柔らかくする。色を全域で同じ薄さにせず、透明層が重なる領域の濃度差と少数の暗い線を使う。',
  personDrawing:'同じ識別特徴を精密な2Dアニメの輪郭、描いた眼瞼、簡潔な鼻口、薄い頬の色面へ翻訳する。写真の顔を残さず、年齢感と特徴を保つ。髪がある場合の束は薄い重ね色と少数の暗い内部線で示し、参照と異なる髪型や花飾りへ変更しない。',
  lighting:'広い明るい面、淡い中間影、小面積の明瞭な接触影、繊細な縁光を分ける。選択色の最明部にも細かな階調を残し、薄い逆光と周囲の反射を素材へ沿わせる。深暗部を一律に広げず、明るい空気の中で形が読める陰影を作る。',
  materials:'薄布、硬い面、既存の透明素材をそれぞれの縁と反射で描き分ける。透明感は塗りと空気の性質であり、選択していない透明衣装やガラス化を加えない。花、庭、ガラスの小物を画風名だけから増やさない。',
  checks:['淡い有色線と濃度差のある透明な重ね色','明るい空気の中にも残る接触影と主要輪郭','柔らかな逆光と素材に沿った繊細な反射'],
  avoid:['全面を白く飛ばす処理、形が失われる均一なぼかし','作例の顔・花飾り・小動物・衣装を引き継ぐ処理']
 },
 {
  value:'ミルキーパステルアニメ',file:'world-009.jpg',group:'花霞・パステル・夢彩・宵彩',
  text:'選択した配色を柔らかな色面へ整理し、丸みのある形、しっとりした布、ふわりとした素材、柔らかな散乱光を描く。淡色の固定配色や特定の服・ぬいぐるみは追加しない。',
  drawing:'2Dの細い輪郭、柔らかな曲線、滑らかな淡い色面を組む。主要な形は明瞭にし、境界の一部だけを柔らかくする。選択された形の角や硬い部材まで丸く溶かさず、柔らかな材質との対比を残す。',
  personDrawing:'主参照を同じ識別特徴と年齢感の2Dアニメ造形へ翻訳する。眼瞼と簡潔な鼻口は細線と薄い色面で描き、頬や見える手の立体は柔らかな明暗と接触影で支える。大きな目や短い手足を見本から取り込み、幼い年齢へ変えることを避ける。',
  lighting:'広い柔らかな散乱光、中間色の穏やかな陰、重なり部分の短い接触影、少数の小さな輝きを分ける。深い影と強い光を全域へ敷かず、優しい明るさを保つ。限定した濃色配色でも、塗りの柔らかさと面の重なりでこの質感を表す。',
  materials:'選択されている布の折れ、毛のある素材の柔らかな縁、光沢面の小反射を描き分ける。柔らかさを出すためにフリル、毛皮、ぬいぐるみ、リボンへ物を交換しない。元の衣装や景物の構造が柔らかな塗りの中で読めること。',
  checks:['柔らかな2Dの曲線と明瞭な主要外形','散乱光・中間影・短い接触影の描き分け','柔らかな材質と硬い面の質感差'],
  avoid:['輪郭まで溶ける全面ぼかし、淡色に固定する配色','勝手な幼児化やちび化、ぬいぐるみやフリルの追加']
 },
 {
  value:'夢彩ファンタジーアニメ',file:'world-035.jpg',group:'花霞・パステル・夢彩・宵彩',
  text:'精密なアニメ線と柔らかな色面、素材ごとの小反射、奥へ開く空気で夢のある密度を作る。魔法使い・猫耳・ちび頭身・書庫を画風だけから追加しない。',
  drawing:'精密な細線、柔らかな色面、薄い絵画的な重ね色を全域で揃える。大きな構造を先に読み取れる形へ整理し、焦点に細部と小さな反射を集める。中景と遠景は細部の数を減らしながら、同じ場面の奥行きと素材を保つ。',
  personDrawing:'主参照の識別特徴と年齢感を精密な2Dアニメとして描く。描いた眼瞼、簡潔な鼻口、色面の頬、髪がある場合の束の大小を揃え、顔だけ写真へ戻さない。表情と頭身を見本から変更せず、ちび参照や明示したちび設定だけにその比率を適用する。',
  lighting:'柔らかな主光、深さを支える内部影、素材ごとに異なる細い反射、奥で弱まる光を同じ方向でつなぐ。広い明るい面と局所陰影を保ち、全域を深暗部や同じ光粒で埋めない。幻想は選択した世界の光と空気で表し、未選択の魔法陣や浮遊を足さない。',
  materials:'紙の層、木の厚み、布の折れ、金属の細い反射、既存の透明素材の透過を細線と薄い色面で描き分ける。高密度は同じ物の仕上げで作り、見本の小物や星飾りを大量追加することに置き換えない。',
  checks:['顔と景物を統一する精密な2Dの細線と柔らかな色面','焦点・中景・遠景で変わる細部密度','素材差を保つ局所反射と内部影'],
  avoid:['猫耳・魔法帽・書物・特定の髪型を見本から追加する処理','画風を理由にしたポーズ変更、浮遊、ちび化']
 },
 {
  value:'宵彩ゴシックアニメ',file:'japan-previews-v21/medium-06-09.jpg',group:'花霞・パステル・夢彩・宵彩',
  text:'精密な2Dの輪郭、広い深影、選択色の細い窓光と局所反射で静かな豪華さを描く。暗い美的ムードとホラーは別に扱い、薔薇・十字架・黒ドレスを追加しない。',
  drawing:'精密な2Dの有色輪郭、濃度差のある大きな影面、少数の細い明線で全域を描く。暗部にも重なりと素材の細部を残し、均一な黒い切り抜きにしない。焦点の明瞭な形と周辺の低密度で静かな主従を作る。',
  personDrawing:'主参照の特徴を精密な2Dアニメの眼瞼、簡潔な鼻口、顔の色面へ翻訳する。年齢感、性別表現、表情、髪型と識別色は保ち、退廃的な微笑みや銀髪を画風だけから追加しない。選択衣装は本来の形と被覆のまま濃淡と反射を描く。',
  lighting:'大きな深影の面を支えに、選択配色の細い方向光、狭い縁光、少数の局所反射を置く。遠い光は弱め、遮蔽の内側は深くする。色光は選択されている光源と可視の開口部へ結びつけ、未選択の窓や礼拝堂を作風から補わない。',
  materials:'選択されている表面を、暗部の濃度差、粗さ、厚み、小反射で分ける。布の構造と既存の装飾を精密に描くが、レースや宝飾へ交換しない。暗い美的空気を血、怪物、薔薇、宗教記号へ短絡させず、ホラーは世界とテーマの明示に従う。',
  checks:['精密な2Dの輪郭と濃度差のある深影','選択色だけの細い方向光と局所反射','暗部にも読める素材と重なり'],
  avoid:['暗部を一様な黒で潰す処理、全面の逆光','作例のレース服・薔薇・十字架・表情を引き継ぐ処理']
 }
];

export const referenceWorldMedia=mediaDefinitions.map(({value,file,text,checks,group})=>({value,file,text,checks:[...checks],group}));

const sceneDefinitions=[
 {
  value:'星糸のアトリエ',file:'japan-previews-v21/place-01-10.jpg',fantasy:true,
  description:'細い光の軌跡と透明な反射が奥行きへ連なり、ものづくりの気配がある幻想の作業空間。',
  sections:[
   section('作業空間の構造','主題の周囲に作業面と収納の支持構造を置き、近い素材の縁、中距離の作業領域、奥の細い構造を同じ空間へつなぐ。道具は今回のテーマに具体的な根拠のある種類と数だけにし、服を制作する場面やマネキンを既定にしない。'),
   section('星糸の光と密度','細い光の軌跡を可視の素材や作業面の周辺へ重ね、近い線は明瞭、遠い線は弱く疎らにする。大きな方向の流れと極小の光点を分け、同じ太さの線や星粒の壁で全域を埋めない。'),
   section('光の接続と素材','選択配色の深い背景と小さな鋭い反射を対比させる。既存の透光素材と硬い縁に異なる反射を返し、光の軌跡の遮蔽・奥行き・投影が周囲の構造と一致するようにする。光だけで不透明な対象を透明化しない。')
  ],checks:['作業面と収納に連続する支持構造','大小・近遠・密度を分けた光の軌跡','深い背景と局所反射の明暗差']
 },
 {
  value:'星空メルヘン',file:'japan-previews-v21/place-02-05.jpg',fantasy:true,
  description:'深い星空と柔らかな小さな光、透明素材の反射がつながる静かなメルヘン空間。',
  sections:[
   section('星空と生活空間','可視の空や既存の開口部の先に星の大小と間隔を設計し、選択された支持面や生活の空間へつなぐ。接写では後方の疎密と反射へ圧縮し、星空を見せるために画角を広げない。特定の星座形、翼馬や動物の形の星図を複製しない。'),
   section('柔らかな光の連なり','大きな暗い空間の中で、少数の近い光と疎らな遠い光を区別する。小さな光のまとまりは主題の周辺から奥へ連なり、既存の透光素材の縁に穏やかな反射を返す。器や菓子を見本と同じに並べない。'),
   section('優しさと深い背景','背景の深い色と周囲の柔らかな中間光を対比させる。見える素材の丸みと薄い散乱光で優しい空気を作り、人物の年齢や頭身を幼くすることでメルヘンを表現しない。')
  ],checks:['深い星空と生活空間がつながる一つの奥行き','柔らかな小光と透明素材の縁の反射','星の形や動物を借りない独自の空間']
 },
 {
  value:'水鏡の幻想空間',file:'world-002.jpg',fantasy:true,
  description:'ゆらぐ水の光、反射、屈折が室内の深度へ広がる透明な幻想空間。',
  sections:[
   section('水光の空間構造','実際に選ばれた支持面と建築の接続を保ち、床や壁の可視の面へゆらぐ水光を投影する。反射面、透過する層、奥の構造を一つの遠近でつなぎ、上下を別の背景へ交換しない。元の部屋の配置や特定の椅子を写さない。'),
   section('透過と屈折の深度','透明な面や光の球状の層は、近い大きな境界、主題周辺の中程度の層、奥の小さな弱い反射として密度を分ける。境界の屈折ずれ、透過率、重なりの暗さを描き分ける。イルカや海の動物をこの空間名だけから足さない。'),
   section('水光と反射の整合','ゆらぐ明るい光の斑が、同じ環境の壁・支持面・存在する素材へ返るようにする。水の気配は光の投影と反射で表し、選択していない水中の身体動作や浮遊へ主題を変更しない。看板・施設名・水族館の設定を借りない。')
  ],checks:['支持面と建築につながる水光の投影','近遠の縮尺と屈折・透過・反射の区別','元の支持とポーズを保つ幻想の透明感']
 },
 {
  value:'花光のガラス庭園',file:'japan-landscape-v19.png',fantasy:true,
  description:'植物の層と既存の透明面を通る薄い光、明るい空気と局所陰影が重なる庭園。',
  sections:[
   section('庭園の重なり','近い植物の縁、焦点の周辺、奥の枝葉や構造を同じ庭園の深度へ整理する。ガラスの境界は独自の構造と配置で用い、元の肖像の花飾りや隣の小動物を庭の定番にしない。接写なら見える後方の色面と薄い境界だけで空間を伝える。'),
   section('薄い光と透光面','透明な面の厚み、光が通る領域、植物が重なる接触影を分ける。広く明るい空気と少数の明瞭な陰影を保ち、全景を白い霞で消さない。光は既存の素材を通して返り、主題をガラスの材質へ変えない。'),
   section('細部と空気の配分','焦点の近くは細い輪郭と小反射、周辺は柔らかな境界、奥は低い密度で距離を作る。花の種類や形の配置を元画像から複製せず、選んだテーマと季節に合う植物の形を独自に構成する。')
  ],checks:['植物と透明面が重なる独自の庭園構造','広い明るい面と局所陰影','可視の距離に沿う細部密度と透明面の反射']
 },
 {
  value:'ふわ彩の祝祭室',file:'world-009.jpg',fantasy:true,
  description:'柔らかな材質と光沢面、軽い紙の装飾が重なり、明るい祝祭の気配を持つ室内。',
  sections:[
   section('祝祭の室内配置','支持面と周囲の空間を明瞭にし、丸い形、薄い紙の縁、選択テーマに合う少数の祝祭装飾を大小で配置する。元画像の風船や贈り物の並びを再現せず、近景・焦点・背景の密度を変えた独自の構図にする。'),
   section('柔らかさと素材差','選択された柔らかな素材は穏やかな曲線と散乱光、光沢面は小さな鋭い反射、紙は薄い縁と短い接触影で描く。ぬいぐるみや特定の動物を自動追加せず、衣装をフリルへ交換しない。'),
   section('明るい祝祭の空気','広い柔らかな光を保ち、物が重なる領域だけに明瞭な短い影を置く。空中の軽い装飾が必要な場合は選択された演出の方向と強度へ合わせ、主題の姿勢や支持点を動かして賑やかさを作らない。')
  ],checks:['独自の祝祭室の配置と支持面','柔らかな素材・光沢面・薄い紙の質感差','明るい面にも残る重なりの影']
 },
 {
  value:'和雅・花景',file:'japan-culture-v18.png',fantasy:false,
  description:'和の建材、奥へ続く花景、自然光と素材の繊細な反射で静かな華やかさを作る。',
  sections:[
   section('和の空間と花の距離','選択した舞台に合う和の建材や自然の外形を独自に構成し、近い花の縁、中景の支持面、奥へ続く花景を同じ遠近へつなぐ。特定の桜道や元画像の配置を固定せず、明示した季節と環境を尊重する。'),
   section('自然光と繊細な素材','斜めからの自然光、広い落ち着いた陰、素材に沿う細い反射を分ける。木・石・布など存在する素材の厚みと粗さを描き、金属の輝きは実際に選ばれた素材にだけ置く。配色や作例から金の刺繍を新しく足さない。'),
   section('静かな華やかさ','花の近遠、明瞭な焦点と柔らかな遠景、日中の空気の差で華やかさを作る。衣装は今回の選択を保ち、着物、帯、傘、特定の花柄をこの舞台だけから追加しない。魔法、発光粒子、怪異は別の世界や演出で明示された場合だけ扱う。')
  ],checks:['和の建材と独自の花景の遠近','自然光と存在する素材の反射','選択衣装と通常の自然な支持の保持']
 },
 {
  value:'夢彩の魔法書庫',file:'japan-previews-v21/place-01-03.jpg',fantasy:true,
  description:'棚と紙の層、細密な素材、小さな幻想光が奥へつながる探求のための書庫空間。',
  sections:[
   section('書庫の支持と奥行き','近い棚や紙の縁、中景の主題領域、奥へ続く収納の構造を同じ空間へつなぐ。棚板と書物の厚み、接触と支持を読める形にし、元の本の意匠や天体儀、同じ棚配置を写さない。書庫の中にも主題の選択ポーズが成立する余地を残す。'),
   section('紙・木・硬い反射','紙の層は柔らかな色面、木は厚みと内部影、存在する硬い素材は小さな反射で分ける。細密さは素材と接点の仕上げで作り、見本の小物、星飾り、魔法帽を大量追加しない。'),
   section('探求の気配と光','奥からの柔らかな光と少数の幻想的な明点が、収納や支持面へ同じ方向で返るようにする。探求を空間と資料の重なりで示し、役柄を魔法使いへ変更しない。読書、指差し、書物を持つ動作はポーズとして選んだ場合だけ描く。')
  ],checks:['棚板と紙の厚み・接点が読める書庫','紙・木・硬い面の素材差','選択動作を保つ探求の空気と奥の光']
 },
 {
  value:'宵彩の色硝子堂',file:'japan-previews-v21/place-01-08.jpg',fantasy:true,
  description:'高い構造の深い影と色硝子を通る細い光が、静かで豪華な建築空間を形作る。',
  sections:[
   section('建築の高低と重なり','柱、壁面、既存の開口部、支持面を一つの独自の構造へつなぐ。高い部分と遠い部分を遮蔽と縮尺で分け、元の礼拝堂の窓配置や背景を複製しない。構造を見せるために選択カメラを煽りや全景へ変更しない。'),
   section('色硝子の透過と投影','色硝子の境界、通過する細い光、遮蔽物の影、支持面へ届く色の斑を分ける。選択配色の許可色だけを使い、限られた色数でも明度差と形で透過光を表す。暗部に弱い反射を残し、空間を一様な黒へ落とさない。'),
   section('静けさと焦点','広い深影を背景に、狭い縁光と小さな局所反射へ焦点を集める。美的なゴシック空間として成立させ、薔薇、十字架、宗教記号、血、怪物を定番として追加しない。ホラーは別の明示したテーマの出来事で設計する。')
  ],checks:['独自の建築構造と高低・遮蔽','選択色の色硝子光と支持面の投影','暗部の素材差と静かな局所焦点']
 },
 {
  value:'街角アニメ日和',file:'japan-everyday-scenes-v23-01.jpg',fantasy:false,
  description:'現代の街の遠近、日中の方向光、素材と接地の自然さで日常の臨場感を作る舞台。',
  sections:[
   section('街角の遠近と接地','近い舗装の縁、主題がいる中景、奥の建材や道の先を同じ消失方向へつなぐ。建物、入口、道路の尺度と段差を揃え、支持と接地が自然に読める空間を作る。特定の地名・店舗・看板・ブランドを写さない。'),
   section('日中の方向光','方向のある自然光、現実的な落ち影、周囲の建材や地面からの弱い反射を整える。距離に応じてコントラストと細部を減らし、焦点周辺の背景は選択画材に合う境界の整理で分ける。作風から粒子や魔法を追加しない。'),
   section('自然な日常の密度','選択された服や主題の素材を街の建材と同じ光へつなぐ。日常の気配は道路、建材、自然な距離と空気で表し、制服、鞄、学校、特定の髪色、学生の年齢感を見本から取り込まない。項目名のアニメは舞台の呼び名であり、実際の描画は選択画材を守る。')
  ],checks:['街の消失方向と支持・接地の整合','方向光・落ち影・環境反射の一致','固有の看板や服を借りない日常の舞台']
 }
];

export const referenceWorldScenes=sceneDefinitions.map(({value,file,fantasy,description,sections,checks})=>({value,file,fantasy,description,sections:sections.map(s=>({...s})),checks:[...checks]}));

export const referenceWorldMapping=[
 {filename:'1000015899.jpg',medium:'現代アニメの一枚絵',scene:'星糸のアトリエ',summary:'独立した参考ジャンル。精密な細線、深い背景、細い光の軌跡、素材の局所反射を抽出。宝石光彩の派生とせず、人物・衣装・道具の形は取り込まない。'},
 {filename:'1000015900.jpg',medium:'夢彩ファンタジーアニメ',scene:'星空メルヘン',summary:'柔らかな線と色面、星空の深度、小光と透明素材の反射を抽出。ちびの頭身や動物の特徴は別指定。'},
 {filename:'1000015901.jpg',medium:'透明水彩アニメ',scene:'水鏡の幻想空間',summary:'独立した参考ジャンル。水光の投影、透明層、近遠の反射と屈折を抽出。宝石光彩の派生とせず、イルカ、制服、椅子、施設名は取り込まない。'},
 {filename:'1000015902.jpg',medium:'花霞の透明アニメ',scene:'花光のガラス庭園',summary:'淡い輪郭、透明な重ね色、薄い逆光、細かな局所反射を抽出。顔や花飾り、小動物は取り込まない。'},
 {filename:'1000015903.jpg',medium:'ミルキーパステルアニメ',scene:'ふわ彩の祝祭室',summary:'柔らかな材質、明るい面、短い接触影と祝祭の密度を抽出。ぬいぐるみ、衣装、抱く動作は取り込まない。'},
 {filename:'1000015904.jpg',medium:'現代アニメの一枚絵',scene:'和雅・花景',summary:'素材の微細な反射、自然光、花景の近遠を抽出。顔は見切れているため顔の根拠にせず、着物や柄を取り込まない。'},
 {filename:'1000015905.jpg',medium:'夢彩ファンタジーアニメ',scene:'夢彩の魔法書庫',summary:'柔らかな2D色面、細密な素材、書庫の重なりと光を抽出。猫耳、服、指差し、ちび比率は取り込まない。'},
 {filename:'1000015906.jpg',medium:'宵彩ゴシックアニメ',scene:'宵彩の色硝子堂',summary:'深影、細い色光、暗部の質感、局所反射を抽出。顔の見切れを補う根拠にはせず、薔薇や宗教記号を取り込まない。'},
 {filename:'1000015907.jpg',medium:'現代アニメの一枚絵',scene:'街角アニメ日和',summary:'自然な街の遠近、方向光、布と建材の材質を抽出。顔の見切れ、制服、看板、店舗名は取り込まない。'}
].map(entry=>({...entry,mediumRole:'classification-only',forceMedium:false}));

function paletteContract(values){
 const policy=colorPolicy(values);
 return {policy,text:'今回の許可色は「'+policy.allowed+'」。最明部は「'+policy.bright+'」、最暗部は「'+policy.dark+'」。主色・副色・差し色の面積差と明度差で光、影、透明層、反射を構成し、見本の配色を固定しない。'+(policy.restricted?'光の斑、色光、透過、反射の芯も許可色の濃淡だけへ翻訳し、限定色の外の白や虹色を追加しない。':'反射や分光を理由に未選択の色相を増やさず、選択配色でその世界固有の光と影、明るさの分布を描く。')};
}

function isScenery(noPerson,values){return noPerson||/風景を主役|モチーフだけ|紋章・アイコン/.test(values.costume||'');}
function sceneSceneryText(text){
 // Person-specific examples are inapplicable in a scenery-only recipe. Drop
 // those complete sentences instead of substituting body parts with objects.
 return String(text).split('。').filter(s=>s&&!/(顔|眼|瞳|髪|肌|身体|人体|人物|頭身|年齢|性別|手袋|衣装|制服|魔法帽|猫耳|動作|ポーズ)/.test(s)).join('。')+'。';
}
function textOf(values,keys){return keys.map(k=>values[k]).filter(Boolean).join(' / ');}
function viewContract(values,variant,noPerson){
 const angle=values.angle||variant?.angleChoice||'確定したアングル';
 const pose=values.pose||variant?.pose||'確定したポーズ';
 const expression=textOf(values,['mood','expression'])||variant?.expression||'確定した表情';
 return noPerson
  ?'指定カメラ「'+angle+'」の高さ・方向・距離・投影・画角を固定し、見える景物の支持、接続、遮蔽だけに作画を適用する。画角外の構造を細部のために追加せず、紋章や平面図案は色面と余白の前後へ整理する。'
  :'指定カメラ「'+angle+'」、選択ポーズ「'+pose+'」、選択表情・顔角度「'+expression+'」を先に固定する。光を見せるために頭・手・脚・足などの向き、支持点、動作、撮影距離を変更しない。視点から隠れる面や部位は追加や露出をせず、自然な遮蔽を保つ。';
}

function subjectContract(noPerson,values){
 if(noPerson)return '選択された景物・物体・図案の識別形、固有色、材質、支持構造、接続、可視の背景を保つ。見本の主題へ交換せず、擬人化や別の登場主体を追加しない。';
 const proportions=textOf(values,['proportions','characterProportions','headRatio']);
 if(isNonHumanSource(values))return '入力の景色・マーク・物体には人物の識別基準がない。人物制作が明示されている場合だけ、入力の固有形・色・紋様・構造から着想した独自の主役を選択作風で設計する。元入力から同じ顔・髪・年齢・性別を復元せず、宝石光彩の画風原画や見本のキャラクターを借りない。年齢感・性別表現・基礎体格は今回の明示条件に従い、見本の若い女性や細身の体へ一律に揃えない。修正では既に生成した独自の主役の識別特徴を保持する。衣装の形・被覆・構造・素材、表情、ポーズ、カメラ、配色は今回の実際の選択を保ち、限定色と入力の識別色が衝突する場合は許可色の濃淡と固有形で翻案する。頭身は選択作風と明示条件に従い、生成済み主役がある修正ではその比率を保つ。'+(proportions?'明示された比率「'+proportions+'」を優先する。':'');
 return '主参照の同じ人物の識別特徴、年齢感、性別表現、髪型、髪と瞳などの識別色を保つ。識別特徴は選択画風の形へ翻訳し、参照の写真寸法を固定してアニメ化を妨げない。明示した限定配色と識別色に衝突がある場合は、許可色の濃淡と識別形で表し、無関係な別キャラクターへ変更しない。衣装は今回の選択に従い、形・被覆・構造・素材を保つ。頭身は主参照または今回の明示設定だけから決め、主参照がちびならその比率を保ち、通常頭身を見本からちび化しない。'+(proportions?'明示された比率「'+proportions+'」を優先する。':'');
}

function personDrawingContract(entry,values){
 if(!isNonHumanSource(values))return entry.personDrawing;
 // Retain each medium's drawing technique without claiming a face exists in
 // a landscape or mark. The new actor is retained once a repair has a result.
 return entry.personDrawing
  .replace(/主参照の識別できる特徴の組合せ/g,'今回設計した独自の主役の特徴の組合せ')
  .replace(/主参照を同じ識別特徴と年齢感の/g,'独自の主役を今回設計した特徴と年齢感の')
  .replace(/主参照の/g,'独自の主役の')
  .replace(/同じ識別特徴/g,'独自の主役の識別特徴')
  .replace(/参照と異なる髪型/g,'明示条件や生成済み主役と異なる髪型')
  .replace(/ちび参照/g,'生成済み主役がちびの場合');
}

function visibleFeaturesContract(values,variant,real){
 const expression=[textOf(values,['mood','expression','eyes','eyeState']),variant?.expression].filter(Boolean).join(' / ');
 const closed=/両目を?閉|目を閉じ|閉眼|目をつむ|目を瞑|瞼を閉じ|closed\s*eyes|eyes\s*closed/i.test(expression)&&!/片目|ウインク|wink/i.test(expression);
 const hair=textOf(values,['hair','hairstyle','appearance']);
 const hairless=/髪なし|頭髪なし|スキンヘッド|禿頭|無毛|hairless|bald/i.test(hair);
 return (closed?'閉眼の表情を保ち、閉じた瞼へ虹彩・瞳孔・開いた目を描かない。':'実際に開いて見える目だけに暗い虹彩の芯、中間の色層、小さな環境反射を描く。光のために目を開かせず、髪や横顔で隠れる目を追加しない。')+' '+(hairless?'髪なしの指定を保ち、毛束、前髪、長い髪を追加しない。':isNonHumanSource(values)?'独自の主役に髪が存在する場合だけ、明示条件または生成済み主役の髪型と識別色を保った束と内部影、反射を描く。入力図案や画風原画から髪を借りない。':'髪が存在する主参照だけに、その髪型と識別色を保った束と内部影、反射を描く。')+' '+(real?'目の湿り、皮膚、毛髪は自然な写真の素材と光学に統一し、アニメの描線や人形CGへ戻さない。':'顔・見える手・髪がある場合の束も、景物と同じ2Dの線と描いた色面で統一する。');
}

function jewelSurfaceContract(real){
 return '顔と手だけに限定しない。今回のカメラから露出して実際に見える肌の全域、顔・耳・首・肩・腕・手・脚・足など存在して見える各部へ、同じ光源による鋭く判別できる小さな輝きと不均一な光の斑を描く。形と向きに沿って反射の面積と密度を変え、肌が普通の塗りのまま衣装と背景だけ光る仕上げを避ける。存在する髪、選択衣装、小物、景物にも、束・折れ・粗さ・厚みなど各素材に合う光彩を一貫して返す。前髪が存在する場合の下、光源と反対の面、顎や部材の下、指や素材が重なる接触部は深い影にし、明るい反射とのコントラストを明瞭にする。見切れ、背面、手袋、衣服、遮蔽がある部分を見せるためにポーズや被覆を変更せず、露出を増やさない。'+(real?'皮膚の自然な階調、微細な表面、柔らかな拡散反射を残し、色光の投影と局所的なつやとして輝きを成立させる。':'肌は2Dの描いた平面陰影と薄い色層のまま、局所の反射と小光点を重ねる。')+' 全面を同じ粒のラメで覆わず、皮膚を透明ガラスや結晶へ変更しない。';
}

function jewelSceneryContract(){
 return '可視の主景と焦点の素材へ、鋭く判別できる小さな輝きと不均一な光の斑を置く。面の向きに沿う反射と、遮蔽の内部・部材の下・重なる接触部の深い影を明確に対比させる。背景だけが光る仕上げを避け、存在する各素材の固有材質を保ちながら同じ光彩を返す。全域を同じラメや透明な結晶へ置き換えない。';
}

export function referenceWorldMediumContract(value,{values={},noPerson=false,variant=null}={}){
 const entry=mediaDefinitions.find(item=>item.value===value);
 if(!entry)return null;
 noPerson=isScenery(noPerson,values);
 const real=value==='宝石光彩リアル',jewel=value==='宝石光彩アニメ'||real;
 const palette=paletteContract({...values,medium:value});
 const preservation=subjectContract(noPerson,values);
 const view=viewContract(values,variant,noPerson);
 const nonHumanSource=!noPerson&&isNonHumanSource(values);
 const drawingCore=entry.drawing+(noPerson?'': ' '+personDrawingContract(entry,values));
 const sections=[
  section('世界観ベース／最優先の描画核',drawingCore),
  section('世界観ベース／主参照と選択の分担',preservation),
  section('世界観ベース／カメラと可視範囲',view),
  section('世界観ベース／光と影の階層',noPerson?sceneSceneryText(entry.lighting):entry.lighting),
  section('世界観ベース／素材を保つ描画',noPerson?sceneSceneryText(entry.materials):entry.materials),
  ...(!noPerson?[section('世界観ベース／見える表情と髪の条件',visibleFeaturesContract(values,variant,real))]:[]),
  ...(jewel?[section('世界観ベース／焦点にも届く鋭い光',noPerson
   ?jewelSceneryContract()
   :jewelSurfaceContract(real))]:[]),
  section('世界観ベース／選択色へ投影する光',palette.text),
  section('世界観ベース／密度と世界の保全','大きな構造→中程度の素材→焦点の細部→反射と局所光の順で仕上げる。焦点と周囲の密度差、暗部の余白を保つ。選択した舞台、テーマ、演出だけを描き、名称やUIの見本から別の主題、衣装、装飾、小道具、動作を補わない。風や浮遊、魔法の演出は実際に選択されている場合だけ反映する。'),
  section('世界観ベース／完成品の照合','縮小して大きな明暗と主従を確認し、拡大して描線または写真素材、内部影、局所反射、接続が読み分けられることを確認する。見えない細部や未生成の組合せまで合格と主張せず、今回の選択と可視の仕上がりを照合する。')
 ];
 const checks=[...entry.checks,'選択色だけで成立する光と影','固定カメラと可視範囲を保つ構造','主参照と衣装または主景の識別・構造の保持',
  ...(noPerson?['選択した景物・物体・図案だけの描画']:[nonHumanSource?'独自の主役と明示条件、修正時の生成済み識別特徴保持':'同じ主役の年齢感・性別表現・髪型・識別色',nonHumanSource?'見える表情と明示条件または生成済み主役の頭身の保持':'見える表情と選択または参照の頭身の保持','選択衣装の形・被覆・構造の保持']),
  ...(jewel?[noPerson?'主景の局所光と接触部の深い影':'露出して見える肌全域と存在する髪・衣装・景物に、材質別の光彩と強い局所陰影。選択被覆を保持し露出を増やさない']:[])
 ];
 const method=(real?'Build the selected scene as a high-detail photographic image with '+(noPerson?'natural geometry':'natural anatomy')+' and material optics. ':'Completely redraw the selected scene as precise hand-drawn Japanese 2D anime, using drawn lines, planned shadow shapes and layered colour. ')+(noPerson?'Apply this only to the selected scenery, objects or flat motif. ':nonHumanSource?'Create an original actor only for the explicitly selected person output; keep the generated actor identity during repairs. Never reconstruct a face from the non-person source or borrow the drawing master character. Preserve the selected clothing, age impression, proportions, pose and visible expression. ':'Preserve the recognizable reference identity and selected clothing, age impression, proportions, pose and visible expression. ')+sections.map(s=>s.text).join(' ');
 return {medium:value,value,known:true,family:real?'photography':'luminous-anime',drawingCore,preservation,palette:palette.text,lighting:noPerson?sceneSceneryText(entry.lighting):entry.lighting,depth:view,sections,checks,method,executionMethod:method};
}

export function referenceWorldSceneRecipe(value,{noPerson=false,values={}}={}){
 const entry=sceneDefinitions.find(item=>item.value===value);
 if(!entry)return null;
 noPerson=isScenery(noPerson,values);
 const palette=paletteContract(values);
 const medium=values.medium||'今回選択した画材・作風';
 const emblem=values.costume==='紋章・アイコンにする';
 const motif=values.costume==='モチーフだけで構成する';
 const sections=[
  ...entry.sections.map(s=>({...s,text:noPerson?sceneSceneryText(s.text):s.text})),
  section('世界観の舞台／選択画材への翻訳','この項目は空間、素材、光、空気を指定する。描画技法は「'+medium+'」を保ち、写真なら自然な光学、墨や版画なら線・面・濃淡・余白で同じ関係を表す。舞台名だけでアニメの線、セル塗り、写実の表面、写真のぼけを強制しない。'),
  section('世界観の舞台／今回の主題と支持',subjectContract(noPerson,values)),
  section('世界観の舞台／選択視点と構図',viewContract(values,null,noPerson)+(emblem?' 平面の紋章は、この舞台の構造と光を少数の形・抜き・濃淡・余白へ整理し、立体の広景へ変えない。':motif?' モチーフだけの指定では、この舞台を主題の支持・接触・背景面へ統合し、無関係な広い風景を追加しない。':'')),
  section('世界観の舞台／可変の配色',palette.text),
  section('世界観の舞台／参照から借りない範囲','UIの見本は分類の説明用であり、生成の主参照ではない。元画像の構図、固有の装飾、特徴的な小物、文字、看板、施設名、掲載文は使わない。今回のテーマと選択内容に合う形と配置を独自に設計し、別の生き物や登場主体を見本から追加しない。')
 ];
 const checks=[...entry.checks,'選択画材で統一された舞台の表現','選択配色の許可色と明暗関係','固定視点と主題の支持の保持','見本の構図・固有物・文字の不使用',...(noPerson?['選択された景物・物体・図案だけの舞台']:[isNonHumanSource(values)?'独自の主役と選択衣装・ポーズ・表情の保持、修正では生成済み主役保持':'主参照と選択衣装・ポーズ・表情の保持'])];
 const method=sections.map(s=>s.text).join(' ');
 return {known:true,value,family:'reference-world-scene',fantasy:entry.fantasy,description:entry.description,sections,checks,method,executionMethod:method};
}

export const referenceWorldArtworkBases=mediaDefinitions.map(entry=>({
 value:entry.value,status:'synthesis',
 sourceNote:['宝石光彩アニメ','宝石光彩リアル'].includes(entry.value)?'ユーザーが承認した宝石のような光彩表現と修正指示を作画基準として整理。参考9ジャンルとは独立。':'ユーザー提示の参考画像分析から抽出した作画基準。作者や作品の再現ではなく、線・塗り・光の関係を整理。',
 basis:[
  'ユーザーの作例から描画特性を整理した合成作画基準。公式流派や作者の再現を主張せず、名称だけで品質を保証しない。',
  entry.drawing,
  entry.personDrawing,
  entry.lighting,
  entry.materials,
  ...(['宝石光彩アニメ','宝石光彩リアル'].includes(entry.value)?[jewelSurfaceContract(entry.value==='宝石光彩リアル')]:[]),
  '配色は毎回の選択へ投影し、見本の色を固定しない。主参照の識別特徴と年齢感、選択衣装の被覆・構造、カメラ、ポーズ、表情、参照または選択した頭身を保つ。'
 ],
 checks:[...entry.checks,'今回の選択と可視の仕上がりだけを照合する'],
 sceneryBasis:[
  'ユーザーの作例と指示から整理した合成作画基準。選択された景物・物体・図案だけに適用する。',
  sceneSceneryText(entry.drawing),
  sceneSceneryText(entry.lighting),
  sceneSceneryText(entry.materials),
  ...(['宝石光彩アニメ','宝石光彩リアル'].includes(entry.value)?[jewelSceneryContract()]:[]),
  '景物の識別形、固有色、素材、支持と接続、カメラの可視範囲を保つ。配色は今回の選択へ投影し、明示した限定色の濃淡だけで同じ光と影を表す。擬人化や別の登場主体を追加しない。'
 ],
 sceneryChecks:[...entry.checks,'選択景物の識別・素材・支持・接続の保持','固定視点と選択配色への投影'],
 avoid:[...entry.avoid,'作例の人物・髪型・衣装・特徴的な小物・配置・文章・固有名の移植','未選択の配色、猫耳や角、幼児化、ちび化、動作や視点の変更'],
 references:[]
}));
