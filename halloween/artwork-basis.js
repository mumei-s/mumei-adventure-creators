import {illustrationBases} from './artwork-basis-illustration.js?v=28.1.1';
import {traditionalBases} from './artwork-basis-traditional.js?v=28.1.1';
import {materialBases} from './artwork-basis-material.js?v=28.1.1';
import {movementsPhotoBases} from './artwork-basis-movements-photo.js?v=28.1.1';
import {luminousBases} from './artwork-basis-luminous.js?v=28.1.1';

// Sources are documentation for the picker. Only the extracted drawing
// criteria enter production: no borrowed artist, character, scene or image.
const entries=[...illustrationBases,...traditionalBases,...materialBases,...movementsPhotoBases,...luminousBases];
const byValue=new Map();
for(const entry of entries){
 if(byValue.has(entry.value))throw new Error('Duplicate artwork basis: '+entry.value);
 byValue.set(entry.value,Object.freeze({...entry,basis:Object.freeze([...entry.basis]),checks:Object.freeze([...entry.checks]),avoid:Object.freeze([...entry.avoid]),references:Object.freeze(entry.references.map(r=>Object.freeze({...r})))}));
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
export function artworkBasisContract(value,{noPerson=false}={}){
 const entry=artworkBasis(value);if(!entry)return null;
 const scope=noPerson?'適用対象は選択された景物・物体・図案だけ。以下の人物・顔・髪・身体・衣装に関する例は非適用とし、人物や人型を追加しない。':'同じ人物の識別特徴の組合せを、選択作画の線・形の整理・誇張・省略・頭身へ翻訳する。参照の写真や別画風の完成面を固定しない。';
 const project=noPerson?sceneryCriterion:text=>text;
 const criteria=noPerson&&value==='ちびキャラ'?[
  '選択した景物・物体の識別形を、大きな読みやすい外形と少数の内部形へ簡略化する。人物や人型へ変えない。',
  '線と明快な色面で小さな図版にも読める構造を作り、素材の違いを少数の形と影で表す。',
  '指定カメラの重なり・遮蔽と景物の接続・支持を保ち、選択配色とシーンを変更しない。'
 ]:entry.basis.map(project);
 const sections=[{label:'作画基準／全域への適用',text:scope},...criteria.map((text,i)=>({label:'作画基準／'+(i+1),text})),{label:'作画基準／取り違えを避ける',text:'避ける描き方：'+entry.avoid.map(project).join('。')+'。'}];
 const checks=(noPerson&&value==='ちびキャラ'?['簡略な外形と内部形で景物の識別が読める','指定視点・支持を保ち、景物に顔や手足を追加しない']:entry.checks.map(project)).map(text=>'作画基準の照合：'+text);
 return {sections,checks,method:sections.map(s=>s.text).join(' ')};
}
export function withArtworkBasis(recipe,value,context={}){
 if(recipe.basisRevision||!recipe.known)return recipe;
 const basis=artworkBasisContract(value,context);if(!basis)return recipe;
 return {...recipe,basisRevision:'reference-criteria-v1',sections:[...basis.sections,...recipe.sections],checks:[...recipe.checks,...basis.checks]};
}
