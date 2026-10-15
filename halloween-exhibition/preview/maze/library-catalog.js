import {validateArchive,safeURL,doorIdFor} from '../data-model.js?v=20261014-adventure2';
const asset=value=>{const valid=safeURL(value,{image:true});return valid?.startsWith('assets/')?'../'+valid:valid?.startsWith('./assets/')?'../'+valid.slice(2):valid;};
const articleURL=value=>{const valid=safeURL(value);if(!valid)return null;const u=new URL(valid);return u.hostname==='note.com'&&/^\/[^/]+\/n\/[^/]+\/?$/.test(u.pathname)?u.origin+u.pathname:null;};
export function libraryFromArchive(raw,requestedYear,supplemental={articles:[]}){
  const data=validateArchive(raw),years=data.years.map(y=>y.year).sort((a,b)=>b-a),selected=data.years.find(y=>y.year===requestedYear)||data.years.find(y=>y.year===years[0]);
  const entries=selected.entries.map((e,i)=>({e,i})).filter(({e})=>e.visible!==false).sort((a,b)=>(Number.isFinite(a.e.order)?a.e.order:a.i)-(Number.isFinite(b.e.order)?b.e.order:b.i)).map(({e})=>e);
  const creatorMap=new Map(data.creators.map(c=>[c.id,c])),seen=new Set(),creators=[];
  for(const e of entries){if(seen.has(e.creatorId))continue;seen.add(e.creatorId);const c=creatorMap.get(e.creatorId);creators.push({...c,avatar:asset(c.avatar)||asset(c.avatarSource)||'',profileURL:safeURL(c.profileURL)||''});}
  const articles=[],introductions=[];
  for(const [order,e] of entries.entries()){
    if(!['submitted','introduction'].includes(e.submissionStatus))continue;
    const found=new Set();
    for(const link of [...(e.works||[]),...(e.links||[])]){
      const url=articleURL(link.url);if(link.visible===false||!url||found.has(url))continue;found.add(url);
      const a={id:`${doorIdFor(e,`archive:${selected.year}`)}:${url.split('/').pop()}`,creatorId:e.creatorId,collection:'horror',year:selected.year,kind:e.submissionStatus==='introduction'?'企画紹介':'参加記事',title:e.title||link.title,image:asset(e.image)||'',url,order,visible:true};
      (e.submissionStatus==='introduction'?introductions:articles).push(a);
    }
  }
  const usedURLs=new Set([...articles,...introductions].map(a=>a.url));
  for(const extra of supplemental.articles||[]){
    const url=safeURL(extra.url);if(!url||extra.visible===false||!creatorMap.has(extra.creatorId)||usedURLs.has(url)||(extra.year&&extra.year!==selected.year))continue;
    usedURLs.add(url);articles.push({...extra,url,collection:'horror',image:safeURL(extra.image,{image:true})||'',visible:true});
  }
  return {schemaVersion:2,creators,articles,introductions,collections:[{id:'horror',name:'物語の書庫'}],years,selectedYear:selected.year};
}
