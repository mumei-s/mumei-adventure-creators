import {isPhotographicMedium} from './photo-design.js?v=28.4.0';

// This is an input reading choice, independent of the ten output selections.
// Unknown and older saved work deliberately retain their original instructions.
export const sourceKinds=Object.freeze([
 {value:'photo-person',label:'実写の人物',hint:'顔立ちや髪などの識別特徴を読み取り、選んだ作風で描き直します。',defaultSubject:'参照画像の衣装を生かす'},
 {value:'illustration-person',label:'イラストの人物',hint:'キャラクターの特徴と年齢感を保ち、選んだ作風へ変換します。',defaultSubject:'参照画像の衣装を生かす'},
 {value:'scenery',label:'景色',hint:'地形・建物・物体・空間の関係を主役にします。',defaultSubject:'風景を主役にする'},
 {value:'mark-object',label:'マーク・物体',hint:'固有の輪郭・色・紋様・材質を作品の主題にします。',defaultSubject:'モチーフだけで構成する'}
]);
export function isNonHumanSource(values){return ['scenery','mark-object'].includes(values?.sourceKind);}

// A new unclassified input still means the creator's attached character.
// Hidden mode fields may be AUTO, so retain an explicitly chosen non-person
// subject before falling back to the input kind's usual subject.
export function sourceSubjectFor(sourceKind='unknown',costume='おまかせ',{selectedCostume}={}){
 if(costume&&costume!=='おまかせ')return costume;
 if(/風景を主役|モチーフだけ|紋章・アイコン/.test(selectedCostume||''))return selectedCostume;
 return sourceKinds.find(kind=>kind.value===sourceKind)?.defaultSubject||'参照画像の衣装を生かす';
}

export function sourceKindInstructions(values={}, {noPerson}={}){
 const kind=sourceKinds.find(source=>source.value===values?.sourceKind);
 if(!kind)return [];
 const withoutPerson=noPerson??/風景を主役|モチーフだけ|紋章・アイコン/.test(values.costume||'');
 const personInput=['photo-person','illustration-person'].includes(kind.value);
 const instructions=[
  '【入力画像の種類と読み方】',
  '入力は「'+kind.label+'」。これは作成者の主参照を読む区分であり、完成画像の作風を指定しない。出力の描線・陰影・画材・光学は選択した「'+values.medium+'」を使い、入力の媒体と出力の媒体を独立して扱う。専用画風原画はこの主参照区分へ含めず、人物や主題の識別基準にしない。'
 ];
 if(personInput){
  if(withoutPerson)instructions.push('人物なしの実際の選択を優先する。主参照にいる人物の顔・髪・身体・衣装は作品へ入れず、選択で参照を求めた景物・物体・色だけを使う。入力が人物画像という理由で人物や人型を追加しない。');
  else if(kind.value==='photo-person')instructions.push('実写の人物から顔立ち・目鼻口の特徴的な組合せ・髪型・固有の印・年齢感・性別表現・基礎体格を読み取り、同じ人物と識別できる主役として選択作風へ描き直す。写真の皮膚質感・連続階調・撮影照明・細かな寸法を固定せず、アニメや絵画ではその作風の線・形・色面・画材へ翻訳する。入力が実写でも実写出力に固定しない。');
  else instructions.push('イラストの人物から識別特徴・髪型・固有の印・元の年齢感・性別表現・基礎体格と基本頭身を読み取り、同じキャラクターとして選択作風へ翻訳する。未選択の幼児化・ちび化・別人化をしない。作風が明示した形の整理・誇張・省略は実行し、入力の描線・セル影・表面質感をそのまま残さない。'+(isPhotographicMedium(values.medium)?'実写出力では元の特徴と年齢感を保ち、誇張された目や記号的な鼻口を自然な頭蓋・眼球・人体と実物の材質へ再構成する。':'入力がイラストでもアニメ出力に固定せず、選択した画材の工程で描き起こす。'));
  if(!withoutPerson)instructions.push('今回の視点から見える眉・顎・鼻・首の形と、元々ある髭の位置・量も人物の識別特徴として保つ。2Dの作風ではその特徴を選択した線と色面へ翻訳して残す。女性の画風見本を理由に若い女性の顔へ固定せず、元の年齢感・性別表現・体格を維持する。主参照にない髭を追加せず、被覆や遮蔽された特徴を見せるために露出を増やさない。');
 }else{
  instructions.push(kind.value==='scenery'?'景色から地形・建築・植生・物体・支持面・空間の関係を読み取り、選択した主題に関係する形と配置を主参照にする。写っている通行人の顔や身体、看板の文字、無関係な動物・持ち物を主役として自動採用しない。':'マーク・物体から固有の輪郭・識別色・紋様・外形・材質を読み取り、選択した主題の基準にする。背景の文章・ロゴ・看板・透かしを参照から持ち込まない。マーク内の文字も自動の印字許可とせず、文字の選択で許可された原稿だけを使う。');
  instructions.push(withoutPerson?'人物なしの実際の選択を保ち、主参照の景色・物体・図案を選択作風で描く。人物・顔・手足・人型を新しく追加せず、主題を擬人化しない。':'この主参照には同じ人物を識別する基準がない。人物を描く衣装・主役の選択が明示されている場合だけ、入力の固有形・色・紋様・構造を衣装や小道具へ翻案した独自の主役を作る。非人物画像から顔を復元した、同じ人物を保ったとは主張しない。修正では既に生成した独自の主役の識別特徴を保ち、元の非人物画像を別の顔の基準にしない。');
 }
 instructions.push('衣装・主役、表情、ポーズ、カメラ、構図、背景、配色、文字の可否は今回の実際の選択に従う。入力の背景・衣服・ポーズ・文章を自動継承せず、入力区分だけで未選択の人物・小物・文字を追加しない。識別色と明示された限定配色が衝突する場合は、固有の形と許可色の明度差で識別を保つ。');
 return instructions;
}
