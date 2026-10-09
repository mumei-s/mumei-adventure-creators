import assert from 'node:assert/strict';
import {initialSelections} from '../modes.js?v=28.4.4';
import {resolveSelections} from '../catalog.js?v=28.4.4';
import {productionPlan,repairPrompt} from '../production-plan.js?v=28.4.4';
import {composePrompt} from '../prompt.js?v=28.4.4';
import {composeArtworkStage,composeArtworkRepair} from '../artwork-stage.js?v=28.4.4';
import {renderChatInput} from '../compiled-production.js?v=28.4.4';
import {usesFocusedProduction} from '../focused-production.js?v=28.4.4';
import {renderRecipeChatInput} from '../compact-production.js?v=28.4.4';
import {assertCompactHandoff} from './compact-handoff-assertions-v28.mjs';
const profile={displayName:'PROPORTION CHECK',activityEnabled:false},rng=()=>.24;
const base=resolveSelections({...initialSelections(),costume:'参照画像の衣装を生かす',medium:'現代アニメの一枚絵',pose:'自然に立つ',mood:'毎回大胆に変える',angle:'場面に合わせたアングル',type:'文字を一切入れない',sceneUnified:true},rng);
let count=0;
for(const sourceKind of ['unknown','illustration-person'])for(const medium of ['発光幻想アニメ','宝石光彩アニメ','クリスタル透光アニメ','ローポリゴン']){
 const values={...base,sourceKind,medium};const plan=productionPlan(profile,values,{},'halloween',rng);
 const outputs=[composePrompt({profile,values,variant:plan.variant,preparedPlan:plan,references:[{role:'identity',name:'character.png'}],edition:'SCALE',random:rng}),renderChatInput(plan),composeArtworkStage(plan),composeArtworkRepair(plan),repairPrompt({values,production:plan})];
 for(const output of outputs){assert.match(output,/主参照がちびなら/);assert.match(output,/通常頭身へ伸ばさない/);assert.doesNotMatch(output,/各部の寸法や頭身を固定しない|各部の寸法や頭身を固定せず/);count++;}
 if(usesFocusedProduction(plan)){
  assertCompactHandoff(plan,outputs[0],'actual focused proportions');
  assert.match(outputs[0],/The source character \(character\.png\) supplies IDENTITY FEATURES ONLY/,'Focused preparation must name the supplied character reference and its identity-only role');
  const final=outputs[0].split('【統合するための制作仕様：開始】')[1]?.split('【統合するための制作仕様：終了】')[0];
  assert.ok(final,'Focused proportions must have a separate final execution payload');
  assert.match(final,/prepared-identity\.png/,'Final production must use the inspected illustration identity');
  assert.doesNotMatch(final,/character\.png/,'Final production must not reintroduce the original character source');
  assert.match(renderRecipeChatInput(plan,[{role:'identity',name:'character.png'}]),/"character\.png"＝作成者の主参照。人物または選択主題の識別基準。/,'Public recipe retains the named identity reference and its original subject responsibility');
 }else assert.match(outputs[0],/(?:character\.png：同じ人物・キャラクターを保つ主参照|"character\.png"＝作成者の主参照。人物または選択主題の識別基準。)/,'Actual non-focused handoff retains the exact character filename and identity responsibility in legacy or typed-manifest grammar');
}
for(const costume of ['風景を主役にする','モチーフだけで構成する']){
 const values={...base,costume};const plan=productionPlan(profile,values,{},'halloween',rng);
 assert.doesNotMatch(composePrompt({profile,values,variant:plan.variant,preparedPlan:plan,edition:'NO PERSON'}),/頭身：人物の主参照/);
}
console.log('PASS '+count+' actual normal/staged/repair handoffs preserve chibi-reference proportions across unknown/illustration inputs and luminous/crystal/polygon styles; no-person output stays isolated.');
