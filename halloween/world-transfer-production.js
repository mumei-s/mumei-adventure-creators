import {referenceAuthorityInstructions,requiresPrimaryReference} from './reference-authority.js';
import {volumetricReferenceMedia} from './attachment-policy.js?v=28.4.6';
import {stylePresetFor} from './style-presets.js?v=28.4.6';
import {isNonHumanSource} from './source-kind.js?v=28.4.6';
import {colorPolicy} from './color-policy.js?v=28.4.6';
import {focusedDrawingInstructions,focusedSceneStageMaterial,focusedLayoutLines,renderFocusedChatInput} from './focused-production.js?v=28.4.6';
import {worldTransferLayoutStage,worldTransferLayoutMaterial} from './world-transfer-layout.js?v=28.4.6';

export const usesWorldTransferProduction=plan=>volumetricReferenceMedia.includes(plan?.values?.medium);
const entries=refs=>Array.isArray(refs)?refs:refs?.references||refs?.refs||[];
const sceneKeys=['theme','costume','pose','mood','angle','palette'];
const generated=(role,name)=>({role,name,generated:true,requiresActualImage:true});
const selected=(plan,keys)=>plan.conditions.filter(condition=>keys.includes(condition.key)).map(condition=>condition.name+'＝'+condition.value).join('／');
const styleFor=(plan,refs)=>entries(refs).find(ref=>['style-preset','drawing'].includes(ref.role)&&(!ref.medium||ref.medium===plan.values.medium))||stylePresetFor(plan.values.medium);
const explicit=plan=>Object.fromEntries(['hair','hairstyle','appearance','proportions','characterProportions','headRatio','expression'].filter(key=>plan.values[key]!==undefined&&plan.values[key]!==null&&plan.values[key]!=='').map(key=>[key,plan.values[key]]));
const identitySubject=(plan,{finalColor=false}={})=>plan.noPerson?'人物なしの選択景物・物体・構造':isNonHumanSource(plan.values)?'非人物入力を翻案した独自の主役':'本人の識別特徴・実際の髪型'+(finalColor&&colorPolicy(plan.values).restricted?'と許可色の明度・固有形へ翻訳した髪瞳の識別':'と髪瞳の基礎色')+'・年齢感・性別表現・体格・基本頭身';

// Source-dependent selections travel as verified observations, never as a
// reattached source photo or an invented description of unseen clothing.
export function worldTransferSourceObservationRequirements(plan){
 if(!usesWorldTransferProduction(plan))return [];
 const v=plan.values,nonHuman=isNonHumanSource(v);
 return [
  ...(!plan.noPerson&&v.costume==='参照画像の衣装を生かす'?[{key:'costume',sourceField:'costume',value:v.costume,scope:nonHuman?'非人物入力の可視の固有形・色・紋様・構造・材質。入力に着用人物の衣装はなく、確認した特徴を独自の衣服や小道具へ翻案する。存在しない襟・袖・丈や着用服を保持したとは扱わない。':'実際に見える衣装の裁断・襟袖丈・重なり・留め具・識別模様・材質・被覆・靴・服に固定された装身具。背景の小物や手持ち品を含めず、隠れた構造を断定しない。'}]:[]),
  ...(v.palette==='参照画像の色を生かす'?[{key:'palette',sourceField:'palette',value:v.palette,scope:'主参照で実際に見える色と、主色・副色・差し色の大面積と小面積の割当。画風原画の仮配色と取り違えない。'}]:[]),
  ...(v.place==='参照風景を舞台にする'?[{key:'theme',sourceField:'place',value:v.place,scope:'主参照で確認できる景物・建物や地形・支持面の構造と近景／遠景の前後配置。写っていない名所や建物を補わず、人物の顔や服を景観の識別資料にしない。'}]:[])
 ].map(requirement=>({...requirement,sourceRole:'identity',actualImageRequired:true,readBeforeWorld:true}));
}

