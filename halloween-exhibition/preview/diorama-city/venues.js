import { canStandOnFloor } from '../../../tower/facility-floors.js?v=202611181820';

const tower = '../../../tower/?from=diorama';

// Back-to-front edges are traced in the plate's 1000×667 display coordinates.
// The contour includes clearance for both feet at furniture, water and railings.
function floorPlan(edge, near = 641) {
  const left = edge[0][0], right = edge.at(-1)[0];
  const polygon = [...edge, [right, near], [left, near]];
  const bounds = [left, right, Math.min(...edge.map(point => point[1])), near];
  return { floor: bounds, floorPolygon: polygon, walkFloor: { polygon, bounds, aspect: 1 } };
}

export const venues = {
  cafe: {
    title: '水辺のカフェ',
    card: './spots/cafe.html',
    image: './assets/cafe.webp',
    alt: '真鍮のカウンターと窓辺の読書席がある、街区のカフェ',
    scale: [167, .58],
    ...floorPlan([[58,433],[267,430],[354,414],[390,395],[411,368],[469,358],
      [564,365],[605,394],[640,417],[746,427],[849,450],[940,474]]),
    scene: '真鍮のカウンターと窓辺の席がある運河沿いのカフェ。濡れた窓を背景に、湯気の立つ飲み物を受け取る瞬間。',
    spots: {
      counter: { label: 'カウンター', point: [289, 434], sign: [296, 319], action: 'コーヒーを注文する',
        scene: '真鍮のカウンターで、湯気の立つ一杯を受け取る瞬間。窓から入る運河の青い光と店内の暖色を合わせる。' },
      reading: { label: '読書席', point: [681, 435], sign: [717, 339], action: '卓上のしおりを読む',
        scene: '夜の窓辺の読書席で、しおりを挟んだページに目を落とす。紙の質感、ランプ、ガラスに映る運河の灯りを描く。' },
    },
    note: 'カウンターと窓辺の読書席へ歩けます。',
    link: { label: 'プロンプト遊びへ ↗', href: `${tower}#prompt-play` },
  },
  park: {
    title: '水辺の公園',
    card: './spots/park.html',
    image: './assets/park.webp',
    alt: '水盤とベンチの向こうに、Atelier Towerが見える水辺の遊歩道',
    scale: [151, .56],
    ...floorPlan([[57,443],[125,425],[154,406],[169,381],[238,371],[261,375],
      [304,394],[399,399],[493,392],[549,381],[577,359],[592,337],[625,346],
      [703,370],[794,402],[941,448]]),
    scene: '水盤とベンチのある遊歩道。Atelier Towerを遠景に、雨上がりの街を散歩する主人公を描く。',
    spots: {
      bench: { label: '水盤そばのベンチ', point: [190, 399], sign: [178, 310], action: 'ベンチでひと休み', motion: 'bench',
        scene: '水盤に映る光を見ながら木のベンチに腰かける。公園の風と静かな水面が伝わる構図。' },
      lookout: { label: '展望デッキ', point: [760, 406], sign: [769, 346], action: '夕景・夜景を切り替える',
        scene: 'デッキの欄干から水面とAtelier Towerを見渡す。人物の表情と、水に伸びる灯りを同じ画面に入れる。' },
      playground: { label: '遊具広場', point: [504, 611], sign: [504, 535], action: '遊具広場に行く', venue: 'playground' },
    },
    note: 'ベンチ、展望デッキ、ブランコと滑り台のある遊具広場へ歩けます。',
  },
  playground: {
    title: '遊具広場',
    card: './spots/playground.html',
    parent: 'park',
    image: './assets/playground.webp',
    alt: '桜のそばに二連のブランコと青い滑り台がある、運河沿いの公園',
    scale: [133, .5],
    ...floorPlan([[68,458],[117,445],[152,414],[209,407],[356,408],[390,430],
      [409,447],[436,442],[465,408],[493,394],[521,398],[536,459],[576,474],
      [671,479],[713,460],[755,422],[792,412],[851,416],[880,435],[963,434]]),
    scene: '桜の花びらが舞う、街灯がともった遊具広場。木製のブランコと青い滑り台のある公園を歩く。',
    spots: {
      swing: { label: 'ブランコ', point: [306, 422], sign: [305, 349], action: 'ブランコに乗る', motion: 'swing',
        scene: '運河沿いのブランコをこぎ、前へ振れた頂点の一瞬。両手で鎖を握り、座面と足の向きに気を配る。髪や衣装を風でなびかせる。' },
      slide: { label: '滑り台', point: [929, 449], sign: [902, 330], action: '滑り台で滑る', motion: 'slide',
        scene: '夜の公園の青い滑り台を、座ったまま足を前にして滑り降りる瞬間。坂の角度、両手の位置、足元の影と光で勢いを描く。' },
    },
    note: '遊具のそばまで歩くと、ブランコに乗ったり滑り台で遊んだりできます。',
  },
  market: {
    title: '水辺のコンビニ',
    card: './spots/market.html',
    image: './assets/market.webp',
    alt: '左に飲料の冷蔵棚、正面に食品の棚、右に木のカウンターがあるコンビニ',
    scale: [164, .59],
    ...floorPlan([[62,519],[121,480],[183,437],[235,406],[260,391],[675,391],
      [711,398],[744,418],[814,461],[878,492],[945,499]]),
    scene: '運河沿いの窓に夜景が映るコンビニ。飲み物と夕ごはんを選ぶ、街でのひとコマ。',
    spots: {
      drinks: { label: '飲み物の棚', point: [167, 464], sign: [141, 386], action: '飲み物を選ぶ', shelf: 'drinks',
        scene: '冷蔵棚を開けて飲み物に手を伸ばす。ガラスの反射と棚の冷たい光、店内の木の色を描く。' },
      snacks: { label: 'おにぎり・おやつ', point: [494, 408], sign: [496, 324], action: '食べ物を選ぶ', shelf: 'snacks',
        scene: '棚のおにぎりやおやつを見比べ、ひとつをかごへ入れようとする。指先、商品の包み、店内の光を描く。' },
      register: { label: 'レジ', point: [788, 460], sign: [806, 345], action: 'かごを見る・会計', shelf: 'register',
        scene: '窓に運河の灯りが映る木のレジ。商品を詰めた紙袋を受け取ってほっと笑う瞬間。バッグの中身は手元から見える範囲で描く。' },
    },
    note: '棚で商品をかごに入れたあと、右側のレジでお会計できます。',
  },
  fair: {
    title: '運河の遊園地',
    card: './spots/fair.html',
    image: './assets/fair.webp',
    alt: '運河を背景に明かりをともした観覧車とメリーゴーラウンドが並ぶ遊園地',
    scale: [126, .5],
    ...floorPlan([[65,477],[119,457],[197,449],[263,446],[291,439],[398,432],
      [442,423],[511,423],[562,430],[585,445],[628,456],[666,455],[689,435],
      [709,435],[730,449],[757,468],[939,484]]),
    scene: '観覧車とメリーゴーラウンドがともる運河の遊園地。夜風の中を歩く主人公を、遊園地の暖色と水辺の青で描く。',
    spots: {
      wheel: { label: '観覧車', point: [339, 449], sign: [322, 362], action: '観覧車に乗る', ride: 'wheel',
        scene: '観覧車のゴンドラの窓に近づき、眼下の運河とAtelier Towerの灯りを見下ろす。窓越しの街と主人公の横顔を描く。' },
      carousel: { label: 'メリーゴーラウンド', point: [700, 449], sign: [710, 361], action: 'メリーゴーラウンドに乗る', ride: 'carousel',
        scene: '明かりのともるメリーゴーラウンドの白い木馬で、手すりを握って笑う。あたたかい電球、背景の動き、木馬と人物の釣り合いを描く。' },
    },
    note: '観覧車とメリーゴーラウンドの乗り場へ歩けます。',
  },
  manor: {
    title: '水鏡の屋敷',
    card: './spots/manor.html',
    image: './assets/manor-forecourt.webp',
    alt: '青灰色の壁と銅屋根の古い屋敷。雨上がりの石畳に玄関の灯りが映る',
    scale: [154, .58],
    ...floorPlan([[62,494],[126,506],[221,506],[244,502],[470,500],[510,487],
      [591,486],[630,491],[818,491],[857,490],[940,486]]),
    scene: '雨上がりの運河沿い。青灰色の壁と緑青の銅屋根がある古い観測邸を訪ね、玄関の琥珀色の灯りに目を向ける。濡れた石畳にその灯りが映る。',
    spots: {
      plaque: { label: '古い案内札', point: [194, 514], sign: [184, 409], action: '案内札を読む',
        description: 'この屋敷の住人は、運河の水位を毎日ここで記録していました。日が沈んで記録を閉じると、奥の水鏡に「夕暮れの灯り」を映したそうです。色ガラスは左から、琥珀・青緑・藍。',
        scene: '玄関脇の古い真鍮の案内札をのぞき込む。屋敷の銅屋根と植え込みを背景に、手元と横顔を描く。' },
      doorway: { label: '屋敷の玄関', point: [721, 497], sign: [719, 386], action: '玄関から入る', venue: 'mirrorRoom',
        scene: 'あたたかな光が漏れる玄関の敷居をまたぐ。雨の匂いのする石畳から、観測邸の床へ足を踏み出す瞬間。' },
    },
    note: '案内札の手がかりを読んで、玄関から水鏡の間へ入れます。',
  },
  mirrorRoom: {
    title: '水鏡の間',
    card: './spots/mirrorRoom.html',
    parent: 'manor',
    image: './assets/manor-mirror-room.webp',
    alt: '三色のガラスを置いた作業台と浅い水盤がある、屋敷の光学室',
    scale: [157, .55],
    ...floorPlan([[62,479],[112,460],[164,440],[222,421],[269,401],[304,385],
      [326,380],[340,408],[369,423],[738,423],[916,425],[945,434]]),
    scene: '真鍮と木の作業台で三色のガラスを選び、窓のそばの水盤に灯りを映す。洋館の床と壁に、光と波紋がにじむ。',
    spots: {
      glass: { label: '色ガラスの台', point: [207, 442], sign: [194, 346], action: '色ガラスを選ぶ', lamp: true,
        scene: '三枚の色ガラスを一枚ずつ灯りにかざす。ガラスの色が指先に落ち、窓の向こうに運河が見える。' },
      reflection: { label: '水鏡の縁', point: [717, 438], sign: [727, 365], action: '水鏡をのぞく', reflection: true,
        scene: '運河を望む屋敷の黒石の水盤をのぞき込む。三色の灯りと主人公の横顔がさざ波に映る。' },
    },
    note: '作業台で色ガラスを選び、水鏡に灯してみてください。',
  },
};

export const venueSpawn = [505, 553];
export function venueFloor(venue) {
  return venue.walkFloor;
}
export function venueWalkable(point, venue) {
  return canStandOnFloor(venueFloor(venue), point);
}
export const cafeStory = { label: 'マンションで続きを読む ↗', href: `${tower}#today` };
