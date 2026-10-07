// Each studio has a separate shape, motion and spell family in both collections.
const families={
 stars:{shape:'star',motion:'orbit',spells:[0,3,7],status:'星と星座が広がります。',colors:['#ffdc7b','#fff4c7','#c29fff','#91dbe8'],everydayColors:['#6aa6cf','#dbc66f','#a898d9','#77c8cf']},
 paper:{shape:'petal',motion:'fall',spells:[4,5,6],status:'花びらと色紙が舞います。',colors:['#f3b29d','#ec82ae','#f8d4a0','#aaca83'],everydayColors:['#d77ba4','#e3a277','#91ba8a','#b693d7']},
 gallery:{shape:'prism',motion:'rise',spells:[1,2,8],status:'プリズムと光の帯が広がります。',colors:['#7cdbff','#cbb4ff','#ffb7ee','#fff1a8'],everydayColors:['#73c2db','#a58fe0','#e79fc9','#a6d9c1']}
};
export function decorationProfile(value='stars',everyday=false){const key=Object.hasOwn(families,value)?value:'stars',f=families[key];return {...f,key,colors:everyday?f.everydayColors:f.colors};}
