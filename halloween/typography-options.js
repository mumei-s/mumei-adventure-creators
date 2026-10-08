// Copy modes describe the manuscript and its hierarchy. They never change the
// selected image technique, scene, costume, pose, or output format.
import {copyContentRules,publicCopyContext,worldIntroduction,worldFeatureCopy} from './copy-scope.js?v=28.3.1';
const choices=[
 {value:'商品広告・キャッチと特徴3点',group:'広告・キャンペーン',density:'見出し＋紹介＋特徴3点',className:'type-ad',preview:['物語の、その先へ。','夜の街に残る秘密をたどる。','帰り道を探す','路地の秘密に出会う','まだ知らない物語へ','作者名'],layout:'主見出しを最大、短い紹介を中程度、3つの特徴を同じ大きさで整列し、作者名を最小にする。特徴は各一文まで。特徴1などの役割名や番号、価格や購入先の欄は作らない。'},
 {value:'ブランド広告・宣言と短いコピー',group:'広告・キャンペーン',density:'宣言＋補足＋名前',className:'type-ad',preview:['好きな世界を、つくろう。','一枚の創作から、次の景色へ。','作者名'],layout:'一つの宣言を大きく置き、補足を一文、作者名を一か所だけ添える。ロゴや広告実績のシールを追加せず、余白を広く保つ。'},
 {value:'イベント告知・見どころと案内',group:'広告・キャンペーン',density:'題名＋紹介＋見どころ2点＋案内',className:'type-ad',preview:['創作の夜へ','光と物語を楽しむ、架空の企画。','見どころ：色の景色','見どころ：衣装の細部','作品の世界へようこそ','作者名'],layout:'企画名を最上位、紹介を一文、見どころ2点を中段、案内を下段へ整理する。入力のない日時・会場・料金・申込先・QRは描かない。'},
 {value:'展覧会告知・作品名と制作ノート',group:'広告・キャンペーン',density:'作品名＋紹介＋制作ノート＋名前',className:'type-editorial',preview:['境界のひかり','一つの景色をめぐる創作展示。','制作ノート','光が重なる場所を探して。','作者名'],layout:'作品名を大きく、紹介を中程度、制作ノートを短い一段落、作者名を欄外へ置く。制作ノートは画風の命令や工程一覧でなく、作品の見どころを述べる。'},
 {value:'映画予告・キャッチとあらすじ',group:'物語・キャラクター',density:'題名＋キャッチ＋あらすじ＋作者',className:'type-cinema',preview:['扉の向こうへ','戻る前に、見つけたい。','一つの出会いが、景色を変える。','原作・美術','作者名'],layout:'キャッチを上部、作品名を最大の一群、あらすじを短い2〜3文、作者名を小さく配置する。架空の俳優名、上映日、配給会社、受賞歴は追加しない。'},
 {value:'漫画表紙・大見出しと煽り文',group:'物語・キャラクター',density:'題名＋煽り文＋紹介＋作者',className:'type-magazine',preview:['境界の旅人','その一歩が、世界をひらく！','迷いの先で見つけた、小さな光。','作者名'],layout:'独自タイトルを最大にし、煽り文を太い一文、紹介を小さい一文、作者名を端へ置く。漫画の吹き出し、別コマ、巻数、架空の連載誌は補わない。'},
 {value:'キャラクター名鑑・役柄とスキル',group:'物語・キャラクター',density:'名前＋役柄＋スキル2件＋人物紹介',className:'type-editorial',preview:['作者名','役柄：境界の案内人','特技：光の道を見つける','特技：失われた記憶をつなぐ','一つの世界を旅する創作キャラクター。'],layout:'名前を最上位、役柄を中程度、独自スキル2件と短い紹介を同じ情報枠内へ整列する。数値・ランク・職歴・資格を本人の事実として作らない。'},
 {value:'ゲーム告知・世界紹介とクエスト',group:'物語・キャラクター',density:'題名＋世界紹介＋目標＋見どころ',className:'type-ad',preview:['境界への旅','光と影がつながる、架空の世界。','目標：扉の向こうを見つけよう','見どころ：景色に残る物語','作者名'],layout:'作品タイトル、短い世界紹介、一つの目標、一つの見どころ、作者名の順に読む。ゲームの操作画面・ゲージ・審査マーク・販売元・対応機種は追加しない。'},
 {value:'縦書きコピー・一文を大きく',group:'文字を演出',density:'短い一文＋名前',className:'type-book',preview:['まだ見ぬ景色へ。','作者名'],layout:'短い一文を最大3列の縦書きにし、句読点・括弧・長音の向きを整える。作者名は離れた小さい一群にする。副見出しや本文を加えない。'},
 {value:'詩のコピー・短い言葉を3行',group:'文字を演出',density:'独自の短い詩3行＋名前',className:'type-line',preview:['ひとつの光を見つけた','景色が静かにひらいた','ここから物語が始まる','作者名'],layout:'互いにつながる短い創作詩を3行だけ置き、行の長さと間隔に呼吸を作る。作者名は小さく離す。歌詞・既存の詩・名言を引用しない。'},
 {value:'大判タイポグラフィー・文字が主役',group:'文字を演出',density:'大きい主語句＋短い補足＋名前',className:'type-title',preview:['景色をひらく','創作から生まれる、もうひとつの世界。','作者名'],layout:'主語句を1〜2行の大きい活字で置き、補足を一文、作者名を小さくする。文字を主役としても、選択した主画像の顔・手・主題の核心を文字で覆わない。'},
 {value:'ミニマル広告・見出しと名前',group:'文字を演出',density:'独自の見出し＋名前',className:'type-title',preview:['余白の、その先へ。','作者名'],layout:'一つの短い見出しと確認した作者名の2ブロックに限定する。大小差と広い余白で読ませ、キャッチの補足・本文・署名・販促ラベルは増やさない。'}
];

