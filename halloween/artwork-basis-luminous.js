// These are deliberately synthesized digital styles. References establish
// component techniques, not a historical school or a claim of identical work.
// The aggregator keeps author names, URLs and work subjects out of image input.
const anime={title:'Sin:cK — Pen Settings for Anime Art in Any Style',url:'https://www.clipstudio.net/how-to-draw/archives/154262',kind:'technique',note:'作者本人がアニメの明確な色境界、水彩の縁、厚塗りの筆の面を作例で区別。選択した造形と画材の結合を整理する資料。'};
const glow={title:'Grace Zhu — How to Draw Glowing Effects for Magical Portraits',url:'https://www.clipstudio.net/how-to-draw/archives/162569',kind:'work',note:'作者本人の制作例。暗い下絵と明るい局所光、素材を通る光、過露光で失う細部を比較。作例の宝石・星・髪型・構図は取り込まない。'};
const layers={title:'CELSYS — How to Use Blending Modes on Layers: Expressing Light',url:'https://tips.clip-studio.com/en-us/articles/1178',kind:'technique',note:'公式資料の加算光、低不透明度のぼかし、色の乗算影。光の芯と広がり、影の色を別々に制御する根拠。'};
const painting={title:'Reuben Lara — Lighting your Painting',url:'https://www.clipstudio.net/how-to-draw/archives/156055',kind:'work',note:'作者本人の二つの絵画例。前景・中景の遮蔽に沿う方向光と、元の限定色や筆の描写を残す光の調整を比較。'};
const watercolor={title:'InmaR. — Turning anime cell coloring into watercolor',url:'https://tips.clip-studio.com/en-us/articles/1801',kind:'technique',note:'作者本人のアニメ線画・色面を、水彩の質感と色の境界へ変える制作工程。実物の身体を透明にする方法ではない。'};
const refraction={title:'Exploratorium — Disappearing Glass Rods',url:'https://www.exploratorium.edu/snacks/disappearing-glass-rods',kind:'technique',note:'屈折率と見える境界の関係を示す実験。透過を単なる不透明度低下にせず、輪郭と背後の像の関係として扱う資料。'};
const dispersion={title:'Exploratorium — Glass Bead Rainbow',url:'https://annex.exploratorium.edu/xref/exhibits/glass_bead_rainbow.html',kind:'technique',note:'ガラス内の反射と分光の展示。透明な厚み、反射、分光を異なる現象として整理し、虹色を全面へ塗る処理と区別。'};
const holography={title:'S. A. Benton / MIT OpenCourseWare — White-Light Transmission Rainbow Holograms',url:'https://ocw.mit.edu/courses/mas-450-holographic-imaging-spring-2003/d8da840f0c0acd685106df4617eebf91_ch14rainbowholograms.pdf',kind:'technique',note:'観察位置・照明・分光色・像の深度の関係。架空の投影膜や走査線はこの実物技術の再現とは区別する。'};

