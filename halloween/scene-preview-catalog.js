import {preserveLegacyAssetKeys} from './legacy-selection-aliases.js?v=28.4.6';
// Original assistant-created scene illustrations. These thumbnails are
// explanatory UI assets and are never character or drawing-style references.
const sceneEntries=[
 ['風景・建築の記録','landscape-architecture-record'],
 ['海辺と水平線','seaside-horizon'],
 ['里山と田園風景','satoyama-rural-fields'],
 ['雨に映る街の風景','rain-reflected-city'],
 ['四季の森を見渡す','seasonal-forest-overlook'],
 ['建築と街並みの記録','architecture-streets-record'],
 ['山岳と湖畔','mountains-lakeshore'],
 ['砂浜と海岸線','sand-beach-coastline'],
 ['田畑と里山','cultivated-fields-low-hills'],
 ['広葉樹の森','deciduous-woodland'],
 ['川沿いの遊歩道','riverside-promenade'],
 ['街並みと広場','townscape-public-square'],
 ['花光のガラス庭園','flower-light-glass-garden'],
 ['街角アニメ日和','urban-anime-day'],
 ['死神の休日','reaper-day-off'],
 ['鏡の向こうの自分','mirror-other-self'],
 ['雨上がりのホラー','after-rain-ghost-story'],
 ['ふわ彩の祝祭室','soft-color-celebration-room'],
 ['和雅・花景','wa-flower-scenery'],
 ['水鏡の幻想空間','water-mirror-fantasy-space'],
 ['星糸のアトリエ','star-thread-atelier']
];
export const scenePreviews=Object.freeze(preserveLegacyAssetKeys(Object.fromEntries(sceneEntries.map(([value,slug])=>[value,Object.freeze({
 value,file:'assets/scenes-original-v28-4-3/'+slug+'.jpg',
 label:value+'のシーン見本（見本シートに添付し、出来事と場所の構造だけを参照）'
})])),{key:'theme'}));
