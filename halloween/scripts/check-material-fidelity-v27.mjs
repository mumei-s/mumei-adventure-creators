import assert from 'node:assert/strict';
import {applyCollection} from '../collection.js?v=28.1.1';
import {resolveSelections} from '../catalog.js?v=28.1.1';
import {productionPlan} from '../production-plan.js?v=28.1.1';
import {composePrompt} from '../prompt.js?v=28.1.1';

const profile={displayName:'TEST CREATOR',activityEnabled:false,biography:''};
const random=()=>.25;
const variant={face:'完全な左横顔90度',expression:'両目を閉じて微笑む',camera:'俯瞰',distance:'膝上',pose:'片手を手前へ差し出し、もう片手は腰へ添える'};
const base=resolveSelections({design:'通常の一枚絵',medium:'クリスタル透光アニメ',theme:'宇宙のHalloween',costume:'参照画像の衣装を生かす',place:'星空の砂漠',pose:'片手を差し出す',mood:'完全な左横顔90度',palette:'星灯りの青紫',type:'文字を一切入れない',line:'セリフなし',size:'縦ポスター2:3｜2400×3600｜2:3'},random);
function make(values,mode){
 const plan=productionPlan(profile,values,variant,mode,random);
 return {plan,prompt:composePrompt({profile,values,variant,collection:mode,edition:'MATERIAL TEST',preparedPlan:plan,references:[{name:'reference.png',role:'identity'}]})};
}
let cases=0;
for(const mode of ['halloween','everyday']){
 applyCollection(mode);
 for(const medium of ['クリスタル透光アニメ','宝石ホログラムアニメ','クリスタルホログラム造形アニメ']){
  for(const costume of ['参照画像の衣装を生かす','風景を主役にする']){
   for(const palette of ['星灯りの青紫','金と黒の二色','モノクローム','黒と白と朱の三色','セピア']){
    const values={...base,medium,costume,palette};
    const {plan,prompt}=make(values,mode);
    const style=plan.conditions.find(c=>c.key==='medium');
    assert.ok(prompt.includes(style.execution.method));
    assert.match(prompt,/宇宙の世界観を主画像から削除しない/);
    if(medium==='クリスタル透光アニメ'){
     assert.doesNotMatch(prompt,/陰影は手描きセルアニメの不透明な色面/);
     assert.match(prompt,/段階的な透明色面/);
     if(!plan.noPerson){
      assert.match(prompt,/頬・首・腕・手の広い面も透明な彩色層/);
      assert.match(prompt,/人間として読めるアニメの顔と身体の形/);
      assert.match(prompt,/衣装の被覆を減らさず、骨格や内部器官を透視する表現を追加しない/);
      assert.match(prompt,/閉じた目を開けたり/);
     }
    }
    if(medium==='宝石ホログラムアニメ'){
     assert.doesNotMatch(prompt,/本体は不透明な2D原画のまま保つ|原画を描き、その完成後に光を重ねる/);
     assert.ok(style.sections.some(section=>/最初から.*半透明の投影像/.test(section.text)),'The hologram construction must remain present after artwork criteria are read first');
     if(plan.noPerson)assert.match(prompt,/建築と地形の本体も半透明の投影像へ変換/);
     else assert.match(prompt,/顔・髪・身体そのものが半透明の投影像/);
    }
    if(medium==='クリスタルホログラム造形アニメ'){
     assert.match(prompt,/厚みの違う透明な結晶面|厚みのある透明な結晶ガラス/);
     if(!plan.noPerson){
      assert.match(prompt,/最初に顔そのものを無色の透明な結晶ガラスで造形/);
      assert.match(prompt,/頬の広い面を通して奥の髪や背景の輪郭が見え/);
      assert.match(prompt,/眼瞼・瞳孔・鼻口は結晶内部の細い日本アニメの色線/);
     }
    }
    cases++;
   }
  }
 }
 const mini=make({...base,medium:'精密ミニチュア'},mode);
 assert.doesNotMatch(mini.prompt,/実物大のテクスチャを縮小せず貼り/);
 assert.match(mini.prompt,/模型の部材寸法に対する粒と織りの縮尺を一致させる/);
 const wood=make({...base,medium:'木版画'},mode);
 assert.match(wood.prompt,/深い影は彫り残した版のインク面、光は彫り取って刷らない紙の明部/);
 const minimal=make({...base,medium:'ミニマリズム'},mode);
 assert.match(minimal.prompt,/迫る近景や主役を小さく退かせない/);
 for(const costume of ['参照画像の衣装を生かす','風景を主役にする']){
  const cubist=make({...base,medium:'キュビスム',costume},mode);
  assert.match(cubist.prompt,/指定した視点からの大きなシルエット/);
  const futurist=make({...base,medium:'未来派',costume},mode);
  assert.match(futurist.prompt,/濃度を減らした開いた輪郭/);
 }
}
applyCollection('halloween');
console.log('PASS v27 material fidelity: '+cases+' composed optical mode/person/palette cases; painted transmission and sculptural material remain distinct; main scenery becomes holographic; correct model texture scale, woodcut light, and selected composition through cubist/futurist/minimal styles.');
