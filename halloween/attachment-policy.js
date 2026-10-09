// Image count is a delivery choice, not an image-quality guarantee. The same
// exact selections and original style master belong to both comparison routes.
export const ATTACHMENT_POLICY_VERSION=2;
export const focusedReferenceMedia=Object.freeze(['発光幻想アニメ','薄膜光彩アニメ','白域幾何・宇宙彩アニメ','艶彩幻想アニメ']);
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
 const omitted=!applicable?'non-person':key==='medium'?'separate-style-original':!comparison&&focusedReferenceMedia.includes(values.medium)?'focused-text-owner':key==='size'?'exact-dimensions-in-text':key==='type'&&values.type==='文字を一切入れない'?'no-manuscript':key==='type'&&values.type==='デザインに合わせて自動編集'?'layout-manuscript-inherited':key==='costume'&&values.costume==='参照画像の衣装を生かす'?'use-identity-clothing':key==='palette'&&values.palette==='参照画像の色を生かす'?'use-identity-colors':null;
 return {applicable,deliverVisual:!omitted,omittedReason:omitted,scope:applicable?(scopes[key]||'この項目の選択条件だけ'):'人物なしではこの項目を適用しない。見本の顔・人体・手足・人型や動作を作品へ追加しない',visualRole:!applicable?'inactive-condition':key==='medium'?'original-style':key==='type'||key==='size'?'condition-diagram':'scoped-example'};
}
export function selectionAttachmentPolicy(conditions=[],{mode='sheet'}={}){
 const values=Object.fromEntries(conditions.map(condition=>[condition.key,condition.value]));conditions=conditions.map(condition=>({...condition,...attachmentConditionPolicy(condition.key,values,{comparison:mode==='individual'})}));
 const individual=mode==='individual',visuals=conditions.filter(condition=>condition.key!=='medium'&&condition.deliverVisual!==false);
 const focused=!individual&&focusedReferenceMedia.includes(values.medium);
 return {schemaVersion:ATTACHMENT_POLICY_VERSION,mode:individual?'individual-comparison':focused?'focused-originals':'scoped-sheet',
  selectedCount:conditions.length,conditionVisualCount:visuals.length,styleOriginal:'separate-original',duplicateMedium:false,
  inactiveKeys:conditions.filter(condition=>condition.applicable===false).map(condition=>condition.key),omittedKeys:conditions.filter(condition=>condition.deliverVisual===false).map(condition=>({key:condition.key,reason:condition.omittedReason})),
  qualityStatus:focused?'not-accepted-in-image-tests':'requires-generated-image-comparison',
  decision:individual?'原寸の各項目を個別に渡す比較用資料。画像生成で実測した参照上限は5枚。上限を超える全画像一括は未実行・拒否として区別し、枚数だけで精度が高いと判定しない。':focused?'人物は元参照＋原寸画風で選択画風へ翻訳し、同じ人物と純粋な2D描法を実画像で照合する。不合格なら修正し、合格した人物参照＋原寸画風で最終制作する。元写真は最終へ再添付しない。全選択は短い制作本文で保持し、選択図は比較資料へ分ける。生成品質は合格前。':'主参照＋原寸画風＋役割別シートを通常経路にする。選択をすべて保持し、画風原画の縮小重複と別人の識別情報を避ける。',
  precedence:['identity-reference:識別特徴','selected-style-original:描線・塗り・材質・光','selected-pose-and-camera:身体配置・支持・投影','selected-design:画像と文字の領域','selected-type-and-copy:許可原稿・文字量・指定方向'],
  comparison:'同じ主参照・作風原画・確定選択・原稿で比較し、人物同一性、画風、ポーズ、カメラ、版面、文字、季節を生成画像で評価する。未検証の方式を最高精度・完全再現と表示しない。'};
}
export const referenceOwnershipRule='人物の識別は主参照、描線・塗り・材質・光は選択作風の原寸見本、姿勢と投影は確定ポーズと数値カメラ、画像・文字の領域はデザイン、印字できる原稿・量・指定方向は文字選択が担当する。別項目の見本の人物・衣装・画風・小道具を借用せず、見本の配置は確定カメラや支持を変更しない。';
