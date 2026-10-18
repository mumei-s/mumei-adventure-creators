/** Article visits are local progress; only an explicit markRead records reading. */
export const READING_JOURNEY_KEY='mumei:lantern-town:reading-journey:v1';
const VERSION=1;
const validId=value=>typeof value==='string'&&/^[a-z0-9][a-z0-9_-]{0,119}$/i.test(value);

function articleURL(value,creatorId){
 if(typeof value!=='string'||!validId(creatorId))return null;
 try{
  const url=new URL(value);
  if(url.protocol!=='https:'||url.hostname!=='note.com'||url.port||url.username||url.password)return null;
  const match=url.pathname.match(/^\/([^/]+)\/n\/(n[a-z0-9]+)\/?$/i);
  return match&&match[1]===creatorId?`https://note.com/${creatorId}/n/${match[2]}`:null;
 }catch{return null;}
}

function normalizePeople(value){
 const result=[],seen=new Set();
 for(const person of Array.isArray(value)?value:[]){
  if(!person||!validId(person.id)||seen.has(person.id)||typeof person.name!=='string'||!person.name.trim()||person.pending===true||person.visible===false)continue;
  const works=[],urls=new Set();
  for(const work of Array.isArray(person.works)?person.works:[]){
   if(!work||work.introduction===true||work.visible===false||work.submissionStatus==='pending')continue;
   const url=articleURL(work.url,person.id);if(!url||urls.has(url))continue;
   urls.add(url);works.push({url,title:typeof work.title==='string'&&work.title.trim()?work.title:'参加作品',introduction:false,...(typeof work.image==='string'?{image:work.image}:{}),...(typeof work.imageAlt==='string'?{imageAlt:work.imageAlt}:{})});
  }
  if(!works.length)continue;
  seen.add(person.id);result.push({id:person.id,name:person.name.trim(),works,...(typeof person.avatar==='string'?{avatar:person.avatar}:{}),...(typeof person.profileURL==='string'?{profileURL:person.profileURL}:{})});
 }
 return result;
}

function restoredProgress(value){
 const records=new Map();
 if(!Array.isArray(value))return records;
 for(const entry of value.slice(0,500)){
  if(!entry||!validId(entry.id)||records.has(entry.id))continue;
  const openedURLs=new Set((Array.isArray(entry.openedURLs)?entry.openedURLs:[]).slice(0,256).map(url=>articleURL(url,entry.id)).filter(Boolean));
  const readURLs=new Set((Array.isArray(entry.readURLs)?entry.readURLs:[]).slice(0,256).map(url=>articleURL(url,entry.id)).filter(url=>url&&openedURLs.has(url)));
  records.set(entry.id,{visited:entry.visited===true||openedURLs.size>0,openedURLs,readURLs});
 }
 return records;
}

export function createReadingJourney({storage,people:initialPeople=[],onChange}={}){
 let store=null,saved=false,storageError=null,records=new Map(),selectedId=null;
 try{store=storage===undefined?globalThis.localStorage:storage;if(!store||typeof store.getItem!=='function'||typeof store.setItem!=='function')throw Error();saved=true;}catch{storageError='unavailable';}
 if(store){
  try{
   const raw=store.getItem(READING_JOURNEY_KEY);
   if(raw!==null&&raw!==undefined&&raw!==''){
    const value=JSON.parse(raw);
    if(!value||value.version!==VERSION||!Array.isArray(value.progress))throw Error();
    records=restoredProgress(value.progress);selectedId=validId(value.selectedId)?value.selectedId:null;
   }
  }catch{saved=false;storageError='invalid-or-unavailable';}
 }
 let people=normalizePeople(initialPeople);
 const progress=id=>records.get(id)||{visited:false,openedURLs:new Set(),readURLs:new Set()};
 const isRead=person=>person.works.some(work=>progress(person.id).readURLs.has(work.url));
 const personFor=id=>people.find(person=>person.id===id)||null;
 function reconcileSelection(){if(!personFor(selectedId))selectedId=(people.find(person=>!isRead(person))||people[0])?.id||null;}
 reconcileSelection();
 function nextId(){
  if(!people.length)return null;
  const start=people.findIndex(person=>person.id===selectedId);
  for(let step=1;step<=people.length;step++){
   const person=people[(start+step)%people.length];if(!isRead(person))return person.id;
  }
  return null;
 }
 function snapshot(){
  const pages=people.map(person=>{
   const entry=progress(person.id),validURLs=new Set(person.works.map(work=>work.url));
   return {...person,works:person.works.map(work=>({...work})),visited:entry.visited,openedURLs:[...entry.openedURLs].filter(url=>validURLs.has(url)),readURLs:[...entry.readURLs].filter(url=>validURLs.has(url)),read:isRead(person),selected:person.id===selectedId};
  });
  const readCount=pages.filter(person=>person.read).length;
  return {version:VERSION,people:pages,total:pages.length,visitedCount:pages.filter(person=>person.visited).length,openedCount:pages.filter(person=>person.openedURLs.length>0).length,readCount,remaining:pages.length-readCount,complete:pages.length>0&&readCount===pages.length,selectedId,selected:pages.find(person=>person.id===selectedId)||null,nextId:nextId(),saved,storageError};
 }
 function notify(){if(typeof onChange==='function')try{onChange(snapshot());}catch{/* Rendering callbacks must not discard progress. */}}
 function persist(){
  try{
   if(!store)throw Error();
   store.setItem(READING_JOURNEY_KEY,JSON.stringify({version:VERSION,selectedId,progress:[...records].map(([id,entry])=>({id,visited:entry.visited,openedURLs:[...entry.openedURLs],readURLs:[...entry.readURLs]}))}));
   saved=true;storageError=null;
  }catch{saved=false;storageError='unavailable';}
  notify();
 }
 function mutableProgress(id){if(!records.has(id))records.set(id,{visited:false,openedURLs:new Set(),readURLs:new Set()});return records.get(id);}
 function validWork(id,url){const person=personFor(id),canonical=articleURL(url,id);return person&&canonical&&person.works.some(work=>work.url===canonical)?canonical:null;}
 return {
  snapshot,
  setPeople(value){people=normalizePeople(value);reconcileSelection();notify();return snapshot();},
  visit(id){if(!personFor(id))return false;mutableProgress(id).visited=true;selectedId=id;persist();return true;},
  openArticle(id,url){const canonical=validWork(id,url);if(!canonical)return false;const entry=mutableProgress(id);entry.visited=true;entry.openedURLs.add(canonical);selectedId=id;persist();return true;},
  markRead(id,url){const canonical=validWork(id,url);if(!canonical||!progress(id).openedURLs.has(canonical))return false;const entry=mutableProgress(id);entry.visited=true;entry.readURLs.add(canonical);selectedId=id;persist();return true;},
  select(id){if(!personFor(id))return false;selectedId=id;persist();return true;},
  next(){const id=nextId();if(id){selectedId=id;persist();}return id;}
 };
}
