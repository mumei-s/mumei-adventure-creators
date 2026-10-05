import {bodyText,publicArticle,articleSignals} from './articles.js';
const safeID=id=>/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(id);
const text=(v,max=600)=>typeof v==='string'?v.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,max):'';
const entities=s=>s.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#(\d+);/g,(_,v)=>{const n=Number(v);return n<=0x10ffff?String.fromCodePoint(n):'';});
function meta(html,key){
 for(const tag of html.match(/<meta\b[^>]*>/gi)||[]){
 const attrs=Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gs)].map(m=>[m[1].toLowerCase(),entities(m[3])]));
 if(attrs.property===key||attrs.name===key)return text(attrs.content);
 }return '';
}
export const TOPICS=['共同マガジン','コミュニティ','メンバーシップ','子育て','育児','ワーママ','医療','福祉','介護','看護','イラスト','AI','創作','小説','エッセイ','詩','漫画','写真','音楽','料理','旅行','読書','映画','デザイン','アート','日記','仕事','働く','タイミー','副業','収益化','マーケティング','学習','教育','健康','スポーツ','ゲーム','ファッション','ハンドメイド','動物','自然'];
export function parsePublicProfile(id,profileJSON,contentsJSON,html=''){
 const payload=profileJSON?.data;
 const p=payload?.creator||payload||{};
 const name=text(p.name||p.nickname||meta(html,'og:title').replace(/｜note.*$/,'').replace(/\s*[-|]\s*note.*$/,''),140);
 const biography=text(p.profile||p.description||meta(html,'og:description')||meta(html,'description'),750);
 const articles=contentsJSON?.data?.contents||contentsJSON?.data?.notes||[];
 const titles=Array.isArray(articles)?articles.map(x=>text(x.name||x.title,100)).filter(Boolean).slice(0,8):[];
 if(!name)throw new Error('公開プロフィールを取得できませんでした。クリエイター名と活動内容を入力して続けられます。');
 const corpus=[biography,...titles].join(' ');
 const topics=TOPICS.filter(k=>k==='AI'?/\bAI\b/i.test(corpus):corpus.includes(k)).slice(0,12);
 return {id,name,biography,titles,topics,url:'https://note.com/'+id,fetchedAt:new Date().toISOString(),source:payload?'noteの公開プロフィール':'noteの公開プロフィールページ'};
}
async function remote(url,json=true,timeout=6000){
 const response=await fetch(url,{headers:{Accept:json?'application/json':'text/html','User-Agent':'HalloweenAtelier/6.0 (public creator profile reader)'},signal:AbortSignal.timeout(timeout),redirect:'error'});
 if(!response.ok)throw new Error('noteの公開情報を取得できませんでした。');
 const length=Number(response.headers.get('content-length'));if(length>2500000)throw new Error('プロフィールページが大きすぎます。');
 const source=await response.text();if(source.length>2500000)throw new Error('公開情報が大きすぎます。');return json?JSON.parse(source):source;
}
export async function readPublicProfile(id){
 if(!safeID(id))throw new Error('noteのID形式を確認してください。');
 const results=await Promise.allSettled([remote('https://note.com/api/v2/creators/'+id),remote('https://note.com/api/v2/creators/'+id+'/contents?kind=note&page=1')]);
 const profile=results[0].status==='fulfilled'?results[0].value:null;
 const contents=results[1].status==='fulfilled'?results[1].value:null;
 let parsed;try{parsed=parsePublicProfile(id,profile,contents);}catch{parsed=parsePublicProfile(id,profile,contents,await remote('https://note.com/'+id,false));}
 const candidates=(contents?.data?.contents||contents?.data?.notes||[]).filter(n=>/^n[a-f0-9]{12,32}$/i.test(n.key||'')&&publicArticle(n,id)).slice(0,4);
 const bodies=await Promise.allSettled(candidates.map(async n=>{const data=await remote('https://note.com/api/v3/notes/'+n.key,true,5000);const note=data?.data;if(!publicArticle(note,id))return null;const body=bodyText(note.body);return body?{key:n.key,title:text(note.name||n.name,100),url:'https://note.com/'+id+'/n/'+n.key,text:body}:null;}));
 const read=bodies.filter(r=>r.status==='fulfilled'&&r.value).map(r=>r.value);const inspiration=articleSignals(read,TOPICS);
 return {...parsed,topics:[...new Set([...parsed.topics,...inspiration.bodyTopics])].slice(0,20),inspiration,articles:read.map(({text:body,...a})=>({...a,characters:body.length,keywords:TOPICS.filter(t=>body.includes(t)).slice(0,12)})),bodyRead:{count:read.length,requested:candidates.length,characters:read.reduce((n,a)=>n+a.text.length,0),status:read.length===candidates.length?'complete':'partial'},source:parsed.source+'と公開記事本文'};
}
