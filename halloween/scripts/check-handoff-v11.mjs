import assert from 'node:assert/strict';
import {applyCollection} from '../collection.js?v=28.4.3';
import {resolveSelections} from '../catalog.js?v=28.4.3';
import {initialSelections} from '../modes.js?v=28.4.3';
import {buildDirection} from '../direction.js?v=28.4.3';
import {applyPose} from '../poses.js?v=28.4.3';
import {productionPlan} from '../production-plan.js?v=28.4.3';
import {composePrompt,needsReference} from '../prompt.js?v=28.4.3';
import {assertCompactHandoff} from './compact-handoff-assertions-v28.mjs';
import {imageDeliveryRepairPrompt} from '../output-contract.js?v=28.4.3';

const profile={displayName:'TEST CREATOR',topics:[],biography:'',activityEnabled:false};
applyCollection('everyday');
const values=resolveSelections({...initialSelections(),design:'ファッション雑誌の表紙',medium:'少女漫画の扉絵',theme:'街角のファッション',costume:'現代のテーラードスーツ',pose:'ゆっくり歩く',mood:'完全な左横顔90度',palette:'墨一色'},()=>.24);
const variant=applyPose(buildDirection([],values.mood,()=>.24,'everyday',values),values.pose);
const plan=productionPlan(profile,values,variant,'everyday',()=>.24);
const args={collection:'everyday',creator:'test',profile,values,variant,references:[{name:'reference-01-user.png',role:'identity'}],edition:'TEST',preparedPlan:plan};
const plain=composePrompt(args),oldStyle=composePrompt({...args,styleGuide:{name:'male-sample.jpg',combined:true,cells:[{cell:1,value:'男性の見本',text:'別の男性を必ず描く'}]}});
assert.equal(plain,oldStyle,'Legacy sample-image metadata must have no influence on the prompt');
assert.ok(!plain.includes('male-sample.jpg'));assert.ok(!plain.includes('別の男性を必ず描く'));
assert.ok(plain.includes('選択確定：'));assert.ok(plain.includes('性別表現'));
assert.ok(plain.includes('完成した画像そのものを1枚'));assert.ok(plain.includes('文章だけで完成扱いにしない'));
assert.equal(needsReference(values),true);

for(const medium of ['透明水彩','水墨画','実写風フィルム写真','実写風モノクロ銀塩写真']){
 const scenery=resolveSelections({...initialSelections(),design:'自然・都市の風景画',theme:'山岳と湖のパノラマ',costume:'風景を主役にする',medium,palette:medium.includes('モノクロ')?'原色のポップカラー':'墨一色',type:'文字を一切入れない'},()=>.3);
 const shot=applyPose(buildDirection([],scenery.mood,()=>.3,'everyday',scenery),scenery.pose);
 const prompt=composePrompt({collection:'everyday',creator:'test',profile,values:scenery,variant:shot,references:[],edition:'LANDSCAPE'});
 assert.equal(needsReference(scenery),false);assert.equal(needsReference({...scenery,place:'参照風景を舞台にする'}),true);
 assert.equal(needsReference({...scenery,palette:'参照画像の色を生かす'}),true);
 const sceneryPlan=productionPlan(profile,scenery,shot,'everyday',()=>.3);if(!assertCompactHandoff(sceneryPlan,prompt))continue;assert.ok(prompt.includes('参照画像なしでも制作できる'));
 for(const fragment of ['顔の向き：','明確な表情：','身体の動き：','鼻・頬・唇の形は','水彩の必須条件：顔','墨の必須条件：顔','主役の服','髪・肌・瞳の基礎色は保持'])assert.ok(!prompt.includes(fragment),medium+' should not direct a person: '+fragment);
 assert.ok(prompt.includes('人物用の表情・顔向き・身体ポーズは非適用'));
 assert.ok(!prompt.includes('undefined'));assert.ok(!prompt.includes('NaN'));
}
for(const [medium,palette] of [['実写風モノクロ銀塩写真','原色のポップカラー'],['鉛筆デッサン','群青 × 月白 × 銀'],['現代アニメの一枚絵','金と黒の二色'],['サイアノタイプ','墨一色']]){
 const v={...values,medium,palette},p=composePrompt({...args,values:v,preparedPlan:null});
 assert.ok(!p.includes('髪・肌・瞳の基礎色は保持'),medium+' / '+palette);
 if(medium==='サイアノタイプ'){assert.ok(p.includes('プルシアンブルーと紙の白'));assert.ok(!p.includes('限定色の必須条件：完成画像の全領域を黒'));}
}
const repair=imageDeliveryRepairPrompt({edition:'TEST',prompt:plain});
assert.ok(repair.includes('新しく描き直さず'));assert.ok(repair.endsWith(plain));
applyCollection('halloween');
console.log('PASS v11 handoff: obsolete sample metadata cannot affect prompts; character identity stays with the user reference; landscape generation works without attachments; face/body instructions suppressed; restricted media/colors agree; image output and redisplay instructions are explicit.');
