import {colorPolicy} from './color-policy.js?v=28.1.0';
import {cameraContract} from './angles.js?v=28.1.0';

export const LUMINOUS_WORLD_MEDIUM='発光幻想アニメ';

// This is a selected rendering method, not a collection-wide lighting effect.
// All routes share the same material, palette and camera-aware construction.
export function luminousWorldContract(values={}, {noPerson=false,variant=null}={}){
 if(values.medium!==LUMINOUS_WORLD_MEDIUM)return null;
 noPerson=noPerson||/風景を主役|モチーフだけ|紋章・アイコン/.test(values.costume||'');
 const color=colorPolicy(values),geometry=cameraContract(values,{noPerson});
 const expression=[values.mood,values.expression,variant?.expression].filter(Boolean).join(' / ');
 const closedEyes=/両目を?閉|目を閉じ|閉眼|目をつむ|瞼を閉じ/.test(expression)&&!/片目|ウインク/.test(expression);
 const hair=[values.hair,values.hairstyle,values.appearance].filter(Boolean).join(' / ');
 const noHair=/髪なし|頭髪なし|スキンヘッド|禿頭/.test(hair);
 const proportions=[values.proportions,values.characterProportions].filter(Boolean).join(' / ');
 const preservation=noPerson
  ?'選択した景物・物体・図案の識別形、材質、構造、配色、舞台、視点を保つ。人物・人体・人型・顔・目・手足を追加しない。'
  :'主参照の同じキャラクター、髪型と識別色、顔の特徴、年齢感、性別表現、選択した衣装の形と被覆、ポーズ、顔角度、舞台を保つ。主参照がちびキャラなら、頭身・頭と胴の比率・短い手足をそのまま保持し、通常頭身へ引き伸ばさず、同じ小さな造形に精密な光の層を描く。'+(proportions?'明示された比率「'+proportions+'」を保つ。':'');
 const palette=color.restricted
  ?'許可色は'+color.allowed+'。最暗部は'+color.dark+'、最明部は'+color.bright+'。透明色層、反射、発光の芯まで許可色の濃淡だけで描く。補色・虹色・青紫・桃色・白を限定色の外から追加せず、色数が少なくても層・境界・面積・明度差で光を成立させる。'
  :'選択配色「'+(values.palette||'選択色')+'」の深い主色を最大の面積へ置き、その同じ色域の中間光と高彩度の反射を重ねる。副色や補色は選択配色に含まれる場合だけ小面積へ置き、白または選択色の最明部を極小領域に絞る。青紫・桃色へ固定せず、反射を理由に髪や瞳の識別色を塗り替えない。';
 const camera='指定アングル「'+(values.angle||'場面に合わせたアングル')+'」と確定した画角・撮影距離を先に固定する。'+(geometry?.vertical?'光軸は垂直のまま、実際に見える上面または下面と、その軸方向の重なり・遮蔽へ光の層を配置する。斜め俯瞰や目線の地平線へ変更しない。':'光の奥行きのために、指定カメラの高さ・傾き・距離・見切れを変更しない。');
 const spatial='前景・主題・中景・遠景の4役は、固定したカメラから実際に見える範囲の深度として扱う。広景では近い縁→焦点の主題→周囲の支持面→奥の環境へ光と反射を連続させる。接写・超接写では同じ役を、写っている輪郭・隣接素材・重なり・後方の色面へ圧縮する。画角外や遮蔽された階層は画面外のまま扱い、4層を埋めるために遠景、床、水平線、新しい物体を追加しない。平面の紋章や図案では層を色面と余白の前後へ整理し、立体の風景へ交換しない。';
 const lighting='選択場面の既存の主光の位置と向きを先に決め、主題と周囲の景物を同じ光の場へ置く。大面積の深い'+color.dark+'の影→中程度の反射光→小面積の許可色の強い光→極小の'+color.bright+'の芯を分ける。暗部内部にも弱い照り返しと遮蔽の差を残し、黒い切り抜きにも一様な明るい霞にもせず、材質の厚みと前後を読ませる。光は反射先の向き・距離・遮蔽に従わせ、全画面bloomや白い霧で暗部・描線・材質を消さない。';
 const sections=[
  {label:'選択した造形とカメラの保持',text:preservation+' '+camera},
  {label:'発光前に成立する幻想アニメ原画',text:noPerson
   ?'景物・建築・自然素材・小物を、先細りの細い有色線と薄い絵画的な色面で最初から描き直す。外形、接続、支持、主要構造が描線と明暗だけで読めること。主景から背景まで同じ線・影・筆の色層を使い、写真の素材面や滑らかなプラスチックCGを残さない。単純な二段の均一セル塗りへも戻さない。'
   :'顔の外形・眼瞼・鼻口を先細りの細い有色線と少数の描いた色面で最初から組み、主参照の識別特徴をこのアニメの造形へ翻訳する。顔・髪・衣装・物語の対象・建築まで同じ線・広い影面・薄い絵画的な重ね色で描く。写真の肌に描線だけを足した顔、均等に丸めた人形、単純な二段の均一セル塗りへ置換せず、発光前から同じ主役と選択場面が読める原画を成立させる。'},
  {label:'全世界が共有する光と深暗部',text:lighting+' 描かれる衣装・小物・建築・植物・床・空気・遠景も、その存在する可視範囲で同じ光の起点と遮蔽へつなぐ。一部だけ別の撮影照明や別の暗さを残さない。'},
  {label:'材質を保つ6段の色層',text:'各素材をベースの固有色→深い内部影→薄い透明色層→周囲からの反射→必要な場所だけの局所発光→小さく鋭いハイライトの順に構成する。透明色層は絵画的な薄塗りの積層であり、不透明な素材をガラスに変える指示ではない。布は折れと織り、石や木は厚みと粗さ、金属は硬い反射、既存の透明素材は実際の透過を保つ。物自体の発光は選択場面の既存光源に限定し、普通の肌や布まで自発光や透ける材質へ変えない。宝石や光る小物の追加でこの材質描写を代用しない。'},
  ...(!noPerson?[{label:'見える瞳・髪・肌の光層',text:(closedEyes
    ?'今回の閉眼を保ち、閉じたまぶたへ瞳・虹彩・開いた目を描かない。'
    :'開いて実際に見える目だけに、暗い虹彩の核、選択色の透明な色層、環境を受ける反射、小さく鋭いcatchlightを描く。横顔の隠れた目や髪で覆われた目を光らせるために追加せず、眼全体を白く埋めない。')+(noHair
    ?' 髪なしの指定を保ち、毛束や長い髪を追加しない。'
    :' 髪は大・中・小の束を組み、束の広い暗い内部、透光が成立する細い縁、周囲からの反射を別の面として描く。髪型・固有色を保ち、全ての毛を同じ明るさの実写の細線にしない。')+' 肌の陰は選択配色の深い色面へまとめ、頬・顎・鼻・首の見える面に薄い照り返しを加える。白い発光で肌の全面を埋めず、目鼻口の線と陰の広い面を残す。衣服にも同じ光を返し、裁断・折れ・縁・厚み・素材の違いを光の層の下で読ませる。'}]:[]),
  {label:'可視範囲の4役の深度',text:spatial},
  {label:'光の大小と密度の配分',text:'大きな光面、中程度の反射、細い輪郭光、極小の点光、薄い透光色層、奥で弱まる光を、同じ光源から説明できる異なる大きさとして配分する。主題の焦点は高密度、周辺は中密度、深暗部は光を置かない余白として残す。光源の数を増やすことと描き込みの密度を混同せず、均一な星粒、全面のsparkle、同じ太さの逆光を敷き詰めない。透光色層は既存の輪郭や光の通る領域に沿わせ、画面を横切る新しい物理的な膜を必須にしない。'},
  {label:'選択配色内の明暗階層',text:palette},
  {label:'大きな形から精密描画へ',text:'大きな形→中くらいの構造→必要な細部→素材→色の層→反射→最後の局所発光の順で描く。焦点では細い輪郭、接点、縫い目、素材の厚み、色層の重なりを精密にし、焦点から離れるほど細部・コントラスト・光の密度を減らす。遠い場所も構造を残し、単に低解像度や一様なぼけへ落とさない。高密度は同じ場所の完成した描き込みで作り、物や模様の大量追加にしない。'},
  {label:'選択した世界の保全',text:'光と素材の描き方だけを適用し、選択した世界と舞台を変更しない。魔女・ランタン・カボチャ・城・宝石・月・宇宙・星雲・星屑は場面で選ばれている場合にだけ描き、発光幻想アニメという作風名から追加しない。宇宙を選んだ場合も、選択カメラから見える星雲と星の距離、舞台へ返る反射を同じ一つの空間へつなぐ。未選択の風や浮遊を追加してポーズや支持点を変えない。'},
  {label:'縮小と拡大での完成照合',text:'縮小すると主題と周囲が一つの光の世界として読め、大面積の深暗部、中間光、極小の最明部の面積差が残ること。拡大すると細い描線、内部影、薄い色層、反射、素材の違いが読み分けられること。発光を外しても幻想アニメの原画が成立し、発光後も陰・輪郭・識別特徴が読めること。全画面bloom、白い霞、粒子の壁、別の材質や別の舞台への置換で達成したと判定しない。'}
 ];
 const checks=[
  '発光前にも成立する精密な幻想アニメ原画と先細りの細い有色輪郭',
  '同じ光の起点と遮蔽でつながる主題・周囲の景物・可視背景',
  '広い深暗部・中間光・小さな強い光・極小の最明部の面積差',
  '固有材質を保つベース・内部影・薄い色層・反射・局所発光・鋭い点光',
  '固定したカメラの可視範囲だけで成立する4役の深度',
  '焦点の高密度・周辺の中密度・暗部の余白と全画面bloomの不使用',
  '選択配色の許可色だけで成立する光と反射',
  noPerson?'人物・人体・人型・顔・目・手足を追加しない景物だけの作画':'同じ主役の髪型・識別色・衣装・ポーズ・見える表情と、ちび参照の頭身の保持'
 ];
 const method=(noPerson?'COMPLETELY REDRAW the selected scenery as a refined hand-drawn Japanese 2D luminous-fantasy anime illustration with fine tapered colored lines and thin painterly color layers. Use broad connected palette-dark shadow regions across the selected scenery, objects and background. Do not add a person, face, eye or limbs. '
  :'COMPLETELY REDRAW the scene as a refined hand-drawn Japanese 2D luminous-fantasy anime illustration with fine tapered colored lines and thin painterly color layers. Build broad connected palette-dark shadow regions. Preserve the recognizable reference feature pattern, hairstyle, identifying colors and age impression through the selected anime construction; preserve selected or referenced chibi head-to-body proportions without stretching the character or freezing photographic measurements. ')+sections.map(section=>section.text).join(' ');
 return {medium:LUMINOUS_WORLD_MEDIUM,known:true,family:'luminous-anime',preservation,palette,spatial,lighting,depth:camera+' '+spatial,sections,checks,method,executionMethod:method};
}
