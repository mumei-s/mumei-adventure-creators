import {visibleQuestions} from './catalog.js?v=12';
import {CRYSTAL_ANIME,crystalAnimePalette} from './crystal-anime.js?v=12';
import {visualSpec} from './visual-specs.js?v=12';
import {formatContract} from './formats.js?v=12';
import {buildEditorial,editorialContract} from './editorial.js?v=12';
const sceneOnlyThemes=Object.fromEntries(`
朝の光と小さな日常=朝日が差す窓、使用途中のカップ、整えた生活の道具で静かな朝を描く
旅先で見つけた景色=初めて眺める土地の地形や建築を大きく見せ、手前から遠景へ続く道で旅の発見を表す
大切な人との再会=二つのカップ、向かい合わせの椅子、待ち合わせの痕跡で再会の気配を描く
ものづくりの時間=使った道具、素材の切り口、制作途中の作品を作業台に置き、制作の途中を表す
季節を歩く=一つの季節の草木、続く道、自然な風や光の変化で散歩の時間を表す
街角のファッション=布の素材と仕立てが読める衣服の展示や店先を主題にし、人物や人型マネキンを追加しない
静かな読書の時間=開いた本、読書の椅子、窓光と頁の影で静かな時間を描く
星明かりを集める旅=選んだ舞台の中の星の光と集められた光の痕跡で、人物のいない幻想的な旅を示す
月夜の仮面舞踏会=置かれた仮面、舞踏会の装飾、流れた布と床の光で一夜の祝祭を示す
真夜中の魔女のアトリエ=調合途中の器と素材、開いた本、使用途中の道具で魔女の制作の痕跡を示す
忘れられた劇場=古い台本、使われない幕と演目の道具で忘れられた舞台の時間を示す
幽霊たちのお茶会=誰も座っていない茶卓でカップが少し浮き、湯気と皿の配置が幽霊の気配を示す
秘密の図書館=鍵、隠された本、開いた頁と書庫の痕跡で秘密の発見を示す
異界に続く駅=異界への切符、開いた入口、行き先を感じる光で出発前の場面を示す
鏡の向こうの自分=選んだ景物と鏡像の形を対応させ、一か所だけ異なる反射で主題を表す
星を集める旅=星を集める道具と集まった光の断片、続く道で旅の途中を示す
眠らない美術館=誰もいない展示の中で展示物だけが僅かに動き、夜の美術館の出来事を示す
一夜だけの怪奇サーカス=演目の道具、揺れる幕、置かれたチケットで奇妙な公演の痕跡を示す
吸血鬼の晩餐会=整えた晩餐の席、招待状、杯の配置で吸血鬼の集いを示す。人物や流血は描かない
死神の休日=脇へ置いた大鎌、休憩の椅子、日常の小道具で死神の不在の休暇を示す
魔法使いの見習い=練習途中の道具、未完成の魔術の痕跡、小さな成功や失敗の跡を示す
悪夢からの脱出=迫る夢の障害と抜け道、その先の光で逃れる方向と結果を示す
百鬼夜行=妖怪の祭りの道具や灯りが一方向に続く列を描き、人型の妖怪は置かない
妖狐と月の契約=狐の印を持つ契約書、結び目、月を示す象徴で誓いの痕跡を描く
海賊船の亡霊=航海の道具、古い帆、羅針盤と不可思議な揺れで亡霊船の記憶を示す
宇宙のHalloween=無重力で浮かぶ選択された仮装の小物や祝祭の道具を、一定の慣性と光で描く
機械仕掛けの怪物=動き始めた機構、関節、歯車と作業の痕跡で機械の出来事を示す。人型の身体は作らない
呪われたオルゴール=開いたオルゴールと周囲へ伝わる不可思議な変化で呪いの起点を示す
お菓子の王国=菓子の素材からできた道具や象徴を選択舞台へ組み込み、甘い主題を表す
カボチャの収穫祭=籠に集まった収穫物、蔓と葉、祭りの飾りで収穫の喜びを表す
都会の仮装パレード=仮装の小物、連続する飾り、進行方向に沿う紙吹雪の痕跡で行列の通過を示す
花と骸骨の祝祭=花と骸骨を象る祭りの飾り、供える道具の配置で祝いの場を示す
墨で描く怪異=墨の道具と跡から不思議な形が生まれる場面を描く。選択画風は変えず、人型の顔や手足を加えない
光と影の寓話=景物と投影された影の形を意味で対比させ、光源と影の方向を揃える
記憶の標本室=手紙や小物を標本として整理し、一つだけ選ばれた配置で記憶の主題を示す
異世界のファッションショー=異世界の衣装の展示、布の流れ、舞台の照明で発表の痕跡を示す。人物や人型マネキンは置かない
雨上がりの怪談=雨の痕跡と景物の一か所の異変で、気づく前後を想像できる場面を描く
静かなハロウィーン=小さな仮装の道具と控えめな灯りを整え、人物のいない静かな祝祭を描く
`.trim().split('\n').map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1)];}));
function sceneryTheme(value){return sceneOnlyThemes[value]||visualSpec('theme',value).text;}
export function productionPlan(profile,values,variant,collection='halloween',random=Math.random){
 const noPerson=/風景を主役|モチーフだけ|紋章・アイコン/.test(values.costume);
 const monochromeMedium=/モノクロ|^水墨画$|^鉛筆デッサン$|^木炭画$/.test(values.medium),cyanotype=values.medium==='サイアノタイプ';
 for(const key of ['design','medium','theme','costume','mood','place','pose','palette','type','line','size'])if(typeof values[key]!=='string'||!values[key].trim()||(values[key]==='おまかせ'&&!(noPerson&&['mood','pose'].includes(key))))throw new Error('制作条件「'+key+'」が未確定です。');
 if(!/^.+｜\d+×\d+｜\d+:\d+$/.test(values.size))throw new Error('サイズの幅・高さ・比率を確認してください。');
 const copy=buildEditorial(profile,{...values,collection},random),notes=[];
 if(noPerson)notes.push('人物なしの指定を優先します。人物用の表情・顔角度・身体ポーズは適用対象外とし、景物を顔や手足に見立てず、風景の視点・自然な配置・光で作品を成立させます。');
 if(/文字を一切|だけ|のみ|サイン風|落款風/.test(values.type)&&/雑誌|誌面|見開き|新聞/.test(values.design))notes.push('文字を限定した設定です。誌面の文字量はこの指定に合わせて減ります。');
 if(values.line!=='セリフなし'&&(/文字を一切|クリエイター名だけ|HALLOWEEN|サイン風|落款風/.test(values.type)))notes.push('セリフより限定した文字設定を優先します。');
 if(/モノクロ|^水墨画$|^鉛筆デッサン$|^木炭画$|サイアノ/.test(values.medium)&&!/墨一色|モノクロ|セピア|参照画像/.test(values.palette))notes.push('単色技法では選んだ配色を技法の濃淡へ翻訳します。モノクロ・水墨・鉛筆・木炭は無彩色、サイアノタイプは青と白を保ちます。');
 const conditions=visibleQuestions.map((q,i)=>{
  const spec=visualSpec(q.key,values[q.key],{noPerson,palette:values.palette});let text=spec.text,checks=[...spec.checks];
  if(q.key==='palette'&&values.medium===CRYSTAL_ANIME){text=crystalAnimePalette(values.palette,{noPerson});checks=['選択配色：'+values.palette,'選んだ色の中で白または限定色の光と深い影が分かる',noPerson?'景物の形と材質を保つ':'主参照の特徴を配色の条件に沿って保つ'];}
  if(q.key==='palette'&&(monochromeMedium||cyanotype)){const colors=cyanotype?'プルシアンブルーと紙の白':'黒・白・無彩色の灰';text='選択配色「'+values.palette+'」の主色・副色・差し色の面積と明暗の関係を、'+colors+'の濃淡へ翻訳する。技法の色制限を全領域で守り、'+(noPerson?'景物・建築・自然素材':'髪・肌・瞳')+'の識別も形と明度差で保つ。元の有彩色や別の差し色は残さない。';checks=[colors+'だけの完成画像','形と明度差による識別','選択配色の面積と明暗関係'];}
  if(q.key==='theme'&&noPerson){text=sceneryTheme(values.theme)+'。人物・人型シルエット・顔・手足を追加しない。場所は選んだ舞台を守り、画材や形式は別の項目を守る。';checks=['選択主題が分かる景物・自然現象・出来事の痕跡','人物を再導入していない'];}
  if(q.key==='mood'){text=noPerson?'選択した雰囲気は景物の光・色・余白・天候で表す。人の笑顔・目線・横顔・首の傾きを物体へ移植せず、風景の視点と奥行きを保つ。':text+' 今回の実行：'+variant.face+' / '+variant.expression+(variant.tone?' / '+variant.tone:'');checks=noPerson?['光・色・余白による空気感','物体に顔や目を描いていない']:[variant.face,variant.expression];}
  if(q.key==='pose'){text=noPerson?'人物用のポーズ「'+values.pose+'」は適用しない。物体の形を人の手足に見立てず、風・水・雲など選んだ舞台に存在する自然な動きだけで変化を示す。木や建築を走る・座る形へ変えない。':text+' 実行する身体動作：'+variant.pose;checks=noPerson?['物体の自然な接地・重力・流れ','身体ポーズの擬人化なし']:[variant.pose];}
  if(q.key==='type'){text+=' '+visualSpec('line',values.line).text;checks=copy.mode==='none'?['文字・数字・署名のない完成']:copy.slots.map(s=>s.role+'：'+s.text);}
  return {index:i+1,key:q.key,name:q.name,value:values[q.key],text,checks};
 });
 const format=formatContract(values);if(noPerson)format.push('人物なしの形式解釈：形式が主役・肖像・衣装の画像領域を求めても、選んだ風景・物体・紋章をそこへ配置する。人物や人型のマネキンを補わず、レイアウトの情報構造だけを保つ。');
 return {conditions,notes,copy,noPerson,format,editorial:editorialContract(copy)};
}
export function planInstructions(plan){return [
 '【選択を具体的に実行する制作条件】',
 '基準は選択した項目タイトルと以下の意味定義。項目の見本画像は選びやすくするための表示用であり、生成する人物・性別・物体・画風・構図の参照資料にはしない。',
 '10項目は担当する役割を分けて同時に実行する。画風は描き方、形式は画像・文字の構造、物語は出来事、衣装は役柄、舞台は空間、ポーズは身体の動き。別の項目を雰囲気で代用しない。',
 ...plan.conditions.map(c=>c.index+'. '+c.name+' / '+c.value+'：'+c.text),
 ...plan.notes.map(n=>'組み合わせの解釈：'+n),
 '【選んだ形式の完成設計】',...plan.format,
 '【実画像での完成検査】',
 '生成前の構想だけで合格としない。出力した画像そのものに次の特徴が見えるか確認する。画像を見ていない場合は合格と主張しない。',
 ...plan.conditions.map(c=>'検査'+c.index+' / '+c.name+'：'+c.checks.join(' / ')),
 '不足した項目があれば、その項目と領域を特定し、満たしている顔・ポーズ・画風・配色を保って修正する。誌名だけの絵を雑誌の完成、背景だけの交換を新しいポーズ、顔だけ写真の絵をアニメの完成と扱わない。修正できない場合は不足を正直に伝える。'
];}
export function repairPrompt(result){return [
 '【選択した仕様へ仕上げ直す】',
 'このチャットで直前に生成した完成画像、または今回添付した修正対象の完成画像を実際に見て、下記の制作仕様と照合する。完成画像は修正対象であり、別の人物の顔の基準にはしない。人物の同一性は元の主参照、画風・衣装・物語・舞台・形式は項目タイトルと具体的な意味定義を使う。項目の見本画像は不要であり、見本や画面一覧の再添付を要求しない。必要な主参照や修正対象を確認できない場合のみ、その画像を求める。',
 '不足する項目と画像内の領域を特定し、その部分を修正した完成画像を1枚生成する。合格している顔の同一性・画風・衣装・ポーズ・配色・文章は保つ。背景だけを替えたり、指定を別のジャンルへ弱めたりしない。',
 '雑誌なら誌名・主特集・補助特集と補足、内ページなら意味のある本文カラム・リード・キャプション、ポスターなら情報階層を確認。目・眉・口・顔角度、手足の動作・重心・接触、素材・遠近、寸法と文字の綴りも完成画像から照合する。',
 '修正後の画像をもう一度照合し、確認していない項目や満たせていない項目を達成したと主張しない。',
 '画像生成機能を実際に実行し、返された修正後の完成画像をこの会話に画像として表示・添付する。説明文・制作仕様の画像・プロンプトだけを完成として返さない。生成機能が使えない、または生成に失敗した場合はその状態を明記し、画像が出ていないのに完成したと伝えない。',
 '', '【元の制作仕様】',result.prompt
 ].join('\n');}
