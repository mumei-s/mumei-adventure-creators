import {visualSpec} from './visual-specs.js?v=13';
import {detailedMedium} from './medium-recipes.js?v=13';
import {detailedFormat} from './format-recipes.js?v=13';
import {detailedSubject} from './subject-recipes.js?v=13';
import {detailedPalette} from './palette-recipes.js?v=13';
import {CRYSTAL_ANIME,crystalAnimeSpec} from './crystal-anime.js?v=13';

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
 const recipe=key==='medium'?(value===CRYSTAL_ANIME?crystalRecipe(options):detailedMedium(value,options))
  :key==='design'?detailedFormat(value,options)
  :key==='palette'?detailedPalette(value,options)
  :detailedSubject(key,value,options);
 if(recipe?.sections?.length)return {...recipe,key,value,sections:recipe.sections.map(s=>({...s})),checks:[...(recipe.checks||[])]};
 const base=visualSpec(key,value,{noPerson});
 return {key,value,known:false,sections:[{label:'指定内容の具体化',text:base.text}],checks:[...base.checks]};
}
