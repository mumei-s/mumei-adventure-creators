import {automaticView,viewSelectionIssues} from './view-constraints.js?v=28.3.0';
const automatic=automaticView;
const noPerson=v=>/風景を主役|モチーフだけ|紋章・アイコン/.test(v||'');
const faceOnly=v=>/歯|目を|眉|涙|ニヤリ|ウインク|牙|無表情|横顔|正面|俯瞰|ローアングル|振り向く|顔を/.test(v||'');
const limited=v=>/墨一色|モノクロ|セピア|二色|三色|銀と一滴の赤|焦茶 × シアン光/.test(v||'');
function nonViewConflicts(values={}){
 const reasons=[];
 if(noPerson(values.costume))for(const key of ['pose','mood'])if(!automatic(values[key])&&(key==='pose'||faceOnly(values[key])))reasons.push({keys:['costume',key],reason:'「人物なし」では人体の'+(key==='pose'?'ポーズ':'表情・顔角度')+'を実行できません。人物ありにするか、この項目をおまかせにしてください。'});
 if(values.medium==='クリスタルホログラム造形アニメ'&&limited(values.palette))reasons.push({keys:['medium','palette'],reason:'この作風は虹色の干渉帯が必須です。単色・限定色では同じ完成像にならないため選べません。色を変えるか、色数に対応したクリスタル透光アニメを選べます。'});
 if(['水墨画','鉛筆デッサン','木炭画','モノクロ漫画','実写風モノクロ銀塩写真'].includes(values.medium)&&!automatic(values.palette)&&!['墨一色','モノクローム','参照画像の色を生かす'].includes(values.palette))reasons.push({keys:['medium','palette'],reason:'「'+values.medium+'」は無彩色で描く作画基準です。有彩色の配色は同時に使えません。モノクロームか、墨彩画・色鉛筆画など彩色に対応する作風を選んでください。'});
 if(values.medium==='サイアノタイプ'&&!automatic(values.palette)&&!['参照画像の色を生かす','群青 × 月白 × 銀'].includes(values.palette))reasons.push({keys:['medium','palette'],reason:'サイアノタイプの作画基準はプルシアンブルーと紙の白です。別の色へ置き換えるとこの技法になりません。配色をおまかせ・参照画像の色を生かすにするか、別の作風を選んでください。'});
 if(values.costume==='人魚'&&/蹴|片膝|あぐら|正座|大股|足を組|片足/.test(values.pose||''))reasons.push({keys:['costume','pose'],reason:'人魚の尾と、左右の脚を必要とするポーズは同時に描けません。尾で実行できる動作を選んでください。'});
 const landscape={'山岳と湖のパノラマ':['山岳と湖畔'],'海辺と水平線':['砂浜と海岸線','海辺の灯台'],'里山と田園風景':['田畑と里山'],'雨に映る街の風景':['雨の路地','ネオンの繁華街'],'四季の森を見渡す':['広葉樹の森'],'建築と街並みの記録':['街並みと広場','街角の歩道']};
 if(landscape[values.theme]&&!automatic(values.place)&&!landscape[values.theme].includes(values.place)&&values.place!=='参照風景を舞台にする')reasons.push({keys:['theme','place'],reason:'「'+values.theme+'」には'+landscape[values.theme].join('・')+'の舞台が必要です。別の場所を同じ背景に混ぜる選択はできません。'});
 return reasons;
}
export function selectionConflicts(values={}){return [...nonViewConflicts(values),...viewSelectionIssues(values).filter(issue=>issue.severity==='error')];}
export function selectionWarnings(values={}){return viewSelectionIssues(values).filter(issue=>issue.severity==='warning');}
export function selectionIssues(values={}){return [...selectionConflicts(values).map(issue=>({...issue,severity:'error'})),...selectionWarnings(values)];}
export function candidateAvailability(key,value,values={}){
 const candidate={...values,[key]:value},conflicts=selectionConflicts(candidate).filter(c=>c.keys.includes(key)),warnings=selectionWarnings(candidate).filter(c=>c.keys.includes(key));
 return {enabled:!conflicts.length,status:conflicts.length?'blocked':warnings.length?'warning':'compatible',reason:conflicts.map(c=>c.reason).join(' '),warnings};
}
export function compatibleResolved(values,input,questions,random=Math.random,{recent=[],attempt=0}={}){
 const out={...values};
 for(let pass=0;pass<questions.length*2;pass++){
  // Preserve explicit conflicts for review, while resolving independent AUTO
  // conflicts as well. One explicit issue must not prevent another AUTO fix.
  const conflict=selectionConflicts(out).find(c=>c.keys.some(k=>automatic(input[k])));if(!conflict)return out;
  const keys=conflict.keys.filter(k=>automatic(input[k]));let changed=false;
  for(const key of keys){
   if(noPerson(out.costume)&&['mood','pose'].includes(key)){out[key]=key==='mood'?'毎回大胆に変える':'おまかせ';changed=true;break;}
   const q=questions.find(q=>q.key===key);if(!q)continue;
   const available=(q.autoValues||q.groups.flatMap(g=>g.values)).map(value=>({value,...candidateAvailability(key,value,out)})).filter(candidate=>candidate.enabled);
   const clear=available.filter(candidate=>candidate.status==='compatible'),allowed=clear.length?clear:available;
   if(!allowed.length)continue; // Another AUTO field may be the solvable axis.
   const unseen=allowed.filter(candidate=>!recent.slice(-3).some(row=>row[key]===candidate.value)),notLast=allowed.filter(candidate=>recent.at(-1)?.[key]!==candidate.value);
   const candidates=unseen.length?unseen:notLast.length?notLast:allowed;
   const draw=Number(random()),unit=Number.isFinite(draw)?Math.max(0,Math.min(1-Number.EPSILON,draw)):0;
   out[key]=candidates[(Math.floor(unit*candidates.length)+attempt)%candidates.length].value;changed=true;break;
  }
  if(!changed)return out;
 }
 return out;
}
// Both directions wrap so the adjacent page remains reachable at either end.
export function wrappedPage(page,delta,pages){return pages>0?((page+delta)%pages+pages)%pages:0;}
