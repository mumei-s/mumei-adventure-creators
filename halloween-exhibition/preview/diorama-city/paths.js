const points = {
  gate:[220,498], plaza:[330,495], fork:[373,483], avenue:[481,482],
  forecourt:[486,392], tower:[503,291], plazaWest:[166,448],
  stationPath:[157,383], station:[152,333], approach:[555,477],
  waterfront:[647,472], bank:[628,410], bridgeFoot:[637,376], bridge:[690,351],
  bridgeEnd:[747,335], northWalk:[602,326], south:[489,579],
  cafeWalk:[409,396], cafe:[390,377], park:[649,498], stationExit:[169,281],
  southWest:[347,575], southEast:[578,557],
};

const lanes = [
  ['gate','plaza',36], ['gate','plazaWest',28], ['plazaWest','stationPath',20],
  ['stationPath','station',20], ['plaza','fork',25], ['fork','avenue',20],
  ['avenue','forecourt',26], ['forecourt','tower',28], ['avenue','south',28],
  ['plaza','southWest',25], ['southWest','south',24], ['south','southEast',23], ['southEast','park',20],
  ['avenue','approach',13], ['approach','waterfront',10], ['waterfront','bank',12],
  ['bank','bridgeFoot',8], ['bridgeFoot','bridge',8], ['bridge','bridgeEnd',8],
  ['tower','northWalk',10], ['northWalk','bridgeFoot',10],
  ['forecourt','cafeWalk',12], ['cafeWalk','cafe',12], ['waterfront','park',14],
  ['station','stationExit',14],
];

const places = {
  shops:{label:'乗り物のショップ',action:'車・バイク・自転車のお店へ',point:points.northWalk,sign:[608,280],venue:'avenueShops'},
  gate:{label:'結界広場',action:'結界をくぐる',point:points.gate,sign:[220,399],link:'../town/?arrival=future-gate',
    scene:'青緑に光る結界が雨上がりの広場に浮かぶ。主人公が光へ手を伸ばす瞬間を横から描く。'},
  station:{label:'高架駅',action:'駅前を見学する',point:points.station,sign:[136,276],
    image:'./assets/street-station.webp', alt:'夕暮れのガラス張りの高架駅と、灯りのともった階段',
    scene:'ガラス屋根の駅で階段を見上げる瞬間と、ホームを通る電車の明かりを目で追う瞬間。',
    description:'駅前の広場。ここから眺めると、ガラス屋根の下を電車が通り抜けるのが見えます。'},
  tower:{label:'Atelier Tower',action:'マンションへ入る',point:points.tower,sign:[503,219],link:'../../../tower/?from=diorama',
    scene:'ガラスとブロンズの外壁に街の灯りが映る。アトリエに帰ってきた主人公をロビー側から迎える構図。'},
  cafe:{label:'カフェ',action:'カフェに入る',point:points.cafe,sign:[328,303],venue:'cafe'},
  park:{label:'水辺の公園',action:'公園に入る',point:points.park,sign:[663,442],venue:'park'},
  waterfront:{label:'水辺のデッキ',action:'水辺に立ち寄る',point:points.bridge,sign:[706,306],
    image:'./assets/street-deck.webp', alt:'運河のデッキから橋と向こう岸の灯りを見渡す夕景',
    scene:'デッキの欄干に手を置き、川面から橋へ視線を移す。空の青と対岸の温かい灯りが水に映る。',
    description:'水辺の歩道橋。日が落ちると、向かいの建物のネオンが水面に映ります。'},
  marketGate:{label:'高架の先',action:'高架をくぐって新しい街区へ',point:points.stationExit,sign:[215,224],
    cross:{area:'canal',arrival:'station'}},
  canalGate:{label:'運河の向こう',action:'橋を渡って新しい街区へ',point:points.bridgeEnd,sign:[784,268],
    cross:{area:'canal',arrival:'bridge'}, scene:'運河の橋を渡りながら、対岸の街の灯りを見つけた瞬間。'},
};

const canalPoints = {
  stationGate:[75,525], westSouth:[124,485], westMid:[158,369], westSquare:[195,210], station:[151,263],
  market:[316,199], middle:[497,204], east:[784,207], waterside:[810,149], eastMid:[849,332],
  eastSouth:[886,510], bridgeGate:[937,541], southWest:[174,525], south:[495,525],
  median:[494,409], crossing:[499,312], north:[504,102], upperEnd:[504,47],
  marketWalk:[323,525], marketFront:[323,489], fairGate:[864,392],
  manorGate:[655,205], southCourt:[495,577],
};

const canalLanes = [
  ['stationGate','westSouth',26], ['westSouth','westMid',22], ['westMid','westSquare',20],
  ['westMid','station',14], ['station','westSquare',18], ['westSquare','market',19],
  ['market','middle',18], ['middle','east',16], ['east','waterside',19], ['east','eastMid',18],
  ['eastMid','eastSouth',23], ['eastSouth','bridgeGate',21],
  ['stationGate','southWest',24], ['westSouth','southWest',20], ['southWest','marketWalk',22],
  ['marketWalk','south',22], ['marketWalk','marketFront',14],
  ['south','eastSouth',26], ['south','median',23], ['median','crossing',24],
  ['south','southCourt',28],
  ['crossing','middle',18], ['middle','north',14], ['north','upperEnd',11],
];

