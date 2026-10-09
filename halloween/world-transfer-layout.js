// Compose an inspected scene into its selected page. This stage never repeats
// identity transfer or scene production, and never receives their source images.
import {formatFor} from './formats.js?v=28.4.6';
import {detailedFormat,limitedNewspaperLayout} from './format-recipes.js?v=28.4.6';
import {designLayoutFor,typographyLayoutFor} from './layout-preview-specs.js?v=28.4.6';
import {publicCopyContext,copyEditingInstruction} from './copy-scope.js?v=28.4.6';
import {colorPolicy} from './color-policy.js?v=28.4.6';

const imageKinds=new Set(['graphic','art','keyvisual','landscape','cinemastill','illustration']);
const directions={horizontal:'横書き',vertical:'縦書き・右から左',diagonal:'紙面内の斜め書き'};
const entries=refs=>Array.isArray(refs)?refs:refs?.references||refs?.refs||(refs?.role==='selection-sheet'?[refs]:[]);
const unique=items=>[...new Set(items.filter(Boolean))];
const layoutKey=key=>key==='design'||key==='type';
const nameOf=ref=>ref.name||ref.file||'選択版面見本';

function stopped(reasons){
 return {kind:'layout',blocked:true,references:[],prompt:['【選択の不成立：画像生成を停止】',...unique(reasons),'選択を変えるまで誌面生成へ進まない。確認済み場面を完成誌面として報告しない。'].join('\n')};
}

function layoutReferences(refs,values){
 const supplied=entries(refs),sheets=supplied.filter(ref=>ref?.role==='selection-sheet');
 const individual=supplied.filter(ref=>ref?.role==='selection-condition'&&layoutKey(ref.key));
 const mismatches=individual.filter(ref=>ref.value&&ref.value!==values[ref.key]).map(ref=>'版面見本「'+nameOf(ref)+'」の'+ref.key+'が今回の選択と一致しない。');
 for(const sheet of sheets)for(const item of sheet.conditions||sheet.items||[]){
  if(layoutKey(item.key)&&item.value&&item.value!==values[item.key])mismatches.push('選択シートの'+item.key+'が今回の選択と一致しない。');
 }
 if(mismatches.length)return {errors:mismatches,references:[]};
 // A consolidated sheet is one actual image, even though only two cells are
 // read. Never add its individual duplicates or any identity/style material.
 if(sheets.length){
  const sheet=sheets[0],items=(sheet.items||sheet.conditions||[]).filter(item=>layoutKey(item.key));
  return {references:[{...sheet,items,usedKeys:['design','type'],scope:'選択デザインと文字配置のセルだけ。その他のセルは使用しない。'}]};
 }
 const references=[];
 for(const key of ['design','type']){
  const reference=individual.find(ref=>ref.key===key);
  if(reference)references.push({...reference,scope:key==='design'?'画像矩形・情報領域・列・枠・外周余白だけ。':'許可原稿の数量・役割・縦横斜めの方向と配置だけ。'});
 }
 return {references};
}

function frameLine(frame,index){
 return '情報領域'+(index+1)+'：x'+frame.x+'%・y'+frame.y+'%・幅'+frame.w+'%・高さ'+frame.h+'%、'+(directions[frame.direction]||frame.direction||'横書き')+(frame.direction==='diagonal'?'（文字だけ約'+Math.abs(frame.rotation??-12)+'度、画像とカメラは回転しない）':'')+'。枠の役割名は印字しない。';
}

