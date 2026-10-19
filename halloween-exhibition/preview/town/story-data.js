import {isInPalaceForecourt} from './palace-forecourt.js?v=20261019-journey1';
import {createCreatorQuarter,CREATOR_HOMES,CREATOR_QUARTER_ID,CREATOR_QUARTER_CONNECTION} from './creator-homes.js?v=20261019-homes2';
import {createCreatorHomeInteriors} from './creator-home-interiors.js?v=20261019-interiors1';
// The lantern town, its residents and story are original fiction. Real exhibitors
// are visitors supplied separately by the exhibition; no submission is invented.
export const TOWN_VERSION = 1;
export const TOWN_START_MAP = 'lantern-town';
export const TOWN_TITLE = '星灯りの街';

export const TOWN_ITEMS = {
  tonic: {id:'tonic',name:'星蜜の小瓶',description:'戦闘中に体力を28回復する。',price:10},
  festivalBread: {id:'festivalBread',name:'灯守への焼きたてパン',description:'パン屋から灯守へ届ける包み。'},
  wick: {id:'wick',name:'月糸の灯芯',description:'街の灯籠に灯を戻すための特別な糸。'},
  bronzeKey: {id:'bronzeKey',name:'水門の真鍮鍵',description:'運河と時計塔への道を開く鍵。'},
  gear: {id:'gear',name:'星歯車',description:'時計工房で調律した水門の部品。'},
  moonwater: {id:'moonwater',name:'月映しの水',description:'庭園の泉から分けてもらった、霧を鎮める水。'},
  ribbon: {id:'ribbon',name:'迷子の仮面のリボン',description:'猫のコハクが届けてくれた仮面飾り。'},
  starCharm: {id:'starCharm',name:'三ツ星の護符',description:'星印を巡った記念。最大体力が12増える。'},
};

export const TOWN_ENEMIES = {
  'canal-mist': {id:'canal-mist',name:'水鏡のいたずら霧',kind:'mist',maxHp:42,power:8,coins:14,intro:'泉の霧が丸くふくらみ、あなたの灯りをまねして踊りだした。',intent:['mist','strike','gather','wave'],rewardFlag:'gardenVictory'},
  'clock-shadow': {id:'clock-shadow',name:'十二時の忘れ影',kind:'clock',maxHp:96,power:11,coins:26,intro:'止まった時計から、祭りの時間を忘れた影がこぼれ出す。',intent:['strike','gather','wave','mist'],rewardFlag:'clockVictory'},
};

export const TOWN_NPCS = [
  {id:'keeper',name:'灯守 リュカ',role:'門の灯守',x:15.5,z:8.5,mapId:'lantern-town',appearance:'keeper',fictional:true},
  {id:'baker',name:'パン屋 ミレット',role:'月麦ベーカリー',x:7.5,z:20.5,mapId:'lantern-town',appearance:'baker',fictional:true},
  {id:'boatwarden',name:'船番 サザ',role:'運河の案内人',x:34.5,z:27.5,mapId:'lantern-town',appearance:'sailor',fictional:true},
  {id:'gardener',name:'庭師 ネム',role:'月映し庭園',x:51.5,z:39.5,mapId:'lantern-town',appearance:'gardener',fictional:true},
  {id:'cat',name:'猫 コハク',role:'街を見回る猫',x:17.5,z:35.5,mapId:'lantern-town',appearance:'cat',fictional:true},
  {id:'masked',name:'仮面職人 セラ',role:'仮面の露店',x:13.5,z:16.5,mapId:'lantern-town',appearance:'maskmaker',fictional:true},
  {id:'waxkeeper',name:'灯芯屋 トワ',role:'月糸の店',x:9.5,z:5.5,mapId:'candle-shop',appearance:'merchant',fictional:true},
  {id:'clocksmith',name:'時計師 オル',role:'星歯車工房',x:6.5,z:5.5,mapId:'workshop',appearance:'clocksmith',fictional:true},
  {id:'archivist',name:'司書 フィオ',role:'夜の書庫',x:12.5,z:5.5,mapId:'library',appearance:'archivist',fictional:true},
  {id:'innkeeper',name:'宿屋 アンネ',role:'三日月亭',x:9.5,z:5.5,mapId:'inn',appearance:'innkeeper',fictional:true},
  {id:'creator-street-guide',name:'作品巡りの案内人 ミラ',role:'参加者の家への道案内',x:21.5,z:34.5,mapId:'lantern-town',appearance:'gardener',fictional:true,dialogue:'参加者の家とアトリエは、すぐ北東の光る案内門から！ 広場の床の矢印と「参加者の家・アトリエ」の看板をたどってね。門をくぐると、クリエイターたちの通りへ続いています。家の玄関から制作部屋に入り、本人の作品を読めます。'},
];

