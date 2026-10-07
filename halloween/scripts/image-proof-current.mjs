import fs from 'node:fs';
import path from 'node:path';
import {applyCollection} from '../collection.js?v=28.0.0';
import {resolveSelections} from '../catalog.js?v=28.0.0';
import {initialSelections} from '../modes.js?v=28.0.0';
import {buildDirection} from '../direction.js?v=28.0.0';
import {applyPose} from '../poses.js?v=28.0.0';
import {productionPlan} from '../production-plan.js?v=28.0.0';
import {composePrompt} from '../prompt.js?v=28.0.0';
import {stagePrompts} from '../production-workflow.js?v=28.0.0';
export function currentImageProof(name){
 const cases={
  'photo-newspaper':{design:'新聞の一面',medium:'実写風フィルム写真',type:'デザインに合わせて自動編集',size:'自由サイズ｜1024×1536｜2:3'},
  'watercolor-spread':{design:'見開き特集',medium:'透明水彩',type:'デザインに合わせて自動編集',size:'自由サイズ｜1536×1024｜3:2'},
  woodcut:{design:'通常の一枚絵',medium:'木版画',type:'文字を一切入れない',size:'自由サイズ｜1024×1536｜2:3'},
 };
 const config=cases[name];if(!config)throw new Error('Unknown proof case');
 applyCollection('everyday');let seed=1406;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const values=resolveSelections({...initialSelections(),theme:'海辺と水平線',costume:'風景を主役にする',mood:'毎回大胆に変える',place:'砂浜と海岸線',pose:'横向きに座る',line:'セリフなし',palette:'くすみ青 × 炭 × 霧白',...config},random);
 const profile={displayName:'Atelier',activityEnabled:false,biography:'',topics:[],titles:[]};
 const variant=applyPose(buildDirection([],values.mood,random,'everyday',values),values.pose);
 const plan=productionPlan(profile,values,variant,'everyday',random);
 const prompt=composePrompt({collection:'everyday',profile,values,variant:plan.variant,references:[],edition:'V14-'+name,preparedPlan:plan});
 const stages=stagePrompts(plan);return {name,values,variant:plan.variant,plan,prompt,stages,imagePrompt:stages?.artwork||prompt};
}
if(process.argv[2]){const dir=process.argv[2];fs.mkdirSync(dir,{recursive:true});for(const name of ['photo-newspaper','watercolor-spread','woodcut']){const p=currentImageProof(name);fs.writeFileSync(path.join(dir,name+'.json'),JSON.stringify(p,null,2));fs.writeFileSync(path.join(dir,name+'.txt'),p.imagePrompt);console.log(name+': master '+p.prompt.length+', image input '+p.imagePrompt.length);}}
