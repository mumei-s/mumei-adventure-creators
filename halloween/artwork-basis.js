import {illustrationBases} from './artwork-basis-illustration.js?v=28.4.4';
import {traditionalBases} from './artwork-basis-traditional.js?v=28.4.4';
import {materialBases} from './artwork-basis-material.js?v=28.4.4';
import {movementsPhotoBases} from './artwork-basis-movements-photo.js?v=28.4.4';
import {luminousBases} from './artwork-basis-luminous.js?v=28.4.4';
import {referenceWorldArtworkBases} from './world-bases.js?v=28.4.4';
import {fantasyStyleDefinitions} from './fantasy-style-definitions.js?v=28.4.4';
import {isNonHumanSource} from './source-kind.js?v=28.4.4';
import {isPhotographicMedium} from './photo-design.js?v=28.4.4';

// Sources are documentation for the picker. Only the extracted drawing
// criteria enter production: no borrowed artist, character, scene or image.
const fantasyDefinitions=new Map(fantasyStyleDefinitions.map(entry=>[entry.value,entry]));
const referenceEntries=referenceWorldArtworkBases.map(entry=>{
 const definition=fantasyDefinitions.get(entry.value);
 if(!definition)return entry;
 return {...entry,sourceNote:definition.sourceNote,references:definition.references};
});
const entries=[...illustrationBases,...traditionalBases,...materialBases,...movementsPhotoBases,...luminousBases,...referenceEntries];
const byValue=new Map();
for(const entry of entries){
 if(byValue.has(entry.value))throw new Error('Duplicate artwork basis: '+entry.value);
 byValue.set(entry.value,Object.freeze({...entry,basis:Object.freeze([...entry.basis]),process:Object.freeze([...(entry.process||[])]),sceneryProcess:Object.freeze([...(entry.sceneryProcess||[])]),checks:Object.freeze([...entry.checks]),avoid:Object.freeze([...entry.avoid]),references:Object.freeze(entry.references.map(r=>Object.freeze({...r})))}));
}
export const artworkBasisValues=Object.freeze([...byValue.keys()]);
export function artworkBasis(value){return byValue.get(value)||null;}
function sceneryCriterion(text){
 return text.replace(/顔・髪・身体、または主景/g,'主景').replace(/顔・髪・身体/g,'主景')
  .replace(/顔・手・衣服/g,'主景の外形・細部・表面素材').replace(/顔・手/g,'主景の外形・細部')
  .replace(/顔・物・背景/g,'主景・物・背景').replace(/顔の識別点・髪・衣服の折れ/g,'主景の識別点・部材・素材の折れ')
  .replace(/人物と背景/g,'主景と背景').replace(/顔を含む/g,'焦点を含む').replace(/写真の顔/g,'写真の主景')
  .replace(/写真の皮膚/g,'写真の表面').replace(/衣装の被覆/g,'主景の外形').replace(/目鼻口/g,'主景の識別点');
}
function nonHumanCriterion(text){
 return text.replace(/主参照の髪型・特徴の位置・年齢感・衣装/g,'独自の主役の特徴と選択衣装')
  .replace(/人物の目は主参照の識別形と表情/g,'独自の主役の目は選択した形と表情')
  .replace(/主参照の識別できる特徴の組合せを/g,'非人物の入力から着想した独自の主役を')
  .replace(/主参照を同じ識別特徴と年齢感の/g,'独自の主役を今回設計した特徴と年齢感の')
  .replace(/主参照の(識別特徴|特徴|同じ特徴)/g,'独自の主役の$1')
  .replace(/同じ識別特徴を/g,'独自の主役の特徴を')
  .replace(/主参照の(髪型|目の形|髪の外形)/g,'独自の主役の$1')
  .replace(/髪が存在する主参照/g,'髪が存在する独自の主役')
  .replace(/参照と異なる髪型/g,'生成済み主役と異なる髪型')
  .replace(/主参照と景物の比例/g,'独自の主役と景物の比例')
  .replace(/主参照と異なる子どもや既成マスコットへ変わっていない/g,'選択にない子どもや既成マスコットへ変わっていない')
  .replace(/参照のちび比率/g,'選択作風の頭身')
  .replace(/ちび参照/g,'生成済み主役がちびの場合')
  .replace(/参照または選択した頭身/g,'生成済み主役または選択した頭身');
}
export function artworkBasisContract(value,{noPerson=false,values={}}={}){
 const entry=artworkBasis(value);if(!entry)return null;
 const scope=noPerson?'適用対象は選択された景物・物体・図案だけ。以下の人物・顔・髪・身体・衣装に関する例は非適用とし、人物や人型を追加しない。':isNonHumanSource(values)?'入力の景色・マーク・物体は人物を識別する資料ではない。人物作品への翻案が明示されている場合だけ、固有形・色・紋様・構造から着想した独自の主役を選択作風で構成する。元入力から顔・髪・年齢・性別を復元せず、主役の衣装・表情・ポーズ・頭身は実際の選択へ従う。修正では既に生成した独自の主役の特徴を保つ。':isPhotographicMedium(value)?'同じキャラクターの識別特徴の組合せ・髪型・識別色・年齢感・性別表現・基礎体格を保ち、自然な人物立体と実物の材質へ翻訳する。参照がちびや誇張イラストでも、大きな目、記号的な鼻口、頭と胴や四肢の寸法比をそのまま固定せず、同じ特徴と年齢感を持つ自然な頭蓋・眼球・人体比率へ再構成する。未選択の幼児化・年齢変更・別人化はせず、明示した非人間の形・役柄と選択衣装の被覆・ポーズ・カメラを保つ。':'同じ人物の識別特徴の組合せを、選択作画の線・形の整理・誇張・省略へ翻訳する。基本頭身は主参照を保ち、ちびキャラなど頭身変更を明示した選択だけを実行する。参照の写真や別画風の完成面を固定しない。';
 const project=noPerson?sceneryCriterion:isNonHumanSource(values)?nonHumanCriterion:text=>text;
 const criteria=noPerson&&value==='ちびキャラ'?[
  '選択した景物・物体の識別形を、大きな読みやすい外形と少数の内部形へ簡略化する。人物や人型へ変えない。',
  '線と明快な色面で小さな図版にも読める構造を作り、素材の違いを少数の形と影で表す。',
  '指定カメラの重なり・遮蔽と景物の接続・支持を保ち、選択配色とシーンを変更しない。'
 ]:(noPerson&&entry.sceneryBasis?entry.sceneryBasis:entry.basis).map(project);
 // Unlike the legacy luminous basis, these new physical clauses are not
 // consolidated away by the compact renderer. Use an explicit scenery branch.
 const process=(noPerson?entry.sceneryProcess:entry.process).map(project);
 const sections=[{label:'作画基準／全域への適用',text:scope},...criteria.map((text,i)=>({label:'作画基準／'+(i+1),text})),...process.map((text,i)=>({label:'光彩の描画工程／'+(i+1),text})),{label:'作画基準／取り違えを避ける',text:'避ける描き方：'+entry.avoid.map(project).join('。')+'。'}];
 const checks=(noPerson&&value==='ちびキャラ'?['簡略な外形と内部形で景物の識別が読める','指定視点・支持を保ち、景物に顔や手足を追加しない']:(noPerson&&entry.sceneryChecks?entry.sceneryChecks:entry.checks).map(project)).map(text=>'作画基準の照合：'+text);
 return {sections,checks,method:sections.map(s=>s.text).join(' ')};
}
export function withArtworkBasis(recipe,value,context={}){
 if(recipe.basisRevision||!recipe.known)return recipe;
 const basis=artworkBasisContract(value,context);if(!basis)return recipe;
 return {...recipe,basisRevision:'reference-criteria-v1',sections:[...basis.sections,...recipe.sections],checks:[...recipe.checks,...basis.checks]};
}
