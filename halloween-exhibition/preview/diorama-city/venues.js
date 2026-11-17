const tower = '../../../tower/?from=diorama';

export const venues = {
  cafe: {
    title: '水辺のカフェ',
    card: './spots/cafe.html',
    image: './assets/cafe.webp',
    alt: '真鍮のカウンターと窓辺の読書席がある、街区のカフェ',
    scale: [192, .35],
    floor: [75, 938, 467, 641],
    obstacles: [[816, 951, 440, 514]],
    scene: '真鍮のカウンターと窓辺の席がある運河沿いのカフェ。濡れた窓を背景に、湯気の立つ飲み物を受け取る瞬間。',
    spots: {
      counter: { label: 'カウンター', point: [300, 467], sign: [300, 330], action: 'コーヒーを注文する',
        scene: '真鍮のカウンターで、湯気の立つ一杯を受け取る瞬間。窓から入る運河の青い光と店内の暖色を合わせる。' },
      reading: { label: '読書席', point: [710, 482], sign: [710, 338], action: '卓上のしおりを読む',
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
    scale: [163, .33],
    floor: [65, 940, 450, 641],
    scene: '水盤とベンチのある遊歩道。Atelier Towerを遠景に、雨上がりの街を散歩する主人公を描く。',
    spots: {
      bench: { label: '水盤そばのベンチ', point: [235, 475], sign: [235, 330], action: 'ベンチでひと休み', motion: 'bench',
        scene: '水盤に映る光を見ながら木のベンチに腰かける。公園の風と静かな水面が伝わる構図。' },
      lookout: { label: '展望デッキ', point: [760, 484], sign: [760, 335], action: '夕景・夜景を切り替える',
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
    scale: [147, .25],
    floor: [100, 935, 474, 640],
    obstacles: [[116, 134, 474, 505], [423, 443, 474, 495]],
    scene: '桜の花びらが舞う、街灯がともった遊具広場。木製のブランコと青い滑り台のある公園を歩く。',
    spots: {
      swing: { label: 'ブランコ', point: [306, 487], sign: [296, 355], action: 'ブランコに乗る', motion: 'swing',
        scene: '運河沿いのブランコをこぎ、前へ振れた頂点の一瞬。両手で鎖を握り、座面と足の向きに気を配る。髪や衣装を風でなびかせる。' },
      slide: { label: '滑り台', point: [847, 513], sign: [798, 340], action: '滑り台で滑る', motion: 'slide',
        scene: '夜の公園の青い滑り台を、座ったまま足を前にして滑り降りる瞬間。坂の角度、両手の位置、足元の影と光で勢いを描く。' },
    },
    note: '遊具のそばまで歩くと、ブランコに乗ったり滑り台で遊んだりできます。',
  },
  market: {
    title: '水辺のコンビニ',
    card: './spots/market.html',
    image: './assets/market.webp',
    alt: '左に飲料の冷蔵棚、正面に食品の棚、右に木のカウンターがあるコンビニ',
    scale: [180, .32],
    floor: [130, 930, 453, 640],
    obstacles: [[830, 955, 453, 540]],
    scene: '運河沿いの窓に夜景が映るコンビニ。飲み物と夕ごはんを選ぶ、街でのひとコマ。',
    spots: {
      drinks: { label: '飲み物の棚', point: [167, 485], sign: [160, 396], action: '飲み物を選ぶ', shelf: 'drinks',
        scene: '冷蔵棚を開けて飲み物に手を伸ばす。ガラスの反射と棚の冷たい光、店内の木の色を描く。' },
      snacks: { label: 'おにぎり・おやつ', point: [500, 458], sign: [502, 363], action: '食べ物を選ぶ', shelf: 'snacks',
        scene: '棚のおにぎりやおやつを見比べ、ひとつをかごへ入れようとする。指先、商品の包み、店内の光を描く。' },
      register: { label: 'レジ', point: [798, 498], sign: [803, 371], action: 'かごを見る・会計', shelf: 'register',
        scene: '窓に運河の灯りが映る木のレジ。商品を詰めた紙袋を受け取ってほっと笑う瞬間。バッグの中身は手元から見える範囲で描く。' },
    },
    note: '棚で商品をかごに入れたあと、右側のレジでお会計できます。',
  },
  fair: {
    title: '運河の遊園地',
    card: './spots/fair.html',
    image: './assets/fair.webp',
    alt: '運河を背景に明かりをともした観覧車とメリーゴーラウンドが並ぶ遊園地',
    scale: [148, .28],
    floor: [95, 933, 463, 640],
    scene: '観覧車とメリーゴーラウンドがともる運河の遊園地。夜風の中を歩く主人公を、遊園地の暖色と水辺の青で描く。',
    spots: {
      wheel: { label: '観覧車', point: [288, 487], sign: [263, 357], action: '観覧車に乗る', ride: 'wheel',
        scene: '観覧車のゴンドラの窓に近づき、眼下の運河とAtelier Towerの灯りを見下ろす。窓越しの街と主人公の横顔を描く。' },
      carousel: { label: 'メリーゴーラウンド', point: [717, 513], sign: [745, 378], action: 'メリーゴーラウンドに乗る', ride: 'carousel',
        scene: '明かりのともるメリーゴーラウンドの白い木馬で、手すりを握って笑う。あたたかい電球、背景の動き、木馬と人物の釣り合いを描く。' },
    },
    note: '観覧車とメリーゴーラウンドの乗り場へ歩けます。',
  },
  manor: {
    title: '水鏡の屋敷',
    card: './spots/manor.html',
    image: './assets/manor-forecourt.webp',
    alt: '青灰色の壁と銅屋根の古い屋敷。雨上がりの石畳に玄関の灯りが映る',
    scale: [160, .28],
    floor: [95, 938, 495, 640],
    scene: '雨上がりの運河沿い。青灰色の壁と緑青の銅屋根がある古い観測邸を訪ね、玄関の琥珀色の灯りに目を向ける。濡れた石畳にその灯りが映る。',
    spots: {
      plaque: { label: '古い案内札', point: [193, 515], sign: [193, 390], action: '案内札を読む',
        description: 'この屋敷の住人は、運河の水位を毎日ここで記録していました。日が沈んで記録を閉じると、奥の水鏡に「夕暮れの灯り」を映したそうです。色ガラスは左から、琥珀・青緑・藍。',
        scene: '玄関脇の古い真鍮の案内札をのぞき込む。屋敷の銅屋根と植え込みを背景に、手元と横顔を描く。' },
      doorway: { label: '屋敷の玄関', point: [720, 510], sign: [720, 366], action: '玄関から入る', venue: 'mirrorRoom',
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
    scale: [180, .28],
    floor: [90, 940, 480, 640],
    scene: '真鍮と木の作業台で三色のガラスを選び、窓のそばの水盤に灯りを映す。洋館の床と壁に、光と波紋がにじむ。',
    spots: {
      glass: { label: '色ガラスの台', point: [267, 506], sign: [260, 359], action: '色ガラスを選ぶ', lamp: true,
        scene: '三枚の色ガラスを一枚ずつ灯りにかざす。ガラスの色が指先に落ち、窓の向こうに運河が見える。' },
      reflection: { label: '水鏡の縁', point: [717, 509], sign: [735, 413], action: '水鏡をのぞく', reflection: true,
        scene: '運河を望む屋敷の黒石の水盤をのぞき込む。三色の灯りと主人公の横顔がさざ波に映る。' },
    },
    note: '作業台で色ガラスを選び、水鏡に灯してみてください。',
  },
};

export const venueSpawn = [505, 553];
export function venueWalkable([x, y], venue) {
  const [left, right, far, near] = venue?.floor ?? [125, 875, 451, 630];
  return x >= left && x <= right && y >= far && y <= near &&
    !(venue?.obstacles ?? []).some(([x1, x2, y1, y2]) => x >= x1 && x <= x2 && y >= y1 && y <= y2);
}
export const cafeStory = { label: 'マンションで続きを読む ↗', href: `${tower}#today` };
