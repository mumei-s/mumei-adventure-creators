import {individualSamples} from './sample-catalog.js?v=7';
import {colorWorlds,luminousMedia} from './worlds.js?v=7';
for(const item of colorWorlds)individualSamples['palette\u0000'+item.value]={file:item.file};
for(const item of luminousMedia)individualSamples['medium\u0000'+item.value]={file:item.file};
const referenceChoices=new Set(['参照画像の衣装を生かす','参照風景を舞台にする','参照画像の色を生かす']);
export function sampleFor(key,value=''){
 const specific=individualSamples[key+'\u0000'+value];
 if(specific)return {kind:'image',src:'./'+specific.file,label:value+'の作例'};
 if(referenceChoices.has(value))return {kind:'reference',label:'添付画像を使う作例'};
 if(key==='line'&&value&&value!=='おまかせ')return {kind:'line',text:value==='セリフなし'?'':value,label:'選んだセリフの文字見本'};
 if(key==='type'&&value&&value!=='おまかせ')return {kind:'type',mode:value,label:'選んだ文字量・組版の見本'};
 if(key==='size'&&value.includes('｜')){const pixels=value.split('｜')[1].split('×').map(Number);return {kind:'size',ratio:pixels[0]/pixels[1],label:'選んだ縦横比の見本'};}
 if(value==='おまかせ'||value==='毎回大胆に変える'){
 const picks={design:['ファッション雑誌の表紙','映画ポスター','タロットカード','通常の一枚絵'],medium:['実写風フィルム写真','現代アニメの一枚絵','水墨画','クレイアート'],mood:['正面＋満面の笑顔','完全な左横顔90度','真上からの俯瞰','真下からのローアングル']};
 const sampleKey=key==='line'||key==='type'||key==='size'?'design':key;
 const list=picks[sampleKey]||Object.keys(individualSamples).filter(k=>k.startsWith(sampleKey+'\u0000')).slice(0,4).map(k=>k.split('\u0000')[1]);
 const srcs=list.map(v=>individualSamples[sampleKey+'\u0000'+v]).filter(Boolean).map(s=>'./'+s.file);
 return {kind:'auto',label:'おまかせの組み合わせの一例',srcs,text:key==='mood'?'表情も\n角度も変化':'組み合わせを\nおまかせ'};
 }
 return {kind:'custom',label:'自由入力',text:'あなたの\n指定で制作'};
}
export function typePreview(mode){
 const name='CREATOR';
 if(mode==='文字を一切入れない')return {className:'type-none',blocks:[]};
 if(mode==='クリエイター名だけ')return {className:'type-name',blocks:[name]};
 if(mode==='セリフのみ')return {className:'type-line',blocks:['真夜中に、また会おう。']};
 if(mode==='HALLOWEENのみ')return {className:'type-title',blocks:['HALLOWEEN']};
 if(mode==='HALLOWEEN＋クリエイター名')return {className:'type-title',blocks:['HALLOWEEN',name]};
 if(mode.includes('手書き'))return {className:'type-sign',blocks:[name]};
 if(mode.includes('落款'))return {className:'type-seal',blocks:['作者']};
 if(mode.includes('映画'))return {className:'type-cinema',blocks:['AFTER MIDNIGHT','A HALLOWEEN STORY',name,'ART / STORY / DESIGN','CREATED BY '+name]};
 if(mode.includes('新聞'))return {className:'type-news',blocks:['NIGHT JOURNAL','創作と写真の特集','夜の物語をたどる','ART & STORIES',name]};
 if(mode.includes('広告'))return {className:'type-ad',blocks:['HALLOWEEN','創作の夜へようこそ','ART / PHOTO / STORY','特集：作り手の世界',name]};
 if(mode.includes('装丁'))return {className:'type-book',blocks:['真夜中の物語',name,'光と影をめぐる、一夜の記録。']};
 if(mode.includes('雑誌')||mode.includes('自動'))return {className:'type-magazine',blocks:['MIDNIGHT','HALLOWEEN SPECIAL','創作の向こう側','写真と物語の特集','ART & IMAGINATION',name]};
 if(mode==='クリエイター名＋自由な見出し')return {className:'type-editorial',blocks:['THE OTHER SIDE','夜にひらく、もうひとつの世界',name]};
 return {className:'type-title',blocks:['MIDNIGHT',name]};
}
