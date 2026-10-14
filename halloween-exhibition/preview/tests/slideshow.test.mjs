import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSlideshowController,
  SLIDESHOW_STORAGE_KEY,
  SLIDESHOW_INTERVALS_SECONDS,
  DEFAULT_SLIDESHOW_INTERVAL_SECONDS,
} from '../slideshow.js';

const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

class FakeTimers {
  now = 0;
  next = 0;
  jobs = new Map();
  historical = new Map();
  maxPending = 0;
  setTimeout(callback, delay) {
    const id = this.next++;
    const job = { callback, due: this.now + delay };
    this.jobs.set(id, job);
    this.historical.set(id, job);
    this.maxPending = Math.max(this.maxPending, this.jobs.size);
    return id;
  }
  clearTimeout(id) { this.jobs.delete(id); }
  async tick(milliseconds) {
    const end = this.now + milliseconds;
    while (true) {
      const next = [...this.jobs].filter(([, job]) => job.due <= end).sort((a, b) => a[1].due - b[1].due || a[0] - b[0])[0];
      if (!next) break;
      this.now = next[1].due;
      this.jobs.delete(next[0]);
      next[1].callback();
      await flush();
    }
    this.now = end;
    await flush();
  }
  fireCancelled(id) { this.historical.get(id).callback(); }
}

function memoryStorage(initial = null) {
  const entries = new Map(initial === null ? [] : [[SLIDESHOW_STORAGE_KEY, initial]]);
  return {
    entries, reads: [], writes: [],
    getItem(key) { this.reads.push(key); return entries.get(key) ?? null; },
    setItem(key, value) { this.writes.push([key, value]); entries.set(key, value); },
  };
}

function setup(options = {}) {
  const timers = new FakeTimers();
  const storage = memoryStorage();
  const advances = [], states = [];
  const controller = createSlideshowController({
    timers, storage,
    onAdvance: context => advances.push({ at: timers.now, context }),
    onState: state => states.push(state),
    ...options,
  });
  return { controller, timers, storage, advances, states };
}

test('starts OFF at 10 seconds without a timer, advance, or storage write', async () => {
  const { controller, timers, advances, states, storage } = setup();
  assert.deepEqual(SLIDESHOW_INTERVALS_SECONDS, [5, 10, 20]);
  assert.equal(DEFAULT_SLIDESHOW_INTERVAL_SECONDS, 10);
  assert.deepEqual(controller.getState(), {
    enabled: false, intervalSeconds: 10, blocked: false, blockers: [],
    scheduled: false, advancing: false, disposed: false, error: null,
  });
  assert.equal(states.length, 1);
  assert.equal(storage.writes.length, 0);
  await timers.tick(60_000);
  assert.equal(advances.length, 0);
  assert.equal(timers.jobs.size, 0);
});

test('first enabled advance and each subsequent advance wait a full interval', async () => {
  const { controller, timers, advances } = setup();
  controller.setEnabled(true);
  assert.equal(timers.jobs.size, 1);
  await timers.tick(9_999);
  assert.equal(advances.length, 0);
  await timers.tick(1);
  assert.deepEqual(advances.map(a => a.at), [10_000]);
  await timers.tick(20_000);
  assert.deepEqual(advances.map(a => a.at), [10_000, 20_000, 30_000]);
  assert.equal(timers.maxPending, 1);
});

test('OFF cancels a timer including handle zero and prevents a queued callback', async () => {
  const { controller, timers, advances } = setup();
  controller.setEnabled(true);
  controller.setEnabled(false);
  assert.equal(timers.jobs.size, 0);
  timers.fireCancelled(0);
  await timers.tick(60_000);
  assert.equal(advances.length, 0);
  assert.equal(controller.getState().enabled, false);
});

test('speed is saved only under the preview-specific key and ON is never saved', () => {
  const { controller, storage } = setup();
  controller.setIntervalSeconds(20);
  controller.setEnabled(true);
  assert.equal(SLIDESHOW_STORAGE_KEY, 'halloween-exhibition:preview:slideshow:v1');
  assert.deepEqual(storage.reads, [SLIDESHOW_STORAGE_KEY]);
  assert.deepEqual(storage.writes, [[SLIDESHOW_STORAGE_KEY, '{"intervalSeconds":20}']]);
});

test('reload remembers speed but always starts OFF despite a saved enabled preference', async () => {
  const storage = memoryStorage('{"intervalSeconds":5,"enabled":true,"playing":true}');
  const first = setup({ storage });
  assert.equal(first.controller.getState().enabled, false);
  first.controller.setEnabled(true);
  first.controller.setIntervalSeconds(20);
  first.controller.dispose();
  const reload = setup({ storage });
  assert.equal(reload.controller.getState().intervalSeconds, 20);
  assert.equal(reload.controller.getState().enabled, false);
  await reload.timers.tick(100_000);
  assert.equal(reload.advances.length, 0);
});

