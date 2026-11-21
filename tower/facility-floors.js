// Coordinates mark a standing person's feet in the original background image.
// The outlines follow photographed aisles, including clearances at chair legs,
// cabinets, parking bays, glass, railings and planters.
function floor({ outline, spawn, heights, guests = [], parking = [], aspect = 1.5 }) {
  const normalized = ([u, v]) => [u / 100, v / 100];
  const polygon = outline.map(normalized);
  const xs = polygon.map(([u]) => u), ys = polygon.map(([, v]) => v);
  return {
    polygon, spawn: normalized(spawn), heights: heights.map(value => value / 100), aspect,
    bounds: [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)],
    guests: guests.map(normalized), parking: parking.map(normalized),
  };
}

const garage = floor({
  outline: [[4,78],[22,69],[42,61],[62,54],[72,52],[77,52],[79,62],[88,96],[4,96]],
  // Enter the aisle opposite the displayed bays so the nearest bumper is visible on a phone.
  spawn: [39.5,84], heights: [8,42], parking: [[13,69],[29,62],[42,58],[52,55]],
});
const drivewayBays = [[13,77],[24,68],[32,63],[39,59]];
const driveway = floor({
  outline: [[5,75],[18,68],[32,62],[40,57],[50,56],[53,59],[61,61],[68,65],[79,69],[91,76],[96,82],[96,96],[5,96]],
  spawn: [53,85], heights: [10,41], parking: drivewayBays,
});
const parkingTower = floor({
  outline: [[6,92],[17,77],[26,68],[34,61],[42,58],[59,58],[67,62],[78,70],[93,79],[96,82],[96,96],[6,96]],
  spawn: [54,84], heights: [10,43], aspect:16/9, parking:[[14,70],[32,61],[69,60],[86,68]],
});
const bicycles = floor({
  outline: [[6,94],[19,78],[24,70],[34,60],[42,55],[55,55],[58,59],[62,65],[74,83],[83,96],[6,96]],
  spawn: [44,85], heights: [9,41], parking: [[12,72],[20,67],[28,62],[34,59],[39,56]],
});
const motorcycles = floor({
  outline: [[5,78],[16,72],[30,70],[47,69],[64,69],[80,70],[94,73],[96,78],[96,96],[5,96]],
  spawn:[50,85],heights:[12,43],aspect:16/9,parking:[[23,67],[40,66],[56,66],[73,67]],
});
export const facilityFloors = Object.freeze({
  concierge: floor({
    // Key cabinet and open door occupy the left rear, with a broad counter and
    // two chairs on the right. Only the shallow recess between them is floor.
    outline: [[5,74],[15,68],[26,65],[34,63],[43,59],[49,59],[49,64],
      [56,65],[58,70],[83,71],[84,67],[95,70],[95,96],[5,96]],
    spawn: [48,85], heights: [18,46],
  }),
  lobby: floor({
    outline: [[5,86],[11,82],[13,75],[23,71],[24,65],[21,62],[22,56],
      [35,51],[48,50],[52,49],[64,49],[66,52],[81,54],[86,56],[84,63],
      [82,71],[82,77],[89,83],[89,96],[5,96]],
    spawn: [54,84], heights: [10,43],
    guests: [[46,53],[63,57],[31,60],[76,65],[43,70],[25,81],[72,87],[12,94]],
  }),
  sky: floor({
    outline: [[26,96],[28,87],[28,81],[35,78],[35,69],[33,65],[25,64],
      [25,57],[32,54],[42,52],[49,49],[55,48],[57,46],[73,46],[78,48],
      [79,53],[85,59],[94,64],[96,66],[96,96]],
    spawn: [54,85], heights: [9,42],
    guests: [[60,49],[72,53],[47,57],[35,61],[79,67],[45,71],[70,82],[34,92]],
  }),
  owner: floor({
    outline: [[5,70],[13,65],[15,59],[84,59],[86,65],[95,67],[95,96],[5,96]],
    spawn: [54,85], heights: [17,46], aspect: 1320/743,
  }),
  parking: garage, driveway, parkingTower, bicycle: bicycles, motorcycle: motorcycles,
  boiler: floor({
    outline: [[4,82],[19,76],[38,70],[56,65],[74,59],[89,55],[96,55],[96,96],[4,96]],
    spawn: [57,85], heights: [10,43],
  }),
  seismic: floor({
    outline: [[4,92],[20,85],[42,76],[58,69],[77,62],[90,56],[96,55],[96,96],[4,96]],
    spawn: [60,86], heights: [10,42],
  }),
});

// The content version is derived from the original published picture bytes, so a
// renovation automatically drops a previous backdrop's floor. No room ID or
// creator information is needed. Uploaded images themselves stay in the Tower.
const registeredFloors = new Map([
  ['c3a9cb95f657bfe169147a33', floor({
    outline: [[4,85],[13,75],[22,73],[24,68],[24,62],[33,55],[36,53],
      [60,53],[65,54],[66,59],[73,65],[82,65],[91,71],[96,75],[96,96],[4,96]],
    spawn: [53,84], heights: [12,46],
  })],
]);

