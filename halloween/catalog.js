import {extraTypographyGroups} from './typography-options.js?v=28.4.0';
import {compatibleResolved} from './compatibility.js?v=28.4.0';
import {selectionConflicts} from './compatibility.js?v=28.4.0';
import {automaticSelection,sampleAutomaticSelections,selectionFingerprint,RepeatedSelectionError} from './random-selections.js?v=28.4.0';
import {poseGroups} from './poses.js?v=28.4.0';
import {colorWorlds,luminousMedia} from './worlds.js?v=28.4.0';
import {halloweenSceneGroups,sceneIsUnified,sceneSourcePlace} from './scene-presets.js?v=28.4.0';
import {angleGroups} from './angles.js?v=28.4.0';
import {referenceWorldMedia} from './world-bases.js?v=28.4.0';
export const AUTO='おまかせ';
const group=(label,values)=>({label,values:values.split('|')});
// Select how to draw first, then the scene, subject, staging and final format.
export const questions=[
 {key:'medium',name:'画風・質感',hint:'描く技法と写真の表現',groups:[group('写真・映像','実写風フィルム写真|実写風スタジオ写真|実写風街角スナップ|実写風シネマティック写真|実写風ファッション写真|実写風モノクロ銀塩写真|実写風湿板写真|実写風ポラロイド|実写風水中写真|実写風マクロ写真|実写風長時間露光|実写風インスタントカメラ'),group('アニメ・漫画','手描きアニメのセル画|現代アニメの一枚絵|90年代アニメのセル画|80年代OVA|少女漫画の扉絵|少年漫画のカラーページ|青年漫画のペン画|モノクロ漫画|アメコミのインク画|バンド・デシネ|ウェブトゥーン|劇場アニメの背景美術|ちびキャラ|絵本イラスト'),group('東洋の表現','水墨画|墨彩画|日本画・岩絵具|浮世絵木版画|大和絵|琳派の金箔表現|南画|禅画|書と墨の抽象|中国工筆画|韓国民画|和紙ちぎり絵'),group('絵画・素描','油彩・厚塗り|油彩・薄塗り|透明水彩|不透明水彩・ガッシュ|アクリル画|テンペラ画|フレスコ画|パステル画|色鉛筆画|鉛筆デッサン|木炭画|ボールペン画|線画|点描画|スクラッチボード'),group('版画・紙・工芸','銅版画・エッチング|リノカット|木版画|シルクスクリーン|リソグラフ|レタープレス|サイアノタイプ|切り絵|紙のコラージュ|写真コラージュ|折り紙の立体|刺繍・織物|タペストリー|ステンドグラス|モザイク|陶器・釉薬|漆と螺鈿'),group('立体・デジタル','クレイアート|ストップモーションの人形|フェルトの造形|精密ミニチュア|ジオラマ|トイフォト風|3D彫刻|ローポリゴン|ボクセル|ピクセルアート|ベクターグラフィック|フラットイラスト|インクとデジタル彩色|コンセプトアート|マットペインティング|グリッチアート|フラクタルアート|抽象表現'),group('美術の方向','ゴシック・ロマン主義|バロック|象徴主義|シュルレアリスム|マジックリアリズム|印象主義|表現主義|キュビスム|未来派|構成主義|ポップアート|アウトサイダーアート|ミニマリズム|サイケデリックアート')]},
 {key:'theme',name:'物語のテーマ',hint:'Halloweenの夜、何が起きる？',groups:[group('ひそやかな夜','月夜の仮面舞踏会|真夜中の魔女のアトリエ|忘れられた劇場|幽霊たちのお茶会|秘密の図書館|異界に続く駅|鏡の向こうの自分|星を集める旅|眠らない美術館|一夜だけの怪奇サーカス'),group('驚きと冒険','吸血鬼の晩餐会|死神の休日|魔法使いの見習い|悪夢からの脱出|百鬼夜行|妖狐と月の契約|海賊船の亡霊|宇宙のHalloween|機械仕掛けの怪物|呪われたオルゴール'),group('祝祭とアート','お菓子の王国|カボチャの収穫祭|都会の仮装パレード|花と骸骨の祝祭|墨で描く怪異|光と影の寓話|記憶の標本室|異世界のファッションショー|雨上がりの怪談|静かなハロウィーン')]},
 {key:'place',name:'舞台',hint:'背景にも物語を',groups:[group('屋内','古城の大広間|古い洋館の階段|魔女の書斎|無人の映画館|人形の工房|鏡の迷宮|深夜の喫茶店|廃墟の礼拝堂|骨董品店|天窓のあるアトリエ'),group('屋外','霧の森|雨の路地|月下の墓地|カボチャ畑|ネオンの繁華街|屋根の上|異界の鳥居|海辺の灯台|夜の遊園地|空中都市|雪の庭|星空の砂漠'),group('造形・抽象','墨の余白|黒いスタジオ|白いスタジオ|金箔の空間|舞台装置|紙の箱庭|抽象的な色面|参照風景を舞台にする')]},
 {key:'costume',name:'衣装・主役',hint:'特徴を残し、役柄を変える',groups:[group('仮装','魔女・魔法使い|吸血鬼|幽霊・亡霊|死神|黒猫の使い魔|カボチャの王族|悪魔|堕天使|人狼|ミイラ|怪盗|海賊|サーカスの道化師|人形|妖狐|雪女'),group('ファッション','ゴシック・クチュール|ヴィクトリア朝の正装|ダーク・ロリータ|和装と怪異|スチームパンク|サイバーパンク|ロック・パンク|仮面とドレス|アンティークの旅装|参照画像の衣装を生かす'),group('人物を描かない','風景を主役にする|モチーフだけで構成する|紋章・アイコンにする'),group("定番モンスター","白布のおばけ|フランケンシュタインの怪物|ゾンビ|骸骨・スケルトン|メデューサ|半魚人|透明人間|コウモリ人|グール|ジャック・オー・ランタン|亡霊騎士|ガーゴイル|蜘蛛の怪人|悪の科学者|幽霊花嫁|ホラーピエロ"),group("ファンタジー","エルフの弓使い|森の妖精|ドラゴンの騎士|竜人|人魚|ユニコーン|不死鳥|氷の女王|花の精霊|星の占い師|錬金術師|ネクロマンサー|光の聖騎士|闇の騎士|赤ずきん|不思議の国の旅人"),group("職業・制服","探偵|警察官|消防士|医師・白衣|ナース|パイロット|キャビンアテンダント|シェフ|メイド|執事|宇宙飛行士|郵便配達員"),group("SF・ヒーロー","ロボット|アンドロイド|サイボーグ|宇宙海賊|エイリアン|パワードスーツ|変身ヒーロー|魔法少女風コスチューム|ヴィラン・悪役|時空の旅人"),group("和風・歴史","鬼|天狗|河童|座敷わらし|忍者|侍・武者|陰陽師|巫女|西洋の王・女王|ファラオ"),group("動物・ポップ","うさぎの着ぐるみ|くまの着ぐるみ|恐竜の着ぐるみ|ペンギンの着ぐるみ|キノコの妖精|キャンディの精霊|トランプの兵隊|花嫁・花婿")]},
 {key:'pose',name:'ポーズ',hint:'身体・手足・重心を選ぶ',groups:poseGroups},
 {key:'mood',name:'感情・表情・顔の角度',hint:'余韻・躍動・怖さも、角度も選べる',groups:[group('自動','毎回大胆に変える'),group('余韻','静かで美しい|妖しく気高い|儚く切ない|温かく懐かしい|神秘的で透明感|寂しく詩的|優雅でクラシカル'),group('躍動','強く挑発的|不敵な微笑み|いたずら好き|明るく祝祭的|可愛くコミカル|疾走する冒険|劇的な勝利'),group('恐怖','少しだけ不気味|ひやりとする怪談|圧倒的な恐怖・流血なし|奇妙でシュール|無表情の緊張感'),group('表情を選ぶ','歯を見せて大笑い|目を見開いて驚く|眉を寄せて怒る|涙を浮かべる|目を閉じて安らぐ|勝ち誇ってニヤリ|片目を閉じてウインク|牙を見せて威嚇|真剣な無表情'),group('顔の角度を選ぶ','正面・首をまっすぐ|完全な左横顔90度|完全な右横顔90度|真上からの俯瞰|真下からのローアングル|背中から振り向く|顔を上に向ける|顔を下に向ける'),group('表情と角度のセット','正面＋満面の笑顔|左横顔＋静かな無表情|右横顔＋大笑い|俯瞰＋目を見開く|ローアングル＋威嚇|背中から振り向く＋ニヤリ')]},
 {key:'angle',name:'アングル・構図',hint:'カメラの位置・距離・遠近',groups:angleGroups,autoValues:['場面に合わせたアングル']},
 {key:'palette',name:'色の世界',hint:'作品を包む配色',groups:[group('カラー','漆黒 × 琥珀 × 象牙|深紅 × 黒 × 古金|群青 × 月白 × 銀|紫 × 黒 × 酸性グリーン|藍墨 × 朱 × 和紙の白|桃色 × 墨黒 × 真珠|翡翠 × 銅 × 濃紺|白 × 白銀 × 氷青|秋色のブラウン × 生成り|退色したフィルムカラー|ネオンピンク × シアン|原色のポップカラー|参照画像の色を生かす'),group('制限色','墨一色|モノクローム|黒と白と朱の三色|金と黒の二色|セピア')]},
 {key:'design',name:'デザイン',hint:'作品の見せ方',groups:[group('雑誌・カバー','ファッション雑誌の表紙|週刊誌の表紙|カルチャー誌の表紙|ゴシック雑誌の表紙|写真集の表紙|文芸誌の表紙|ZINEの表紙|インタビュー誌面|見開き特集|新聞の一面|図鑑の扉|絵本の表紙|小説の装丁|音楽アルバムジャケット|ゲームのパッケージ'),group('ポスター','映画ポスター|舞台ポスター|音楽フェスポスター|展覧会ポスター|タイポグラフィーポスター|スイス式グリッドポスター|バウハウスポスター|アールデコポスター|アールヌーヴォーポスター|サイケデリックポスター|パンク・フライヤー|レトロ旅行ポスター'),group('一枚絵・その他','通常の一枚絵|キャラクターのキービジュアル|幻想風景画|映画のワンシーン|ファッション・エディトリアル|物語の挿絵|絵巻物|屏風絵|掛け軸|タロットカード|トレーディングカード|図案・パターン|noteサムネイル|アイコン・肖像|紋章・エンブレム|ステッカー|切手|ポストカード|スマホ壁紙|広告ビジュアル')]},
 {key:'type',name:'文字・広告の密度',hint:'クリエイター名と活動内容を使う',groups:[group('おまかせ・名前','デザインに合わせて自動編集|クリエイター名＋自由な見出し|クリエイター名だけ'),group('文字たっぷり','雑誌風・見出しと特集をたっぷり|映画ポスター風・タイトルとクレジット|広告チラシ風・情報をたっぷり|新聞風・記事と段組み|物語の装丁風・タイトルと紹介'),group('控えめ・なし','HALLOWEEN＋クリエイター名|HALLOWEENのみ|短いタイトル＋名前|手書きサイン風の名前|墨の落款風の名前|セリフのみ|文字を一切入れない')]},
 {key:'line',name:'セリフ',hint:'作品に入れる一言',groups:[group('日本語','今夜だけ、私を解き放つ。|その扉、開けてみる？|怖いのは、どっち？|真夜中に、また会おう。|月が隠した、もうひとつの顔。|お菓子より、物語を。|君の夢に、お邪魔します。|夜は、まだ終わらない。|迷子になったら、月を見て。|今夜の主役は、私。|この魔法は、朝まで。|影まで踊る、Halloween。'),group('英語・なし','TRICK OR TREAT|AFTER MIDNIGHT|THE NIGHT IS OURS|HAPPY HALLOWEEN|セリフなし')]},
 {key:'size',name:'サイズ・用途',hint:'使う場所に合わせる',groups:[group('note・SNS','noteサムネイル｜1280×670｜128:67|横長16:9｜3840×2160｜16:9|正方形アイコン｜2048×2048｜1:1|縦投稿4:5｜2160×2700｜4:5|スマホ壁紙・ストーリー｜2160×3840｜9:16|縦ポスター2:3｜2400×3600｜2:3|横写真3:2｜3600×2400｜3:2|縦写真3:4｜2400×3200｜3:4|横長バナー｜3600×1200｜3:1'),group('印刷・高解像度','A4縦・300dpi目安｜2480×3508｜210:297|A4横・300dpi目安｜3508×2480｜297:210|A3縦・300dpi目安｜3508×4961｜297:420|A3横・300dpi目安｜4961×3508｜420:297|8K横・16:9｜7680×4320｜16:9')]}
];
questions.find(q=>q.key==='type').name='文字・広告';
questions.find(q=>q.key==='type').groups.push(...extraTypographyGroups.map(g=>({...g,values:[...g.values]})));
questions.find(q=>q.key==='type').groups.forEach(g=>g.values=g.values.filter(v=>v!=='セリフのみ'));
questions.find(q=>q.key==='line').autoValues=['セリフなし'];
export const visibleQuestions=questions.filter(q=>!['line','place'].includes(q.key));
const palette=questions.find(q=>q.key==='palette');
for(const [label,range] of [['光る幻想色',[0,8]],['淡色・空気',[8,16]],['鮮烈な対比',[16,24]],['紙・顔料・制限色',[24,32]]])palette.groups.push({label,values:colorWorlds.slice(...range).map(x=>x.value)});
questions.find(q=>q.key==='medium').groups.push({label:'光と透明感のアニメ',values:luminousMedia.filter(x=>!referenceWorldMedia.some(world=>world.value===x.value)).map(x=>x.value)});
questions.find(q=>q.key==='medium').groups.push({label:'宝石光彩',values:['宝石光彩アニメ','宝石光彩リアル']});
questions.find(q=>q.key==='medium').groups.push({label:'花霞・パステル・夢彩・宵彩',values:referenceWorldMedia.filter(x=>!x.value.startsWith('宝石光彩')).map(x=>x.value)});
questions.find(q=>q.key==='theme').name='世界観・シーン';
questions.find(q=>q.key==='medium').name='作風・画材';
questions.find(q=>q.key==='medium').hint='専用の描線・塗り・素材の描き方';
questions.find(q=>q.key==='place').name='舞台・場所';
questions.find(q=>q.key==='theme').hint='仮装・お菓子・怪異・秋の夜をひとつの場面で選ぶ';
questions.find(q=>q.key==='place').hint='選んだ世界の、出来事が起きる場所';
palette.hint='配色・光源・透け方まで選ぶ';
questions.find(q=>q.key==='theme').groups=halloweenSceneGroups(questions.find(q=>q.key==='theme').groups,questions.find(q=>q.key==='place').groups);
const defaultByKey={mood:'毎回大胆に変える',type:'デザインに合わせて自動編集',size:'noteサムネイル｜1280×670｜128:67'};
export const defaults=questions.map(q=>defaultByKey[q.key]||AUTO);
export function normalizeCreator(raw){
 let id=raw.trim();if(!id)return '';
 if(/^(www\.)?note\.com\//i.test(id))id='https://'+id;
 if(/^https?:\/\//i.test(id)){let u;try{u=new URL(id)}catch{return null}if(!['note.com','www.note.com'].includes(u.hostname))return null;id=u.pathname.split('/').filter(Boolean)[0]||'';}
 id=id.replace(/^@/,'');return /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(id)?id:null;
}
let selectionRefiner=null;
export function setSelectionRefiner(refiner){selectionRefiner=refiner;}
export function resolveSelections(values={},random=Math.random,{recent=[],requireFresh=false}={}){
 const unified=sceneIsUnified(values),input=unified?{...values,place:AUTO}:values;
 const keys=questions.map(q=>q.key),recentValues=recent.filter(Boolean),seen=new Set(recentValues.map(values=>selectionFingerprint(values,keys)));
 const noPerson=/風景を主役|モチーフだけ|紋章・アイコン/.test(input.costume||'');
 const mutable=questions.filter(q=>automaticSelection(input[q.key])&&!(unified&&['place','line'].includes(q.key))&&!(noPerson&&['mood','pose'].includes(q.key))).map(q=>q.key);
 let result;
 for(let attempt=0;attempt<(seen.size?24:1);attempt++){
  const resolved=sampleAutomaticSelections(questions,input,random,{recent:recentValues,attempt});
  const sourcePlace=sceneSourcePlace(resolved.theme);
  if(unified&&sourcePlace)resolved.place=sourcePlace;
  const refined=selectionRefiner?selectionRefiner(resolved,input,random,{recent:recentValues,attempt}):resolved;
  result=compatibleResolved(refined,input,questions,random,{recent:recentValues,attempt});
  if(unified)result.sceneUnified=true;
  // Explicit conflicts stay reviewable, without replacing any fixed choice.
  if(selectionConflicts(result).length||!seen.has(selectionFingerprint(result,keys))||!mutable.length)return result;
 }
 const exhausted=new RepeatedSelectionError(result,mutable);
 if(requireFresh)throw exhausted;
 Object.defineProperty(result,'automaticResolution',{value:{reused:true,issues:exhausted.issues,reason:exhausted.message},enumerable:false});
 return result;
}