test('malformed or unapproved saved speeds fall back to 10 seconds', () => {
  for (const value of ['{broken', 'null', 'false', '[]', '20', '"5"', '{}', '{"intervalSeconds":"5"}', '{"intervalSeconds":0}', '{"intervalSeconds":15}']) {
    const { controller } = setup({ storage: memoryStorage(value) });
    assert.equal(controller.getState().intervalSeconds, 10, value);
    assert.equal(controller.getState().enabled, false, value);
  }
  for (const intervalSeconds of [5, 10, 20]) {
    assert.equal(setup({ storage: memoryStorage(JSON.stringify({ intervalSeconds })) }).controller.getState().intervalSeconds, intervalSeconds);
  }
});

test('missing and denied storage still allow session changes and scheduling', async () => {
  for (const storage of [null, {}, { getItem() { throw Error('denied'); }, setItem() { throw Error('quota'); } }]) {
    const { controller, timers, advances } = setup({ storage });
    assert.equal(controller.setIntervalSeconds(5), true);
    controller.setEnabled(true);
    await timers.tick(5_000);
    assert.equal(advances.length, 1);
    controller.dispose();
  }
});

test('only numeric 5, 10, and 20 second selections are accepted', async () => {
  const { controller, timers, storage, advances } = setup();
  controller.setEnabled(true);
  await timers.tick(7_000);
  for (const invalid of [undefined, null, false, true, '5', '10', 0, -5, 15, 10.1, NaN, Infinity, {}, []]) {
    assert.equal(controller.setIntervalSeconds(invalid), false);
    assert.equal(controller.getState().intervalSeconds, 10);
  }
  assert.equal(storage.writes.length, 0);
  await timers.tick(3_000);
  assert.equal(advances.length, 1);
});

test('changing interval resets the full new interval; repeated same selection is idempotent', async () => {
  const { controller, timers, advances } = setup();
  controller.setEnabled(true);
  await timers.tick(9_000);
  controller.setIntervalSeconds(5);
  await timers.tick(4_000);
  controller.setIntervalSeconds(5);
  await timers.tick(999);
  assert.equal(advances.length, 0);
  await timers.tick(1);
  assert.deepEqual(advances.map(a => a.at), [14_000]);
  controller.setIntervalSeconds(20);
  await timers.tick(19_999);
  assert.equal(advances.length, 1);
  await timers.tick(1);
  assert.equal(advances.length, 2);
});

test('each external blocker pauses ticking and unblocking waits a full interval', async () => {
  for (const reason of ['modal', 'hidden', 'reduced-motion', 'ambience-paused', 'data-unavailable', 'roulette']) {
    const { controller, timers, advances } = setup();
    controller.setEnabled(true);
    await timers.tick(9_000);
    controller.setBlocked(reason, true);
    assert.equal(controller.getState().enabled, true, reason);
    assert.equal(controller.getState().blocked, true, reason);
    assert.deepEqual(controller.getState().blockers, [reason]);
    await timers.tick(30_000);
    assert.equal(advances.length, 0, reason);
    controller.setBlocked(reason, false);
    await timers.tick(9_999);
    assert.equal(advances.length, 0, reason);
    await timers.tick(1);
    assert.equal(advances.length, 1, reason);
    controller.dispose();
  }
});

test('all simultaneous blockers must clear, even after enabling while blocked', async () => {
  const { controller, timers, advances } = setup();
  controller.setBlocked('modal', true);
  controller.setBlocked('hidden', true);
  controller.setEnabled(true);
  controller.setBlocked('modal', false);
  await timers.tick(20_000);
  assert.equal(advances.length, 0);
  assert.equal(timers.jobs.size, 0);
  controller.setBlocked('hidden', false);
  await timers.tick(10_000);
  assert.equal(advances.length, 1);
});

test('repeated blocker updates are idempotent and invalid inputs cannot create blockers', async () => {
  const { controller, timers, advances } = setup();
  controller.setEnabled(true);
  await timers.tick(8_000);
  assert.equal(controller.setBlocked('hidden', false), true);
  for (const [reason, blocked] of [['', true], ['   ', true], [null, true], ['hidden', 'true']]) {
    assert.equal(controller.setBlocked(reason, blocked), false);
  }
  await timers.tick(2_000);
  assert.equal(advances.length, 1);
  controller.setBlocked('modal', true);
  controller.setBlocked('modal', true);
  assert.deepEqual(controller.getState().blockers, ['modal']);
  controller.setBlocked('modal', false);
  assert.equal(timers.jobs.size, 1);
});

