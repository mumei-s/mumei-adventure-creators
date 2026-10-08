import assert from 'node:assert/strict';
import {initialSelections} from '../modes.js?v=28.4.1';
import {resolveSelections} from '../catalog.js?v=28.4.1';
import {productionPlan,repairPrompt} from '../production-plan.js?v=28.4.1';
import {composePrompt} from '../prompt.js?v=28.4.1';
import {composeArtworkStage,composeArtworkRepair} from '../artwork-stage.js?v=28.4.1';
import {renderChatInput} from '../compiled-production.js?v=28.4.1';
const profile={displayName:'PROPORTION CHECK',activityEnabled:false},rng=()=>.24;
const base=resolveSelections({...initialSelections(),costume:'参照画像の衣装を生かす',medium:'現代アニメの一枚絵',pose:'自然に立つ',mood:'毎回大胆に変える',angle:'場面に合わせたアングル',type:'文字を一切入れない',sceneUnified:true},rng);
let count=0;
for(const sourceKind of ['unknown','illustration-person'])for(const medium of ['発光幻想アニメ','宝石光彩アニメ','クリスタル透光アニメ','ローポリゴン']){
 const values={...base,sourceKind,medium};const plan=productionPlan(profile,values,{},'halloween',rng);
 const outputs=[composePrompt({profile,values,variant:plan.variant,preparedPlan:plan,references:[{role:'identity',name:'character.png'}],edition:'SCALE',random:rng}),renderChatInput(plan),composeArtworkStage(plan),composeArtworkRepair(plan),repairPrompt({values,production:plan})];
 for(const output of outputs){assert.match(output,/主参照がちびなら/);assert.match(output,/通常頭身へ伸ばさない/);assert.doesNotMatch(output,/各部の寸法や頭身を固定しない|各部の寸法や頭身を固定せず/);count++;}
 assert.match(outputs[0],/character.png：主役の識別特徴の参照/);
}
for(const costume of ['風景を主役にする','モチーフだけで構成する']){
 const values={...base,costume};const plan=productionPlan(profile,values,{},'halloween',rng);
 assert.doesNotMatch(composePrompt({profile,values,variant:plan.variant,preparedPlan:plan,edition:'NO PERSON'}),/頭身：人物の主参照/);
}
console.log('PASS '+count+' actual normal/staged/repair handoffs preserve chibi-reference proportions across unknown/illustration inputs and luminous/crystal/polygon styles; no-person output stays isolated.');
