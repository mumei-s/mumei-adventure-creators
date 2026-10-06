import {formatFor} from './formats.js?v=13';
import {formatTextPolicy} from './format-recipes.js?v=13';
const pick=(items,random)=>items[Math.min(items.length-1,Math.floor(random()*items.length))];
function shuffle(items,random){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const titles={cover:['LUMEN THREAD','FORM & FABLE','VELVET SIGNAL','LIGHT ARCHIVE','OPEN PALETTE'],interview:['THE MAKING FILE','CREATIVE VOICES','A FIELD OF IDEAS'],spread:['THE VISUAL NOTE','WORLD IN MOTION','A NEW PERSPECTIVE'],newspaper:['創作通信','彩景新聞','表現日報'],cinema:['BEYOND THE FRAME','A SILENT DOOR','WHEN LIGHT RETURNS'],book:['ひかりを綴る','まだ知らない景色','境界の手紙'],album:['ECHOES IN COLOR','UNFOLDING','SOFT REVERB'],default:['FORM & WONDER','もうひとつの景色','STORIES IN LIGHT']};
export function buildEditorial(profile,values,random=Math.random){
 const name=(profile.displayName||profile.name||'').trim(),kind=formatFor(values.design).kind,mode=values.type,daily=values.collection==='everyday';
 const noPerson=/風景を主役|モチーフだけ|紋章・アイコン/.test(values.costume),landscape=kind==='landscape'||values.costume==='風景を主役にする';
 const captionRole=/^実写風/.test(values.medium)?'写真キャプション':'図版キャプション';
 const {noText,limited,line}=formatTextPolicy(values);
 const title=pick(titles[kind]||titles.default,random),topics=shuffle((profile.topics||[]).filter(v=>typeof v==='string'&&v.trim()),random);
 const subject=values.theme==='おまかせ'?(daily?'日々の創作':'一夜の物語'):values.theme;
 const themeWords=[...new Set([...topics.slice(0,6),subject,...(noPerson||landscape?['景観のかたち','色と光','奥行きの構成','季節と時間','素材の手触り']:['衣装のかたち','色と光','場面づくり','視線の物語','素材の手触り'])])];
 const subjectCopy=pick([subject+'を、ひとつの場面に。',subject+'から始まる、新しい一枚。','見つけたいのは、'+subject+'の向こう側。'],random);
 const intro=noPerson||landscape?subject+'を手がかりに、'+values.place+'の広がりを描く。手前の形から遠景へ続く奥行きと、'+values.medium+'の手触り。光と余白の重なりから、その場所の表情を探してみたい。':subject+'を手がかりに、'+values.place+'に一つの場面をつくる。'+values.costume+'のかたちと、'+values.medium+'の手触り。その間に、作り手の視点を探してみたい。';
 const prose=[
 '一枚を見渡すと、最初に気づくのは光の向きだ。手前にあるものと奥にあるもの、その距離が場面の呼吸をつくっている。主役だけを切り取らず、周囲の小さな形にも目を向けたい。',
 noPerson||landscape?'形の輪郭は、置かれた距離によって見え方を変える。手前に重なる面と、遠くに溶ける細部。その違いが、空間の広がりを支えている。光の当たる向きと余白の関係をたどると、見るたびに違う景色が現れる。':'衣装の輪郭は、動きによって表情を変える。袖や裾の重なり、素材が残す陰影。その細部が、物語の中にいる人物の存在を支えている。形と余白の関係をたどると、見るたびに違う景色が現れる。',
 '色を増やすことよりも、どこに置くかを考える。明るい面と静かな影、そして視線を引く小さな差し色。選んだ色の世界を保ちながら、場面の中の時間を感じられる一枚へ。'
 ];
 const slots=[];const add=(role,text,priority=2)=>{if(text)slots.push({role,text,priority});};
 const result=()=>({mode,name:slots.some(s=>s.role==='作者名')?name:'',title:slots.some(s=>s.priority===0)?title:'',dense:slots.length>=8,slots,blocks:slots.map(s=>s.text),topics,kind,limited});
 if(noText)return {mode:'none',name:'',title:'',dense:false,slots:[],blocks:[],topics:[],kind,limited:false};
 if(mode==='クリエイター名だけ'||/サイン風|落款風/.test(mode)){add('作者名',name,1);return result();}
 if(mode==='HALLOWEENのみ'){add('テーマ名','HALLOWEEN',1);return result();}
 if(mode==='HALLOWEEN＋クリエイター名'){add('テーマ名','HALLOWEEN',1);add('作者名',name);return result();}
 if(mode==='セリフのみ'){add('セリフ',line,1);return result();}
 if(mode==='短いタイトル＋名前'||mode==='クリエイター名＋自由な見出し'){add(mode==='短いタイトル＋名前'?'作品タイトル':'主見出し',title,0);add('作者名',name,2);return result();}
 const automatic=mode==='デザインに合わせて自動編集',rich=/たっぷり|新聞風/.test(mode);
 const density=rich||automatic&&['cover','interview','spread','newspaper','cinema','stage','festival','advert','flyer','zine','exhibition'].includes(kind);
 const coverLine=topic=>pick([topic+'を編む',topic+'の向こう側',topic+'に触れる',topic+'の新しい視点'],random);
 const deck=topic=>pick(['形と余白から、'+topic+'の魅力を見つける。',topic+'を、光・色・素材で読み解く。','今度の一枚に、'+topic+'の視点を。'],random);
 if(kind==='cover'&&density){
  add('誌名',title,0);add('特集ラベル',daily?'ART / LIFE / IMAGINATION':'COSTUME / ART / IMAGINATION',3);
  add('主特集',subject,1);add('主特集の補足',subjectCopy,2);
  themeWords.slice(0,4).forEach(t=>{add('補助特集',coverLine(t),2);add('補助特集の補足',deck(t),3);});
  add('作者名',name,2);add('セリフ',line,2);return result();
 }
 if(['interview','spread','newspaper'].includes(kind)&&density){
  add(kind==='newspaper'?'新聞題字':'柱',title,kind==='newspaper'?0:3);add('特集見出し',subject,kind==='newspaper'?1:0);add('リード文',intro,2);add('作者名',name,3);
  if(kind==='newspaper')add('紙面分類','創作特集',3);
  if(kind==='interview')add('欄名','創作Q&A',3);
  if(kind==='interview'){
   add('質問1','Q. この場面で、最初に見つけたものは？',2);add('回答1','A. 光と距離の関係。近くの小さな形から、遠くの気配へ視線をつなぐ。'+subject+'の世界を、その流れの中で描いてみたい。',3);
   add('質問2',noPerson||landscape?'Q. 奥行きや素材は、どう場面に関わる？':'Q. 衣装や素材は、どう物語に関わる？',2);add('回答2',noPerson||landscape?'A. '+values.place+'の形を起点に、面の重なりや光の返りを考える。手前から遠景まで、素材の輪郭と空気の厚みが自然につながるようにする。':'A. '+values.costume+'の輪郭を起点に、布の重なりや光の返りを考える。動きの前後を想像できるように、道具と身体の関係も大切にする。',3);
   add('質問3','Q. 色の世界を、どこから組み立てる？',2);add('回答3','A. 主色の大きな面に、静かな副色を重ねる。小さな差し色へ視線を集め、画面全体のまとまりをつくる。',3);
  }else{
   prose.forEach((text,i)=>{add('本文小見出し'+(i+1),['光がつくる距離','かたちに宿る動き','色を置く、その理由'][i],2);add('本文'+(i+1),text,3);});
   if(kind==='newspaper'){themeWords.slice(0,2).forEach((t,i)=>{add('副記事見出し'+(i+1),coverLine(t),2);add('副記事本文'+(i+1),deck(t)+'場面の中にある形や色をたどり、新しい作品の入り口を探す。',3);});}
  }
  add('引き抜き引用',line||subjectCopy,1);add(captionRole,subject+' / '+values.medium+(name?' / '+name:''),3);
  add('ノンブル',kind==='spread'?'06 / 07':kind==='interview'?'06':'01',3);return result();
 }
 add(['cinema','stage','festival'].includes(kind)?'作品タイトル':kind==='book'?'書名':kind==='album'?'アルバム名':'主見出し',title,0);add('作者名',name,2);add('キャッチ',line||subjectCopy,1);
 if(kind==='cinema'&&(automatic||/クレジット/.test(mode))){add('ビリング1','ART & STORY  '+name,3);add('ビリング2','VISUAL CONCEPT  '+name+'  /  AN ORIGINAL WORK',3);add('ビリング3','CHARACTER / COSTUME / WORLD DESIGN',3);}
 else if(kind==='stage'&&density){add('演目の紹介',intro,2);add('制作クレジット','CREATIVE DIRECTION / ART  '+name,3);}
 else if(kind==='festival'&&density){add('ジャンル欄',themeWords.slice(0,4).join(' / '),2);add('紹介',subjectCopy,2);}
 else if(kind==='editorial'&&automatic){add('リード文',intro,2);add(captionRole,(noPerson?values.place:values.costume)+' / '+values.medium,3);}
 else if(kind==='reference'&&automatic){add('分類名',noPerson?subject:values.costume,2);add('形の注記',(noPerson?'形と奥行き':values.pose)+' / '+values.medium,3);add('短い説明',intro,3);}
 else if(kind==='book'||mode==='物語の装丁風・タイトルと紹介'){add('紹介文',intro,2);}
 else if(density){themeWords.slice(0,rich?4:3).forEach(t=>{add('補助見出し',coverLine(t),2);add('説明',deck(t),3);});if(['advert','exhibition'].includes(kind))add('紹介文',intro,3);}
 return result();
}
export function editorialContract(copy){
 const slots=copy.slots||[];
 if(copy.mode==='none'||!slots.length)return ['文字・数字・ロゴ・サイン・署名・疑似文字を描かない。文字のない完成図版とし、看板や紙面の空きにも代わりの原稿を追加しない。'];
 const limited=copy.limited??formatTextPolicy({type:copy.mode,line:slots.find(s=>s.role==='セリフ')?.text}).limited;
 const roles=new Set(slots.map(s=>s.role)),body=slots.some(s=>/本文|質問|回答/.test(s.role));
 const levels=[...new Set(slots.map(s=>s.priority))].sort((a,b)=>a-b).map(priority=>'階層'+priority+'：'+[...new Set(slots.filter(s=>s.priority===priority).map(s=>s.role))].join('・'));
 const render=(s,i)=>(i+1)+'. 【'+s.role+' / 階層'+s.priority+'】 '+s.text;
 const spreadFrames=copy.kind==='spread'&&!limited?[
  {label:'左本文枠A',roles:['本文小見出し1','本文1'],flow:'この2原稿だけを一つの枠に上から下へ組む。末尾の空きは余白として残す。'},
  {label:'右本文枠B',roles:['本文小見出し2','本文2','本文小見出し3','本文3'],flow:'この4原稿を一つの枠に連続して上から下へ組む。本文3は本文2の直下へ続け、別列や独立カードへ分割しない。'}
 ]:[];
 const emitted=new Set(),manuscript=slots.flatMap((s,i)=>{
  const frame=spreadFrames.find(f=>f.roles.includes(s.role));
  if(!frame)return [render(s,i)];
  if(emitted.has(frame.label))return [];
  emitted.add(frame.label);
  return ['【'+frame.label+'の連続原稿】'+frame.flow,...frame.roles.flatMap(role=>slots.flatMap((item,index)=>item.role===role?[render(item,index)]:[]))];
 });
 return [
  limited?'許可された原稿は次の'+slots.length+'ブロックだけ。形式の標準文字量を満たすために文言を増やさず、この文字列と役割をそのまま配置する。':'制作原稿は次の役割ごとに確定済み。各原稿を選択形式の個別制作仕様へ配置し、原稿にない文言や情報役割を補わない。',
  ...(emitted.size?['見開きの本文原稿は次の左本文枠A・右本文枠Bの2枠へ割り当てる。3つの話題を3列へ分けず、本文小見出し2と3は同じ右枠Bの中で縦に続ける。本文枠内に小画像やカード枠を追加しない。']:[]),
  ...manuscript,
  '今回使う文字階層は '+levels.join(' / ')+'。数値の小さい階層から視線が進む大小と太さを使い、原稿が一種類なら一つのまとまりにする。選択形式の個別仕様に従って配置し、原稿内にない階層を埋めない。書体は原則2系統以内で、日本語の行末・句読点・読み順を整える。',
  ...(roles.has('誌名')&&roles.has('作者名')?['誌名と作者名は今回の原稿にある別の役割として保ち、同じ文字列へ置換しない。']:[]),
  ...(roles.has('柱')||roles.has('ノンブル')?['原稿にある柱・ノンブルは個別仕様の欄外へ小さく配置し、主見出しと同じ大きさにしない。']:[]),
  ...(body?['用意した本文・質問・回答は意味のある文章として順に組み、見出しの反復や疑似文字で埋めない。この図版のための創作原稿であり、本人の実際の発言・取材・刊行情報として示さない。']:[]),
  '実在雑誌・出版社・広告・映画のロゴ、未確認の価格・日付・会場・業績は原稿へ追加しない。'
 ];
}