test('manual navigation restarts a complete interval and cancelled queued ticks cannot race', async () => {
  const { controller, timers, advances } = setup();
  controller.setEnabled(true);
  await timers.tick(9_000);
  controller.manualNavigation();
  timers.fireCancelled(0);
  await timers.tick(9_999);
  assert.equal(advances.length, 0);
  await timers.tick(1);
  assert.deepEqual(advances.map(a => a.at), [19_000]);
  assert.equal(timers.maxPending, 1);
});

test('manual navigation while OFF or blocked never enables or schedules the slideshow', async () => {
  const { controller, timers, advances } = setup();
  controller.manualNavigation();
  assert.equal(controller.getState().enabled, false);
  assert.equal(timers.jobs.size, 0);
  controller.setBlocked('roulette', true);
  controller.setEnabled(true);
  controller.manualNavigation();
  await timers.tick(60_000);
  assert.equal(advances.length, 0);
  assert.equal(timers.jobs.size, 0);
});

test('awaits async advance before scheduling, without concurrent advances or catch-up bursts', async () => {
  const pending = deferred();
  let count = 0;
  const { controller, timers } = setup({ onAdvance() { count++; return pending.promise; } });
  controller.setEnabled(true);
  await timers.tick(10_000);
  assert.equal(controller.getState().advancing, true);
  assert.equal(controller.getState().scheduled, false);
  await timers.tick(100_000);
  assert.equal(count, 1);
  assert.equal(timers.jobs.size, 0);
  pending.resolve();
  await flush();
  assert.equal(controller.getState().advancing, false);
  assert.equal(timers.jobs.size, 1);
  await timers.tick(9_999);
  assert.equal(count, 1);
  await timers.tick(1);
  assert.equal(count, 2);
});

test('manual navigation during async advance wins and stale completion cannot commit', async () => {
  const pending = deferred();
  let context, calls = 0, automaticCommits = 0;
  const { controller, timers } = setup({ async onAdvance(current) {
    context = current;
    calls++;
    await pending.promise;
    if (current.isCurrent()) automaticCommits++;
  } });
  controller.setEnabled(true);
  await timers.tick(10_000);
  assert.equal(context.isCurrent(), true);
  controller.manualNavigation();
  assert.equal(context.signal.aborted, true);
  assert.equal(context.isCurrent(), false);
  assert.equal(controller.getState().advancing, false);
  await timers.tick(40_000);
  assert.equal(calls, 1);
  pending.resolve();
  await flush();
  assert.equal(automaticCommits, 0);
  await timers.tick(9_999);
  assert.equal(calls, 1);
  await timers.tick(1);
  assert.equal(calls, 2);
  assert.equal(automaticCommits, 1);
});

test('OFF during async advance cannot be undone by stale completion or failure', async () => {
  for (const reject of [false, true]) {
    const pending = deferred();
    let context;
    const { controller, timers } = setup({ onAdvance(current) { context = current; return pending.promise; } });
    controller.setEnabled(true);
    await timers.tick(10_000);
    controller.setEnabled(false);
    if (reject) pending.reject(Error('old failure'));
    else pending.resolve();
    await flush();
    assert.equal(context.signal.aborted, true);
    assert.equal(controller.getState().enabled, false);
    assert.equal(controller.getState().error, null);
    assert.equal(timers.jobs.size, 0);
  }
});

test('rapid OFF/ON during pending async work keeps a single lock and respects current choice', async () => {
  const pending = deferred();
  let calls = 0;
  const { controller, timers } = setup({ onAdvance() { calls++; return pending.promise; } });
  controller.setEnabled(true);
  await timers.tick(10_000);
  for (let i = 0; i < 30; i++) { controller.setEnabled(false); controller.setEnabled(true); }
  await timers.tick(60_000);
  assert.equal(calls, 1);
  assert.equal(timers.jobs.size, 0);
  pending.resolve();
  await flush();
  assert.equal(timers.jobs.size, 1);
  await timers.tick(10_000);
  assert.equal(calls, 2);
  assert.equal(timers.maxPending, 1);
});

test('block and unblock during async advance cancel it and wait after its settlement', async () => {
  const pending = deferred();
  let context, count = 0;
  const { controller, timers } = setup({ onAdvance(current) { context = current; count++; return pending.promise; } });
  controller.setEnabled(true);
  await timers.tick(10_000);
  controller.setBlocked('modal', true);
  controller.setBlocked('modal', false);
  assert.equal(context.isCurrent(), false);
  await timers.tick(30_000);
  assert.equal(count, 1);
  pending.resolve();
  await flush();
  await timers.tick(9_999);
  assert.equal(count, 1);
  await timers.tick(1);
  assert.equal(count, 2);
});

