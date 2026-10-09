import {formatFor} from './formats.js?v=28.4.6';
import {detailedFormat,formatTextPolicy} from './format-recipes.js?v=28.4.6';
import {editorialContract} from './editorial.js?v=28.4.6';
import {colorPolicy} from './palette-recipes.js?v=28.4.6';
import {renderEditorialLayout} from './editorial-layout.js?v=28.4.6';

// This module consumes a completed productionPlan. It does not import the plan
// builder or composePrompt, and therefore can also be used by those modules.
const editorialKinds=new Set(['cover','interview','spread','newspaper']);
const layoutLabels=new Set(['作品の骨格','領域とグリッド','文字と読み順','文字なしの構成','限定原稿の配置']);
const noBody=/風景を主役|モチーフだけ|紋章・アイコン/;

function valuesFor(plan){
 const conditions=Array.isArray(plan?.conditions)?plan.conditions:[];
 const values=Object.fromEntries(conditions.filter(c=>typeof c?.key==='string'&&typeof c.value==='string').map(c=>[c.key,c.value]));
 Object.assign(values,plan?.values||{});
 if(typeof values.line!=='string')values.line=plan?.copy?.slots?.find(s=>s.role==='セリフ')?.text||'セリフなし';
 return values;
}

/** True only for populated editorial layouts that benefit from a separate image. */
export function needsStagedProduction(plan){
 if(!plan||!Array.isArray(plan.copy?.slots))return false;
 const values=valuesFor(plan),copy=plan.copy,policy=formatTextPolicy(values);
 if(copy.mode==='none'||!copy.slots.length||copy.limited||policy.noText||policy.limited)return false;
 if(!editorialKinds.has(formatFor(values.design).kind))return false;
 const hasBody=copy.slots.some(s=>/^(本文\d+|回答\d+|副記事本文\d+)$/.test(s.role));
 const secondaryArticles=copy.slots.filter(s=>/^(補助特集|補助見出し|副記事見出し\d+)$/.test(s.role)).length;
 return hasBody||secondaryArticles>=2;
}

function requestedSize(value){
 const [usage='',pixels='',ratio='']=String(value||'').split('｜');
 const match=pixels.match(/^(\d+)×(\d+)$/);
 return {usage,pixels,ratio,width:match?Number(match[1]):0,height:match?Number(match[2]):0};
}

function containInstructions(kind,size,artworkWidth,artworkHeight){
 const sourceWidth=Number(artworkWidth),sourceHeight=Number(artworkHeight);
 const knownSource=Number.isFinite(sourceWidth)&&Number.isFinite(sourceHeight)&&sourceWidth>0&&sourceHeight>0;
 const lines=[
  '主画像の背景も含めた元の矩形全体を、一つの分割しない図版として使う。主画像領域へ縦横比を保ったcontain配置を行う。画像の一部を切って枠を埋めるcover配置、ズーム、回転、左右反転、透視変形、背景の描き足しは行わない。',
  '配置先の幅と高さの両方へ収まる倍率を選び、縦横を同じ倍率で変える。余った面積は誌面の地色と余白にする。主画像の縁を文字・図形・別画像で隠したり、素材を複製した接写や小画像で空きを埋めたりしない。'
 ];
 if(kind==='spread'){
  lines.push('見開きでは元画像の矩形全体を完成図版のx7〜41%・y12〜87%の安全箱へ収める。人物だけを抜き出して大きく配置せず、背景を含む画像全体を縮める。ページ境界はx50%、中央x47〜53%は図版・文字・装飾を置かない実幅6%の地色の帯として先に確保する。');
  if(knownSource&&size.width>0&&size.height>0){
   const boxWidth=size.width*.34,boxHeight=size.height*.75,scale=Math.min(boxWidth/sourceWidth,boxHeight/sourceHeight);
   const width=Math.floor(sourceWidth*scale),height=Math.floor(sourceHeight*scale);
   const x=Math.round(size.width*.07+(boxWidth-width)/2),y=Math.round(size.height*.12+(boxHeight-height)/2);
   lines.push('元素材の実寸が'+sourceWidth+'×'+sourceHeight+'px、希望完成寸法が'+size.pixels+'pxの場合、contain配置の目安は幅'+width+'px・高さ'+height+'px、左上はx'+x+'px・y'+y+'px。これは希望寸法を基にした配置計算であり、実際の出力寸法が違う場合は同じ正規化された安全箱で再計算する。');
  }else{
   lines.push('素材の幅・高さを実画像から確認する。配置先の幅0.34×完成画像幅、高さ0.75×完成画像高を素材の幅・高さでそれぞれ割り、小さい倍率を使って安全箱の中央へ収める。原画像の外形を失っていないことを縮小前後で確認する。');
  }
 }else{
  lines.push('下記の個別形式で主画像に割り当てた領域の内側へ、元の矩形全体を収める。文字量が増えても主画像の左右端を削らず、文字の位置・字の大きさ・余白を調整する。');
  if(knownSource)lines.push('使用する素材の実寸は'+sourceWidth+'×'+sourceHeight+'px。配置先の幅÷素材幅と配置先の高さ÷素材高さのうち小さい倍率で、縦横比を変えずに配置する。');
 }
 return lines;
}