const canalPlaces = {
  stationGate:{label:'高架側の入口',action:'高架をくぐってTowerの街へ',point:canalPoints.stationGate,sign:[106,458],
    cross:{area:'tower',arrival:'station'}},
  canopy:{label:'ガラス屋根の市場前',action:'市場を眺める',point:canalPoints.market,sign:[316,139],
    image:'./assets/street-market.webp', alt:'アーチ形のガラス天井の下に、花や青果の店が並ぶ市場',
    scene:'ガラス屋根から差す夕暮れの光の中、市場を歩き、花屋の店先で一輪を選ぶ。',
    description:'高架のとなりのガラス屋根。夕方に灯りがともると、通りから店先が見渡せます。'},
  market:{label:'水辺のコンビニ',action:'コンビニに入る',point:canalPoints.marketFront,sign:[327,444],venue:'market'},
  manor:{label:'水鏡の屋敷',action:'水鏡の屋敷へ',point:canalPoints.manorGate,sign:[654,151],venue:'manor'},
  southCourt:{label:'運河の回遊広場',action:'広場でひと休み',point:canalPoints.southCourt,sign:[495,592],
    image:'./assets/street-south-court.webp', alt:'花の咲いた木を囲んで円形のベンチが並ぶ回遊広場',
    scene:'並木道が円形ベンチに続く広場。花の下で足を止め、木漏れ日と石畳の模様を眺める。',
    description:'並木道から続く回遊広場。高架側から運河までぐるりと歩き、対岸の灯りと街の暮らしを眺められます。'},
  avenue:{label:'中央大通り・乗り物のショップ',action:'通りの車・バイク・自転車のお店へ',point:canalPoints.crossing,sign:[519,260],venue:'avenueShops',
    description:'南北に伸びる並木道。南の広場、駅側の通り、運河の遊歩道へ歩いて行けます。'},
  waterside:{label:'運河の広場',action:'水辺の灯りを眺める',point:canalPoints.waterside,sign:[822,113],
    image:'./assets/street-canal-plaza.webp', alt:'運河に張り出した円形の広場と、対岸のタワー',
    scene:'運河に開けた円形広場で、水際の灯りと対岸に映るタワーを見渡す。水音の近さと広い空を表現する。',
    description:'運河沿いの円形広場。水面の向こうにTowerが見えます。'},
  fair:{label:'運河の遊園地',action:'遊園地に入る',point:canalPoints.fairGate,sign:[882,344],venue:'fair'},
  bridgeGate:{label:'運河側の入口',action:'橋を渡ってTowerの街へ',point:canalPoints.bridgeGate,sign:[886,477],
    cross:{area:'tower',arrival:'bridge'}},
};

export const streetAreas = {
  tower:{title:'近未来街区',points,lanes,places,arrivals:{tower:[503,320],gate:[251,512],station:[163,306],bridge:[719,342]},
    image:'./assets/district-detailed.webp'},
  canal:{title:'運河街区',points:canalPoints,lanes:canalLanes,places:canalPlaces,
    arrivals:{station:[94,516],bridge:[912,528]}, image:'./assets/canal-detailed.webp',
    alt:'高架駅とガラス屋根の市場、並木の大通りと広い運河沿いの遊歩道がある街区'},
};

export const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const clamp=value=>Math.max(0,Math.min(1,value));
// The two street plans are static. Movement and route searches share their lane geometry.
const geometry=new WeakMap();
function streetGeometry(area) {
  if(!geometry.has(area)){
    const lanes=area.lanes.map(([from,to,radius])=>{
      const [x,y]=area.points[from], [endX,endY]=area.points[to];
      const dx=endX-x,dy=endY-y;
      return {x,y,dx,dy,length2:dx*dx+dy*dy,radius2:radius*radius};
    });
    geometry.set(area,{lanes,visibility:new Map()});
  }
  return geometry.get(area);
}
export function walkable([x,y],area) {
  for(const lane of streetGeometry(area).lanes){
    const ox=x-lane.x,oy=y-lane.y;
    const t=clamp((ox*lane.dx+oy*lane.dy)/lane.length2);
    const ex=ox-t*lane.dx,ey=oy-t*lane.dy;
    if(ex*ex+ey*ey<=lane.radius2)return true;
  }
  return false;
}
function canWalk(a,b,area) {
  const steps=Math.ceil(distance(a,b)/6);
  for (let i=1;i<=steps;i++) {
    const t=i/steps;
    if (!walkable([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],area)) return false;
  }
  return true;
}
export function walkingRoute(start,target,area) {
  if (!walkable(target,area)) return [];
  if (canWalk(start,target,area)) return [target];
  const vertices=[start,...Object.values(area.points),target];
  const previous=new Map();
  const costs=new Map([[0,0]]);
  const unseen=new Set(vertices.keys());
  const end=vertices.length-1;
  const visibility=streetGeometry(area).visibility;
  function connected(a,b) {
    if(a===0 || b===end)return canWalk(vertices[a],vertices[b],area);
    // Only the fixed street vertices have stable indices across different walks.
    const pair=Math.min(a,b)*end+Math.max(a,b);
    if(!visibility.has(pair))visibility.set(pair,canWalk(vertices[a],vertices[b],area));
    return visibility.get(pair);
  }
  while (unseen.size) {
    const next=[...unseen].sort((a,b)=>(costs.get(a) ?? Infinity)-(costs.get(b) ?? Infinity))[0];
    if (next===end || !costs.has(next)) break;
    unseen.delete(next);
    for (const vertex of unseen) {
      const cost=costs.get(next)+distance(vertices[next],vertices[vertex]);
      if (cost>=(costs.get(vertex) ?? Infinity) || !connected(next,vertex)) continue;
      costs.set(vertex,cost);
      previous.set(vertex,next);
    }
  }
  if (!costs.has(end)) return [];
  const path=[];
  for (let vertex=end;vertex!==0;vertex=previous.get(vertex)) path.unshift(vertices[vertex]);
  return path;
}
