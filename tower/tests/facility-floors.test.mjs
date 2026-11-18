import test from 'node:test';
import assert from 'node:assert/strict';
import { facilityFloors, facilityActorHeight, facilityRoute, canStandOnFloor, canWalkFloorSegment, registeredFloorFor } from '../facility-floors.js';

test('all eleven backgrounds have reachable foot positions and perspective depth', () => {
  assert.equal(Object.keys(facilityFloors).length,11);
  for (const [id,floor] of Object.entries(facilityFloors)) {
    const {spawn,polygon,guests,heights,bounds}=floor;
    assert.ok(canStandOnFloor(floor,spawn),id+' spawn');
    assert.ok(facilityActorHeight(floor,bounds[2])<facilityActorHeight(floor,bounds[3]),id);
    assert.equal(facilityActorHeight(floor,0),heights[0]);
    assert.ok(Math.abs(facilityActorHeight(floor,1)-heights[1])<1e-9);
    for(const dest of [...polygon,...guests]) {
      const path=facilityRoute(floor,spawn,dest);
      assert.deepEqual(path.at(-1),dest,id+' reach floor and guest');
      let previous=spawn;
      for(const step of path) {
        assert.ok(canWalkFloorSegment(floor,previous,step),id+' legal segment');
        previous=step;
      }
    }
  }
});

test('furniture, walls, reserved vehicle bays and equipment cannot be walked on', () => {
  const blocked={
    concierge:[[.36,.45],[.46,.51],[.66,.59],[.73,.65],[.85,.56],[.2,.61]],
    lobby:[[.13,.63],[.88,.70],[.74,.48]], sky:[[.15,.82],[.22,.70],[.9,.53]],
    owner:[[.03,.60],[.92,.55]], boiler:[[.20,.53],[.40,.64]], seismic:[[.28,.62],[.06,.83]],
    parking:[[.42,.51],[.04,.64],[.93,.75]], driveway:[[.17,.54],[.73,.58]],
    parkingTower:[[.12,.77],[.75,.58]], bicycle:[[.11,.66],[.91,.68]], motorcycle:[[.2,.64],[.9,.65]],
  };
  for (const [id,points] of Object.entries(blocked)) {
    const floor=facilityFloors[id];
    for(const p of points) {
      assert.equal(canStandOnFloor(floor,p),false,id+' '+p);
      assert.deepEqual(facilityRoute(floor,floor.spawn,p),[],id+' cannot tap furniture');
    }
  }
});

test('a visit to the recess behind the concierge chairs stays on the near side of the counter', () => {
  const floor=facilityFloors.concierge;
  const start=[.45,.60], target=[.91,.71];
  assert.ok(!canWalkFloorSegment(floor,start,target));
  const path=facilityRoute(floor,start,target);
  assert.ok(path.length>1);
  assert.deepEqual(path.at(-1),target);
  let previous=start;
  for(const corner of path) {
    assert.ok(canWalkFloorSegment(floor,previous,corner));
    previous=corner;
  }
});

test('city floors can use source pixel coordinates and avoid an internal furniture footprint', () => {
  const floor={polygon:[[100,400],[900,400],[900,650],[100,650]],bounds:[100,900,400,650],obstacles:[[400,600,460,580]]};
  const start=[200,500], target=[800,500];
  assert.equal(canStandOnFloor(floor,[400,460]),false);
  assert.equal(canWalkFloorSegment(floor,start,target),false);
  const path=facilityRoute(floor,start,target);
  assert.deepEqual(path.at(-1),target);
  assert.ok(path.length>1);
  let previous=start;
  for(const step of path) { assert.ok(canWalkFloorSegment(floor,previous,step)); previous=step; }
});

test('a measured resident floor follows its original artwork and drops the old map on renovation', () => {
  const room={design:{world:{artwork:'c3a9cb95f657bfe169147a33'}}};
  const floor=registeredFloorFor(room);
  assert.ok(canStandOnFloor(floor,floor.spawn));
  for(const furniture of [[.16,.66],[.75,.54],[.43,.45],[.94,.62]]) {
    assert.equal(canStandOnFloor(floor,furniture),false);
    assert.deepEqual(facilityRoute(floor,floor.spawn,furniture),[]);
  }
  assert.equal(registeredFloorFor({...room,draftInterior:{source:'blob:replacement'}}),undefined);
  assert.equal(registeredFloorFor({design:{world:{artwork:'new-background'}}}),undefined);
});
