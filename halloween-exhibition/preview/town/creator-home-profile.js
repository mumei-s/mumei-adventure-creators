/** Current exhibition records supply identity and work links; homes add only scenery. */
function officialProfile(value,id){try{const url=new URL(value);return url.protocol==='https:'&&url.hostname==='note.com'&&!url.port&&!url.username&&!url.password&&url.pathname.replace(/\/$/,'')===`/${id}`?url.href:null;}catch{return null;}}
function articleURL(value){try{const url=new URL(value);return url.protocol==='https:'&&url.hostname==='note.com'&&!url.port&&!url.username&&!url.password&&/^\/[^/]+\/n\/[a-z0-9]+\/?$/.test(url.pathname)?url.href:null;}catch{return null;}}
export function creatorHomeProfile(archive,creatorId,year){
 const creator=archive?.creators?.find(person=>person.id===creatorId);if(!creator)return null;
 const edition=archive.years?.find(item=>item.year===year)||archive.years?.reduce((latest,item)=>!latest||item.year>latest.year?item:latest,null);
 const works=[],seen=new Set();for(const entry of edition?.entries||[]){
  if(entry.creatorId!==creatorId||entry.visible===false||entry.submissionStatus==='pending')continue;
  for(const item of [...(entry.works||[]),...(entry.links||[])]){const url=articleURL(item.url);if(item.visible===false||!url||seen.has(url))continue;seen.add(url);works.push({title:item.title||entry.title||'参加作品',url,image:item.image||entry.image||null,imageAlt:item.imageAlt||entry.imageAlt||entry.title||'',introduction:entry.role==='host'||entry.submissionStatus==='introduction'});}
 }
 return {id:creator.id,name:creator.name,avatar:creator.avatar||null,profileURL:officialProfile(creator.profileURL,creatorId),works,pending:!works.some(work=>!work.introduction)};
}
