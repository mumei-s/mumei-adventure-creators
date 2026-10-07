import {imageOutputContract} from './output-contract.js?v=22.0.0';
import {modeFoundation} from './japan-direction.js?v=22.0.0';
import {visibleQuestions} from './catalog.js?v=22.0.0';
import {formatContract} from './formats.js?v=22.0.0';
import {buildEditorial,editorialContract} from './editorial.js?v=22.0.0';
import {optionRecipe} from './option-recipes.js?v=22.0.0';
import {colorPolicy} from './palette-recipes.js?v=22.0.0';
import {resolveArtDirection,interactionContract} from './art-direction.js?v=22.0.0';
import {executionFor} from './option-execution.js?v=22.0.0';

export function productionPlan(profile,values,variant,collection='halloween',random=Math.random){
 const noPerson=/風景を主役|モチーフだけ|紋章・アイコン/.test(values.costume);
 for(const key of ['design','medium','theme','costume','mood','place','pose','palette','type','line','size'])if(typeof values[key]!=='string'||!values[key].trim()||(values[key]==='おまかせ'&&!(noPerson&&['mood','pose'].includes(key))))throw new Error('制作条件「'+key+'」が未確定です。');
 if(!/^.+｜\d+×\d+｜\d+:\d+$/.test(values.size))throw new Error('サイズの幅・高さ・比率を確認してください。');
 variant=resolveArtDirection(values,variant,collection);
 const context={noPerson,values,variant,collection},color=colorPolicy(values);
 const copy=buildEditorial(profile,{...values,collection},random),notes=[modeFoundation(collection)];
 if(noPerson)notes.push(values.costume==='風景を主役にする'?'人物なしの指定を優先します。人物用の表情・顔角度・身体ポーズは適用対象外とし、景物を顔や手足に見立てず、風景の視点・自然な配置・光で作品を成立させます。':'人物なしの指定を優先します。人物用の表情・顔角度・身体ポーズは適用対象外とし、主題を顔や手足に見立てず、選択した物体・図案それぞれの配置と描画方法で作品を成立させます。');
 if(/文字を一切|だけ|のみ|サイン風|落款風/.test(values.type)&&/雑誌|誌面|見開き|新聞/.test(values.design))notes.push('文字を限定した設定です。誌面の文字量はこの指定に合わせて減ります。');
 if(values.line!=='セリフなし'&&(/文字を一切|クリエイター名だけ|HALLOWEEN|サイン風|落款風/.test(values.type)))notes.push('セリフより限定した文字設定を優先します。');
 if(['クリスタル透光アニメ','宝石ホログラムアニメ'].includes(values.medium)&&color.restricted)notes.push('限定色の指定を優先するため虹色の干渉は使いません。屈折・透過・投影の前後は許可色の明暗で保ちます。');
 if(color.restricted)notes.push('完成画像全体の使用色は'+color.allowed+'。画材の白・虹色・反射色も、この色域の明度へ翻訳します。');
 const conditions=visibleQuestions.map((q,i)=>{
  const recipe=optionRecipe(q.key,values[q.key],context),sections=[...recipe.sections];
  let checks=[...recipe.checks];
  if(q.key==='mood'&&!noPerson){
   sections.push({label:'今回実行する表情と向き',text:[variant.face,variant.expression,variant.tone].filter(Boolean).join(' / ')+'。選択した目の開閉・顔の回転を保ち、画風の瞳や髪の精密描写を理由に変えない。'});
   checks.push(variant.face,variant.expression);
  }
  if(q.key==='pose'&&!noPerson){sections.push({label:'今回実行する動作',text:variant.pose});checks.push(variant.pose);}
  let lineExecution;
  if(q.key==='type'){
   const lineRecipe=optionRecipe('line',values.line,context);
   sections.push(...lineRecipe.sections);lineExecution=lineRecipe.execution;
   checks=copy.mode==='none'?['文字・数字・署名のない完成']:copy.slots.map(s=>s.role+'：'+s.text);
  }
  const text=sections.map(s=>s.text).join(' ');
  const execution=executionFor(q.key,values[q.key],{...recipe,sections,checks},context);
  if(lineExecution)execution.line=lineExecution;
  return {index:i+1,key:q.key,name:q.name,value:values[q.key],known:recipe.known,text,sections,checks,execution};
 });
 const format=formatContract(values);
 if(noPerson)format.push('人物なしの形式解釈：形式が主役・肖像・衣装の画像領域を求めても、選んだ風景・物体・紋章をそこへ配置する。人物や人型のマネキンを補わず、レイアウトの情報構造だけを保つ。');
 return {collection,values:{...values},conditions,notes,copy,noPerson,variant,interactions:interactionContract(values,{noPerson}),format,editorial:editorialContract(copy)};
}
export function conditionInstructions(condition){return [condition.index+'. '+condition.name+' / '+condition.value,...(condition.sections?.map(s=>'・'+s.label+'：'+s.text)||[condition.text])];}
export function planInstructions(plan,{omitKeys=[]}={}){return [
 '【選択を具体的に実行する制作条件】',
 '基準は選択した項目タイトルと以下の制作仕様。項目の見本画像は選びやすくするための表示用であり、生成する人物・性別・物体・画風・構図の参照資料にはしない。',
 '【組み合わせの優先規則】',...(plan.interactions||[]),
 ...plan.conditions.filter(c=>!omitKeys.includes(c.key)).flatMap(c=>['',...conditionInstructions(c)]),
 ...plan.notes.map(n=>'組み合わせの解釈：'+n),
 '【選んだ形式の完成設計】',...plan.format,
 '【実画像での完成検査】',
 '生成前の構想だけで合格としない。出力した画像そのものに次の特徴が見えるか確認する。画像を見ていない場合は合格と主張しない。',
 ...plan.conditions.map(c=>'検査'+c.index+' / '+c.name+'：'+c.checks.join(' / ')),
 '不足した項目があれば、その項目と領域を特定し、満たしている主役・動作・画風・配色を保って修正する。誌名だけの絵を雑誌の完成、背景だけの交換を新しいポーズ、顔だけ写真の絵をアニメの完成と扱わない。修正できない場合は不足を正直に伝える。'
];}
export function repairPrompt(result){
 const noPerson=result.production?.noPerson??/風景を主役|モチーフだけ|紋章・アイコン/.test(result.values?.costume||'');
 const checks=result.production?.conditions?.map(c=>'照合 / '+c.name+'：'+c.checks.join(' / '))||['元の制作仕様の各項目と、実際に見える完成画像を照合する。'];
 return [
 ...imageOutputContract,
 '【選択した仕様へ仕上げ直す】',
 'このチャットで直前に生成した完成画像、または今回添付した修正対象の完成画像を実際に見て、下記の制作仕様と照合する。完成画像は修正対象。画風・主題・舞台・形式は項目タイトルと具体的な制作仕様を使う。項目の見本画像は不要であり、見本や画面一覧の再添付を要求しない。必要な主参照や修正対象を確認できない場合のみ、その画像を求める。',
 noPerson?'人物なしの指定を保つ。主参照がある場合は選択主題の形・構造・模様だけを用い、人の顔・身体・衣装を新しく導入しない。':'同じ人物の識別特徴は元の主参照から保つ。修正対象の構図や衣装を、別人の顔の基準へ変更しない。',
 '不足する項目と画像内の領域を特定し、その部分を修正した完成画像を1枚生成する。合格している主題・画風・配色・配置を保つ。人物なし・文字なし・限定色・限定原稿などの選択は、修正時にもそのまま適用する。未許可の人物や文字を品質向上のために追加しない。',
 ...checks,
 '修正後の画像をもう一度照合し、確認していない項目や満たせていない項目を達成したと主張しない。',
 '画像生成機能を実際に実行し、返された修正後の完成画像をこの会話に画像として表示・添付する。説明文・制作仕様の画像・プロンプトだけを完成として返さない。生成機能が使えない、または生成に失敗した場合はその状態を明記し、画像が出ていないのに完成したと伝えない。',
 '', '【元の制作仕様】',result.prompt
 ].join('\n');
}
