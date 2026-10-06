// A proof records one actual run, never all combinations for an option.
export const visualProofs=[
 {id:'film-sea',date:'2026-10-06',medium:'実写風フィルム写真',design:'新聞の一面',image:'./assets/verification/v14/film-sea.png',width:1254,height:1254,seconds:41.437,result:'sample-accepted',observed:'単一の自然光、岸から水平線への遠近、波の重なり、砂と水の反射、微細な粒子。人物・文字なし。',limits:'レンズと絞りは描画設計。実機の撮影記録、特定の実在海岸の一致、全組合せの再現性は未確認。'},
 {id:'watercolor-sea',date:'2026-10-06',medium:'透明水彩',design:'見開き特集',image:'./assets/verification/v14/watercolor-sea.png',width:1254,height:1254,seconds:30.167,result:'sample-accepted',observed:'薄い色の重なり、にじんだ雲、乾いた岩の縁、波と光に残した紙の白。人物・文字なし。',limits:'デジタル画像内の技法表現を確認。実際の水彩顔料・紙の物性、全組合せの再現性は未確認。'},
 {id:'woodcut-sea',date:'2026-10-06',medium:'木版画',design:'通常の一枚絵',image:'./assets/verification/v14/woodcut-sea.png',width:1024,height:1536,seconds:28.364,result:'sample-accepted',observed:'彫り取った線に相当する抜け、整理された色面、刷りのかすれ、波と岩の輪郭。人物・文字なし。縦2:3。',limits:'デジタル画像内の版画表現を確認。木版から実際に刷った証拠、全組合せの再現性は未確認。'},
];
export function proofsForRecipe(key,value){return key==='medium'?visualProofs.filter(p=>p.medium===value):[];}
