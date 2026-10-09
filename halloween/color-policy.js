export function colorPolicy(values={}){
 const medium=values.medium||'',requested=(values.palette||'').trim();
 const explicitlyLimited=/(?:だけ|のみ|に限定|に制限|以外(?:は)?(?:使わない|使用しない))/.test(requested);
 const palette=requested.replace(/(?:だけ|のみ|に限定|に制限)\s*[。.]?$/,'').replace(/2色/g,'二色').replace(/3色/g,'三色');
 const addedColor=/^(?:墨一色|モノクロ).*(?:差し色|加え|追加)/.test(palette);
 if(medium==='サイアノタイプ')return {restricted:true,mode:'cyanotype',allowed:'プルシアンブルーと紙の白',bright:'紙の白',dark:'深いプルシアンブルー'};
 if(/モノクロ|^水墨画$|^鉛筆デッサン$|^木炭画$/.test(medium)||(!addedColor&&/^(墨一色|モノクロ)/.test(palette)))return {restricted:true,mode:'monochrome',allowed:'黒・白・無彩色の灰',bright:'白',dark:'黒'};
 if(palette==='金と黒の二色')return {restricted:true,mode:'gold-black',allowed:'金と黒だけ',bright:'金の最明部',dark:'黒'};
 if(palette==='黒と白と朱の三色')return {restricted:true,mode:'black-white-red',allowed:'黒・白・朱だけ',bright:'白',dark:'黒'};
 if(palette==='セピア')return {restricted:true,mode:'sepia',allowed:'褐色の濃淡と紙色',bright:'明るい紙色',dark:'深い褐色'};
 if(palette==='焦茶 × シアン光')return {restricted:true,mode:'brown-cyan',allowed:'焦茶とシアンの二つの色相',bright:'明るいシアン',dark:'深い焦茶'};
 if(explicitlyLimited)return {restricted:true,mode:'explicit-limited',allowed:requested,bright:'許可色の最明部',dark:'許可色の最暗部'};
 return {restricted:false,mode:'selected',allowed:requested||'選択色',bright:'白または選択色の最明部',dark:'選択色を深めた暗部'};
}
