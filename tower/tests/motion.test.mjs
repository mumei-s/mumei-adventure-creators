import assert from 'node:assert/strict';
import { test } from 'node:test';
import { roomFloorPoint } from '../world.js';
import { facilityRoute } from '../facility-floors.js';
import { venues, venueFloor, venueSpawn, venueWalkable } from '../../halloween-exhibition/preview/diorama-city/venues.js';
import { streetVehiclesAt } from '../../halloween-exhibition/preview/diorama-city/traffic.js';
import { playgroundPose } from '../../halloween-exhibition/preview/diorama-city/district-activities.js';

test('floor taps recover the intended x and depth in a scaled, translated scene', () => {
  const rect = { left: -315, top: -52, width: 1200, height: 800 };
  for (const shared of [true, false]) {
    for (const [x, z] of [[.5, .74], [.23, .29], [.82, .88]]) {
      const u = shared ? x : .5 + (x - .5) * (.74 + .29 * z);
      const v = shared ? z : .61 + .36 * z;
      const actual = roomFloorPoint(rect, rect.left + u * rect.width, rect.top + v * rect.height, shared);
      assert.ok(Math.hypot(actual[0] - x, actual[1] - z) < 1e-10);
    }
  }
  assert.deepEqual(roomFloorPoint(rect, -1e3, 1e5), [.135, .91]);
  assert.equal(roomFloorPoint({...rect,width:0},50,50), null);
});

function checkPath(start, target, venue) {
  const route = facilityRoute(venueFloor(venue), start, target);
  assert.deepEqual(route.at(-1), target);
  let from = start;
  for (const to of route) {
    for (let i = 0; i <= 400; i++) {
      const point = from.map((x, axis) => x + (to[axis] - x) * i / 400);
      assert.ok(venueWalkable(point, venue), 'path crosses furniture at ' + point);
    }
    from = to;
  }
  return route;
}

test('tap walking goes around overlapping furniture and refuses unreachable or invalid floor', () => {
  const floor={bounds:[0,1,0,1],aspect:1,polygon:[[0,0],[1,0],[1,1],[0,1]],
    obstacles:[[.26,.54,.21,.79],[.45,.72,.43,.86]]};
  const route=facilityRoute(floor,[.09,.52],[.91,.54]);
  assert.ok(route.length>1);
  assert.deepEqual(route.at(-1),[.91,.54]);
  assert.deepEqual(facilityRoute(floor,[.1,.2],[.3,.3]),[]);
  assert.deepEqual(facilityRoute(floor,[.1,.2],[2,.35]),[]);
  assert.deepEqual(facilityRoute({...floor,obstacles:[[.4,.5,-.1,1.1]]},[.1,.2],[.9,.3]),[]);
  assert.deepEqual(facilityRoute(floor,[.1,.2],[NaN,.3]),[]);
  assert.ok(facilityRoute({...floor,obstacles:[[.4001,.4002,.1,.3]]},[.1,.2],[.9,.2]).length>1);
});

test('all city venue spots can be reached from arrival and from each other', () => {
  for(const venue of Object.values(venues)){
    const points=[venueSpawn,...Object.values(venue.spots).map(spot=>spot.point)];
    for(const start of points)for(const end of points)checkPath(start,end,venue);
  }
});

test('the seven venue floor silhouettes exclude painted fixtures, leaving room for feet at every action', () => {
  // Image coordinates for the cabinet base, fountain, slide, register, ride gate, planter and water.
  const fixtures = {
    cafe: [[273,399],[807,406]], park: [[405,350],[130,377],[890,384]],
    playground: [[408,419],[605,436],[904,398]], market: [[110,437],[868,453],[485,367]],
    fair: [[218,423],[819,437]], manor: [[428,475],[180,479]],
    mirrorRoom: [[180,401],[677,369]],
  };
  for (const [name, blocked] of Object.entries(fixtures)) {
    const venue = venues[name];
    for (const point of blocked) {
      assert.equal(venueWalkable(point, venue), false, name + ' fixture ' + point);
      assert.deepEqual(facilityRoute(venueFloor(venue), venueSpawn, point), []);
    }
    for (const { point:[x,y],label } of Object.values(venue.spots)) {
      for (const offset of [-6, 0, 6]) {
        assert.ok(venueWalkable([x + offset, y - 3], venue), name + ' approach to ' + label);
      }
    }
  }
  assert.ok(checkPath([206,383], [600,351], venues.park).length > 1, 'walk around the fountain');
  assert.ok(checkPath([306,422], [929,449], venues.playground).length > 1, 'walk around the slide chute');
});

test('swing pumping is continuous and the swing and bench return to the walkable starting point', () => {
  const origin=[307,485], motion={kind:'swing',started:0,origin,pumpTimes:[]};
  const before=playgroundPose(motion,1820);
  motion.pumpTimes.push(1.82);
  const after=playgroundPose(motion,1820);
  assert.deepEqual(after.pose,before.pose);
  for(const kind of ['swing','bench']){
    const sample={...motion,kind};
    const last=playgroundPose(sample,8500);
    assert.ok(last.done);
    assert.deepEqual(last.pose,origin);
    assert.deepEqual(last.exit,origin);
    const t=2.3, from=playgroundPose(sample,t*1000).pose;
    sample.dismount={at:t,from};
    assert.deepEqual(playgroundPose(sample,t*1000).pose,from);
    assert.deepEqual(playgroundPose(sample,(t+1)*1000).pose,origin);
  }
});

test('leaving a slide returns down the ladder or continues to the slide exit', () => {
  const motion={kind:'slide',started:0,origin:venues.playground.spots.slide.point};
  const top=playgroundPose(motion,1550);
  assert.ok(top.groundY-top.pose[1]>130); // ladder elevation is separate from perspective depth
  for(const t of [.7,2]){
    const before=playgroundPose(motion,t*1000);
    const stopped={...motion,dismount:{at:t,from:before.pose}};
    assert.deepEqual(playgroundPose(stopped,t*1000).pose,before.pose);
    const end=playgroundPose(stopped,5000);
    assert.ok(end.done);
    assert.ok(venueWalkable(end.exit,venues.playground));
    assert.deepEqual(end.pose,t<1.55 ? motion.origin : [606,486]);
  }
});

test('street vehicles turn gradually and each loop restarts beyond the visible image',()=>{
  let previous=streetVehiclesAt(0);
  for(let frame=1;frame<=26*60;frame++){
    const current=streetVehiclesAt(frame/60);
    for(const type of ['taxi','shuttle']){
      const a=previous[type],b=current[type];
      assert.ok(Math.abs(Math.hypot(b.dx,b.dy)-1)<1e-9);
      if(a.y<=667||b.y<=667){
        assert.ok(Math.hypot(b.x-a.x,b.y-a.y)<1);
        assert.ok(a.dx*b.dx+a.dy*b.dy>.99);
      }
    }
    previous=current;
  }
});
