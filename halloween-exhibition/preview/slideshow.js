/** Optional creator slideshow. Its speed belongs only to this gallery preview. */
export const SLIDESHOW_STORAGE_KEY = 'halloween-exhibition:preview:slideshow:v1';
export const SLIDESHOW_INTERVALS_SECONDS = Object.freeze([5, 10, 20]);
export const DEFAULT_SLIDESHOW_INTERVAL_SECONDS = 10;

const validInterval = value => SLIDESHOW_INTERVALS_SECONDS.includes(value);

function browserStorage() {
  try { return globalThis.localStorage; } catch { return undefined; }
}

/**
 * DOM-independent controller. Wire each external pause condition through
 * setBlocked(reason, boolean), including dialogs, visibility, reduced motion,
 * ambience pause, unavailable data, and roulette.
 *
 * onAdvance({ signal, isCurrent, generation }) may return a Promise. Delayed
 * navigation must check isCurrent() before committing; cancellation cannot undo
 * a callback's own side effects. Manual navigation invalidates that context.
 * A cancelled asynchronous callback must settle before another tick is allowed.
 * Every restart waits the complete selected interval, never a leftover delay.
 *
 * timers has setTimeout(callback, milliseconds) and clearTimeout(handle).
 * onState receives an initial snapshot and subsequent state changes.
 * Only intervalSeconds is persisted. Every new instance starts OFF.
 */
export function createSlideshowController({
  timers = globalThis,
  onAdvance = () => {},
  onState = () => {},
  storage = browserStorage(),
} = {}) {
  let intervalSeconds = DEFAULT_SLIDESHOW_INTERVAL_SECONDS;
  try {
    const saved = JSON.parse(storage?.getItem(SLIDESHOW_STORAGE_KEY) ?? 'null');
    if (saved && validInterval(saved.intervalSeconds)) intervalSeconds = saved.intervalSeconds;
  } catch { /* Storage and malformed preferences must not prevent browsing. */ }

  let enabled = false;
  let disposed = false;
  let generation = 0;
  let timer = null;
  let inFlight = null;
  let error = null;
  const blockers = new Set();

  function getState() {
    return {
      enabled,
      intervalSeconds,
      blocked: blockers.size > 0,
      blockers: [...blockers],
      scheduled: timer !== null,
      advancing: Boolean(inFlight && inFlight.generation === generation && !disposed),
      disposed,
      error,
    };
  }

  function notify() {
    // A rendering callback must not strand the timer or create rejected Promises.
    try { onState(getState()); } catch { /* The host owns its rendering errors. */ }
  }

  function eligible() {
    return enabled && !disposed && blockers.size === 0;
  }

  function invalidate() {
    generation++;
    if (timer !== null) {
      timers.clearTimeout(timer.handle);
      timer = null;
    }
    // Keep the pending Promise as a concurrency lock, even after cancellation.
    inFlight?.abortController.abort();
  }

  function schedule() {
    if (!eligible() || timer !== null || inFlight !== null) return;
    // The object identity also protects against an already-queued old timeout.
    const ticket = { generation, handle: null };
    timer = ticket;
    ticket.handle = timers.setTimeout(() => {
      if (timer !== ticket || ticket.generation !== generation || !eligible()) return;
      timer = null;
      advance(ticket.generation);
    }, intervalSeconds * 1000);
  }

  async function advance(token) {
    if (!eligible() || inFlight !== null || token !== generation) return;
    const flight = { generation: token, abortController: new AbortController() };
    inFlight = flight;
    const isCurrent = () => inFlight === flight && !disposed && eligible() && generation === token && !flight.abortController.signal.aborted;
    notify();
    try {
      // onState may synchronously turn OFF, navigate, or add a blocker.
      if (isCurrent()) await onAdvance({ signal: flight.abortController.signal, isCurrent, generation: token });
    } catch (failure) {
      if (isCurrent()) {
        error = failure instanceof Error ? failure.message : String(failure);
        enabled = false;
        invalidate();
      }
    } finally {
      if (inFlight === flight) inFlight = null;
      // A stale completion may release the lock, but cannot restore old state.
      schedule();
      if (!disposed) notify();
    }
  }

  function setEnabled(value) {
    if (disposed || typeof value !== 'boolean') return false;
    if (enabled === value) return true;
    enabled = value;
    error = null;
    invalidate();
    schedule();
    notify();
    return true;
  }

  function setIntervalSeconds(value) {
    if (disposed || !validInterval(value)) return false;
    const changed = value !== intervalSeconds;
    intervalSeconds = value;
    try { storage?.setItem(SLIDESHOW_STORAGE_KEY, JSON.stringify({ intervalSeconds })); } catch { /* Session choice still applies. */ }
    if (changed) {
      invalidate();
      schedule();
      notify();
    }
    return true;
  }

  function setBlocked(reason, value) {
    if (disposed || typeof reason !== 'string' || !reason.trim() || typeof value !== 'boolean') return false;
    if (blockers.has(reason) === value) return true;
    if (value) blockers.add(reason);
    else blockers.delete(reason);
    invalidate();
    schedule();
    notify();
    return true;
  }

  function manualNavigation() {
    if (disposed) return false;
    invalidate();
    schedule();
    notify();
    return true;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    enabled = false;
    invalidate();
    notify();
  }

  notify();
  return { setEnabled, setIntervalSeconds, setBlocked, manualNavigation, dispose, getState };
}
