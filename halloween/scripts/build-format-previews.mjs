import fs from 'node:fs';
import {createRequire} from 'node:module';
import {questions} from '../catalog.js?v=28.0.1';
import {applyCollection} from '../collection.js?v=28.0.1';
const require=createRequire(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/sharp/package.json');
const sharp=require('sharp'),root=new URL('../',import.meta.url);
const titles=new Set();
for(const mode of ['halloween','everyday']){applyCollection(mode);for(const g of questions.find(q=>q.key==='design').groups)for(const v of g.values)titles.add(v);}
applyCollection('halloween');
const preserved=new Set(['ファッション雑誌の表紙','週刊誌の表紙','カルチャー誌の表紙','インタビュー誌面','見開き特集','新聞の一面','自然・都市の風景画']);
const assets={photo:'japan-photo-v18.png',anime:'japan-luminous-v18.png',land:'japan-landscape-v19.png'};
const defs=[],assetBoxes={};
for(const [id,file] of Object.entries(assets)){
 // Encode existing artwork for the native SVG layout, without changing its composition
 // or drawing over it. JPEG encoding keeps the shared preview payload small.
 const metadata=await sharp(fs.readFileSync(new URL(file,root))).metadata();
 assetBoxes[id]=[metadata.width,metadata.height];
 const bytes=await sharp(fs.readFileSync(new URL(file,root))).jpeg({quality:88}).toBuffer();
 defs.push('<image id="'+id+'" href="data:image/jpeg;base64,'+bytes.toString('base64')+'" width="'+metadata.width+'" height="'+metadata.height+'" preserveAspectRatio="xMidYMid meet"/>');
}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const W=1000,H=1400;
const specs={
 'ゴシック雑誌の表紙':{kind:'gothic',title:'夜の装い',asset:'anime',bg:'#181722',ink:'#f4efe4'},
 '写真集の表紙':{kind:'photobook',title:'窓辺の時間',asset:'photo'},
 '文芸誌の表紙':{kind:'literary',title:'余白のことば',asset:'land'},
 'ZINEの表紙':{kind:'zine',title:'日々を拾う',asset:'photo'},
 '図鑑の扉':{kind:'guide',title:'風景の図鑑',asset:'land'},
 '絵本の表紙':{kind:'picturebook',title:'ひかりの森へ',asset:'land',bg:'#fff3ce'},
 '小説の装丁':{kind:'novel',title:'湖に届く手紙',asset:'land'},
 '音楽アルバムジャケット':{kind:'album',title:'余韻',asset:'anime',bg:'#24263d',ink:'#fffaf1'},
 'ゲームのパッケージ':{kind:'game',title:'月灯の旅人',asset:'anime',bg:'#181722',ink:'#fffaf1'},
 '映画ポスター':{kind:'cinema',title:'窓の向こうで',asset:'photo',bg:'#152333',ink:'#fffaf1'},
 '舞台ポスター':{kind:'stage',title:'光を待つ人',asset:'photo'},
 '音楽フェスポスター':{kind:'festival',title:'森と音の一日',asset:'land',bg:'#fff3ce'},
 '展覧会ポスター':{kind:'exhibition',title:'ひかりを描く',asset:'land'},
 'タイポグラフィーポスター':{kind:'type',title:'光と、余白。',asset:'photo',bg:'#ee583e'},
 'スイス式グリッドポスター':{kind:'swiss',title:'形と余白',asset:'photo',bg:'#e5ded2'},
 'バウハウスポスター':{kind:'bauhaus',title:'線と面',asset:'photo',bg:'#f4dfab'},
 'アールデコポスター':{kind:'deco',title:'夜の劇場',asset:'anime',bg:'#162c2d',ink:'#ebcb87'},
 'アールヌーヴォーポスター':{kind:'nouveau',title:'花の記憶',asset:'anime',bg:'#e5e0c6'},
 'サイケデリックポスター':{kind:'psychedelic',title:'ゆらめく世界',asset:'anime',bg:'#501b69',ink:'#fff0a3'},
 'パンク・フライヤー':{kind:'punk',title:'声を、放て。',asset:'photo',bg:'#f5ee55'},
 'レトロ旅行ポスター':{kind:'travel',title:'湖畔へ',asset:'land',bg:'#e7d7b4'},
 '通常の一枚絵':{kind:'art',asset:'anime',bg:'#1e1c35'},
 'キャラクターのキービジュアル':{kind:'key',asset:'anime',bg:'#1e1c35'},
 '幻想風景画':{kind:'landscape',asset:'land',bg:'#eee9df'},
 '映画のワンシーン':{kind:'scene',asset:'land',bg:'#111921'},
 'ファッション・エディトリアル':{kind:'fashion',title:'装う、わたし。',asset:'photo'},
 '物語の挿絵':{kind:'insert',title:'風の便り',asset:'land'},
 '絵巻物':{kind:'scroll',asset:'land',bg:'#e6ddba'},
 '屏風絵':{kind:'screen',asset:'land',bg:'#ceaf64'},
 '掛け軸':{kind:'hanging',asset:'land',bg:'#a29d72'},
 'タロットカード':{kind:'tarot',title:'月の旅人',asset:'anime',bg:'#152333',ink:'#e7cf93'},
 'トレーディングカード':{kind:'card',title:'光の案内人',asset:'anime',bg:'#1e1c35',ink:'#fff7dd'},
 '図案・パターン':{kind:'pattern',bg:'#eee9df'},
 'noteサムネイル':{kind:'thumbnail',title:'好きな色で、生きていく。',asset:'photo'},
 'アイコン・肖像':{kind:'icon',asset:'photo'},
 '紋章・エンブレム':{kind:'emblem',bg:'#1c3538',ink:'#ecd5a0'},
 'ステッカー':{kind:'sticker',asset:'anime',bg:'#e7dfcb'},
 '切手':{kind:'stamp',title:'湖のひかり',asset:'land'},
 'ポストカード':{kind:'postcard',title:'風のたより',asset:'land'},
 'スマホ壁紙':{kind:'wallpaper',asset:'anime',bg:'#1e1c35'},
 '広告ビジュアル':{kind:'advert',title:'創作の時間を、あなたへ。',asset:'photo',bg:'#f3d6c5'}
};
const manifest=[],views=[],groups=[];
for(const name of titles){
 if(preserved.has(name))continue;
 const s=specs[name];if(!s)throw new Error('Missing individual native preview: '+name);
 const i=manifest.length,id='format-'+String(i+1).padStart(2,'0'),x=i*W;
 const items=[],ink=s.ink||'#253035',bg=s.bg||'#f8f5ed';
 const rect=(a,b,w,h,fill=ink,stroke='none',radius=0)=>items.push(`<rect x="${a}" y="${b}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" stroke="${stroke}"/>`);
 const line=(a,b,c,d,color=ink,width=2)=>items.push(`<path d="M${a} ${b}L${c} ${d}" fill="none" stroke="${color}" stroke-width="${width}"/>`);
 const text=(t,a,b,size=38,opts={})=>items.push(`<text x="${a}" y="${b}" fill="${opts.fill||ink}" font-size="${size}" font-weight="${opts.bold?800:400}" font-family="${opts.serif?'Noto Serif CJK JP,serif':'Noto Sans CJK JP,sans-serif'}"${opts.vertical?' writing-mode="vertical-rl" text-orientation="upright"':''}${opts.center?' text-anchor="middle"':''}>${esc(t)}</text>`);
 const art=(a,b,w,h,asset=s.asset)=>items.push(`<svg x="${a}" y="${b}" width="${w}" height="${h}" viewBox="0 0 ${assetBoxes[asset].join(' ')}" preserveAspectRatio="xMidYMid meet"><use href="#${asset}"/></svg>`);
 const border=(a,b,w,h,color=ink)=>rect(a,b,w,h,'none',color);
 rect(0,0,W,H,bg);
 switch(s.kind){
 case 'gothic':art(90,200,820,1010);border(45,45,910,1310,ink);text(s.title,500,155,92,{serif:true,center:true});text('仮装の美学',900,320,42,{vertical:true});text('光と影の物語',100,350,34,{vertical:true});text('もうひとつの自分に出会う',500,1290,40,{center:true});break;
 case 'photobook':art(70,80,860,1070);text(s.title,90,1220,48,{serif:true});text('春野 澪',90,1295,27);break;
 case 'literary':art(70,700,750,540);text(s.title,890,100,74,{vertical:true,serif:true});text('物語が生まれる場所',700,145,40,{vertical:true,serif:true});text('書くこと、読むこと、暮らすこと。',560,170,28,{vertical:true});text('特集　言葉を探して',70,1330,30,{serif:true});break;
 case 'zine':rect(65,130,870,110,'#e67b51');text(s.title,105,215,77,{bold:true});items.push('<g transform="rotate(-5 500 690)">');art(140,290,720,910);border(130,280,740,930);items.push('</g>');text('小さな発見の記録',80,1290,43);text('つくる／歩く／集める',80,1350,27);break;
 case 'guide':text(s.title,80,150,72,{serif:true});line(80,205,920,205);art(70,300,860,730);text('山と湖、岸辺と植生',80,1120,42,{bold:true});text('地形のつながりを見つめる',80,1190,31);text('図像と解説から読み解く',80,1270,27);break;
 case 'picturebook':text(s.title,500,185,80,{center:true,bold:true});art(45,280,910,900);text('作・絵　春野 澪',500,1300,30,{center:true});break;
 case 'novel':art(85,310,790,760);text(s.title,885,110,73,{vertical:true,serif:true});text('春野 澪',175,120,34,{vertical:true});rect(0,1120,1000,280,'#273b44');text('届かなかった言葉が、',70,1220,40,{fill:'#fff8e8',serif:true});text('静かな湖にひらいていく。',70,1300,40,{fill:'#fff8e8',serif:true});break;
 case 'album':art(60,170,880,970);text(s.title,500,120,70,{center:true});text('春野 澪',500,1280,30,{center:true});break;
 case 'game':art(70,200,860,900);text(s.title,500,130,90,{center:true,bold:true});text('その光は、明日へ続く。',500,1220,40,{center:true});text('オリジナル作品',500,1310,25,{center:true});break;
 case 'cinema':text('その窓が、世界の入口だった。',500,105,37,{center:true});art(40,170,920,960);text(s.title,500,1210,85,{center:true,serif:true});text('原作・美術　春野 澪',500,1300,26,{center:true});text('オリジナル作品',500,1350,22,{center:true});break;
 case 'stage':text(s.title,880,90,95,{vertical:true,serif:true});art(85,240,680,820);line(75,1150,925,1150);text('ひとつの声が、場面を変える。',75,1240,43,{serif:true});text('創作舞台　春野 澪',75,1320,30);break;
 case 'festival':text(s.title,70,130,75,{bold:true});art(55,250,890,800);rect(55,1090,890,180,'#2c5144');text('音楽と創作の集い',500,1160,40,{fill:'#fffaf0',center:true});text('光／ことば／音の余韻',500,1230,30,{fill:'#fffaf0',center:true});break;
 case 'exhibition':text(s.title,80,150,76,{serif:true});text('春野 澪　作品展',80,220,29);art(90,320,820,750);line(80,1160,920,1160);text('色と余白のあいだ',80,1250,40);text('作品から、光のゆくえをたどる。',80,1320,26);break;
 case 'type':text('光と、',70,240,170,{bold:true});text('余白。',80,485,195,{bold:true});line(75,560,925,560,'#fff5e9',12);art(480,670,430,560);text('言葉を、形に。',85,700,48,{vertical:true,bold:true});break;
 case 'swiss':text('形と',65,140,112,{bold:true});text('余白',65,275,112,{bold:true});rect(65,330,865,10,'#ce482b');art(65,405,550,700);text('見る、',725,430,46,{bold:true});text('整える、',725,505,40,{bold:true});text('伝える。',725,580,40,{bold:true});line(65,1160,930,1160);text('造形と編集の記録',65,1260,34);break;
 case 'bauhaus':rect(80,100,100,1130,'#cf3b2f');items.push('<circle cx="650" cy="340" r="220" fill="#e4b636"/>');rect(410,510,500,530,'#244875');text(s.title,245,1240,106,{bold:true});text('造形の実験',245,1310,34);break;
 case 'deco':for(let n=0;n<6;n++)border(45+n*18,45+n*20,910-n*36,1310-n*40);art(220,290,560,800);text(s.title,500,200,85,{center:true,serif:true});for(let n=0;n<9;n++)line(500,1160,110+n*97,1270,ink,3);text('光を纏う',500,1320,35,{center:true});break;
 case 'nouveau':border(60,60,880,1280);art(200,320,600,820);items.push(`<path d="M140 1250C30 1000 300 800 110 580C40 440 90 160 280 170M860 1250C970 1000 700 800 890 580C960 440 910 160 720 170" fill="none" stroke="${ink}" stroke-width="13"/>`);text(s.title,500,240,84,{center:true,serif:true});text('季節と記憶のかたち',500,1280,32,{center:true});break;
 case 'psychedelic':for(let n=0;n<10;n++)items.push(`<ellipse cx="500" cy="700" rx="${490-n*36}" ry="${650-n*48}" fill="none" stroke="${n%2?'#f5a346':'#a2bc80'}" stroke-width="18"/>`);art(250,450,500,670);text(s.title,500,270,79,{center:true,bold:true});text('色の向こうへ',500,1260,43,{center:true});break;
 case 'punk':art(150,300,700,850);items.push('<g transform="rotate(-6 500 190)">');rect(50,100,900,160,'#151515');text(s.title,90,215,103,{bold:true,fill:'#fff5eb'});items.push('</g>');rect(50,1120,760,130,'#ee563d');text('ありのまま、つくる。',80,1210,49,{bold:true});text('音と言葉の創作',80,1320,35);break;
 case 'travel':text(s.title,500,170,113,{center:true,serif:true});art(55,270,890,850);text('山の輪郭を、ゆっくりたどる。',500,1240,37,{center:true});text('日本の風景',500,1320,30,{center:true});break;
 case 'art':case 'key':case 'wallpaper':art(0,0,1000,1400);break;
 case 'landscape':art(0,100,1000,1200);break;
 case 'scene':art(30,415,940,570);break;
 case 'fashion':text(s.title,70,140,77,{serif:true});art(35,230,730,1060);text('装いの輪郭を読む',890,300,45,{vertical:true});text('素材と、光と。',70,1340,28);break;
 case 'insert':text(s.title,90,150,67,{serif:true});art(100,330,800,760);text('静かな岸辺に、物語がひらく。',500,1230,35,{center:true,serif:true});break;
 case 'scroll':rect(40,385,920,620,'#f4ecd1');art(110,430,780,530);line(80,400,80,990,ink,15);line(920,400,920,990,ink,15);break;
 case 'screen':art(60,300,880,800);for(let n=0;n<5;n++)line(60+n*220,290,60+n*220,1110,'#594b2c',10);line(60,1110,940,1110,'#594b2c',18);break;
 case 'hanging':rect(160,60,680,1260,'#cac29e');rect(215,260,570,740,'#f8f4e7');art(225,290,550,660);rect(830,870,36,100,'#ac3d32');line(130,50,870,50,ink,20);line(130,1330,870,1330,ink,20);break;
 case 'tarot':border(70,55,860,1290);border(105,100,790,1140);art(165,205,670,890);text(s.title,500,1310,60,{center:true,serif:true});break;
 case 'card':border(75,65,850,1270);text(s.title,500,160,64,{center:true,bold:true});art(130,235,740,900);rect(110,1170,780,125,'#f5efd9');text('道を照らす、小さな光。',500,1245,34,{center:true,fill:'#24323b'});break;
 case 'pattern':for(let y=80;y<1400;y+=180)for(let a=80;a<1000;a+=180){items.push(`<path d="M${a} ${y-55}q70 55 0 110q-70-55 0-110Z" fill="${(a+y)%360===160?'#dc785f':'#456758'}"/>`);items.push(`<circle cx="${a}" cy="${y}" r="13" fill="#f6ead8"/>`);}break;
 case 'thumbnail':rect(40,410,920,510,'#efe6d2');art(540,410,420,510);text('好きな色で、',80,580,61,{bold:true});text('生きていく。',80,690,61,{bold:true});text('春野 澪',80,830,32);break;
 case 'icon':items.push(`<clipPath id="circle-${id}"><circle cx="500" cy="700" r="380"/></clipPath><g clip-path="url(#circle-${id})">`);art(200,360,600,680);items.push('</g>');break;
 case 'emblem':items.push(`<path d="M500 240L800 390V810Q800 1040 500 1160Q200 1040 200 810V390Z" fill="none" stroke="${ink}" stroke-width="22"/>`);items.push(`<path d="M500 430L540 650L700 680L550 755L595 980L500 835L405 980L450 755L300 680L460 650Z" fill="${ink}"/>`);break;
 case 'sticker':rect(155,160,690,1080,'#fff9ed','none',150);art(190,200,620,1000);border(155,160,690,1080,'#2d3439');break;
 case 'stamp':rect(120,340,760,760,'#fff9ed');for(let n=0;n<14;n++){items.push(`<circle cx="${120+n*58}" cy="340" r="16" fill="${bg}"/><circle cx="${120+n*58}" cy="1100" r="16" fill="${bg}"/>`);}for(let n=0;n<14;n++){items.push(`<circle cx="120" cy="${340+n*58}" r="16" fill="${bg}"/><circle cx="880" cy="${340+n*58}" r="16" fill="${bg}"/>`);}art(155,390,690,590);text(s.title,500,1050,42,{center:true});break;
 case 'postcard':rect(50,380,900,620,'#fff9ed');art(90,410,820,500);text(s.title,500,960,33,{center:true,serif:true});break;
 case 'advert':text('あなたの物語を、形に。',75,115,37);art(95,190,810,770);text('創作の時間を、',70,1065,71,{bold:true});text('あなたへ。',70,1170,92,{bold:true});line(75,1230,925,1230);text('描く・つくる・伝える',75,1320,38);break;
 default:throw new Error('Unimplemented preview '+name);
 }
 views.push(`<view id="${id}" viewBox="${x} 0 ${W} ${H}"/>`);
 groups.push(`<g transform="translate(${x} 0)" data-design="${esc(name)}">${items.join('')}</g>`);
 manifest.push({value:name,id,kind:s.kind,src:'japan-format-previews-v20.svg#'+id,asset:s.asset||null,title:s.title||null,scope:'native layout preview; artwork is illustrative, never a production identity reference'});
}
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defs.join('')}</defs>${views.join('')}${groups.join('')}</svg>`;
fs.writeFileSync(new URL('japan-format-previews-v20.svg',root),svg);
fs.writeFileSync(new URL('format-preview-catalog.js',root),'// Native Japanese layout previews; never sent as character/style references.\nexport const formatPreviews='+JSON.stringify(Object.fromEntries(manifest.map(s=>[s.value,s.src])),null,2)+';\n');
fs.mkdirSync(new URL('verification/v20/',root),{recursive:true});
fs.writeFileSync(new URL('verification/v20/format-previews.json',root),JSON.stringify({preserved:[...preserved],replaced:manifest},null,2));
console.log('Built '+manifest.length+' individual native layout views; '+preserved.size+' previously reviewed samples retained.');