function manuscriptLines(plan,type,design){
 const copy=plan.copy,fixed=copy.slots||[],generated=copy.generatedSlots||[];
 if(copy.mode==='none'||!fixed.length&&!generated.length)return ['文字・数字・ロゴ・サイン・署名・疑似文字・本文風の反復線を一切入れない。情報領域は選択版面に従った無地の余白にし、未使用の役割名や空欄ラベルを描かない。'];
 const context=publicCopyContext({...plan.values,collection:plan.collection},{noPerson:plan.noPerson});
 const automatic=plan.values.type==='デザインに合わせて自動編集';
 return [
  '許可原稿は確定文字列'+fixed.length+'群と、以下の許可編集役割'+generated.length+'群だけ。各原稿は各一度、役割と階層を保つ。未許可の誌名・見出し・記事・本文・キャプション・日付・号数・価格・ノンブルを形式から補完しない。',
  ...(type&&!automatic?['文字「'+plan.values.type+'」の原稿量：'+type.quantity+'。書字方向：'+type.direction+'。配置：'+type.placement+'位置は選択デザインの情報領域へ適応し、主図版・外周・列・綴じ余白は変えない。',...unique((type.frames||[]).map(frame=>'文字見本の役割「'+frame.role+'」＝'+(directions[frame.direction]||frame.direction||'横書き')+'／'+frame.size+(frame.direction==='diagonal'?'・文字だけ約'+Math.abs(frame.rotation??-12)+'度':'')))]:[]),
  ...(automatic?['自動文字の数量は下記の許可役割の個数だけ。書字方向は選択版面の各情報領域へ従う。'+unique((design?.frames||[]).map(frame=>frame.role+'の予約領域＝'+(directions[frame.direction]||frame.direction||'横書き'))).join('／')+'。予約領域は追加原稿を許可しない。']:[]),
  ...(copy.typographyLayout?['選択文字の読み順：'+copy.typographyLayout]:[]),
  ...fixed.map(slot=>'確定原稿／'+slot.role+'／階層'+(slot.priority??2)+'：'+JSON.stringify(slot.text)),
  ...(generated.length?[
   '画像生成前に、次の許可役割だけの完成文字列を先に確定する。内容は選択した作品世界内の出来事・主題・場所・目的から編集する。役割名・編集指示・字数・管理番号は印字しない。',
   copyEditingInstruction(context),
   ...generated.map(slot=>'許可編集／'+slot.role+'／'+slot.maxCharacters+'字以内／階層'+(slot.priority??2)),
   ...(generated.some(slot=>/^(質問|回答)/.test(slot.role))?['同じ番号の質問と回答を一組にして同じ列へ置く。作品世界内の創作原稿とし、作者本人の実際の発言・取材記事を捏造しない。']:[])
  ]:[]),
  '確定原稿は文字列を変えず、許可編集は確定後の文字列だけを正確に印字する。日本語の禁則・句読点・列の読み順を守る。原稿を省略・反復・疑似文字へ置換して量を合わせず、顔・目・手・主題の核心へ重ねない。'
 ];
}

