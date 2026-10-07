// Display-only source notes. These links are not image references or prompt data.
export function updateArtworkBasis(panel,entry,el){
 panel.hidden=!entry;
 panel.dataset.value=entry?.value||'';
 if(!entry){panel.replaceChildren();return;}
 const summary=el('summary',null,'作画の基準・照合資料'),body=el('div','artwork-basis-body');
 body.append(el('b','artwork-basis-value',entry.value),el('p','artwork-basis-status',entry.status==='synthesis'?'資料を基に組み合わせた作画基準':'技法資料に基づく作画基準'));
 for(const [field,title] of [['basis','描き方の基準'],['checks','描かれた結果の確認点'],['avoid','この基準で避ける描き方']]){
  if(!entry[field]?.length)continue;
  const list=el('ul');entry[field].forEach(text=>list.append(el('li',null,text)));
  body.append(el('h4',null,title),list);
 }
 if(entry.references?.length){
  body.append(el('h4',null,'照合資料'));
  const sources=el('ul','artwork-basis-sources');
  for(const source of entry.references){
   const row=el('li'),link=el('a',null,source.title);link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';
   row.append(el('span',null,source.kind==='work'?'作品資料：':'技法資料：'),link);
   if(source.note)row.append(el('p',null,source.note));
   sources.append(row);
  }
  body.append(sources);
 }
 panel.replaceChildren(summary,body);
}