export const extraTypographyGroups=Object.freeze([...new Set(choices.map(item=>item.group))].map(label=>({label,values:choices.filter(item=>item.group===label).map(item=>item.value)})));
export const typographyValues=Object.freeze(choices.map(item=>item.value));
const byValue=new Map(choices.map(item=>[item.value,item]));
export const typographyOption=value=>byValue.get(value)||null;
export function typographyPreview(value){
 const item=typographyOption(value);
 return item?{className:item.className,blocks:[...item.preview]}:null;
}
export function typographyRecipe(value){
 const item=typographyOption(value);if(!item)return null;
 return {known:true,sections:[
  {label:'使用する原稿と文字密度',text:'文字設定「'+item.value+'」は、'+item.density+'で構成する。確定原稿と許可された編集原稿以外の役割を追加しない。'},
  {label:'この文字設定の読み順',text:item.layout},
  {label:'選択した作品への配置',text:'デザイン自体を別形式へ置換しない。選んだ形式の画像領域と安全余白を保ち、今回許可した原稿をその情報領域へ配置する。主画像は選択された作風・世界観・シーン・衣装・アングル・ポーズを保つ。'},
  {label:'創作コピーと事実の区別',text:'本文は作品世界内の内容または確認できた作者の公開活動を、読者へ紹介する独自のコピーにする。描画条件を紹介文へ言い換えない。確認していない販売、日時、会場、価格、効果、受賞、資格、本人の実際の発言を作らない。noteのID、URL、制作指示、文字設定の項目名は印字しない。'},
  {label:'印字原稿の内容境界',text:copyContentRules.join('')}
 ],checks:[item.density,item.layout,'許可原稿の範囲内','一つの作品とつながる独自のコピー','未確認の実績・ID・URLなし']};
}

