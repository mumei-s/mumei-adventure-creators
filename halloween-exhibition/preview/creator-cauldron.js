// A copy of the portrait travels; the real creator and its navigation never move.
export const CREATOR_BREW_EVENT = 'yearbook:creator-brew';
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export function cauldronContains(rect, x, y) {
 return rect.width > 0 && rect.height > 0 && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}
export function edgeScrollSpeed(y, height) {
 const edge = Math.min(88, height * .16);
 if (y < edge) return -12 * clamp((edge - y) / edge, 0, 1);
 if (y > height - edge) return 12 * clamp((y - height + edge) / edge, 0, 1);
 return 0;
}
export function initCreatorCauldron({ strip, target, scene, root, onActivity = () => {}, doc = document, win = window }) {
 if (!strip || !target || !scene || !root) return () => {};
 let gesture = null, ghost = null, frame = null, settleTimer = null, lastFrame = 0, disposed = false;
 let suppressed = null;
 const reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
 const listeners = [];
 const listen = (el, type, fn, options) => { el.addEventListener(type, fn, options); listeners.push(() => el.removeEventListener(type, fn, options)); };
 const enabled = () => !disposed && !doc.hidden && doc.body.dataset.pageHidden !== 'true' && root.dataset.mode === 'halloween' && root.dataset.palaceState === 'gallery';
 const still = () => reduced.matches || root.dataset.motionPaused === 'true' || doc.body.dataset.ambientPaused === 'true';
 const buttonAt = element => { const button = element?.closest?.('.face-dot'); return button && strip.contains(button) ? button : null; };
 const infoFor = button => ({ name: button.dataset.creatorName || '', color: /^#[a-f\d]{6}$/i.test(button.dataset.creatorColor || '') ? button.dataset.creatorColor : '#c8a8ed' });
 function removeGhost() { if (settleTimer !== null) win.clearTimeout(settleTimer); settleTimer = null; ghost?.remove(); ghost = null; }
 function cancelFrame() { if (frame !== null) win.cancelAnimationFrame(frame); frame = null; lastFrame = 0; }
 function finish({ keepGhost = false } = {}) {
  const previous = gesture; gesture = null; cancelFrame();
  if (previous) {
   previous.source.classList.remove('creator-lifted');
   try { if (previous.source.hasPointerCapture(previous.id)) previous.source.releasePointerCapture(previous.id); } catch {}
  }
  delete root.dataset.creatorDragging; delete scene.dataset.creatorTarget; delete scene.dataset.creatorNear;
  if (!keepGhost) removeGhost();
  if (previous) onActivity(false);
 }
 function cancel() { if (gesture?.dragging) suppressed = { source: gesture.source, until: Date.now() + 650 }; finish(); }
 function moveGhost() {
  if (!gesture || !ghost) return;
  ghost.style.transform = `translate3d(${gesture.x}px,${gesture.y - 18}px,0) translate(-50%,-50%)`;
  const inside = cauldronContains(target.getBoundingClientRect(), gesture.x, gesture.y);
  scene.dataset.creatorNear = String(inside); ghost.classList.toggle('creator-ghost-near', inside);
 }
 function tick(time) {
  frame = null;
  if (!gesture?.dragging || !enabled() || !gesture.source.isConnected) { cancel(); return; }
  const viewport = win.visualViewport;
  const height = viewport?.height || win.innerHeight, top = viewport?.offsetTop || 0;
  const speed = edgeScrollSpeed(gesture.y - top, height);
  const elapsed = lastFrame ? Math.min(32, Math.max(0, time - lastFrame)) : 16;
  lastFrame = time;
  if (speed) win.scrollBy({ top: speed * elapsed / 16, left: 0, behavior: 'instant' });
  moveGhost(); frame = win.requestAnimationFrame(tick);
 }
 function startDrag() {
  gesture.dragging = true;
  const { source, info } = gesture;
  ghost = doc.createElement('span'); ghost.className = 'creator-drag-ghost'; ghost.setAttribute('aria-hidden', 'true');
  ghost.style.setProperty('--creator-color', info.color);
  const initial = doc.createElement('span'); initial.textContent = Array.from(info.name).slice(0, 1).join(''); ghost.append(initial);
  const image = source.querySelector('img');
  if (image) { const copy = image.cloneNode(false); copy.alt = ''; copy.draggable = false; ghost.append(copy); }
  doc.body.append(ghost); source.classList.add('creator-lifted');
  root.dataset.creatorDragging = 'true'; scene.dataset.creatorTarget = 'true';
  scene.style.setProperty('--creator-color', info.color);
  moveGhost(); frame = win.requestAnimationFrame(tick);
 }
 function brew(info) { scene.dispatchEvent(new win.CustomEvent(CREATOR_BREW_EVENT, { detail: info })); }
 function pointerdown(event) {
  if (!enabled() || gesture || event.isPrimary === false || event.button !== 0) return;
  const source = buttonAt(event.target); if (!source) return;
  removeGhost(); suppressed = null;
  gesture = { id: event.pointerId, source, info: infoFor(source), startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, dragging: false };
  onActivity(true);
  try { source.setPointerCapture(event.pointerId); } catch {}
 }
 function pointermove(event) {
  if (!gesture || event.pointerId !== gesture.id) return;
  gesture.x = event.clientX; gesture.y = event.clientY;
  if (!gesture.dragging && Math.hypot(gesture.x - gesture.startX, gesture.y - gesture.startY) >= 9) startDrag();
  if (gesture.dragging) { if (event.cancelable) event.preventDefault(); moveGhost(); }
 }
 function pointerup(event) {
  if (!gesture || event.pointerId !== gesture.id) return;
  if (!gesture.dragging) { finish(); return; }
  if (event.cancelable) event.preventDefault();
  const { source, info } = gesture;
  suppressed = { source, until: Date.now() + 650 };
  const rect = target.getBoundingClientRect();
  if (!enabled() || !cauldronContains(rect, event.clientX, event.clientY)) { finish(); return; }
  // The portrait slips into the mouth of the painted pot, then the brew blooms.
  if (ghost && !still()) {
   ghost.classList.add('creator-ghost-drop');
   ghost.style.transform = `translate3d(${rect.left + rect.width * .5}px,${rect.top + rect.height * .13}px,0) translate(-50%,-50%) scale(.12)`;
   finish({ keepGhost: true }); settleTimer = win.setTimeout(removeGhost, 280);
  } else finish();
  brew(info);
 }
 function keydown(event) {
  if (event.key === 'Escape' && gesture) { event.preventDefault(); cancel(); return; }
  if (event.key !== 'Enter' || !event.shiftKey || event.repeat || !enabled()) return;
  const source = buttonAt(event.target); if (!source) return;
  event.preventDefault(); cancel();
  target.scrollIntoView({ block: 'center', behavior: 'instant' }); target.focus({ preventScroll: true });
  brew(infoFor(source));
 }
 listen(strip, 'pointerdown', pointerdown);
 listen(strip, 'pointermove', pointermove, { passive: false });
 listen(strip, 'pointerup', pointerup);
 listen(strip, 'pointercancel', event => { if (event.pointerId === gesture?.id) cancel(); });
 listen(strip, 'lostpointercapture', event => { if (event.pointerId === gesture?.id) cancel(); });
 listen(strip, 'click', event => {
  if (suppressed && Date.now() < suppressed.until && buttonAt(event.target) === suppressed.source && event.detail !== 0) {
   event.preventDefault(); event.stopImmediatePropagation(); suppressed = null;
  }
 }, true);
 listen(strip, 'dragstart', event => { if (buttonAt(event.target)) event.preventDefault(); });
 listen(strip, 'contextmenu', event => { if (gesture?.dragging) event.preventDefault(); });
 listen(doc, 'keydown', keydown);
 listen(doc, 'visibilitychange', () => { if (doc.hidden) cancel(); });
 listen(win, 'blur', cancel);
 listen(win, 'orientationchange', cancel);
 listen(win, 'pagehide', event => { if (event.persisted) cancel(); else dispose(); });
 const observer = new win.MutationObserver(() => { if (gesture && (!enabled() || !gesture.source.isConnected)) cancel(); });
 observer.observe(root, { attributes: true, attributeFilter: ['data-mode', 'data-palace-state'] });
 observer.observe(doc.body, { attributes: true, attributeFilter: ['data-page-hidden'] });
 observer.observe(strip, { childList: true });
 function dispose() { if (disposed) return; disposed = true; cancel(); observer.disconnect(); listeners.splice(0).forEach(remove => remove()); }
 return dispose;
}
