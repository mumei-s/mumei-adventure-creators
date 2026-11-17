const reference = 'atelier-district-clock';
const dayLength = 360_000;
let baseline = Date.now();
try {
  const saved = Number(sessionStorage.getItem(reference));
  if (saved > 0 && saved <= baseline) baseline = saved;
  else sessionStorage.setItem(reference,String(baseline));
} catch {
  // A restricted browsing session can still use its current page as a clock.
}

export function districtTime(mode='auto',now=Date.now()) {
  const minute = mode==='night' ? 1275 : mode==='dusk' ? 1060 :
    ((now-baseline)/dayLength*1440+1060)%1440;
  const hour = Math.floor(minute/60);
  const time = [hour,Math.floor(minute%60)].map(value=>String(value).padStart(2,'0')).join(':');
  const dawn = Math.max(0,1-Math.abs(minute-420)/105);
  const daylight = Math.max(0,Math.sin((minute-350)/780*Math.PI));
  const night = Math.max(.11,1-Math.max(daylight,dawn*.65));
  return {time,night};
}

export function applyDistrictLight(element,mode) {
  const state = districtTime(mode);
  element.style.setProperty('--night',state.night.toFixed(3));
  return state;
}
