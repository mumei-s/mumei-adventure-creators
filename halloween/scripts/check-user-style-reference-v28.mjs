import assert from 'node:assert/strict';
import fs from 'node:fs';
import {initialSelections} from '../modes.js?v=28.3.1';
import {resolveSelections} from '../catalog.js?v=28.3.1';
import {applyCollection} from '../collection.js?v=28.3.1';
import {buildDirection} from '../direction.js?v=28.3.1';
import {productionPlan} from '../production-plan.js?v=28.3.1';
import {composePrompt} from '../prompt.js?v=28.3.2';
import {drawingReferenceFor} from '../drawing-references.js?v=28.3.1';

// A user-provided style sample is not another character reference, nor a
// license to reuse the style sample's person, layout, objects or exact colours.
const root=new URL('../',import.meta.url);
const app=fs.readFileSync(new URL('app.js',root),'utf8');
const html=fs.readFileSync(new URL('index.html',root),'utf8');
const draft=fs.readFileSync(new URL('creator-draft.js',root),'utf8');
for(const id of ['image-input','style-image-input','pick-image','pick-style-image']){
 assert.ok(html.includes('id="'+id+'"'),id+' must have a distinct UI control');
}
assert.match(html,/画風見本は描線・塗り・光と影/);
assert.match(app,/addFiles\(e\.target\.files,'style'\)/,'Style upload must carry the style role');
assert.match(app,/preferredRole==='style'\?'style'/,'Style must never default to character identity');
assert.match(app,/replacement=refs\.find\(x=>x\.role==='support'\)/,'Removing a character may only promote supporting identity, never style or avoid');
assert.match(app,/'style','画風見本（線・塗り・光）'/);
assert.match(app,/x\.role==='style'\?'画風見本（描き方のみ）'/);
assert.match(draft,/roles=new Set\(\['identity','style','support','avoid'\]\)/,'Saving and restoration must accept style as a distinct role');
assert.match(app,/clearPreparedResult\(\);renderRefs\(\);persistDraftReferences\(\)/,'Role changes invalidate the old prompt');
const common=[
 {name:'my-original-character.png',role:'identity'},
 {name:'custom-style-sample.png',role:'style'},
 {name:'older-failed-picture.png',role:'avoid'},
 {name:'custom-motif.png',role:'support'}
];
const random=()=>0.34;
let count=0;
for(const collection of ['halloween','everyday']){
 applyCollection(collection);
 for(const medium of ['宝石光彩アニメ','宝石光彩リアル','透明水彩']){
  for(const noPerson of [false,true]){
   const values=resolveSelections({...initialSelections(),sceneUnified:true,
    medium,theme:'街角アニメ日和',costume:noPerson?'風景を主役にする':'参照画像の衣装を生かす',
    palette:'モノクローム',type:'文字を一切入れない',line:'セリフなし'},random);
   values.sourceKind=noPerson?'scenery':'illustration-person';
   const profile={displayName:'Original Author',activityEnabled:false};
   const variant=buildDirection([],values.mood,random,collection,values);
   const plan=productionPlan(profile,values,variant,collection,random);
   const reference=drawingReferenceFor(medium);
   const refs=[...(reference?[reference]:[]),...common];
   const prompt=composePrompt({collection,creator:'',profile,values,variant:plan.variant,
    references:refs,edition:'STYLE-ROLE-REGRESSION',preparedPlan:plan});
   assert.match(prompt,/custom-style-sample\.png：利用者が添付する画風見本/);
   assert.match(prompt,/見本の人物・顔・髪・衣装・装飾・背景・構図・文字・元の配色を複写しない/);
   assert.match(prompt,/主参照の人物・景物の識別特徴、今回の衣装・ポーズ・カメラ・配色を優先/);
   assert.match(prompt,/【キャラクター参照と画風見本は別の役割】/);
   assert.match(prompt,/older-failed-picture\.png：似せてはいけない前作/);
   assert.match(prompt,/my-original-character\.png：/);
   if(reference)assert.match(prompt,new RegExp(reference.name.replaceAll('.','\\.')));
   count++;
  }
 }
}
applyCollection('halloween');
console.log('PASS user style reference: '+count+' generation contracts; distinct upload controls, persistent role, preservation of character/scene/colour selection, unpromoted style and old-image roles, separate jewel originals. Visual generation and mobile share are separate checks.');
