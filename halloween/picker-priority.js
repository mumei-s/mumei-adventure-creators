// The first unfiltered page contains prepared, useful starting points. Group
// filters retain their original order, and every remaining option stays listed.
const common={
 medium:['発光幻想アニメ','発光幻想リアル','宝石光彩アニメ','宝石光彩リアル','現代アニメの一枚絵','実写風シネマティック写真','ちびキャラ','クリスタル透光アニメ'],
 costume:['参照画像の衣装を生かす','魔女・魔法使い','吸血鬼','幽霊・亡霊','仮面とドレス','黒猫の使い魔'],
 pose:['まっすぐ立つ','振り向く','椅子に腰掛ける','四つん這いで進む','片手を差し出す','くるりと踊る'],
 mood:['毎回大胆に変える','不敵な微笑み','神秘的で透明感','片目を閉じてウインク','正面＋満面の笑顔','背中から振り向く＋ニヤリ'],
 angle:['全身・周囲も見せる','斜め前45度','超ローアングル・70度','真上から・90度','上半身の接写','遠景・世界を主役に'],
 palette:['群青 × 月白 × 銀','紫 × 黒 × 酸性グリーン','翡翠 × 銅 × 濃紺','深紅 × 黒 × 古金','漆黒 × 琥珀 × 象牙','桃色 × 墨黒 × 真珠'],
 design:['通常の一枚絵','映画ポスター','ファッション雑誌の表紙','週刊誌の表紙','新聞の一面','トレーディングカード'],
 type:['デザインに合わせて自動編集','文字を一切入れない','クリエイター名だけ','クリエイター名＋自由な見出し','雑誌風・見出しと特集をたっぷり','新聞風・記事と段組み'],
 size:['noteサムネイル｜1280×670｜128:67','A4縦・300dpi目安｜2480×3508｜210:297','横長16:9｜3840×2160｜16:9','縦投稿4:5｜2160×2700｜4:5','スマホ壁紙・ストーリー｜2160×3840｜9:16','正方形アイコン｜2048×2048｜1:1']
};
const collectionSpecific={
 halloween:{theme:['一夜だけの怪奇サーカス','月夜の仮面舞踏会','真夜中の魔女のアトリエ','幽霊たちのお茶会','カボチャの収穫祭','鏡の向こうの自分']},
 everyday:{theme:['朝の光と小さな日常','街角のファッション','旅先で見つけた景色','ものづくりの時間','季節を歩く','静かな読書の時間'],costume:['参照画像の衣装を生かす','リネンシャツとデニム','ワンピースとカーディガン','現代のテーラードスーツ','スポーツウェア','風景を主役にする'],design:['通常の一枚絵','noteサムネイル','自然・都市の風景画','ファッション雑誌の表紙','新聞の一面','ポストカード']}
};
export function pickerRecords(question,{group='すべて',collection='halloween',favorites=[]}={}){
 const records=question.groups.filter(item=>group==='すべて'||item.label===group).flatMap(item=>item.values.map(value=>({value,group:item.label})));
 if(group!=='すべて')return records;
 const preferred=[...new Set([...favorites,...(collectionSpecific[collection]?.[question.key]||common[question.key]||[])])],ranks=new Map(preferred.map((value,index)=>[value,index]));
 return records.map((record,index)=>({record,index,rank:ranks.get(record.value)??preferred.length+index})).sort((a,b)=>a.rank-b.rank||a.index-b.index).map(item=>item.record);
}
