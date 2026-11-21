import test from 'node:test';
import assert from 'node:assert/strict';
import { garageVehiclePose, vehicleBays } from '../vehicle-display.js';

// Reference measurements from the painted white lines in the B1 background.
const measured = [
  x => [611+(x-277)*14/281, 655+(x-277)*7/128],
  x => [565+(x-653)*3/89, 579+(x-653)*3/89],
  x => [547+(x-800)*2/58, 555+(x-800)*2/58],
  x => [537+(x-880)*2/50, 542+(x-880)*2/50],
];
const purpleCar = {version:'fd841db7aecbec5ccfeb5802', metadata:'left', source:[[.095,.896],[.493,.998]], ratio:.5};
const darkCar = {version:'8e3064b99218d3bd53c60276', metadata:'right', source:[[815/909,436/469],[462/909,468/469]], ratio:469/909};

function projectedWheel(pose, source, ratio, imageWidth) {
  const [u,v]=source, x=pose.flip ? 1-u : u;
  const w=pose.width*imageWidth, h=w*ratio, a=Math.tan(pose.skew*Math.PI/180);
  const dx=(x-pose.anchorX)*w, dy=(v-pose.anchorY)*h+a*dx;
  return [pose.u*imageWidth+dx, pose.v*imageWidth*2/3+dy];
}

test('registered B1 cars point toward the aisle without relying on stale facing metadata', () => {
  assert.equal(garageVehiclePose(0,purpleCar.metadata,purpleCar.version,purpleCar.ratio).flip,false);
  assert.equal(garageVehiclePose(0,darkCar.metadata,darkCar.version,darkCar.ratio).flip,true);
  assert.equal(garageVehiclePose(0,'left','new-car').flip,true);
  assert.equal(garageVehiclePose(0,'right','new-car').flip,false);
});

test('the wheel contacts of both published B1 cars parallel the painted lines in all four bays and at phone width', () => {
  let previousWidth=Infinity, previousLeft=0;
  for (let i=0;i<measured.length;i++) {
    const base=garageVehiclePose(i,purpleCar.metadata,purpleCar.version,purpleCar.ratio);
    assert.ok(base.width<previousWidth,'further vehicles are smaller');
    const left=base.u-base.anchorX*base.width;
    assert.ok(left>=previousLeft,'vehicles have separate visible parking spans');
    previousWidth=base.width; previousLeft=left+base.width;
    for (const car of [purpleCar,darkCar]) {
      const pose=garageVehiclePose(i,car.metadata,car.version,car.ratio);
      assert.ok(Math.abs(pose.skew)<7,'keep the body upright');
      for(const imageWidth of [390,844,1000,1536]){
        const positions=car.source.map(wheel=>projectedWheel(pose,wheel,car.ratio,imageWidth));
        assert.ok(positions[1][0]>positions[0][0],'front wheel is on the aisle side');
        for(const [x,y] of positions){
          const scale=imageWidth/1536;
          const [far,near]=measured[i](x/scale).map(value=>value*scale);
          assert.ok(y>far && y<near,'both wheels are between the side lines');
          assert.ok(Math.abs((y-far)/(near-far)-.68)<1e-9,'projected contact line follows the bay');
        }
      }
    }
  }
});

test('new registration images still honor facing, including narrow and tall images', () => {
  for (const facing of ['left','right']) {
    for(const ratio of [.18,.5,1.45]){
      const pose=garageVehiclePose(1,facing,'another-image',ratio);
      assert.equal(pose.flip,facing==='left');
      assert.ok(Math.abs(pose.skew)<=8);
      assert.ok([pose.u,pose.v,pose.width,pose.anchorX,pose.anchorY].every(value=>value>0&&value<1));
    }
  }
  assert.equal(vehicleBays.parkingTower[0][3],'right');
  assert.equal(vehicleBays.motorcycle[0][3],'left');
  assert.equal(vehicleBays.bicycle[0][3],'right');
});
