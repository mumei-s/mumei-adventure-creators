import {questions,AUTO,setSelectionRefiner} from './catalog.js?v=13';
import {poseGroups} from './poses.js?v=13';
const original=questions.map(q=>({...q,groups:q.groups.map(g=>({...g,values:[...g.values]}))}));
const originalGroups=key=>original.find(q=>q.key===key).groups;
const cloneGroups=groups=>groups.map(g=>({...g,values:[...g.values]}));
const pick=(values,random)=>values[Math.min(values.length-1,Math.floor(random()*values.length))];
const automatic=(input,key)=>!input[key]||input[key]===AUTO;
let activeCollection='halloween';
export function currentCollection(){return activeCollection;}
export const dailyScenes=[
 ['朝の光と小さな日常','カーテンを開き、朝の一杯をいれる。柔らかな日差しと生活の手触り。'],
 ['旅先で見つけた景色','初めての街を旅人が見渡す。発見と遠景、道の奥行き。'],
 ['大切な人との再会','駅で待ち合わせた二人が再会する瞬間。視線と身振り、嬉しさを描く。'],
 ['ものづくりの時間','手と道具で作品を作る途中の場面。素材と集中、制作の流れ。'],
 ['季節を歩く','季節の植物と風の中を散歩する。歩みと自然光、一つの季節で統一。'],
 ['街角のファッション','街を歩く装いを主役にする。衣服の素材、動き、都市の遠近。'],
 ['静かな読書の時間','本を開く静かなひととき。窓からの光、余白と部屋の深さ。'],
 ['星明かりを集める旅','星の光を集める幻想的な旅。浮遊と光の反射。幻想を選んだ時だけ取り入れる。']
];
export const landscapeScenes=[
 ['風景・建築の記録','選んだ一つの場所を、地形・建築・植生・天候と一貫した遠近で記録する。'],
 ['山岳と湖のパノラマ','手前の湖岸、中景の湖面、遠景の山並み。水面の反射と稜線の奥行きを描く。'],
 ['海辺と水平線','砂浜または岩場から海と水平線へ視線が抜ける。波の間隔と空の明るさを整える。'],
 ['里山と田園風景','田畑の畦道、家屋や樹林、奥の里山。生活の営みを残す実景を一つの季節で描く。'],
 ['雨に映る街の風景','濡れた路面と建物、空や街灯の映り込み。雨の方向と街路の消失点を揃える。'],
 ['四季の森を見渡す','一つの季節に揃えた幹、枝葉、林床。近い木から遠い森までの層を描く。'],
 ['建築と街並みの記録','建物の外壁、窓、屋根、通りを同じ街として構成。垂直線と消失点を整える。']
];
export const dailyClothes=['リネンシャツとデニム','現代のテーラードスーツ','ワンピースとカーディガン','スポーツウェア'];
export const dailySamples=Object.fromEntries([...dailyScenes.map(([value,text],i)=>['theme\u0000'+value,{file:'everyday-'+String(i+1).padStart(3,'0')+'.jpg',text}]),...dailyClothes.map((value,i)=>['costume\u0000'+value,{file:'everyday-'+String(i+9).padStart(3,'0')+'.jpg',text:'衣服の形・縫製・素材と動きの説明。人物の顔・性別・体型・ポーズ・描画技法は指定しない。'}])]);
const dailyFantasyThemes=['星明かりを集める旅','秘密の図書館','星を集める旅','眠らない美術館','鏡の向こうの自分','光と影の寓話','記憶の標本室','異世界のファッションショー'];
const scenicPlaces=['山岳と湖畔','砂浜と海岸線','田畑と里山','広葉樹の森','川沿いの遊歩道','街並みと広場','海辺の灯台','雪の庭','星空の砂漠'];
const dailyPlaces=['朝のキッチン','駅の改札前','明るい工房','並木道','街角の歩道','窓辺の読書室','深夜の喫茶店','天窓のあるアトリエ','骨董品店','無人の映画館','雨の路地','ネオンの繁華街'];
const optionalPoseValues=['浮遊する','空中で回転'];
const dailyPoseGroups=[...poseGroups.map(g=>({label:g.label,values:g.values.filter(v=>!optionalPoseValues.includes(v))})),{label:'幻想・アクロバット（選択時のみ）',values:optionalPoseValues}];
const dailyMoodGroups=originalGroups('mood').filter(g=>!['恐怖','表情を選ぶ','表情と角度のセット'].includes(g.label)).map(g=>({...g,values:g.values.filter(v=>!['妖しく気高い','いたずら好き'].includes(v))}));
dailyMoodGroups.push({label:'表情を選ぶ',values:originalGroups('mood').find(g=>g.label==='表情を選ぶ').values.filter(v=>v!=='牙を見せて威嚇')},{label:'表情と角度のセット',values:originalGroups('mood').find(g=>g.label==='表情と角度のセット').values.filter(v=>v!=='ローアングル＋威嚇')},{label:'幻想・演技の表情（選択時のみ）',values:['妖しく気高い','いたずら好き','牙を見せて威嚇','ローアングル＋威嚇',...originalGroups('mood').find(g=>g.label==='恐怖').values]});
const dailyGroups={
 design:[...originalGroups('design').map(g=>({...g,values:g.values.filter(v=>!['ゴシック雑誌の表紙','幻想風景画','タロットカード'].includes(v))})),{label:'自然・街並み',values:['自然・都市の風景画']},{label:'幻想・ゴシック（選択時のみ）',values:['幻想風景画','ゴシック雑誌の表紙','タロットカード']}],
 theme:[{label:'日常・旅・創作',values:dailyScenes.slice(0,7).map(x=>x[0])},{label:'自然・街並み・風景',values:landscapeScenes.map(x=>x[0])},{label:'自由な幻想（選択時のみ）',values:dailyFantasyThemes}],
 costume:[{label:'普段の装い',values:[...dailyClothes,'参照画像の衣装を生かす']},{label:'職業・制服',values:originalGroups('costume').find(g=>g.label==='職業・制服').values},{label:'人物を描かない',values:['風景を主役にする','モチーフだけで構成する','紋章・アイコンにする']},{label:'ファッション・創作衣装',values:['ヴィクトリア朝の正装','アンティークの旅装','ゴシック・クチュール','ダーク・ロリータ','ロック・パンク','スチームパンク','サイバーパンク']},{label:'コスプレ（選択時のみ）',values:['怪盗','海賊','忍者','侍・武者','巫女','花嫁・花婿','うさぎの着ぐるみ','くまの着ぐるみ','恐竜の着ぐるみ','ペンギンの着ぐるみ']},{label:'幻想の役柄（選択時のみ）',values:originalGroups('costume').find(g=>g.label==='ファンタジー').values}],
 mood:dailyMoodGroups,
 pose:dailyPoseGroups,
 place:[{label:'日常の場所',values:dailyPlaces},{label:'自然・風景の場所',values:scenicPlaces},{label:'スタジオ・造形',values:['白いスタジオ','黒いスタジオ','墨の余白','金箔の空間','紙の箱庭','抽象的な色面','参照風景を舞台にする']},{label:'幻想の場所（選択時のみ）',values:['空中都市','霧の森','屋根の上']}],
 line:[{label:'日本語',values:['今日の光を、忘れない。','小さな一歩が、物語になる。','また、この場所で。','好きな色で、生きていく。','風の向こうへ。','まだ見ぬ景色に会いに。','ここから、はじめよう。','セリフなし']},{label:'英語',values:['A NEW CHAPTER','EVERYDAY WONDERS','FOLLOW THE LIGHT','MAKE YOUR OWN STORY']}]
};
const landscapeMedia=['実写風フィルム写真','実写風シネマティック写真','実写風モノクロ銀塩写真','劇場アニメの背景美術','油彩・厚塗り','透明水彩','不透明水彩・ガッシュ','日本画・岩絵具','水墨画','アクリル画','パステル画','鉛筆デッサン'];
const naturalPalettes=['群青 × 月白 × 銀','翡翠 × 銅 × 濃紺','秋色のブラウン × 生成り','退色したフィルムカラー','白 × 白銀 × 氷青','モノクローム','セピア'];
const defaultDailyDesigns=['通常の一枚絵','自然・都市の風景画','ファッション雑誌の表紙','カルチャー誌の表紙','写真集の表紙','文芸誌の表紙','ZINEの表紙','インタビュー誌面','見開き特集','新聞の一面','絵本の表紙','小説の装丁','展覧会ポスター','レトロ旅行ポスター','物語の挿絵','ファッション・エディトリアル','noteサムネイル','ポストカード','スマホ壁紙'];
const dailySceneChoices={
 '朝の光と小さな日常':{places:['朝のキッチン'],clothes:['リネンシャツとデニム','ワンピースとカーディガン'],poses:['カップを両手で持つ','背伸びをする','椅子に腰掛ける']},
 '旅先で見つけた景色':{places:['街並みと広場','川沿いの遊歩道','海辺の灯台','山岳と湖畔'],clothes:['リネンシャツとデニム','スポーツウェア','アンティークの旅装'],poses:['ゆっくり歩く','片足に体重を乗せる','振り向く']},
 '大切な人との再会':{places:['駅の改札前','街並みと広場'],clothes:dailyClothes.slice(0,3),poses:['手を振る','片手を差し出す','両手を広げる']},
 'ものづくりの時間':{places:['明るい工房','天窓のあるアトリエ'],clothes:['リネンシャツとデニム','参照画像の衣装を生かす'],poses:['絵を描く','椅子に腰掛ける']},
 '季節を歩く':{places:['並木道','川沿いの遊歩道','広葉樹の森','雪の庭'],clothes:['リネンシャツとデニム','ワンピースとカーディガン','スポーツウェア'],poses:['ゆっくり歩く','大股で歩く','振り向く']},
 '街角のファッション':{places:['街角の歩道','街並みと広場'],clothes:dailyClothes.slice(0,3),poses:['片足に体重を乗せる','ゆっくり歩く','振り向く','壁にもたれる']},
 '静かな読書の時間':{places:['窓辺の読書室','深夜の喫茶店'],clothes:['リネンシャツとデニム','ワンピースとカーディガン'],poses:['本を読む']},
 '風景・建築の記録':{places:scenicPlaces},
 '山岳と湖のパノラマ':{places:['山岳と湖畔']},
 '海辺と水平線':{places:['砂浜と海岸線','海辺の灯台']},
 '里山と田園風景':{places:['田畑と里山']},
 '雨に映る街の風景':{places:['雨の路地','ネオンの繁華街']},
 '四季の森を見渡す':{places:['広葉樹の森']},
 '建築と街並みの記録':{places:['街並みと広場','街角の歩道']},
 '星明かりを集める旅':{places:['星空の砂漠','空中都市'],clothes:['星の占い師','不思議の国の旅人'],poses:['片手を差し出す','浮遊する']},
 '星を集める旅':{places:['星空の砂漠','空中都市'],clothes:['星の占い師','不思議の国の旅人'],poses:['片手を差し出す','浮遊する']},
 '秘密の図書館':{places:['窓辺の読書室','骨董品店'],clothes:['アンティークの旅装','参照画像の衣装を生かす'],poses:['本を読む']},
 '眠らない美術館':{places:['天窓のあるアトリエ','白いスタジオ'],clothes:['現代のテーラードスーツ','アンティークの旅装'],poses:['振り向く','ゆっくり歩く']},
 '鏡の向こうの自分':{places:['白いスタジオ','黒いスタジオ'],clothes:['参照画像の衣装を生かす'],poses:['片手を差し出す','まっすぐ立つ']},
 '光と影の寓話':{places:['白いスタジオ','並木道'],clothes:['ワンピースとカーディガン','アンティークの旅装'],poses:['まっすぐ立つ','片手を差し出す']},
 '記憶の標本室':{places:['骨董品店','明るい工房'],clothes:['現代のテーラードスーツ','リネンシャツとデニム'],poses:['椅子に腰掛ける','片手を差し出す']},
 '異世界のファッションショー':{places:['空中都市','白いスタジオ'],clothes:['ゴシック・クチュール','スチームパンク','サイバーパンク'],poses:['大股で歩く','腰に手を当てる','くるりと踊る']}
};
const halloweenSceneChoices={
 '月夜の仮面舞踏会':{places:['古城の大広間','古い洋館の階段'],clothes:['仮面とドレス','ヴィクトリア朝の正装'],poses:['くるりと踊る','片手を差し出す']},
 '真夜中の魔女のアトリエ':{places:['魔女の書斎','天窓のあるアトリエ'],clothes:['魔女・魔法使い','錬金術師'],poses:['絵を描く','片手を差し出す']},
 '忘れられた劇場':{places:['舞台装置','無人の映画館'],clothes:['アンティークの旅装','幽霊・亡霊'],poses:['ゆっくり歩く','振り向く']},
 '幽霊たちのお茶会':{places:['古城の大広間','深夜の喫茶店'],clothes:['幽霊・亡霊','白布のおばけ'],poses:['カップを両手で持つ','椅子に腰掛ける']},
 '秘密の図書館':{places:['魔女の書斎'],clothes:['魔女・魔法使い','アンティークの旅装'],poses:['本を読む','椅子に腰掛ける']},
 '異界に続く駅':{places:['舞台装置'],clothes:['時空の旅人','アンティークの旅装'],poses:['片足に体重を乗せる','ゆっくり歩く']},
 '鏡の向こうの自分':{places:['鏡の迷宮'],clothes:['人形','ヴィクトリア朝の正装'],poses:['片手を差し出す','まっすぐ立つ']},
 '星を集める旅':{places:['星空の砂漠','空中都市'],clothes:['星の占い師','不思議の国の旅人'],poses:['片手を差し出す','浮遊する']},
 '眠らない美術館':{places:['天窓のあるアトリエ','舞台装置'],clothes:['アンティークの旅装','幽霊・亡霊'],poses:['ゆっくり歩く','振り向く']},
 '一夜だけの怪奇サーカス':{places:['舞台装置','夜の遊園地'],clothes:['サーカスの道化師','ホラーピエロ'],poses:['空中で回転','片膝を曲げて跳ぶ']},
 '吸血鬼の晩餐会':{places:['古城の大広間'],clothes:['吸血鬼','ゴシック・クチュール'],poses:['椅子に腰掛ける','片手を差し出す']},
 '死神の休日':{places:['深夜の喫茶店','屋根の上'],clothes:['死神'],poses:['椅子に腰掛ける','カップを両手で持つ','本を読む']},
 '魔法使いの見習い':{places:['魔女の書斎','霧の森'],clothes:['魔女・魔法使い','錬金術師'],poses:['片手を高く掲げる','両手を差し出す']},
 '悪夢からの脱出':{places:['鏡の迷宮','霧の森'],clothes:['アンティークの旅装','参照画像の衣装を生かす'],poses:['全力で走る','振り向きながら走る']},
 '百鬼夜行':{places:['異界の鳥居','雨の路地'],clothes:['鬼','天狗','妖狐','河童'],poses:['大股で歩く','ゆっくり歩く']},
 '妖狐と月の契約':{places:['異界の鳥居','霧の森'],clothes:['妖狐','陰陽師'],poses:['膝をついて誓う','片手を差し出す']},
 '海賊船の亡霊':{places:['海辺の灯台','舞台装置'],clothes:['海賊','幽霊・亡霊'],poses:['片手を高く掲げる','片足に体重を乗せる']},
 '宇宙のHalloween':{places:['空中都市','星空の砂漠'],clothes:['宇宙飛行士','宇宙海賊','エイリアン'],poses:['浮遊する','片手を差し出す']},
 '機械仕掛けの怪物':{places:['人形の工房','天窓のあるアトリエ'],clothes:['ロボット','サイボーグ','悪の科学者'],poses:['まっすぐ立つ','片手を差し出す']},
 '呪われたオルゴール':{places:['骨董品店','人形の工房'],clothes:['人形','アンティークの旅装'],poses:['片手を差し出す','椅子に腰掛ける']},
 'お菓子の王国':{places:['紙の箱庭','舞台装置'],clothes:['キャンディの精霊','カボチャの王族'],poses:['両手を差し出す','手を振る']},
 'カボチャの収穫祭':{places:['カボチャ畑'],clothes:['カボチャの王族','ジャック・オー・ランタン'],poses:['両手を差し出す','低くしゃがむ']},
 '都会の仮装パレード':{places:['ネオンの繁華街','雨の路地'],clothes:['海賊','吸血鬼','魔女・魔法使い','うさぎの着ぐるみ'],poses:['大股で歩く','手を振る']},
 '花と骸骨の祝祭':{places:['古城の大広間','舞台装置'],clothes:['骸骨・スケルトン','花の精霊'],poses:['花束を抱える','くるりと踊る']},
 '墨で描く怪異':{places:['天窓のあるアトリエ','墨の余白'],clothes:['陰陽師','妖狐'],poses:['絵を描く','片手を差し出す']},
 '光と影の寓話':{places:['白いスタジオ','黒いスタジオ'],clothes:['参照画像の衣装を生かす','仮面とドレス'],poses:['片手を差し出す','まっすぐ立つ']},
 '記憶の標本室':{places:['骨董品店','魔女の書斎'],clothes:['ヴィクトリア朝の正装','アンティークの旅装'],poses:['片手を差し出す','椅子に腰掛ける']},
 '異世界のファッションショー':{places:['舞台装置','空中都市'],clothes:['ゴシック・クチュール','スチームパンク','サイバーパンク'],poses:['大股で歩く','腰に手を当てる']},
 '雨上がりの怪談':{places:['雨の路地','異界の鳥居'],clothes:['参照画像の衣装を生かす','幽霊・亡霊'],poses:['振り向く','ゆっくり歩く']},
 '静かなハロウィーン':{places:['深夜の喫茶店','古い洋館の階段'],clothes:['魔女・魔法使い','参照画像の衣装を生かす'],poses:['椅子に腰掛ける','カップを両手で持つ']}
};
export function noPersonSelection(values={}){return ['風景を主役にする','モチーフだけで構成する','紋章・アイコンにする'].includes(values.costume);}
export function landscapeSelection(values={}){return values.costume==='風景を主役にする'||/風景画/.test(values.design||'')||landscapeScenes.some(([name])=>name===values.theme);}
function refineSelections(resolved,input,random){
 const values={...resolved};
 if(activeCollection==='everyday'){
  const explicitFantasy=['theme','costume','place','pose'].some(key=>!automatic(input,key)&&(/星明かりを集める旅|星を集める旅|異世界|空中都市|浮遊する|妖精|精霊|エルフ|ドラゴン|竜人|人魚|不死鳥|ネクロマンサー|錬金術師|星の占い師|不思議の国/.test(input[key])||key==='theme'&&dailyFantasyThemes.includes(input[key])));
  const isLandscapeTheme=value=>landscapeScenes.some(([name])=>name===value);
  const explicitLandscape=input.costume==='風景を主役にする'||!automatic(input,'design')&&/風景画/.test(input.design)||!automatic(input,'theme')&&isLandscapeTheme(input.theme);
  const explicitPerson=!automatic(input,'pose')||!automatic(input,'costume')&&!noPersonSelection(input)||!automatic(input,'theme')&&!isLandscapeTheme(input.theme);
  if(!explicitLandscape){
   if(explicitFantasy&&automatic(input,'theme'))values.theme=pick(dailyFantasyThemes,random);
   else if(explicitPerson&&automatic(input,'theme')&&isLandscapeTheme(values.theme))values.theme=pick(dailyScenes.slice(0,7).map(x=>x[0]),random);
   if(explicitPerson&&automatic(input,'design')&&/風景画/.test(values.design))values.design='通常の一枚絵';
  }
  const landscapeIntent=input.costume==='風景を主役にする'||/風景画/.test(values.design)||landscapeScenes.some(([name])=>name===values.theme);
  if(landscapeIntent){
   if(automatic(input,'costume'))values.costume='風景を主役にする';
   if(automatic(input,'theme'))values.theme=pick(landscapeScenes.map(x=>x[0]),random);
   if(automatic(input,'design'))values.design='自然・都市の風景画';
  }
  const scene=dailySceneChoices[values.theme]||{};
  for(const [key,choices]of [['place',scene.places],['costume',scene.clothes],['pose',scene.poses]])if(choices?.length&&automatic(input,key)&&!(key==='costume'&&noPersonSelection(values)))values[key]=pick(choices,random);
  if(noPersonSelection(values)){if(automatic(input,'pose'))values.pose=AUTO;if(automatic(input,'mood'))values.mood='毎回大胆に変える';}
  if(landscapeSelection(values)){if(automatic(input,'medium'))values.medium=pick(landscapeMedia,random);if(automatic(input,'palette'))values.palette=pick(naturalPalettes,random);}
  if(automatic(input,'costume')&&!landscapeIntent&&!scene.clothes)values.costume=pick(dailyClothes,random);
 }else{
  const scene=halloweenSceneChoices[values.theme];
  if(scene)for(const [key,choices]of [['place',scene.places],['costume',scene.clothes],['pose',scene.poses]])if(choices?.length&&automatic(input,key))values[key]=pick(choices,random);
  if(noPersonSelection(values)&&automatic(input,'pose'))values.pose=AUTO;
 }
 return values;
}
export function applyCollection(collection){
 activeCollection=collection==='everyday'?'everyday':'halloween';
 questions.forEach((q,i)=>{
  const source=original[i],daily=activeCollection==='everyday';q.groups=cloneGroups(daily?(dailyGroups[q.key]||source.groups):source.groups);delete q.autoValues;
  if(daily&&q.key==='type')q.groups=q.groups.map(g=>({...g,values:g.values.filter(v=>!v.includes('HALLOWEEN'))}));
  q.name=source.name;q.hint=source.hint;
  if(daily){
   if(q.key==='theme'){q.hint='日常・風景・創作の出来事';q.autoValues=[...dailyScenes.slice(0,7),...landscapeScenes].map(x=>x[0]);}
   if(q.key==='design')q.autoValues=defaultDailyDesigns;
   if(q.key==='costume')q.autoValues=dailyClothes;
   if(q.key==='place')q.autoValues=[...dailyPlaces,...scenicPlaces];
   if(q.key==='pose'){q.autoValues=['まっすぐ立つ','片足に体重を乗せる','椅子に腰掛ける','ゆっくり歩く','振り向く','手を振る'];q.hint='日常の動きから、選んだ演技まで';}
   if(q.key==='mood')q.autoValues=['毎回大胆に変える'];
   if(q.key==='medium')q.autoValues=['実写風フィルム写真','実写風スタジオ写真','実写風街角スナップ','実写風シネマティック写真','実写風ファッション写真','実写風モノクロ銀塩写真','現代アニメの一枚絵','手描きアニメのセル画','劇場アニメの背景美術','絵本イラスト','油彩・厚塗り','透明水彩','不透明水彩・ガッシュ','水墨画','浮世絵木版画','色鉛筆画','ベクターグラフィック','フラットイラスト'];
   if(q.key==='palette')q.autoValues=[...naturalPalettes,'桃色 × 墨黒 × 真珠','原色のポップカラー','墨一色'];
  }
 });
 setSelectionRefiner(refineSelections);
}
export function dailyInspiration(profile){if(!profile.inspiration)return profile;const labels=profile.inspiration.labels||[];const entries=labels.map(label=>/旅/.test(label)?1:/仲間|家族|支え/.test(label)?2:/創作|技術|仕事/.test(label)?3:/自然/.test(label)?4:/心|余白/.test(label)?6:0);return {...profile,inspiration:{...profile.inspiration,themes:[...new Set(entries.map(i=>dailyScenes[i][0]))],phrases:['今日の光を、忘れない。','好きな色で、生きていく。','小さな一歩が、物語になる。'],imagery:entries.map(i=>dailyScenes[i][1]),objects:(profile.inspiration.objects||[]).filter(v=>!/[幽亡]霊|魔女|魔法|召喚|骸骨|カボチャ|怪異/.test(v))}};}
