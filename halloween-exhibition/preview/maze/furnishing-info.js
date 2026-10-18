import {CELL,blocked} from './maze-model.js?v=20261014-adventure2';
export const FURNISHING_INFO=Object.freeze({
 bookcase:{name:'回廊の蔵書棚',text:'街の歴史や星の観測記録が並ぶ棚。参加者の物語を読みたくなったら、物語の書庫をひらこう。'},
 cabinet:{name:'灯具の保管庫',text:'替えのろうそくや古い灯具が収められている。宮殿の小さな灯りを守るための戸棚だ。'},
 moonWindow:{name:'月灯りの窓',text:'青白い月明かりが石床に落ちている。遠くまで照らすほどの明るさはなく、先を探すには手元のランタンが頼りになる。'},
 tapestry:{name:'宮殿の織物',text:'星と蔦を織り込んだ古いタペストリー。回廊を見守る、宮殿の歴史を伝える飾りだ。'},
 palaceColumn:{name:'回廊を支える石柱',text:'天井のアーチを支える石柱。金色の帯と石の継ぎ目に、宮殿を建てた職人の仕事が残っている。'},
 planter:{name:'銀葉草の鉢',text:'薄い月明かりでも育つ銀葉草。暗い回廊で葉の縁がほのかに光り、部屋の隅を知らせている。'},
 chaise:{name:'回廊の休憩椅子',text:'窓辺に置かれた長椅子。ここは対戦の場所ではなく、灯りと宮殿の眺めを楽しむための静かな一角。'},
 harvest:{name:'収穫祭の飾り',text:'かぼちゃや木の実を集めた収穫祭の飾り。今夜この宮殿に集まった人々を迎えている。'},
 candelabra:{name:'三枝の燭台',text:'三本のろうそくが足元だけを暖かく照らす。部屋全体には届かない、小さな目印の灯り。'},
 armchair:{name:'読書椅子',text:'本棚のそばに置かれた一人掛けの椅子。分厚い本をゆっくり読むための場所だ。'},
 writingDesk:{name:'記録机',text:'星図と古い帳面が置かれた机。観測係が、夜空の変化を記していたらしい。'},
 armillary:{name:'星読みの天球儀',text:'いくつもの金の輪が星の道筋を示している。北の浮遊書庫と同じ星の紋章が、台座にも刻まれている。'},
});
export function nearestFurnishing(state,items,{maxDistance=1.05,isBlocked=blocked}={}){
 if(!Number.isFinite(state?.x)||!Number.isFinite(state?.z))return null;
 const px=state.x/CELL,pz=state.z/CELL,candidates=[];
 for(const [index,item] of items.entries()){
  if(!Object.hasOwn(FURNISHING_INFO,item.kind)||!Number.isFinite(item.x)||!Number.isFinite(item.y))continue;
  let x=item.x/72,z=item.y/72;
  // A window or hanging behind a cabinet can be inspected from its exposed edge.
  if(['moonWindow','tapestry'].includes(item.kind)&&items.some(other=>other.kind==='cabinet'&&Math.hypot(other.x-item.x,other.y-item.y)<14))x+=item.kind==='moonWindow'?.5:-.5;
  const distance=Math.hypot(x-px,z-pz);if(distance>maxDistance)continue;
  let visible=true;const steps=Math.max(2,Math.ceil(distance*10));
  for(let i=1;i<steps;i++){const a=i/steps;if(isBlocked(state.x+(x*CELL-state.x)*a,state.z+(z*CELL-state.z)*a,state)){visible=false;break;}}
  if(visible)candidates.push({...item,id:`furnishing-${index}`,furnishingKind:item.kind,...FURNISHING_INFO[item.kind],distance});
 }
 return candidates.sort((a,b)=>a.distance-b.distance)[0]||null;
}
