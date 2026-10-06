import {visibleQuestions} from './catalog.js?v=10';
import {visualSpec} from './visual-specs.js?v=10';
import {formatContract} from './formats.js?v=10';
import {buildEditorial,editorialContract} from './editorial.js?v=10';
export function productionPlan(profile,values,variant,collection='halloween',random=Math.random){
 for(const key of ['design','medium','theme','costume','mood','place','pose','palette','type','line','size'])if(typeof values[key]!=='string'||!values[key].trim()||values[key]==='おまかせ')throw new Error('制作条件「'+key+'」が未確定です。');
 if(!/^.+｜\d+×\d+｜\d+:\d+$/.test(values.size))throw new Error('サイズの幅・高さ・比率を確認してください。');
 const copy=buildEditorial(profile,{...values,collection},random),noPerson=/風景を主役|モチーフだけ|紋章・アイコン/.test(values.costume),notes=[];
 if(noPerson)notes.push('人物なしの指定を優先し、ポーズと表情は物体の配置・向き・動きへ翻訳します。');
 if(/文字を一切|だけ|のみ|サイン風|落款風/.test(values.type)&&/雑誌|誌面|見開き|新聞/.test(values.design))notes.push('文字を限定した設定です。誌面の文字量はこの指定に合わせて減ります。');
 if(values.line!=='セリフなし'&&(/文字を一切|クリエイター名だけ|HALLOWEEN|サイン風|落款風/.test(values.type)))notes.push('セリフより限定した文字設定を優先します。');
 if(/モノクロ|水墨画|南画|禅画|サイアノ/.test(values.medium)&&!/墨一色|モノクロ|セピア|参照画像/.test(values.palette))notes.push('単色技法では選んだ配色を濃淡へ翻訳し、技法を保ちます。');
 const conditions=visibleQuestions.map((q,i)=>{
  const spec=visualSpec(q.key,values[q.key]);let text=spec.text,checks=[...spec.checks];
  if(q.key==='mood'){text+=' 今回の実行：'+variant.face+' / '+variant.expression+(variant.tone?' / '+variant.tone:'');checks=noPerson?['物体や景物の向きと感情の演出']:[variant.face,variant.expression];}
  if(q.key==='pose'){text=noPerson?'物体・景物の配置や運動で「'+values.pose+'」の方向と勢いを表す。':text+' 実行する身体動作：'+variant.pose;checks=noPerson?['物体の向きと動き']:[variant.pose];}
  if(q.key==='type'){text+=' '+visualSpec('line',values.line).text;checks=copy.mode==='none'?['文字・数字・署名のない完成']:copy.slots.map(s=>s.role+'：'+s.text);}
  return {index:i+1,key:q.key,name:q.name,value:values[q.key],text,checks};
 });
 return {conditions,notes,copy,format:formatContract(values),editorial:editorialContract(copy)};
}
export function planInstructions(plan){return [
 '【選択を具体的に実行する制作条件】',
 '10項目は担当する役割を分けて同時に実行する。画風は描き方、形式は画像・文字の構造、物語は出来事、衣装は役柄、舞台は空間、ポーズは身体の動き。別の項目を雰囲気で代用しない。',
 ...plan.conditions.map(c=>c.index+'. '+c.name+' / '+c.value+'：'+c.text),
 ...plan.notes.map(n=>'組み合わせの解釈：'+n),
 '【選んだ形式の完成設計】',...plan.format,
 '【実画像での完成検査】',
 '生成前の構想だけで合格としない。出力した画像そのものに次の特徴が見えるか確認する。画像を見ていない場合は合格と主張しない。',
 ...plan.conditions.map(c=>'検査'+c.index+' / '+c.name+'：'+c.checks.join(' / ')),
 '不足した項目があれば、その項目と領域を特定し、満たしている顔・ポーズ・画風・配色を保って修正する。誌名だけの絵を雑誌の完成、背景だけの交換を新しいポーズ、顔だけ写真の絵をアニメの完成と扱わない。修正できない場合は不足を正直に伝える。'
];}
export function repairPrompt(result){return [
 '【選択した仕様へ仕上げ直す】',
 'このチャットで直前に生成した完成画像、または今回添付した修正対象の完成画像を実際に見て、下記の制作仕様と照合する。完成画像は修正対象であり、別の人物の顔の基準にはしない。元の主参照・作例は元の制作資料を使う。必要な画像を確認できない場合は、その画像だけを求め、見たと仮定して修正しない。',
 '不足する項目と画像内の領域を特定し、その部分を修正した完成画像を1枚生成する。合格している顔の同一性・画風・衣装・ポーズ・配色・文章は保つ。背景だけを替えたり、指定を別のジャンルへ弱めたりしない。',
 '雑誌なら誌名・主特集・補助特集と補足、内ページなら意味のある本文カラム・リード・キャプション、ポスターなら情報階層を確認。目・眉・口・顔角度、手足の動作・重心・接触、素材・遠近、寸法と文字の綴りも完成画像から照合する。',
 '修正後の画像をもう一度照合し、確認していない項目や満たせていない項目を達成したと主張しない。',
 '', '【元の制作仕様】',result.prompt
 ].join('\n');}
