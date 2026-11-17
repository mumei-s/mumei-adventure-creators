const tower = '../../../tower/?from=diorama';

export const venues = {
  cafe: {
    title: '水辺のカフェ',
    image: './assets/cafe.webp',
    alt: '真鍮のカウンターと窓辺の読書席がある、街区のカフェ',
    spots: {
      counter: { label: 'カウンター', point: [300, 467], sign: [300, 330], action: 'コーヒーを注文する' },
      reading: { label: '読書席', point: [710, 482], sign: [710, 338], action: '卓上のしおりを読む' },
    },
    note: 'カウンターと窓辺の読書席へ歩けます。',
    link: { label: 'プロンプト遊びへ ↗', href: `${tower}#prompt-play` },
  },
  park: {
    title: '水辺の公園',
    image: './assets/park.webp',
    alt: '水盤とベンチの向こうに、Atelier Towerが見える水辺の遊歩道',
    spots: {
      bench: { label: '水盤そばのベンチ', point: [235, 475], sign: [235, 330], action: 'ベンチでひと休み' },
      lookout: { label: '展望デッキ', point: [760, 484], sign: [760, 335], action: '夕景・夜景を切り替える' },
    },
    note: 'ベンチと、水越しにマンションが見える展望デッキを訪ねられます。',
  },
};

export const venueSpawn = [505, 553];
export const venueWalkable = ([x, y]) => x >= 125 && x <= 875 && y >= 451 && y <= 630;
export const cafeStory = { label: 'マンションで続きを読む ↗', href: `${tower}#today` };
