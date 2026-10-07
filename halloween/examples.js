import {japanPreviews} from './japan-preview-catalog.js?v=27.0.0';
import {poseItems} from './poses.js?v=27.0.0';
import {dailySamples,currentCollection,landscapeScenes} from './collection.js?v=27.0.0';
import {questions} from './catalog.js?v=27.0.0';
import {formatPreviews} from './format-preview-catalog.js?v=27.0.0';
import {individualSamples} from './sample-catalog.js?v=27.0.0';
import {colorWorlds,luminousMedia} from './worlds.js?v=27.0.0';
for(const item of poseItems)individualSamples['pose\u0000'+item.value]={file:item.file};
for(const item of colorWorlds)individualSamples['palette\u0000'+item.value]={file:item.file};
for(const item of luminousMedia)individualSamples['medium\u0000'+item.value]={file:item.file};
const referenceChoices=new Set(['参照画像の衣装を生かす','参照風景を舞台にする','参照画像の色を生かす']);
export function sampleFor(key,value=''){
 if(japanPreviews[key+'\u0000'+value])return {kind:'image',src:'./'+japanPreviews[key+'\u0000'+value],label:value+'の日本ベースの説明用見本（生成の参照画像には使いません）'};
 if(key==='design'&&formatPreviews[value])return {kind:'image',src:'./'+formatPreviews[value],label:value+'の版面見本（生成の参照画像には使いません）'};
 const specific=dailySamples[key+'\u0000'+value]||individualSamples[key+'\u0000'+value];
 if(specific)return {kind:'image',src:'./'+specific.file,label:value+'の説明用イメージ（生成の参照画像には使いません）'};
 if(referenceChoices.has(value))return {kind:'reference',label:'添付画像を使う作例'};
 if(key==='line'&&value&&value!=='おまかせ')return {kind:'line',text:value==='セリフなし'?'':value,label:'選んだセリフの文字見本'};
 if(key==='type'&&value&&value!=='おまかせ')return {kind:'type',mode:value,label:'選んだ文字量・組版の見本'};
 if(key==='size'&&value.includes('｜')){const pixels=value.split('｜')[1].split('×').map(Number);return {kind:'size',ratio:pixels[0]/pixels[1],label:'選んだ縦横比の見本'};}
 if(value==='おまかせ'||value==='毎回大胆に変える'){
 const picks={design:['ファッション雑誌の表紙','映画ポスター','タロットカード','通常の一枚絵'],medium:['実写風フィルム写真','現代アニメの一枚絵','水墨画','クレイアート'],mood:['正面＋満面の笑顔','完全な左横顔90度','真上からの俯瞰','真下からのローアングル']};
 const sampleKey=key==='line'||key==='type'||key==='size'?'design':key;
 const daily=currentCollection()==='everyday';
 const dailyPicks={design:['ファッション雑誌の表紙','写真集の表紙','通常の一枚絵','ポストカード'],theme:['朝の光と小さな日常','季節を歩く','ものづくりの時間','静かな読書の時間'],costume:['リネンシャツとデニム','現代のテーラードスーツ','ワンピースとカーディガン','スポーツウェア'],place:['天窓のあるアトリエ','海辺の灯台','雪の庭','雨の路地'],pose:['ゆっくり歩く','本を読む','カップを両手で持つ','絵を描く']};
 const list=(daily?dailyPicks[sampleKey]:null)||picks[sampleKey]||questions.find(q=>q.key===sampleKey)?.autoValues?.slice(0,4)||Object.keys(individualSamples).filter(k=>k.startsWith(sampleKey+'\u0000')).slice(0,4).map(k=>k.split('\u0000')[1]);
 const srcs=list.map(v=>japanPreviews[sampleKey+'\u0000'+v]?{file:japanPreviews[sampleKey+'\u0000'+v]}:sampleKey==='design'&&formatPreviews[v]?{file:formatPreviews[v]}:dailySamples[sampleKey+'\u0000'+v]||individualSamples[sampleKey+'\u0000'+v]).filter(Boolean).map(s=>'./'+s.file);
 return {kind:'auto',label:'おまかせ候補の説明用イメージ（生成の参照画像には使いません）',srcs,text:key==='mood'?'表情も\n角度も変化':daily?'日常の場面に\n合わせて選択':'組み合わせを\nおまかせ'};
 }
 const landscape=key==='theme'?landscapeScenes.find(([name])=>name===value):null;
 if(landscape)return {kind:'custom',label:value+'：'+landscape[1],text:value.replace('と','と\n').replace('の記録','\nの記録')};
 if(key==='design'&&value==='自然・都市の風景画')return {kind:'image',src:'./japan-landscape-v19.png',label:'自然・都市の風景画の説明用イメージ（生成の参照画像には使いません）'};
 if(questions.find(q=>q.key===key)?.groups.some(g=>g.values.includes(value)))return {kind:'custom',label:value+'：項目名と説明を制作へ反映します。',text:value.replace('と','と\n')};
 return {kind:'custom',label:'自由入力',text:'あなたの\n指定で制作'};
}
export function typePreview(mode){
 if(currentCollection()==='everyday'){const p=typePreviewFor(mode);return {...p,blocks:p.blocks.map(s=>s.replaceAll('秋の創作特集','暮らしと創作の特集').replaceAll('ある一夜の物語','ある日々の物語').replaceAll('A HALLOWEEN STORY','オリジナルの物語').replaceAll('HALLOWEEN','創作').replaceAll('AFTER MIDNIGHT','日々の物語').replaceAll('創作の夜','創作の世界').replaceAll('真夜中の物語','日々の物語').replaceAll('真夜中に、また会おう。','また、この場所で。').replaceAll('夜にひらく','日々にひらく').replaceAll('夜の物語','日々の物語').replaceAll('一夜の記録','日々の記録'))};}return typePreviewFor(mode);
}
function typePreviewFor(mode){
 const name='作者名';
 if(mode==='文字を一切入れない')return {className:'type-none',blocks:[]};
 if(mode==='クリエイター名だけ')return {className:'type-name',blocks:[name]};
 if(mode==='セリフのみ')return {className:'type-line',blocks:['真夜中に、また会おう。']};
 if(mode==='HALLOWEENのみ')return {className:'type-title',blocks:['HALLOWEEN']};
 if(mode==='HALLOWEEN＋クリエイター名')return {className:'type-title',blocks:['HALLOWEEN',name]};
 if(mode.includes('手書き'))return {className:'type-sign',blocks:[name]};
 if(mode.includes('落款'))return {className:'type-seal',blocks:['作者']};
 if(mode.includes('映画'))return {className:'type-cinema',blocks:['窓の向こうで','ある一夜の物語',name,'原作・美術・制作','作：'+name]};
 if(mode.includes('新聞'))return {className:'type-news',blocks:['創作新聞','創作と写真の特集','夜の物語をたどる','文化・創作',name]};
 if(mode.includes('広告'))return {className:'type-ad',blocks:['創作の時間','創作の夜へようこそ','絵・写真・物語','特集：作り手の世界',name]};
 if(mode.includes('装丁'))return {className:'type-book',blocks:['真夜中の物語',name,'光と影をめぐる、一夜の記録。']};
 if(mode.includes('雑誌')||mode.includes('自動'))return {className:'type-magazine',blocks:['装い帖','秋の創作特集','創作の向こう側','写真と物語の特集','色と光の特集',name]};
 if(mode==='クリエイター名＋自由な見出し')return {className:'type-editorial',blocks:['日々の余白','夜にひらく、もうひとつの世界',name]};
 return {className:'type-title',blocks:['装い帖',name]};
}
