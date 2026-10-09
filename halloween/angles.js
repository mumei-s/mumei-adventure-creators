// Camera geometry is independent of the selected world, expression and pose.
import {angleConstraint,moodConstraint,poseConstraint,viewSelectionIssues} from './view-constraints.js?v=28.4.6';
import {poseDefaultFraming} from './poses.js?v=28.4.6';
const rows=[
 ['目線の高さ・正面','高さは主題の中心、正面から水平に見る。上下の傾きを付けず、正面の輪郭と奥行きを読む。','主役と周囲が入るミディアムショット',0,0],
 ['斜め前45度','主題の正面から左右いずれか45度にカメラを置く。近い側と遠い側の面を同じ遠近でつなぐ。','主役と周囲が入るミディアムショット',0,45],
 ['真横90度','カメラを主題の側面90度へ置き、胴体や景物の側面投影を保つ。正面へ戻さない。','姿勢・支持面を含む全景',0,90],
 ['背面から見る','主題の背後から見る。主役の背中側と、その先に続く世界を同じ視線上へ置く。','姿勢・支持面を含む全景',0,180],
 ['背面斜め45度','背面から斜め45度へ回り込み、背中側と側面の輪郭を重ねて見せる。','姿勢・支持面を含む全景',0,135],
 ['肩越しの視点','手前に肩または主景の縁を入れ、その奥に主役が見ている対象を置く。手前と奥の視線をつなぐ。','手前の縁と向こうの対象を含む画角',0,135],
 ['少し上から・15度','カメラを主題より少し高く置き、15度ほど下向きに見る。頭上や支持面が少し見える。','主役と周囲が入るミディアムショット',15,0],
 ['ハイアングル・30度','30度下向きに見下ろす。上面と支持面を見せ、奥へ進む距離の短縮をそろえる。','姿勢と支持面を含む全景',30,0],
 ['俯瞰・45度','45度の俯瞰。頭・肩・周囲の配置と、床や地形への接地点を同じ投影で見せる。','姿勢と支持面を含む全景',45,0],
 ['急な俯瞰・70度','70度下向きに見下ろす。手前の頭部や上面が大きく、下方へ縮む短縮遠近を整える。','姿勢と支持面を含む全景',70,0],
 ['真上から・90度','カメラを主題の真上に置き、真下へ垂直に見る。床・地形の配置を上面図として見せる。','主題全体と支持面を含む俯瞰の全景',90,0],
 ['鳥の目・広い俯瞰','高い位置から斜め下へ広く見渡す。主題・中景・遠景の大きさを一つの場所でそろえる。','周囲まで見渡す広い全景',55,45],
 ['少し下から・15度','カメラを主題の中心より少し低く置き、15度上向きに見る。下面を控えめに見せる。','主役と周囲が入るミディアムショット',-15,0],
 ['ローアングル・30度','低い位置から30度上向きに見る。手前の支持面から主役、その先の空間へつなぐ。','姿勢と支持面を含む全景',-30,0],
 ['煽り・45度','主題より低い位置から45度上向きに煽る。手前の形を大きく、奥へ縮む遠近をそろえる。','姿勢と支持面を含む全景',-45,0],
 ['超ローアングル・70度','主題の足元または底部近くから70度上向きに見る。下面の重なりと大きな高低差を描く。','主役の姿勢全体と上方の世界を含む全景',-70,0],
 ['真下から・90度','上方の主題へカメラを垂直に向ける。空中の主題なら下面と、その奥の空を同じ投影でつなぐ。','上方の主題全体が入る全景',-90,0],
 ['地面すれすれの視点','支持面に近い高さから水平ないし少し上向きに見る。地面の前景から主題へ視線を導く。','支持面の前景を含む広い全景',-10,0],
 ['斜めに傾いた画面・15度','カメラを画面の軸で15度傾ける。全景と支持面を同じ角度へ回し、主題だけを曲げない。','主役と周囲が入るミディアムショット',0,45,15],
 ['大胆な傾斜・30度','画面全体を30度傾ける。建物・地形・主題が同じ画面軸で傾き、重力は場面内で一貫する。','姿勢と支持面を含む全景',0,45,30],
 ['顔のクローズアップ','顔を中心に頭部と肩の一部まで収める。識別できる目鼻口を主題として、周囲を少量だけ見せる。','顔と肩のクローズアップ',0,0],
 ['目元の超接写','顔の目元を主題に極めて近く寄る。目・眉・鼻筋の一部と、その周囲の作画を見せる。','目元だけの超接写',0,0],
 ['上半身の接写','頭頂から胸部または腰までを大きく収める。身体のポーズは写る範囲で保つ。','上半身のクローズアップ',0,0],
 ['手元・動作の接写','選択ポーズの手と対象物との接点を主題に寄る。接触・支持・動作の方向が読める画角にする。','手元と対象物を中心にした接写',20,45],
 ['足元・接地の接写','足または主題の支持部と床・地形の接点を中心に寄る。選択主題に存在しない足を追加しない。','支持部と接地点を中心にした接写',20,45],
 ['全身・周囲も見せる','主役の姿勢全体を、必要な支持面と周囲まで収める。近づけすぎて先端を切らない。','頭から足先まで入る全身と支持面',0,0],
 ['遠景・世界を主役に','主題を場所の中へ配置し、世界の広がりを主役にする。主題の特徴が読める必要な大きさを保つ。','舞台の広がりを見せるロングショット',10,45],
 ['超広角の遠近','近い主題や手前の形を大きく、奥の景物を強く小さく見せる。画材に合う形の短縮で距離を表す。','前景から遠景まで入る超広角の全景',-15,45],
 ['望遠・奥行きを圧縮','遠い位置から主題を切り取り、前景と遠景の大きさの差を抑える。層の重なりで奥行きを示す。','主題と遠景を重ねる望遠相当の画角',0,0],
 ['魚眼の曲面遠近','画面中央から外側へ弧状に広がる投影。周囲の形を曲線に沿わせ、主役の識別形を読み取れる形にする。','中央の主題と周囲が入る魚眼相当の画角',0,0],
 ['主役に向き合う一人称','鑑賞者の位置を場面内に置き、主題が目前にいる距離感を作る。一人称のために未指定の手を追加しない。','主題が目前にいるミディアムショット',0,0],
 ['遮蔽物の隙間から','同じ場所にある柱・扉・枝などの隙間から主題を見る。手前の枠と主題と奥を一つの空間につなぐ。','前景の縁越しに主題が見える画角',0,45],
 ['水平線を低く配置','同じシーンの地面や水面を下方へ置き、上方にある空や世界の広がりを大きく見せる。','空と主景を含む広い全景',-10,0],
 ['水平線を高く配置','地面や水面の広がりを大きく見せ、遠方の境界を画面上方へ置く。未選択の場所を追加しない。','支持面と主景を含む広い全景',25,0],
 ['対角線で奥へ導く','主題を含む場面の道路・建築・地形の方向を対角線へ配置し、手前から奥へ視線を導く。','前景と主題と遠景を結ぶ広い全景',10,45],
 ['鏡・水面越しの視点','選択場面に存在する反射面を通して主題を見る。反射面がなければその素材の反射だけを使い、別の場所を加えない。','反射とその元の対象がつながる画角',20,45]
];
export const angleItems=rows.map(([value,text,distance,pitch,yaw,roll=0],i)=>({value,text,distance,pitch,yaw,roll,file:'angle-'+String(i+1).padStart(3,'0')+'.svg',detailFile:'angle-'+String(i+1).padStart(3,'0')+'-detail.svg'}));
export const angleGroups=[
 {label:'目線・周り込み',values:angleItems.slice(0,6).map(x=>x.value)},
 {label:'見下ろす・俯瞰',values:angleItems.slice(6,12).map(x=>x.value)},
 {label:'見上げる・煽り',values:angleItems.slice(12,18).map(x=>x.value)},
 {label:'傾き・接写',values:angleItems.slice(18,25).map(x=>x.value)},
 {label:'距離・遠近・視点',values:angleItems.slice(25).map(x=>x.value)}
];
const fixedFaceChoices=new Set(['正面・首をまっすぐ','完全な左横顔90度','完全な右横顔90度','真上からの俯瞰','真下からのローアングル','背中から振り向く','顔を上に向ける','顔を下に向ける','正面＋満面の笑顔','左横顔＋静かな無表情','右横顔＋大笑い','俯瞰＋目を見開く','ローアングル＋威嚇','背中から振り向く＋ニヤリ']);
function presetCameraText(value){
 const mood=moodConstraint(value);
 if(mood?.cameraSide==='above')return '視点指定「'+value+'」は主題より高いカメラから見下ろす条件として保持する。顔を上へ向ける指定へ置き換えない。';
 if(mood?.cameraSide==='below')return '視点指定「'+value+'」は主題より低いカメラから見上げる条件として保持する。顎を上げる指定へ置き換えない。';
 if(mood?.cameraFacing==='rear')return '視点指定「'+value+'」は主題の背中側から見る条件として保持する。カメラへ背中を向け、胸郭と首の自然な回転を分担して振り返る。';
 return '';
}
const withoutAnatomy=text=>text.replace(/顔の目元|顔を|顔|目鼻口|頭部と肩|上半身|身体|手と|足または/g,m=>({'顔の目元':'主景の細部','顔を':'主景を','顔':'主景','目鼻口':'固有形','頭部と肩':'主景と周囲','上半身':'主景の上部','身体':'主題','手と':'接続部と','足または':'底部または'}[m])).replace(/目・眉・鼻筋の一部/,'素材や構造の細部');
function subjectText(text,{noPerson=false,values={}}={}){
 if(noPerson)return withoutAnatomy(text).replace(/頭頂|頭上|頭部|頭|肩|胴体|骨盤/g,'主景の構造').replace(/目元だけ|目元|手元|足元|頭から足先まで入る全身/g,'主景の指定部分').replace(/手足|指や足/g,'構造や縁');
 return values.costume==='人魚'?text.replace(/頭から足先まで/g,'頭から尾びれまで').replace(/足先|足元|両足|つま先/g,'尾びれ').replace(/手足|指や足/g,'腕や尾びれ'):text;
}
// Pitch is measured from the horizontal: positive looks down, negative up.
// A vertical optical axis can use perspective; it need not be orthographic.
const groundSupports=new Set(['feet','knees','floor','hands-knees','wall-feet','hand-foot']);
export function steepGroundFramingWarning(values={}, {noPerson=false}={}){
 if(noPerson||/風景を主役|モチーフだけ|紋章・アイコン/.test(values.costume||''))return null;
 const item=angleItems.find(item=>item.value===values.angle),support=poseConstraint(values.pose)?.support;
 if(item?.value!=='超ローアングル・70度'||! /全景|全身/.test(item.distance)||!groundSupports.has(support))return null;
 // A floor contact is at or below the horizon. With an upright centered
 // perspective, even camera height zero needs 2*atan(tan(70deg)/.9)=143.73deg
 // vertically to leave 5% at each edge. Lens/FOV is not selected, so warn
 // rather than invent a lens, change a pose or reject all possible projections.
 return {code:'steep-ground-whole-framing',keys:['angle','pose'],severity:'warning',reason:'床際のカメラを70度上向きに固定し、接地した姿勢全体と外周5%の余白を、画面を傾けない中央透視で収める条件は、通常の画角では両立困難です。カメラの床高0でも垂直画角は約144度以上が必要で、床より高ければさらに広くなります。画角は未指定のため注意として扱い、超広角を勝手に追加しません。カメラ角度・姿勢・接地点を変えて達成したと主張しません。'};
}
export function cameraContract(values,{noPerson=false}={}){
 const item=angleItems.find(x=>x.value===values.angle);
 if(!item)return null;
 const requirement=angleConstraint(item.value),axes=requirement.axes,mood=noPerson?null:moodConstraint(values.mood);
 const vertical=Math.abs(axes.pitch)===90;
 const numeric=Object.keys(axes).length>0;
 const text=subjectText(item.text,{noPerson,values});
 const angleWhole=/全景|全身|広い|ロングショット/.test(item.distance);
 const close=/クローズアップ|超接写|接写|手元と|支持部と/.test(item.distance);
 // Fish-eye and telephoto specify projection/depth, but do not name a crop.
 // Retain the pose's existing range instead of erasing its supports and then
 // prohibiting a full view that the selected pose had already requested.
 const poseFraming=requirement.kind==='lens'&&!angleWhole&&!close?poseDefaultFraming(values.pose,{noPerson}):null;
 const whole=angleWhole||!!poseFraming?.whole;
 const framing=poseFraming?poseFraming.distance+'。'+item.distance:item.distance;
 const geometry={selected:item.value,...(axes.pitch!==undefined?{pitch_degrees_from_horizontal:axes.pitch}:{}),...(axes.yaw!==undefined?{azimuth_relative_to_subject_degrees:axes.yaw}:{}),...(axes.roll!==undefined?{roll_degrees:axes.roll}:{}),...(mood?.cameraSide?{required_camera_side:mood.cameraSide}:{}),...(mood?.cameraFacing?{required_camera_facing:mood.cameraFacing}:{}),...(vertical?{optical_axis:axes.pitch===90?[0,0,-1]:[0,0,1],horizontal_component:0}:{}),framing:subjectText(framing,{noPerson,values})};
 const framing_instruction=(poseFraming?'画角の範囲は選択ポーズ「'+values.pose+'」から決める。'+poseFraming.distance+'。':'')+(noPerson?'主景':whole?poseFraming?'選択ポーズの姿勢全体と支持点':'選択ポーズの姿勢全体':close?'指定された接写部分':poseFraming?'選択ポーズの上半身と動作の接点':'主題の指定された範囲')+'を、固定した投影で見える輪郭と必要な周囲ごと画像領域内へ収め、外周5%以上の安全余白を保つ。'+(whole?'自然な短縮・重なり・遮蔽を保ち、隠れる指や足をすべて見せるために手足を広げたりカメラを傾けたりしない。頭から足までが画面の縦方向へ並ぶ立位の比率を強制しない。':close?'接写の指定を全身へ引き直さない。':'選択された画角を保ち、主題の範囲を別の接写や全身へ変更しない。');
 const instructions=[
  '固定するアングルは「'+item.value+'」。'+text+(numeric?' 数値で指定した角度を雰囲気の目安にせず、固定条件として実行する。':''),
  '主題・支持面・背景はこの同じカメラから描く。選択項目が指定した高さ・方位・投影・画角を固定し、未指定の軸は選択した視点プリセットとポーズに合わせて決める。画面の傾斜は画面軸の回転だけを固定し、未指定の水平視点や斜め前45度を追加しない。形式・画風・世界観の迫力や顔の見せやすさを理由に、指定された軸を変更しない。指定画角へ収める距離調整は同じ光軸上で行う。背景レシピの前景・中景・遠景は、この視点からの距離と重なりへ翻訳する。',
  '画風・材質・参照の識別特徴の細部条件は、このカメラから実際に見える面に適用する。自然に隠れる目・顔の面・手足や建築の面を、細部を見せるために露出させない。'
 ];
 const checks=[text];
 if(poseFraming){
  instructions.push(framing_instruction);
  checks.push(whole?'選択ポーズの姿勢全体と、同じ投影で見える支持点が画像領域内へ収まる':'選択ポーズの上半身と手・顔の動作の接点が画像領域内へ収まる');
 }
 const groundWarning=steepGroundFramingWarning(values,{noPerson});
 if(groundWarning)instructions.push('選択の注意：'+groundWarning.reason);
 if(!noPerson&&['書と墨の抽象','禅画','抽象表現','ミニマリズム'].includes(values.medium))instructions.push('この投影の姿勢・支持・動作は、選択画風の筆の印・形・間隔・余白で表す。各指や人体の細部を写実的に追加せず、主題と出来事の関係を読める形へ整理する。接写でも人体の細密描写を必須にせず、指定部分を選択画風で描く。');
 if(item.pitch===90){
  instructions.push('光軸は水平から下向き90度、真下へ垂直。斜め上からの俯瞰・鳥瞰へ弱めない。支持面の上面と、主題の上から見える面・重なり・短縮を描く。床の画面内での回転は可能だが、地平線や建物の正面を見せるためにカメラを傾けない。周縁の側面が見える場合も垂直視点の遠近に従う。');
  if(/空中都市/.test((values.theme||'')+' '+(values.place||'')))instructions.push('空中都市は、下方にある屋根・街区の上面、橋の接続、街区間の抜け、雲との高低差で見せる。遠景の都市を横から眺める別の視点へ変更しない。');
  checks.push('光軸が真下90度で、支持面と主題が同じ上からの投影になっている');
 }else if(item.pitch===-90){
  instructions.push('光軸は水平から上向き90度、真上へ垂直。下面と上方の重なり・短縮を描き、斜め下の煽りへ弱めない。支持面が視線を遮る場合はその遮蔽を守る。床を透かしたり、座るポーズを浮遊へ変更したりして主題を見せない。');
  checks.push('光軸が真上90度で、下面・上方の重なりと遮蔽が一致している');
 }else if(axes.pitch===-70){
  instructions.push(noPerson?'水平から上向き70度の光軸では、上方の天井・空・主景の下面が主要な投影になる。支持面の水平な遠景や広い床の前景を画面の主面にせず、視野内の接地点と必要な縁だけを残す。景物の下面の重なりと自然な短縮を同じ投影で描き、隠れる上面や構造を見せるために支持面を透かしたりカメラを水平へ戻したりしない。':'水平から上向き70度の光軸では、上方の天井・空・主題の下面が主要な投影になる。支持面の水平な遠景や広い床の前景を画面の主面にせず、視野内の接地点と必要な縁だけを残す。主題の頭の上面を広く見せるために首を深く下へ折り、床すれすれの水平カメラで代用しない。顔は実際に見える顎・鼻・口などの下面と自然な短縮で描き、隠れる目や額は作風の細部のために露出させない。');
  checks.push('上向き70度の投影で下面と上方空間が主になり、水平な床の眺めへ弱めていない');
 }else if(axes.pitch===70){
  instructions.push(noPerson?'水平から下向き70度の光軸では、支持面と主景の上面が主要な投影になる。遠方の壁の正面や水平線を画面の主面にせず、景物の上面・接続・支持部の自然な短縮と重なりを保つ。隠れる下面を見せるために景物を反らせたり、支持面を透かしたり、カメラを水平へ戻したりしない。':'水平から下向き70度の光軸では、支持面と主題の上面が主要な投影になる。遠方の壁の正面や水平線を画面の主面にせず、頭・肩・支持部の自然な短縮と重なりを保つ。下から見える顎の下面や正面顔を見せるために、主題を無理に反らせたりカメラを水平へ戻したりしない。');
  checks.push('下向き70度の投影で上面と支持面が主になり、水平な正面の眺めへ弱めていない');
 }else if(item.value==='真横90度')checks.push('主題の肩・骨盤・支持部が同じ側面投影になっている');
 if(!noPerson){
  const preset=presetCameraText(values.mood);
  if(preset)instructions.push(preset);
  instructions.push(preset?'視点プリセットと独立したアングルを、同じカメラの条件として照合する。両立不能な指定を顔の向きへ翻訳して隠さない。':fixedFaceChoices.has(values.mood)?'顔角度はカメラの方向と別の指定として、固定したカメラから見える自然な頭・首の向きで実行する。顔を見せるためにカメラの指定された高さ・方位・投影を変更しない。':'顔角度が未指定なら、選択ポーズに合う自然な頭・首の向きをこの固定視点で描く。自動演出の別のカメラ向けの顔・首の角度を追加の固定条件にしない。');
  for(const problem of viewSelectionIssues(values))instructions.push((problem.severity==='error'?'選択の不成立：':'選択の注意：')+problem.reason+(problem.severity==='error'?' 選択を変えるまでは、この組み合わせを満たす画像の生成を進めず、不成立を伝える。':' 見えない条件まで達成したと主張しない。'));
 }
 instructions.push('選択したポーズ・支持点と画風・形式・世界観を保持する。明示した顔角度やポーズがこの視点と両立しない場合は、その衝突を短く伝え、首や関節の破綻・カメラ角度の変更で満たしたと主張しない。');
 return {...geometry,vertical,whole,framing_instruction:subjectText(framing_instruction,{noPerson,values}),instructions:instructions.map(t=>subjectText(t,{noPerson,values})),checks:checks.map(t=>subjectText(t,{noPerson,values}))};
}
export function angleRecipe(value,{noPerson=false,values={}}={}){
 const item=angleItems.find(x=>x.value===value);
 if(!item&&!['おまかせ','場面に合わせたアングル',undefined,''].includes(value))return {known:false,sections:[{label:'指定アングルの具体化',text:'自由指定「'+value+'」のカメラ位置・高さ・距離・投影を、選んだシーンとポーズに合わせて具体化する。作風や世界は変更しない。'}],checks:['自由指定「'+value+'」に合うカメラ投影']};
 if(!item)return {known:true,sections:[{label:'場面に合うカメラ',text:'選択した世界観・シーンとポーズに合うカメラ位置と距離を決める。作風と世界を変更せず、直近の未指定構図を繰り返さない。'}],checks:['場面と主題に合うカメラ位置・距離']};
 const text=subjectText(item.text,{noPerson,values});
 const geometry=cameraContract({...values,angle:value},{noPerson});
 return {known:true,sections:[{label:'カメラの位置と投影',text},{label:'画角・距離',text:geometry.framing+'。構図は選択ポーズと同じ一場面に適用し、画材や描線は選択作風を保つ。'},{label:'作画への翻訳',text:'角度と遠近を、選択技法の線・面・大小・重なり・余白で表す。写真レンズの見本を、人物や世界や画風の参照に使わない。'},...(geometry.vertical?[{label:'垂直投影の照合',text:geometry.checks.at(-1)}]:[])],checks:[text,geometry.framing,...geometry.checks.slice(1),'画風とシーンと動作を保持した同じカメラ投影']};
}
export function applyAngle(values,variant){
 const item=angleItems.find(x=>x.value===values.angle);if(!item){if(!values.angle||['おまかせ','場面に合わせたアングル'].includes(values.angle))return variant;return {...variant,camera:'自由指定「'+values.angle+'」のカメラ位置・方向を実行する。',distance:'自由指定「'+values.angle+'」に合う画角と距離を使う。',angleChoice:values.angle};}
 const noPerson=/風景を主役|モチーフだけ|紋章・アイコン/.test(values.costume||'');
 const spec=angleRecipe(values.angle,{noPerson,values});
 let face=variant.face;
 if(!noPerson&&!fixedFaceChoices.has(values.mood))face='選択ポーズに合う自然な頭と首の向き。この固定視点から実際に見える頭部の面と短縮を描き、選択表情は見える範囲で保つ。';
 else if(!noPerson){
  // A selected camera preset stays a camera condition. Incompatible explicit
  // requirements are reported, never translated into a different head pose.
  if(moodConstraint(values.mood)?.cameraSide==='above')face='視点指定「'+values.mood+'」を保持し、上から見える顔の面と自然な短縮を描く。頭と首を無理に折らない。';
  else if(moodConstraint(values.mood)?.cameraSide==='below')face='視点指定「'+values.mood+'」を保持し、下から見える顔の下面と自然な短縮を描く。顎を上げるだけで低いカメラを満たしたとしない。';
  else if(/背中から振り向く/.test(values.mood))face='背中側を向け、肩越しに振り返る。固定カメラを動かさず、胸郭と首の自然な回転を分担して選択表情を見える範囲で描く。';
  else if(values.mood==='顔を上に向ける')face='顔を上へ向ける。固定カメラから見える面と短縮を描き、頭と首を自然につなぐ。';
  else if(values.mood==='顔を下に向ける')face='顔を下へ向ける。固定カメラから見える面と短縮を描き、頭と首を自然につなぐ。';
  else if(/完全な右横顔90度|右横顔＋/.test(values.mood))face='完全な右横顔90度。右向きの顔を自然な頭・首の回転で実行し、固定カメラを変更しない。見える目は一つ。';
 }
 const preset=noPerson?'':presetCameraText(values.mood);
 return {...variant,face,camera:item.value+'。'+spec.sections[0].text+(preset?' '+preset:''),distance:spec.sections[1].text,depth:(variant.depth||'')+' 選択アングル「'+item.value+'」の投影と画角を保つ。',angleChoice:item.value};
}
