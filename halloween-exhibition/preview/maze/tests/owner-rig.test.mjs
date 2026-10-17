import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  solveTwoBone, solveTwoBone3D, createOwnerRig, createFrameComposer, createLiveComposer,
  OWNER_ATTACK_DURATION, selectOwnerView, drawOwnerPose,
} from '../owner-rig.js';

const EPSILON = 1e-6;
const distance2D = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const distance3D = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const distanceWorld = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const near = (actual, expected, tolerance = EPSILON, label = 'value') => {
  assert.ok(Number.isFinite(actual), `${label} must be finite`);
  assert.ok(Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected}, received ${actual}`);
};

function assertPoint(point, axes = ['x', 'y']) {
  assert.ok(point && typeof point === 'object', 'point must exist');
  for (const axis of axes) assert.ok(Number.isFinite(point[axis]), `${axis} must be finite`);
}

function assertBones(solution, lengthA, lengthB) {
  for (const point of [solution.root, solution.joint, solution.end]) assertPoint(point);
  near(distance2D(solution.root, solution.joint), lengthA, EPSILON, 'first bone length');
  near(distance2D(solution.joint, solution.end), lengthB, EPSILON, 'second bone length');
}

function assertRigBones(pose) {
  const { joints, limbLengths } = pose;
  for (const side of ['left', 'right']) {
    for (const [from, to, length] of [
      [`${side}Hip`, `${side}Knee`, 'thigh'],
      [`${side}Knee`, `${side}Ankle`, 'shin'],
      [`${side}Shoulder`, `${side}Elbow`, 'upperArm'],
      [`${side}Elbow`, `${side}Wrist`, 'forearm'],
    ]) {
      const physicalLeg = ['thigh', 'shin'].includes(length) && pose.joints3D;
      const skeleton = physicalLeg ? pose.joints3D : joints;
      const axes = physicalLeg ? ['x', 'y', 'z'] : ['x', 'y'];
      assertPoint(skeleton[from], axes);
      assertPoint(skeleton[to], axes);
      near((physicalLeg ? distance3D : distance2D)(skeleton[from], skeleton[to]), limbLengths[length], EPSILON,
        `${side} ${length} length`);
    }
  }
}

function advance(rig, { x = 0, z = 0, dt = 1 / 60, heading = 0, moving = false, attack = false, ...projection } = {}) {
  return rig.update({ position: { x, z }, dt, heading, moving, attack, ...projection });
}

test('reachable two-bone IK reaches the target without changing either limb length', () => {
  const root = { x: 2, y: -3 };
  const target = { x: 7, y: 1 };
  const solution = solveTwoBone(root, target, 5, 4);
  assertBones(solution, 5, 4);
  assert.equal(solution.reachable, true);
  near(distance2D(solution.end, target), 0);
  assert.deepEqual(root, { x: 2, y: -3 }, 'IK must not mutate caller coordinates');
  assert.deepEqual(target, { x: 7, y: 1 }, 'IK must not mutate caller coordinates');
});

test('opposite bend options choose opposite elbows while preserving the end target', () => {
  const root = { x: 0, y: 0 };
  const target = { x: 6, y: 0 };
  const positive = solveTwoBone(root, target, 5, 4, { bend: 1 });
  const negative = solveTwoBone(root, target, 5, 4, { bend: -1 });
  assertBones(positive, 5, 4);
  assertBones(negative, 5, 4);
  near(positive.joint.x, negative.joint.x);
  near(positive.joint.y, -negative.joint.y);
  assert.ok(Math.abs(positive.joint.y) > 0.1, 'reachable bend must not collapse');
  near(distance2D(positive.end, negative.end), 0);
});

test('unreachable far and near targets clamp reach while preserving both bone lengths', () => {
  for (const [target, first, second, expectedReach] of [
    [{ x: 100, y: 0 }, 5, 4, 9],
    [{ x: 0.1, y: 0 }, 5, 2, 3],
  ]) {
    const solution = solveTwoBone({ x: 0, y: 0 }, target, first, second);
    assertBones(solution, first, second);
    assert.equal(solution.reachable, false);
    near(distance2D(solution.root, solution.end), expectedReach);
  }
});

test('coincident root and target cannot create NaN joints', () => {
  for (const lengths of [[4, 4], [5, 2]]) {
    const solution = solveTwoBone({ x: 2, y: 3 }, { x: 2, y: 3 }, ...lengths);
    assertBones(solution, ...lengths);
  }
});

function assertBones3D(solution, lengthA, lengthB) {
  for (const point of [solution.root, solution.joint, solution.end]) assertPoint(point, ['x', 'y', 'z']);
  near(distance3D(solution.root, solution.joint), lengthA, EPSILON, 'first 3D bone length');
  near(distance3D(solution.joint, solution.end), lengthB, EPSILON, 'second 3D bone length');
}

test('3D two-bone IK reaches spatial targets and preserves both physical lengths', () => {
  const root = { x: 2, y: 8, z: -3 };
  const target = { x: 4, y: 1, z: 2 };
  const solution = solveTwoBone3D(root, target, 5, 4);
  assertBones3D(solution, 5, 4);
  assert.equal(solution.reachable, true);
  near(distance3D(solution.end, target), 0);
  assert.deepEqual(root, { x: 2, y: 8, z: -3 });
  assert.deepEqual(target, { x: 4, y: 1, z: 2 });
});

test('3D IK handles reach limits, coincident endpoints and axis-parallel poles without NaN', () => {
  for (const [target, first, second, expectedReach, reachable] of [
    [{ x: 0, y: -100, z: 0 }, 5, 4, 9, false],
    [{ x: 0, y: -0.1, z: 0 }, 5, 2, 3, false],
    [{ x: 0, y: 0, z: 0 }, 4, 4, 0, true],
    [{ x: 0, y: -6, z: 0 }, 5, 4, 6, true],
  ]) {
    const solution = solveTwoBone3D({ x: 0, y: 0, z: 0 }, target, first, second,
      { pole: { x: 0, y: -1, z: 0 } });
    assertBones3D(solution, first, second);
    near(distance3D(solution.root, solution.end), expectedReach);
    assert.equal(solution.reachable, reachable);
  }
});

test('3D knees flex toward the heading-forward pole rather than sideways', () => {
  for (const heading of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const pole = { x: Math.sin(heading), y: 0, z: Math.cos(heading) };
    const solution = solveTwoBone3D({ x: 0, y: 8, z: 0 }, { x: 0, y: 0, z: 0 }, 5, 5, { pole });
    assertBones3D(solution, 5, 5);
    const forwardFlex = solution.joint.x * pole.x + solution.joint.z * pole.z;
    const sidewaysFlex = solution.joint.x * pole.z - solution.joint.z * pole.x;
    assert.ok(forwardFlex > 2.9, 'knee bends visibly forward in physical depth');
    near(sidewaysFlex, 0, EPSILON, 'knee lateral deviation');
    near(solution.joint.y, 4);
  }
});

test('front-view rig knees stay between hip and foot laterally while bending in depth', () => {
  const rig = createOwnerRig();
  const pose = advance(rig);
  assert.ok(pose.joints3D, 'physical leg joints are available');
  for (const side of ['left', 'right']) {
    const hip = pose.joints3D[`${side}Hip`];
    const knee = pose.joints3D[`${side}Knee`];
    const ankle = pose.joints3D[`${side}Ankle`];
    assert.ok(knee.x >= Math.min(hip.x, ankle.x) - EPSILON);
    assert.ok(knee.x <= Math.max(hip.x, ankle.x) + EPSILON,
      `${side} knee must not flare outside its hip-to-foot lane`);
    assert.ok(knee.z > Math.max(hip.z, ankle.z) + 1,
      `${side} knee bends into depth`);
  }
  assertRigBones(pose);
  rig.destroy();
});

test('gait phase and traveled distance depend on movement rather than frame rate', () => {
  const results = [30, 60, 120].map((fps) => {
    const rig = createOwnerRig();
    advance(rig);
    let pose;
    for (let frame = 1; frame <= fps * 3; frame++) {
      pose = advance(rig, { x: frame / fps, z: frame / fps * 0.3, dt: 1 / fps, moving: true });
    }
    rig.destroy();
    return pose;
  });
  for (const pose of results.slice(1)) {
    near(pose.distance, results[0].distance, 1e-8, 'distance');
    near(pose.gaitPhase, results[0].gaitPhase, 1e-8, 'gait phase');
    for (const side of ['left', 'right']) {
      near(distanceWorld(pose.feet[side].world, results[0].feet[side].world), 0, 1e-8,
        `${side} world foot position across frame rates`);
      near(pose.feet[side].lift, results[0].feet[side].lift, 1e-8,
        `${side} foot lift across frame rates`);
      assert.equal(pose.feet[side].contact, results[0].feet[side].contact);
    }
  }
  near(results[0].distance, Math.hypot(3, 0.9), 1e-8, 'traveled path');
});

test('walk and attack poses retain the calibrated limb lengths', () => {
  const rig = createOwnerRig();
  advance(rig);
  for (let frame = 1; frame <= 240; frame++) {
    const pose = advance(rig, {
      x: frame * 0.015,
      z: frame * 0.008,
      heading: frame * 0.02,
      moving: true,
      attack: frame === 110,
    });
    assertRigBones(pose);
  }
  rig.destroy();
});

test('supporting feet stay locked to world contact points as the root travels', () => {
  const rig = createOwnerRig();
  let previous = advance(rig);
  let contactsChecked = 0;
  let swingsObserved = 0;
  for (let frame = 1; frame <= 360; frame++) {
    const pose = advance(rig, { x: frame * 0.012, z: frame * 0.006, moving: true });
    for (const side of ['left', 'right']) {
      const foot = pose.feet[side];
      const before = previous.feet[side];
      assertPoint(foot.world, ['x', 'z']);
      assert.ok(foot.lift >= 0 && Number.isFinite(foot.lift), 'foot lift stays finite and above the floor');
      const ankle = pose.joints[`${side}Ankle`];
      near(ankle.x, (foot.world.x - pose.root.x) * 64, EPSILON,
        `${side} solved ankle matches its world foot x`);
      near(ankle.y, (foot.world.z - pose.root.z) * 64 * 0.78 - foot.lift * 64, EPSILON,
        `${side} solved ankle matches its world foot height`);
      if (foot.contact && before.contact) {
        near(distanceWorld(foot.world, before.world), 0, EPSILON, `${side} stance contact displacement`);
        contactsChecked++;
      }
      if (!foot.contact && foot.lift > 0) swingsObserved++;
    }
    previous = pose;
  }
  assert.ok(contactsChecked > 30, 'test must cover sustained supporting contacts');
  assert.ok(swingsObserved > 10, 'test must cover lifted swing feet');
  rig.destroy();
});

const projectionCases = [
  { name: 'town 2D', worldPixelsPerUnit: 64, displayHeightPx: 76, groundDepthScale: 0.78 },
  { name: 'town 3D', worldPixelsPerUnit: 1, displayHeightPx: 1.6, groundDepthScale: Math.sin(55 * Math.PI / 180) },
  { name: 'palace 2D', worldPixelsPerUnit: 72, displayHeightPx: 86, groundDepthScale: 1 },
  { name: 'palace 3D', worldPixelsPerUnit: 4, displayHeightPx: 2.38, groundDepthScale: Math.sin(55 * Math.PI / 180) },
];

test('support feet remain planted in actual screen space at town and palace display scales', () => {
  for (const projection of projectionCases) {
    const rig = createOwnerRig({ manifest: { contentHeight: 256 } });
    let previous = advance(rig, projection);
    const bodyScale = projection.displayHeightPx / 256;
    const screenFoot = (pose, side) => {
      const ankle = pose.joints[`${side}Ankle`];
      return {
        x: pose.root.x * projection.worldPixelsPerUnit + ankle.x * bodyScale,
        y: pose.root.z * projection.worldPixelsPerUnit * projection.groundDepthScale + ankle.y * bodyScale,
      };
    };
    const step = previous.projection.strideLength / 120;
    let checkedContacts = 0;
    for (let frame = 1; frame <= 480; frame++) {
      const pose = advance(rig, {
        ...projection,
        x: frame * step * 0.4,
        z: frame * step * Math.sqrt(0.84),
        moving: true,
      });
      near(pose.projection.unitsToPixels, projection.worldPixelsPerUnit / bodyScale);
      near(pose.projection.depthScale, projection.groundDepthScale);
      for (const side of ['left', 'right']) {
        const foot = pose.feet[side];
        if (!foot.contact) continue;
        const actual = screenFoot(pose, side);
        near(actual.x, foot.world.x * projection.worldPixelsPerUnit, EPSILON,
          `${projection.name} ${side} planted screen x`);
        near(actual.y, foot.world.z * projection.worldPixelsPerUnit * projection.groundDepthScale, EPSILON,
          `${projection.name} ${side} planted screen y`);
        if (previous.feet[side].contact) {
          near(distance2D(actual, screenFoot(previous, side)), 0, EPSILON,
            `${projection.name} ${side} contact stays still while the body root travels`);
          checkedContacts++;
        }
      }
      previous = pose;
    }
    assert.ok(checkedContacts > 100, `${projection.name} must exercise extended planted contacts`);
    rig.destroy();
  }
});

test('changing display projection without travel preserves gait phase and physical foot anchors', () => {
  const rig = createOwnerRig({ manifest: { contentHeight: 256 } });
  const firstProjection = projectionCases[0];
  let before = advance(rig, firstProjection);
  const step = before.projection.strideLength / 120;
  const frames = 50; // First start-step lands; both feet support at a nonzero phase.
  const x = step * 0.4 * frames;
  const z = step * Math.sqrt(0.84) * frames;
  for (let frame = 1; frame <= frames; frame++) {
    before = advance(rig, {
      ...firstProjection, x: step * 0.4 * frame, z: step * Math.sqrt(0.84) * frame, moving: true,
    });
  }
  assert.ok(Object.values(before.feet).every((foot) => foot.contact));
  for (const projection of [...projectionCases.slice(1), firstProjection]) {
    const after = advance(rig, { ...projection, x, z });
    near(after.gaitPhase, before.gaitPhase, EPSILON, `${projection.name} unchanged gait phase`);
    near(after.distance, before.distance, EPSILON, `${projection.name} unchanged travel distance`);
    for (const side of ['left', 'right']) {
      near(distanceWorld(after.feet[side].world, before.feet[side].world), 0, EPSILON,
        `${projection.name} ${side} unchanged world anchor`);
      near(after.feet[side].lift, before.feet[side].lift, EPSILON,
        `${projection.name} ${side} unchanged lift`);
    }
    near(after.projection.unitsToPixels, projection.worldPixelsPerUnit * 256 / projection.displayHeightPx);
    before = after;
  }
  rig.destroy();
});

test('stopping does not advance travel phase or slide settled feet', () => {
  const rig = createOwnerRig();
  advance(rig);
  for (let frame = 1; frame <= 80; frame++) {
    advance(rig, { x: frame * 0.015, z: frame * 0.008, moving: true });
  }
  const first = advance(rig, { x: 1.2, z: 0.64 });
  let previous = first;
  let stableFrames = 0;
  for (let frame = 0; frame < 120; frame++) {
    const pose = advance(rig, { x: 1.2, z: 0.64 });
    near(pose.distance, first.distance, EPSILON, 'stopped distance');
    near(pose.gaitPhase, first.gaitPhase, EPSILON, 'stopped gait phase');
    if (frame >= 60) {
      for (const side of ['left', 'right']) {
        near(distanceWorld(pose.feet[side].world, previous.feet[side].world), 0, EPSILON,
          `${side} stopped foot displacement`);
      }
      stableFrames++;
    }
    previous = pose;
  }
  assert.equal(stableFrames, 60);
  rig.destroy();
});

test('full heading changes preserve visible layer widths and never instant-flip scale signs', () => {
  const rig = createOwnerRig();
  const previousScales = new Map();
  for (let frame = 0; frame <= 360; frame++) {
    const pose = advance(rig, { heading: frame / 360 * Math.PI * 2 });
    assert.ok(Number.isFinite(pose.heading));
    assert.ok(pose.layers.length > 0, 'pose has renderable parts');
    for (const layer of pose.layers) {
      assertPoint(layer.origin);
      assert.ok(Number.isFinite(layer.rotation), `${layer.part} rotation is finite`);
      for (const property of ['scaleX', 'scaleY']) {
        const scale = layer[property];
        assert.ok(Number.isFinite(scale) && Math.abs(scale) > 0.01,
          `${layer.part} ${property} must not collapse during turning`);
        const key = `${layer.part}:${property}`;
        const before = previousScales.get(key);
        if (before !== undefined) assert.ok(before * scale > 0, `${key} must not instantly flip`);
        previousScales.set(key, scale);
      }
    }
  }
  rig.destroy();
});

test('lantern grip follows the wrist throughout idle, walk, turn and attack', () => {
  const rig = createOwnerRig();
  advance(rig);
  let attackFrames = 0;
  for (let frame = 0; frame < 240; frame++) {
    const pose = advance(rig, {
      x: Math.min(frame, 120) * 0.01,
      z: 0,
      moving: frame < 120,
      heading: frame * 0.015,
      attack: frame === 100,
    });
    assertPoint(pose.lantern.grip);
    near(distance2D(pose.lantern.grip, pose.joints.rightWrist), 0, EPSILON, 'lantern grip attachment');
    assert.ok(Number.isFinite(pose.lantern.rotation));
    if (pose.action.kind === 'attack') attackFrames++;
  }
  assert.ok(attackFrames > 5, 'attachment test must exercise the attack motion');
  rig.destroy();
});

test('active attacks cannot restart and destroyed rigs cannot accept attacks', () => {
  const rig = createOwnerRig();
  advance(rig);
  assert.equal(rig.requestAttack(), true);
  assert.equal(rig.requestAttack(), false);
  const pose = advance(rig);
  assert.equal(pose.action.kind, 'attack');
  rig.destroy();
  assert.equal(rig.requestAttack(), false);
});

test('seeking attack ages is deterministic even when requested out of chronological order', () => {
  const rig = createOwnerRig();
  const options = { position: { x: 2.1, z: -0.8 }, heading: 1.4 };
  const ages = [0, 0.1, 0.45, 0.6, 0.85, 1.12, 1.34, 1.62, OWNER_ATTACK_DURATION, OWNER_ATTACK_DURATION + 0.5];
  const comparable = (pose) => ({
    root: pose.root, heading: pose.heading, time: pose.time, action: pose.action,
    joints: pose.joints, joints3D: pose.joints3D, feet: pose.feet, layers: pose.layers,
    lantern: pose.lantern, distance: pose.distance, gaitPhase: pose.gaitPhase,
  });
  const expected = new Map(ages.map((age) => [age, comparable(rig.seekAction(age, options))]));
  assert.ok(Number.isFinite(OWNER_ATTACK_DURATION) && OWNER_ATTACK_DURATION > 0);
  for (const index of [7, 1, 9, 3, 0, 6, 2, 8, 4, 5, 1, 7]) {
    const age = ages[index];
    const pose = rig.seekAction(age, options);
    assert.deepEqual(comparable(pose), expected.get(age), `seek to age ${age} must be order-independent`);
    assert.equal(pose.action.kind, age < OWNER_ATTACK_DURATION ? 'attack' : 'locomotion');
    assertRigBones(pose);
  }
  rig.destroy();
});

test('at least one foot supports the actor through walking, stopping, standing turns and resuming', () => {
  const rig = createOwnerRig();
  let x = 0;
  let z = 0;
  let heading = 0;
  const observedModes = new Set();
  let checkedFrames = 0;
  const check = (pose) => {
    const feet = Object.values(pose.feet);
    for (const foot of feet) observedModes.add(foot.mode);
    assert.ok(feet.some((foot) => foot.contact),
      `actor needs support at frame ${checkedFrames}; modes: ${feet.map((foot) => foot.mode).join(', ')}`);
    for (const foot of feet.filter((foot) => foot.contact)) near(foot.lift, 0, EPSILON, 'supporting foot lift');
    assertRigBones(pose);
    checkedFrames++;
  };
  check(advance(rig));
  for (let cycle = 0; cycle < 8; cycle++) {
    for (let frame = 0; frame < 25 + cycle * 7; frame++) {
      x += Math.sin(heading) * 0.012;
      z += Math.cos(heading) * 0.012;
      check(advance(rig, { x, z, heading, moving: true }));
    }
    // Stop at varying gait phases, then request a substantial standing turn.
    for (let frame = 0; frame < 9; frame++) check(advance(rig, { x, z, heading }));
    heading += Math.PI * 0.7;
    for (let frame = 0; frame < 75; frame++) check(advance(rig, { x, z, heading }));
    // Resume before every turn can fully return both feet to their ideal lanes.
    for (let frame = 0; frame < 15; frame++) {
      x += Math.sin(heading) * 0.012;
      z += Math.cos(heading) * 0.012;
      check(advance(rig, { x, z, heading, moving: true }));
    }
  }
  assert.ok(checkedFrames > 1000);
  for (const mode of ['stance', 'swing', 'turn', 'settle']) {
    assert.ok(observedModes.has(mode), `test must exercise ${mode} feet`);
  }
  rig.destroy();
});

test('an attack interrupting a standing turn settles the lifted foot instead of stranding it', () => {
  const rig = createOwnerRig();
  advance(rig);
  let pose;
  let liftedSide;
  for (let frame = 0; frame < 120; frame++) {
    pose = advance(rig, { heading: Math.PI / 2 });
    liftedSide = ['left', 'right'].find((side) => pose.feet[side].mode === 'turn');
    if (liftedSide) break;
  }
  assert.ok(liftedSide, 'regression must begin with an active standing foot turn');
  assert.equal(pose.feet[liftedSide].contact, false);
  assert.equal(rig.requestAttack(), true);
  let sawSettlement = false;
  let attackFrames = 0;
  for (let frame = 0; frame < Math.ceil(OWNER_ATTACK_DURATION * 60) + 120; frame++) {
    pose = advance(rig, { heading: Math.PI / 2 });
    assert.ok(Object.values(pose.feet).some((foot) => foot.contact),
      'attack interruption must retain at least one supporting foot');
    if (pose.feet[liftedSide].mode === 'settle') sawSettlement = true;
    if (pose.action.kind === 'attack') attackFrames++;
  }
  assert.ok(sawSettlement, 'the interrupted turn must transition into a settling step');
  assert.ok(attackFrames > 30, 'test must run the attack through its recovery');
  assert.equal(pose.action.kind, 'locomotion');
  for (const foot of Object.values(pose.feet)) {
    assert.equal(foot.contact, true, 'both feet must return to support after recovery');
    near(foot.lift, 0);
  }
  rig.destroy();
});

function composerFixture(maxFrames = 2) {
  const canvases = [];
  let renders = 0;
  const composer = createFrameComposer({
    maxFrames,
    makeCanvas(width, height) {
      const canvas = { width, height, id: canvases.length + 1, getContext: () => ({}) };
      canvases.push(canvas);
      return canvas;
    },
    renderFrame() { renders++; },
  });
  return { composer, canvases, renders: () => renders };
}

test('frame cache reuses frames and evicts the least recently used entry', () => {
  const { composer, renders } = composerFixture();
  const dimensions = { width: 64, height: 96 };
  const a = composer.get('a', dimensions);
  const b = composer.get('b', dimensions);
  assert.equal(composer.get('a', dimensions), a);
  const c = composer.get('c', dimensions);
  assert.notEqual(c, a);
  assert.equal(b.width, 0, 'eviction releases the old canvas backing store');
  assert.equal(b.height, 0, 'eviction releases the old canvas backing store');
  assert.equal(composer.get('a', dimensions), a, 'a was touched and must remain cached');
  assert.notEqual(composer.get('b', dimensions), b, 'b must have been evicted');
  assert.equal(renders(), 4, 'cache hits must not rerender');
  composer.destroy();
});

test('frame cache dimensions are part of frame identity', () => {
  const { composer, renders } = composerFixture(4);
  const small = composer.get('idle', { width: 32, height: 48 });
  const large = composer.get('idle', { width: 64, height: 96 });
  assert.notEqual(small, large, 'resized frame needs another backing canvas');
  assert.equal(composer.get('idle', { width: 32, height: 48 }), small);
  assert.equal(renders(), 2);
  composer.destroy();
});

test('clearing releases cached frames and destroying prevents later allocation', () => {
  const { composer, canvases, renders } = composerFixture();
  const dimensions = { width: 64, height: 96 };
  const before = composer.get('idle', dimensions);
  composer.clear();
  assert.equal(before.width, 0, 'clear releases old canvas width');
  assert.equal(before.height, 0, 'clear releases old canvas height');
  const after = composer.get('idle', dimensions);
  assert.notEqual(after, before, 'clear must invalidate previous frames');
  assert.equal(renders(), 2);
  composer.destroy();
  composer.destroy();
  assert.equal(after.width, 0, 'destroy releases the remaining canvas width');
  assert.equal(after.height, 0, 'destroy releases the remaining canvas height');
  const allocations = canvases.length;
  try { composer.get('walk', dimensions); } catch { /* A disposed composer may reject access. */ }
  assert.equal(canvases.length, allocations, 'destroyed cache cannot allocate a new frame');
  assert.equal(renders(), 2, 'destroyed cache cannot render a new frame');
});

test('a failed frame render releases its canvas and does not poison later cache requests', () => {
  const canvases = [];
  let fail = true;
  let renders = 0;
  const composer = createFrameComposer({
    makeCanvas(width, height) {
      const canvas = { width, height };
      canvases.push(canvas);
      return canvas;
    },
    renderFrame() {
      renders++;
      if (fail) throw new Error('synthetic render failure');
    },
  });
  assert.throws(() => composer.get('idle'), /synthetic render failure/);
  assert.equal(canvases[0].width, 0);
  assert.equal(canvases[0].height, 0);
  assert.equal(composer.status().frames, 0);
  fail = false;
  const recovered = composer.get('idle');
  assert.equal(composer.get('idle'), recovered);
  assert.equal(renders, 2);
  composer.destroy();
});

test('live composition reuses one canvas, skips unchanged poses and releases it on destroy', () => {
  let allocations = 0;
  let clears = 0;
  const context = {
    globalAlpha: 1,
    clearRect() { clears++; },
    save() {}, restore() {}, translate() {}, scale() {}, rotate() {}, drawImage() {},
  };
  const composer = createLiveComposer({
    makeCanvas(width, height) {
      allocations++;
      return { width, height, getContext: () => context };
    },
    atlas: {},
    manifest: { parts: {} },
    width: 128,
    height: 192,
  });
  const rig = createOwnerRig();
  const firstPose = advance(rig);
  assert.equal(composer.render(firstPose), true);
  assert.equal(composer.render(firstPose), false, 'same pose version must not redraw');
  const canvas = composer.sprite().image;
  for (let frame = 1; frame <= 120; frame++) {
    const pose = advance(rig, { x: frame * 0.01, moving: true });
    assert.equal(composer.render(pose), true);
    assert.equal(composer.sprite().image, canvas, 'live frames keep the same canvas identity');
  }
  assert.equal(allocations, 1, 'live motion must not allocate one canvas per animation frame');
  assert.equal(clears, 121);
  assert.equal(composer.status().canvases, 1);
  composer.destroy();
  composer.destroy();
  assert.equal(canvas.width, 0);
  assert.equal(canvas.height, 0);
  assert.equal(composer.status().canvases, 0);
  assert.throws(() => composer.render(firstPose), /disposed/);
  assert.equal(allocations, 1);
  rig.destroy();
});

test('camera-ground rotation keeps rendered stance anchors aligned with rotated world feet',()=>{
 const rig=createOwnerRig(),worldPixelsPerUnit=64,displayHeightPx=76,groundDepthScale=.78,groundYaw=.7,scale=displayHeightPx/256;
 for(let frame=0;frame<300;frame++){
  const pose=rig.update({position:{x:frame*.004,z:frame*.003},dt:1/60,heading:Math.atan2(.004,.003),moving:true,worldPixelsPerUnit,displayHeightPx,groundDepthScale,groundYaw});
  const ground=p=>({x:(p.x*Math.cos(groundYaw)-p.z*Math.sin(groundYaw))*worldPixelsPerUnit,y:(p.x*Math.sin(groundYaw)+p.z*Math.cos(groundYaw))*worldPixelsPerUnit*groundDepthScale}),root=ground(pose.root);
  for(const side of['left','right']){const foot=pose.feet[side],expected=ground(foot.world),ankle=pose.joints[side+'Ankle'];near(root.x+ankle.x*scale,expected.x);near(root.y+ankle.y*scale,expected.y-foot.lift*worldPixelsPerUnit);}
 }
});

test('authored profiles change bone spacing and hand sides without scaling or mirroring any painted layer',()=>{
 const manifest={anatomicalSides:{left:1,right:-1},views:{down:{heading:0,parts:{}},right:{heading:Math.PI/2,parts:{},rig:{shoulderHalfWidth:4,hipHalfWidth:4},screenSides:{left:-1,right:1},legSides:{left:-1,right:1}}}},rig=createOwnerRig({manifest});
 const pose=rig.reset({x:0,z:0},Math.PI/2);assert.equal(pose.view,'right');near(pose.joints.rightShoulder.x-pose.joints.leftShoulder.x,8);assert.ok(pose.joints.rightWrist.x>pose.joints.pelvis.x);assert.ok(pose.layers.every(layer=>layer.scaleX===1&&layer.scaleY===1));
 assert.equal(selectOwnerView({views:{'down-threequarter':{parts:{}}}},0).fallback,false);
});

test('separately authored appendages rotate at their own anchors and hidden view parts never draw',()=>{
 const rect=[0,0,32,64],pivot=[16,0],manifest={parts:{leftTwinTail:{rect,pivot},rightTwinTail:{rect,pivot,visible:false}},appendages:[{part:'leftTwinTail',anchor:'neck',offset:[-20,-30],height:100,amplitude:.2,frequency:3,layer:'backHair'},{part:'rightTwinTail',anchor:'neck',offset:[20,-30],height:100,amplitude:.2,frequency:3,layer:'backHair'}]},rig=createOwnerRig({manifest});
 const first=rig.reset(),last=rig.update({position:{x:0,z:0},dt:.1}),tail=pose=>pose.layers.find(layer=>layer.part==='leftTwinTail');near(tail(first).origin.x,first.joints.neck.x-20);near(tail(first).origin.y,first.joints.neck.y-30);assert.notEqual(tail(first).rotation,tail(last).rotation);
 assert.deepEqual(first.layers.find(layer=>layer.part==='bodiceTorso'),last.layers.find(layer=>layer.part==='bodiceTorso'));
 let draws=0;const context={globalAlpha:1,save(){},restore(){},translate(){},rotate(){},scale(){},drawImage(){draws++;}};assert.equal(drawOwnerPose(context,{width:32,height:64},manifest,last),true);assert.equal(draws,1);
});

test('non-lantern hands may rest beside the hips with separately authored profile targets',()=>{
 const manifest={restHands:{left:[20,-9],right:[-20,-9]},views:{down:{heading:0,parts:{}},right:{heading:Math.PI/2,parts:{},restHands:{left:[8,-10],right:[-8,-10]}}}},rig=createOwnerRig({manifest});
 let pose=rig.reset();near(pose.joints.leftWrist.x-pose.joints.pelvis.x,20);near(pose.joints.leftWrist.y-pose.joints.pelvis.y,-9);near(pose.joints.rightWrist.x-pose.joints.pelvis.x,-20);near(pose.joints.rightWrist.y-pose.joints.pelvis.y,-9);
 pose=rig.reset({x:0,z:0},Math.PI/2);near(pose.joints.leftWrist.x-pose.joints.pelvis.x,8);near(pose.joints.rightWrist.x-pose.joints.pelvis.x,-8);assertRigBones(pose);
});

test('actual game travel speed produces the same footfalls at 30, 60 and 120 Hz after fitting world projection',()=>{
 const results=[30,60,120].map(hz=>{const rig=createOwnerRig(),projection={worldPixelsPerUnit:64,displayHeightPx:76,groundDepthScale:.78};rig.update({position:{x:0,z:0},heading:Math.PI/2,dt:0,...projection});let pose;for(let frame=1;frame<=hz*3;frame++){pose=rig.update({position:{x:frame/hz*3.05,z:0},heading:Math.PI/2,dt:1/hz,moving:true,...projection});assert.ok(pose.feet.left.contact||pose.feet.right.contact);}return pose;});
 for(const pose of results){near(pose.distance,results[0].distance);near(pose.gaitPhase,results[0].gaitPhase);for(const side of['left','right']){near(pose.feet[side].world.x,results[0].feet[side].world.x);near(pose.feet[side].world.z,results[0].feet[side].world.z);near(pose.feet[side].lift,results[0].feet[side].lift);assert.equal(pose.feet[side].contact,results[0].feet[side].contact);}}
});

const actualRigFixture=id=>JSON.parse(readFileSync(new URL('./rig-fixtures/'+id+'.json',import.meta.url),'utf8'));
test('actual three-CNA anatomy stays on the floor through start, stop, turn, resume and attack at both game sizes',()=>{
 for(const id of['cna-black-bob','cna-orange-glasses','cna-star-twintails'])for(const displayHeightPx of[76,86]){
  const rig=createOwnerRig({manifest:actualRigFixture(id)});let position={x:0,z:0};rig.reset(position,0);
  for(let frame=0;frame<=345;frame++){const time=frame/30,dt=frame?1/30:0;let heading=0,moving=false;
   if(time>=.6&&time<3.6){position={...position,z:position.z+1.2*dt};moving=true;}else if(time>=4.3&&time<5.4)heading=Math.PI/2;else if(time>=5.4&&time<6.2){position={...position,x:position.x+1.2*dt};heading=Math.PI/2;moving=true;}
   const pose=rig.update({position,heading,moving,dt,attack:time>=6.8&&time-dt<6.8,worldPixelsPerUnit:64,displayHeightPx,groundDepthScale:.78});
   assert.ok(pose.feet.left.contact||pose.feet.right.contact,`${id} lost support at ${time}`);assert.ok(pose.diagnostics.leftFootReach<1e-6&&pose.diagnostics.rightFootReach<1e-6,`${id} lost actual floor contact at ${time}`);if(frame===0)assert.ok(Object.values(pose.feet).every(foot=>foot.mode==='stance'),'projection-fitted reset must not invent a standing turn');
  }
 }
});

test('actual eight-view owner geometry keeps wrist and held lantern continuous over a full turn at 60 Hz',()=>{
 const manifest=actualRigFixture('owner-eight'),rig=createOwnerRig({manifest});let previous=null,maxJump=0;
 for(let frame=0;frame<=720;frame++){const pose=rig.update({position:{x:0,z:0},heading:frame/720*Math.PI*2,dt:1/60,worldPixelsPerUnit:64,displayHeightPx:86,groundDepthScale:.78});
  if(previous){maxJump=Math.max(maxJump,distance2D(previous.joints.leftWrist,pose.joints.leftWrist),distance2D(previous.joints.rightWrist,pose.joints.rightWrist),distance2D(previous.lantern.grip,pose.lantern.grip));}assert.ok(pose.layers.every(layer=>layer.scaleX>0&&layer.scaleY>0));near(distance2D(pose.lantern.grip,pose.joints.rightWrist),0);previous=pose;
 }assert.ok(maxJump<5,`authored view boundary moved a hand ${maxJump} rig pixels in one frame`);
});

test('phase-locked idle hand gestures preserve two-hand props and freeze when motion is reduced',()=>{
 const hands={amplitude:[1,2],frequency:1.5,phase:.2},manifest={restHands:{left:[20,-10],right:[-20,-10]},idleHands:{left:hands,right:hands}},rig=createOwnerRig({manifest});let pose=rig.reset(),before;
 for(let frame=0;frame<120;frame++){pose=rig.update({position:{x:0,z:0},dt:1/60});near(pose.joints.leftWrist.x-pose.joints.rightWrist.x,40);near(pose.joints.leftWrist.y-pose.joints.rightWrist.y,0);}
 before=pose;for(let frame=0;frame<30;frame++)pose=rig.update({position:{x:0,z:0},dt:1/60,motion:false});near(distance2D(before.joints.leftWrist,pose.joints.leftWrist),0);near(distance2D(before.joints.rightWrist,pose.joints.rightWrist),0);
});

test('a painted appendage tip remains attached to its rotating parent segment throughout idle motion',()=>{
 const manifest={appendages:[{part:'tailBase',anchor:'pelvis',offset:[20,-8],height:50,rotation:-1.2,amplitude:.08,frequency:1.5,joint:'devilTailTip'},{part:'tailTip',anchor:'devilTailTip',offset:[0,0],height:34,rotation:.2,amplitude:.04,frequency:1.5}]},rig=createOwnerRig({manifest});
 for(let frame=0;frame<180;frame++){
  const pose=rig.update({position:{x:0,z:0},dt:1/60}),base=pose.layers.find(layer=>layer.part==='tailBase'),tip=pose.layers.find(layer=>layer.part==='tailTip'),endpoint={x:base.origin.x-Math.sin(base.rotation)*base.height,y:base.origin.y+Math.cos(base.rotation)*base.height};near(distance2D(endpoint,tip.origin),0);near(distance2D(base.origin,tip.origin),50);near(distance2D(pose.joints.devilTailTip,tip.origin),0);
 }
});
