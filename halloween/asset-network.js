// Bound both the network request and its response body. A stalled transfer
// must release the production UI, and abort the underlying browser request.
export async function fetchAssetBlob(url,{fetchImpl=globalThis.fetch,timeoutMs=15000,unavailableMessage='見本画像を読み込めませんでした。通信を確認して再度お試しください。',timeoutMessage='見本画像の通信が時間内に終わりませんでした。通信を確認して再度お試しください。'}={}){
 if(typeof fetchImpl!=='function')throw new Error(unavailableMessage);
 const duration=Number.isFinite(timeoutMs)&&timeoutMs>0?Math.min(timeoutMs,60000):15000;
 const controller=new AbortController();let timer,timedOut=false;
 const transfer=Promise.resolve().then(async()=>{
  const response=await fetchImpl(url,{signal:controller.signal});
  if(!response?.ok)throw new Error(unavailableMessage);
  return response.blob();
 });
 const deadline=new Promise((resolve,reject)=>{timer=setTimeout(()=>{timedOut=true;controller.abort();reject(new Error(timeoutMessage));},duration);});
 try{return await Promise.race([transfer,deadline]);}
 catch(error){if(timedOut)throw new Error(timeoutMessage);if(error?.message===unavailableMessage)throw error;throw new Error(unavailableMessage);}
 finally{clearTimeout(timer);}
}
