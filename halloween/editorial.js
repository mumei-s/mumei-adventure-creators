import {formatFor} from './formats.js?v=26.0.0';
import {formatTextPolicy} from './format-recipes.js?v=26.0.0';
const pick=(items,random)=>items[Math.min(items.length-1,Math.floor(random()*items.length))];
function shuffle(items,random){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const titles={cover:['装い帖','色と暮らし','創作日和','余白の時間','光の便り'],interview:['制作の現場','創作の声','発想の手帖'],spread:['表現の手帖','動きのある世界','新しい視点'],newspaper:['創作通信','彩景新聞','表現日報'],cinema:['BEYOND THE FRAME','A SILENT DOOR','WHEN LIGHT RETURNS'],book:['ひかりを綴る','まだ知らない景色','境界の手紙'],album:['ECHOES IN COLOR','UNFOLDING','SOFT REVERB'],default:['FORM & WONDER','もうひとつの景色','STORIES IN LIGHT']};
export function buildEditorial(profile,values,random=Math.random){
 const name=(profile.displayName||profile.name||'').trim(),kind=formatFor(values.design).kind,mode=values.type,daily=values.collection==='everyday';
 const noPerson=/風景を主役|モチーフだけ|紋章・アイコン/.test(values.costume),landscape=kind==='landscape'||values.costume==='風景を主役にする';
 const captionRole=/^実写風/.test(values.medium)?'写真キャプション':'図版キャプション';
 const {noText,limited,line}=formatTextPolicy(values);
 const subject=values.theme==='おまかせ'?(daily?'日々の創作':'一夜の物語'):values.theme;
 // A standalone card/book/poster describes the selected story. Random stock
 // English mastheads otherwise displaced the Japanese story in the artwork.
 const title=values.design==='週刊誌の表紙'?'週刊創作':['cover','interview','spread','newspaper'].includes(kind)?pick(titles[kind],random):subject;
 const topics=shuffle((profile.tagsEnabled===true?profile.topics||[]:[]).filter(v=>typeof v==='string'&&v.trim()),random);
 const themeWords=[...new Set([...topics.slice(0,6),subject,...(noPerson||landscape?['景観のかたち','色と光','奥行きの構成','季節と時間','素材の手触り']:['衣装のかたち','色と光','場面づくり','視線の物語','素材の手触り'])])];
 const subjectCopy=pick([subject+'を、ひとつの場面に。',subject+'から始まる、新しい一枚。','見つけたいのは、'+subject+'の向こう側。'],random);
 const intro=noPerson||landscape?subject+'を手がかりに、'+values.place+'の広がりを描く。手前の形から遠景へ続く奥行き。光と余白の重なりから、その場所の表情を探してみたい。':subject+'を手がかりに、'+values.place+'に一つの場面をつくる。'+values.costume+'のかたちと、その場に流れる光。その間に、作り手の視点を探してみたい。';
 const prose=[
 '一枚を見渡すと、最初に気づくのは光の向きだ。手前にあるものと奥にあるもの、その距離が場面の呼吸をつくっている。主役だけを切り取らず、周囲の小さな形にも目を向けたい。',
 noPerson||landscape?'形の輪郭は、置かれた距離によって見え方を変える。手前に重なる面と、遠くに溶ける細部。その違いが、空間の広がりを支えている。光の当たる向きと余白の関係をたどると、見るたびに違う景色が現れる。':'衣装の輪郭は、動きによって表情を変える。袖や裾の重なり、素材が残す陰影。その細部が、物語の中にいる人物の存在を支えている。形と余白の関係をたどると、見るたびに違う景色が現れる。',
 '色を増やすことよりも、どこに置くかを考える。明るい面と静かな影、そして視線を引く小さな差し色。選んだ色の世界を保ちながら、場面の中の時間を感じられる一枚へ。'
 ];
 const slots=[];const add=(role,text,priority=2)=>{if(text)slots.push({role,text,priority});};
 const sourceGuided=profile.activityEnabled!==false&&!limited&&!!(profile.handoff||profile.biography?.trim()||profile.sourceEvidence?.some(a=>a.excerpts?.some(Boolean))||profile.articles?.some(a=>a.text||a.excerpts?.some(Boolean)));
 const result=()=>{
  const generatedSlots=[],fixed=[];
  for(const slot of slots){
   const editable=/^(?:主特集の補足|補助特集(?:の補足)?|リード文|質問\d+|回答\d+|本文小見出し\d+|本文\d+|副記事見出し\d+|副記事本文\d+|引き抜き引用|(?:写真|図版)キャプション|演目の紹介|紹介|紹介文|短い説明|説明|ジャンル欄)$/.test(slot.role)||slot.role==='キャッチ'&&!line;
   if(sourceGuided&&editable){
    const long=/本文|回答|リード|紹介|説明/.test(slot.role),maxCharacters=long?Math.min(750,Math.max(45,slot.text.length)):Math.min(32,Math.max(12,slot.text.length));
    generatedSlots.push({role:slot.role,priority:slot.priority,maxCharacters,instruction:'作者の活動説明と公開記事本文で確認できる内容から、この役割の新しい日本語原稿を一つ作る。選択物語「'+subject+'」と舞台「'+values.place+'」につながる観点を使い、元記事を転載しない。本人の実際の発言・取材・実績として見せず、今回の創作作品の紹介として書く。'+(slot.role.startsWith('質問')?'質問は次の回答と一組にする。':slot.role.startsWith('回答')?'回答は対応する質問を受けた創作の説明とし、本人の発言を捏造しない。':'')});
   }else fixed.push(slot);
  }
  return {mode,name:slots.some(s=>s.role==='作者名')?name:'',title:slots.some(s=>s.priority===0)?title:'',dense:slots.length>=8,slots:fixed,generatedSlots,blocks:fixed.map(s=>s.text),topics,kind,limited,sourceGuided:generatedSlots.length>0};
 };
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
  add('誌名',title,0);add('特集ラベル',daily?'装い・暮らし・表現':'仮装・祝祭・表現',3);
  add('主特集',subject,1);add('主特集の補足',subjectCopy,2);
  themeWords.slice(0,values.design==='週刊誌の表紙'?6:4).forEach((t,i)=>{add('補助特集',values.design==='週刊誌の表紙'?t+['を楽しむ','が変わる','の選び方','を見直す','のひと工夫','を深く知る'][i]:coverLine(t),2);add('補助特集の補足',values.design==='週刊誌の表紙'?['毎日に取り入れる小さな発見','作り手の視点で見つめる','初めてでも分かる実践ガイド','形と素材から考える','次の一枚につながる提案','身近な場面を読み解く'][i]:deck(t),3);});
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
   prose.forEach((text,i)=>{if(kind==='newspaper')text+=' '+["窓の位置を確かめると、明るい面がどちらを向いているかが分かる。机や床に落ちる影は、同じ光源から伸びている必要がある。近くのものは輪郭をはっきり残し、遠くのものはコントラストを控える。その差を小さく積み重ねることで、平面の中に一つの空間が生まれる。強い光を増やすだけでは、素材の違いは伝わらない。暗い部分を残すことも、見せたい形を支える大切な仕事だ。見る位置と光の位置を決め、最後までその関係を保つ。", "細部を決める前に、全体の大きな形を確かめたい。線が交わる位置や面の重なりには、それぞれ理由がある。軽い素材は小さく揺れ、厚い素材は重さを感じさせる。支えのある部分と離れた部分を描き分ければ、止まった一枚にも動きの前後が見えてくる。意匠を増やす時も、構造のつながりを失わないことが大切だ。飾りと本体がどのように結びつくかを考える。視線を引く場所に細部を集め、それ以外を静かに整えると、全体の形が読み取りやすくなる。", "使う色を絞ると、明るさや面積の違いがよく見える。主色を広い領域に置き、副色で形をつなぐ。強い色は小さな面に留めると、視線の行き先をつくりやすい。紙面では、題字、見出し、本文の大きさにも同じ考え方が使える。全てを強調すると、読む順番が曖昧になる。一番伝えたいことを先に決め、その周囲へ情報を配置したい。小さく表示した時にも主題が残るか確かめる。画面の大きさが変わっても、光と色の関係を保つことが完成への手がかりになる。"][i];add('本文小見出し'+(i+1),['光がつくる距離','かたちに宿る動き','色を置く、その理由'][i],2);add('本文'+(i+1),text+(kind==='newspaper'&&i===2?'制作の途中では、完成時と同じ大きさだけで確認しない。画面を小さくして見ると、明暗のまとまりや文字の優先順位が分かりやすい。反対に細部を拡大すると、線の接続や色の境界を確かめられる。二つの見方を行き来しながら、全体と部分を整えていく。主題の輪郭と背景の形が重なる時は、明度差をつけるか、どちらかの密度を下げる。余白は情報のない場所ではなく、読者の目を次の場所へ運ぶ役割を持つ。図版と文字の間にある距離も、読みやすさを左右する。原稿の長さに合わせて列を調整し、必要な文章を省かずに収める。書体を増やす前に、太さ、大きさ、揃えの違いで役割を分けたい。試作を保存しておけば、前の状態と見比べられる。どの変更が伝わりやすさにつながったのかを確かめ、理由を次の制作へ引き継ぐ。選んだ素材や色を最後まで大切にすることで、表現の方向がまとまる。':''),3);});
   if(kind==='newspaper'){themeWords.slice(0,2).forEach((t,i)=>{add('副記事見出し'+(i+1),coverLine(t),2);add('副記事本文'+(i+1),deck(t)+'場面の中にある形や色をたどり、新しい作品の入り口を探す。'+prose[i]+'細部を増やす前に、大きな形と読む順番を確かめたい。小さな発見を一つずつ記録し、次の制作で試してみる。'+['一つの題材でも、見る場所を変えると新しい形が見つかる。まずは目に留まった輪郭や色を短く記録したい。後からまとめて整える時、最初の発見が手がかりになる。身近な素材には、小さな傷や不揃いな線がある。全てを滑らかに消すのではなく、その素材らしさにつながる部分を選んで残す。完成を急がず、光の方向や形の接続を一つずつ確かめる。描き込みが増えたら、少し離れて全体のバランスを見直す。', '作品に使う色は、単独の美しさだけで決めない。隣に置く色や、画面に占める面積によって印象は変わる。同じ色でも明部と暗部の差があれば、形の厚みを表せる。試しに小さな色面を並べ、境界が読めるか確認したい。強い差し色は少量から始める。主題より目立つ場合は、その面積か明るさを控える。細部と余白を行き来して、視線の流れを整える。選んだ色の範囲を保つことが、作品全体のまとまりを支える。'][i],3);});}
  }
  add('引き抜き引用',line||subjectCopy,1);add(captionRole,subject+(name?' / '+name:''),3);
  // A standalone creation has no issue or page sequence. Never invent a folio.
  return result();
 }
 add(['cinema','stage','festival'].includes(kind)?'作品タイトル':kind==='book'?'書名':kind==='album'?'アルバム名':'主見出し',title,0);add('作者名',name,2);add('キャッチ',line||subjectCopy,1);
 if(kind==='cinema'&&(automatic||/クレジット/.test(mode))){add('ビリング1','ART & STORY  '+name,3);add('ビリング2','VISUAL CONCEPT  '+name+'  /  AN ORIGINAL WORK',3);add('ビリング3','CHARACTER / COSTUME / WORLD DESIGN',3);}
 else if(kind==='stage'&&density){add('演目の紹介',intro,2);add('制作クレジット','CREATIVE DIRECTION / ART  '+name,3);}
 else if(kind==='festival'&&density){add('ジャンル欄',themeWords.slice(0,4).join(' / '),2);add('紹介',subjectCopy,2);}
 else if(kind==='editorial'&&automatic){add('リード文',intro,2);add(captionRole,noPerson?values.place:values.costume,3);}
 else if(kind==='reference'&&automatic){add('分類名',noPerson?subject:values.costume,2);add('形の注記',noPerson?'形と奥行き':values.pose,3);add('短い説明',intro,3);}
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
 const generated=(copy.generatedSlots||[]).map((slot,index)=>'編集原稿'+(index+1)+' / '+slot.role+' / 階層'+slot.priority+' / '+slot.maxCharacters+'字以内：'+slot.instruction);
 return [
  limited?'許可された原稿は次の'+slots.length+'ブロックだけ。形式の標準文字量を満たすために文言を増やさず、この文字列と役割をそのまま配置する。':generated.length?'次の確定原稿の文字列は変更せず、編集依頼にある役割だけを追加して完成原稿にする。許可した役割以外の文章や情報を増やさない。':'制作原稿は次の役割ごとに確定済み。各原稿を選択形式の個別制作仕様へ配置し、原稿にない文言や情報役割を補わない。',
  ...(emitted.size?['見開きの本文原稿は次の左本文枠A・右本文枠Bの2枠へ割り当てる。3つの話題を3列へ分けず、本文小見出し2と3は同じ右枠Bの中で縦に続ける。本文枠内に小画像やカード枠を追加しない。']:[]),
  ...manuscript,
  ...(generated.length?['以下の役割の原稿だけは、公開活動の本文資料を根拠に新しく編集してから印字する。原稿が未作成のため、役割名や編集指示を作品内の文字として描かない。',...generated]:[]),
  '今回使う文字階層は '+levels.join(' / ')+'。数値の小さい階層から視線が進む大小と太さを使い、原稿が一種類なら一つのまとまりにする。選択形式の個別仕様に従って配置し、原稿内にない階層を埋めない。書体は原則2系統以内で、日本語の行末・句読点・読み順を整える。',
  ...(roles.has('誌名')&&roles.has('作者名')?['誌名と作者名は今回の原稿にある別の役割として保ち、同じ文字列へ置換しない。']:[]),
  ...(roles.has('柱')||roles.has('ノンブル')?['原稿にある柱・ノンブルは個別仕様の欄外へ小さく配置し、主見出しと同じ大きさにしない。']:[]),
  ...(body?['用意した本文・質問・回答は意味のある文章として順に組み、見出しの反復や疑似文字で埋めない。この図版のための創作原稿であり、本人の実際の発言・取材・刊行情報として示さない。']:[]),
  '実在雑誌・出版社・広告・映画のロゴ、未確認の価格・日付・会場・業績は原稿へ追加しない。'
 ];
}