export function resolveWorldTransferSceneSourceObservations(stage,observations=[]){
 if(!stage?.sourceObservationRequirements?.length)return stage;
 const supplied=Array.isArray(observations)?observations:Object.values(observations||{});
 const notes=stage.sourceObservationRequirements.map(requirement=>({requirement,note:supplied.find(note=>note.key===requirement.key&&note.sourceField===requirement.sourceField&&note.value===requirement.value&&note.confirmed===true&&note.actualImageReviewed===true&&note.sourceRole==='identity'&&typeof note.text==='string'&&note.text.trim())}));
 if(notes.some(({note})=>!note))return {...stage,blocked:true,readyForImageInput:false,references:[],prompt:'【主参照の観察未確認：この回の画像生成を停止】\n'+notes.filter(({note})=>!note).map(({requirement})=>requirement.sourceField+'の実画像で確認した具体的な観察が必要。').join('\n')+'未確認の衣装・色・景観を推測せず、元の主参照を再添付して代用しない。'};
 return {...stage,blocked:false,readyForImageInput:true,sourceObservations:notes.map(({note})=>({...note,text:note.text.trim()})),prompt:stage.prompt+'\n元の主参照を実画像で確認して確定した今回の資料：\n'+notes.map(({requirement,note})=>requirement.sourceField+'：'+note.text.trim()).join('\n')+'\nこの資料は該当する選択の構造・色・景観だけへ適用し、資料の見出しや観察文を作品内へ印字しない。'};
}

export function worldTransferWorldStage(plan,refs=plan?.referenceManifest||[]){
 if(!usesWorldTransferProduction(plan)||(plan.issues||[]).some(issue=>issue.severity==='error'))return null;
 const style=styleFor(plan,refs),source=entries(refs).find(ref=>ref.role==='identity'),real=plan.values.medium==='立体光彩リアル';
 const shape=plan.noPerson?(real?'自然な景物・物体の外形・厚み・微細構造と実物の材質':'整理したアニメの景物・物体の外形と面構造、連続した立体陰影と素材別の艶'):real?'自然な頭蓋・眼球・鼻・唇・身体の立体と、皮膚・髪・布の実物の材質':'アニメ／トゥーンの顔と身体の形、髪の束、連続した立体陰影と素材別の艶';
 const action=plan.noPerson?'選択された景物・物体・構造を作る。主参照がある場合はその固有形と構造を使う。人物・顔・人体・手足・人型を追加しない。':isNonHumanSource(plan.values)?'主参照の景色・マーク・物体の固有形・色・紋様・構造を衣装や小道具へ翻案した独自の主役を作る。元入力から本人の顔・髪・年齢・性別を復元したと主張しない。':'主参照の本人だけを描く。本人の輪郭・眉と目鼻口の特徴的な組合せ、実際の髪型と髪瞳の基礎色、年齢感・性別表現・体格・基本頭身、自然に生える角・耳や固有の印を保つ。ちびの頭・短い胴体と四肢を通常頭身へ伸ばさない。着脱可能な仮装の角・動物耳のカチューシャ・装身具は本人の生来の特徴と区別し、今回の選択が指定する場合だけ使う。本人画像の撮影光・撮影背景を写す必要はなく、衣装・姿勢などの完成条件は後の場面工程で適用する。';
 const prompt=[...referenceAuthorityInstructions(plan.values,refs),
  (source||requiresPrimaryReference(plan.values)?'利用者の主参照を人物・主題の識別の土台にする。':'元画像を必要としない選択景物・物体を制作の土台にする。')+'選択画風原画は描法だけの資料。全可視面の局所反射色層と広い深暗部、小さく鋭い強光、造形と材質を同じ密度で再構築する。原画の人物・顔・髪・体格・衣服・小道具・背景・姿勢・構図を採用しない。'+action,
  '描法は「'+plan.values.medium+'」。'+shape+'で'+identitySubject(plan)+'を構築し、原画と同じ密度の色反射と深い陰影を維持する。'+(!real&&!plan.noPerson?'元写真の顔や肌の表面を貼り戻さず、識別特徴を原画の造形へ翻訳する。':''),
  (plan.noPerson?'物体の支持と遮蔽を保つ。':'閉眼・髪なし・元々ある髭・被覆・遮蔽は保ち、光のために隠れた目や肌を露出させない。')+(Object.keys(explicit(plan)).length?'明示条件：'+JSON.stringify(explicit(plan))+'。':''),
  '文字や新しい図版を追加せず、編集した画像1枚を通常表示する。これは原画の世界を保つ中間画像で、選択衣装や版面を実行済みの完成作品ではない。'].join('\n');
 return {key:'world',kind:'world-swap',prompt,references:[source,style].filter(Boolean),conditionKeys:['medium'],outputRole:'world-base',requiresVisualVerification:true,acceptance:[identitySubject(plan)+'を保つ','原画の視覚世界と造形・材質','全可視面の反射と深い影']};
}

