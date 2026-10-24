/** Imagined atelier homes inspired by approved exhibition characters and public
 * article/profile motifs. These are game scenery, never anyone's real address. */
export const CREATOR_QUARTER_ID='creator-quarter';
// Save schema stays v1: this independent layout revision migrates only exterior
// coordinates. House identities, room coordinates and story progress stay intact.
export const CREATOR_QUARTER_LAYOUT_VERSION=2;
export const CREATOR_QUARTER_LAYOUT=Object.freeze({width:80,height:88,columns:4,pitchX:18,pitchZ:17,roadWidth:5});
export function migrateCreatorQuarterPosition(position,layoutVersion){
 if(!position||!Number.isFinite(position.x)||!Number.isFinite(position.z))return null;
 if((!Number.isFinite(layoutVersion)||layoutVersion<CREATOR_QUARTER_LAYOUT_VERSION)&&position.x===23.5&&(position.z===44.5||position.z===46.5))return {...(position.z===44.5?CREATOR_QUARTER_CONNECTION.quarterArrival:CREATOR_QUARTER_CONNECTION.quarterExit)};
 if(Number.isFinite(layoutVersion)&&layoutVersion>=CREATOR_QUARTER_LAYOUT_VERSION)return {x:position.x,z:position.z};
 const remap=(value,oldPoints,newPoints)=>{
  if(value<oldPoints[0]||value>oldPoints.at(-1))return NaN;
  for(let i=1;i<oldPoints.length;i++)if(value<=oldPoints[i])return newPoints[i-1]+(value-oldPoints[i-1])/(oldPoints[i]-oldPoints[i-1])*(newPoints[i]-newPoints[i-1]);
 };
 // Keep each original building's seven-by-five footprint rigid while widening
 // the spaces between lots, rather than stretching the houses themselves.
 return {x:remap(position.x,[0,3,10,14,21,25,32,36,43,48],[0,7,14,25,32,43,50,61,68,80]),
  z:remap(position.z,[0,3,8,8.5,14,19,19.5,25,30,30.5,36,41,41.5,44.5,46.5,48],[0,6,11,11.5,23,28,28.5,40,45,45.5,57,62,62.5,82.5,85.5,88])};
}
export const CREATOR_QUARTER_CONNECTION=Object.freeze({
 street:Object.freeze({x:24.5,z:30.5}),streetArrival:Object.freeze({x:24.5,z:32}),
 southStreet:Object.freeze({x:18.5,z:43.5}),
 quarterArrival:Object.freeze({x:39.5,z:82.5}),quarterExit:Object.freeze({x:39.5,z:85.5}),
});

// Open avenues are paired, not extra houses or narrow archways. Arrivals sit
// at least three tiles inside each street, away from reverse transfer triggers.
export const CREATOR_AREA_ROUTES=Object.freeze([
 {id:'east',label:'東の並木道',street:{x:60.5,z:39.5},streetArrival:{x:57.5,z:39.5},quarter:{x:77.5,z:48.5},quarterArrival:{x:73.5,z:48.5},toQuarterFacing:'left',toStreetFacing:'left',angle:Math.PI/2},
 {id:'west',label:'西の並木道',street:{x:2.5,z:26.5},streetArrival:{x:5.5,z:26.5},quarter:{x:2.5,z:31.5},quarterArrival:{x:6.5,z:31.5},toQuarterFacing:'right',toStreetFacing:'right',angle:-Math.PI/2},
 {id:'south',label:'南の並木道',street:{x:48.5,z:45.5},streetArrival:{x:48.5,z:42.5},quarter:{x:57.5,z:85.5},quarterArrival:{x:57.5,z:81.5},toQuarterFacing:'up',toStreetFacing:'up',angle:Math.PI},
].map(route=>Object.freeze(route)));
export const creatorAreaPortals=(fromQuarter=false)=>CREATOR_AREA_ROUTES.map(route=>({
 id:(fromQuarter?'leave':'enter')+'-creator-area-'+route.id,name:fromQuarter?'星灯りの街へ・'+route.label:'クリエイターエリアへ・'+route.label,
 label:fromQuarter?'星灯りの街へ歩く':'クリエイターエリアへ歩く',type:'portal',kind:'open-path',openPassage:true,
 ...(fromQuarter?route.quarter:route.street),to:fromQuarter?'lantern-town':CREATOR_QUARTER_ID,
 spawn:{...(fromQuarter?route.streetArrival:route.quarterArrival)},arrivalFacing:fromQuarter?route.toStreetFacing:route.toQuarterFacing,
}));
export const creatorAreaSigns=(fromQuarter=false)=>CREATOR_AREA_ROUTES.map(route=>({
 id:'area-sign-'+route.id,openPath:true,x:(fromQuarter?route.quarter:route.street).x+(route.id==='south'?(fromQuarter?3.5:2):0),z:(fromQuarter?route.quarter:route.street).z+(fromQuarter&&route.id==='west'?3.5:route.id==='south'?0:fromQuarter?-3.5:-2),label:fromQuarter?'星灯りの街へ':'クリエイターエリアへ',sublabel:route.label+' · 道を進むと移動',angle:route.angle,
}));

