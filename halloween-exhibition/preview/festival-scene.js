// One bounded reaction at a time; no intervals or perpetual JS animation loops.
export function createFestivalController({ render, clear, schedule = setTimeout, cancel = clearTimeout }) {
 let timer = null, hidden = false, disposed = false, still = false;
 function reset() { if (timer !== null) cancel(timer); timer = null; clear(); }
 return {
  play(kind) {
   if (disposed || hidden || !['brew', 'pumpkin', 'ghost', 'cat', 'moon'].includes(kind)) return false;
   reset(); render(kind, still);
   timer = schedule(() => { timer = null; clear(); }, 2300);
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
 const labels = {brew:'魔法の泡がふわりと浮かびました。',pumpkin:'かぼちゃが金色に輝きました。',ghost:'おばけが嬉しそうに挨拶しました。',cat:'黒猫のまわりを魔法の光が踊ります。',moon:'窓の光が中庭を流れます。'};
 let lastKind=null, lastTime=0;
 const controller = createFestivalController({
  render(kind, still) {
   scene.dataset.magic = kind; scene.dataset.still = String(still); status.textContent = labels[kind];
   const origins = {brew:[50,50],pumpkin:[22,68],ghost:[65,34],cat:[75,63],moon:[33,16]};
   const origin=origins[kind], now=Date.now(), combo=lastKind!==null && lastKind!==kind && now-lastTime<2300;
   scene.dataset.combo=String(combo);
   const previous=origins[lastKind]||origin;lastKind=kind;lastTime=now;
   for (let i=0; i<(kind==='ghost'?5:12); i++) {
    const particle = doc.createElement('i'); particle.className='festival-spark'; particle.dataset.kind=kind;
    const x=origin[0]+Math.sin(i*2.4)*(kind==='ghost'?7:11), y=origin[1]+Math.cos(i*1.7)*7;
    particle.style.cssText=`--x:${x}%;--y:${y}%;--size:${kind==='ghost'?18:7+i%4*3}px;--delay:${i*.025}s;--drift:${Math.sin(i*2)*28}px`;
    effects.append(particle);
   }
   if(combo&&!still) for(let i=0;i<12;i++){
    const particle=doc.createElement('i');particle.className='festival-spark';particle.dataset.chain='true';
    const t=i/11;particle.style.cssText=`--x:${previous[0]+(origin[0]-previous[0])*t}%;--y:${previous[1]+(origin[1]-previous[1])*t-Math.sin(t*Math.PI)*12}%;--size:7px;--delay:${i*.045}s;--drift:0px`;effects.append(particle);
   }
  },
  clear() { delete scene.dataset.magic; delete scene.dataset.combo; effects.replaceChildren(); status.textContent=''; },
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
 const viewport = typeof win.IntersectionObserver==='function' ? new win.IntersectionObserver(entries=>{const visible=entries.some(entry=>entry.isIntersecting);scene.dataset.visible=String(visible);if(!visible)controller.setHidden(true);else sync();},{threshold:0.01}) : null;
 viewport?.observe(scene);
 const dispose = () => { controller.dispose();viewport?.disconnect();observer.disconnect();scene.removeEventListener('click',click);doc.removeEventListener('visibilitychange',sync);reduced.removeEventListener('change',sync);win.removeEventListener('pagehide',pagehide);win.removeEventListener('pageshow',sync); };
 // A bfcache page stays wired; clear its current reaction and resync on return.
 const pagehide = event => { if(event.persisted) controller.setHidden(true); else dispose(); };
 win.addEventListener('pagehide',pagehide);win.addEventListener('pageshow',sync);
 return dispose;
}
