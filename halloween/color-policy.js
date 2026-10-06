export function colorPolicy(values={}){
 const medium=values.medium||'',palette=values.palette||'';
 if(medium==='サイアノタイプ')return {restricted:true,mode:'cyanotype',allowed:'プルシアンブルーと紙の白',bright:'紙の白',dark:'深いプルシアンブルー'};
 if(/モノクロ|^水墨画$|^鉛筆デッサン$|^木炭画$/.test(medium)||/^(墨一色|モノクロ)/.test(palette))return {restricted:true,mode:'monochrome',allowed:'黒・白・無彩色の灰',bright:'白',dark:'黒'};
 if(palette==='金と黒の二色')return {restricted:true,mode:'gold-black',allowed:'金と黒だけ',bright:'金の最明部',dark:'黒'};
 if(palette==='黒と白と朱の三色')return {restricted:true,mode:'black-white-red',allowed:'黒・白・朱だけ',bright:'白',dark:'黒'};
 if(palette==='セピア')return {restricted:true,mode:'sepia',allowed:'褐色の濃淡と紙色',bright:'明るい紙色',dark:'深い褐色'};
 if(palette==='焦茶 × シアン光')return {restricted:true,mode:'brown-cyan',allowed:'焦茶とシアンの二つの色相',bright:'明るいシアン',dark:'深い焦茶'};
 return {restricted:false,mode:'selected',allowed:palette||'選択色',bright:'白または選択色の最明部',dark:'選択色を深めた暗部'};
}
