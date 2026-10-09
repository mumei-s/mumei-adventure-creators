import {drawingReferenceFor,drawingReferenceInstructions,loadDrawingReferences} from './drawing-references.js?v=28.4.4';

// Assistant-provided, repository-owned style samples. Character uploads remain separate.
// File mappings are explicit: no arbitrary URL or filename can become a preset.
const presetEntries=[
 {"medium":"実写風フィルム写真","file":"japan-previews-v21/medium-01-01.jpg","name":"style-preset-001.jpg","role":"style-preset","label":"実写風フィルム写真のプリセット見本","category":"写真・映像"},
 {"medium":"実写風スタジオ写真","file":"japan-previews-v21/medium-01-02.jpg","name":"style-preset-002.jpg","role":"style-preset","label":"実写風スタジオ写真のプリセット見本","category":"写真・映像"},
 {"medium":"実写風街角スナップ","file":"japan-previews-v21/medium-01-03.jpg","name":"style-preset-003.jpg","role":"style-preset","label":"実写風街角スナップのプリセット見本","category":"写真・映像"},
 {"medium":"実写風シネマティック写真","file":"japan-previews-v21/medium-01-04.jpg","name":"style-preset-004.jpg","role":"style-preset","label":"実写風シネマティック写真のプリセット見本","category":"写真・映像"},
 {"medium":"実写風ファッション写真","file":"japan-previews-v21/medium-01-05.jpg","name":"style-preset-005.jpg","role":"style-preset","label":"実写風ファッション写真のプリセット見本","category":"写真・映像"},
 {"medium":"実写風モノクロ銀塩写真","file":"japan-previews-v21/medium-01-06.jpg","name":"style-preset-006.jpg","role":"style-preset","label":"実写風モノクロ銀塩写真のプリセット見本","category":"写真・映像"},
 {"medium":"実写風湿板写真","file":"japan-previews-v21/medium-01-07.jpg","name":"style-preset-007.jpg","role":"style-preset","label":"実写風湿板写真のプリセット見本","category":"写真・映像"},
 {"medium":"実写風ポラロイド","file":"japan-previews-v21/medium-01-08.jpg","name":"style-preset-008.jpg","role":"style-preset","label":"実写風ポラロイドのプリセット見本","category":"写真・映像"},
 {"medium":"実写風水中写真","file":"japan-previews-v21/medium-01-09.jpg","name":"style-preset-009.jpg","role":"style-preset","label":"実写風水中写真のプリセット見本","category":"写真・映像"},
 {"medium":"実写風マクロ写真","file":"japan-previews-v21/medium-01-10.jpg","name":"style-preset-010.jpg","role":"style-preset","label":"実写風マクロ写真のプリセット見本","category":"写真・映像"},
 {"medium":"実写風長時間露光","file":"japan-previews-v21/medium-01-11.jpg","name":"style-preset-011.jpg","role":"style-preset","label":"実写風長時間露光のプリセット見本","category":"写真・映像"},
 {"medium":"実写風インスタントカメラ","file":"japan-previews-v21/medium-01-12.jpg","name":"style-preset-012.jpg","role":"style-preset","label":"実写風インスタントカメラのプリセット見本","category":"写真・映像"},
 {"medium":"手描きアニメのセル画","file":"japan-previews-v21/medium-01-13.jpg","name":"style-preset-013.jpg","role":"style-preset","label":"手描きアニメのセル画のプリセット見本","category":"アニメ・漫画"},
 {"medium":"現代アニメの一枚絵","file":"japan-previews-v21/medium-01-14.jpg","name":"style-preset-014.jpg","role":"style-preset","label":"現代アニメの一枚絵のプリセット見本","category":"アニメ・漫画"},
 {"medium":"90年代アニメのセル画","file":"japan-previews-v21/medium-01-15.jpg","name":"style-preset-015.jpg","role":"style-preset","label":"90年代アニメのセル画のプリセット見本","category":"アニメ・漫画"},
 {"medium":"80年代OVA","file":"japan-previews-v21/medium-01-16.jpg","name":"style-preset-016.jpg","role":"style-preset","label":"80年代OVAのプリセット見本","category":"アニメ・漫画"},
 {"medium":"少女漫画の扉絵","file":"japan-previews-v21/medium-02-01.jpg","name":"style-preset-017.jpg","role":"style-preset","label":"少女漫画の扉絵のプリセット見本","category":"アニメ・漫画"},
 {"medium":"少年漫画のカラーページ","file":"japan-previews-v21/medium-02-02.jpg","name":"style-preset-018.jpg","role":"style-preset","label":"少年漫画のカラーページのプリセット見本","category":"アニメ・漫画"},
 {"medium":"青年漫画のペン画","file":"japan-previews-v21/medium-02-03.jpg","name":"style-preset-019.jpg","role":"style-preset","label":"青年漫画のペン画のプリセット見本","category":"アニメ・漫画"},
 {"medium":"モノクロ漫画","file":"japan-previews-v21/medium-02-04.jpg","name":"style-preset-020.jpg","role":"style-preset","label":"モノクロ漫画のプリセット見本","category":"アニメ・漫画"},
 {"medium":"アメコミのインク画","file":"japan-previews-v21/medium-02-05.jpg","name":"style-preset-021.jpg","role":"style-preset","label":"アメコミのインク画のプリセット見本","category":"アニメ・漫画"},
 {"medium":"バンド・デシネ","file":"japan-previews-v21/medium-02-06.jpg","name":"style-preset-022.jpg","role":"style-preset","label":"バンド・デシネのプリセット見本","category":"アニメ・漫画"},
 {"medium":"ウェブトゥーン","file":"japan-previews-v21/medium-02-07.jpg","name":"style-preset-023.jpg","role":"style-preset","label":"ウェブトゥーンのプリセット見本","category":"アニメ・漫画"},
 {"medium":"劇場アニメの背景美術","file":"japan-previews-v21/medium-02-08.jpg","name":"style-preset-024.jpg","role":"style-preset","label":"劇場アニメの背景美術のプリセット見本","category":"アニメ・漫画"},
 {"medium":"ちびキャラ","file":"japan-previews-v21/medium-02-09.jpg","name":"style-preset-025.jpg","role":"style-preset","label":"ちびキャラのプリセット見本","category":"アニメ・漫画"},
 {"medium":"絵本イラスト","file":"japan-previews-v21/medium-02-10.jpg","name":"style-preset-026.jpg","role":"style-preset","label":"絵本イラストのプリセット見本","category":"アニメ・漫画"},
 {"medium":"水墨画","file":"japan-previews-v21/medium-02-11.jpg","name":"style-preset-027.jpg","role":"style-preset","label":"水墨画のプリセット見本","category":"東洋の表現"},
 {"medium":"墨彩画","file":"japan-previews-v21/medium-02-12.jpg","name":"style-preset-028.jpg","role":"style-preset","label":"墨彩画のプリセット見本","category":"東洋の表現"},
 {"medium":"日本画・岩絵具","file":"japan-previews-v21/medium-02-13.jpg","name":"style-preset-029.jpg","role":"style-preset","label":"日本画・岩絵具のプリセット見本","category":"東洋の表現"},
 {"medium":"浮世絵木版画","file":"japan-previews-v21/medium-02-14.jpg","name":"style-preset-030.jpg","role":"style-preset","label":"浮世絵木版画のプリセット見本","category":"東洋の表現"},
 {"medium":"大和絵","file":"japan-previews-v21/medium-02-15.jpg","name":"style-preset-031.jpg","role":"style-preset","label":"大和絵のプリセット見本","category":"東洋の表現"},
 {"medium":"琳派の金箔表現","file":"japan-previews-v21/medium-02-16.jpg","name":"style-preset-032.jpg","role":"style-preset","label":"琳派の金箔表現のプリセット見本","category":"東洋の表現"},
 {"medium":"南画","file":"japan-previews-v21/medium-03-01.jpg","name":"style-preset-033.jpg","role":"style-preset","label":"南画のプリセット見本","category":"東洋の表現"},
 {"medium":"禅画","file":"japan-previews-v21/medium-03-02.jpg","name":"style-preset-034.jpg","role":"style-preset","label":"禅画のプリセット見本","category":"東洋の表現"},
 {"medium":"書と墨の抽象","file":"japan-previews-v21/medium-03-03.jpg","name":"style-preset-035.jpg","role":"style-preset","label":"書と墨の抽象のプリセット見本","category":"東洋の表現"},
 {"medium":"中国工筆画","file":"japan-previews-v21/medium-03-04.jpg","name":"style-preset-036.jpg","role":"style-preset","label":"中国工筆画のプリセット見本","category":"東洋の表現"},
 {"medium":"韓国民画","file":"japan-previews-v21/medium-03-05.jpg","name":"style-preset-037.jpg","role":"style-preset","label":"韓国民画のプリセット見本","category":"東洋の表現"},
 {"medium":"和紙ちぎり絵","file":"japan-previews-v21/medium-03-06.jpg","name":"style-preset-038.jpg","role":"style-preset","label":"和紙ちぎり絵のプリセット見本","category":"東洋の表現"},
 {"medium":"油彩・厚塗り","file":"japan-previews-v21/medium-03-07.jpg","name":"style-preset-039.jpg","role":"style-preset","label":"油彩・厚塗りのプリセット見本","category":"絵画・素描"},
 {"medium":"油彩・薄塗り","file":"japan-previews-v21/medium-03-08.jpg","name":"style-preset-040.jpg","role":"style-preset","label":"油彩・薄塗りのプリセット見本","category":"絵画・素描"},
 {"medium":"透明水彩","file":"japan-previews-v21/medium-03-09.jpg","name":"style-preset-041.jpg","role":"style-preset","label":"透明水彩のプリセット見本","category":"絵画・素描"},
 {"medium":"不透明水彩・ガッシュ","file":"japan-previews-v21/medium-03-10.jpg","name":"style-preset-042.jpg","role":"style-preset","label":"不透明水彩・ガッシュのプリセット見本","category":"絵画・素描"},
 {"medium":"アクリル画","file":"japan-previews-v21/medium-03-11.jpg","name":"style-preset-043.jpg","role":"style-preset","label":"アクリル画のプリセット見本","category":"絵画・素描"},
 {"medium":"テンペラ画","file":"japan-previews-v21/medium-03-12.jpg","name":"style-preset-044.jpg","role":"style-preset","label":"テンペラ画のプリセット見本","category":"絵画・素描"},
 {"medium":"フレスコ画","file":"japan-previews-v21/medium-03-13.jpg","name":"style-preset-045.jpg","role":"style-preset","label":"フレスコ画のプリセット見本","category":"絵画・素描"},
 {"medium":"パステル画","file":"japan-previews-v21/medium-03-14.jpg","name":"style-preset-046.jpg","role":"style-preset","label":"パステル画のプリセット見本","category":"絵画・素描"},
 {"medium":"色鉛筆画","file":"japan-previews-v21/medium-03-15.jpg","name":"style-preset-047.jpg","role":"style-preset","label":"色鉛筆画のプリセット見本","category":"絵画・素描"},
 {"medium":"鉛筆デッサン","file":"japan-previews-v21/medium-03-16.jpg","name":"style-preset-048.jpg","role":"style-preset","label":"鉛筆デッサンのプリセット見本","category":"絵画・素描"},
 {"medium":"木炭画","file":"japan-previews-v21/medium-04-01.jpg","name":"style-preset-049.jpg","role":"style-preset","label":"木炭画のプリセット見本","category":"絵画・素描"},
 {"medium":"ボールペン画","file":"japan-previews-v21/medium-04-02.jpg","name":"style-preset-050.jpg","role":"style-preset","label":"ボールペン画のプリセット見本","category":"絵画・素描"},
 {"medium":"線画","file":"japan-previews-v21/medium-04-03.jpg","name":"style-preset-051.jpg","role":"style-preset","label":"線画のプリセット見本","category":"絵画・素描"},
 {"medium":"点描画","file":"japan-previews-v21/medium-04-04.jpg","name":"style-preset-052.jpg","role":"style-preset","label":"点描画のプリセット見本","category":"絵画・素描"},
 {"medium":"スクラッチボード","file":"japan-previews-v21/medium-04-05.jpg","name":"style-preset-053.jpg","role":"style-preset","label":"スクラッチボードのプリセット見本","category":"絵画・素描"},
 {"medium":"銅版画・エッチング","file":"japan-previews-v21/medium-04-06.jpg","name":"style-preset-054.jpg","role":"style-preset","label":"銅版画・エッチングのプリセット見本","category":"版画・紙・工芸"},
 {"medium":"リノカット","file":"japan-previews-v21/medium-04-07.jpg","name":"style-preset-055.jpg","role":"style-preset","label":"リノカットのプリセット見本","category":"版画・紙・工芸"},
 {"medium":"木版画","file":"japan-previews-v21/medium-04-08.jpg","name":"style-preset-056.jpg","role":"style-preset","label":"木版画のプリセット見本","category":"版画・紙・工芸"},
 {"medium":"シルクスクリーン","file":"japan-previews-v21/medium-04-09.jpg","name":"style-preset-057.jpg","role":"style-preset","label":"シルクスクリーンのプリセット見本","category":"版画・紙・工芸"},
 {"medium":"リソグラフ","file":"japan-previews-v21/medium-04-10.jpg","name":"style-preset-058.jpg","role":"style-preset","label":"リソグラフのプリセット見本","category":"版画・紙・工芸"},
 {"medium":"レタープレス","file":"japan-previews-v21/medium-04-11.jpg","name":"style-preset-059.jpg","role":"style-preset","label":"レタープレスのプリセット見本","category":"版画・紙・工芸"},
 {"medium":"サイアノタイプ","file":"japan-previews-v21/medium-04-12.jpg","name":"style-preset-060.jpg","role":"style-preset","label":"サイアノタイプのプリセット見本","category":"版画・紙・工芸"},
 {"medium":"切り絵","file":"japan-previews-v21/medium-04-13.jpg","name":"style-preset-061.jpg","role":"style-preset","label":"切り絵のプリセット見本","category":"版画・紙・工芸"},
 {"medium":"紙のコラージュ","file":"japan-previews-v21/medium-04-14.jpg","name":"style-preset-062.jpg","role":"style-preset","label":"紙のコラージュのプリセット見本","category":"版画・紙・工芸"},
 {"medium":"写真コラージュ","file":"japan-previews-v21/medium-04-15.jpg","name":"style-preset-063.jpg","role":"style-preset","label":"写真コラージュのプリセット見本","category":"版画・紙・工芸"},
 {"medium":"折り紙の立体","file":"japan-previews-v21/medium-04-16.jpg","name":"style-preset-064.jpg","role":"style-preset","label":"折り紙の立体のプリセット見本","category":"版画・紙・工芸"},
 {"medium":"刺繍・織物","file":"japan-previews-v21/medium-05-01.jpg","name":"style-preset-065.jpg","role":"style-preset","label":"刺繍・織物のプリセット見本","category":"版画・紙・工芸"},
 {"medium":"タペストリー","file":"japan-previews-v21/medium-05-02.jpg","name":"style-preset-066.jpg","role":"style-preset","label":"タペストリーのプリセット見本","category":"版画・紙・工芸"},
 {"medium":"ステンドグラス","file":"japan-previews-v21/medium-05-03.jpg","name":"style-preset-067.jpg","role":"style-preset","label":"ステンドグラスのプリセット見本","category":"版画・紙・工芸"},
 {"medium":"モザイク","file":"japan-previews-v21/medium-05-04.jpg","name":"style-preset-068.jpg","role":"style-preset","label":"モザイクのプリセット見本","category":"版画・紙・工芸"},
 {"medium":"陶器・釉薬","file":"japan-previews-v21/medium-05-05.jpg","name":"style-preset-069.jpg","role":"style-preset","label":"陶器・釉薬のプリセット見本","category":"版画・紙・工芸"},
 {"medium":"漆と螺鈿","file":"japan-previews-v21/medium-05-06.jpg","name":"style-preset-070.jpg","role":"style-preset","label":"漆と螺鈿のプリセット見本","category":"版画・紙・工芸"},
 {"medium":"クレイアート","file":"japan-previews-v21/medium-05-07.jpg","name":"style-preset-071.jpg","role":"style-preset","label":"クレイアートのプリセット見本","category":"立体・デジタル"},
 {"medium":"ストップモーションの人形","file":"japan-previews-v21/medium-05-08.jpg","name":"style-preset-072.jpg","role":"style-preset","label":"ストップモーションの人形のプリセット見本","category":"立体・デジタル"},
 {"medium":"フェルトの造形","file":"japan-previews-v21/medium-05-09.jpg","name":"style-preset-073.jpg","role":"style-preset","label":"フェルトの造形のプリセット見本","category":"立体・デジタル"},
 {"medium":"精密ミニチュア","file":"japan-previews-v21/medium-05-10.jpg","name":"style-preset-074.jpg","role":"style-preset","label":"精密ミニチュアのプリセット見本","category":"立体・デジタル"},
 {"medium":"ジオラマ","file":"japan-previews-v21/medium-05-11.jpg","name":"style-preset-075.jpg","role":"style-preset","label":"ジオラマのプリセット見本","category":"立体・デジタル"},
 {"medium":"トイフォト風","file":"japan-previews-v21/medium-05-12.jpg","name":"style-preset-076.jpg","role":"style-preset","label":"トイフォト風のプリセット見本","category":"立体・デジタル"},
 {"medium":"3D彫刻","file":"japan-previews-v21/medium-05-13.jpg","name":"style-preset-077.jpg","role":"style-preset","label":"3D彫刻のプリセット見本","category":"立体・デジタル"},
 {"medium":"ローポリゴン","file":"japan-previews-v21/medium-05-14.jpg","name":"style-preset-078.jpg","role":"style-preset","label":"ローポリゴンのプリセット見本","category":"立体・デジタル"},
 {"medium":"ボクセル","file":"japan-previews-v21/medium-05-15.jpg","name":"style-preset-079.jpg","role":"style-preset","label":"ボクセルのプリセット見本","category":"立体・デジタル"},
 {"medium":"ピクセルアート","file":"japan-previews-v21/medium-05-16.jpg","name":"style-preset-080.jpg","role":"style-preset","label":"ピクセルアートのプリセット見本","category":"立体・デジタル"},
 {"medium":"ベクターグラフィック","file":"japan-previews-v21/medium-06-01.jpg","name":"style-preset-081.jpg","role":"style-preset","label":"ベクターグラフィックのプリセット見本","category":"立体・デジタル"},
 {"medium":"フラットイラスト","file":"japan-previews-v21/medium-06-02.jpg","name":"style-preset-082.jpg","role":"style-preset","label":"フラットイラストのプリセット見本","category":"立体・デジタル"},
 {"medium":"インクとデジタル彩色","file":"japan-previews-v21/medium-06-03.jpg","name":"style-preset-083.jpg","role":"style-preset","label":"インクとデジタル彩色のプリセット見本","category":"立体・デジタル"},
 {"medium":"コンセプトアート","file":"japan-previews-v21/medium-06-04.jpg","name":"style-preset-084.jpg","role":"style-preset","label":"コンセプトアートのプリセット見本","category":"立体・デジタル"},
 {"medium":"マットペインティング","file":"japan-previews-v21/medium-06-05.jpg","name":"style-preset-085.jpg","role":"style-preset","label":"マットペインティングのプリセット見本","category":"立体・デジタル"},
 {"medium":"グリッチアート","file":"japan-previews-v21/medium-06-06.jpg","name":"style-preset-086.jpg","role":"style-preset","label":"グリッチアートのプリセット見本","category":"立体・デジタル"},
 {"medium":"フラクタルアート","file":"japan-previews-v21/medium-06-07.jpg","name":"style-preset-087.jpg","role":"style-preset","label":"フラクタルアートのプリセット見本","category":"立体・デジタル"},
 {"medium":"抽象表現","file":"japan-previews-v21/medium-06-08.jpg","name":"style-preset-088.jpg","role":"style-preset","label":"抽象表現のプリセット見本","category":"立体・デジタル"},
 {"medium":"ゴシック・ロマン主義","file":"japan-previews-v21/medium-06-09.jpg","name":"style-preset-089.jpg","role":"style-preset","label":"ゴシック・ロマン主義のプリセット見本","category":"美術の方向"},
 {"medium":"バロック","file":"japan-previews-v21/medium-06-10.jpg","name":"style-preset-090.jpg","role":"style-preset","label":"バロックのプリセット見本","category":"美術の方向"},
 {"medium":"象徴主義","file":"japan-previews-v21/medium-06-11.jpg","name":"style-preset-091.jpg","role":"style-preset","label":"象徴主義のプリセット見本","category":"美術の方向"},
 {"medium":"シュルレアリスム","file":"japan-previews-v21/medium-06-12.jpg","name":"style-preset-092.jpg","role":"style-preset","label":"シュルレアリスムのプリセット見本","category":"美術の方向"},
 {"medium":"マジックリアリズム","file":"japan-previews-v21/medium-06-13.jpg","name":"style-preset-093.jpg","role":"style-preset","label":"マジックリアリズムのプリセット見本","category":"美術の方向"},
 {"medium":"印象主義","file":"japan-previews-v21/medium-06-14.jpg","name":"style-preset-094.jpg","role":"style-preset","label":"印象主義のプリセット見本","category":"美術の方向"},
 {"medium":"表現主義","file":"japan-previews-v21/medium-06-15.jpg","name":"style-preset-095.jpg","role":"style-preset","label":"表現主義のプリセット見本","category":"美術の方向"},
 {"medium":"キュビスム","file":"japan-previews-v21/medium-06-16.jpg","name":"style-preset-096.jpg","role":"style-preset","label":"キュビスムのプリセット見本","category":"美術の方向"},
 {"medium":"未来派","file":"japan-previews-v21/medium-07-01.jpg","name":"style-preset-097.jpg","role":"style-preset","label":"未来派のプリセット見本","category":"美術の方向"},
 {"medium":"構成主義","file":"japan-previews-v21/medium-07-02.jpg","name":"style-preset-098.jpg","role":"style-preset","label":"構成主義のプリセット見本","category":"美術の方向"},
 {"medium":"ポップアート","file":"japan-previews-v21/medium-07-03.jpg","name":"style-preset-099.jpg","role":"style-preset","label":"ポップアートのプリセット見本","category":"美術の方向"},
 {"medium":"アウトサイダーアート","file":"japan-previews-v21/medium-07-04.jpg","name":"style-preset-100.jpg","role":"style-preset","label":"アウトサイダーアートのプリセット見本","category":"美術の方向"},
 {"medium":"ミニマリズム","file":"japan-previews-v21/medium-07-05.jpg","name":"style-preset-101.jpg","role":"style-preset","label":"ミニマリズムのプリセット見本","category":"美術の方向"},
 {"medium":"サイケデリックアート","file":"japan-previews-v21/medium-07-06.jpg","name":"style-preset-102.jpg","role":"style-preset","label":"サイケデリックアートのプリセット見本","category":"美術の方向"},
 {"medium":"発光幻想アニメ","file":"assets/style-fine-light-original-v28-4-4-refined.png","name":"style-preset-103.png","role":"style-preset","label":"発光幻想アニメのプリセット見本","category":"光と透明感"},
 {"medium":"透明水彩アニメ","file":"japan-previews-v21/medium-07-07.jpg","name":"style-preset-104.jpg","role":"style-preset","label":"透明水彩アニメのプリセット見本","category":"光と透明感"},
 {"medium":"絵画的シネマアニメ","file":"japan-previews-v21/medium-07-08.jpg","name":"style-preset-105.jpg","role":"style-preset","label":"絵画的シネマアニメのプリセット見本","category":"光と透明感"},
 {"medium":"宝石ホログラムアニメ","file":"assets/style-jewel-hologram-original-v28-4-3.png","name":"style-preset-106.png","role":"style-preset","label":"宝石ホログラムアニメのプリセット見本","category":"光と透明感"},
 {"medium":"クリスタル透光アニメ","file":"assets/style-crystal-transmission-original-v28-4-3.png","name":"style-preset-107.png","role":"style-preset","label":"クリスタル透光アニメのプリセット見本","category":"光と透明感"},
 {"medium":"クリスタルホログラム造形アニメ","file":"assets/style-crystal-hologram-original-v28-4-3.png","name":"style-preset-108.png","role":"style-preset","label":"クリスタルホログラム造形アニメのプリセット見本","category":"光と透明感"},
 {"medium":"宝石光彩アニメ","file":"assets/drawing-jewel-anime-v28.png","name":"style-preset-109.png","role":"style-preset","label":"宝石光彩アニメのプリセット見本","category":"宝石光彩"},
 {"medium":"宝石光彩リアル","file":"assets/drawing-jewel-real-v28.png","name":"style-preset-110.png","role":"style-preset","label":"宝石光彩リアルのプリセット見本","category":"宝石光彩"},
 {"medium":"花霞の透明アニメ","file":"assets/style-flower-haze-original-v28-4-3.png","name":"style-preset-111.png","role":"style-preset","label":"花霞の透明アニメのプリセット見本","category":"花霞・パステル・夢彩・宵彩"},
 {"medium":"ミルキーパステルアニメ","file":"assets/style-milky-pastel-original-v28-4-3.png","name":"style-preset-112.png","role":"style-preset","label":"ミルキーパステルアニメのプリセット見本","category":"花霞・パステル・夢彩・宵彩"},
 {"medium":"夢彩ファンタジーアニメ","file":"assets/style-dream-fantasy-original-v28-4-3.png","name":"style-preset-113.png","role":"style-preset","label":"夢彩ファンタジーアニメのプリセット見本","category":"花霞・パステル・夢彩・宵彩"},
 {"medium":"宵彩ゴシックアニメ","file":"assets/style-dusk-gothic-original-v28-4-3.png","name":"style-preset-114.png","role":"style-preset","label":"宵彩ゴシックアニメのプリセット見本","category":"花霞・パステル・夢彩・宵彩"},
 {"medium":"発光幻想リアル","file":"assets/style-luminous-real-original-v28-4-2.png","name":"style-preset-115.png","role":"style-preset","label":"発光幻想リアル（実写）のプリセット見本","category":"光と透明感"},
 {"medium":"薄膜光彩アニメ","file":"assets/style-film-light-original-v28-4-4-refined.png","name":"style-preset-116.png","role":"style-preset","label":"薄膜光彩アニメの独自作画見本","category":"光彩幻想・高精細"},
 {"medium":"白域幾何・宇宙彩アニメ","file":"assets/style-white-geometry-original-v28-4-4.png","name":"style-preset-117.png","role":"style-preset","label":"白域幾何・宇宙彩アニメの独自作画見本","category":"光彩幻想・高精細"},
 {"medium":"艶彩幻想アニメ","file":"assets/style-gloss-fantasy-original-v28-4-4.png","name":"style-preset-118.png","role":"style-preset","label":"艶彩幻想アニメの独自作画見本","category":"光彩幻想・高精細"}
];
export const stylePresets=Object.freeze(presetEntries.map(entry=>{
 const drawing=drawingReferenceFor(entry.medium);
 return Object.freeze(drawing?{...entry,...drawing,category:entry.category}:{...entry});
}));
const legacyReplacedPresets={"宝石ホログラムアニメ":{"file":"japan-previews-v21/medium-07-09.jpg","name":"style-preset-106.jpg","role":"style-preset"},"クリスタル透光アニメ":{"file":"japan-previews-v21/medium-07-10.jpg","name":"style-preset-107.jpg","role":"style-preset"},"クリスタルホログラム造形アニメ":{"file":"japan-crystal-object-v18.png","name":"style-preset-108.png","role":"style-preset"},"花霞の透明アニメ":{"file":"world-034.jpg","name":"style-preset-111.jpg","role":"style-preset"},"ミルキーパステルアニメ":{"file":"world-009.jpg","name":"style-preset-112.jpg","role":"style-preset"},"夢彩ファンタジーアニメ":{"file":"world-035.jpg","name":"style-preset-113.jpg","role":"style-preset"},"宵彩ゴシックアニメ":{"file":"world-033.jpg","name":"style-preset-114.jpg","role":"style-preset"}};
const presetsByMedium=new Map(stylePresets.map(entry=>[entry.medium,entry]));
const caches=new WeakMap();
export function stylePresetFor(medium){const preset=presetsByMedium.get(medium);return preset?{...preset}:null;}