export function worldTransferLayoutStage(plan,{sceneName='確認済みの選択場面',refs=[]}={}){
 if(!plan?.values||!plan.copy||!Array.isArray(plan.conditions))throw new TypeError('誌面工程に必要な確定制作計画がありません。');
 const errors=(plan.issues||[]).filter(issue=>issue.severity==='error');
 if(errors.length)return stopped(errors.map(issue=>issue.reason));
 const v=plan.values,format=formatFor(v.design),copy=plan.copy;
 const noCopy=copy.mode==='none'||!(copy.slots||[]).length&&!(copy.generatedSlots||[]).length;
 if(imageKinds.has(format.kind)&&noCopy)return null;
 if(typeof sceneName!=='string'||!sceneName.trim())throw new TypeError('確認済み場面の画像名がありません。');
 const chosen=layoutReferences(refs,v);
 if(chosen.errors)return stopped(chosen.errors);
 const scene={role:'scene-result',name:sceneName,generated:true,source:'previous-confirmed-image',scope:'確認済みの人物・主題・場面の可視矩形全体。描き直さず主図版1点として配置する。'};
 const references=[scene,...chosen.references],design=designLayoutFor(v.design),type=typographyLayoutFor(v.type),palette=colorPolicy(v);
 const layoutValues=noCopy?{...v,type:'文字を一切入れない'}:v;
 const recipe=detailedFormat(v.design,{values:layoutValues,noPerson:plan.noPerson});
 const sparse=format.kind==='newspaper'?limitedNewspaperLayout(layoutValues):null;
 const box=sparse?[sparse.imageBox.x*100,sparse.imageBox.y*100,sparse.imageBox.width*100,sparse.imageBox.height*100]:design?.image;
 const geometry=(recipe.sections||[]).filter(section=>['作品の骨格','領域とグリッド','文字と読み順','限定原稿の配置','文字なしの構成','避ける失敗'].includes(section.label));
 const prompt=[
  '【確認済み場面から選択版面を完成】',
  '画像作成機能で「'+sceneName+'」を編集の土台にし、選択デザイン「'+v.design+'」と文字「'+v.type+'」の平らな完成画像1枚へ構成する。SVG・HTML・コード・文字だけの説明や実物の雑誌を撮ったモックアップで代用しない。',
  '添付は確認済み場面1点'+(chosen.references.length?'と次の版面資料だけ：'+chosen.references.map(nameOf).join('／'):'だけ。版面資料がないため下記の確定数値・文章で構成する')+'。元の本人写真・元イラスト・初回の画風原画を再添付しない。',
  ...chosen.references.map(ref=>nameOf(ref)+'：'+ref.scope+(ref.role==='selection-sheet'?'読むのは'+(ref.items||[]).map(item=>(item.selectionIndex||'')+' '+item.key+'「'+item.value+'」').join('／')+'のセルだけ。その他のセルやシート全体の複数パネルを作品へ移さない。':'')),
  '全選択を保持：'+plan.conditions.map(condition=>condition.name+'＝'+condition.value).join('／'),
  '確認済み場面の人物識別または人物なしの主題、衣装、顔向き・表情、ポーズ・支持、カメラ投影・画角、背景の出来事、季節、配色、選択作風「'+v.medium+'」と全可視域の光彩は検査済みの画面内条件として保持する。この工程で再描画・再投影・着替え・新しい顔や場面への交換を指示しない。人物なしなら顔・人体・人型も追加しない。',
  '主図版はこの場面1点だけ。その可視矩形全体を縦横比を保った同一縮尺で画像領域へ収め、余る領域は選択配色の地色にする。幅や高さを埋めるためのトリミング、引き伸ばし、関節や背景の切断、別視点の描き直しをしない。主図版の顔アップ・部分図・複製・副写真を追加せず、図版の光や背景を情報欄へはみ出させない。',
  '版面の骨格：'+(design?.signature||format.layout),
  ...(box?['主図版の領域は完成画像全体の左上を原点とし、x'+box[0]+'%・y'+box[1]+'%・幅'+box[2]+'%・高さ'+box[3]+'%。この領域は画像を切る枠ではなく、確認済み矩形全体を収める領域。']:[]),
  ...geometry.map(section=>section.label+'：'+section.text),
  ...(sparse?[sparse.priority,sparse.grid]:[]),
  ...(format.kind==='newspaper'?['新聞の主図版は1点だけ。右列・下段・副記事の領域は許可原稿または余白にし、小風景図・下段3図・複製肖像を追加しない。']:[]),
  ...(design?.frames?.length?['次の予約情報領域は原稿の配置だけを示す。使用原稿の役割・数・方向は下の文字設定が優先し、未使用枠は無地にする。',...design.frames.map(frameLine)]:[]),
  '紙地・罫線・文字・装飾枠も選択配色「'+palette.allowed+'」内で明度差を作る。最明部は'+palette.bright+'、最暗部は'+palette.dark+'。新聞だから古紙や白黒、雑誌だから実写へ変えず、主図版の材質と光の密度を保つ。',
  '【許可原稿と文字配置】',...manuscriptLines(plan,type,design),
  '版面の文字方向と画像内カメラを区別する。縦書き・横書き・斜め書きは許可文字列の配置だけを変え、カメラや主図版の投影を回転・変形しない。',
  '要求サイズ「'+v.size+'」の比率と外周安全余白を保つ。実生成画像で主図版1点の矩形全体・識別・ポーズ・カメラ・作風の維持、選択版面の領域・列・綴じ余白、許可原稿の全数・正確な文字列・方向を照合する。未達ならその出力画像の不足箇所だけを編集し、満たした部分を保持する。完成画像1枚を通常表示し、実際の寸法不足や未確認・未達は短く伝える。'
 ].filter(Boolean).join('\n');
 return {kind:'layout',prompt,references,sceneName,requiresInspection:true,copyAuthority:noCopy?'none':copy.authority,layout:{design:v.design,type:v.type,imageBox:box?[...box]:null,informationFrames:(design?.frames||[]).map(frame=>({...frame})),manuscriptCount:noCopy?0:(copy.slots||[]).length+(copy.generatedSlots||[]).length},checks:['確認済み矩形全体を保った主図版1点','人物・主題・ポーズ・カメラ・作風・季節の保持','選択版面の固有配置と安全余白',noCopy?'文字・数字・署名・疑似文字なし':'許可原稿の役割・全数・方向・正確な印字']};
}
