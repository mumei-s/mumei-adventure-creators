import assert from 'node:assert/strict';
import fs from 'node:fs';
import {productionPlan} from '../production-plan.js?v=28.1.2';
import {renderChatInput,renderInput} from '../compiled-production.js?v=28.1.2';
import {modeFoundation} from '../japan-direction.js?v=28.1.2';
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
assert.match(modeFoundation('halloween'),/モード名だけを理由に.*自動追加しない/);
assert.match(modeFoundation('halloween'),/明示した選択項目では、その個別仕様を実行/);
assert.doesNotMatch(modeFoundation('halloween'),/装飾から.*要素だけを加える/);
const close=productionPlan(profile,settings.values,{...settings.variant,distance:'顔の接写'},'halloween',()=>.28);
assert.ok(!JSON.parse(renderInput(close).split('\n\n【全選択の個別レシピ】')[0]).required_before_details.full_body_composition);
console.log('PASS v24: frame reserves floor below both shoes without overriding closeups/no-person; reference clothing excludes loose props; Halloween decor requires a selected item; all 10 full recipes survive containment deduplication.');
