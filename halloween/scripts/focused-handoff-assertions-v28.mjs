import assert from 'node:assert/strict';
import {cameraContract} from '../angles.js?v=28.4.4';
import {colorPolicy} from '../color-policy.js?v=28.4.4';
import {designLayoutFor,typographyLayoutFor} from '../layout-preview-specs.js?v=28.4.4';
import {limitedNewspaperLayout} from '../format-recipes.js?v=28.4.4';
import {characterProportionInstruction,isNonHumanSource} from '../source-kind.js?v=28.4.4';

const clauses=text=>(String(text||'').match(/[^。！？]+[。！？]?/gu)||[]).map(clause=>clause.trim()).filter(Boolean);
const includes=(text,value,label)=>assert.ok(text.replace(/\s/g,'').includes(String(value).replace(/\s/g,'')),label+' lost: '+value);
const core={
 '発光幻想アニメ':[/精密な(?:2D)?有色描線|精密な2D有色線/,/平面陰影/,/内部影/,/幻想発光/,/深暗部.*小面積/],
 '薄膜光彩アニメ':[/極細の有色線/,/淡い2D色面/,/少数の深い|少数の深く/,/反射帯|反射色の薄塗り/],
 '白域幾何・宇宙彩アニメ':[/大きな明るい抜き/,/有色(?:構造)?線/,/鋭い平面影/,/宇宙色/,/余白/],
 '艶彩幻想アニメ':[/精密な(?:デジタル)?描線|精密なデジタル描線/,/絵画的連続陰影/,/深い.*影/,/微細な反射/]
};
export function assertFocusedHandoff(plan,text,label='focused actual'){
 const errors=(plan.issues||[]).filter(issue=>issue.severity==='error');
 if(errors.length){assert.match(text,/^【選択の不成立：画像生成を停止】/);for(const issue of errors)includes(text,issue.reason,label);assert.doesNotMatch(text,/【短い統合制作指示】|完成画像.*返す|人物翻訳用入力/);return false;}
 assert.doesNotMatch(text,/undefined|NaN|両手の全指/,label+' has unresolved or forced anatomy');
 assert.equal((text.match(/【短い統合制作指示】/g)||[]).length,1,label+' must contain one final production payload');
 for(const condition of plan.conditions)includes(text,condition.name+'＝'+condition.value,label+' choice '+condition.key);
 const final=text.includes('【統合するための制作仕様：開始】')?text.split('【統合するための制作仕様：開始】')[1].split('【統合するための制作仕様：終了】')[0]:text;
 assert.match(final,/制作の土台・編集の基準|顔と造形の土台・編集の基準/,label+' identity/drawing base is missing');
 assert.match(final,/衣装・舞台・ポーズ・カメラ・配色.*描き直す/,label+' inherits the source scene');
 assert.match(final,/装身具・持物・背景.*引き継がない/,label+' imports costume props');
 assert.match(final,/参照衣装や参照色を明示した場合だけ/,label+' loses explicitly retained clothing/colors');
 for(const expression of core[plan.values.medium])assert.match(final,expression,label+' positive drawing technique');
 assert.match(final,/肌・布・金属をガラス化しない/,label+' changes opaque material');
 assert.match(final,/写真顔・プラスチックCG/,label+' permits photographic substrate');
 const camera=cameraContract(plan.values,{noPerson:plan.noPerson});
 if(camera){for(const clause of clauses(camera.instructions[0]))includes(final,clause,label+' projection');for(const clause of clauses(camera.framing_instruction))includes(final,clause,label+' crop');for(const line of camera.instructions.filter(line=>/^光軸は/.test(line)))includes(final,line,label+' axis occlusion');assert.match(final,/距離調整は同じ光軸上だけ/);}
 else {if(plan.values.angle)includes(final,plan.values.angle,label+' custom angle');if(plan.variant?.camera)includes(final,plan.variant.camera,label+' resolved custom camera');if(plan.variant?.distance)includes(final,plan.variant.distance,label+' resolved crop');}
 if(plan.values.verticalFovDegrees)includes(final,'垂直画角'+plan.values.verticalFovDegrees+'°',label+' explicit FOV');
 if(plan.noPerson){assert.match(final,/人物なし/);assert.match(final,/顔・人体・手足・人型や擬人化を追加しない/);assert.doesNotMatch(final,/顔の向き：|虹彩の縁|髪の束の内部影/);assert.doesNotMatch(text,/人物翻訳用入力/);}
 else {
  if(isNonHumanSource(plan.values)){assert.match(final,/識別資料はない/);assert.match(final,/独自の主役/);assert.match(final,/人物を復元したと主張せず/);}
  else {assert.match(final,/年齢感・性別表現・基礎体格/);assert.match(final,/眉・目鼻口・顎・首/);assert.match(final,/元々ある髭/);for(const clause of clauses(characterProportionInstruction(plan.values)))includes(final,clause,label+' proportions');}
  assert.match(final,/閉眼は閉じたまま、髪なしは髪なし/);assert.match(final,/衣装の被覆/);assert.match(final,/隠れた目や肌.*露出させない/);
  for(const key of ['face','expression','pose'])for(const clause of clauses(plan.variant?.[key]))includes(final,clause,label+' actual '+key);
 }
 const palette=colorPolicy(plan.values);includes(final,palette.allowed,label+' colors');includes(final,'最明部は'+palette.bright,label+' highlight');includes(final,'最暗部は'+palette.dark,label+' shadow');assert.match(final,/配色は作風の明暗差を弱めず/);assert.match(final,/色名から小物を追加しない/);
 if(palette.restricted)assert.match(final,/全領域の識別色・光・反射・文字も許可色の濃淡へ変換/);
 const design=designLayoutFor(plan.values.design);if(design)includes(final,design.signature,label+' design skeleton');
 if(plan.values.design==='新聞の一面'&&limitedNewspaperLayout(plan.values)){const limited=limitedNewspaperLayout(plan.values);includes(final,limited.priority,label+' sparse newspaper');assert.match(final,/6列.*3段/);assert.match(final,/約31%.*上限40%/);assert.match(final,/右2列.*下段/);}
 if(plan.values.design==='通常の一枚絵')assert.doesNotMatch(final,/新聞の一面として6列|限定原稿でも新聞/);
 if(plan.copy.mode==='none')assert.match(final,/文字・数字・署名なし/);
 for(const slot of plan.copy.slots)includes(final,slot.role+'：'+JSON.stringify(slot.text),label+' exact copy');
 for(const slot of plan.copy.generatedSlots||[]){includes(final,slot.role+' / '+slot.maxCharacters+'字以内 / 階層'+slot.priority,label+' generated role');if(slot.contentSources)includes(final,JSON.stringify(slot.contentSources),label+' content source');}
 if(plan.copy.mode!=='none'){assert.match(final,/形式は許可役割や文字量を増やさない/);const type=typographyLayoutFor(plan.values.type);if(type&&plan.values.type!=='デザインに合わせて自動編集'){includes(final,type.quantity,label+' quantity');includes(final,type.direction,label+' direction');includes(final,type.placement,label+' placement');}}
 if(plan.collection==='halloween'){assert.match(final,/Halloween版/);assert.match(final,/10月31日/);assert.match(final,/出来事・この場所・目的/);assert.match(final,/カボチャ一個・題名だけ/);}else assert.match(final,/Halloweenを自動追加しない/);
 includes(final,plan.values.size,label+' requested dimensions');assert.match(final,/実際の生成寸法/);assert.match(final,/実画像.*未達を合格としない/);
 if(text.includes('【人物翻訳用入力：開始】')){assert.match(text,/2段階で実行/);assert.match(final,/prepared-identity\.png/);assert.match(final,/元の人物写真・元イラストを再添付しない/);assert.match(final,/描法だけの資料/);assert.match(final,/顔・性別・髪型・衣服・小道具・背景・構図を完全に除外/);assert.match(text,/不合格の準備画像は修正/);assert.match(text,/人物翻訳が不合格だった場合の修正入力/);}
 return true;
}
