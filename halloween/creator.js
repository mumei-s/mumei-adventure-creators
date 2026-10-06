// Merge article-derived signals without retaining or returning article bodies.
export function mergeCreator(previous,next){
 if(!previous)return next;
 const unique=a=>[...new Set(a.filter(Boolean))],inspiration={};
 for(const key of unique([...Object.keys(previous.inspiration||{}),...Object.keys(next.inspiration||{})])){if(key==='signals'){const signals=new Map((previous.inspiration?.signals||[]).map(x=>[x.label,{...x}]));for(const item of next.inspiration?.signals||[]){const old=signals.get(item.label);signals.set(item.label,{...item,score:(old?.score||0)+item.score});}inspiration.signals=[...signals.values()].sort((a,b)=>b.score-a.score);}else inspiration[key]=unique([...(previous.inspiration?.[key]||[]),...(next.inspiration?.[key]||[])]);}
 const articles=[...new Map([...(previous.articles||[]),...(next.articles||[])].map(a=>[a.key||a.url,a])).values()];
 if(inspiration.signals?.length){const strongest=inspiration.signals.slice(0,5);inspiration.labels=strongest.map(x=>x.label);inspiration.themes=unique(strongest.map(x=>x.theme));inspiration.imagery=strongest.map(x=>x.imagery);inspiration.phrases=strongest.flatMap(x=>x.phrases);}
 return {...previous,topics:unique([...(previous.topics||[]),...(next.topics||[])]),titles:unique([...(previous.titles||[]),...(next.titles||[])]),inspiration,articles,pagination:next.pagination,bodyRead:{count:articles.length,requested:(previous.bodyRead?.requested||0)+(next.bodyRead?.requested||0),characters:articles.reduce((sum,a)=>sum+(a.characters||0),0),status:previous.bodyRead?.status==='partial'||next.bodyRead?.status==='partial'?'partial':'complete'}};
}
