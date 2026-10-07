import {bodyText,publicArticle,articleSignals,articleEvidence} from './articles.js';
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
 const titles=Array.isArray(articles)?articles.map(x=>text(x.name||x.title,100)).filter(Boolean):[];
 if(!name)throw new Error('公開プロフィールを取得できませんでした。クリエイター名と活動内容を入力して続けられます。');
 const corpus=[biography,...titles].join(' ');
 const topics=TOPICS.filter(k=>k==='AI'?/\bAI\b/i.test(corpus):corpus.includes(k)).slice(0,12);
 return {id,name,biography,titles,topics,url:'https://note.com/'+id,fetchedAt:new Date().toISOString(),source:payload?'noteの公開プロフィール':'noteの公開プロフィールページ'};
}
async function remote(url,json=true,timeout=6000,signal){
 const response=await fetch(url,{headers:{Accept:json?'application/json':'text/html','User-Agent':'HalloweenAtelier/6.0 (public creator profile reader)'},signal:signal?AbortSignal.any([signal,AbortSignal.timeout(timeout)]):AbortSignal.timeout(timeout),redirect:'error'});
 if(!response.ok)throw new Error('noteの公開情報を取得できませんでした。');
 const length=Number(response.headers.get('content-length'));if(length>2500000)throw new Error('プロフィールページが大きすぎます。');
 const source=await response.text();if(source.length>2500000)throw new Error('公開情報が大きすぎます。');return json?JSON.parse(source):source;
}
export async function readPublicProfile(id,page=1){
 if(!safeID(id))throw new Error('noteのID形式を確認してください。');
 if(!Number.isSafeInteger(page)||page<1)throw new Error('ページ形式を確認してください。');
 const results=await Promise.allSettled([remote('https://note.com/api/v2/creators/'+id),remote('https://note.com/api/v2/creators/'+id+'/contents?kind=note&page='+page)]);
 const profile=results[0].status==='fulfilled'?results[0].value:null;
 if(results[1].status!=='fulfilled')throw new Error('クリエイター情報を整えられませんでした。');
 const contents=results[1].value;
 let parsed;try{parsed=parsePublicProfile(id,profile,contents);}catch{parsed=parsePublicProfile(id,profile,contents,await remote('https://note.com/'+id,false));}
 const notes=contents?.data?.contents||contents?.data?.notes||[];
 if(!Array.isArray(notes))throw new Error('クリエイター情報を整えられませんでした。');
 const candidates=notes.filter(n=>/^n[a-f0-9]{12,32}$/i.test(n.key||'')&&publicArticle(n,id));
 const bodies=new Array(candidates.length),deadline=AbortSignal.timeout(40000);
 // A small worker pool reads every public article on this page. Returning
 // resumable pages keeps the request within the Edge Function runtime budget.
 let cursor=0;
 const worker=async()=>{while(cursor<candidates.length){const index=cursor++,n=candidates[index];try{let data;for(let attempt=0;attempt<2;attempt++){try{data=await remote('https://note.com/api/v3/notes/'+n.key,true,6500,deadline);break;}catch(error){if(deadline.aborted||attempt===1)throw error;}}const note=data?.data;if(!publicArticle(note,id)){bodies[index]={status:'unavailable',key:n.key};continue;}const body=bodyText(note.body);if(!body){bodies[index]={status:'rejected',key:n.key};continue;}const article={key:n.key,title:text(note.name||n.name,100),url:'https://note.com/'+id+'/n/'+n.key,text:body,characters:body.length,keywords:TOPICS.filter(topic=>body.includes(topic)),...articleEvidence(body)};bodies[index]={status:'fulfilled',value:article};}catch{bodies[index]={status:'rejected',key:n.key};}}};
 await Promise.all(Array.from({length:Math.min(6,candidates.length)},worker));
 const read=bodies.filter(result=>result.status==='fulfilled').map(result=>result.value),inspiration=articleSignals(read,TOPICS),failedKeys=bodies.filter(result=>result.status==='rejected').map(result=>result.key);
 const unavailable=notes.length-candidates.length+bodies.filter(result=>result.status==='unavailable').length;
 return {...parsed,topics:[...new Set([...parsed.topics,...inspiration.bodyTopics])],inspiration,articles:read,sourceEvidence:read.map(({text:body,keywords,...article})=>article),bodyRead:{count:read.length,requested:candidates.length,listed:notes.length,unavailable,characters:read.reduce((sum,article)=>sum+article.characters,0),failedKeys,pages:[page],status:failedKeys.length?'partial':'complete'},pagination:{page,nextPage:contents.data.isLastPage===true||contents.data.is_last_page===true||notes.length===0?null:page+1,keys:notes.map(note=>note.key).filter(Boolean)},source:parsed.source+'と公開記事本文'};
}