export function registeredFloorFor(room) {
  if(room.draftInterior?.source) return undefined;
  return registeredFloors.get(room.design?.world?.artwork);
}

const epsilon = 1e-9;
const cross = (ax, ay, bx, by) => ax * by - ay * bx;

export function canStandOnFloor(floor, point) {
  if (!point || !point.every(Number.isFinite)) return false;
  const [x, y] = point, polygon = floor.polygon;
  const [left,right,far,near] = floor.bounds;
  if (x < left-epsilon || x > right+epsilon || y < far-epsilon || y > near+epsilon) return false;
  if (floor.obstacles?.some(([x1,x2,y1,y2])=>x>=x1 && x<=x2 && y>=y1 && y<=y2)) return false;
  let inside = false;
  for (let i=0, j=polygon.length-1; i<polygon.length; j=i++) {
    const [ax,ay] = polygon[j], [bx,by] = polygon[i];
    if (Math.abs(cross(bx-ax,by-ay,x-ax,y-ay)) <= epsilon &&
        x >= Math.min(ax,bx)-epsilon && x <= Math.max(ax,bx)+epsilon &&
        y >= Math.min(ay,by)-epsilon && y <= Math.max(ay,by)+epsilon) return true;
    if ((ay>y)!==(by>y) && x < ax+(y-ay)*(bx-ax)/(by-ay)) inside = !inside;
  }
  return inside;
}

function crossesBlocker(start,end,box) {
  let first=0,last=1;
  for(let axis=0;axis<2;axis++) {
    const from=start[axis], delta=end[axis]-from, low=box[axis*2], high=box[axis*2+1];
    if(!delta) {
      if(from<low || from>high) return false;
    } else {
      const a=(low-from)/delta,b=(high-from)/delta;
      first=Math.max(first,Math.min(a,b)); last=Math.min(last,Math.max(a,b));
      if(first>last) return false;
    }
  }
  return true;
}

// Crossing a notch in a concave floor must be rejected even if both endpoints
// are on the floor. Check the open intervals between boundary intersections.
export function canWalkFloorSegment(floor, start, end) {
  if (!canStandOnFloor(floor,start) || !canStandOnFloor(floor,end)) return false;
  if(floor.obstacles?.some(box=>crossesBlocker(start,end,box))) return false;
  const dx=end[0]-start[0], dy=end[1]-start[1], cuts=[0,1];
  const polygon=floor.polygon;
  for (let i=0, j=polygon.length-1; i<polygon.length; j=i++) {
    const a=polygon[j], b=polygon[i], ex=b[0]-a[0], ey=b[1]-a[1];
    const det=cross(dx,dy,ex,ey);
    if (Math.abs(det)<=epsilon) continue;
    const ax=a[0]-start[0], ay=a[1]-start[1];
    const t=cross(ax,ay,ex,ey)/det, u=cross(ax,ay,dx,dy)/det;
    if(t>0 && t<1 && u>=-epsilon && u<=1+epsilon) cuts.push(t);
  }
  cuts.sort((a,b)=>a-b);
  return cuts.every((cut,i)=>{
    if (!i || cut-cuts[i-1]<=epsilon) return true;
    const t=(cut+cuts[i-1])/2;
    return canStandOnFloor(floor,[start[0]+dx*t,start[1]+dy*t]);
  });
}

export function facilityActorHeight(floor, v) {
  const [, , far, near] = floor.bounds, [small,large] = floor.heights;
  const depth=Math.max(0,Math.min(1,(v-far)/(near-far)));
  return small+(large-small)*depth;
}

export function facilityRoute(floor, start, target) {
  if (!canStandOnFloor(floor,start) || !canStandOnFloor(floor,target)) return [];
  if (canWalkFloorSegment(floor,start,target)) return [target];
  const corners=[...floor.polygon];
  const [left,right,far,near]=floor.bounds, margin=Math.min(right-left,near-far)*.0001;
  for(const [x1,x2,y1,y2] of floor.obstacles ?? []) {
    for(const x of [x1-margin,x2+margin]) for(const y of [y1-margin,y2+margin]) {
      if(canStandOnFloor(floor,[x,y])) corners.push([x,y]);
    }
  }
  const vertices=[start,...corners,target], end=vertices.length-1;
  const cost=vertices.map(()=>Infinity), parent=vertices.map(()=>-1);
  const remaining=new Set(vertices.keys());
  cost[0]=0;
  while(remaining.size) {
    let next=-1;
    for(const i of remaining) if(next===-1 || cost[i]<cost[next]) next=i;
    if(!Number.isFinite(cost[next]) || next===end) break;
    remaining.delete(next);
    for(const i of remaining) {
      const a=vertices[next], b=vertices[i];
      const candidate=cost[next]+Math.hypot((a[0]-b[0])*(floor.aspect ?? 1),a[1]-b[1]);
      if(candidate>=cost[i] || !canWalkFloorSegment(floor,a,b)) continue;
      cost[i]=candidate; parent[i]=next;
    }
  }
  if(parent[end]===-1) return [];
  const points=[];
  for(let i=end;i!==0;i=parent[i]) points.unshift(vertices[i]);
  return points;
}