function outdoor() {
  const width=64,height=48;
  const cells=Array.from({length:height},(_,z)=>Array.from({length:width},(_,x)=>x===0||z===0||x===width-1||z===height-1?'#':'g'));
  const fill=(x,z,w,h,c)=>{for(let j=z;j<z+h;j++)for(let i=x;i<x+w;i++)cells[j][i]=c;};
  [8,13,26,38,43].forEach(z=>fill(1,z,62,2,'.'));
  [14,29,33,48].forEach(x=>fill(x,6,2,40,'.'));
  fill(24,18,17,15,'p'); fill(31,6,2,41,'~');
  [6,8,13,26,38,43].forEach(z=>fill(30,z,4,2,'='));
  fill(43,31,17,12,'f'); fill(46,34,10,7,'g'); fill(48,31,2,13,'.'); fill(43,38,17,2,'.');
  // The pullback forecourt is a continuous walkable plaza; the canal starts to its south.
  for(let z=1;z<height-1;z++)for(let x=1;x<width-1;x++)if('~='.includes(cells[z][x])&&isInPalaceForecourt({x:x+.5,z:z+.5}))cells[z][x]='p';
  const buildings=[
    {id:'castle',kind:'castle',label:'星灯りの城',x:25,z:1,w:14,h:5,door:{x:32.5,z:6.5}},
    {id:'candle-shop',kind:'shop',label:'月糸の店',x:5,z:10,w:6,h:3,door:{x:8.5,z:13.5}},
    {id:'bakery',kind:'bakery',label:'月麦ベーカリー',x:4,z:16,w:7,h:4,door:{x:7.5,z:20.5}},
    {id:'workshop',kind:'workshop',label:'星歯車工房',x:18,z:23,w:5,h:5,door:{x:20.5,z:28.5}},
    {id:'library',kind:'library',label:'夜の書庫',x:44,z:23,w:9,h:6,door:{x:48.5,z:29.5}},
    {id:'inn',kind:'inn',label:'三日月亭',x:5,z:30,w:8,h:5,door:{x:8.5,z:35.5}},
    {id:'clocktower',kind:'clocktower',label:'十二時の時計塔',x:51,z:3,w:8,h:5,door:{x:54.5,z:8.5}},
  ];
  buildings.forEach(b=>{fill(b.x,b.z,b.w,b.h,'b');cells[Math.floor(b.door.z)][Math.floor(b.door.x)]='.';});
  // Deliberate paths join every south-facing threshold to the public road network.
  for(const b of buildings){const z=Math.floor(b.door.z),x=Math.floor(b.door.x);for(let i=Math.min(x,14);i<=Math.max(x,14);i++)if(cells[z][i]!=='b'&&cells[z][i]!=='~')cells[z][i]='.';}
  const targets=[
    {id:'castle-exit',name:'城へ戻る',label:'城へ戻る',type:'exit',kind:'exit',x:32.5,z:6.5},
    {id:'lamp-market',name:'市場の灯籠',label:'市場の灯籠を調べる',type:'object',kind:'lantern',x:14.5,z:18.5},
    {id:'lamp-plaza',name:'広場の灯籠',label:'広場の灯籠を調べる',type:'object',kind:'lantern',x:27.5,z:26.5},
    {id:'lamp-garden',name:'庭園の灯籠',label:'庭園の灯籠を調べる',type:'object',kind:'lantern',x:52.5,z:38.5},
    {id:'moon-pool',name:'月映しの泉',label:'泉を調べる',type:'object',kind:'pool',x:54.5,z:35.5},
    {id:'sluice',name:'古い水門',label:'水門を調べる',type:'object',kind:'sluice',x:34.5,z:39.5},
    {id:'stamp-market',name:'市場の星印',label:'星印を集める',type:'object',kind:'star',x:12.5,z:20.5},
    {id:'stamp-canal',name:'運河の星印',label:'星印を集める',type:'object',kind:'star',x:35.5,z:29.5},
    {id:'stamp-garden',name:'庭園の星印',label:'星印を集める',type:'object',kind:'star',x:57.5,z:40.5},
    {id:'fountain',name:'星灯りの噴水',label:'噴水を眺める',type:'object',kind:'fountain',x:37.5,z:22.5},
    {id:'bench',name:'運河のベンチ',label:'少し休む',type:'object',kind:'bench',x:42.5,z:23.5},
  ];
  const portals=buildings.filter(b=>['candle-shop','workshop','library','inn','clocktower'].includes(b.id)).map(b=>({id:`enter-${b.id}`,name:`${b.label}に入る`,label:`${b.label}に入る`,type:'portal',kind:'door',x:b.door.x,z:b.door.z,to:b.id,spawn:{x:9.5,z:12.5}}));
  portals.push({id:'enter-creator-quarter',name:'参加者の家・アトリエへ',label:'参加者の家・アトリエへ入る',type:'portal',kind:'door',...CREATOR_QUARTER_CONNECTION.street,to:CREATOR_QUARTER_ID,spawn:{...CREATOR_QUARTER_CONNECTION.quarterArrival}});
  portals.push({id:'enter-creator-quarter-south',name:'参加者の家・南の小径',label:'南の小径から参加者の家へ',type:'portal',kind:'door',...CREATOR_QUARTER_CONNECTION.southStreet,to:CREATOR_QUARTER_ID,spawn:{...CREATOR_QUARTER_CONNECTION.quarterArrival}});
  const occupied=[...targets,...portals,...TOWN_NPCS.filter(n=>n.mapId===TOWN_START_MAP)],decorations=[];
  for(let z=3;z<46;z+=4)for(const x of [2,12,50,61])if(cells[z][x]==='g'&&!occupied.some(p=>Math.hypot(p.x-x-.5,p.z-z-.5)<2))decorations.push({id:`tree-${x}-${z}`,kind:(x+z)%3?'tree':'autumnTree',x:x+.5,z:z+.5,radius:.34});
  for(const [x,z]of [[11,15],[12,28],[17,21],[24,34],[10,24],[5,27]])if(cells[z][x]!=='b')decorations.push({id:`stall-${x}-${z}`,kind:'market',x:x+.5,z:z+.5,radius:.42});
  for(const [x,z]of [[26,34],[39,30]])decorations.push({id:`statue-${x}-${z}`,kind:'statue',x:x+.5,z:z+.5,radius:.36});
  for(const [x,z]of [[16.5,6.5],[48.5,10.5],[16.5,13.5],[24.5,23.5],[11.5,27.5],[35.5,26.5],[48.5,15.5],[46.5,38.5],[58.5,38.5]])decorations.push({id:`lamp-${x}-${z}`,kind:'lamp',x,z,radius:.12});
  return {id:TOWN_START_MAP,name:TOWN_TITLE,outdoor:true,width,height,tiles:cells.map(r=>r.join('')),spawn:{x:32.5,z:7.5},buildings,targets,portals,decorations:decorations.filter(p=>!isInPalaceForecourt(p,p.radius||0)),npcs:TOWN_NPCS.filter(n=>n.mapId===TOWN_START_MAP),
   routePath:[{x:29.5,z:16.5},{x:27.5,z:20.5},{x:27.5,z:24.5},{x:24.5,z:27.5},{...CREATOR_QUARTER_CONNECTION.street}],
   routeSigns:[{id:'creator-route-plaza',x:27.5,z:24.5,label:'参加者の家・アトリエ',sublabel:'光る矢印をたどって、この先の門へ ↓',angle:Math.PI},{id:'creator-route-gate',x:24.5,z:28.5,label:'クリエイターたちが待っています',sublabel:'この門から16人の家へ ↓',angle:Math.PI}],
   districts:[{name:'城門の坂',x:32,z:8},{name:'月麦市場',x:12,z:18},{name:'星灯り広場',x:27,z:22},{name:'硝子の運河',x:34,z:30},{name:'月映し庭園',x:50,z:38},{name:'時計塔通り',x:54,z:10},{name:'参加者の家・アトリエ入口',...CREATOR_QUARTER_CONNECTION.street}]};
}
function interior(id,name,door,kind) {
  const width=20,height=16,cells=Array.from({length:height},(_,z)=>Array.from({length:width},(_,x)=>x===0||x===width-1||z===0||z===height-1?'#':'i'));
  const furniture=[];
  for(const x of [2,14]){for(let z=2;z<7;z++)for(let i=x;i<x+3;i++)cells[z][i]='#';furniture.push({kind:kind==='library'?'bookshelf':kind==='inn'?'bed':'counter',x,z:2,w:3,h:5});}
  const targets=id==='workshop'?[{id:'gear-console',name:'三色の調律盤',label:'調律盤を調べる',type:'object',kind:'console',x:9.5,z:3.5}]:id==='library'?[{id:'river-book',name:'水門と三つの星',label:'水門の記録を読む',type:'object',kind:'book',x:9.5,z:3.5}]:id==='clocktower'?[{id:'clock-heart',name:'止まった大時計',label:'大時計を調べる',type:'object',kind:'clock',x:9.5,z:4.5}]:[];
  return {id,name,outdoor:false,width,height,tiles:cells.map(r=>r.join('')),spawn:{x:9.5,z:12.5},buildings:[],decorations:[],furniture,targets,npcs:TOWN_NPCS.filter(n=>n.mapId===id),portals:[{id:`leave-${id}`,name:'街へ戻る',label:'街へ戻る',type:'portal',kind:'door',x:9.5,z:14.5,to:TOWN_START_MAP,spawn:{x:door.x,z:door.z+.8}}],districts:[]};
}
const town=outdoor();
export const TOWN_MAPS=Object.fromEntries([town,createCreatorQuarter(),...createCreatorHomeInteriors(CREATOR_HOMES),...town.buildings.filter(b=>['candle-shop','workshop','library','inn','clocktower'].includes(b.id)).map(b=>interior(b.id,b.label,b.door,b.kind))].map(m=>[m.id,m]));
export const TOWN_BUILDINGS=town.buildings;
export const TOWN_LAMPS=['lamp-market','lamp-plaza','lamp-garden'];
export const TOWN_STAMPS=['stamp-market','stamp-canal','stamp-garden'];
export const TOWN_QUESTS=[
  {id:'lights',title:'第一幕　消えた街灯と焼きたての約束'},
  {id:'river',title:'第二幕　逆さの運河と三色の歯車'},
  {id:'clock',title:'第三幕　十二時をなくした時計塔'},
  {id:'mask',title:'寄り道　猫コハクと迷子のリボン'},
  {id:'stars',title:'寄り道　三つの星をたどって'},
];
export function getTownMap(id=TOWN_START_MAP){return TOWN_MAPS[id]||TOWN_MAPS[TOWN_START_MAP];}
export function isTownWalkable(mapOrId,x,z,radius=.19){
  const map=typeof mapOrId==='string'?getTownMap(mapOrId):mapOrId;
  if(!map||!Number.isFinite(x)||!Number.isFinite(z))return false;
  for(const ox of [-radius,radius])for(const oz of [-radius,radius]){const tile=map.tiles[Math.floor(z+oz)]?.[Math.floor(x+ox)];if(!tile||'#b~'.includes(tile))return false;}
  if(map.decorations?.some(p=>p.radius>0&&Math.hypot(p.x-x,p.z-z)<p.radius+radius))return false;
  return true;
}
export function mapTargets(mapId){const map=getTownMap(mapId);return [...map.npcs.map(n=>({...n,label:`${n.name}と話す`,type:'npc',kind:'npc'})),...map.targets,...map.portals];}
