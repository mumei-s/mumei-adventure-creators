/** Original artwork only. Every prop has a ground anchor independent from its roof. */
export const TOWN_ART_VERSION='20261017-town1';
/** The loader and battle renderer share this table; narrative IDs never double as file IDs. */
export const TOWN_BATTLE_ART_IDS=Object.freeze({'canal-mist':'ghost','clock-shadow':'franken'});
export const TOWN_ATLAS_FILE='town-props.webp';
export const TOWN_TEXTURE_FILES=Object.freeze({cobbles:'town-cobbles.webp',soil:'town-soil.webp'});
export const TOWN_ATLAS_GRID=Object.freeze({columns:4,rows:4});
export const TOWN_PROP_CELLS=Object.freeze({
  house:0,bakery:1,clocktower:2,tree:3,magicShop:4,inn:5,lamp:6,fountain:7,
  market:8,bridge:9,gate:10,autumnTree:11,flowerbed:12,statue:13,pumpkin:14,bench:15,
});
export const TOWN_BUILDING_ART=Object.freeze({
  bakery:'bakery',inn:'inn',workshop:'house',library:'magicShop',clocktower:'clocktower',
  clock:'clocktower',observatory:'clocktower',shop:'magicShop',apothecary:'magicShop',
  house:'house',residence:'house',archive:'magicShop',atelier:'house',cafe:'bakery',
});
export const TOWN_BUDGET=Object.freeze({chunkTiles:8,residentChunks:20,maxVisibleParticles:34,maxDevicePixelRatio:2});
export const TOWN_COLORS=Object.freeze({
  grass:'#333f3c',grassLight:'#4a5545',soil:'#4c413d',road:'#66636a',roadDark:'#484953',
  water:'#183f50',waterLight:'#407481',stone:'#737883',trim:'#ccb684',night:'#111c2c',
});

export function atlasCellFrame(image,cell){
  const width=image.width/TOWN_ATLAS_GRID.columns,height=image.height/TOWN_ATLAS_GRID.rows;
  return [(cell%4)*width,Math.floor(cell/4)*height,width,height];
}

export function buildingArtKind(building){
  const kind=String(building.art||building.kind||building.id||'house');
  if(Object.hasOwn(TOWN_PROP_CELLS,kind))return kind;
  if(Object.hasOwn(TOWN_BUILDING_ART,kind))return TOWN_BUILDING_ART[kind];
  for(const [name,art]of Object.entries(TOWN_BUILDING_ART))if(kind.includes(name))return art;
  return 'house';
}

export function townVisualSeed(x,z,salt=0){
  let value=(Math.imul((x|0)+917,374761393)^Math.imul((z|0)+277,668265263)^salt)>>>0;
  value=Math.imul(value^(value>>>13),1274126177)>>>0;
  return ((value^(value>>>16))>>>0)/4294967296;
}

/** Cell rectangles are only a fallback; release assets can provide measured alpha bounds. */
export function townPropSprite(image,kind,frames=null){
  if(!image||!Object.hasOwn(TOWN_PROP_CELLS,kind))return null;
  const measured=frames?.[kind],frame=measured?.frame||atlasCellFrame(image,TOWN_PROP_CELLS[kind]);
  return {image,frame,anchorX:measured?.anchorX??.5,anchorY:measured?.anchorY??.97,
    contentHeight:measured?.contentHeight??frame[3],contentWidth:measured?.bounds?.[2]??frame[2]};
}