export const luminousBases=[
 {value:'発光幻想アニメ',status:'synthesis',basis:[
  '合成したデジタル作画基準。精密な少女漫画・日本2Dアニメの有色線と描いた平面陰影を先に構築し、写真の連続階調や滑らかな3Dの顔を残さず薄い絵画的な色層を重ねる。',
  '主題、衣装、小物、建築、植物、支持面、可視背景それぞれの内部にも幻想光が読める、一つの発光世界を描く。背景の一灯だけ光る通常の照明へ限定せず、大面積の深暗部と極小の鋭い最明部を保つ。',
  '固有色、内部影、薄い透明色層、反射、色層内部の幻想発光、鋭い小ハイライトを描き分ける。肌や布、鱗、木や石は本来の素材のまま薄く光り、透明ガラスや厚い金属CGへ変えない。',
  '主役の高密度、周囲の中密度、暗部の余白を配分し、固定カメラから見える深度と素材の重なりへ光の大小を合わせる。接写や垂直視点のために広い背景を追加しない。',
  '選択配色と識別色、選択ポーズと衣装、参照のちび比率を保つ。限定色では透明層や光の芯も許可色の濃淡へ翻訳する。'
 ],checks:[
  '発光を除いても読める2Dの有色線と平面陰影、薄い色層と固有材質',
  '主題と周囲の暗部内部にも幻想光があり、拡大して材質と内部影・反射の層が読める',
  '深暗部と極小最明部、焦点と暗部の密度差を保つ選択配色'
 ],avoid:[
  '全画面の白いbloom、均一な星粒、写真の顔や人形CGの土台に光を足す処理',
  '作例のキャラクター・宝石・髪型・星・構図の移植や、全素材のガラス化'
 ],references:[glow,layers,anime]},
 {value:'透明水彩アニメ',status:'synthesis',basis:[
  '合成したデジタル作画基準。アニメの識別できる線と大きな影面を、透明水彩の薄い色層、下地の抜け、湿った縁と乾いた縁へ結びつける。',
  '色を重ねた領域の濃度差と紙の明るさで深さを作る。主要輪郭は少数の乾いた線で締め、すべてを均一にぼかさない。',
  '顔や衣服、景物と背景にも同じ水彩の縁と薄い塗りを使い、主題だけセル塗り、背景だけ実写の混在を避ける。',
  '水彩の透明は描画層の性質。人物・不透明な衣装・建物を幽霊やガラスへ変えず、限定色の最明部を下地の抜けへ使う。'
 ],checks:[
  '識別できるアニメの形と乾いた線、にじむ縁、透ける重ね色が同時にある',
  '水彩の色層で示す深さと大きな影面、下地の明るさ'
 ],avoid:[
  '主題の物理的な透明化、写真の肌、硬いCG鏡面',
  '発光幻想の粒子や強い光膜を水彩という名称だけから加える処理'
 ],references:[watercolor,anime]},
 {value:'絵画的シネマアニメ',status:'synthesis',basis:[
  '合成したデジタル作画基準。簡潔な2Dアニメの造形に、筆の大きな色面と映画のように設計した明暗・焦点を組み合わせる。',
  '主光を一方向へ絞り、背を向ける面へ広い深い影を残す。反射は主光より小さい領域に置き、暗い筆の面を消さない。',
  '焦点の描線と影の境界を締め、周辺の縁は筆の面へ溶かす。人物・衣装・背景が同じ筆の大きさと材質で成立する。',
  'カメラで見える前後の遮蔽、色面のコントラスト、必要な空気遠近で距離を示す。写真のレンズぼけや別の画角を後付けしない。'
 ],checks:[
  '2Dアニメの形、全域の筆の色面、焦点を作る輪郭の硬軟',
  '共有された主光と深い影、固定視点の遮蔽と距離'
 ],avoid:[
  '顔だけの写真化、全域の白い霧、全ての輪郭の均一ぼかし',
  '比較作例の夕日・森・人物や構図を選択場面へ追加する処理'
 ],references:[painting,anime]},
 {value:'クリスタル透光アニメ',status:'synthesis',basis:[
  '合成したデジタル作画基準。2Dアニメの識別形と色面を保ちながら、主題の広い面を結晶的な透光色層として再構成する。',
  '透過の濃度差、厚い縁、背後の輪郭が境界でずれる屈折、内部の二次反射を別々に描く。単に輪郭を薄くする処理で透明を代用しない。',
  '光の面と隣接する深い影を配分し、薄い色層の前後を縮小しても読める大きさにする。選択した人体や景物の外形と接続を保つ。',
  '分光は選択した光学層の局所へ使い、背景や識別色の全体を虹色にしない。限定配色では屈折、内部反射、透過の濃度差を許可色で表す。'
 ],checks:[
  '主題の広い透光色層、背後の輪郭の屈折、内部反射が光点と別々に読める',
  '2Dの識別形と衣装の被覆・景物の構造、選択配色の維持'
 ],avoid:[
  '宝石の小物や光粒だけで透光を代用する処理',
  '無関係な多面体へ身体や建物を交換する処理'
 ],references:[anime,refraction,dispersion]},
 {value:'宝石ホログラムアニメ',status:'synthesis',basis:[
  '合成したデジタル作画基準。2Dアニメの主題そのものを半透明の投影像へ変換し、深度の異なる投影層と干渉の縁を連続させる。実物のホログラムの忠実な再現とは区別する。',
  '通常の肌や不透明な景物の外側に光膜を置くだけにせず、本体の広い面にも透過の濃度差、位置のずれた二重像、細い色の境界を続ける。',
  '投影層の描線と大きなセル影を保ち、選択した外形・衣装の被覆・景物の接続を維持する。透過や干渉で目鼻口と主景の輪郭を消さない。',
  '走査線と複数の光膜はこの合成様式のデジタル演出として投影部へ限定する。実物ホログラフィーの必須現象と誤認せず、限定色では干渉縁を許可色の明度差へ置き換える。'
 ],checks:[
  '主題本体まで連続した投影像と、前後で異なる透過・干渉縁・二重像',
  '投影部だけの走査線、保たれた2D輪郭と深いセル影'
 ],avoid:[
  '宝石の首飾りや通常の逆光だけを描く置換',
  '未指定の顔・景色・文字・UIの投影や、主題を覆い隠す均一の膜'
 ],references:[anime,holography,layers]},
 {value:'クリスタルホログラム造形アニメ',status:'synthesis',basis:[
  '合成したデジタル作画基準。主題の識別できる外形と構造を透明な結晶材質で造形し、アニメの細い線と色面でその内側の厚みを描く。',
  '顔・髪・身体、または主景の広い面そのものに透明な厚みを与え、背後の輪郭の屈折ずれと暗い二重の内部反射を作る。小物だけを光らせた普通の肌へ戻さない。',
  '分光と薄膜干渉は結晶の面や縁へ連続させ、面の向きと深い影で量感を分ける。実物のホログラフィーとは異なる、ガラス光学と投影演出の合成として扱う。',
  '強い近景や動勢も選択された画角とポーズの中で短縮・遮蔽へ翻訳する。人体や建築の接続、支持点、衣装の被覆を保ち、光のために別ポーズへ変更しない。'
 ],checks:[
  '本体の広い結晶面、厚い縁、屈折した背後の像、暗い内部反射',
  '結晶面に続く分光・干渉の縁と、保たれた識別形・支持・選択視点'
 ],avoid:[
  '不透明な主題を残して宝飾だけを虹色にする処理',
  '無関係な水晶塊・宝石・飛散粒子や、光を見せるための画角と姿勢の変更'
 ],references:[anime,refraction,dispersion,holography]}
];
