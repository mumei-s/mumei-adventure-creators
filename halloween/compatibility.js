const automatic=v=>!v||['おまかせ','毎回大胆に変える'].includes(v);
const noPerson=v=>/風景を主役|モチーフだけ|紋章・アイコン/.test(v||'');
const faceOnly=v=>/歯|目を|眉|涙|ニヤリ|ウインク|牙|無表情|横顔|正面|俯瞰|ローアングル|振り向く|顔を/.test(v||'');
const limited=v=>/墨一色|モノクロ|セピア|二色|三色|銀と一滴の赤|焦茶 × シアン光/.test(v||'');
export function selectionConflicts(values={}){
 const reasons=[];
 if(noPerson(values.costume))for(const key of ['pose','mood'])if(!automatic(values[key])&&(key==='pose'||faceOnly(values[key])))reasons.push({keys:['costume',key],reason:'「人物なし」では人体の'+(key==='pose'?'ポーズ':'表情・顔角度')+'を実行できません。人物ありにするか、この項目をおまかせにしてください。'});
 if(values.medium==='クリスタルホログラム造形アニメ'&&limited(values.palette))reasons.push({keys:['medium','palette'],reason:'この作風は虹色の干渉帯が必須です。単色・限定色では同じ完成像にならないため選べません。色を変えるか、色数に対応したクリスタル透光アニメを選べます。'});
 if(['水墨画','モノクロ漫画','実写風モノクロ銀塩写真'].includes(values.medium)&&!automatic(values.palette)&&!['墨一色','モノクローム','参照画像の色を生かす'].includes(values.palette))reasons.push({keys:['medium','palette'],reason:'「'+values.medium+'」は無彩色で描く技法です。有彩色の配色を同時に指定できません。モノクロームにするか、墨彩画などの彩色に対応した作風を選んでください。'});
 if(values.costume==='人魚'&&/蹴|片膝|あぐら|正座|大股|足を組|片足/.test(values.pose||''))reasons.push({keys:['costume','pose'],reason:'人魚の尾と、左右の脚を必要とするポーズは同時に描けません。尾で実行できる動作を選んでください。'});
 const landscape={'山岳と湖のパノラマ':['山岳と湖畔'],'海辺と水平線':['砂浜と海岸線','海辺の灯台'],'里山と田園風景':['田畑と里山'],'雨に映る街の風景':['雨の路地','ネオンの繁華街'],'四季の森を見渡す':['広葉樹の森'],'建築と街並みの記録':['街並みと広場','街角の歩道']};
 if(landscape[values.theme]&&!automatic(values.place)&&!landscape[values.theme].includes(values.place)&&values.place!=='参照風景を舞台にする')reasons.push({keys:['theme','place'],reason:'「'+values.theme+'」には'+landscape[values.theme].join('・')+'の舞台が必要です。別の場所を同じ背景に混ぜる選択はできません。'});
 return reasons;
}
export function candidateAvailability(key,value,values){const conflicts=selectionConflicts({...values,[key]:value}).filter(c=>c.keys.includes(key));return {enabled:!conflicts.length,reason:conflicts.map(c=>c.reason).join(' ')};}
export function compatibleResolved(values,input,questions,random=Math.random){
 const out={...values};
 for(let pass=0;pass<questions.length;pass++){
  const conflict=selectionConflicts(out)[0];if(!conflict)return out;
  const key=conflict.keys.find(k=>automatic(input[k]));if(!key)return out; // Never silently change explicit choices.
  if(noPerson(out.costume)&&['mood','pose'].includes(key)){out[key]=key==='mood'?'毎回大胆に変える':'おまかせ';continue;}
  const q=questions.find(q=>q.key===key),candidates=(q.autoValues||q.groups.flatMap(g=>g.values)).filter(value=>candidateAvailability(key,value,out).enabled);
  if(!candidates.length)return out;out[key]=candidates[Math.min(candidates.length-1,Math.floor(random()*candidates.length))];
 }
 return out;
}
// In pop view a left gesture travels to the preceding page, wrapping to the last.
export function wrappedPage(page,delta,pages){return pages>0?((page+delta)%pages+pages)%pages:0;}