function matchingPreset(reference){
 const preset=presetsByMedium.get(reference?.medium);
 const previous=legacyReplacedPresets[reference?.medium];
 const replaced=previous&&reference.file===previous.file&&reference.name===previous.name&&reference.role===previous.role;
 const legacyLuminous=preset?.medium==='発光幻想アニメ'&&['japan-luminous-v18.png','assets/style-luminous-original-v28-4-2.png'].includes(reference.file);
 return preset&&(replaced||((reference.file===preset.file||legacyLuminous)&&reference.name===preset.name&&reference.role===preset.role))?preset:null;
}
export function stylePresetRoleDescription(reference,values,{noPerson=false}={}){
 const preset=matchingPreset(reference);
 if(!preset||preset.medium!==values.medium)return '選択作風と一致しない見本。描画資料や人物の主参照へ使わない。';
 if(preset.role==='drawing')return '専用画風原画。光彩と描画だけを参照し、人物・髪・衣装・ポーズ・構図・背景・配色は作成者の主参照と今回の選択から決める。';
 return 'ツールが用意した「'+preset.medium+'」のプリセット見本。実際の添付から描線・塗り・陰影・画材または写真の質感だけを読む。'+(noPerson?'見本の人物・顔・手足を完全に除外し、選択した風景・物体へ描き方だけを移す。':'見本の人物を主役へ置換せず、人物の識別特徴は作成者の主参照から、非人物入力を翻案した主役は今回の明示条件から決める。')+'見本の髪・衣装・ポーズ・小道具・構図・背景・配色はコピーしない。';
}
export function stylePresetInstructions(medium,{noPerson=false,values={}}={}){
 const preset=stylePresetFor(medium);if(!preset)return [];
 if(preset.role==='drawing')return drawingReferenceInstructions(medium,{noPerson,values});
 return [
  '【ツールが用意した画風プリセット：主参照とは別】',
  preset.name+' は「'+preset.medium+'」の見本画像。実際に添付された画像を確認し、描線・塗り・陰影・画材または写真の質感を今回の制作仕様に沿って読み取る。名前だけで画像を見たと扱わない。',
  stylePresetRoleDescription(preset,{...values,medium},{noPerson}),
  '主役・衣装・表情・ポーズ・小道具・カメラ・背景・色は今回の選択で新しく構成する。見本の配色に固定せず、選択した色へ描き方を翻訳する。'+(['発光幻想アニメ','発光幻想リアル'].includes(medium)?'見本の広い深暗部と鋭い最明部の差、透明な色層と反射の密度を、顔・髪・身体・衣装と背景の見えている面へ移す。これは全域の描画方式であり、場面に光る道具がある場合だけ使う効果ではない。人物なしでは景物の全域へ適用する。見本の人物・天文図・建物・持ち物は採用せず、今回の舞台と主役を同じ光の層で描き直す。':'見本にある発光・宝石・魔法も、今回選択した作風と場面に必要な範囲だけ使う。'),
  'プロンプトのコピーだけでは見本画像は届かない。'+preset.name+' が添付されていない場合は見本未確認と短く伝え、下記の作画仕様で生成する。見本がないことだけを理由に制作を止めない。'
 ];
}
export async function loadStylePresets(references,{fetchImpl=globalThis.fetch,FileClass=globalThis.File}={}){
 if(typeof fetchImpl!=='function'||typeof FileClass!=='function')throw new Error('見本画像を準備できませんでした。');
 let cache=caches.get(fetchImpl);if(!cache){cache=new Map();caches.set(fetchImpl,cache);}
 return Promise.all(references.map(async reference=>{
  const preset=matchingPreset(reference);if(!preset)throw new Error('画風プリセットの指定を確認できませんでした。');
  if(preset.role==='drawing')return {...preset,...(await loadDrawingReferences([preset],{fetchImpl,FileClass}))[0]};
  if(!cache.has(preset.file)){
   const pending=(async()=>{
    const response=await fetchImpl(new URL(preset.file,import.meta.url));
    if(!response.ok)throw new Error('画風プリセットを読み込めませんでした。再読み込みして制作してください。');
    const blob=await response.blob(),expected=preset.file.endsWith('.png')?'image/png':'image/jpeg';
    if(!blob.size||blob.type.split(';')[0]!==expected)throw new Error('画風プリセットの画像形式を確認できませんでした。');
    const bytes=new Uint8Array(await blob.slice(0,8).arrayBuffer());
    const valid=expected==='image/png'?[137,80,78,71,13,10,26,10].every((value,index)=>bytes[index]===value):bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
    if(!valid)throw new Error('画風プリセットの画像内容を確認できませんでした。');
    return blob;
   })();
   cache.set(preset.file,pending);pending.catch(()=>cache.delete(preset.file));
  }
  const blob=await cache.get(preset.file);
  return {...preset,name:reference.name,file:new FileClass([blob],reference.name,{type:blob.type})};
 }));
}
