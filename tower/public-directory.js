const root=new URL('./published/',import.meta.url);
const validId=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
export function mediaUrl(id,kind,version){
  if(!validId.test(id)||!['avatar','interior','garage','parkingTower','motorcycle','bicycle'].includes(kind)||!/^([0-9]+|[a-f0-9]{24})$/.test(String(version)))return '';
  return new URL('media/'+id+'/'+kind+'-'+version+'.img',root).href;
}
export async function publicView(view,{id}={}){
  const path=view==='list'||view==='facilities'?view+'.json':view==='room'&&validId.test(id)?'rooms/'+id+'.json':null;
  if(!path)throw Object.assign(new Error('missing'),{code:'missing'});
  const response=await fetch(new URL(path,root),{cache:'no-cache',signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Object.assign(new Error('unavailable'),{code:response.status===404?'missing':'unavailable'});
  return response.json();
}
