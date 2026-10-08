import {formatFor} from './formats.js?v=28.4.1';
import {formatTextPolicy} from './format-recipes.js?v=28.4.1';
import {buildTypographySlots} from './typography-options.js?v=28.4.1';
import {copyContentRules,publicCopyContext,worldIntroduction,copyRoleSources,copyEditingInstruction} from './copy-scope.js?v=28.4.1';
import {halloweenCopyRules,halloweenTitle} from './halloween-mode-contract.js?v=28.4.1';
const pick=(items,random)=>items[Math.min(items.length-1,Math.floor(random()*items.length))];
function shuffle(items,random){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const titles={cover:['装い帖','色と暮らし','創作日和','余白の時間','光の便り'],interview:['制作の現場','創作の声','発想の手帖'],spread:['表現の手帖','動きのある世界','新しい視点'],newspaper:['創作通信','彩景新聞','表現日報'],cinema:['BEYOND THE FRAME','A SILENT DOOR','WHEN LIGHT RETURNS'],book:['ひかりを綴る','まだ知らない景色','境界の手紙'],album:['ECHOES IN COLOR','UNFOLDING','SOFT REVERB'],default:['FORM & WONDER','もうひとつの景色','STORIES IN LIGHT']};
const halloweenTitles={cover:['ハロウィーン夜帖','ハロウィーン祝祭録','ハロウィーンの便り'],interview:['ハロウィーンの物語','ハロウィーン夜話','ハロウィーンの声'],spread:['ハロウィーンの手帖','ハロウィーン一夜の旅','ハロウィーンの秘密'],newspaper:['ハロウィーン夜報','ハロウィーン祝祭新聞','ハロウィーン怪奇通信']};
export function buildEditorial(profile,values,random=Math.random){
 const name=(profile.displayName||profile.name||'').trim(),kind=formatFor(values.design).kind,mode=values.type,daily=values.collection==='everyday';
 const noPerson=/風景を主役|モチーフだけ|紋章・アイコン/.test(values.costume),landscape=kind==='landscape'||values.costume==='風景を主役にする';
 const captionRole=/^実写風/.test(values.medium)?'写真キャプション':'図版キャプション';
 const {noText,limited,line,roleScoped=false}=formatTextPolicy(values);
 const selectedSubject=values.theme==='おまかせ'?(daily?'日々の創作':'一夜の物語'):values.theme;
 const contentSources=publicCopyContext(values,{subject:selectedSubject,noPerson:noPerson||landscape}),subject=contentSources.story,intro=worldIntroduction(contentSources);
 // A standalone card/book/poster describes the selected story. Random stock
 // English mastheads otherwise displaced the Japanese story in the artwork.
 const title=values.design==='週刊誌の表紙'?(daily?'週刊創作':'週刊ハロウィーン'):['cover','interview','spread','newspaper'].includes(kind)?pick((daily?titles:halloweenTitles)[kind],random):subject;
 const topics=shuffle((profile.tagsEnabled===true?profile.topics||[]:[]).filter(v=>typeof v==='string'&&v.trim()),random);
 const themeWords=[...new Set(daily?[...topics.slice(0,6),subject,'この場所の秘密','旅の手がかり','出会いと発見','物語の始まり','まだ知らない道']:[...topics.slice(0,6).map(halloweenTitle),subject,'Halloweenの一夜の手がかり','Halloweenの祝祭と秘密','Halloweenの物語の始まり','Halloweenの夜に続く道','Halloweenの招待と贈り物'])];
 const subjectCopy=daily?pick([subject+'の、その先へ。',subject+'から始まる、新しい物語。','見つけたいのは、'+subject+'の向こう側。'],random):pick([contentSources.purpose+'。','今夜の入口は、'+contentSources.setting+'に。',contentSources.event+'へ、あなたも。'],random);
 const prose=daily?[
 contentSources.setting+'には、まだ知られていない道がある。馴染みのある場所も、一歩進むたびに別の顔を見せる。'+contentSources.story+'の始まりは、そんな小さな違和感だった。遠くに残る気配をたどれば、この場所の秘密へ近づけるかもしれない。すぐに答えが見つからなくても、足を止めて周囲の出来事を確かめたい。ここに残されたものには、それぞれの時間がある。',
 (noPerson||landscape?'この場所に残る小さな痕跡は、何を伝えているのだろう。':'この世界の'+contentSources.protagonist+'は、'+contentSources.purpose+'。')+'先へ進むには、知っていることとまだ分からないことを見分けなければならない。見慣れたもののそばに、新しい手がかりが隠れていることもある。一つの発見が、これまでの出来事を別の意味で結び直す。物語の途中だからこそ、次に何を選ぶかを想像する楽しみが残る。',
 '物語の終わりは、まだ決まっていない。'+contentSources.setting+'で見つけた手がかりを持って、どこへ向かうのか。その問いは、この世界を訪れる人にも開かれている。'+contentSources.story+'をたどるうちに、最初は気づかなかった出来事へ目が向くかもしれない。誰かに話してみたくなる発見も、自分だけに残しておきたい秘密もある。次の一歩から始まる物語へ、あなたも。'
 ]:[
 contentSources.setting+'で始まる、'+contentSources.event+'。今夜の物語は「'+contentSources.selectedStory+'」。馴染みのある場所に残された包みや招待の気配が、祝祭への入口を知らせている。何が起きたのか、どこへ続くのか。一つずつ手がかりをたどると、この場所で迎える特別な一日が見えてくる。',
 (noPerson||landscape?'Halloweenの集まりのあと、この場所には何が残るのだろう。':'この世界の'+contentSources.protagonist+'と、'+contentSources.purpose+'。')+'贈り物、まだ開かれていない道、いつもとは違う出来事。ここで選ぶ一つの答えが、祝祭の物語を変えていく。謎を急いで決めつけず、今夜だけの出来事と場所の関係を確かめたい。',
 'Halloweenの物語には、まだ続きがある。'+contentSources.setting+'で見つけた手がかりは、祝祭の終わりを告げるものか、それとも次の出来事への招待か。「'+contentSources.selectedStory+'」の先を想像しながら、ここに残された小さな秘密をたどる。一夜の記憶を持って、あなたもこの物語の先へ。'
 ];
 const slots=[];let typography=null;const add=(role,text,priority=2)=>{if(text)slots.push({role,text,priority});};
 const sourceGuided=profile.activityEnabled!==false&&!limited&&!!(profile.handoff||profile.biography?.trim()||profile.sourceEvidence?.some(a=>a.excerpts?.some(Boolean))||profile.articles?.some(a=>a.text||a.excerpts?.some(Boolean)));
 const result=()=>{
  const generatedSlots=[],fixed=[];
  for(const slot of slots){
   const editable=slot.editable||/^(?:主特集の補足|補助特集(?:の補足)?|リード文|質問\d+|回答\d+|本文小見出し\d+|本文\d+|副記事見出し\d+|副記事本文\d+|引き抜き引用|(?:写真|図版)キャプション|演目の紹介|紹介|紹介文|短い説明|説明|ジャンル欄)$/.test(slot.role)||slot.role==='キャッチ'&&!line;
   if(sourceGuided&&editable){
    const long=/本文|回答|リード|紹介|説明/.test(slot.role),maxCharacters=slot.maxCharacters||(long?Math.min(750,Math.max(45,slot.text.length)):Math.min(32,Math.max(12,slot.text.length)));
    const contentDomain=slot.contentDomain||(daily?'public_activity':'story_world');
    const context=typography?.contentSources||contentSources;
    generatedSlots.push({role:slot.role,priority:slot.priority,maxCharacters,contentDomain,contentSources:copyRoleSources(context,contentDomain),instruction:copyEditingInstruction(context,{domain:contentDomain})+(slot.instruction||'')+(slot.role.startsWith('質問')?'質問は次の回答と一組にする。':slot.role.startsWith('回答')?'回答は対応する質問を受けた公開活動の紹介とし、本人の発言を捏造しない。':'')});
   }else fixed.push({role:slot.role,text:slot.text,priority:slot.priority});
  }
  return {mode,name:slots.some(s=>s.role==='作者名'||s.role==='キャラクター名')?name:'',title:slots.find(s=>s.priority===0)?.text||'',dense:slots.length>=8,slots:fixed,generatedSlots,blocks:fixed.map(s=>s.text),topics,kind,limited,roleScoped,contentSources:typography?.contentSources||contentSources,sourceGuided:generatedSlots.length>0,...(typography?{typographyLayout:typography.layout,typographyDensity:typography.density}:{})};
 };
 if(noText)return {mode:'none',name:'',title:'',dense:false,slots:[],blocks:[],topics:[],kind,limited:false};
 typography=buildTypographySlots(mode,{subject:selectedSubject,name,intro,noPerson:noPerson||landscape,values});
 if(typography){slots.push(...typography.slots);return result();}
 if(mode==='クリエイター名だけ'||/サイン風|落款風/.test(mode)){add('作者名',name,1);return result();}
 if(mode==='HALLOWEENのみ'){add('テーマ名','HALLOWEEN',1);return result();}
 if(mode==='HALLOWEEN＋クリエイター名'){add('テーマ名','HALLOWEEN',1);add('作者名',name);return result();}
 if(mode==='セリフのみ'){add('セリフ',line,1);return result();}
 if(mode==='短いタイトル＋名前'||mode==='クリエイター名＋自由な見出し'){add(mode==='短いタイトル＋名前'?'作品タイトル':'主見出し',title,0);add('作者名',name,2);return result();}
 const automatic=mode==='デザインに合わせて自動編集',rich=/たっぷり|新聞風/.test(mode);
 const density=rich||automatic&&['cover','interview','spread','newspaper','cinema','stage','festival','advert','flyer','zine','exhibition'].includes(kind);
 const coverLine=topic=>pick([topic+'を編む',topic+'の向こう側',topic+'に触れる',topic+'の新しい視点'],random);
 const deck=topic=>pick([topic+'をたどり、次の発見へ。',topic+'から始まる小さな物語。','あなたも、'+topic+'の向こう側へ。'],random);
 if(kind==='cover'&&density){
  add('誌名',title,0);add('特集ラベル',daily?'装い・暮らし・表現':'Halloween・祝祭・一夜の物語',3);
  add('主特集',subject,1);add('主特集の補足',subjectCopy,2);
  themeWords.slice(0,values.design==='週刊誌の表紙'?6:4).forEach((t,i)=>{add('補助特集',values.design==='週刊誌の表紙'?t+['を楽しむ','が変わる','の選び方','を見直す','のひと工夫','を深く知る'][i]:coverLine(t),2);add('補助特集の補足',values.design==='週刊誌の表紙'?(daily?['毎日に取り入れる小さな発見','作り手の視点で見つめる','初めてでも分かる実践ガイド','形と素材から考える','次の一枚につながる提案','身近な場面を読み解く']:['Halloweenの一夜へ続く発見','Halloweenの祝祭に残る気配','Halloweenの物語への入口','Halloweenの贈り物と秘密','Halloweenの夜をめぐる手がかり','Halloweenの出来事をたどる'])[i]:deck(t),3);});
  add('作者名',name,2);add('セリフ',line,2);return result();
 }
 if(['interview','spread','newspaper'].includes(kind)&&density){
  add(kind==='newspaper'?'新聞題字':'柱',title,kind==='newspaper'?0:3);add('特集見出し',subject,kind==='newspaper'?1:0);add('リード文',intro,2);add('作者名',name,3);
  if(kind==='newspaper')add('紙面分類',daily?'創作特集':'Halloween特集',3);
  if(kind==='interview')add('欄名',daily?'創作Q&A':'Halloweenの物語Q&A',3);
  if(kind==='interview'){
   add('質問1',daily?'Q. この物語では、何を探している？':'Q. Halloweenの一夜に、何を探す？',2);add('回答1','A. '+contentSources.purpose+'。'+contentSources.story+'の先には、まだ知らない出来事が待っている。答えを急がず、一つずつ手がかりをたどることが、この世界を知る入口になる。',3);
   add('質問2',daily?'Q. この場所には、どんな秘密がある？':'Q. Halloweenの場所に残る秘密は？',2);add('回答2','A. '+contentSources.setting+'に残る'+(daily?'小さな手がかり。':'Halloweenの手がかり。')+'見慣れたもののそばにも、次の物語への入口がある。誰かが残した痕跡と今ここで起きる出来事を結びつけると、知らなかった場所の姿が見えてくる。',3);
   add('質問3',daily?'Q. 次は、どこへ向かう？':'Q. Halloweenの物語は、どこへ続く？',2);add('回答3','A. '+(daily?'まだ決まっていない道へ。':'Halloweenの一夜だけ開く道へ。')+'一つの発見が、次に進む理由になる。ここで知ったことを持って歩き出せば、これまでとは違う出会いがあるかもしれない。その先の物語は、訪れた人にも開かれている。',3);
  }else{
   prose.forEach((text,i)=>{add('本文小見出し'+(i+1),(daily?['まだ知らない道','秘密をたどる','次の物語へ']:['Halloweenの一夜の入口','Halloweenの手がかり','Halloweenの物語の先へ'])[i],2);add('本文'+(i+1),text,3);});
   if(kind==='newspaper'){
    (daily?['この場所の手がかり','物語の、その先へ']:['Halloweenの場所に残る手がかり','Halloweenの物語、その先へ']).forEach((text,i)=>{add('副記事見出し'+(i+1),text,2);add('副記事本文'+(i+1),prose[i],3);});
   }
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
 else if(kind==='reference'&&automatic){add('分類名',noPerson?contentSources.story:contentSources.protagonist,2);add('形の注記',contentSources.purpose,3);add('短い説明',intro,3);}
 else if(kind==='book'||mode==='物語の装丁風・タイトルと紹介'){add('紹介文',intro,2);}
 else if(density){themeWords.slice(0,rich?4:3).forEach(t=>{add('補助見出し',coverLine(t),2);add('説明',deck(t),3);});if(['advert','exhibition'].includes(kind))add('紹介文',intro,3);}
 return result();
}
export function editorialContract(copy){
 const slots=copy.slots||[];
 if(copy.mode==='none'||!slots.length&&!(copy.generatedSlots||[]).length)return ['文字・数字・ロゴ・サイン・署名・疑似文字を描かない。文字のない完成図版とし、看板や紙面の空きにも代わりの原稿を追加しない。'];
 const limited=copy.limited??formatTextPolicy({type:copy.mode,line:slots.find(s=>s.role==='セリフ')?.text}).limited;
 const roles=new Set(slots.map(s=>s.role)),body=slots.some(s=>/本文|質問|回答/.test(s.role));
 const allRoles=[...slots,...(copy.generatedSlots||[])];
 const levels=[...new Set(allRoles.map(s=>s.priority))].sort((a,b)=>a-b).map(priority=>'階層'+priority+'：'+[...new Set(allRoles.filter(s=>s.priority===priority).map(s=>s.role))].join('・'));
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
  ...copyContentRules,
  ...halloweenCopyRules(copy.contentSources||{collection:'everyday'}),
  ...(copy.typographyLayout?['今回の文字密度：'+copy.typographyDensity+'。今回許可した原稿の役割を使い、形式側に標準の誌名・特集・本文が書かれていても、それを追加原稿として補わない。','今回の文字配置：'+copy.typographyLayout]:[]),
  limited?'許可された原稿は次の'+slots.length+'ブロックだけ。形式の標準文字量を満たすために文言を増やさず、この文字列と役割をそのまま配置する。':generated.length?'次の確定原稿の文字列は変更せず、編集依頼にある役割だけを追加して完成原稿にする。許可した役割以外の文章や情報を増やさない。':'制作原稿は次の役割ごとに確定済み。各原稿を選択形式の個別制作仕様へ配置し、原稿にない文言や情報役割を補わない。',
  ...(emitted.size?['見開きの本文原稿は次の左本文枠A・右本文枠Bの2枠へ割り当てる。3つの話題を3列へ分けず、本文小見出し2と3は同じ右枠Bの中で縦に続ける。本文枠内に小画像やカード枠を追加しない。']:[]),
  ...manuscript,
  ...(generated.length?['以下の役割の原稿だけは、各役割に指定した作品世界内の内容のネタ、または確認済み公開活動を根拠に新しく編集してから印字する。画像の仕様資料は原稿の資料ではない。原稿が未作成のため、役割名や編集指示を作品内の文字として描かない。',...generated]:[]),
  '今回使う文字階層は '+levels.join(' / ')+'。数値の小さい階層から視線が進む大小と太さを使い、原稿が一種類なら一つのまとまりにする。選択形式の個別仕様に従って配置し、原稿内にない階層を埋めない。書体は原則2系統以内で、日本語の行末・句読点・読み順を整える。',
  ...(roles.has('誌名')&&roles.has('作者名')?['誌名と作者名は今回の原稿にある別の役割として保ち、同じ文字列へ置換しない。']:[]),
  ...(roles.has('柱')||roles.has('ノンブル')?['原稿にある柱・ノンブルは個別仕様の欄外へ小さく配置し、主見出しと同じ大きさにしない。']:[]),
  ...(body?['用意した本文・質問・回答は意味のある文章として順に組み、見出しの反復や疑似文字で埋めない。この図版のための創作原稿であり、本人の実際の発言・取材・刊行情報として示さない。']:[]),
  '実在雑誌・出版社・広告・映画のロゴ、未確認の価格・日付・会場・業績は原稿へ追加しない。'
 ];
}