export function buildTypographySlots(value,{subject,name='',intro='',noPerson=false,values={}}={}){
 const item=typographyOption(value);if(!item)return null;
 const contentSources=publicCopyContext(values,{subject,noPerson}),theme=contentSources.story,costume=contentSources.protagonist||'この場所',scene=contentSources.setting;
 const halloween=contentSources.collection==='halloween';
 const slots=[],add=(role,text,priority=2,editable=false,maxCharacters=36,instruction='',contentDomain='story_world')=>{if(text)slots.push({role,text,priority,editable,maxCharacters,instruction,contentDomain});};
 const headline=text=>add('主見出し',text,0,true,20,'今回の世界観・シーンを一つの訴求にまとめた、20字以内の独自の日本語見出し。');
 const author=()=>add('作者名',name,3);
 const describe=(role,text,maxCharacters=60,instruction='')=>add(role,text,2,true,maxCharacters,instruction);
 switch(value){
 case '商品広告・キャッチと特徴3点':
  headline(theme+'の、その先へ。');describe('商品紹介',worldIntroduction(contentSources),55,'紹介する対象は作品世界内の物語と、そこに入る読者の体験。実在の販売商品を作らず、画像の画材・角度・色・陰影の説明をしない。');
  worldFeatureCopy(contentSources).forEach((text,i)=>describe('特徴'+(i+1),text,28,'この特徴の内容は「'+contentSources.featureAngles[i]+'」。世界内の場所・出来事・目的を読者へ伝える、他の特徴と重複しない一文にする。描画仕様の言い換えや販売性能の捏造にしない。'));author();break;
 case 'ブランド広告・宣言と短いコピー':
  headline(halloween?'Halloweenの物語を、ひらこう。':'好きな世界を、つくろう。');add('ブランドコピー',theme+'から、次の景色へ。',2,true,45,'作者の公開活動で確認できる題材や、読者へ届ける内容を紹介する。実績・販売・効果・制作仕様の主張を含めない。','public_activity');author();break;
 case 'イベント告知・見どころと案内':
  add('企画名',theme,0);describe('企画紹介',theme+'を楽しむ、架空の創作企画。',55,'今回の創作世界を紹介する一文。実際に開催されるイベントとして宣伝しない。');
  describe('見どころ1',contentSources.purpose+'。',32,'世界内で挑む目的や出来事を一つ。');describe('見どころ2',scene+'に残る'+(halloween?'Halloweenの':'')+'秘密をたどる。',32,'この場所で出会うものや発見を一つ。角度・配色・画材の説明にしない。');add('案内',halloween?'Halloweenの物語へようこそ。':'作品の世界へようこそ。',2);author();break;
 case '展覧会告知・作品名と制作ノート':
  add('作品名',theme,0);describe('展示紹介',theme+'をめぐる、一つの物語。',48);describe('制作ノート',worldIntroduction(contentSources),90,'作品に込めた世界内の物語・場所・主題を読者へ紹介する2〜3文。画材の工程、角度、光や色の実装、実際の作者発言、未確認の展示情報として書かない。');author();break;
 case '映画予告・キャッチとあらすじ':
  add('作品タイトル',theme,0);add('キャッチ',halloween?'Halloweenの夜、その先には？':'その先で、何を見つける？',1,true,25,'選択した世界観・シーンの出来事につながる独自の短いキャッチ。');describe('あらすじ',intro||scene+'で始まる一つの出会い。そこに残った光が、まだ知らない景色へつながる。',100,'同じ世界観・シーンの一つの出来事を2〜3文で紹介する。別の舞台、別のキャラクター、別の作品に話を広げない。');author();break;
 case '漫画表紙・大見出しと煽り文':
  add('作品タイトル',theme,0);add('煽り文',halloween?'Halloweenの夜に、扉がひらく！':'その一歩が、世界をひらく！',1,true,24,'今回の動作と出来事に合う、勢いのある独自の一文。');describe('物語紹介',intro||scene+'に残る、小さな発見の物語。',45);author();break;
 case 'キャラクター名鑑・役柄とスキル':
  if(name)add('キャラクター名',name,0);else add('作品名',theme,0);
  add(noPerson?'主題の分類':'役柄',noPerson?theme:costume,1);
  describe(noPerson?'特徴1':'スキル1',halloween?(noPerson?'Halloweenの一夜の痕跡を残す。':'Halloweenの灯りを道しるべにする。'):(noPerson?'光の変化を映す。':'景色の手がかりを見つける。'),35,'今回の創作設定として、選択した役柄と世界観に合う短い特徴またはスキルを一つ作る。本人の職歴や資格、実際の能力を主張しない。');
  describe(noPerson?'特徴2':'スキル2',halloween?(noPerson?'Halloweenの祝祭の記憶をつなぐ。':'Halloweenの謎の手がかりを見つける。'):(noPerson?'素材の重なりをつなぐ。':'一つの物語をつなぐ。'),35,'前の特徴と重複しない別の創作上の特徴またはスキルを一つ。');describe(noPerson?'主題紹介':'キャラクター紹介',intro||theme+'の世界をたどる、創作の主役。',75);break;
 case 'ゲーム告知・世界紹介とクエスト':
  add('作品タイトル',theme,0);describe('世界紹介',intro||scene+'から始まる、架空の冒険世界。',70,'選択した世界観・シーンを一つの架空のゲーム世界として紹介する。販売や実在のゲームの情報を作らない。');describe('クエスト',halloween?'Halloweenの一夜に残る手がかりを探そう。':'この景色に残る、物語の手がかりを見つけよう。',38,'選択シーンの出来事に結びつく一つの創作上の目標。別の舞台を増やさない。');describe('見どころ',halloween?'Halloweenの祝祭から、次の物語へ。':'一つの景色から、次の発見へ。',35);author();break;
 case '縦書きコピー・一文を大きく':
  add('縦書きコピー',theme+'の、その先へ。',0,true,22,'今回の世界を伝える独自の短い一文。縦書きの3列以内に収まる22字以内。');author();break;
 case '詩のコピー・短い言葉を3行':
  (halloween?['Halloweenの灯りがともる','祝祭の向こうに秘密がひらく','一夜の物語がここから始まる']:['ひとつの光を見つけた','景色が静かにひらいた','ここから物語が始まる']).forEach((text,i)=>add('詩行'+(i+1),text,1,true,18,'独自の短い創作詩の第'+(i+1)+'行。他の2行とつながる同じ場面の詩として、1行18字以内で作る。既存の歌詞・詩・名言を引用しない。'));author();break;
 case '大判タイポグラフィー・文字が主役':
  add('主語句',theme,0,true,12,'選択した世界観・シーンを伝える、12字以内の独自の大きい語句。');describe('短い補足',theme+'から生まれる、もうひとつの景色。',35);author();break;
 case 'ミニマル広告・見出しと名前':
  headline(theme+'へ。');author();break;
 }
 return {slots,density:item.density,layout:item.layout,contentSources};
}