export function worldTransferSurfaceStage(plan,refs=plan?.referenceManifest||[]){
 if(!usesWorldTransferProduction(plan)||(plan.issues||[]).some(issue=>issue.severity==='error'))return null;
 const style=styleFor(plan,refs),real=plan.values.medium==='立体光彩リアル';
 const shape=plan.noPerson?(real?'自然な景物・物体の厚みと微細構造・実物の材質を、連続階調で構築する。':'整理したアニメの外形と面構造を、連続した立体曲面・陰影・素材別の艶で構築する。'):real?'自然な頭蓋・眼球・鼻・唇・人体の厚み、皮膚の散乱・毛流・実物の材質を、連続階調で構築する。':'本人の目鼻口と輪郭の特徴を保つアニメ／トゥーンの形、整理した頬と顎、簡潔な鼻唇、髪の束を、連続した立体曲面と陰影で構築する。写真の微細寸法や鼻唇の表面を固定せず、主役の識別特徴の組合せを原画の造形へ翻訳する。';
 const visible=plan.noPerson?'主景・物体・支持面・可視背景': '開いて見える瞳・額・頬・鼻・唇・耳・首・手指・脚・足・存在する髪・衣装';
 const prompt=['1枚目の直前の世界差替画像を編集する。'+identitySubject(plan)+'、衣服、背景の世界、姿勢、構図を保ち、未達の造形と可視面の光・影だけを修正する。'+shape,
  '2枚目の選択原画と同密度の薄い反射色層、小さく鋭い強光、広く深い有彩色の暗部を、'+visible+'の各曲面へ連続させる。'+(plan.noPerson?'人物・顔・人体・手足・人型を追加しない。':'特に顔肌へ環境の色の照り返しと立体影を面として返し、瞳へ暗い芯・層の奥行き・小さな環境反射を描く。普通の顔肌へ光点を足すだけにしない。'),
  '反射色は原画の光の色を保つ。この段階では最終配色や衣装・場面を適用しない。'+(plan.noPerson?'物体の支持と遮蔽':'閉眼・髪なし・被覆・遮蔽')+'を保ち、不透明な材質をガラス化しない。背景や衣服を作り替えず、修正した中間画像1枚を通常表示する。元の人物写真・元イラストは再添付しない。'].join('\n');
 return {key:'surface',kind:'surface-repair',optional:true,appliesWhen:'実画像で造形または可視面の色反射・深暗部が原画から離れている場合だけ',prompt,references:[generated('world-base','直前に生成した世界差替画像'),style].filter(Boolean),conditionKeys:['medium'],outputRole:'world-base',requiresVisualVerification:true,acceptance:[identitySubject(plan)+'を保つ','可視全域の造形・色反射・深暗部が原画と同じ世界にある']};
}

