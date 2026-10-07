import {everydayRecipe} from './everyday-options.js?v=28.0.2';
import {CRYSTAL_OBJECT,crystalObjectRecipe,japaneseSections} from './japan-direction.js?v=28.0.2';
import {visualSpec} from './visual-specs.js?v=28.0.2';
import {detailedMedium} from './medium-recipes.js?v=28.0.2';
import {detailedFormat} from './format-recipes.js?v=28.0.2';
import {detailedSubject} from './subject-recipes.js?v=28.0.2';
import {detailedPalette} from './palette-recipes.js?v=28.0.2';
import {CRYSTAL_ANIME,crystalAnimeSpec} from './crystal-anime.js?v=28.0.2';
import {executionFor} from './option-execution.js?v=28.0.2';
import {colorPolicy} from './color-policy.js?v=28.0.2';
import {halloweenSceneFocus,sceneSourcePlace} from './scene-presets.js?v=28.0.2';
import {angleRecipe} from './angles.js?v=28.0.2';

function opticalPaletteText(text,policy){
 if(!policy.restricted)return text;
 return text.replace(/シアン・菫・桃・淡金|シアン・菫・マゼンタ・淡金|白・シアン・菫・桃・淡金/g,'許可色の濃淡')
  .replace(/虹色/g,'許可色の明度差による').replace(/白い/g,'許可色の最明部の')
  .replace(/白光/g,'許可色の最明部の光');
}

function crystalMaterialRecipe({noPerson}){
 if(!noPerson)return crystalObjectRecipe;
 const sections=crystalObjectRecipe.sections.map(section=>({...section,text:section.label==='日本アニメの造形'?'選択した景物・建築・モチーフの識別形と支持構造を保つ。日本アニメの背景作画の細い色線で、材質の境界と遠近を整理する。':section.label==='結晶の厚みと屈折'?'景物の実在する板・窓・装飾・素材の面に、厚みの違う透明な結晶面を作る。厚い縁は暗い二重線、薄い縁は鋭い明線。背後の輪郭の屈折ずれと厚い部分の二次反射を描く。全景を無意味な水晶の山に置換しない。':section.label==='飛び出す奥行きと動勢'?'前景の結晶稜線と奥の主景を短縮遠近と遮蔽で分け、風・水面・光帯の動きが選択された場合は同じ方向と時刻で描く。人物の手足や髪を追加しない。':section.text}));
 return {...crystalObjectRecipe,sections,checks:['景物の識別形と支持構造','近景と主景の明確な深度差','広い透明な結晶面と厚みの違い','背後の輪郭の屈折ずれと内部反射','面の角度に沿う虹色干渉帯','鋭い光とまとまった深い影']};
}
function crystalRecipe({values,noPerson}){
 const spec=crystalAnimeSpec({noPerson,palette:values.palette});
 const labels=noPerson?['景物の線と色面','色の維持','光と影','素材の輪郭','透過する素材','選択条件の維持']:['主参照の造形','顔の線と色面','色の維持','光と影','見える瞳の内部','存在する髪の束','素材の厚みと透過','選択条件の維持'];
 const sections=[];
 for(const line of spec.text.split('\n').slice(1)){
  const match=line.match(/^(\d+)．(.*)$/);
  if(match)sections.push({label:labels[Number(match[1])-1]||'描画工程',text:match[2]});
  else if(sections.length)sections.at(-1).text+=' '+line;
 }
 return {known:true,family:'crystal-anime',sections,checks:spec.checks};
}

// Resolve only the selected title. No sample file or thumbnail is read here.
export function optionRecipe(key,value,context={}){
 const sourceKey=key==='theme'&&sceneSourcePlace(value)?'place':key;
 const values={...(context.values||{}),[key]:value};
 const noPerson=context.noPerson??/風景を主役|モチーフだけ|紋章・アイコン/.test(values.costume||'');
 const options={...context,values,noPerson};
 let recipe=key==='angle'?angleRecipe(value,options):key==='medium'?(value===CRYSTAL_OBJECT?crystalMaterialRecipe(options):value===CRYSTAL_ANIME?crystalRecipe(options):detailedMedium(value,options))
  :key==='design'?detailedFormat(value,options)
  :key==='palette'?detailedPalette(value,options)
  :everydayRecipe(sourceKey,value)||detailedSubject(sourceKey,value,options);
 if(recipe?.sections?.length){
  recipe={...recipe,sections:recipe.sections.map(s=>({...s}))};
  const halloweenFocus=key==='theme'&&(context.collection||'halloween')==='halloween'&&halloweenSceneFocus(value);
  if(halloweenFocus)recipe.sections.push({label:'Halloweenの場面',text:halloweenFocus+' 選択した主役・人物の有無・衣装・ポーズ・顔角度・カメラ・作風を保ち、見える道具や出来事の痕跡で場面を示す。'});
  if(key==='medium'&&!noPerson&&['クリスタルホログラム造形アニメ','宝石ホログラムアニメ'].includes(value))recipe.sections.push({label:'顔も同一の結晶ホログラム',text:(value==='クリスタルホログラム造形アニメ'?'額・頬・鼻・顎・眼瞼・唇・耳まで厚みのある透明な結晶ガラスで造形する。頬と鼻の面に幅広い虹色干渉帯、厚い縁に暗い二重内部反射、頬を通して見える奥の髪や背景の屈折した像を描く。鼻と唇も透明な結晶面にし、肌に虹の模様を貼るだけで終えない。':'額・頬・鼻・顎・眼瞼・唇・耳も半透明の投影像にする。頬と鼻の広い面に背景が透ける濃度差、干渉帯、位置のずれた二重像を描き、普通の肌の顔の周囲に光の膜だけを足す絵にしない。')+'自然な肌色や不透明な皮膚、自然なピンクの不透明な唇を残さず、目鼻口の配置と識別できる顔の形、指定した表情を透明材質内部の色面と描線で保つ。'});
  const resolved={...recipe,key,value,sourceKey,sections:[...recipe.sections.map(s=>({...s})),...japaneseSections(sourceKey,value,options)],checks:[...(recipe.checks||[]),...(key==='medium'&&!noPerson&&['クリスタルホログラム造形アニメ','宝石ホログラムアニメ'].includes(value)?['額・頬・鼻・眼瞼・唇・耳まで同一の透明結晶ホログラム']:[])]};
  if(key==='medium'&&[CRYSTAL_OBJECT,CRYSTAL_ANIME,'宝石ホログラムアニメ'].includes(value)){
   const policy=colorPolicy(values);
   resolved.sections=resolved.sections.map(s=>({...s,text:opticalPaletteText(s.text,policy)}));
   resolved.checks=resolved.checks.map(s=>opticalPaletteText(s,policy));
  }
  resolved.execution=executionFor(key,value,resolved,options);
  return resolved;
 }
 const base=visualSpec(key,value,{noPerson});
 const resolved={key,value,known:false,sections:[{label:'指定内容の具体化',text:base.text}],checks:[...base.checks]};
 resolved.execution=executionFor(key,value,resolved,options);return resolved;
}
