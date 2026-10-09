// These original, transparent completed artworks are production inputs.
// General picker thumbnails and the nine scene examples remain UI-only.
const masters=[
 {medium:'宝石光彩アニメ',file:'assets/drawing-jewel-anime-v28.png',name:'drawing-jewel-anime.png',role:'drawing',label:'宝石光彩アニメの画風原画'},
 {medium:'宝石光彩リアル',file:'assets/drawing-jewel-real-v28.png',name:'drawing-jewel-real.png',role:'drawing',label:'宝石光彩リアルの画風原画'}
];
const loaded=new Map();
export function drawingReferenceFor(medium){const master=masters.find(ref=>ref.medium===medium);return master?{...master}:null;}
export function drawingReferenceInstructions(medium,{noPerson=false,values={}}={}){
 const ref=drawingReferenceFor(medium);if(!ref)return [];
 const nonHumanSource=['scenery','mark-object'].includes(values.sourceKind);
 const hairRule=nonHumanSource?'設計済み主役が髪なしなら修正で髪を足さない。':'髪がない主参照へ髪を足さない。';
 return [
  '【専用の画風原画：人物の主参照とは別】',
  ref.name+' は背景透過の完成基画。実画像を見て、原画で見える透明な光層の厚み・深暗部の面積比・最明部との輝度差・素材ごとの鋭い反射密度を保つ。'+(noPerson?'原画の人体を完全に除外し、選択した景物・物体へこの光と描画を移す。':'画像編集の土台にして、人物と今回の選択項目を差し替える。')+'名称や説明文だけで原画を見たと扱わない。添付がない場合は原画未確認と短く伝え、今回の作画仕様で生成する。',
  noPerson?'原画の人物・顔・髪・手足・衣装・ポーズは一切採用せず、選択した風景や物体の材質へ描線・光彩・陰影の描き方だけを移す。人物や人型を追加しない。':nonHumanSource?'入力の景色・図案には人物の識別基準がない。明示された人物制作のために固有形・色・構造を翻案した独自の主役へ、瞳の透明な光層・肌の局所光彩・深い影を移す。顔・髪・目の色・年齢感・性別表現・体格は画風原画の人物から借りず、今回の明示条件で設計する。修正では生成済み主役を保持する。':'人物の顔立ち・髪型・瞳の識別色・年齢感・性別表現・体格は作成者の主参照を使う。原画の人物へ入れ替えず、原画の髪・顔・目の色・衣装・装身具・ポーズ・構図を複写しない。瞳の透明な光層と鋭い反射、肌の局所光彩と深い影の描き方を同じキャラクターへ移す。',
  noPerson?'景物・物体・カメラ・背景・配色は今回の選択で描き直す。原画の人物を貼らず、景物・物体・背景を一つの光で描く。':'衣装・表情・ポーズ・カメラ・背景・配色は今回の選択で描き直す。原画の人物自体は保存せず、'+(nonHumanSource?'入力の固有形を翻案した独自の主役':'主参照の同じキャラクター')+'へ差し替える。人物・衣装・背景を一つの光で描く。',
  '配色変更は光層の色相を選択色へ翻訳し、明暗差と反射密度を保つ。光の位置は新しい形・材質・遮蔽と舞台へ描き直す。街角や昼の自然光でも、舞台は光の方向と落ち影を決め、基画の光彩を普通の薄い艶へ弱めない。場面仕様の「弱い反射」「自然光」は光彩の密度や陰影を減らす指示にはしない。',
  noPerson?'光彩は選択した景物や物体の見えている面へ材質別に移す。人物原画の人体・衣装の描写は非適用。画角と遮蔽物を保ち、光彩を見せるために未選択の物や隠れた面を追加しない。':'光彩は見えている肌の全範囲（顔・耳・首・肩・腕・手・指・脚・足）と、見えている髪・衣装・背景の材質へ適用する。衣装の被覆・画角・遮蔽物を保ち、光彩を見せるために露出を増やしたり隠れた身体を描き足したりしない。',
  noPerson?(medium==='宝石光彩アニメ'?'景物・物体を2Dアニメの描線と色面、透明な重ね色で描く。人物原画の顔・身体の描写は非適用。':'景物・物体を実物の立体と物理的な材質、屈折・反射光で構築する。人物原画の顔・身体の描写は非適用。'):medium==='宝石光彩アニメ'?'2Dアニメの描線・整理した顔の色面を採用し、実際に開いて見える目だけに虹彩の透明層を描く。閉眼は開かず、'+hairRule+''+(nonHumanSource?'元の景色・図案から人物の顔・髪・身体を復元せず、独自の主役を描き起こす。':'主参照の写真の皮膚質感や各部の細寸法を下地に残さず、同じ人物と分かる特徴の組合せを描き起こす。'):'実写の自然な立体と物理的な質感・屈折光を採用する。目の反射は実際に開いて見える目だけに描く。閉眼は開かず、'+hairRule+'アニメ原画や巨大な瞳を混ぜない。'
 ];
}
export async function loadDrawingReferences(references,{fetchImpl=globalThis.fetch,FileClass=globalThis.File}={}){
 return Promise.all(references.map(async reference=>{
  const master=masters.find(ref=>ref.file===reference.file&&ref.name===reference.name&&ref.medium===reference.medium);
  if(!master)throw new Error('画風原画の指定を確認できませんでした。');
  if(!loaded.has(master.file)){
   const pending=(async()=>{
    const response=await fetchImpl(new URL(master.file,import.meta.url));
    if(!response.ok)throw new Error('画風原画を読み込めませんでした。再読み込みして制作してください。');
    const blob=await response.blob();
    if(!blob.size||blob.type.split(';')[0]!=='image/png')throw new Error('画風原画の画像を確認できませんでした。');
    return new FileClass([blob],master.name,{type:'image/png'});
   })();
   loaded.set(master.file,pending);pending.catch(()=>loaded.delete(master.file));
  }
  return {...master,file:await loaded.get(master.file)};
 }));
}
export function deliveryImageFiles(result,{FileClass=globalThis.File}={}){
 return [
  ...(result.localRefs||[]).map((ref,i)=>new FileClass([ref.file],result.references[i].name,{type:ref.file.type})),
  ...(result.localDrawingRefs||[]).map(ref=>ref.file),
  ...(result.localSelectionReference?.file?[result.localSelectionReference.file]:[])
 ];
}
