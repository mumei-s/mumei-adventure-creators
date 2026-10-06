import {questions,AUTO} from './catalog.js?v=9';
const original=questions.map(q=>({...q,groups:q.groups.map(g=>({...g,values:[...g.values]}))}));
export const dailyScenes=[
 ['朝の光と小さな日常','カーテンを開き、朝の一杯をいれる。柔らかな日差しと生活の手触り。'],
 ['旅先で見つけた景色','初めての街を旅人が見渡す。発見と遠景、道の奥行き。'],
 ['大切な人との再会','駅で待ち合わせた二人が再会する瞬間。視線と身振り、嬉しさを描く。'],
 ['ものづくりの時間','手と道具で作品を作る途中の場面。素材と集中、制作の流れ。'],
 ['季節を歩く','季節の植物と風の中を散歩する。歩みと自然光、一つの季節で統一。'],
 ['街角のファッション','街を歩く装いを主役にする。衣服の素材、動き、都市の遠近。'],
 ['静かな読書の時間','本を開く静かなひととき。窓からの光、余白と部屋の深さ。'],
 ['星明かりを集める旅','星の光を集める幻想的な旅。浮遊と光の反射、Halloweenの小物は不要。']
];
export const dailyClothes=['リネンシャツとデニム','現代のテーラードスーツ','ワンピースとカーディガン','スポーツウェア'];
export const dailySamples=Object.fromEntries([...dailyScenes.map(([value,text],i)=>['theme\u0000'+value,{file:'everyday-'+String(i+1).padStart(3,'0')+'.jpg',text}]),...dailyClothes.map((value,i)=>['costume\u0000'+value,{file:'everyday-'+String(i+9).padStart(3,'0')+'.jpg',text:'衣服の形・縫製・素材と動きの参照。顔・ポーズ・描画技法を流用しない。'}])]);
const dailyGroups={
 theme:[{label:'日常・旅・創作',values:dailyScenes.map(x=>x[0])},{label:'自由な幻想',values:['秘密の図書館','星を集める旅','眠らない美術館','鏡の向こうの自分','光と影の寓話','記憶の標本室','異世界のファッションショー']}],
 costume:[{label:'普段の装い',values:[...dailyClothes,'参照画像の衣装を生かす','ヴィクトリア朝の正装','アンティークの旅装']},...original.find(q=>q.key==='costume').groups.filter(g=>['職業・制服','人物を描かない','ファンタジー'].includes(g.label))],
 place:[{label:'日常の場所',values:['深夜の喫茶店','天窓のあるアトリエ','骨董品店','無人の映画館','海辺の灯台','雨の路地','ネオンの繁華街','屋根の上','雪の庭','星空の砂漠']},{label:'幻想・造形',values:['空中都市','霧の森','墨の余白','白いスタジオ','黒いスタジオ','金箔の空間','紙の箱庭','抽象的な色面','参照風景を舞台にする']}],
 line:[{label:'日本語',values:['今日の光を、忘れない。','小さな一歩が、物語になる。','また、この場所で。','好きな色で、生きていく。','風の向こうへ。','まだ見ぬ景色に会いに。','ここから、はじめよう。','セリフなし']},{label:'英語',values:['A NEW CHAPTER','EVERYDAY WONDERS','FOLLOW THE LIGHT','MAKE YOUR OWN STORY']}]
};
export function applyCollection(collection){questions.forEach((q,i)=>{const source=original[i];q.groups=(collection==='everyday'?(dailyGroups[q.key]||source.groups):source.groups).map(g=>({...g,values:[...g.values]}));if(collection==='everyday'&&q.key==='type')q.groups=q.groups.map(g=>({...g,values:g.values.filter(v=>!v.includes('HALLOWEEN'))}));q.name=collection==='everyday'&&q.key==='costume'?'衣装・主役':source.name;q.hint=source.hint;});}
export function dailyInspiration(profile){if(!profile.inspiration)return profile;const labels=profile.inspiration.labels||[];const entries=labels.map(label=>/旅/.test(label)?1:/仲間|家族|支え/.test(label)?2:/創作|技術|仕事/.test(label)?3:/自然/.test(label)?4:/心|余白/.test(label)?6:/光彩/.test(label)?7:0);return {...profile,inspiration:{...profile.inspiration,themes:[...new Set(entries.map(i=>dailyScenes[i][0]))],phrases:['今日の光を、忘れない。','好きな色で、生きていく。','小さな一歩が、物語になる。'],imagery:entries.map(i=>dailyScenes[i][1]),objects:(profile.inspiration.objects||[]).filter(v=>!/[幽亡]霊|魔女|骸骨|カボチャ|怪異/.test(v))}};}
