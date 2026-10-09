// Image count is a delivery choice, not an image-quality guarantee. The same
// exact selections and original style master belong to both comparison routes.
export const ATTACHMENT_POLICY_VERSION=3;
export const flatFocusedReferenceMedia=Object.freeze(['発光幻想アニメ','薄膜光彩アニメ','白域幾何・宇宙彩アニメ','艶彩幻想アニメ']);
export const volumetricReferenceMedia=Object.freeze(['立体光彩アニメ','立体光彩リアル']);
export const focusedReferenceMedia=Object.freeze([...flatFocusedReferenceMedia,...volumetricReferenceMedia]);
const scopes=Object.freeze({
 medium:'描線・形の整理・塗り・光・材質のみ。人物や背景は借りない',
 theme:'出来事と場所の構造のみ。別人の顔や画風は借りない',
 costume:'選択衣装の形・重なり・留め具・被覆のみ',
 pose:'関節・重心・支持点のみ。人物・衣服・カメラは借りない',
 mood:'選択表情と顔の向きのみ。別人の顔立ちは借りない',
 angle:'カメラ位置と投影のみ。数値と今回の姿勢を優先する',
 palette:'選択色と大きな面積配分のみ',
 design:'画像枠・文字枠・余白・罫線のみ。見本文字は印字しない',
 type:'許可原稿の役割・量・指定文字方向のみ。位置と大きさは選択デザインの文字領域へ合わせる。見本文字は印字しない',
 size:'今回の縦横比と安全余白のみ。描画内容は借りない'
});
export function isNonPersonSelection(values={}){return /風景を主役|モチーフだけ|紋章・アイコン/.test(values.costume||'');}
export function attachmentConditionPolicy(key,values={}, {comparison=false}={}){
 const applicable=!(isNonPersonSelection(values)&&['pose','mood'].includes(key));
 const omitted=!applicable?'non-person':key==='medium'?'separate-style-original':key==='size'?'exact-dimensions-in-text':key==='type'&&values.type==='文字を一切入れない'?'no-manuscript':key==='type'&&values.type==='デザインに合わせて自動編集'?'layout-manuscript-inherited':key==='costume'&&values.costume==='参照画像の衣装を生かす'?'use-identity-clothing':key==='palette'&&values.palette==='参照画像の色を生かす'?'use-identity-colors':null;
 return {applicable,deliverVisual:!omitted,omittedReason:omitted,scope:applicable?(scopes[key]||'この項目の選択条件だけ'):'人物なしではこの項目を適用しない。見本の顔・人体・手足・人型や動作を作品へ追加しない',visualRole:!applicable?'inactive-condition':key==='medium'?'original-style':key==='type'||key==='size'?'condition-diagram':'scoped-example'};
}
export function selectionAttachmentPolicy(conditions=[],{mode='sheet'}={}){
 const values=Object.fromEntries(conditions.map(condition=>[condition.key,condition.value]));conditions=conditions.map(condition=>({...condition,...attachmentConditionPolicy(condition.key,values,{comparison:mode==='individual'})}));
 const individual=mode==='individual',visuals=conditions.filter(condition=>condition.key!=='medium'&&condition.deliverVisual!==false);
 return {schemaVersion:ATTACHMENT_POLICY_VERSION,mode:individual?'individual-comparison':'scoped-sheet',
  selectedCount:conditions.length,conditionVisualCount:visuals.length,styleOriginal:'separate-original',duplicateMedium:false,
  inactiveKeys:conditions.filter(condition=>condition.applicable===false).map(condition=>condition.key),omittedKeys:conditions.filter(condition=>condition.deliverVisual===false).map(condition=>({key:condition.key,reason:condition.omittedReason})),
  qualityStatus:'requires-generated-image-comparison',
  decision:individual?'全有効見本を個別画像として渡す選択肢。人物・原寸画風・各条件の担当を分け、同じ選択で比較する。立体光彩は会話側で段階ごとに必要な参照だけを渡し、原画の世界観の人物差替、選択場面、必要な文字・版面を順に確認する。今回の検証に使った image_gen は参照5枚が上限だった。利用先の上限を確認し、超える場合は通常の役割別シートへまとめる。個別画像を全部添付できたことや枚数だけで精度が高いと判定しない。':'主参照1枚＋原寸画風1枚＋役割別の選択見本シート1枚を基本に、全選択を本文と資料へ保持する。立体光彩は会話側で原画の世界観の人物差替、選択場面、必要な文字・版面を順に生成・確認する。それ以外の通常制作は1回の生成から開始し、不足箇所だけ修正する。画風の重複・別人の顔・見本の文字を作品へ混ぜない。人物参照なしや複数参照などの場合は実際の添付数を表示する。任意の人物変換は対応する画風で必要な場合だけ選ぶ。',
  precedence:['identity-reference:識別特徴','selected-style-original:描線・塗り・材質・光','selected-pose-and-camera:身体配置・支持・投影','selected-design:画像と文字の領域','selected-type-and-copy:許可原稿・文字量・指定方向'],
  comparison:'同じ主参照・作風原画・確定選択・原稿で比較し、人物同一性、画風、ポーズ、カメラ、版面、文字、季節を生成画像で評価する。未検証の方式を最高精度・完全再現と表示しない。'};
}
export const referenceOwnershipRule='人物の識別は主参照、描線・塗り・材質・光は選択作風の原寸見本、姿勢と投影は確定ポーズと数値カメラ、画像・文字の領域はデザイン、印字できる原稿・量・指定方向は文字選択が担当する。別項目の見本の人物・衣装・画風・小道具を借用せず、見本の配置は確定カメラや支持を変更しない。';