export function worldTransferSceneStage(plan,refs=plan?.referenceManifest||[],{key='scene',keys=sceneKeys,inputRole='world-base',inputName='実画像で確認した世界差替画像',sourceObservations}={}){
 if(!usesWorldTransferProduction(plan)||(plan.issues||[]).some(issue=>issue.severity==='error'))return null;
 keys=[...keys,...(keys.includes('theme')&&plan.conditions.some(condition=>condition.key==='place')?['place']:[])];
 const scoped=entries(refs),sheet=scoped.find(ref=>ref.role==='selection-sheet'),visuals=sheet?[{...sheet,readKeys:keys}]:scoped.filter(ref=>ref.role==='selection-condition'&&keys.includes(ref.key)),whole=sceneKeys.every(key=>keys.includes(key)),sourceObservationRequirements=worldTransferSourceObservationRequirements(plan).filter(requirement=>keys.includes(requirement.key));
 const prompt=['1枚目の確認済み画像を編集の土台にする。'+identitySubject(plan,{finalColor:keys.includes('palette')})+'と、確認済みの「'+plan.values.medium+'」の造形・素材・全可視面の局所反射と深暗部を保ち、今回の担当選択だけを同じ視覚世界へ移す。',
  '今回変更する条件：'+selected(plan,keys)+'。'+(whole?'選択衣装・場面・ポーズ・表情・投影・配色を描き直す。':'この回で担当しない衣装・場面・姿勢・投影・配色は現在像を保ち、次の担当回へ渡す。'),
  ...(!plan.noPerson&&keys.includes('costume')?['仮の画風原画から残った衣服・装身具・飾りは、選択衣装の構造と被覆へ置き換える。残すのは今回の衣装で指定した形・素材・飾りと、生来の角・耳・固有の印などの識別特徴だけ。'+(plan.values.costume==='参照画像の衣装を生かす'?(isNonHumanSource(plan.values)?'入力に着用人物の衣装はない。初回に確認した非人物入力の固有形・色・紋様・構造・材質を独自の服や小道具へ翻案し、存在しない参照衣装を保持したとは扱わない。':'初回に会話側で確認した元の主参照の衣装構造を同じ描法へ翻訳し、仮原画の衣装を参照衣装と取り違えない。'):'')]:[]),
  ...(sourceObservationRequirements.length?['この本文には、初回に元の主参照の実画像で確認した'+sourceObservationRequirements.map(requirement=>requirement.sourceField).join('・')+'の具体的な観察文を追記してから画像入力へ渡す。観察文が未確認・空欄ならこの回を実行しない。ファイル名や一般的な項目説明を観察の代わりにせず、元の主参照は再添付しない。観察文やその見出しを作品へ印字しない。']:[]),
  ...visuals.map(ref=>sheet?'2枚目は役割別見本シート。読むセルは'+keys.join('・')+'だけ。デザイン・文字のセルはこの回で適用しない。各見本から担当条件だけを読み、別人の顔・別の描法・見本文字・複数の図版を移さない。':ref.name+'：'+ref.label+'「'+ref.value+'」の'+ref.scope+'。'),
  '保持する描法：'+focusedDrawingInstructions(plan),
  ...focusedSceneStageMaterial(plan,{keys}),
  plan.noPerson?'物体の固有形・材質・支持と遮蔽を保つ。': '閉眼・髪なし・元々ある髭・人物の基本頭身・衣装の被覆と遮蔽を保つ。光のために隠れた部位を露出させない。',
  'この回は一続きの選択場面1枚だけ。新聞・誌面・カード・文字・枠・副図版をまだ描かない。外周5%以上の安全余白を保ち、要求サイズ「'+plan.values.size+'」に対応する縦横比で描く。元の人物写真・元イラスト・人物差替前の原画は再添付しない。',
  '生成した実画像を表示し、担当条件、主題の識別、同じ造形と全可視面の反射・深暗部を確認する。未達はその領域だけ修正し、確認済みの生成画像を次の回へ渡す。未検査や不合格を完成扱いしない。'].join('\n');
 const stage={key,kind:'scene-edit',prompt,references:[generated(inputRole,inputName),...visuals],conditionKeys:['medium',...keys,'size'],outputRole:'scene-result',requiresVisualVerification:true,sourceObservationRequirements,readyForImageInput:sourceObservationRequirements.length===0,acceptance:[...keys.map(k=>selected(plan,[k])),identitySubject(plan,{finalColor:keys.includes('palette')})+'と確認済みの光彩世界を保つ']};
 return sourceObservations===undefined?stage:resolveWorldTransferSceneSourceObservations(stage,sourceObservations);
}

