/** Touch-only gallery swipes. Pair the stage with CSS `touch-action: pan-y`.
 * onNavigate receives +1 (swipe left) or -1 (swipe right).
 * onSuppressClick receives the absolute suppression deadline (milliseconds).
 * Returns a cleanup function. No pointer handler prevents native scrolling.
 */
export function installGalleryGesture(stage, { onNavigate, onSuppressClick = () => {}, allowControl = control => control.id === 'artwork-open' }) {
  const document = stage.ownerDocument;
  const touches = new Set();
  let gesture = null;
  let blocked = false;
  let suppressUntil = 0;
  const threshold = 24;
  const controls = 'button, a, input, select, textarea, [role="button"], [contenteditable]:not([contenteditable="false"])';

  function trackDown(event) {
    if (event.pointerType !== 'touch') return;
    touches.add(event.pointerId);
    if (touches.size > 1) { blocked = true; gesture = null; }
  }
  function start(event) {
    if (event.pointerType !== 'touch' || blocked) return;
    // Tracking is normally handled during document capture. Also tolerate
    // synthetic stage events that do not propagate through the document.
    touches.add(event.pointerId);
    if (touches.size !== 1) { blocked = true; gesture = null; return; }
    const control = event.target?.closest?.(controls);
    if (control && !allowControl(control)) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, axis: null };
  }
  function measure(event) {
    if (!gesture || event.pointerId !== gesture.id) return null;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!gesture.axis && Math.max(Math.abs(dx), Math.abs(dy)) >= 10) {
      if (Math.abs(dx) > Math.abs(dy) * 1.25) gesture.axis = 'x';
      else if (Math.abs(dy) >= Math.abs(dx) || Math.max(Math.abs(dx), Math.abs(dy)) >= threshold) gesture.axis = 'y';
    }
    return { dx, dy };
  }
  function move(event) { measure(event); }
  function finish(event) {
    if (event.pointerType !== 'touch') return;
    const delta = measure(event);
    const swipe = !blocked && delta && gesture.axis === 'x' &&
      Math.abs(delta.dx) >= threshold && Math.abs(delta.dx) > Math.abs(delta.dy) * 1.25;
    if (gesture?.id === event.pointerId) gesture = null;
    touches.delete(event.pointerId);
    if (!touches.size) blocked = false;
    if (swipe) {
      suppressUntil = Date.now() + 500;
      onSuppressClick(suppressUntil);
      onNavigate(delta.dx < 0 ? 1 : -1);
    }
  }
  function cancel(event) {
    if (event.pointerType !== 'touch') return;
    gesture = null;
    touches.delete(event.pointerId);
    blocked = touches.size > 0;
  }
  function suppressClick(event) {
    // Keyboard activation remains available even immediately after a swipe.
    if (Date.now() >= suppressUntil || event.detail === 0) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }
  function reset() { touches.clear(); gesture = null; blocked = false; }
  // Safari can suspend a page or rotate the viewport without delivering the
  // last touch's pointercancel. Do not carry its ID into the next gesture.
  const onVisibility = () => { if (document.hidden) reset(); };
  const onReturn = event => { if (event.persisted) reset(); };
  document.addEventListener('pointerdown', trackDown, true);
  stage.addEventListener('pointerdown', start, { passive: true });
  document.addEventListener('pointermove', move, { passive: true });
  document.addEventListener('pointerup', finish, { passive: true });
  document.addEventListener('pointercancel', cancel, { passive: true });
  stage.addEventListener('click', suppressClick, true);
  document.addEventListener('visibilitychange', onVisibility);
  for (const event of ['blur', 'pagehide', 'orientationchange']) document.defaultView?.addEventListener(event, reset);
  document.defaultView?.addEventListener('pageshow', onReturn);
  return () => {
    document.removeEventListener('pointerdown', trackDown, true);
    stage.removeEventListener('pointerdown', start);
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', finish);
    document.removeEventListener('pointercancel', cancel);
    stage.removeEventListener('click', suppressClick, true);
    document.removeEventListener('visibilitychange', onVisibility);
    for (const event of ['blur', 'pagehide', 'orientationchange']) document.defaultView?.removeEventListener(event, reset);
    document.defaultView?.removeEventListener('pageshow', onReturn);
    reset();
  };
}
