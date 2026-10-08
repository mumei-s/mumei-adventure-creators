// Internal construction rules distilled from gesture and full-body pose studies.
// Study images and sheet numbers never enter the catalogue or generated subject.
const automatic = value => !value || value === 'おまかせ';
const section = (label, text) => ({label, text});
const nonPerson = ({noPerson=false,values={}}={}) => noPerson || /風景を主役|モチーフだけ|紋章・アイコン/.test(values.costume||'');

function selectedMovement(value,variant={}) {
 return automatic(value) ? variant?.pose||'' : value;
}
function supportFor(action,mermaid) {
 if(mermaid)return '上体の動作と荷重の方向は選択ポーズのまま、下半身の支持だけを一本の魚尾と実在する岩・床・座面へ翻訳する。人の二本脚・膝・足を追加しない。浮遊・水中は明示された場合だけ支持面から離す。';
 if(/うつ伏せ|仰向け|横向きに寝|横たわ/.test(action))return '選んだ寝姿の向きを保ち、肩・胸郭・骨盤と下肢のうち実際に荷重を受ける面を床や寝台へ接する。身体を細く引き延ばさず、支持面との隙間・沈み・接触影をその体格に合わせる。';
 if(/四つん這い|四つ這い/.test(action))return '左右の掌と膝を支持面へ置き、肩から手首、骨盤から膝へ荷重を通す。胸郭と骨盤の幅に合う手膝の間隔で支え、手足を同じ位置へ重ねない。';
 if(/片手を床について着地/.test(action))return '選択した接地足と反対側の一つの掌へ荷重を分け、同じ床面で支える。胸郭・骨盤から膝と肘への流れを保ち、他方の掌や脚を追加の支持点へ変えない。';
 if(/着地|低くしゃがむ|腰を落として構える/.test(action))return '選択した足の接地を保ち、足首・膝・股関節を連続して曲げ、低い重心を支持範囲へ置く。肩幅や骨盤幅に応じた脚の間隔にし、女性らしい脚寄せや男性らしい大開脚を自動指定しない。';
 if(/正座/.test(action))return '両膝・すね・足の甲を支持面へ沿わせ、腰を踵へ下ろす。腿とすねの厚み、股関節と足首の自然な曲がりを元の体格へ合わせ、脚を貫通させたり膝立ちへ変えたりしない。';
 if(/膝をついて|片膝をつく|両膝でひざまずく/.test(action))return '選択した片膝か両膝だけを床へ接し、前足・膝・足先の役割を区別する。骨盤の高さと胸郭の荷重を支持点へつなぎ、元の体格で成立する膝と足の間隔にする。';
 if(/床であぐら|膝を抱えて座|脚を伸ばして座|片膝を立てて座/.test(action))return '坐骨を床へ載せ、選択された脚の畳み方・伸ばし方を保持する。左右の腿・膝・すね・足先の連続を追い、交差は上下を一つに定め、骨盤幅と四肢の厚みに応じて無理なく収める。';
 if(/椅子|横向きに座る|座って脚を組む|ベンチ|机に片肘/.test(action))return '坐骨と腿の後面を実在する座面へ載せ、選択された足・肘・背の支持へ荷重を分ける。座面高と脚の長さを元の体格へ合わせ、脚の交差は選択時だけ行い、左右の上下と床へ届く支持足を区別する。';
 if(/ジャンプ|跳|空中|浮遊/.test(action))return '選択された跳躍・回転・浮遊の途中を保ち、身体を支持面から離す。四肢の釣り合いと体幹の運動方向を一つにし、接地を追加して立位へ戻さない。離れた落ち影は実在する面に置く。';
 if(/歩|走|駆け|踏み出|階段/.test(action))return '選択した歩幅・前傾・進行方向を保ち、支持脚と遊脚、足裏の荷重移動と腕の逆位相を区別する。四肢の長さと骨盤の幅に合う自然な運動にし、性別だけで歩幅や脚の交差を変更しない。';
 return '選択ポーズに既にある足・座面・壁・軸足などの支持だけを使い、骨盤の上へ胸郭の重さを通す。元の肩幅・骨盤幅・四肢の長さに合う重心で実行し、別の立ち方や追加の脚交差へ置き換えない。';
}
function contactFor(action) {
 if(/両手.*(?:枠|フレーム|顔を囲)/.test(action))return '明示された二つの掌と指で顔の周囲の空間を作り、顔・左右の手・手首の前後を分ける。指の接点と抜けを残し、目鼻口や顔幅を枠へ押し込まない。';
 if(/指ハート|指でハート/.test(action))return '明示された手の親指と人差し指の交差だけで小さなハートの形を作り、残りの指は掌へ畳む。両手で作る大きなハートへ置き換えず、指の上下と手首の連続を保つ。';
 if(/祈|合掌/.test(action))return '明示された左右の掌を向かい合わせ、指の向き・手首・肘を自然につなぐ。掌を一つの手へ融合させず、祈りを理由に目を閉じたり表情を変更したりしない。';
 if(/頬|顎|口元|顔の前|手.*顔|顔.*手|耳|つば|机に片肘/.test(action))return '選択動作に明示された手と頬・顎・口元・耳際・つばの接触だけを実行する。掌か指の付け根で支える面と、軽く添える指先を区別し、手・顔・髪・小物の境界と遮蔽の順を保つ。顔の輪郭や表情を指の都合で変えない。';
 if(/両手でハート/.test(action))return '選択された左右の親指と人差し指の接点を一組に定め、中央に一つのハート形の空間を残す。二つの掌と残りの指を区別し、顔の前の枠や片手の指ハートへ変更しない。';
 return '動作に明示された手の役割・握る物・接触先だけを保ち、肩から肘・手首・掌・各指への連続と前後の遮蔽を分ける。指や腕を複製せず、明示のない頬杖・祈り・顔前の手・ハートなどの仕草を追加しない。';
}

