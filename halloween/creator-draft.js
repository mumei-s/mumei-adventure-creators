const databaseName='atelier-creator-draft-v1',manifestStore='draft',assetStore='images',draftKey='current';
const maxBytes=12*1024*1024,roles=new Set(['identity','support','avoid']);
const failure=(name,message)=>new DOMException(message,name);
const empty=()=>({format:1,profile:{creator:'',name:'',activity:''},references:[],profileEpoch:'initial',referenceEpoch:'initial'});
const fileInfo=file=>({name:file.name||'reference.png',type:file.type,lastModified:Number(file.lastModified)||0});
const originalKey=id=>id+'/original',editedKey=id=>id+'/edited';

export function draftFailureMessage(error){
 const name=error?.name;
 if(name==='QuotaExceededError')return '端末の保存容量に空きがありません。';
 if(name==='TimeoutError')return '端末内への保存処理が時間内に完了しませんでした。';
 if(name==='SecurityError'||name==='NotSupportedError')return 'このブラウザでは端末内の画像保存を利用できません。';
 if(name==='InvalidStateError')return '別の画面が保存先を使用しています。ほかの画面を閉じて再試行できます。';
 return error?.message||'端末内への保存を完了できませんでした。';
}

// Images stay as Blobs in a separate store. Reads fetch only the displayed
// versions; an original used by the crop editor is fetched on demand.
export function createIndexedDraftStore({indexedDB=()=>globalThis.indexedDB,timeoutMs=15000}={}){
 let connection=null,opening=null;
 function close(){connection?.close();connection=null;opening=null;}
 function open(){
  if(connection)return Promise.resolve(connection);if(opening)return opening;
  const pending=new Promise((resolve,reject)=>{
   let settled=false;
   const finish=(error,db)=>{if(settled){db?.close();return;}settled=true;clearTimeout(timer);if(error)reject(error);else{connection=db;db.onversionchange=close;resolve(db);}};
   const timer=setTimeout(()=>finish(failure('TimeoutError','端末内の画像保存先を開けませんでした。')),timeoutMs);
   try{const factory=typeof indexedDB==='function'?indexedDB():indexedDB;if(!factory?.open)throw failure('NotSupportedError','端末内の画像保存を利用できません。');const request=factory.open(databaseName,1);
    request.onupgradeneeded=()=>{for(const name of [manifestStore,assetStore])if(!request.result.objectStoreNames.contains(name))request.result.createObjectStore(name);};
    request.onsuccess=()=>finish(null,request.result);request.onerror=()=>finish(request.error||failure('UnknownError','画像保存先を開けませんでした。'));request.onblocked=()=>finish(failure('InvalidStateError','別の画面が画像保存先を使用しています。'));
   }catch(error){finish(error);}
  });opening=pending;pending.catch(()=>{if(opening===pending)opening=null;});return pending;
 }
 async function transact(action,{shouldWrite=()=>true}={}){
  if(action.kind==='update'&&!shouldWrite())return {saved:false,cancelled:true};const db=await open();
  if(action.kind==='update'&&!shouldWrite())return {saved:false,cancelled:true};
  return new Promise((resolve,reject)=>{
   let tx,outcome=null,cause=null,settled=false;
   const finish=error=>{if(settled)return;settled=true;clearTimeout(timer);error?reject(error):resolve(outcome);};
   const timer=setTimeout(()=>{cause=failure('TimeoutError','端末内の画像の読み書きが完了しませんでした。');try{tx?.abort();}catch{}finish(cause);},timeoutMs);
   try{tx=db.transaction([manifestStore,assetStore],action.kind==='update'?'readwrite':'readonly');tx.oncomplete=()=>finish();tx.onerror=()=>{cause=tx.error||cause;};tx.onabort=()=>outcome?.cancelled?finish():finish(cause||tx.error||failure('AbortError','端末内の画像保存が中断されました。'));
    const manifests=tx.objectStore(manifestStore),assets=tx.objectStore(assetStore);
    const watch=request=>{request.onerror=()=>{cause=request.error;};return request;};
    if(action.kind==='original'){const read=watch(assets.get(originalKey(action.id)));read.onsuccess=()=>{outcome=read.result??null;};return;}
    const read=watch(manifests.get(draftKey));read.onsuccess=()=>{
     try{const state=read.result||empty();
      if(action.kind==='load'){outcome={state,blobs:new Map()};for(const reference of state.references){const image=watch(assets.get(reference.assetKey));image.onsuccess=()=>outcome.blobs.set(reference.id,image.result??null);}return;}
      if(!shouldWrite()){outcome={saved:false,cancelled:true};tx.abort();return;}
      outcome=action.updater(state);if(outcome.write===false){outcome={...outcome,saved:false};return;}
      if(!shouldWrite()){outcome={saved:false,cancelled:true};tx.abort();return;}
      for(const {key,blob}of outcome.puts||[])watch(assets.put(blob,key));for(const key of outcome.deletes||[])watch(assets.delete(key));watch(manifests.put(outcome.state,draftKey));outcome={...outcome,saved:true};
     }catch(error){cause=error;try{tx.abort();}catch{finish(error);}}
    };
   }catch(error){finish(error);}
  });
 }
 return {load:()=>transact({kind:'load'}),original:id=>transact({kind:'original',id}),update:(updater,options)=>transact({kind:'update',updater},options),close};
}

