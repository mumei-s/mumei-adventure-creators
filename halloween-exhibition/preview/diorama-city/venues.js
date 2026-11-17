const tower = '../../../tower/?from=diorama';

export const venues = {
  cafe: {
    title: '水辺のカフェ',
    image: './assets/cafe.webp',
    alt: '真鍮のカウンターと窓辺の読書席がある、街区のカフェ',
    scale: [134, .28],
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
    image: './assets/park.webp',
    alt: '水盤とベンチの向こうに、Atelier Towerが見える水辺の遊歩道',
    scale: [123, .32],
    scene: '水盤とベンチのある遊歩道。Atelier Towerを遠景に、雨上がりの街を散歩する主人公を描く。',
    spots: {
      bench: { label: '水盤そばのベンチ', point: [235, 475], sign: [235, 330], action: 'ベンチでひと休み',
        scene: '水盤に映る光を見ながら木のベンチに腰かける。公園の風と静かな水面が伝わる構図。' },
      lookout: { label: '展望デッキ', point: [760, 484], sign: [760, 335], action: '夕景・夜景を切り替える',
        scene: 'デッキの欄干から水面とAtelier Towerを見渡す。人物の表情と、水に伸びる灯りを同じ画面に入れる。' },
      playground: { label: '遊具広場', point: [504, 611], sign: [504, 535], action: '遊具広場に行く', venue: 'playground' },
    },
    note: 'ベンチ、展望デッキ、ブランコと滑り台のある遊具広場へ歩けます。',
  },
  playground: {
    title: '遊具広場',
    parent: 'park',
    image: './assets/playground.webp',
    alt: '桜のそばに二連のブランコと青い滑り台がある、運河沿いの公園',
    scale: [106, .26],
    scene: '桜の花びらが舞う、街灯がともった遊具広場。木製のブランコと青い滑り台のある公園を歩く。',
    spots: {
      swing: { label: 'ブランコ', point: [306, 458], sign: [296, 355], action: 'ブランコに乗る', motion: 'swing',
        scene: '運河沿いのブランコをこぎ、前へ振れた頂点の一瞬。両手で鎖を握り、座面と足の向きに気を配る。髪や衣装を風でなびかせる。' },
      slide: { label: '滑り台', point: [847, 485], sign: [798, 340], action: '滑り台で滑る', motion: 'slide',
        scene: '夜の公園の青い滑り台を、座ったまま足を前にして滑り降りる瞬間。坂の角度、両手の位置、足元の影と光で勢いを描く。' },
    },
    note: '遊具のそばまで歩くと、ブランコに乗ったり滑り台で遊んだりできます。',
  },
  market: {
    title: '水辺のコンビニ',
    image: './assets/market.webp',
    alt: '左に飲料の冷蔵棚、正面に食品の棚、右に木のカウンターがあるコンビニ',
    scale: [110, .27],
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
    image: './assets/fair.webp',
    alt: '運河を背景に明かりをともした観覧車とメリーゴーラウンドが並ぶ遊園地',
    scale: [105, .26],
    scene: '観覧車とメリーゴーラウンドがともる運河の遊園地。夜風の中を歩く主人公を、遊園地の暖色と水辺の青で描く。',
    spots: {
      wheel: { label: '観覧車', point: [288, 467], sign: [263, 357], action: '観覧車に乗る', ride: 'wheel',
        scene: '観覧車のゴンドラの窓に近づき、眼下の運河とAtelier Towerの灯りを見下ろす。窓越しの街と主人公の横顔を描く。' },
      carousel: { label: 'メリーゴーラウンド', point: [717, 493], sign: [745, 378], action: 'メリーゴーラウンドに乗る', ride: 'carousel',
        scene: '明かりのともるメリーゴーラウンドの白い木馬で、手すりを握って笑う。あたたかい電球、背景の動き、木馬と人物の釣り合いを描く。' },
    },
    note: '観覧車とメリーゴーラウンドの乗り場へ歩けます。',
  },
};

export const venueSpawn = [505, 553];
export const venueWalkable = ([x, y]) => x >= 125 && x <= 875 && y >= 451 && y <= 630;
export const cafeStory = { label: 'マンションで続きを読む ↗', href: `${tower}#today` };