export function poseAnatomyTechnical(value,context={}) {
 if(nonPerson(context))return {applicable:false,sections:[],checks:[]};
 const action=selectedMovement(value,context.variant);
 if(!action)return {applicable:false,sections:[],checks:[]};
 const mermaid=context.values?.costume==='人魚';
 const bodyFit=('人物の主参照または今回確定した主役と明示指定の年齢感・性別表現・体格の特徴を保つ。胸郭・骨盤・四肢の厚みと長さの関係を選択画風の頭身へ翻訳し、その体格へ選択動作を合わせる。男性参照の肩幅や骨盤の比率も保持し、女性の細い腰・狭い肩・脚寄せへ固定しない。女性や中性的な参照へ男性的な筋肉や骨格を追加することもなく、成人を幼い体格へ変えない。デフォルメ頭身は参照か作風の明示がある場合だけ、その頭身のまま支持を成立させる。').replace('胸郭・骨盤・四肢',mermaid?'胸郭・骨盤・腕・魚尾':'胸郭・骨盤・四肢');
 return {applicable:true,action,sections:[
  section('元の体格に合う動作',bodyFit),
  section('体格に合わせた支持',supportFor(action,mermaid)),
  section('選択動作の接触と重なり',contactFor(action)),
  section('投影と演技の独立',('表情・顔角度・カメラの選択を保ち、その投影で見える身体の厚み・自然な短縮・遮蔽を描く。隠れた手足を全部見せるために身体配置やカメラを変えない。身体資料の顔・衣装・性別・構図・番号をコピーせず、両立しない明示条件は衝突として扱う。').replace('隠れた手足',mermaid?'隠れた腕・魚尾':'隠れた手足'))
 ],checks:['元の年齢感・性別表現・体格の特徴と選択画風の頭身を保持','選択動作に一致した支持と荷重',mermaid?'選択した接触だけと自然な腕・魚尾の連続':'選択した接触だけと自然な手足の連続','表情・顔角度・カメラを保持']};
}

export function poseAnatomyContent(value,context={}) {
 const result=poseAnatomyTechnical(value,context);
 return result.applicable?(['scenery','mark-object'].includes(context.values?.sourceKind)?'設計済み独自の主役の年齢感・性別表現・体格と、選択画風の頭身へ選択動作を合わせる。身体資料から女性型を借りず、元の景色・図案を顔や体格の参照にしない。':'元の年齢感・性別表現・体格の特徴と、選択画風の頭身に合う支持と接触でこの動作を実行する。表情・顔角度・カメラを保ち、選択していない手顔の仕草を追加しない。'):'';
}
