import {applyCollection} from '../collection.js?v=28.4.0';
import {resolveSelections} from '../catalog.js?v=28.4.0';
import {initialSelections} from '../modes.js?v=28.4.0';
import {buildDirection} from '../direction.js?v=28.4.0';
import {applyPose} from '../poses.js?v=28.4.0';
import {productionPlan} from '../production-plan.js?v=28.4.0';
import {composePrompt} from '../prompt.js?v=28.4.0';
import {composeArtworkStage} from '../artwork-stage.js?v=28.4.0';
import {stagePrompts} from '../production-workflow.js?v=28.4.0';

// Reproducible application output. Test images receive this prompt unchanged.
// A character test uses a locally supplied owner reference; no sample art is input.
export function imageProofCase(name){
 const profile={displayName:'Atelier',activityEnabled:false,biography:'',topics:[],titles:[]};
 const cases={
  'hologram-spread':{collection:'halloween',seed:1329,references:[{name:'reference-01-character.jpg',role:'identity'}],values:{design:'見開き特集',medium:'宝石ホログラムアニメ',theme:'真夜中の魔女のアトリエ',costume:'ミイラ',mood:'正面・首をまっすぐ',place:'魔女の書斎',pose:'床であぐらをかく',palette:'夜紺 × 翡翠 × 蛍光緑',type:'デザインに合わせて自動編集',line:'隠した想いも、今夜の衣装。',size:'A4縦・300dpi目安｜2480×3508｜210:297'}},
  'ordinary-watercolor':{collection:'everyday',seed:1307,references:[],values:{design:'自然・都市の風景画',medium:'透明水彩',theme:'山岳と湖のパノラマ',costume:'風景を主役にする',mood:'静かで美しい',place:'山岳と湖畔',pose:'おまかせ',palette:'翡翠 × 銅 × 濃紺',type:'文字を一切入れない',line:'セリフなし',size:'横写真3:2｜3600×2400｜3:2'}},
 };
 cases['hologram-spread-wide']={...cases['hologram-spread'],values:{...cases['hologram-spread'].values,size:'横写真3:2｜3600×2400｜3:2'}};
 const config=cases[name];if(!config)throw new Error('Unknown visual proof case');
 applyCollection(config.collection);
 let seed=config.seed;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const values=resolveSelections({...initialSelections(),...config.values},random);
 const variant=applyPose(buildDirection([],values.mood,random,config.collection,values),values.pose);
 const plan=productionPlan(profile,values,variant,config.collection,random);
 const prompt=composePrompt({collection:config.collection,profile,values,variant,references:config.references,edition:'ART-RECIPE-CHECK-'+name,preparedPlan:plan});
 return {name,collection:config.collection,values,variant:plan.variant,prompt,production:plan,stages:stagePrompts(plan),artworkPrompt:composeArtworkStage(plan),checks:plan.conditions.map(c=>({key:c.key,value:c.value,checks:c.checks}))};
}
