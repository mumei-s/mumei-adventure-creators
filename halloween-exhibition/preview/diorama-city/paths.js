const points = {
  gate:[220,498], plaza:[330,495], fork:[373,483], avenue:[481,482],
  forecourt:[486,392], tower:[503,291], plazaWest:[166,448],
  stationPath:[157,383], station:[152,333], approach:[555,477],
  waterfront:[647,472], bank:[628,410], bridgeFoot:[637,376], bridge:[690,351],
  bridgeEnd:[747,335], northWalk:[602,326], south:[489,579],
  cafeWalk:[409,396], cafe:[390,377], park:[649,498],
};

const lanes = [
  ['gate','plaza',31], ['gate','plazaWest',25], ['plazaWest','stationPath',15],
  ['stationPath','station',16], ['plaza','fork',22], ['fork','avenue',14],
  ['avenue','forecourt',22], ['forecourt','tower',24], ['avenue','south',23],
  ['avenue','approach',13], ['approach','waterfront',10], ['waterfront','bank',12],
  ['bank','bridgeFoot',8], ['bridgeFoot','bridge',8], ['bridge','bridgeEnd',8],
  ['tower','northWalk',10], ['northWalk','bridgeFoot',10],
  ['forecourt','cafeWalk',12], ['cafeWalk','cafe',12], ['waterfront','park',14],
];

export const places = {
  gate:{label:'結界広場',action:'結界をくぐる',point:points.gate,sign:[220,399],link:'../town/?arrival=future-gate'},
  station:{label:'高架駅',action:'駅前を見学する',point:points.station,sign:[136,276],
    description:'駅前の広場。ここから眺めると、ガラス屋根の下を電車が通り抜けるのが見えます。'},
  tower:{label:'Atelier Tower',action:'マンションへ入る',point:points.tower,sign:[503,219],link:'../../../tower/?from=diorama'},
  cafe:{label:'カフェ',action:'カフェに入る',point:points.cafe,sign:[328,303],venue:'cafe'},
  park:{label:'水辺の公園',action:'公園に入る',point:points.park,sign:[663,442],venue:'park'},
  waterfront:{label:'水辺のデッキ',action:'水辺に立ち寄る',point:points.bridge,sign:[706,306],
    description:'水辺の歩道橋。日が落ちると、向かいの建物のネオンが水面に映ります。'},
};

export const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const clamp=value=>Math.max(0,Math.min(1,value));
function projection(point,a,b) {
  const dx=b[0]-a[0],dy=b[1]-a[1];
  const t=clamp(((point[0]-a[0])*dx+(point[1]-a[1])*dy)/(dx*dx+dy*dy));
  return [a[0]+dx*t,a[1]+dy*t];
}
export function walkable(point) {
  return lanes.some(([from,to,radius])=>distance(point,projection(point,points[from],points[to]))<=radius);
}
function canWalk(a,b) {
  const steps=Math.ceil(distance(a,b)/6);
  for (let i=1;i<=steps;i++) {
    const t=i/steps;
    if (!walkable([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t])) return false;
  }
  return true;
}
export function walkingRoute(start,target) {
  if (!walkable(target)) return [];
  if (canWalk(start,target)) return [target];
  const vertices=[start,...Object.values(points),target];
  const previous=new Map();
  const costs=new Map([[0,0]]);
  const unseen=new Set(vertices.keys());
  const end=vertices.length-1;
  while (unseen.size) {
    const next=[...unseen].sort((a,b)=>(costs.get(a) ?? Infinity)-(costs.get(b) ?? Infinity))[0];
    if (next===end || !costs.has(next)) break;
    unseen.delete(next);
    for (const vertex of unseen) {
      const cost=costs.get(next)+distance(vertices[next],vertices[vertex]);
      if (cost>=(costs.get(vertex) ?? Infinity) || !canWalk(vertices[next],vertices[vertex])) continue;
      costs.set(vertex,cost);
      previous.set(vertex,next);
    }
  }
  if (!costs.has(end)) return [];
  const path=[];
  for (let vertex=end;vertex!==0;vertex=previous.get(vertex)) path.unshift(vertices[vertex]);
  return path;
}