export function worldTransferPrompts(plan,refs=plan?.referenceManifest||[]){
 if(!usesWorldTransferProduction(plan))return null;
 if((plan.issues||[]).some(issue=>issue.severity==='error'))return null;
 const scoped=entries(refs),stale=scoped.flatMap(ref=>ref.role==='selection-condition'?[ref]:ref.role==='selection-sheet'?ref.conditions||ref.items||[]:[]).filter(ref=>ref.key&&ref.value&&ref.value!==plan.values[ref.key]);
 if(stale.length)return {kind:'world-transfer',internal:true,userPreparationRequired:false,blocked:true,prompt:'【選択の不成立：画像生成を停止】\n添付見本の'+[...new Set(stale.map(ref=>ref.key))].join('・')+'が確定選択と一致しない。今回の選択に合う実資料を確認するまで画像生成へ進まない。',stages:[]};
 const individual=!scoped.some(ref=>ref.role==='selection-sheet')&&scoped.some(ref=>ref.role==='selection-condition'),world=worldTransferWorldStage(plan,scoped),surface=worldTransferSurfaceStage(plan,scoped);
 const scenes=individual?[
  worldTransferSceneStage(plan,scoped,{key:'scene-character',keys:['costume','pose','mood']}),
  worldTransferSceneStage(plan,scoped,{key:'scene-environment',keys:['theme','angle','palette'],inputRole:'scene-result',inputName:'実画像で確認した衣装・姿勢の編集画像'})
 ]:[worldTransferSceneStage(plan,scoped)];
 const layoutStage=worldTransferLayoutStage(plan,{refs:scoped,sceneName:'実画像で確認した選択場面'});
 if(layoutStage?.blocked)return {kind:'world-transfer',internal:true,userPreparationRequired:false,blocked:true,prompt:layoutStage.prompt,stages:[]};
 const layout=layoutStage?{...layoutStage,key:'layout',references:layoutStage.references.map(ref=>ref.generated?{...ref,requiresActualImage:true}:ref),conditionKeys:['design','type','size'],outputRole:'final-result',requiresVisualVerification:true,acceptance:layoutStage.checks}:null;
 if(!layout){
  const finalScene=scenes.at(-1);
  finalScene.conditionKeys.push('design','type');
  finalScene.outputRole='final-result';
  finalScene.prompt+='\nこの画像形式は別の誌面工程を必要としない。この最終場面に次の選択形式の構成だけを適用し、文字・枠・副図版を追加しない。\n'+focusedLayoutLines(plan).join('\n');
  finalScene.acceptance.push(selected(plan,['design','type']));
 }
 return {kind:'world-transfer',internal:true,userPreparationRequired:false,route:individual?'individual':'sheet',status:'requires-generated-image-verification',initialReferences:scoped,stages:[world,surface,...scenes,...(layout?[layout]:[])],
  conditionOwners:{medium:['world','surface',...scenes.map(stage=>stage.key)],theme:[scenes.at(-1).key],...(plan.conditions.some(condition=>condition.key==='place')?{place:[scenes.at(-1).key]}:{}),costume:[scenes[0].key],pose:[scenes[0].key],mood:[scenes[0].key],angle:[scenes.at(-1).key],palette:[scenes.at(-1).key],design:[layout?.key||scenes.at(-1).key],type:[layout?.key||scenes.at(-1).key],size:[layout?.key||scenes.at(-1).key]},
  conditions:plan.conditions.map(({key,name,value})=>({key,name,value})),sourceObservationRequirements:worldTransferSourceObservationRequirements(plan).map(requirement=>({...requirement,stageKeys:scenes.filter(stage=>stage.sourceObservationRequirements.some(item=>item.sourceField===requirement.sourceField)).map(stage=>stage.key)})),finalStage:layout?.key||scenes.at(-1).key,sourceReattachment:false};
}

// Standard delivery is one complete artwork request. The independently scoped
// workflow above remains available for a deliberate repair, rather than making
// intermediate images and file handoffs prerequisites for seeing any result.
export function renderWorldTransferMaster(plan,refs=plan?.referenceManifest||[]){
 if(!usesWorldTransferProduction(plan))return null;
 if((plan.issues||[]).some(issue=>issue.severity==='error'))return renderFocusedChatInput(plan,[]);
 const workflow=worldTransferPrompts(plan,refs);
 if(workflow.blocked)return workflow.prompt;
 const layoutMaterial=workflow.stages.some(stage=>stage.kind==='layout')?worldTransferLayoutMaterial(plan):undefined;
 return [
  '【完成画像の自動制作：利用者の送信は1回】',
  '画像作成機能を実行し、以下の全条件を統合した完成画像1枚を1回で生成して、このチャットの通常の生成画像として表示する。',
  '添付された主参照・画風原画・選択資料を同じ制作入力として読み、本人または指定主題、光と影、全'+plan.conditions.length+'選択、版面と許可原稿を最初から同じ完成画像へ反映する。利用者へ中間画像の保存・命名・再アップロードを求めない。',
  '原稿の確定と参照の読み分けは制作条件の解釈として行う。中間画像の生成・検査・ファイル引継ぎ・再生成を先に並べる手順へ切り替えず、完成画像の生成と通常表示まで進む。',
  ...(workflow.sourceObservationRequirements.length?[
   '【今回の選択が主参照から使う可視情報】',
   '元の主参照の実画像を読み、次の選択に必要な可視情報を今回の完成画像へ直接反映する。利用者へ観察メモや中間画像を用意させず、見えない構造を推測しない。',
   ...workflow.sourceObservationRequirements.map(requirement=>requirement.sourceField+'「'+requirement.value+'」：'+requirement.scope),
   '画風原画の仮の衣装・配色・背景を主参照の情報へ置換しない。必要な主参照そのものが見えない場合だけ、その画像を短く求める。'
  ]:[]),
  renderFocusedChatInput(plan,workflow.initialReferences,{layoutMaterial})
 ].filter(Boolean).join('\n');
}
