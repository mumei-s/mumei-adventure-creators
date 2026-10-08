import {colorPolicy} from './color-policy.js?v=28.4.1';
import {cameraContract} from './angles.js?v=28.4.1';

export const LUMINOUS_WORLD_MEDIUM='発光幻想アニメ';

// This is a selected rendering method, not a collection-wide lighting effect.
// All routes share the same material, palette and camera-aware construction.
export function luminousWorldContract(values={}, {noPerson=false,variant=null}={}){
 if(values.medium!==LUMINOUS_WORLD_MEDIUM)return null;
 noPerson=noPerson||/風景を主役|モチーフだけ|紋章・アイコン/.test(values.costume||'');
 const objectSource=['scenery','mark-object'].includes(values.sourceKind);
 const faceIdentity='女性の見本や少女漫画という作風名から若い女性の顔・細身の身体へ固定しない。眉・顎・鼻・首と元々ある髭の識別特徴を、選択2D作画の形と陰へ残す。ない髭を追加しない。';
 const color=colorPolicy(values),geometry=cameraContract(values,{noPerson});
 const expression=[values.mood,values.expression,variant?.expression].filter(Boolean).join(' / ');
 const closedEyes=/両目を?閉|目を閉じ|閉眼|目をつむ|瞼を閉じ/.test(expression)&&!/片目|ウインク/.test(expression);
 const hair=[values.hair,values.hairstyle,values.appearance].filter(Boolean).join(' / ');
 const noHair=/髪なし|頭髪なし|スキンヘッド|禿頭/.test(hair);
 const proportions=[values.proportions,values.characterProportions].filter(Boolean).join(' / ');
 const preservation=noPerson
  ?'選択した景物・物体・図案の識別形、材質、構造、配色、舞台、視点を保つ。人物・人体・人型・顔・目・手足を追加しない。'
  :objectSource?'入力の景色・マーク・物体には人物の識別基準がない。明示された人物作品のために固有形・色・構造から独自の主役を設計し、元入力から顔・髪・年齢・体格を復元せず、画風原画の人物を借用しない。修正では既に成立した独自の主役を保持する。'+faceIdentity:'主参照の同じキャラクター、髪型と識別色、顔の特徴、年齢感、性別表現、選択した衣装の形と被覆、ポーズ、顔角度、舞台を保つ。主参照がちびキャラなら、頭身・頭と胴の比率・短い手足をそのまま保持し、通常頭身へ引き伸ばさず、同じ小さな造形に精密な光の層を描く。'+(proportions?'明示された比率「'+proportions+'」を保つ。':'')+faceIdentity;
 const palette=color.restricted
  ?'許可色は'+color.allowed+'。最暗部は'+color.dark+'、最明部は'+color.bright+'。透明色層、反射、発光の芯まで許可色の濃淡だけで描く。補色・虹色・青紫・桃色・白を限定色の外から追加せず、色数が少なくても層・境界・面積・明度差で光を成立させる。'
  :'選択配色「'+(values.palette||'選択色')+'」の深い主色を最大の面積へ置き、その同じ色域の中間光と高彩度の反射を重ねる。副色や補色は選択配色に含まれる場合だけ小面積へ置き、白または選択色の最明部を極小領域に絞る。青紫・桃色へ固定せず、反射を理由に髪や瞳の識別色を塗り替えない。';
 const camera='指定アングル「'+(values.angle||'場面に合わせたアングル')+'」と確定した画角・撮影距離を先に固定する。'+(geometry?.vertical?'光軸は垂直のまま、実際に見える上面または下面と、その軸方向の重なり・遮蔽へ光の層を配置する。斜め俯瞰や目線の地平線へ変更しない。':'光の奥行きのために、指定カメラの高さ・傾き・距離・見切れを変更しない。');
 const spatial='前景・主題・中景・遠景の4役は、固定したカメラから実際に見える範囲の深度として扱う。広景では近い縁→焦点の主題→周囲の支持面→奥の環境へ光と反射を連続させる。接写・超接写では同じ役を、写っている輪郭・隣接素材・重なり・後方の色面へ圧縮する。画角外や遮蔽された階層は画面外のまま扱い、4層を埋めるために遠景、床、水平線、新しい物体を追加しない。平面の紋章や図案では層を色面と余白の前後へ整理し、立体の風景へ交換しない。';
 const lighting='外からの主光で大きな明暗の方向を決め、その上で主題と周囲の素材の色層内部から幻想の光がにじむ、共通の発光世界を描く。発光を既存の照明器具や背景の一つのスポットに限定しない。大面積の深い'+color.dark+'の影→内部に重なる中程度の透光色→小面積の許可色の強い光→極小の'+color.bright+'の芯を分ける。暗部内部にも色の奥行きと弱い発光があり、縁だけ光る黒い切り抜きへ戻さない。内部光と周囲への照り返しは一つの色・強弱・距離・遮蔽の設計でつなぐ。全画面bloomや白い霧で暗部・描線・材質を消さない。';
 const drawingCore=(noPerson
  ?'描画核：主景・物体・建築・植物・支持面・可視背景を、精密な2Dアニメの先細りの有色線と描いた平面陰影へ最初から再構築する。'
  :'描画核：顔を精密な少女漫画・日本2Dアニメの描線と平面陰影へ最初から再構築する。上眼瞼は強弱のある曲線、虹彩は描いた暗い核と透明な色面、鼻は短い線と小さな影面、口は少数の線と薄い色面、頬は大きく設計した影面として描く。実写の肌の連続階調や濡れた唇、滑らかな3Dの顔を下地に残さない。髪型と茶髪などの識別色は保持し、大中小の描いた束と暗い内部へ整理する。')+
  '主題だけでなく周囲の全域を同じ2Dの細線・広い深暗部・精密な薄い色層で描く。'+(noPerson?'木・石・水面・布など選択した景物の素材':'肌・髪・布・鱗・木・石など存在する素材')+'の内部にも、選択色の宝石のように澄んだ発光と反射の重なりが読めること。材質の外形・模様・折れ・粗さは保ち、ガラスや厚い金属CGへ変えない。背景の一灯だけ光って主題や景物が通常の照明のままの絵へ戻さない。大きな暗部を残し、色層内部の光、薄い縁光、小さく鋭い最明部を密度差で分ける。'+(noPerson?'人物・顔・手足は追加しない。':objectSource?'設計した独自の主役、選択衣装、ポーズ、見える表情と選択画風の頭身を保つ。':'同じ主役、選択衣装、ポーズ、見える表情、参照のちび頭身を保つ。')+'選択配色と固定したカメラの可視範囲で成立させる。';
 const sections=[
  {label:'最優先の描画核',text:drawingCore},
  {label:'選択した造形とカメラの保持',text:preservation+' '+camera},
  {label:'発光前に成立する幻想アニメ原画',text:noPerson
   ?'景物・建築・自然素材・小物を、先細りの細い有色線と薄い絵画的な色面で最初から描き直す。外形、接続、支持、主要構造が描線と明暗だけで読めること。主景から背景まで同じ線・影・筆の色層を使い、写真の素材面や滑らかなプラスチックCGを残さない。単純な二段の均一セル塗りへも戻さない。'
   :'顔の外形・眼瞼・鼻口を先細りの細い有色線と少数の描いた色面で最初から組み、'+(objectSource?'設計した独自の主役の識別特徴':'主参照の識別特徴')+'を精密な少女漫画・日本2Dアニメの造形へ翻訳する。上眼瞼と目尻は太細のある描線、鼻は短い線と小さな影面、口は少数の線と薄い色面、頬と顎は設計した平面陰影とする。顔・髪・衣装・物語の対象・建築まで同じ線・広い影面・薄い絵画的な重ね色で描く。写真の肌の連続階調、濡れた唇の反射、滑らかな人形CGの顔を下地に残さず、単純な二段の均一セル塗りへも置換しない。発光前から2Dの描線と描いた影面で同じ主役と場面が読めること。'},
  {label:'全世界が共有する光と深暗部',text:lighting+' 描かれる衣装・小物・建築・植物・床・空気・遠景も、その可視範囲で内部光と周囲の光を共有する。宝石のような光は色層の澄んだ重なりとして全域に見え、物理的な宝石や新しい照明器具を追加する必要はない。'},
  {label:'材質を保つ6段の色層',text:'各素材をベースの固有色→深い内部影→薄い透明色層→周囲からの反射→色層内部の幻想発光→小さく鋭いハイライトの順に構成する。透明色層は絵画的な薄塗りの積層であり、不透明な素材をガラスに変える指示ではない。'+(noPerson?'選択した布や木や石も':'肌や布、木や石も')+'本来の素材のまま内部の色層から薄く光って見える、幻想世界の作画として成立させる。布は折れと織り、木や石は厚みと粗さ、金属は硬い反射、既存の透明素材は透過を描き分ける。'+(noPerson?'主景の細かい模様や縁も':'鱗や角も')+'2Dの細い境界と薄い反射面で素材を示し、厚い金属パネルや3Dの鏡面へ戻さない。内部光は無関係な光る小物や宝石を足すことで代用しない。'},
  ...(!noPerson?[{label:'見える瞳・髪・肌の光層',text:(closedEyes
    ?'今回の閉眼を保ち、閉じたまぶたへ瞳・虹彩・開いた目を描かない。'
    :'開いて実際に見える目だけに、暗い虹彩の核、選択色の透明な色層、環境を受ける反射、小さく鋭いcatchlightを描く。横顔の隠れた目や髪で覆われた目を光らせるために追加せず、眼全体を白く埋めない。')+(noHair
    ?' 髪なしの指定を保ち、毛束や長い髪を追加しない。'
    :' 髪は大・中・小の束を組み、束の広い暗い内部にも透光する色の層を描き、細い縁光と周囲からの反射を別の面として重ねる。髪型・茶髪などの固有色を保ち、全ての毛を同じ明るさの実写の細線にしない。')+' 肌の陰は選択配色の深い平面陰影へまとめ、頬・顎・鼻・首の見える面の内側に薄い幻想光と照り返しを描く。白い発光で肌の全面を埋めず、目鼻口の線と陰の広い面を残す。衣服にも内部光と反射の層が続き、裁断・折れ・縁・厚み・素材の違いを読ませる。'}]:[]),
  {label:'可視範囲の4役の深度',text:spatial},
  {label:'光の大小と密度の配分',text:'大きな光面、中程度の反射、細い輪郭光、極小の点光、薄い透光色層、奥で弱まる光を、共通の発光世界の異なる大きさとして配分する。主題の焦点は高密度、周辺は中密度、深暗部は低密度の余白を保ちながら弱い内部光が読める領域とする。すべての面を同じ明るさへ持ち上げず、均一な星粒、全面のsparkle、同じ太さの逆光を敷き詰めない。透光色層は素材の内部や重なりへ沿わせ、画面を横切る新しい物理的な膜を必須にしない。'},
  {label:'選択配色内の明暗階層',text:palette},
  {label:'大きな形から精密描画へ',text:'大きな形→中くらいの構造→必要な細部→素材→色の層→反射→最後の局所発光の順で描く。焦点では細い輪郭、接点、縫い目、素材の厚み、色層の重なりを精密にし、焦点から離れるほど細部・コントラスト・光の密度を減らす。遠い場所も構造を残し、単に低解像度や一様なぼけへ落とさない。高密度は同じ場所の完成した描き込みで作り、物や模様の大量追加にしない。'},
  {label:'選択した世界の保全',text:'光と素材の描き方だけを適用し、選択した世界と舞台を変更しない。魔女・ランタン・カボチャ・城・宝石・月・宇宙・星雲・星屑は場面で選ばれている場合にだけ描き、発光幻想アニメという作風名から追加しない。宇宙を選んだ場合も、選択カメラから見える星雲と星の距離、舞台へ返る反射を同じ一つの空間へつなぐ。未選択の風や浮遊を追加してポーズや支持点を変えない。'},
  {label:'縮小と拡大での完成照合',text:'縮小すると主題と周囲が一つの光の世界として読め、大面積の深暗部、中間光、極小の最明部の面積差が残ること。拡大すると細い描線、内部影、薄い色層、反射、素材の違いが読み分けられること。発光を外しても幻想アニメの原画が成立し、発光後も陰・輪郭・識別特徴が読めること。全画面bloom、白い霞、粒子の壁、別の材質や別の舞台への置換で達成したと判定しない。'}
 ];
 const checks=[
  '発光前にも成立する精密な幻想アニメ原画と先細りの細い有色輪郭',
  '共通の色と発光・遮蔽の設計でつながる主題・周囲の景物・可視背景',
  '広い深暗部・中間光・小さな強い光・極小の最明部の面積差',
  '固有材質を保つベース・内部影・薄い色層・反射・局所発光・鋭い点光',
  '固定したカメラの可視範囲だけで成立する4役の深度',
  '焦点の高密度・周辺の中密度・暗部の余白と全画面bloomの不使用',
  '選択配色の許可色だけで成立する光と反射',
  '背景の一灯だけでなく主題と周囲の素材内部に読める幻想発光',
  noPerson?'可視の景物全域で一致した2Dの描線・平面陰影・薄い色層':'描いた眼瞼・虹彩・短い鼻の線・薄い口の色面と平面陰影で成立する2Dアニメ顔',
  noPerson?'人物・人体・人型・顔・目・手足を追加しない景物だけの作画':'同じ主役の髪型・識別色・衣装・ポーズ・見える表情と、ちび参照の頭身の保持'
 ];
 const method=(noPerson?'COMPLETELY REDRAW the selected scenery as a refined hand-drawn Japanese 2D luminous-fantasy anime illustration with fine tapered colored lines and thin painterly color layers. Use broad connected palette-dark shadow regions across the selected scenery, objects and background. Do not add a person, face, eye or limbs. '
  :'COMPLETELY REDRAW the scene as a refined hand-drawn Japanese 2D luminous-fantasy anime illustration with fine tapered colored lines and thin painterly color layers. Build broad connected palette-dark shadow regions. Preserve the recognizable reference feature pattern, hairstyle, identifying colors and age impression through the selected anime construction; preserve selected or referenced chibi head-to-body proportions without stretching the character or freezing photographic measurements. ')+drawingCore+' '+palette;
 return {medium:LUMINOUS_WORLD_MEDIUM,known:true,family:'luminous-anime',drawingCore,preservation,palette,spatial,lighting,depth:camera+' '+spatial,sections,checks,method,executionMethod:method};
}
