import {CRYSTAL_OBJECT,crystalObjectRecipe,japaneseSections} from './japan-direction.js?v=19.0.0';
import {visualSpec} from './visual-specs.js?v=19.0.0';
import {detailedMedium} from './medium-recipes.js?v=19.0.0';
import {detailedFormat} from './format-recipes.js?v=19.0.0';
import {detailedSubject} from './subject-recipes.js?v=19.0.0';
import {detailedPalette} from './palette-recipes.js?v=19.0.0';
import {CRYSTAL_ANIME,crystalAnimeSpec} from './crystal-anime.js?v=19.0.0';
import {executionFor} from './option-execution.js?v=19.0.0';

function crystalMaterialRecipe({noPerson}){
 if(!noPerson)return crystalObjectRecipe;
 const sections=crystalObjectRecipe.sections.map(section=>({...section,text:section.label==='日本アニメの造形'?'選択した景物・建築・モチーフの識別形と支持構造を保つ。日本アニメの背景作画の細い色線で、材質の境界と遠近を整理する。':section.label==='結晶の厚みと屈折'?'景物の実在する板・窓・装飾・素材の面に、厚みの違う透明な結晶面を作る。厚い縁は暗い二重線、薄い縁は鋭い明線。背後の輪郭の屈折ずれと厚い部分の二次反射を描く。全景を無意味な水晶の山に置換しない。':section.text}));
 return {...crystalObjectRecipe,sections,checks:['景物の識別形と支持構造',...crystalObjectRecipe.checks.slice(1)]};
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
 const values={...(context.values||{}),[key]:value};
 const noPerson=context.noPerson??/風景を主役|モチーフだけ|紋章・アイコン/.test(values.costume||'');
 const options={...context,values,noPerson};
 const recipe=key==='medium'?(value===CRYSTAL_OBJECT?crystalMaterialRecipe(options):value===CRYSTAL_ANIME?crystalRecipe(options):detailedMedium(value,options))
  :key==='design'?detailedFormat(value,options)
  :key==='palette'?detailedPalette(value,options)
  :detailedSubject(key,value,options);
 if(recipe?.sections?.length){
  const resolved={...recipe,key,value,sections:[...recipe.sections.map(s=>({...s})),...japaneseSections(key,value,options)],checks:[...(recipe.checks||[])]};
  resolved.execution=executionFor(key,value,resolved,options);
  return resolved;
 }
 const base=visualSpec(key,value,{noPerson});
 const resolved={key,value,known:false,sections:[{label:'指定内容の具体化',text:base.text}],checks:[...base.checks]};
 resolved.execution=executionFor(key,value,resolved,options);return resolved;
}