export function createCreatorDraft({database, indexedDB,timeoutMs,FileClass=globalThis.File,epoch=()=>globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)}={}){
 const store=database||createIndexedDraftStore({indexedDB,timeoutMs});let queue=Promise.resolve(),profileEpoch='initial',referenceEpoch='initial';const knownFiles=new Map();
 const enqueue=action=>{const result=queue.then(action);queue=result.catch(()=>{});return result;};
 const file=(blob,info)=>FileClass?new FileClass([blob],info.name,{type:info.type,lastModified:info.lastModified}):blob;
 const resultError=error=>({saved:false,error,message:draftFailureMessage(error)});
 async function load(){
  try{const {state,blobs}=await store.load();profileEpoch=state.profileEpoch;referenceEpoch=state.referenceEpoch;const references=[];
   for(const reference of state.references){const blob=blobs.get(reference.id);if(!(blob instanceof Blob))throw failure('NotFoundError','保存済みの参照画像を読み込めませんでした。');const current=file(blob,reference);knownFiles.set(reference.id,current);references.push({...reference,file:current});}
   return {loaded:true,profile:{...state.profile},references};
  }catch(error){return {loaded:false,error,message:draftFailureMessage(error)};}
 }
 function saveProfile(profile,{shouldWrite=()=>true}={}){
  const expectedEpoch=profileEpoch,snapshot={creator:String(profile.creator||'').slice(0,200),name:String(profile.name||'').slice(0,140),activity:String(profile.activity||'').slice(0,750)};
  return enqueue(async()=>{try{return await store.update(state=>state.profileEpoch!==expectedEpoch?{write:false,conflict:true}:{state:{...state,profile:snapshot}},{shouldWrite});}catch(error){return resultError(error);}});
 }
 function saveReferences(references,{shouldWrite=()=>true}={}){
  const expectedEpoch=referenceEpoch,snapshot=references.map(r=>({...r}));
  return enqueue(async()=>{
   try{const result=await store.update(state=>{
    if(state.referenceEpoch!==expectedEpoch)return {write:false,conflict:true};
    if(snapshot.length>4)throw failure('RangeError','参照画像は最大4枚です。');const previous=new Map(state.references.map(r=>[r.id,r])),puts=[],ids=new Set(),next=[];
    for(const reference of snapshot){const {id,file:current}=reference;if(typeof id!=='string'||!id||ids.has(id))throw failure('TypeError','参照画像の保存IDを確認できませんでした。');ids.add(id);
     if(!(current instanceof Blob)||!current.type.startsWith('image/')||current.size>maxBytes)throw failure('RangeError','保存する画像は1枚12MBまでです。');
     const old=previous.get(id),source=reference.crop?'edited':'original',assetKey=source==='edited'?editedKey(id):originalKey(id),original=reference.originalFile||current;
     if(!old){if(!(original instanceof Blob)||original.size>maxBytes)throw failure('RangeError','元の参照画像は1枚12MBまでです。');puts.push({key:originalKey(id),blob:original});}
     if(source==='edited'&&(!old||knownFiles.get(id)!==current))puts.push({key:assetKey,blob:current});
     next.push({id,...fileInfo(current),width:Number(reference.width)||0,height:Number(reference.height)||0,role:roles.has(reference.role)?reference.role:'support',crop:reference.crop?{...reference.crop}:null,assetKey,original:old?.original||fileInfo(original)});
    }
    const deletes=[...state.references.filter(r=>!ids.has(r.id)).flatMap(r=>[originalKey(r.id),editedKey(r.id)]),...next.filter(r=>!r.crop).map(r=>editedKey(r.id))];
    return {state:{...state,references:next},puts,deletes};
   },{shouldWrite});if(result.saved){knownFiles.clear();for(const r of snapshot)knownFiles.set(r.id,r.file);}return result;
   }catch(error){return resultError(error);}
  });
 }
 function reset(kind){return enqueue(async()=>{try{const result=await store.update(state=>kind==='profile'?{state:{...state,profile:empty().profile,profileEpoch:epoch()}}:{state:{...state,references:[],referenceEpoch:epoch()},deletes:state.references.flatMap(r=>[originalKey(r.id),editedKey(r.id)])});if(result.saved){if(kind==='profile')profileEpoch=result.state.profileEpoch;else{referenceEpoch=result.state.referenceEpoch;knownFiles.clear();}}return result;}catch(error){return resultError(error);}});}
 async function original(reference){const blob=await store.original(reference.id);if(!(blob instanceof Blob))throw failure('NotFoundError','元の参照画像を読み込めませんでした。');return file(blob,reference.original||fileInfo(reference.file));}
 return {load,saveProfile,saveReferences,resetProfile:()=>reset('profile'),resetReferences:()=>reset('references'),original,close:store.close};
}
