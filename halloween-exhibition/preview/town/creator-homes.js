/** Imagined atelier homes inspired by approved exhibition characters and public
 * article/profile motifs. These are game scenery, never anyone's real address. */
export const CREATOR_QUARTER_ID='creator-quarter';
export const CREATOR_QUARTER_CONNECTION=Object.freeze({
 street:Object.freeze({x:18.5,z:43.5}),streetArrival:Object.freeze({x:18.5,z:44.8}),
 quarterArrival:Object.freeze({x:23.5,z:44.5}),quarterExit:Object.freeze({x:23.5,z:46.5}),
});
export const CREATOR_HOMES_NOTICE='作者のキャラクターや作品をイメージした、ゲーム内の架空の家です。実在する住まいではありません。';
// Order follows the current exhibition roster, including the two pending authors.
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
];
// These uses interpret the verified public IDs and approved avatar references.
// Research and the distinction between direct evidence/inference stay in the
// checked-in public source record; no real residential information is used.
const designUses=Object.freeze({
 ss_yr:['host-atelier','stone'],koakumako:['gothic-lab','brick'],n_kazumai55633:['illustration-studio','plaster'],mama_ca:['family-atelier','plaster'],
 naemotion:['writing-garden','plaster'],imota14:['writing-bakehouse','brick'],fond_holly3483:['paired-atelier','plaster'],tenkai_notes:['midnight-study','stone'],
 soh_style_work:['cat-garden','plaster'],clever_hare2654:['reading-conservatory','plaster'],glossy_guppy6230:['design-studio','plaster'],aihan_days:['home-office','plaster'],
 cheeky_rhino7031:['shop-atelier','brick'],grand_daisy8632:['recording-studio','plaster'],real_hyena9474:['story-illustration','plaster'],airoumu_rin:['media-studio','stone'],
});
export const CREATOR_HOMES=Object.freeze(designs.map(([creatorId,creatorName,homeTheme,homeLabel,wall,roof,trim,motif],index)=>{
 const x=3+(index%4)*11,z=3+Math.floor(index/4)*11,[homeUse,homeConstruction]=designUses[creatorId];
 return Object.freeze({id:'home-'+creatorId,kind:'creator-home',creatorId,creatorName,label:creatorName+'の家',homeLabel,homeTheme,
  homePalette:Object.freeze({wall,roof,trim}),motif,homeUse,homeConstruction,publicProfileURL:'https://note.com/'+creatorId,designSource:'./data/creator-home-sources.json',fictional:true,x,z,w:7,h:5,door:Object.freeze({x:x+3.5,z:z+5.5})});
}));
export function getCreatorHome(creatorId){return CREATOR_HOMES.find(home=>home.creatorId===creatorId)||null;}
export function createCreatorQuarter(){
 const width=48,height=48,cells=Array.from({length:height},(_,z)=>Array.from({length:width},(_,x)=>x===0||z===0||x===width-1||z===height-1?'#':'g'));
 const fill=(x,z,w,h,value)=>{for(let y=z;y<z+h;y++)for(let xx=x;xx<x+w;xx++)cells[y][xx]=value;};
 // Each south threshold joins a two-tile avenue, with five north/south lanes.
 for(const z of [8,19,30,41])fill(1,z,46,2,'.');
 for(const x of [1,12,23,34,45])fill(x,1,2,46,'.');
 const buildings=CREATOR_HOMES.map(home=>({...home,homePalette:{...home.homePalette},door:{...home.door}}));
 for(const home of buildings){fill(home.x,home.z,home.w,home.h,'b');cells[Math.floor(home.door.z)][Math.floor(home.door.x)]='.';}
 const targets=buildings.map(home=>({id:home.id,type:'creator-home',kind:'creator-home',creatorId:home.creatorId,
  name:home.creatorName+'の家',label:home.creatorName+'の家を訪ねる',x:home.door.x,z:home.door.z}));
 const decorations=buildings.flatMap(home=>[
  {id:'lamp-'+home.creatorId,kind:'lamp',x:home.x+1,z:home.z+6.35,radius:.12},
  {id:'tree-'+home.creatorId,kind:home.homeTheme==='cat-garden'||home.homeTheme==='chamomile'?'tree':'autumnTree',x:home.x+8.6,z:home.z+2.5,radius:.32},
 ]);
 return {id:CREATOR_QUARTER_ID,name:'創り手の街区',outdoor:true,width,height,tiles:cells.map(row=>row.join('')),
  spawn:{...CREATOR_QUARTER_CONNECTION.quarterArrival},buildings,targets,decorations,npcs:[],furniture:[],
  portals:[{id:'leave-creator-quarter',name:'星灯りの街へ戻る',label:'星灯りの街へ戻る',type:'portal',kind:'door',
   ...CREATOR_QUARTER_CONNECTION.quarterExit,to:'lantern-town',spawn:{...CREATOR_QUARTER_CONNECTION.streetArrival}}],
  districts:[{name:'光とお菓子の並木',x:23.5,z:9.5},{name:'物語と月の小径',x:23.5,z:20.5},{name:'花と相棒の通り',x:23.5,z:31.5},{name:'三つ星と陽だまりの路地',x:23.5,z:42.5}],notice:CREATOR_HOMES_NOTICE};
}