export const CREATOR_HOMES_NOTICE='作者のキャラクターや作品をイメージした、ゲーム内の架空の家です。実在する住まいではありません。';
// Order follows the current exhibition roster, including profile-only participants.
const designs=[
 ['ss_yr','無名S note','lantern-cat','黒猫とランタンのアトリエ','#41495e','#302d59','#e7bc70','lantern'],
 ['koakumako','こあく まこ','devil','小悪魔の煉瓦アトリエ','#c28691','#49293e','#e9ae73','bat-wing'],
 ['n_kazumai55633','ミナト汐','tide','汐風と光の制作アトリエ','#b5d7dc','#315c80','#ecd8b2','wave-star'],
 ['mama_ca','Pajama de mama','candy','お菓子色の暮らしのアトリエ','#edcfb5','#b85d80','#a9d6bb','candy'],
 ['naemotion','なえも','story','余白の庭と物語の書斎','#cad4b7','#6b4a69','#d8ab6e','open-book'],
 ['imota14','たけち','bread','パン窓のある観察日記工房','#dfc39c','#9c513d','#f3d99b','bread-loaf'],
 ['fond_holly3483','やまこん','companions','紺と桃のふたつ星荘','#c4bfd2','#34466e','#e1a4b7','twin-stars'],
 ['tenkai_notes','天界記録','moon','午前零時の黒猫書斎','#cad0e1','#39496e','#e7ca7c','moon-cat'],
 ['soh_style_work','まりも','cat-garden','猫と若葉の庭の家','#a8c7b4','#507464','#e5c995','cat-leaf'],
 ['clever_hare2654','カモミール','chamomile','花と読書の温室アトリエ','#f0e3b8','#6a8462','#d9ad58','flower'],
 ['glossy_guppy6230','たんたん','hedgehog','はりねずみのデザイン工房','#cbb69f','#704b49','#dbb98a','hedgehog'],
 ['aihan_days','あいはん','shiba','柴犬と語る仕事の書斎','#d6b78d','#4e6878','#e8d8b5','shiba'],
 ['cheeky_rhino7031','ロキろん','violet-knit','すみれ窓のショップアトリエ','#c3b4d3','#3c486a','#d7bc9a','woven-diamond'],
 ['grand_daisy8632','CNA運営','trio','三つ星の音楽・映像アトリエ','#a9afcd','#574b7f','#efbf70','three-stars'],
 ['real_hyena9474','アイリス','iris','物語を描く花窓アトリエ','#c9bcdb','#4e436f','#d9c5a1','iris-flower'],
 ['airoumu_rin','凛🦁','lion','獅子の映像アトリエ','#f1d49c','#6587b3','#df9b45','lion'],
 ['dandy_snake880','ドイル','pumpkin-library','かぼちゃ灯りと黒猫の書庫','#d5b88d','#64517e','#e5a44f','pumpkin-book'],
];
// These uses interpret verified public IDs and approved character/artwork references.
// Research and the distinction between direct evidence/inference stay in the
// checked-in public source record; no real residential information is used.
const designUses=Object.freeze({
 ss_yr:['host-atelier','stone'],koakumako:['gothic-lab','brick'],n_kazumai55633:['illustration-studio','plaster'],mama_ca:['family-atelier','plaster'],
 naemotion:['writing-garden','plaster'],imota14:['writing-bakehouse','brick'],fond_holly3483:['paired-atelier','plaster'],tenkai_notes:['midnight-study','stone'],
 soh_style_work:['cat-garden','plaster'],clever_hare2654:['reading-conservatory','plaster'],glossy_guppy6230:['design-studio','plaster'],aihan_days:['home-office','plaster'],
 cheeky_rhino7031:['shop-atelier','brick'],grand_daisy8632:['recording-studio','plaster'],real_hyena9474:['story-illustration','plaster'],airoumu_rin:['media-studio','stone'],dandy_snake880:['lantern-library','brick'],
});
export const CREATOR_HOMES=Object.freeze(designs.map(([creatorId,creatorName,homeTheme,homeLabel,wall,roof,trim,motif],index)=>{
 const x=7+(index===16?1:index%4)*CREATOR_QUARTER_LAYOUT.pitchX,z=6+Math.floor(index/4)*CREATOR_QUARTER_LAYOUT.pitchZ,[homeUse,homeConstruction]=designUses[creatorId];
 return Object.freeze({id:'home-'+creatorId,kind:'creator-home',creatorId,creatorName,label:creatorName+'の家',homeLabel,homeTheme,
  homePalette:Object.freeze({wall,roof,trim}),motif,homeUse,homeConstruction,gridRow:Math.floor(index/4)+1,gridColumn:(index===16?1:index%4)+1,interiorId:'creator-home-'+creatorId,interiorSpawn:Object.freeze({x:9.5,z:12.5}),publicProfileURL:'https://note.com/'+creatorId,designSource:'./data/creator-home-sources.json',fictional:true,x,z,w:7,h:5,door:Object.freeze({x:x+3.5,z:z+5.5})});
}));
export function getCreatorHome(creatorId){return CREATOR_HOMES.find(home=>home.creatorId===creatorId)||null;}
export function createCreatorQuarter(){
 const {width,height,roadWidth}=CREATOR_QUARTER_LAYOUT,cells=Array.from({length:height},(_,z)=>Array.from({length:width},(_,x)=>x===0||z===0||x===width-1||z===height-1?'#':'g'));
 const fill=(x,z,w,h,value)=>{for(let y=z;y<z+h;y++)for(let xx=x;xx<x+w;xx++)cells[y][xx]=value;};
 // Five-tile promenades leave room to see complete facades at eye level.
 // Broad north/south lanes and all south thresholds form one connected network.
 for(const z of [12,29,46,63,80])fill(1,z,width-2,roadWidth,'.');
 for(const x of [1,19,37,55,73])fill(x,1,roadWidth,height-2,'.');
 fill(34,79,12,8,'p'); // arrival plaza, separate from the southern route trigger
 const buildings=CREATOR_HOMES.map(home=>({...home,homePalette:{...home.homePalette},door:{...home.door}}));
 for(const home of buildings){fill(home.x,home.z,home.w,home.h,'b');cells[Math.floor(home.door.z)][Math.floor(home.door.x)]='.';}
 const targets=buildings.map(home=>({id:home.id,type:'creator-home',kind:'creator-home',creatorId:home.creatorId,
  name:home.creatorName+'の家',label:home.creatorName+'の家に入る',portal:true,to:home.interiorId,spawn:{...home.interiorSpawn},arrivalFacing:'up',x:home.door.x,z:home.door.z}));
 const decorations=buildings.flatMap(home=>[
  {id:'lamp-'+home.creatorId,kind:'lamp',x:home.x+1,z:home.z+5.5,radius:.22},
  {id:'tree-'+home.creatorId,kind:home.homeTheme==='cat-garden'||home.homeTheme==='chamomile'?'tree':'autumnTree',x:home.x+9.5,z:home.z+2.5,radius:.4},
 ]);
 return {id:CREATOR_QUARTER_ID,name:'創り手の街区',outdoor:true,width,height,tiles:cells.map(row=>row.join('')),
  spawn:{...CREATOR_QUARTER_CONNECTION.quarterArrival},buildings,targets,decorations,
  npcs:[...buildings.map(home=>({id:'neighbor-'+home.creatorId,name:home.creatorName,role:home.homeLabel,creatorId:home.creatorId,creatorHome:true,mapId:CREATOR_QUARTER_ID,appearance:home.homeTheme,x:home.door.x+2.25,z:home.door.z+1.4,dialogue:'ここは'+home.creatorName+'の'+home.homeLabel+'。玄関から中に入ると、制作の部屋と作品を訪ねられます。'})),
   {id:'quarter-guide',name:'街区の案内人 ルーチェ',role:'参加者の家の案内',fictional:true,mapId:CREATOR_QUARTER_ID,appearance:'keeper',x:35.5,z:82.5,dialogue:'この先の五本の広い通りに、'+CREATOR_HOMES.length+'人のクリエイターの家があります。家の前にもクリエイターがいます。名前のある玄関から入ると、その人だけの制作部屋と作品を訪ねられます。東・西・南の並木道から歩いて街へ戻れます。画面の「街へ戻る」でも広場へ戻れます。'}],furniture:[],
  portals:[{id:'leave-creator-quarter',name:'星灯りの街へ戻る',label:'星灯りの街へ戻る',type:'portal',kind:'door',
   ...CREATOR_QUARTER_CONNECTION.quarterExit,to:'lantern-town',spawn:{...CREATOR_QUARTER_CONNECTION.streetArrival}},...creatorAreaPortals(true)],
  routeSigns:creatorAreaSigns(true),
  districts:[{name:'光とお菓子の並木',x:39.5,z:14.5},{name:'物語と月の大通り',x:39.5,z:31.5},{name:'花と相棒の通り',x:39.5,z:48.5},{name:'三つ星と陽だまりの並木',x:39.5,z:65.5},{name:'かぼちゃ灯りの書庫通り',x:21.5,z:82.5}],notice:CREATOR_HOMES_NOTICE};
}
