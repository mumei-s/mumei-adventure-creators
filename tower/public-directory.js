const root=new URL('./published/',import.meta.url);
const validId=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
export const TOWER_API = 'https://slamzhgsawfnmwlejgqp.supabase.co/functions/v1/creator-tower';
export function mediaUrl(id,kind,version){
  if(!validId.test(id)||!['avatar','interior','garage','parkingTower','motorcycle','bicycle'].includes(kind)||!/^([0-9]+|[a-f0-9]{24})$/.test(String(version)))return '';
  return new URL('media/'+id+'/'+kind+'-'+version+'.img',root).href;
}
// Only artwork belonging to this Tower can fall back to its temporary intake.
export function pendingMediaUrl(source) {
  const prefix = new URL('media/',root).href;
  if (typeof source !== 'string' || !source.startsWith(prefix)) return '';
  const match = source.slice(prefix.length).match(/^([^/]+)\/(avatar|interior|garage|parkingTower|motorcycle|bicycle)-([0-9]+|[a-f0-9]{24})\.img$/);
  if (!match || !validId.test(match[1])) return '';
  const [,id,kind,v] = match;
  const vehicle = kind !== 'avatar' && kind !== 'interior';
  const url = new URL(TOWER_API);
  url.search = new URLSearchParams({view:vehicle ? 'vehicle' : kind, id, v, ...(vehicle ? {space:kind} : {})});
  return url.href;
}

export function setArtworkSource(image, source) {
  const fallback = pendingMediaUrl(source);
  if (fallback) image.addEventListener('error', event => {
    if (image.src !== source) return;
    event.stopImmediatePropagation();
    image.crossOrigin = 'anonymous';
    image.src = fallback;
  }, {once:true});
  image.src = source;
}

export async function decodeArtwork(image) {
  const source = image.src;
  try { await image.decode(); }
  catch (error) {
    const fallback = pendingMediaUrl(source);
    if (!fallback) throw error;
    if (image.src === source) { image.crossOrigin = 'anonymous'; image.src = fallback; }
    await image.decode();
  }
}
export async function publicView(view,{id}={}){
  const path=view==='list'||view==='facilities'?view+'.json':view==='room'&&validId.test(id)?'rooms/'+id+'.json':null;
  if(!path)throw Object.assign(new Error('missing'),{code:'missing'});
  const options = {cache:'no-cache',signal:AbortSignal.timeout(12000)};
  let response=await fetch(new URL(path,root),options);
  if (view === 'room' && response.status === 404) {
    const url = new URL(TOWER_API);
    url.search = new URLSearchParams({view, id});
    response = await fetch(url,options);
  }
  if(!response.ok)throw Object.assign(new Error('unavailable'),{code:response.status===404?'missing':'unavailable'});
  return response.json();
}
