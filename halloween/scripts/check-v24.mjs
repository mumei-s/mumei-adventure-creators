import assert from 'node:assert/strict';
import fs from 'node:fs';
import {productionPlan} from '../production-plan.js?v=28.4.0';
import {renderChatInput,renderInput} from '../compiled-production.js?v=28.4.0';
import {modeFoundation} from '../japan-direction.js?v=28.4.0';
import {halloweenModeContract} from '../halloween-mode-contract.js?v=28.4.0';
const settings=JSON.parse(fs.readFileSync(new URL('../verification/v22/crystal-proof-settings.json',import.meta.url)));
const profile={displayName:'TEST',activityEnabled:false,topics:[]};
for(const collection of ['halloween','everyday'])for(const costume of ['参照画像の衣装を生かす','風景を主役にする']){
 const plan=productionPlan(profile,{...settings.values,costume},settings.variant,collection,()=>.28);
 const input=JSON.parse(renderInput(plan).split('\n\n【全選択の個別レシピ】')[0]);
 const text=renderChatInput(plan);
 assert.equal(plan.conditions.length,10);
 for(const condition of plan.conditions){assert.ok(text.includes(condition.execution.method));for(const section of condition.sections)assert.ok(text.includes(section.text));}
 for(const value of Object.values(input.required_before_details))assert.ok(text.includes(value));
 if(plan.noPerson)assert.ok(!input.required_before_details.full_body_composition);
 else{assert.match(input.required_before_details.full_body_composition,/両足の靴先.*支持面/);assert.match(input.required_before_details.full_body_composition,/75〜80%.*10%以上/);assert.match(text,/衣装を生かす.*背景の小物や手に持つ武器を含めない/);}
}
assert.match(modeFoundation('halloween'),/すべての作品.*Halloween.*出来事・場所・目的/);
assert.match(modeFoundation('halloween'),/選択した時刻.*画風.*衣装と被覆.*カメラ/);
assert.match(modeFoundation('halloween'),/人物なしを優先/);
assert.doesNotMatch(modeFoundation('halloween'),/装飾から.*要素だけを加える/);
// Halloween is mandatory for the whole scene, while explicitly ordinary
// clothes, morning, camera, medium and restricted colour remain intact.
const ordinaryValues={...settings.values,theme:'朝の光と小さな日常',place:'朝のキッチン',costume:'リネンシャツとデニム',medium:'水墨画',palette:'墨一色',angle:'真上から・90度',pose:'椅子に腰掛ける',mood:'目を閉じて安らぐ',type:'文字を一切入れない'};
const ordinary=productionPlan(profile,ordinaryValues,settings.variant,'halloween',()=>.28);
for(const key of ['theme','place','costume','medium','palette','angle','pose','mood'])assert.equal(ordinary.values[key],ordinaryValues[key],key+' was replaced by seasonal adaptation');
const seasonal=halloweenModeContract(ordinaryValues,{collection:'halloween'});
assert.match(seasonal.method,/朝や昼を明示したテーマ.*時刻を保つ/);
assert.match(seasonal.method,/普通の服.*同じ服/);
assert.match(seasonal.method,/許可色の濃淡/);
assert.match(seasonal.method,/カボチャを一個置く.*成立したと判定しない/);
assert.ok(renderChatInput(ordinary).includes(seasonal.method),'Mandatory seasonal interpretation did not reach the native input');
assert.equal(ordinary.copy.slots.length,0,'Seasonal wording overrode text-off');
const close=productionPlan(profile,settings.values,{...settings.variant,distance:'顔の接写'},'halloween',()=>.28);
assert.ok(!JSON.parse(renderInput(close).split('\n\n【全選択の個別レシピ】')[0]).required_before_details.full_body_composition);
console.log('PASS v24: frame reserves floor below both shoes without overriding closeups/no-person; reference clothing excludes loose props; every Halloween scene is seasonal while explicit ordinary clothing, morning, camera, medium, restricted colours and text-off remain intact; all 10 full recipes survive containment deduplication.');
