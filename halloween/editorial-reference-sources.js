// Public editorial references inspected on 2026-10-06. These records document
// structural research only. No publisher images, people, logos or article copy
// are bundled into the generated artwork or used as image-model references.
export const editorialReferenceSources=Object.freeze({
 'fashion-cover':{
  id:'fashion-cover',publisher:'Vogue / Condé Nast',title:'Photos: Vogue Covers',
  url:'https://www.vogue.com/slideshow/vogue-covers-photos',
  location:'25/26、2011年3月号の表紙',type:'出版社公式の実誌表紙',
  observed:'大きな誌名、中央の主画像、主特集と補助特集、左右に分かれる短いカバーライン。本文段組みは置かない。',
  scope:'表紙の情報階層と余白のみ。被写体・衣服・髪・配色・ブランド・原稿は採用しない。'
 },
 'culture-cover':{
  id:'culture-cover',publisher:'UNESCO',title:'The UNESCO Courier — Reimagining museums',
  url:'https://courier.unesco.org/en/articles/reimagining-museums',
  documentUrl:'https://www.joug.org/wp-content/uploads/2024/10/2024.10-The-UNESCO-courier.pdf',
  location:'2024年10–12月号、公開抜粋PDFの表紙',type:'発行元の号情報と照合した実誌の公開抜粋',
  observed:'大きな誌名と一つの主特集、一枚の主画像、片側の短い特集一覧、小さな欄のラベルで文化誌の表紙を構成する。',
  scope:'誌名・特集・画像の階層のみ。美術館・人物・絵柄・引用文は採用しない。'
 },
 'feature-spread':{
  id:'feature-spread',publisher:'UNESCO',title:'The UNESCO Courier — Reimagining museums',
  url:'https://courier.unesco.org/en/articles/reimagining-museums',
  documentUrl:'https://www.joug.org/wp-content/uploads/2024/10/2024.10-The-UNESCO-courier.pdf',
  location:'2024年10–12月号、誌面24–25ページ（公開抜粋PDF 3–4ページ）',type:'発行元の号情報と照合した実誌の公開抜粋',
  observed:'左ページは特集見出しと大きな図版。右ページは図版、同じ高さから始まる横並び2列の本文、制作者情報。欄外に小さな柱とノンブルがある。',
  scope:'見開きの領域、段組み、柱、ノンブルのみ。写真の白黒表現や人物・風景・本文は採用しない。'
 },
 'interview-structure':{
  id:'interview-structure',publisher:'UNESCO',title:'The UNESCO Courier — Our Guest, 2024年10月2日',
  url:'https://courier.unesco.org/en/articles/rumman-chowdhury-we-could-be-entering-post-truth-world',
  location:'同号の発行元公式インタビュー記事',type:'公式Web記事（Q&Aの原稿構造を確認）',
  observed:'見出し、人物紹介のリード、図版とクレジット、取材者欄、区別された質問と回答、独立した引用がある。',
  scope:'Q&Aの役割分担のみ。本文・発言・登場人物は採用しない。印刷段組みの証拠としては扱わない。'
 },
 'japanese-newspaper':{
  id:'japanese-newspaper',publisher:'朝日新聞社',title:'朝日新聞 小型広告 媒体資料',
  url:'https://adv.asahi.com/mb2/other/ad_info/media_kit/kogatakoukoku202101.pdf',
  location:'PDF 4ページ「朝刊1面［全国版］」の実紙面',type:'新聞社公式資料に掲載された実際の一面',
  observed:'右上の題字、主見出し、縦組みの本文段、写真と説明、細い罫線、複数記事の大小で新聞の一面を構成する。',
  scope:'題字・記事・段組み・図版の配置のみ。新聞名・政治記事・人物・広告・日付は採用しない。'
 }
});

const formatSourceIds={
 'ファッション雑誌の表紙':['fashion-cover'],
 'カルチャー誌の表紙':['culture-cover'],
 'ゴシック雑誌の表紙':['fashion-cover'],
 'インタビュー誌面':['interview-structure','feature-spread'],
 '見開き特集':['feature-spread'],
 '新聞の一面':['japanese-newspaper']
};

export function editorialReferencesFor(value){return (formatSourceIds[value]||[]).map(id=>editorialReferenceSources[id]);}

export function editorialReferenceContract(value){
 const refs=editorialReferencesFor(value);if(!refs.length)return [];
 const structure=value==='インタビュー誌面'?'見出し・リード・区別された質問と回答・独立した引用を使う。一枚の誌面内で小さな柱、本文の段組み、図版キャプション、ノンブルの役割を分ける。':refs.map(ref=>ref.observed).join(' ');
 return [
  '実誌の公開資料から確認して今回の形式へ整理した構造：'+structure,
  '参考資料から使うのは情報の役割と組み方だけ。作品の人物・性別・衣装・舞台・画風・配色は今回の選択名と主参照から決める。参考資料の写真・人物・誌名・新聞名・記事・広告は複製しない。'
 ];
}
