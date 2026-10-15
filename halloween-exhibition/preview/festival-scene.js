// One bounded reaction at a time; no intervals or perpetual JS animation loops.
export function createFestivalController({ render, clear, schedule = setTimeout, cancel = clearTimeout }) {
 let timer = null, hidden = false, disposed = false, still = false;
 function reset() { if (timer !== null) cancel(timer); timer = null; clear(); }
 return {
  play(kind) {
   if (disposed || hidden || !['brew', 'pumpkin', 'ghost'].includes(kind)) return false;
   reset(); render(kind, still);
   timer = schedule(() => { timer = null; clear(); }, 1800);
   return true;
  },
  setHidden(value) { hidden = value; if (hidden) reset(); },
  setStill(value) { if (still !== value) reset(); still = value; },
  dispose() { disposed = true; reset(); }
 };
}
export function initFestivalScene({scene, root, doc = document, win = window}) {
 if (!scene) return () => {};
 const effects = scene.querySelector('.festival-effects');
 const status = scene.querySelector('.festival-status');
 const reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
 const labels = {brew:'魔法の泡がふわりと浮かびました。',pumpkin:'かぼちゃが金色に輝きました。',ghost:'おばけが嬉しそうに挨拶しました。'};
 const controller = createFestivalController({
  render(kind, still) {
   scene.dataset.magic = kind; scene.dataset.still = String(still); status.textContent = labels[kind];
   const origin = {brew:[50,50],pumpkin:[22,68],ghost:[65,34]}[kind];
   for (let i=0; i<(kind==='ghost'?5:12); i++) {
    const particle = doc.createElement('i'); particle.className='festival-spark'; particle.dataset.kind=kind;
    const x=origin[0]+Math.sin(i*2.4)*(kind==='ghost'?7:11), y=origin[1]+Math.cos(i*1.7)*7;
    particle.style.cssText=`--x:${x}%;--y:${y}%;--size:${kind==='ghost'?18:7+i%4*3}px;--delay:${i*.025}s;--drift:${Math.sin(i*2)*28}px`;
    effects.append(particle);
   }
  },
  clear() { delete scene.dataset.magic; effects.replaceChildren(); status.textContent=''; },
  schedule: (callback, delay) => win.setTimeout(callback, delay), cancel: id => win.clearTimeout(id)
 });
 const sync = () => {
  controller.setHidden(doc.hidden || doc.body.dataset.pageHidden==='true');
  controller.setStill(reduced.matches || root.dataset.motionPaused==='true' || doc.body.dataset.ambientPaused==='true');
 };
 const click = event => { const button=event.target.closest('[data-magic]'); if(button && scene.contains(button) && button.tagName==='BUTTON') controller.play(button.dataset.magic); };
 scene.addEventListener('click',click); doc.addEventListener('visibilitychange',sync); reduced.addEventListener('change',sync);
 const observer = new win.MutationObserver(sync);
 observer.observe(root,{attributes:true,attributeFilter:['data-motion-paused']});
 observer.observe(doc.body,{attributes:true,attributeFilter:['data-ambient-paused','data-page-hidden']}); sync();
 const dispose = () => { controller.dispose();observer.disconnect();scene.removeEventListener('click',click);doc.removeEventListener('visibilitychange',sync);reduced.removeEventListener('change',sync);win.removeEventListener('pagehide',pagehide);win.removeEventListener('pageshow',sync); };
 // A bfcache page stays wired; clear its current reaction and resync on return.
 const pagehide = event => { if(event.persisted) controller.setHidden(true); else dispose(); };
 win.addEventListener('pagehide',pagehide);win.addEventListener('pageshow',sync);
 return dispose;
}
