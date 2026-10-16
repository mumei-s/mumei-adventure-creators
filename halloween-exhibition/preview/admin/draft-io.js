import {createState} from './model.js?v=20261017-draft-guard1';

// Keep the deadline around body parsing too: a response can arrive before a
// stalled JSON body. Aborting frees the outstanding reads after a timeout.
export async function fetchDraft({fetch:fetchImpl=globalThis.fetch,timeoutMs=15000}={}){
  const controller=new AbortController();let timer;
  const deadline=new Promise((_,reject)=>{
    timer=setTimeout(()=>{reject(Error('公開データの読み込みが時間内に完了しませんでした。通信を確認して再試行してください。'));controller.abort();},timeoutMs);
  });
  try{
    const data=Promise.all(['../data/archive.json','../maze/data/catalog.json'].map(async path=>{
      const response=await fetchImpl(path,{cache:'no-store',signal:controller.signal});
      if(!response.ok)throw Error(`${path} を読み込めませんでした（${response.status}）。`);
      return response.json();
    }));
    const [archive,catalog]=await Promise.race([data,deadline]);
    return createState(archive,catalog);
  }finally{clearTimeout(timer);controller.abort();}
}
