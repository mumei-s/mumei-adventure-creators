const decode=s=>s.replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#(\d+);/g,(_,n)=>+n<=0x10ffff?String.fromCodePoint(+n):'');
export function bodyText(html){return decode(String(html||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();}
export function publicArticle(note,id){return note&&(!note.user?.urlname||note.user.urlname===id)&&note.is_published!==false&&!note.is_draft&&!note.is_limited&&!note.isLimited&&!note.is_r18&&!note.isPaid&&!(Number(note.price)>0)&&!note.paywall?.requires_purchase&&!note.paywall?.requires_membership&&note.can_read!==false;}
const rules=[
 [/発光|透明感|幻想|きらめ|輝き|ステンドグラス|光と構図|色彩/,'光彩と幻想','光と影の寓話','色の反射・透ける薄布・光源を持つ小道具・遠近のある光',['その光で、夜の続きを描こう。','まだ知らない色が、ここにある。']],
 [/水彩|にじみ|余白|詩的|絵本/,'余白と詩情','静かなハロウィーン','白い余白・水の跡・薄い紙・静かな灯り',['余白にも、魔法が息づく。','静かな夜を、ひと色ずつ。']],
 [/子育て|育児|家族|子ども|ワーママ/,'家族と暮らし','お菓子の王国','家族を迎える灯り・お菓子の食卓',['今夜は、笑顔も仮装して。','小さな魔法を、持ち帰ろう。']],
 [/共同マガジン|コミュニティ|仲間|メンバー/,'仲間とのつながり','月夜の仮面舞踏会','仮面舞踏会・集まる灯り・つながるリボン',['違う仮面で、同じ夜へ。','その灯り、ひとり分じゃない。']],
 [/イラスト|描く|絵画|アート|デザイン|創作/,'創作と表現','真夜中の魔女のアトリエ','筆・絵具・制作途中の作品・魔法の工房',['まだ見ぬ色で、夜を描こう。','この一夜を、作品に変える。']],
 [/写真|カメラ|撮影/,'写真と記憶','記憶の標本室','写真の断片・フィルム・記憶の標本',['その瞬間に、魔法が残る。','シャッターの向こうに、もう一夜。']],
 [/AI|人工知能|技術|プログラム|システム|ツール/,'技術と未来','機械仕掛けの怪物','歯車・回路・動く工房・未来の仮面',['夜の続きを、組み立てよう。','この魔法は、まだ進化する。']],
 [/医療|福祉|介護|看護|健康|支える/,'支え合い','幽霊たちのお茶会','柔らかな灯り・温かいお茶・安心できる場所',['怖い夜にも、ぬくもりを。','灯りのあるほうで、待っている。']],
 [/自然|花|森|動物|季節/,'自然と季節','カボチャの収穫祭','紅葉・種・収穫・夜の庭',['季節の隙間に、魔法が咲く。','この夜にも、実りがある。']],
 [/働く|仕事|挑戦|副業|収益|マーケティング/,'仕事と挑戦','星を集める旅','旅の道具・扉・小さな星を集める道',['次の扉は、今夜ひらく。','まだ届かない星へ、手を伸ばす。']],
 [/旅行|旅|散歩|街/,'旅と発見','異界に続く駅','切符・地図・見知らぬ駅・旅の鞄',['この切符は、真夜中行き。','知らない夜に、降りてみよう。']],
 [/心|思い出|記憶|気持ち|詩|小説|物語/,'心と物語','鏡の向こうの自分','鏡・古い手紙・静かな月光・物語の扉',['鏡の向こうで、続きを話そう。','隠した想いも、今夜の衣装。']]
];
const objects=['月','星','海','空','雨','花','森','光','影','鏡','時計','手紙','扉','列車','本','音楽','夢','猫','鳥','宝石','灯り'];
export function articleSignals(articles,topics){const corpus=articles.map(a=>a.text).join(' ');const matched=rules.filter(([rx])=>rx.test(corpus));const signals=matched.map(([rx,label,theme,imagery,phrases])=>({label,theme,imagery,phrases,score:articles.reduce((sum,a)=>sum+Math.min(10,[...a.text.matchAll(new RegExp(rx.source,'g'))].length),0)}));return {signals,bodyTopics:topics.filter(k=>k==='AI'?/\bAI\b/i.test(corpus):corpus.includes(k)),labels:signals.map(x=>x.label),themes:[...new Set(signals.map(x=>x.theme))],imagery:signals.map(x=>x.imagery),phrases:signals.flatMap(x=>x.phrases),objects:objects.filter(x=>corpus.includes(x))};}

// Select excerpts from the beginning and later body. Full text is still retained
// on the article record; these short passages are supporting model evidence.
export function articleEvidence(body){
 const text=String(body||'').trim();
 if(!text)return {excerpts:[]};
 const sentences=text.match(/[^。！？!?]+[。！？!?]?/g)||[text];
 const substantive=sentences.map(sentence=>sentence.trim()).filter(sentence=>sentence.length>=18&&!/^(?:この記事|続きをみる|この続きを|ログイン|スキ|フォロー|シェア|購入)/.test(sentence));
 const first=(substantive[0]||text).slice(0,240);
 const latter=substantive[Math.floor(substantive.length/2)]||text.slice(Math.floor(text.length/2));
 return {excerpts:[...new Set([first,latter.slice(0,240)])].filter(Boolean)};
}
