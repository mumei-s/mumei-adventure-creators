import {colorPolicy} from './color-policy.js?v=28.4.1';
import {halloweenSceneFocus} from './scene-presets.js?v=28.4.1';

const seasonal=/Halloween|HALLOWEEN|ハロウィン|ハロウィーン/i;
export const isHalloweenMode=collection=>collection!=='everyday';
export function halloweenTitle(text){return seasonal.test(text)?text:'Halloween｜'+text;}

// This context owns reader-facing story content only. Camera, paint, palette,
// pose and output settings must never become editorial subject matter.
export function halloweenStoryContext(context){
 if(context.collection==='everyday')return context;
 const selectedStory=context.selectedStory||context.story;
 const ghost=/怪談|幽霊|亡霊|怪異|妖狐|百鬼|呪|墓|悪夢|脱出|鏡/.test(selectedStory);
 const making=/創作|制作|ものづくり|アトリエ|工房|機械|墨/.test(selectedStory);
 const journey=/旅|駅|探|異界|境界|宇宙/.test(selectedStory);
 const quiet=/静か|茶|読書|休日|朝/.test(selectedStory);
 const event=ghost?'Halloweenの夜にだけ起きる不思議な出来事':making?'Halloweenの祝祭を迎える準備':journey?'Halloweenの夜に開く一夜の旅':quiet?'Halloweenを静かに楽しむひととき':'Halloweenの一夜に開かれる祝祭';
 const purpose=ghost?'Halloweenの夜に残された謎と帰り道をたどる':making?'Halloweenの祝祭へつながる手がかりを見つける':journey?'Halloweenの一夜だけ開く道の先を確かめる':quiet?'Halloweenの灯りのそばで小さな物語を見つける':'Halloweenの祝祭に残る贈り物と秘密をたどる';
 return {...context,collection:'halloween',selectedStory,story:halloweenTitle(selectedStory),season:'Halloween',event,purpose,
  featureAngles:['Halloweenの一夜の目的と出来事','この場所に残る祝祭の手がかりや怪異','読者がこのHalloweenの物語をたどる体験']};
}

export function halloweenCopyRules(context={}){
 if(context.collection==='everyday')return [];
 return [
  '自動の題名・誌名・新聞題字・見出し・紹介・本文はすべて、同じHalloweenの物語の中の内容として編集する。一般の怪談や創作記事へ戻さず、祝祭の目的、この場所の出来事、残された手がかりを具体的につなぐ。',
  '10月31日は創作世界のHalloweenの季節設定として扱い、実在のイベントの開催日、会場、取材、参加実績を確認した事実として書かない。確認できた作者の公開題材を使う場合も、その題材をHalloweenの創作特集につなぎ、本人が実際に参加したと捏造しない。',
  'Halloweenという単語を題名に一度付けるだけで本文の季節化を済ませない。短い原稿なら一つの季節の出来事、長い原稿なら出来事・場所・目的の関係を読者向けの言葉で伝える。作品内へモードの仕様説明や画像生成の命令を印字しない。',
  'ユーザーが印字原稿として明示した短文や名前はそのまま保つ。文字なし・セリフのみ・名前のみなどの文字範囲を守り、Halloween説明を追加するために許可された役割や文字量を増やさない。'
 ];
}