test('changing speed during async work invalidates it and uses the new full interval', async () => {
  const pending = deferred();
  let context, count = 0;
  const { controller, timers } = setup({ onAdvance(current) { context = current; count++; return pending.promise; } });
  controller.setEnabled(true);
  await timers.tick(10_000);
  controller.setIntervalSeconds(20);
  assert.equal(context.signal.aborted, true);
  pending.resolve();
  await flush();
  await timers.tick(19_999);
  assert.equal(count, 1);
  await timers.tick(1);
  assert.equal(count, 2);
});

test('repeated ON is idempotent and rapid toggles never leave duplicate timers', async () => {
  const { controller, timers, advances } = setup();
  controller.setEnabled(true);
  await timers.tick(9_000);
  for (let i = 0; i < 30; i++) controller.setEnabled(true);
  await timers.tick(1_000);
  assert.equal(advances.length, 1);
  for (let i = 0; i < 30; i++) { controller.setEnabled(false); controller.setEnabled(true); }
  assert.equal(timers.jobs.size, 1);
  assert.equal(timers.maxPending, 1);
  await timers.tick(10_000);
  assert.equal(advances.length, 2);
  assert.equal(controller.setEnabled('false'), false);
  assert.equal(controller.getState().enabled, true);
});

test('synchronous and asynchronous callback failures stop safely until explicitly re-enabled', async () => {
  for (const fail of [() => { throw Error('advance failed'); }, () => Promise.reject(Error('advance failed'))]) {
    const { controller, timers } = setup({ onAdvance: fail });
    controller.setEnabled(true);
    await timers.tick(10_000);
    assert.equal(controller.getState().enabled, false);
    assert.equal(controller.getState().error, 'advance failed');
    assert.equal(timers.jobs.size, 0);
    controller.setEnabled(true);
    assert.equal(controller.getState().error, null);
    assert.equal(timers.jobs.size, 1);
    controller.dispose();
  }
});

test('a completed callback context cannot be used for a later detached UI commit', async () => {
  let context;
  const { controller, timers } = setup({ onAdvance(current) { context = current; assert.equal(current.isCurrent(), true); } });
  controller.setEnabled(true);
  await timers.tick(10_000);
  assert.equal(context.isCurrent(), false);
});

test('state snapshots are independent and failed state rendering does not strand scheduling', async () => {
  const { controller, timers, advances } = setup({ onState() { throw Error('render failed'); } });
  controller.setBlocked('modal', true);
  controller.getState().blockers.length = 0;
  assert.deepEqual(controller.getState().blockers, ['modal']);
  controller.setBlocked('modal', false);
  controller.setEnabled(true);
  await timers.tick(20_000);
  assert.equal(advances.length, 2);
});

test('a state callback may turn OFF at the firing boundary before any advance occurs', async () => {
  let controller;
  const setupResult = setup({ onState(state) { if (state.advancing) controller.setEnabled(false); } });
  controller = setupResult.controller;
  controller.setEnabled(true);
  await setupResult.timers.tick(10_000);
  assert.equal(setupResult.advances.length, 0);
  assert.equal(controller.getState().enabled, false);
  assert.equal(setupResult.timers.jobs.size, 0);
});

test('dispose cancels timing, ignores further mutation, and is idempotent', async () => {
  const { controller, timers, advances, states, storage } = setup();
  controller.setEnabled(true);
  controller.dispose();
  const count = states.length;
  controller.dispose();
  assert.equal(controller.setEnabled(true), false);
  assert.equal(controller.setIntervalSeconds(5), false);
  assert.equal(controller.setBlocked('hidden', true), false);
  assert.equal(controller.manualNavigation(), false);
  timers.fireCancelled(0);
  await timers.tick(60_000);
  assert.equal(advances.length, 0);
  assert.equal(states.length, count);
  assert.equal(storage.writes.length, 0);
  assert.equal(controller.getState().disposed, true);
  assert.equal(controller.getState().enabled, false);
  assert.equal(timers.jobs.size, 0);
});

test('dispose during async advance aborts it and settlement sends no late state notification', async () => {
  const pending = deferred();
  let context;
  const { controller, timers, states } = setup({ onAdvance(current) { context = current; return pending.promise; } });
  controller.setEnabled(true);
  await timers.tick(10_000);
  controller.dispose();
  const count = states.length;
  assert.equal(context.signal.aborted, true);
  assert.equal(context.isCurrent(), false);
  pending.resolve();
  await flush();
  assert.equal(states.length, count);
  assert.equal(timers.jobs.size, 0);
  assert.equal(controller.getState().advancing, false);
});
