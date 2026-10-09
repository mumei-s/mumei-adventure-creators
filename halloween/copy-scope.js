// Reader-facing copy has its own sources. Camera, paint and delivery settings
// remain drawing instructions and are never feature-copy source material.
import {halloweenStoryContext,halloweenCopyRules} from './halloween-mode-contract.js?v=28.4.6';
export const DESIGN_COPY='デザインに合わせて自動編集';
// These formats describe an image or a symbol. Automatic editing must not turn
// their unused space into a title, a slogan and a signature.
export const automaticBlankDesigns=Object.freeze(['通常の一枚絵','キャラクターのキービジュアル','幻想風景画','自然・都市の風景画','映画のワンシーン','物語の挿絵','絵巻物','屏風絵','掛け軸','図案・パターン','アイコン・肖像','紋章・エンブレム','ステッカー','スマホ壁紙']);
export function copyAuthority(values={}){
 const type=values.type||'',input=typeof values.line==='string'?values.line.trim():'';
 const line=['セリフなし','おまかせ'].includes(input)?'':input;
 const automatic=!type||type===DESIGN_COPY||type==='おまかせ';
 const noText=type==='文字を一切入れない'||type==='セリフのみ'&&!line||automatic&&automaticBlankDesigns.includes(values.design);
 return {authority:noText?'none':automatic?'design':'selected',automatic,noText,line};
}
export function copySelectionExplanation(values={}){
 const policy=copyAuthority(values);
 if(policy.noText)return policy.automatic?'このデザインの自動編集は文字なしです。文字を選ぶと、その原稿だけを配置します。':'文字なしを優先します。デザインの題名・名前・本文も追加しません。';
 return policy.automatic?'自動編集では、このデザインに必要な標準原稿を一度ずつ使います。別の文字設定を選ぶと標準原稿を置き換えます。':'この文字設定の原稿だけを使い、デザインの標準の題名・名前・本文は追加しません。画像領域と余白は選んだデザインを保ちます。';
}
export function copyAllowsDialogue(values={}){
 const policy=copyAuthority(values);
 if(policy.noText||!policy.line)return false;
 if(values.type==='セリフのみ')return true;
 // A chosen manuscript owns its role list. The separate remembered dialogue
 // must not append a new role to a poem, credit block or name-only card.
 if(policy.authority==='selected')return false;
 return !['写真集の表紙','絵本の表紙','小説の装丁','音楽アルバムジャケット','タロットカード','トレーディングカード','ゲームのパッケージ','図鑑の扉','noteサムネイル','切手','ポストカード'].includes(values.design);
}
export const copyContentRules=Object.freeze([
 '文字なしを最優先にし、明示した文字設定はデザインの標準原稿を置き換える。デザインは画像領域・枠・列・余白を決め、印字原稿を独立に増やさない。同じ名前や文章を、未許可の別の役割へ追加して補わない。',
 '自動で編集する印字原稿は、作品世界内の出来事・対象・目的・場所を紹介する読者向けの言葉、または確認済みの作者の公開活動を紹介する言葉にする。画像の作り方やこの依頼の仕様を自己解説する文章にはしない。',
 'アングル・真上や真下の角度・顔の向き・ポーズ指定・配色名・深暗部や反射の描画条件・画材工程・解像度・dpi・px・画像生成・AI・プロンプト・検査条件を、商品紹介、特徴、見どころ、記事本文へ言い換えて印字しない。仕様資料は原稿のネタではない。',
 '原稿の役割名、特徴1などの管理用番号、編集依頼、内容のネタ、字数制限、制作番号、ID、URLは印字しない。先に許可された役割だけの完成原稿を確定し、その完成文字列だけを画像生成用の印字原稿欄へ渡す。',
 '作者に関する事実は確認できた公開活動だけを使い、実際の発言・取材・販売・効果・資格・価格・日付・会場を捏造しない。ユーザーが印字原稿として明示した文字列はそのまま保ち、一般の制作仕様を印字原稿と解釈しない。'
]);

const technicalTopic=/アングル|カメラ|\d+(?:\.\d+)?\s*(?:度|dpi|px)|解像度|プロンプト|画像生成|描画工程|作画条件|参照画像|おまかせ|風景を主役|モチーフだけ|紋章・アイコン/i;
const topic=(value,fallback)=>typeof value==='string'&&value.trim()&&!technicalTopic.test(value)?value.trim():fallback;
export function publicCopyContext(values={}, {subject,noPerson=false}={}){
 const story=topic(subject||values.theme,'一つの物語'),setting=topic(values.place,'この世界'),protagonist=noPerson?'':topic(values.costume,'旅人');
 const escape=/脱出|逃走|悪夢/.test(story),journey=/旅|冒険|探|境界|異界/.test(story);
 const purpose=escape?'出口と帰り道を探す':journey?'まだ知らない場所の手がかりを探す':'この場所に残る小さな出来事を見つける';
 const context={domain:'story_world',collection:values.collection==='everyday'?'everyday':'halloween',story,setting,protagonist,purpose,
  featureAngles:['世界内の目的と挑戦','この場所で出会うものや秘密','読者に呼びかける探索や物語の体験']};
 return context.collection==='everyday'?context:halloweenStoryContext(context);
}
export function worldIntroduction(context){
 if(context.collection==='halloween')return context.setting+'で始まる、'+context.event+'。'+(context.protagonist?context.protagonist+'と、':'')+context.purpose+'。'+context.story+'へ、あなたも。';
 return context.protagonist?context.setting+'で、'+context.protagonist+'が'+context.purpose+'。'+context.story+'へ、あなたも踏み出してみませんか。':context.setting+'に残る秘密をたどる、'+context.story+'。この場所から始まる物語へ。';
}
export function worldFeatureCopy(context){
 if(context.collection==='halloween')return [context.purpose+'。',context.setting+'に残る、Halloweenの一夜の手がかり。',context.protagonist?context.protagonist+'と、Halloweenの物語の先へ。':'この場所に残る、Halloweenの祝祭の記憶。'];
 return [context.purpose+'。',context.setting+'に残る秘密をたどる。',context.protagonist?context.protagonist+'と、物語の先へ。':'この場所で、次の発見を。'];
}
export function copyRoleSources(context,domain='story_world'){
 return domain==='public_activity'?{domain,verifiedSource:'作者の活動説明と公開記事本文で確認できる活動・題材・読者へ届ける内容',storyConnection:{story:context.story,setting:context.setting,...(context.collection==='halloween'?{season:context.season,event:context.event}:{})}}:context;
}
export function copyEditingInstruction(context,{domain='story_world'}={}){
 const source=domain==='public_activity'?'作者の活動説明と公開記事本文で確認できる創作活動・扱う題材・読者へ届けたい内容を根拠に、新しい日本語の紹介原稿を作る。元記事を転載せず、本人の発言や未確認の実績として見せない。':'作品世界内の読者向け紹介原稿を作る。内容のネタは物語「'+context.story+'」、場所「'+context.setting+'」'+(context.protagonist?'、世界内の主役「'+context.protagonist+'」':'')+'、目的「'+context.purpose+'」だけ。世界内の出来事として言葉にし、カメラ・画風・配色・描画手順の指定を説明しない。';
 return source+copyContentRules.join('')+halloweenCopyRules(context).join('');
}
