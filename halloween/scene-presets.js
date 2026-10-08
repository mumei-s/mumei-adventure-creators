// A selected world, story or location is one scene. The old place key is kept
// only as an internal detail for saved records and existing drawing recipes.
const placeTitles=new Set();

export function sceneIsUnified(values={}){return values.sceneUnified===true;}
export function sceneSourcePlace(value){return placeTitles.has(value)?value:null;}
export function sceneLabel(values={}){return values.theme||'おまかせ';}

export function mergeSceneGroups(worldGroups=[],placeGroups=[]){
 for(const group of placeGroups)for(const value of group.values)placeTitles.add(value);
 const seen=new Set();
 const clone=(group,source)=>{
  const values=group.values.filter(value=>!seen.has(value)&&seen.add(value));
  return {...group,label:source==='place'?'場所から選ぶ / '+group.label:group.label,values,sceneSource:source};
 };
 // applyCollection can restore groups that were already merged once.
 return [...worldGroups.filter(group=>group.sceneSource!=='place').map(group=>clone(group,'theme')),
  ...placeGroups.map(group=>clone(group,'place'))].filter(group=>group.values.length);
}

// Public Halloween scenes need a seasonal event or a specific supernatural
// occurrence. General fantasy worlds and bare locations remain valid saved or
// custom inputs, but are not advertised or randomly chosen in this collection.
const halloweenGroups=[
 {label:'仮装・お菓子・収穫祭',sceneSource:'theme',scenes:[
  ['月夜の仮面舞踏会','Halloweenの仮装舞踏会。仮面や招待状、月夜の宴の道具で祝祭を示す。'],
  ['お菓子の王国','Halloweenの菓子を贈り合う祝祭。包み紙、菓子の器、受け渡しの対象でお菓子の世界を示す。'],
  ['カボチャの収穫祭','秋のカボチャの収穫を祝うHalloween。収穫物と籠、蔓や葉で畑と祝祭をつなぐ。'],
  ['都会の仮装パレード','Halloweenの街の仮装行列。進行方向の揃った祝祭の道具や沿道の飾りでパレードを示す。'],
  ['花と骸骨の祝祭','Halloweenの骸骨と花の祝祭。骸骨の飾りと花束を一つの宴へ組み、特定の実在儀礼を捏造しない。'],
  ['静かなハロウィーン','静かな秋のHalloweenの夜。小さなカボチャの飾り、菓子包み、温かい飲み物でささやかな祝祭を示す。'],
  ['宇宙のHalloween','宇宙の環境で仮装と菓子の交換を楽しむHalloween。宇宙の構造や遠い星を祝祭の飾りで覆い隠さない。']
 ]},
 {label:'魔女・吸血鬼・モンスター',sceneSource:'theme',scenes:[
  ['真夜中の魔女のアトリエ','Halloweenの夜の魔女の制作。調合容器、古書、作りかけの魔法の道具で今夜の仕事を示す。'],
  ['吸血鬼の晩餐会','Halloweenの吸血鬼の宴。夜の食卓、古い燭台、招待客を迎える器で怪異の晩餐を示す。流血を自動追加しない。'],
  ['死神の休日','Halloweenの夜に休む死神。死神を示す道具と日常の飲み物や本の対比で、恐怖と休息の可笑しみを作る。'],
  ['魔法使いの見習い','Halloweenの夜の魔法の練習。未完成の呪文の道具や小さな失敗の痕跡で、見習いの試行を示す。'],
  ['機械仕掛けの怪物','Halloweenの怪物づくり。組み立て途中の機械と動き始めた部品で、怪物が目覚める瞬間を示す。']
 ]},
 {label:'幽霊・怪異・呪われた夜',sceneSource:'theme',scenes:[
  ['忘れられた劇場','Halloweenの閉館後、誰も触れていない台本や演目道具だけが動いた痕跡を残す。忘れられた公演の怪異を示す。'],
  ['幽霊たちのお茶会','Halloweenに幽霊たちが集まるお茶会。器や椅子の配置、実体のない客の痕跡で夜の集まりを示す。'],
  ['異界に続く駅','Halloweenの夜にだけ異界へ開く乗車口。切符と境界の光、通常の道と異なる行き先で怪異を示す。'],
  ['鏡の向こうの自分','Halloweenの鏡合わせの怪異。実像と鏡像の一箇所だけが一致しない出来事を見せる。'],
  ['眠らない美術館','Halloweenの閉館後に展示物の一つが動き出す怪異。台座のずれと影の変化を出来事の証拠にする。'],
  ['一夜だけの怪奇サーカス','Halloweenに一夜だけ現れる怪奇サーカス。奇妙な演目の道具と観客を迎える空間で今夜限りの興行を示す。'],
  ['悪夢からの脱出','Halloweenの悪夢から逃れる場面。異常な影や閉じた道と、一つだけ開いた出口の対比で脱出の意味を示す。'],
  ['百鬼夜行','Halloweenの怪異の行列。妖怪の道具や異なる影が同じ進行方向へ連なり、夜の境界を越える。'],
  ['妖狐と月の契約','Halloweenの月夜に結ぶ妖狐との契約。狐火と契約の対象、境界を示す道具で人ならぬ約束を示す。'],
  ['海賊船の亡霊','Halloweenに現れる海賊船の亡霊。古い航海道具と使われていない船の痕跡で、失われた船の帰還を示す。'],
  ['呪われたオルゴール','Halloweenに鳴り始める呪われたオルゴール。巻き鍵、動いた人形や影の一点の変化で呪いの発動を示す。'],
  ['墨で描く怪異','Halloweenの怪異を墨の痕跡から呼び出す出来事。墨の跡と異常な影を対象にし、描画技法は選択した作風のまま保つ。'],
  ['雨上がりの怪談','Halloweenの雨上がりに残る怪異。濡れた足跡や不一致の反射で、人ならぬ気配を示す。']
 ]},
 {label:'魔女の部屋・墓地・秋の境界',sceneSource:'place',scenes:[
  ['魔女の書斎','Halloweenの夜の魔女の書斎。古書、調合容器、今夜の魔法の道具を本棚と机へ置く。'],
  ['月下の墓地','Halloweenの月夜の墓地。墓石の列と夜霧、ささやかな秋の供物で静かな怪異の気配を作る。墓碑の人名を捏造しない。'],
  ['カボチャ畑','Halloweenの秋の収穫畑。カボチャ、蔓、落ち葉と収穫籠で収穫の季節を示す。実へ顔や彫刻を自動追加しない。'],
  ['異界の鳥居','Halloweenの夜に異界へ開く境界。鳥居の柱と道の構造を保ち、境界の光や人ならぬ気配を示す。']
 ]}
];
// Preserve an old saved Japanese-folklore story as a legacy free selection,
// but it is not a Halloween preset or automatic Halloween suggestion.
const nonHalloweenStories=new Set(['百鬼夜行']);
const halloweenFocus=new Map(halloweenGroups.flatMap(group=>group.scenes).filter(([name])=>!nonHalloweenStories.has(name)));
export const halloweenSceneTitles=Object.freeze([...halloweenFocus.keys()]);
export function halloweenSceneFocus(value){return halloweenFocus.get(value)||null;}

export function halloweenSceneGroups(worldGroups=[],placeGroups=[]){
 // Register every legacy place before narrowing the public list. A saved
 // place-only scene must still resolve and preview with its original source.
 const available=new Set(mergeSceneGroups(worldGroups,placeGroups).flatMap(group=>group.values));
 return halloweenGroups.map(({label,sceneSource,scenes})=>({label,sceneSource,
  values:scenes.map(([value])=>value).filter(value=>available.has(value)&&halloweenFocus.has(value))
 })).filter(group=>group.values.length);
}
