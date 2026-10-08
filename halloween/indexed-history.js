const databaseName='atelier-history-v1',storeName='states';
const failure=(name,message)=>new DOMException(message,name);

// Resolve only after the transaction commits, never after an individual put.
export function createIndexedHistoryStore({indexedDB=()=>globalThis.indexedDB,timeoutMs=5000}={}){
 let connection=null,opening=null;
 function close(){connection?.close();connection=null;opening=null;}
 function open(){
  if(connection)return Promise.resolve(connection);
  if(opening)return opening;
  const pending=new Promise((resolve,reject)=>{
   let request,settled=false;
   const finish=(error,db)=>{if(settled){db?.close();return;}settled=true;clearTimeout(timer);if(error)reject(error);else{connection=db;db.onversionchange=close;resolve(db);}};
   const timer=setTimeout(()=>finish(failure('TimeoutError','履歴データベースの開始が完了しませんでした。')),timeoutMs);
   try{
    const factory=typeof indexedDB==='function'?indexedDB():indexedDB;
    if(!factory?.open)throw failure('NotSupportedError','履歴データベースを利用できません。');
    request=factory.open(databaseName,1);
    request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(storeName))request.result.createObjectStore(storeName);};
    request.onsuccess=()=>finish(null,request.result);
    request.onerror=()=>finish(request.error||failure('UnknownError','履歴データベースを開けませんでした。'));
    request.onblocked=()=>finish(failure('InvalidStateError','別の画面が履歴データベースの更新を使用しています。'));
   }catch(error){finish(error);}
  });
  opening=pending;
  pending.catch(()=>{if(opening===pending)opening=null;});
  return pending;
 }
 async function transact(key,updater,{shouldWrite=()=>true}={}){
  if(updater&&!shouldWrite())return {saved:false,cancelled:true};
  const db=await open();
  if(updater&&!shouldWrite())return {saved:false,cancelled:true};
  return new Promise((resolve,reject)=>{
   let transaction,outcome=null,cause=null,settled=false;
   const finish=(error)=>{if(settled)return;settled=true;clearTimeout(timer);if(error)reject(error);else resolve(outcome);};
   const timer=setTimeout(()=>{cause=failure('TimeoutError','履歴の読み書きが完了しませんでした。');try{transaction?.abort();}catch{}finish(cause);},timeoutMs);
   try{
    transaction=db.transaction(storeName,updater?'readwrite':'readonly');
    transaction.oncomplete=()=>finish();
    transaction.onerror=()=>{cause=transaction.error||cause;};
    transaction.onabort=()=>{if(outcome?.cancelled)finish();else finish(cause||transaction.error||failure('AbortError','履歴の保存を完了できませんでした。'));};
    const store=transaction.objectStore(storeName),read=store.get(key);
    read.onerror=()=>{cause=read.error;};
    read.onsuccess=()=>{
     try{
      if(!updater){outcome=read.result??null;return;}
      if(!shouldWrite()){outcome={saved:false,cancelled:true};transaction.abort();return;}
      outcome=updater(read.result??null);
      if(outcome.write===false){outcome={...outcome,saved:false};return;}
      if(!shouldWrite()){outcome={saved:false,cancelled:true};transaction.abort();return;}
      const write=store.put(outcome.state,key);write.onerror=()=>{cause=write.error;};outcome={...outcome,saved:true};
     }catch(error){cause=error;try{transaction.abort();}catch{finish(error);}}
    };
   }catch(error){finish(error);}
  });
 }
 return {read:key=>transact(key,null),update:(key,updater,options)=>transact(key,updater,options),close};
}
