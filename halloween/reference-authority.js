// Identity is independent of attachment order, sample style and generated drafts.
const entries=refs=>Array.isArray(refs)?refs:refs?.references||refs?.refs||[];
export function requiresPrimaryReference(values={}){
 const noPerson=/風景を主役|モチーフだけ|紋章・アイコン/.test(values.costume||'');
 return ['photo-person','illustration-person','scenery','mark-object'].includes(values.sourceKind)||!noPerson||values.place==='参照風景を舞台にする'||values.palette==='参照画像の色を生かす';
}
export function referenceAuthorityInstructions(values={},refs=[]){
 const primary=entries(refs).filter(ref=>ref.role==='identity'),noPerson=/風景を主役|モチーフだけ|紋章・アイコン/.test(values.costume||''),nonHuman=['scenery','mark-object'].includes(values.sourceKind);
 return [
  '【画像の役割を先に確定：添付順では決めない】',
  (requiresPrimaryReference(values)||primary.length?'主参照'+(primary.length?'「'+primary.map(ref=>ref.name||ref.file).join('・')+'」':'（利用者が添付する元画像）')+'だけを'+(noPerson||nonHuman?'指定主題の固有形・構造・識別の基準':'人物・キャラクターの顔立ち、髪型、年齢感・性別表現・体格・識別の唯一の基準')+'にする。':'人物なしの選択では、選択された風景・物体の条件を主題の基準にする。')+'画風見本・選択見本シート・補助・似せない前作は主参照へ昇格させず、先頭の画像や最後に添付された画像を自動で主参照にしない。',
  requiresPrimaryReference(values)?'生成前に主参照の実画像を確認する。「ChatGPTへ直接添付する主参照」は未添付の可能性がある案内名で、画像そのものではない。見本だけ届いた場合や主参照を確認できない場合は生成せず、その元画像の添付を求める。似た人物を想像したり見本人物で代用しない。':'この選択では元画像なしで指定の風景・物体を作れる。見本から人物・顔・人体・人型を追加しない。',
  'creator-references.jpgのように元画像を1枚へまとめた場合も、各セルの主参照・補助参照・似せない前作のラベルを読む。主参照セルだけを識別に使い、補助や前作の人物を混ぜない。資料の枠・番号・ラベルを作品に描かない。',
  '複数の元画像で主役が判別できない場合は対象を確認し、別人同士を混ぜたり見本人物を選ばない。画風は線・塗り・材質・光だけへ適用し、見本の顔・髪・年齢・性別・体格・衣装・背景・小道具・文字を移さない。'
 ];
}
export function identityRepairInstructions(values={}){
 const person=!/風景を主役|モチーフだけ|紋章・アイコン/.test(values.costume||'')&&!['scenery','mark-object'].includes(values.sourceKind);
 return person?'本人が違う場合は画風だけの修正とは別扱いにする。誤った生成顔を保持対象にせず、修正対象と元の主参照の実画像を画像作成機能へ渡し、主参照の同じ人物へ直す。見本は描法だけ。元画像が確認できなければ添付を求め、本人修正を推測で実行しない。本人が合っていると確認できた場合だけ、元画像を再入力しない画風のみの修正を使う。':'人物なし・非人物入力の指定を保ち、修正のために見本人物を追加しない。';
}
export function deliveryReferenceNotice(result){
 const values=result?.values||result?.production?.values;
 if(!values)return '';
 if(!requiresPrimaryReference(values))return '人物なしの選択を守り、見本は描法や担当条件だけに使ってください。';
 if(requiresPrimaryReference(values)&&!result.localRefs?.some(ref=>ref.role==='identity'&&ref.file))return 'ご自身の主参照はこの共有に含まれません。同じメッセージへ元画像を追加してください。見本だけなら生成せず、主参照を求めてください。';
 return '顔・主役はご自身の主参照だけ、見本は描法や担当条件だけに使い、見本人物へ置き換えないでください。';
}
