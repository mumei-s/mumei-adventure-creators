import {compileCharacterRoster,compileCompanions,characterAssetPath} from '../maze/creator-runtime.js';

export function noteProfileURL(value){
 try{const url=new URL(value);return url.protocol==='https:'&&url.hostname==='note.com'&&!url.port&&!url.username&&!url.password&&/^\/[a-zA-Z0-9_-]+\/?$/.test(url.pathname)?url.href:null;}catch{return null;}
}
export function portraitURL(value,base){
 if(typeof value!=='string')return null;
 try{const url=new URL(value,new URL('../',base)),home=new URL('../',base);return (url.origin===home.origin&&url.pathname.startsWith(home.pathname+'assets/portraits/')||url.protocol==='https:'&&url.hostname==='assets.st-note.com')&&!url.username&&!url.password?url.href:null;}catch{return null;}
}
export function spriteURL(asset,base){
 if(!characterAssetPath(asset?.src))return null;
 const url=new URL(asset.src,new URL('../maze/',base));if(asset.sha256)url.searchParams.set('v',asset.sha256.slice(0,12));return url.href;
}
export function comparisonEntries(archive,manifest,year){
 const roster=compileCharacterRoster(archive,manifest,year),creators=new Map((archive.creators||[]).map(creator=>[creator.id,creator]));
 const actors=[...(roster.hero?[roster.hero]:[]),...compileCompanions(manifest).map(actor=>({...actor,creatorId:'ss_yr',label:'黒猫'})),...roster.npcs];
 const active=new Set((archive.years||[]).find(item=>item.year===roster.year)?.entries.filter(entry=>entry.visible!==false).map(entry=>entry.creatorId)||[]);
 const result=actors.map(actor=>{const creator=creators.get(actor.creatorId);return {...actor,name:creator?.name||actor.label,avatar:creator?.avatar,profileURL:noteProfileURL(creator?.profileURL),ready:true};});
 const readyCreators=new Set(result.map(actor=>actor.creatorId));for(const creatorId of active){if(readyCreators.has(creatorId))continue;const creator=creators.get(creatorId);if(creator)result.push({id:'pending-'+creatorId,creatorId,name:creator.name,label:creator.name,avatar:creator.avatar,profileURL:noteProfileURL(creator.profileURL),ready:false});}
 return result;
}