export function halloweenModeContract(values={}, {collection=values.collection||'halloween',noPerson=false}={}){
 noPerson=noPerson||/風景を主役|モチーフだけ|紋章・アイコン/.test(values.costume||'');
 if(!isHalloweenMode(collection)){
  const sections=[{label:'通常版の自由な世界',text:'通常版は日常・幻想・ホラー・怪談・季節企画など、選択した世界を自由に描く。Halloweenを自動で付与せず、明示されたテーマだけに季節の内容を適用する。主題・画材・場所・衣装・カメラ・ポーズ・文字設定を保つ。'}];
  return {known:true,collection:'everyday',sections,checks:['通常版の選択した世界を維持し、Halloweenを自動追加しない'],method:sections[0].text};
 }
 const theme=values.theme||'選択したテーマ',place=values.place||'選択した舞台',policy=colorPolicy(values);
 const focus=halloweenSceneFocus(theme);
 const nonPersonSource=['scenery','mark-object'].includes(values.sourceKind);
 const identity=nonPersonSource
  ?'この主参照には人物の識別基準がない。人物を描く衣装・主役の選択が明示されている場合だけ、入力の固有形・色・紋様・構造を衣装や小道具へ翻案した独自の主役を作る。非人物の画像から同じ人物の顔を復元したとは扱わない。修正では既に生成した独自の主役の識別特徴を保ち、元の景色・マーク・物体を新たな顔の基準にしない。専用宝石原画を含む画風原画のキャラクター・顔・髪型・衣装は借用しない。'
  :'同じ主参照の識別特徴・年齢感・性別表現を保つ。';
 const sections=[
  {label:'Halloween版／すべての形式の共通世界',text:'今回の完成品は、通常の一枚絵・怪談・新聞・雑誌・広告・カード・図案を含むすべての形式でHalloween版にする。物語「'+theme+'」と舞台「'+place+'」を捨てず、10月31日のHalloweenの祝祭、準備、夜の集まり、またはその夜に起きる怪異の一場面へ翻案する。夜を基本にし、朝や昼を明示したテーマは当日の準備や昼の祝祭として時刻を保つ。'},
  {label:'Halloween版／出来事と場所をつなぐ',text:(focus?focus+' ':'')+'選んだテーマ固有の出来事と目的を、舞台の支持面・通路・境界・生活道具へ接続する。菓子の受け渡しの対象、祝祭の準備や終わった痕跡、一夜の招待や怪異の原因など、テーマに合う意味のある関係を一つ決め、同じ場所の光と空気へつなぐ。カボチャを一個置く、文字だけHALLOWEENにする、普通のホラーを描くだけで全体がHalloweenとして成立したと判定しない。'},
  {label:'Halloween版／選択主題と画材の保持',text:noPerson?'人物なしを保ち、祝祭の出来事を景物・物体・配置・痕跡・明暗で表す。幽霊、客、人型の影やマネキンを季節の説明のために補わない。紋章・抽象・物だけの形式では、主題の形と余白へHalloweenの出来事を整理し、広い背景へ交換しない。':identity+'衣装は選択した形と被覆を守り、普通の服を選んだ場合は同じ服でHalloweenの場面にいる人物として描く。季節を理由に魔女服、仮面、猫耳、角へ着替えさせない。仮装や怪物の役柄を明示している場合だけ、その選択を実行する。'},
  {label:'Halloween版／カメラ・動作・限定色の保持',text:'画材・描線・光学は選択した作風のまま保つ。カメラの高さ・方向・距離・画角と選択した支持・ポーズ・表情を固定し、祝祭の説明のために別の行為へ変更しない。動作の対象を描けない場合は、同じ動作の周囲にある出来事の痕跡で季節を示す。使用色は「'+policy.allowed+'」。季節の灯り、菓子包み、装飾、怪異の反射も許可色の濃淡へ翻訳し、定番の色を限定配色の外から追加しない。'},
  {label:'Halloween版／誌面原稿も同じ世界',text:halloweenCopyRules({collection:'halloween'}).join(' ')}
 ];
 const checks=['すべての選択形式でHalloweenの出来事・場所・目的がつながる','飾り一個や題名だけで季節の成立と扱わない','選択主題・画材・衣装・被覆・カメラ・支持を保持する','限定色で季節の灯りと痕跡を成立させる',noPerson?'季節の説明に人物や人型を追加していない':'普通服を勝手に仮装へ交換していない','許可された自動原稿も同じHalloween世界の内容である'];
 const method=sections.map(s=>s.text).join(' ');
 return {known:true,collection:'halloween',sections,checks,method,executionMethod:method};
}
