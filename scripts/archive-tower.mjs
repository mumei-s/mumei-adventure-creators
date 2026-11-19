import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { artworkMime } from '../tower/quality-assist.js';

const directory=fileURLToPath(new URL('../tower/published/',import.meta.url));
const endpoint='https://slamzhgsawfnmwlejgqp.supabase.co/functions/v1/creator-tower';
const publicRoot='https://mumei-s.github.io/mumei-adventure-creators/tower/published/';
const mode=process.argv[2]||'sync';
const uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const fmt=x=>JSON.stringify(x)+'\n';
async function json(url,init){const response=await fetch(url,{...init,signal:AbortSignal.timeout(16000)});if(!response.ok)throw Error('HTTP '+response.status+' for '+new URL(url).pathname);return response.json();}
async function origin(view,params={}){const u=new URL(endpoint);u.search=new URLSearchParams({view,...params});return json(u);}
function media(room){
  const items=[];
  if(room.avatarVersion)items.push({kind:'avatar',version:room.avatarVersion});
  if(room.design.world?.artwork)items.push({kind:'interior',version:room.design.world.artwork});
  for(const [kind,data] of Object.entries(room.design.transport||{})){
    if(!['garage','parkingTower','bicycle','motorcycle'].includes(kind))throw Error('Unknown parking space');
    items.push({kind,version:data.version});
  }
  for(const item of items)if(!/^([0-9]+|[a-f0-9]{24})$/.test(String(item.version)))throw Error('Invalid image version');
  return items;
}
function publicRoom(value,expected){
  const {id,slot,noteId,version,avatarVersion,profile,design,stamps,joinedAt}=value;
  if(id!==expected.id || slot!==expected.slot || noteId!==expected.noteId)throw Error('Directory and room identity disagree');
  if(!uuid.test(id)||!Number.isSafeInteger(slot)||slot<1||!Number.isSafeInteger(version)||version<1||
     !/^[a-z0-9_]{1,32}$/.test(noteId)||!profile||!design)throw Error('Invalid room');
  const articleUrl=new RegExp('^https://note\\.com/'+noteId+'/n/n[a-f0-9]{8,20}$');
  if((profile.articles||[]).some(article=>!articleUrl.test(article.url)))throw Error('Article does not match the public note ID');
  const safe={};
  for(const key of ['title','avatarMode','avatarName','theme','light','welcome','pin','world','engineer','manager'])if(Object.hasOwn(design,key))safe[key]=design[key];
  safe.transport={};
  for(const [key,v] of Object.entries(design.transport||{})){
    if(!['garage','parkingTower','bicycle','motorcycle'].includes(key))continue;
    safe.transport[key]=Object.fromEntries(['version','kind','title','style','facing'].filter(k=>Object.hasOwn(v,k)).map(k=>[k,v[k]]));
  }
  const pubProfile=Object.fromEntries(['name','description','photo','articles'].filter(k=>Object.hasOwn(profile,k)).map(k=>[k,profile[k]]));
  return {id,slot,noteId,version,avatarVersion,profile:pubProfile,design:safe,stamps,joinedAt};
}
async function storeRoom(value,expected,local){
  const room=publicRoom(value,expected),dir=join(directory,'media',room.id);await mkdir(dir,{recursive:true});
  const receiptPath=join(directory,'receipts',room.id+'.json');
  let previous;
  try{previous=JSON.parse(await readFile(receiptPath,'utf8'));}
  catch(error){if(error.code!=='ENOENT')throw error;}
  const items=media(room),kept=new Set();
  for(const item of items){
    const file=item.kind+'-'+item.version+'.img',path=join(dir,file);kept.add(file);
    const recorded=previous?.items.find(old=>old.kind===item.kind && String(old.version)===String(item.version))?.sha256;
    const valid=bytes=>bytes.length>0 && bytes.length<=307200 && artworkMime(bytes) && (!recorded || digest(bytes)===recorded);
    let bytes;
    try{bytes=await readFile(path);if(!valid(bytes))throw Error('Invalid archived image: '+file);}
    catch(error){
      if(local)throw error;
      const u=new URL(endpoint);u.search=new URLSearchParams({view:['avatar','interior'].includes(item.kind)?item.kind:'vehicle',id:room.id,space:item.kind,v:String(item.version)});
      const response=await fetch(u,{signal:AbortSignal.timeout(18000)});if(!response.ok||!response.headers.get('content-type')?.startsWith('image/'))throw Error('Pending picture unavailable');
      bytes=Buffer.from(await response.arrayBuffer());if(!valid(bytes))throw Error('Image format or digest mismatch: '+file);
      await writeFile(path,bytes);
    }
    item.sha256=digest(bytes);
  }
  const jsonText=fmt(room);await writeFile(join(directory,'rooms',room.id+'.json'),jsonText);
  const receipt={id:room.id,version:room.version,roomSha256:digest(jsonText),items};
  await writeFile(receiptPath,fmt(receipt));
  for(const file of await readdir(dir))if(!kept.has(file))await rm(join(dir,file));
  return room;
}
async function acknowledge(){
  const pending=await origin('pending-images');
  const versions=new Map(pending.rooms.map(room=>[room.id,room.version]));
  for(const name of await readdir(join(directory,'receipts'))){
    const id=name.replace(/\.json$/,'');
    if(!versions.has(id))continue;
    const receipt=JSON.parse(await readFile(join(directory,'receipts',name),'utf8'));
    if(receipt.version!==versions.get(id))continue;
    const res=await fetch(publicRoot+'rooms/'+name,{cache:'no-store',signal:AbortSignal.timeout(12000)});
    if(!res.ok||digest(Buffer.from(await res.arrayBuffer()))!==receipt.roomSha256)continue;
    await json(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'ack_public_images',...receipt})});
  }
}
if(mode==='current') {
  const files=['list.json','facilities.json',...(await readdir(join(directory,'rooms'))).map(name=>'rooms/'+name)];
  const pending=await origin('pending-images');
  for(const {id,version} of pending.rooms){
    if(!uuid.test(id))throw Error('Invalid pending room');
    const name='receipts/'+id+'.json';
    let receipt;
    try{receipt=JSON.parse(await readFile(join(directory,name),'utf8'));}
    catch(error){if(error.code==='ENOENT')continue;throw error;}
    if(receipt.version!==version)continue;
    files.push(name,...receipt.items.map(item=>'media/'+id+'/'+item.kind+'-'+item.version+'.img'));
  }
  for (const file of files) {
    const response=await fetch(publicRoot+file,{cache:'no-store',signal:AbortSignal.timeout(12000)});
    if(!response.ok||digest(Buffer.from(await response.arrayBuffer()))!==digest(await readFile(join(directory,file))))process.exit(1);
  }
} else if(mode==='check') {
  const {ready}=await origin('archive-status');
  if(process.env.GITHUB_OUTPUT) await writeFile(process.env.GITHUB_OUTPUT,'ready='+String(ready===true)+'\n',{flag:'a'});
  console.log(ready?'Intake ready.':'Intake awaits verified migration.');
} else if(mode==='ack'){await acknowledge();}
else{
  const local=mode==='local';
  for(const sub of ['media','rooms','receipts'])await mkdir(join(directory,sub),{recursive:true});
  const existing=await readdir(join(directory,'rooms'));
  const catalog=local?JSON.parse(await readFile(join(directory,'list.json'),'utf8')):await origin('list');
  if(!Array.isArray(catalog.rooms))throw Error('Invalid directory');
  const ids=catalog.rooms.map(r=>r.id);
  if(ids.some(id=>!uuid.test(id)) || ['id','slot','noteId'].some(key=>new Set(catalog.rooms.map(room=>room[key])).size!==ids.length))throw Error('Duplicate or invalid room directory');
  if(local && (existing.length!==ids.length || existing.some(name=>!ids.includes(name.replace(/\.json$/,'')))))throw Error('Archived roster and room files disagree');
  if(!local){
    // An empty or partially migrated backend must never displace the live directory.
    const flag=await origin('archive-status');
    if(flag.ready!==true)throw Error('MUUMEI intake migration is not marked ready');
  }
  const rooms=[];
  for(const entry of catalog.rooms){
    const value=local?JSON.parse(await readFile(join(directory,'rooms',entry.id+'.json'),'utf8')):await origin('room',{id:entry.id});
    rooms.push(await storeRoom(value,entry,local));
  }
  rooms.sort((a,b)=>a.slot-b.slot);
  const list=rooms.map(r=>({id:r.id,slot:r.slot,noteId:r.noteId,name:r.profile.name,photo:r.profile.photo,avatarName:r.design.avatarName,avatarVersion:r.design.avatarMode==='custom'?r.avatarVersion:null,avatarMode:r.design.avatarMode,title:r.design.title,theme:r.design.theme,light:r.design.light,world:r.design.world,joinedAt:r.joinedAt}));
  const residents=rooms.filter(r=>r.design.engineer||r.design.manager||Object.keys(r.design.transport).length).map(r=>({id:r.id,slot:r.slot,noteId:r.noteId,name:r.profile.name,version:r.version,manager:!!r.design.manager,engineer:!!r.design.engineer,transport:r.design.transport}));
  await writeFile(join(directory,'list.json'),fmt({floors:catalog?.floors||Math.max(12,...rooms.map(r=>Math.ceil(r.slot/12))),perFloor:12,rooms:list}));
  await writeFile(join(directory,'facilities.json'),fmt({residents}));
  for(const name of existing){
    const id=name.replace(/\.json$/,'');if(!uuid.test(id)||ids.includes(id))continue;
    await rm(join(directory,'rooms',name));await rm(join(directory,'receipts',name),{force:true});await rm(join(directory,'media',id),{recursive:true,force:true});
  }
  console.log('Prepared '+rooms.length+' public rooms.');
}
