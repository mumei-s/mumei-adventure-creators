import {readPublicProfile} from './profile.js';
const cache=new Map(),inflight=new Map(),clients=new Map();
const allowedOrigins=new Set(['https://mumei-s.github.io','http://127.0.0.1:4173','http://localhost:4173']);
export async function handler(req){
 const origin=req.headers.get('origin');
 const headers={'Content-Type':'application/json; charset=utf-8','X-Content-Type-Options':'nosniff','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'authorization, apikey, content-type'};
 if(origin&&!allowedOrigins.has(origin))return Response.json({error:'この公開先からの読み込みには対応していません。'},{status:403,headers});
 if(origin)headers['Access-Control-Allow-Origin']=origin;
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='GET')return Response.json({error:'GETのみ利用できます。'},{status:405,headers:{...headers,Allow:'GET, OPTIONS'}});
 const id=new URL(req.url).searchParams.get('id')||'';
 if(!/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(id))return Response.json({error:'noteのID形式を確認してください。'},{status:400,headers});
 const now=Date.now(),hit=cache.get(id);
 if(hit&&now-hit.time<300000)return Response.json(hit.profile,{headers});
 const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'anonymous';
 let client=clients.get(ip);if(!client||now-client.start>60000){client={start:now,count:0};clients.set(ip,client);}
 if(++client.count>20)return Response.json({error:'読み込みが集中しています。少し待つか、名前・活動を手入力して続けてください。'},{status:429,headers:{...headers,'Retry-After':'60'}});
 if(clients.size>500)clients.delete(clients.keys().next().value);
 try{
  let promise=inflight.get(id);if(!promise){promise=readPublicProfile(id);inflight.set(id,promise);promise.finally(()=>inflight.delete(id)).catch(()=>{});}
  const profile=await promise;cache.set(id,{time:now,profile});if(cache.size>200)cache.delete(cache.keys().next().value);
  return Response.json(profile,{headers});
 }catch{return Response.json({error:'noteの公開情報を取得できませんでした。名前・活動を手入力して続けられます。'},{status:502,headers});}
}
if(typeof Deno!=='undefined')Deno.serve(handler);