/**
 * Compose the layout-only second stage. The supplied image must be the inspected
 * stage-one result. Optional dimensions describe that real image, not its prompt.
 * The function remains usable for no-text and no-person plans even though those
 * plans do not request staged execution by default.
 */
export function composeLayoutStage(plan,{artworkName='第1段階で合格を確認した主画像',artworkWidth=null,artworkHeight=null}={}){
 const values=valuesFor(plan),copy=plan?.copy;
 if(!values.design||!values.size||!copy||!Array.isArray(copy.slots))throw new Error('誌面編集段階には、形式・サイズ・確定原稿を含む制作プランが必要です。');
 const noPerson=!!plan.noPerson||noBody.test(values.costume||''),kind=formatFor(values.design).kind;
 const blank=copy.mode==='none'||copy.slots.length===0;
 const effectiveValues={...values,type:blank?'文字を一切入れない':values.type};
 const textPolicy=formatTextPolicy(effectiveValues),color=colorPolicy(values),size=requestedSize(values.size);
 const recipe=detailedFormat(values.design,{noPerson,values:effectiveValues});
 const placeholder='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
 const portraitInterview=kind==='interview'&&size.width<size.height;
 const template=renderEditorialLayout(plan,{dataUrl:placeholder,artworkWidth:Number(artworkWidth)||(portraitInterview?2:1),artworkHeight:Number(artworkHeight)||(portraitInterview?3:1)});
 const svgTemplate=template.svg.replace(placeholder,'__APPROVED_ARTWORK_DATA_URL__');
 const layoutSections=(recipe.known?recipe.sections:plan.conditions?.find(c=>c.key==='design')?.sections||[]).filter(s=>layoutLabels.has(s.label));
 const materialName=String(artworkName||'第1段階で合格を確認した主画像').replace(/[\r\n]+/g,' ');
 const checks=[
  '素材の四辺と主題の必要な全外形が残り、主画像が一つの図版として配置されている。',
  '素材の描線・陰影・配色・主題・向きが保持され、再制作や写真化が起きていない。',
  blank?'文字・数字・ロゴ・署名・疑似文字がない。':textPolicy.limited?'確定した限定原稿だけがあり、追加の本文・見出し・番号・署名がない。':'確定原稿がそれぞれの役割で読め、原稿にない画像・記事・文言が追加されていない。',
  '追加した地色・文字・罫線が選択配色の範囲内にあり、主画像の色を上書きしていない。'
 ];
 if(kind==='spread')checks.push('中央x47〜53%に実幅6%の静かな安全帯があり、主画像全体がx7〜41%の内側に収まる。');
 if(kind==='spread'&&!blank&&!textPolicy.limited&&copy.slots.some(s=>s.role==='本文1'))checks.push('右下は本文枠A・Bの2本だけ。Aに本文1、Bに本文2→本文3が連続し、第三の列や画像付きカードがない。');
 if(noPerson)checks.push('人物・人型の顔・身体を追加していない。');
 return [
  '【第2段階：合格した主画像を使う誌面編集】',
  'この段階はSVGによる組版で完成画像を作る。画像生成モデルで主画像や誌面を再構成せず、元画像を一つの素材として配置し、下記のテンプレートに確定した文字を描画する。',
  '選択形式「'+values.design+'」の完成図版を1枚作る。この段階の素材は「'+materialName+'」1枚だけ。第1段階で実際の画像を確認し、画風・主題・全外形が条件を満たした画像を使う。未確認の画像を合格済みと扱わない。',
  '指定した第1段階の画像がこの会話や添付から読み取れない場合は、その画像だけを求める。元の人物写真、選択項目の見本、過去の別作品、実誌の写真を代用して進めない。',
  '【素材を保持する】',
  '主画像は再制作しない。照合済み画像の形・構図・描線・陰影・素材・配色を保ち、完成した一つの図版として配置する。人物・衣装・背景を新しく生成し直したり、元の参照写真へ戻したりしない。',
  noPerson?'人物なしの素材を維持し、人物や人型の顔・身体を補わない。':'主画像内の顔の形・表情・髪・衣装・手足の配置・ポーズを変更しない。頭飾り、両膝、足先など元画像にある外形を誌面の端で切らない。',
  ...containInstructions(kind,size,artworkWidth,artworkHeight),
  '【選択された形式と文字量】',
  '形式：'+values.design+' / 文字設定：'+values.type+'。基準は項目タイトルとここに記載した配置条件。選択画面の見本の人物・性別・衣装・背景・誌名・画風は取り込まない。',
  ...(layoutSections.length?layoutSections.map(s=>'・'+s.label+'：'+s.text):['主画像1点と確定原稿を、選択した形式の情報順序へ配置する。主画像全体の収まる領域を先に決め、未提供の図版を追加しない。']),
  '主画像を描く工程は第1段階で完了している。上記の構成に画像が入りきらない場合は、主画像全体の倍率と位置を調整する。切断・別ポーズへの変形・主役の新規描画で合わせない。',
  '【誌面の地色と文字の色】',
  '選択配色：'+values.palette+'。追加する地色・余白・文字・罫線の色域は'+color.allowed+'、明部は'+color.bright+'、暗部は'+color.dark+'。これは誌面側の追加要素に適用し、合格した主画像を再着色・再照明・均一なフィルターで変更しない。',
  blank?'文字のための帯・署名・数字・本文風の線は描かず、空きを選択配色の静かな地色にする。':'確定原稿の文字は地色との明度差で読みやすくし、主画像の重要な外形へ重ねない。文字を発光や装飾で歪めず、許可された綴りを保つ。',
  '【確定原稿：この文字列を編集配置する】',
  ...editorialContract({...copy,mode:blank?'none':copy.mode}),
  '【完成図版の比率と寸法】',
  '用途：'+size.usage+' / 希望寸法：'+size.pixels+'px / 縦横比：'+size.ratio+'。全面を正面から見た平らな完成図版にし、本・額・端末・机を撮影したモックアップへ置き換えない。',
  '実際に出力された画像の幅と高さを確認する。希望寸法に達していない場合は実寸を明記し、プロンプトに寸法を書いたことを達成の証拠にしない。',
  '【第2段階の実画像検査】',
  ...checks.map((check,i)=>(i+1)+'. '+check),
  '出力画像を素材画像と実際に照合する。配置や文字の不足は誌面側を直し、主画像の再制作で補わない。素材自体が不合格だった場合は第1段階の問題として明示し、この段階で別の主画像へ差し替えて合格したと主張しない。',
  '【実行するSVGテンプレート】',
  '主画像の実ファイルを読み、PNG・JPEG・WebPの元バイトをdata URLへ変換する。次のSVG内の __APPROVED_ARTWORK_DATA_URL__ だけをそのdata URLへ置き換える。画像をトリミング・引き伸ばし・再描画したり、主画像を別の画像へ差し替えたりしない。',
  'SVGをブラウザーまたはSVGレンダラーで描画し、完成PNGを書き出す。テンプレートの文字・行の配置・画像の外形・綴じ余白を保つ。テンプレートのコードやプレースホルダーを画像の内容にしない。',
  '```svg',svgTemplate,'```',
  'テンプレートの実寸は'+template.width+'×'+template.height+'px。'+(template.notes||[]).join(' '),
  '【完成画像の返却】',
  '完成した画像そのものを1枚、この生成チャットに表示する。実在する完成PNGを画像添付または会話内の画像埋め込みで表示する。ダウンロードリンク・パスの文章・プロンプトだけで完了しない。',
  'この環境でSVGの組版・PNG書き出しを実行できない場合は、その状態を明示する。確認できた主画像を返し、制作ツールの「主画像を取り込んで、完成PNGを作る」で仕上げられることを伝える。画像生成による一括再構成へ無言で戻さず、未出力の誌面を完成したと主張しない。'
 ].join('\n');
}
