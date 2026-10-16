import {doorIdFor,validDoorId} from '../data-model.js?v=20261014-doors1';

export const CREATOR_IDS=['ss_yr','koakumako','n_kazumai55633','mama_ca','naemotion','imota14','fond_holly3483','tenkai_notes','soh_style_work','clever_hare2654','glossy_guppy6230','aihan_days','cheeky_rhino7031','grand_daisy8632','real_hyena9474'];
export const STORAGE_KEY='halloween-exhibition:article-editor:v1';
export const clone=x=>JSON.parse(JSON.stringify(x));
export function safeURL(value,image=false){if(typeof value!=='string'||/[\u0000-\u001f\\]/.test(value))return null;const s=value.trim();if(image&&/^(?:\.\/)?assets\/[\w./-]+$/.test(s)&&!s.split('/').includes('..'))return s;try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
const fail=message=>{throw Error(message);};
const scopeFor=(collection,year)=>collection==='normal'?'evergreen':`archive:${Number(year)}`;
export function entryDoorId(e,collection,year){return collection==='horror'?e.id:doorIdFor(e,scopeFor(collection,year));}
function isCreatorProfile(e,link){if(!safeURL(link?.url))return false;const url=new URL(link.url);return url.hostname==='note.com'&&url.pathname.replace(/\/$/,'')===`/${e.creatorId}`;}
// Older pending introductions stored the creator profile in the first link slot.
// Keep that link as additional information, never present it as an unknown article URL.
export function getPrimaryLink(e){const first=e.links?.[0];if(first)return e.submissionStatus==='pending'&&isCreatorProfile(e,first)?null:first;return !e.doorId&&e.submissionStatus!=='pending'?e.works?.[0]||null:null;}
export function getExtraLinks(e){return e.submissionStatus==='pending'&&isCreatorProfile(e,e.links?.[0])?e.links||[]:(e.links||[]).slice(1);}
export function getURL(e,horror=false){return horror?e.url:getPrimaryLink(e)?.url||'';}
function creators(data){if(!Array.isArray(data.creators)||(data.creators.length<9||data.creators.length>CREATOR_IDS.length)||new Set(data.creators.map(c=>c.id)).size!==data.creators.length||CREATOR_IDS.slice(0,9).some(id=>!data.creators.some(c=>c.id===id))||data.creators.some(c=>!CREATOR_IDS.includes(c.id)))fail('参加者は登録済みの参加者IDを保ってください。');for(const c of data.creators)if(typeof c.name!=='string'||!c.name.trim())fail('参加者名が必要です。');}
function entry(e,horror=false){
  if(!e||!CREATOR_IDS.includes(e.creatorId))fail('参加者IDが不正です。');
  for(const key of ['title','message','description','image','imageAlt','theme','kind'])if(e[key]!==undefined&&typeof e[key]!=='string')fail(`${key}は文字列が必要です。`);
  if(typeof e.title!=='string'||!e.title.trim())fail('タイトルが必要です。');
  if(e.image&&!safeURL(e.image,true))fail('画像はHTTPS URLか assets/ 配下のパスが必要です。');
  if(e.visible!==undefined&&typeof e.visible!=='boolean')fail('表示設定が不正です。');
  if(e.order!==undefined&&(!Number.isFinite(e.order)||!Number.isInteger(e.order)||e.order<0))fail('表示順は0以上の整数が必要です。');
  for(const field of ['links','works'])if(e[field]!==undefined){
    if(!Array.isArray(e[field]))fail(`${field}の形式が不正です。`);
    for(const [index,link] of e[field].entries()){
      const pendingMain=!horror&&field==='links'&&index===0&&e.submissionStatus==='pending'&&link?.url==='';
      if(!link||typeof link.title!=='string'||(!pendingMain&&!safeURL(link.url)))fail('リンクはタイトルと安全なHTTPS URLが必要です。');
      if(link.visible!==undefined&&typeof link.visible!=='boolean')fail('リンクの表示設定が不正です。');
      if(link.order!==undefined&&(!Number.isInteger(link.order)||link.order<0))fail('リンクの表示順が不正です。');
    }
  }
  if(e.tags!==undefined&&(!Array.isArray(e.tags)||e.tags.some(x=>typeof x!=='string')))fail('タグの形式が不正です。');
  if(horror){
    if(typeof e.id!=='string'||!e.id.trim()||e.collection!=='horror'||!safeURL(e.url))fail('記事のID・書庫・HTTPS URLを確認してください。');
    if(e.year!==undefined&&e.year!==null&&(!Number.isInteger(e.year)||e.year<2000||e.year>9999))fail('年度が不正です。');
  }else{
    if(e.doorId!==undefined&&!validDoorId(e.doorId))fail('扉IDは120文字以内の英数字・ハイフン・アンダースコアにしてください。');
    if(e.submissionStatus!==undefined&&!['pending','submitted','introduction'].includes(e.submissionStatus))fail('掲載状態が不正です。');
    if(['submitted','introduction'].includes(e.submissionStatus)&&!safeURL(getURL(e)))fail('作品掲載・企画紹介には、メインの記事のHTTPS URLが必要です。');
  }
}
export function validateArchive(data){
  if(!data||data.schemaVersion!==1||!Array.isArray(data.years)||!data.years.length||!Array.isArray(data.evergreenEntries))fail('archive.json は schemaVersion: 1、years、evergreenEntries が必要です。');
  creators(data);const creatorIDs=new Set(data.creators.map(c=>c.id)),ys=new Set();
  for(const y of data.years){if(!Number.isInteger(y.year)||y.year<2000||y.year>9999||ys.has(y.year)||typeof y.title!=='string'||typeof y.description!=='string'||!Array.isArray(y.entries))fail('年度・見出し・説明・記事一覧を確認してください。');ys.add(y.year);}
  for(const {entries,scope} of [{entries:data.evergreenEntries,scope:'evergreen'},...data.years.map(y=>({entries:y.entries,scope:`archive:${y.year}`}))]){
    const ids=new Set();for(const e of entries){entry(e);if(!creatorIDs.has(e.creatorId))fail('記事の参加者IDがこのarchive.jsonに登録されていません。参加者情報を含むJSONを確認してください。');const id=doorIdFor(e,scope);if(ids.has(id))fail('扉IDが重複しています。同じ参加者の別記事には別の扉IDを使ってください。');ids.add(id);}
  }
  return data;
}
export function validateCatalog(data){if(!data||data.schemaVersion!==2||!Array.isArray(data.articles)||!Array.isArray(data.years)||!data.years.length||data.years.some(y=>!Number.isInteger(y)||y<2000||y>9999)||!Array.isArray(data.collections)||data.collections.length!==1||data.collections[0]?.id!=='horror')fail('catalog.json は schemaVersion: 2 の書庫データが必要です。');creators(data);const ids=new Set();for(const e of data.articles){entry(e,true);if(ids.has(e.id))fail('記事IDが重複しています。');ids.add(e.id);}return data;}
export function validateState(s){
  if(!s||s.editorVersion!==1)fail('編集ツールのバックアップ形式が不正です。');
  validateArchive(s.archive);validateCatalog(s.catalog);
  if(!Array.isArray(s.trash))fail('復元一覧の形式が不正です。');
  for(const item of s.trash){
    if(!item||!['normal','halloween','horror'].includes(item.collection)||!Number.isInteger(item.index)||item.index<0||typeof item.deletedAt!=='string'||!Number.isFinite(Date.parse(item.deletedAt)))fail('復元一覧の保存先・位置・削除日時が不正です。');
    if(item.collection==='halloween'&&(!Number.isInteger(item.year)||item.year<2000||item.year>9999))fail('復元一覧の年度が不正です。');
    entry(item.entry,item.collection==='horror');
    if(item.yearMetadata!==undefined){
      if(item.collection!=='halloween'||!item.yearMetadata||item.yearMetadata.year!==item.year||item.yearMetadata.entries!==undefined)fail('復元一覧の年度情報が不正です。');
      validateArchive({...s.archive,evergreenEntries:[],years:[{...item.yearMetadata,entries:[]}]});
    }
  }
  return s;
}
export function createState(archive,catalog){return validateState({editorVersion:1,archive:clone(archive),catalog:clone(catalog),trash:[],updatedAt:null});}
export function listEntries(s,collection,year){return collection==='horror'?s.catalog.articles:collection==='normal'?s.archive.evergreenEntries:s.archive.years.find(y=>y.year===Number(year))?.entries||[];}
function newDoorId(s,collection,year){
  const scope=scopeFor(collection,year),used=new Set(listEntries(s,collection,year).map(e=>doorIdFor(e,scope)));
  for(const item of s.trash)if(item.collection===collection&&scopeFor(item.collection,item.year)===scope)used.add(doorIdFor(item.entry,scope));
  let id;do{id=`door-${globalThis.crypto?.randomUUID?.()||`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,12)}`}`;}while(used.has(id));return id;
}
export function saveEntry(s,collection,year,index,values){
  const next=clone(s);let list=listEntries(next,collection,year);
  if(collection==='halloween'&&!next.archive.years.some(y=>y.year===Number(year))){next.archive.years.push({year:Number(year),title:`HALLOWEEN ${year}`,description:'',entries:[]});list=listEntries(next,collection,year);}
  const old=index===null?{}:list[index];if(!old)fail('編集対象が見つかりません。再選択してください。');
  const e={...old,creatorId:values.creatorId,title:values.title.trim(),image:values.image.trim(),order:Number(values.order),visible:values.visible};
  if(collection==='horror'){
    Object.assign(e,{id:old.id||`horror-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,collection:'horror',url:values.url.trim(),description:values.description,kind:old.kind||'作品'});if(values.year)e.year=Number(values.year);else delete e.year;
  }else{
    const primary=getPrimaryLink(old);
    e.doorId=index===null?newDoorId(next,collection,year):entryDoorId(old,collection,year);
    e.message=values.description;e.submissionStatus=values.submissionStatus||old.submissionStatus||'submitted';
    e.links=[{...primary,title:values.primaryLinkTitle??primary?.title??'記事を読む',url:values.url.trim(),visible:values.primaryVisible??primary?.visible??true,order:Number(values.primaryOrder??primary?.order??0)},...(values.extraLinks??getExtraLinks(old))];
    e.works=values.works??old.works??[];
  }
  if(index===null)list.push(e);else list[index]=e;next.updatedAt=new Date().toISOString();validateState(next);return next;
}
export function deleteEntry(s,collection,year,index){
  const next=clone(s),list=listEntries(next,collection,year);
  if(!['normal','halloween','horror'].includes(collection)||!Number.isInteger(index)||!list[index])fail('削除対象が見つかりません。');
  const item={collection,year:Number(year)||null,index,entry:list.splice(index,1)[0],deletedAt:new Date().toISOString()};
  if(collection==='halloween'){const {entries,...metadata}=next.archive.years.find(y=>y.year===Number(year));item.yearMetadata=metadata;}
  next.trash.push(item);next.updatedAt=new Date().toISOString();return validateState(next);
}
export function restoreEntry(s,index){
  validateState(s);const next=clone(s),item=next.trash[index];
  if(!Number.isInteger(index)||!item)fail('復元対象が見つかりません。');
  if(item.collection==='halloween'&&!next.archive.years.some(y=>y.year===item.year)){
    if(!item.yearMetadata)fail(`復元先の${item.year}年度がありません。「年度を追加」で同じ年度を作成してから復元してください。下書きは復元一覧に残っています。`);
    next.archive.years.push({...item.yearMetadata,entries:[]});
  }
  const list=listEntries(next,item.collection,item.year);list.splice(Math.min(item.index,list.length),0,item.entry);
  next.trash.splice(index,1);next.updatedAt=new Date().toISOString();return validateState(next);
}
export function importData(s,data){const next=clone(s);if(data.editorVersion===1)return validateState(clone(data));if(data.schemaVersion===1)next.archive=validateArchive(clone(data));else if(data.schemaVersion===2)next.catalog=validateCatalog(clone(data));else fail('archive.json、catalog.json または編集バックアップを選んでください。');next.updatedAt=new Date().toISOString();return validateState(next);}
export function publicFiles(s){validateState(s);return{archive:JSON.stringify(s.archive,null,2)+'\n',catalog:JSON.stringify(s.catalog,null,2)+'\n'};}
