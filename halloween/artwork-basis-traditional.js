// Reviewed against the linked museum records and makers' technique guides.
// References identify technical evidence, not artists or subjects to imitate.
// These are rendering bases; the selected camera, scene, character and palette remain authoritative.
export const traditionalBases = [
 {value:'水墨画',status:'documented',basis:[
  '筆圧で太細が変わる墨線と、含水量で濃淡が変わる筆面から主題そのものを作る。',
  '濃墨のまとまった形、薄墨の面、支持紙を残した明部を別々の役割にする。湿った縁と乾いた掠れを局所で使い分ける。',
  '顔・手・衣服も同じ筆と墨層で再構築し、紙白の隙間と数本の識別線で特徴を残す。',
  '指定カメラの重なりと短縮を保ったまま、遠い面を薄く少ない筆へ整理する。この作画は黒・白・灰の無彩色を基準とし、有彩色が必要なら墨彩画を選ぶ。'
 ],checks:['濃い筆の内部にも太細・掠れ・水分の差が見える。','人物と背景の両方が筆面と未描画面から成立し、写真の顔だけが残っていない。'],avoid:['白黒写真へ墨の飛沫を重ねるだけの処理。','技法を理由に竹・山水・落款や別の視点を追加する。'],references:[{title:'The Met — Ink: Materials and Techniques',url:'https://www.metmuseum.org/pt/perspectives/materials-and-techniques-drawing-ink',kind:'technique',note:'筆・線・希釈した墨の面の使い分けを照合。'},{title:'The Met — 俵屋宗達工房「狗図」',url:'https://www.metmuseum.org/art/collection/search/853199',kind:'work',note:'湿った墨の輪郭と紙面、たらし込みの局所的な滲みを照合。'}]},
 {value:'墨彩画',status:'documented',basis:[
  '墨の輪郭・骨格・暗面を先に整理し、その筆の構造を保つ薄い彩色を重ねる。',
  '濃い墨、希釈した墨、淡い選択色の層を区別し、彩色で全ての筆跡を覆わない。',
  '焦点の識別線と少数の色面に密度を集め、周囲は紙面と淡い筆へ解く。',
  '選んだ舞台とカメラを維持し、色相を伝統色へ交換せず墨と薄い顔料へ翻訳する。'
 ],checks:['彩色の下にも墨の運筆が読める。','顔・物・背景が同じ墨と彩色の層に属する。'],avoid:['通常のアニメ塗りへ墨の外枠だけを付ける。','墨彩を理由に無条件で茶・朱・緑の伝統配色へ変える。'],references:[{title:'The Met — 齊白石「Viewing Antiquities at the Studio of Humility」',url:'https://www.metmuseum.org/art/collection/search/49650',kind:'work',note:'墨と彩色、書的な筆運びの併存を照合。'},{title:'The Met — The Kano School of Painting',url:'https://www.metmuseum.org/ja/essays/the-kano-school-of-painting',kind:'technique',note:'筆と墨の構造を保ちながら色・模様を組み合わせる方法を照合。'}]},
 {value:'日本画・岩絵具',status:'documented',basis:[
  '細い骨描きと顔料の大きな面を先に作り、細部の粒を形の代わりにしない。',
  '膠で定着した鉱物顔料の粒状層として面を積み、粒の細粗による発色・密度の差を見せる。',
  '滑らかな顔の面には細かな粒、衣服や背景の広い面には読み取れる粒状堆積を選択的に使う。',
  '指定色を岩絵具の層へ翻訳し、重なりと明暗で指定視点の体積・奥行きを保つ。'
 ],checks:['拡大すると色面の内部に粒の堆積があり、均一な画面ノイズではない。','顔の輪郭と衣服の構造が粒に埋もれていない。'],avoid:['写真を保存して一律の砂粒フィルターだけを被せる。','青や緑、金箔を画材名だけから追加する。'],references:[{title:'ナカガワ胡粉絵具 — 岩絵具の粒状性について',url:'https://www.nakagawa-gofun.co.jp/begin/grain.html',kind:'technique',note:'粒子を大きさで分級する実物顔料の特徴を照合。'},{title:'ナカガワ胡粉絵具 — FAQ',url:'https://www.nakagawa-gofun.co.jp/faq/',kind:'technique',note:'粗粒・細粒の使い分け、膠と水で溶く工程を照合。'}]},
 {value:'浮世絵木版画',status:'documented',basis:[
  '彫られた主版の明瞭な輪郭と、別々に摺った閉じた色面で全ての主題を構成する。',
  '色面は平らな摺りを主とし、ぼかしを必要な面だけの水・顔料の階調として使う。',
  '紙と顔料のわずかな濃度差を局所に残す。版ずれや摩耗を主題の識別点へ強制しない。',
  '指定視点の短縮・重なり・消失方向を版の輪郭へ移し、景物や構図を既存の版画へ交換しない。'
 ],checks:['輪郭と色面が別版として読め、階調は局所に限られる。','顔・衣服・背景が同じ彫線と摺り面から成立する。'],avoid:['水彩の全周滲みや油彩の盛り上がりを主役にする。','版画名から海・富士・江戸の服装を追加する。'],references:[{title:'British Museum — How to make a woodblock print like Hiroshige',url:'https://www.britishmuseum.org/blog/how-make-woodblock-print-hiroshige',kind:'technique',note:'主版・色版と局所のぼかし摺りを照合。'},{title:'The Met — The Great Wave: Anatomy of an Icon',url:'https://www.metmuseum.org/en/about-the-met/conservation-and-scientific-research/conservation-stories/2020/hokusai-great-wave',kind:'work',note:'色の分析と二重摺りによる局所階調を照合。'}]},
 {value:'大和絵',status:'documented',basis:[
  '細い流れる輪郭、整理された顔の識別線、鮮明な厚みのある彩色面で主題を描く。',
  '人物・物・背景の前後は、重なりと色面の区切りを主にして読み取れるようにする。',
  '選択場面の動作と関係を色面・線の連続でつなぎ、未選択の物語や人物を増やさない。',
  '吹抜屋台や雲の帯は歴史的手法の例として扱い、選択カメラ・舞台を変える仕組みとして自動適用しない。'
 ],checks:['顔を簡略化しても髪型・識別点・表情が読める。','色面の重なりが一つの選択場面を説明している。'],avoid:['大和絵を選んだだけで屋根を外し俯瞰へ変える。','金雲・平安衣装・既存説話を追加する。'],references:[{title:'The Met — Yamato-e Painting',url:'https://www.metmuseum.org/fr/essays/yamato-e-painting',kind:'technique',note:'簡略な顔、厚い顔料、空間を区切る形式的特徴を照合。'}]},
 {value:'琳派の金箔表現',status:'documented',basis:[
  '選択構図の中で形のまとまりと余白の間隔を設計し、金属箔の大きな面と描かれた色面を区別する。',
  '箔の面には継ぎ目と控えめな反射の揺れを見せる。配色が金色を許さない場合は許可色の明度による箔表現へ翻訳する。',
  '必要な色面だけに、濡れた下層へ別の墨・色を入れるたらし込みの不均一な混ざりを作る。',
  '既に選ばれた形の反復・間隔から装飾のリズムを作り、カメラ・ポーズ・景物を新しい屏風構図へ置換しない。'
 ],checks:['箔の反射面と顔料の形が異なる材質として読める。','たらし込みが選んだ色面の内部にあり、全画面の汚れではない。'],avoid:['金箔を普通の黄色ベタや全画面のキラキラへ置換する。','非対称を理由に指定構図を動かし、花鳥を追加する。'],references:[{title:'The Met — Rinpa Painting Style',url:'https://www.metmuseum.org/ko/essays/rinpa-painting-style',kind:'technique',note:'金箔上の大胆な形と装飾的な配置の方法を照合。'},{title:'The Met — 俵屋宗達工房「狗図」',url:'https://www.metmuseum.org/art/collection/search/853199',kind:'work',note:'湿った下層へ墨や色を加えるたらし込みの説明を照合。'}]},
 {value:'南画',status:'documented',basis:[
  '筆圧を変えた骨格線、面に沿う皴・点、薄墨の広い面を組み合わせる。',
  '精密な細筆と大胆な筆面を描く材質に応じて使い分け、同じ山形模様を全ての物へ貼らない。',
  '墨と選択色の薄い層を重ね、未描画の支持面を空気と明部として残す。',
  '指定カメラの距離・遮蔽を守り、遠くは濃度と筆数を減らす。選択舞台を山水へ自動変更しない。'
 ],checks:['線・点・薄墨の面に異なる筆の役割がある。','近くと遠くで筆数・墨濃度に差がある。'],avoid:['山水・鶴・竹・月を技法の付属物として追加する。','筆の上へ均一な写真ぼけを被せる。'],references:[{title:'The Met — 田能村竹田「竹林双鶴図」',url:'https://www.metmuseum.org/art/collection/search/853217',kind:'work',note:'細筆、表情のある筆触、大きな墨の面を材質別に使う点を照合。'}]},
 {value:'禅画',status:'documented',basis:[
  '主題と動作を識別する最少の筆数を選び、筆の始まり・圧・速度・抜けを形に残す。',
  '濃い墨のまとまりと大きな未描画面の釣り合いから量感と動勢を示す。',
  '必要な薄墨は補助に限り、顔・手・物体の識別点を微細陰影ではなく数本の筆へ翻訳する。',
  '指定視点の短縮と支持関係を省略した筆へ残し、円相・仏像・署名を未選択で追加しない。'
 ],checks:['一筆の中に太細と濃淡・掠れの変化がある。','少数の筆と空白から主題・ポーズが識別できる。'],avoid:['均一な太さのベクター輪郭で全部を囲う。','省略によって選んだ動作・人数・向きを変える。'],references:[{title:'The Met — Celebrating the Arts of Japan: Zen Ink Painting',url:'https://www.metmuseum.org/exhibitions/listings/2015/celebrating-the-arts-of-japan/exhibition-galleries',kind:'technique',note:'動的な墨の筆と空白を有効に使う特徴を照合。'},{title:'The Met — 白隠慧鶴「Portrait of Bodhidharma」',url:'https://www.metmuseum.org/art/collection/search/78145',kind:'work',note:'省略した墨線による識別と筆の強弱の照合用作品。'}]},
 {value:'書と墨の抽象',status:'synthesis',basis:[
  '選択主題の方向・関係・動きから筆の速度と停止を設計し、既存の読める文字の模写へ頼らない。',
  '一筆の濃い始まりから薄く掠れた終わりまで、含墨量と筆圧の変化を線に残す。',
  '濃墨の塊、薄墨の広がり、支持面を残した空白を異なる面積と間隔で組む。',
  '文字の有無・選択配色・カメラ由来の向きは保持し、具体主題を求める指定では抽象化後もその識別点を残す。'
 ],checks:['一筆に時間・圧・墨量の変化があり、均一なリボンではない。','飛沫や空白の配置が主題由来の方向と関係する。'],avoid:['無意味な飛沫を均等に散らす。','文字なしを無視して書・落款を置く。'],references:[{title:'The Met — 浦上玉堂「Letter to Shunkin」',url:'https://www.metmuseum.org/art/collection/search/829404',kind:'work',note:'濃い筆から薄く掠れる筆へ続く含墨量の変化を抽出。抽象構成への適用は本ツールの合成基準。'}]},
 {value:'中国工筆画',status:'documented',basis:[
  '細く制御した骨描きで輪郭と内部構造を先に確定し、始終が読める連続線を作る。',
  '骨描きを保った薄い色層を段階的に重ね、必要な箇所には顔料を細く填める。透明な層と不透明な細部を使い分け、境界から繊細な明暗を形成する。',
  '顔・布・葉状の形・建築の細部は同じ制御された筆体系で描き、材質に沿う模様と輪郭を維持する。',
  '指定舞台と視点の形を精密な筆へ移す。資料の花鳥・宮廷人物を主題として追加しない。'
 ],checks:['焦点の細線が彩色で潰れず、形の接続と重なりを説明する。','一部だけ写真の皮膚や3Dの反射へ戻らず、細筆と色層が全体でつながる。'],avoid:['工筆を太い自由な墨の筆へ交換する。','精密さを全画面同じノイズ密度で代用する。'],references:[{title:'國立故宮博物院 — Pictorial Songs of the Brush',url:'https://www.npm.gov.tw/Articles.aspx?l=2&sno=04013359',kind:'technique',note:'細線による精密な方式と大胆な筆の方式の違いを照合。'},{title:'國立故宮博物院 — Butterfly and Blossoms',url:'https://digitalarchive.npm.gov.tw/opendata/Pub/DetailEng/14581?dep=P&mode=full',kind:'work',note:'墨で鉤勒した輪郭に層を重ねて渲染し、花弁へ顔料を細く填める工筆の実制作を照合。'}]},
 {value:'韓国民画',status:'documented',basis:[
  '選択主題を読みやすい大きな形と明瞭な輪郭へ整理し、手描きのわずかな不均一さを残す。',
  '選択配色の鮮明な色面を大きく使い、模様や識別点を色面の上に配置する。限定色では明度差へ翻訳する。',
  '形の重なりと物語上の関係を主にして空間を示し、写真的な体積陰影を主役にしない。',
  '指定カメラに必要な短縮・遮蔽は残し、虎・鵲・牡丹・寿福の文字を技法名から追加しない。'
 ],checks:['大きな色面と素朴な輪郭で主題がすぐ読める。','前後が読める一方、材質が写真の光沢へ置き換わっていない。'],avoid:['宮廷写真風の滑らかな写実へ戻す。','伝統的な吉祥主題を選択場面へ勝手に追加する。'],references:[{title:'The Met — The Arts of Korea: Symbolic Images and Folk Art',url:'https://www.metmuseum.org/-/media/files/learn/for-educators/publications-for-educators/korea.pdf',kind:'technique',note:'鮮明な飽和色、大きな形、写実的遠近・体積へ頼らない表現を照合。'}]},
 {value:'和紙ちぎり絵',status:'documented',basis:[
  '選択した人物・物・景物を、ちぎった色和紙の形と貼る順序へ分解する。',
  '輪郭の繊維・毛羽、紙の厚薄、半透明な重なりを異なる大きさで見せる。',
  '顔の識別点・髪・衣服の折れも紙片から構成し、写真の顔を紙枠に残さない。',
  '色は選択色の紙と重ねた濃度で作り、紙片の小さな段差と描かれた場面の大きな前後関係を別尺度で扱う。'
 ],checks:['形の縁にちぎられた繊維が見え、貼る順序が読める。','顔を含む主題が紙片の色と形から成立する。'],avoid:['切り絵の滑らかな切断縁だけにする。','印刷写真へ毛羽の枠だけを足す。'],references:[{title:'和紙の店らくしゅあん — ちぎり絵のコツ',url:'https://info.washi-chigirie.jp/tips.php',kind:'technique',note:'和紙の毛羽、紙の縦目、糊を使う実制作の条件を照合。'},{title:'アワガミ — 染め',url:'https://www.awagami.or.jp/technology/04/index.html',kind:'technique',note:'ちぎり絵用染め紙の色目・染めの大きさと繊維素材を照合。'}]},
 {value:'油彩・厚塗り',status:'documented',basis:[
  '下層の大きな明暗面を作り、主題の向きに沿う不透明な筆面を積み重ねる。',
  '明部・焦点へ選択的に厚い絵具を置き、隆起した筆毛跡やナイフの端を見せる。影は必要に応じ薄く残す。',
  '顔・手も色面の方向と厚みの差で構築し、写真の滑らかな皮膚を厚塗りの背景だけに囲まない。',
  '指定カメラの比例と短縮を保ち、描いた体積の影と絵具の小さな隆起の影を別尺度にする。'
 ],checks:['焦点の色面に実際の厚みが読める隆起と筆の端がある。','縮小時にも筆面から主題の体積が読める。'],avoid:['全画面同じ厚みのノイズを塗る。','厚塗りを理由に顔・手の識別と接地を潰す。'],references:[{title:'National Gallery — Impasto',url:'https://www.nationalgallery.org.uk/paintings/glossary/impasto',kind:'technique',note:'絵具層を厚く構築する表面の定義を照合。'},{title:'National Gallery — Heroine of Trafalgar: The Fighting Temeraire',url:'https://www.nationalgallery.org.uk/paintings/learn-about-art/paintings-in-depth/heroine-of-trafalgar-the-fighting-temeraire?viewPage=6',kind:'work',note:'油彩の物性と厚い塗りの局所的使用を照合。'}]},
 {value:'油彩・薄塗り',status:'documented',basis:[
  '下塗りの明暗と形を確定し、その色が見える薄い透明・半透明の油彩層を重ねる。',
  '暗部と色の深みは重ねたグレーズで作り、厚塗りの大きな隆起を主要表面にしない。',
  '輪郭は筆でつながる明確な縁と局所的に溶ける縁を使い分け、必要な最明部だけ小さな不透明筆を置く。',
  '顔・衣服・背景を同じ下塗りと薄い色層で再構築し、指定カメラと選択色を維持する。'
 ],checks:['薄い上層を通して下層の形と色が働いている。','厚いナイフの塊ではなく、重なる色層と筆で明暗が形成される。'],avoid:['写真を残して全体へ透明な油膜だけを貼る。','厚塗りの隆起を画面全体へ追加する。'],references:[{title:'National Gallery of Art — Technical Glossary: glazing',url:'https://www.nga.gov/research/publications/technical-glossary',kind:'technique',note:'透明層が下層の色・調子へ作用するグレーズの定義を照合。'},{title:'National Gallery of Art — Gabriel Metsu, The Intruder',url:'https://www.nga.gov/research/publications/dutch-paintings-seventeenth-century/gabriel-metsu-intruder-c-1660',kind:'work',note:'暗部は滑らかに薄く、明部は選択的に厚く置く仕上げを照合。'}]},
 {value:'透明水彩',status:'documented',basis:[
  '紙の明部を計画して残し、透明な顔料の薄い面から明暗を段階的に積む。白を禁止する配色では許可された最明色の支持面へ翻訳する。',
  '湿った面の柔らかい滲みと、乾いた面へ置く精密な筆を目的別に使い分ける。',
  '顔・髪・服の形も透明な筆面と描かない隙間で組み、紙目や局所の顔料の溜まりを保持する。',
  '指定視点の重なりと短縮を守り、遠景は薄い面と少ない筆で描く。透明性を全体の淡色化へ置換しない。'
 ],checks:['明部が下地から光り、薄い層の下にも形が読める。','滲む縁と精密な乾いた縁が同じ人物・背景に共存する。'],avoid:['写真の顔を残して背景だけ水彩化する。','全ての輪郭を同じ滲みで溶かす。'],references:[{title:'Holbein — 透明水彩と不透明水彩〈ガッシュ〉の違いと使い方',url:'https://www.holbein.co.jp/blog/art/a515',kind:'technique',note:'下地を透かす透明画技法と、覆う不透明画技法の違いを照合。'},{title:'The Met — Watercolor: Materials and Techniques',url:'https://www.metmuseum.org/ja/perspectives/materials-and-techniques-drawing-watercolor',kind:'technique',note:'薄い水性顔料の面と局所の制作技法を照合。'}]},
 {value:'不透明水彩・ガッシュ',status:'documented',basis:[
  '大きな明暗を下層を覆う不透明な色面で確定し、マットな絵具の面として構成する。',
  '乾いた層の上へ必要な色を重ね、上層が下層を覆う境界と局所の筆端を残す。',
  '明部は紙白だけに頼らず、選択色の明るい不透明筆として描く。',
  '顔・物・背景の材質差を形と筆面で示し、指定カメラの体積と前後を簡潔な面へ翻訳する。'
 ],checks:['明部も暗部も下の色を覆う絵具面として読める。','局所に重なる筆の端があり、油彩の厚い艶にはなっていない。'],avoid:['透明水彩の下地透過と全周滲みだけにする。','選択色を無条件にパステル配色へ変える。'],references:[{title:'Holbein — 不透明水彩絵具〈ガッシュ〉彩「いろどり」',url:'https://www.holbein.co.jp/irodori.html',kind:'technique',note:'下層を覆う不透明画技法に用いるガッシュの物性を照合。'},{title:'Holbein — 山本佳子の不透明水彩〈ガッシュ〉集中講座 第1回',url:'https://www.holbein.co.jp/blog/art/a346',kind:'technique',note:'不透明な白や重ね塗りによる形の再構成を照合。'}]},
 {value:'アクリル画',status:'documented',basis:[
  '大きな形の下層を作り、乾いた塗膜の上へ透明膜・不透明筆・局所の厚い面を分けて重ねる。',
  '層が乾いた後は下層を無条件に混ぜず、重なりの境界と筆方向を保持する。',
  '薄い層では下色の作用、厚い層では局所の絵具の盛り上がりを使い、全てを一つの艶へ均さない。',
  '指定配色を使い、顔・衣服・景物を同じアクリルの塗膜から描く。輪郭と接地は選択視点に従う。'
 ],checks:['乾いた下層を保つ上層と、局所の厚い筆が区別できる。','材質ごとに筆の方向・境界が変わり、一律の塑性光沢ではない。'],avoid:['アクリルを必ず平らなCGベタへ限定する。','水彩の全周滲みや油彩の混色だけで定義する。'],references:[{title:'Liquitex — アクリル絵具での水彩表現',url:'https://www.jp.liquitex.com/tips/how-to-achieve-watercolor-effects-with-acrylics/',kind:'technique',note:'定着性による層を保つ重ね方、乾いた紙で残す境界を照合。'},{title:'Liquitex — Layering Heavy Body over Black Gesso',url:'https://www.liquitex.com/blogs/tips-techniques-how-tos/layering-heavy-body-over-black-gesso',kind:'technique',note:'厚い絵具を重ね、削り、再構築する局所のマークと隆起を照合。'}]},
 {value:'テンペラ画',status:'documented',basis:[
  'この選択の基準は卵テンペラとし、平滑な支持面へ薄い顔料層を細筆で重ねる。',
  '短い筆や細い交差筆の密度で面の明暗を積み、精密な輪郭と焦点の細部を保つ。',
  '薄い層の乾いた面を主にして、厚い油彩の隆起や一律の写真ぼけへ変えない。',
  '指定主題・配色・カメラを維持する。金箔・宗教人物・古画の色褪せは技法から追加しない。'
 ],checks:['細筆の積層が顔・服・背景に共通し、小さな形が読める。','広い厚塗りの峰ではなく、薄い層の筆密度が明暗を作る。'],avoid:['テンペラの名称だけで既存祭壇画の構図を導入する。','細密さをエアブラシの連続階調だけで代用する。'],references:[{title:'National Gallery — Tempera',url:'https://www.nationalgallery.org.uk/paintings/glossary/tempera',kind:'technique',note:'広義のテンペラを区別し、この選択は卵黄を媒材とする基準へ明示的に絞る。'},{title:'National Gallery — Andrea Mantegna, The Agony in the Garden',url:'https://www.nationalgallery.org.uk/paintings/andrea-mantegna-the-agony-in-the-garden',kind:'work',note:'速乾の卵テンペラで微小な構造を描く制作例を照合。'}]},
 {value:'フレスコ画',status:'documented',basis:[
  '新しい湿った漆喰へ顔料が定着した壁面として、細かな粒と描いた色面を一体にする。',
  '主題の大きな輪郭と明暗面を先に確定し、顔・衣服・背景を同じ漆喰上の筆から構成する。',
  '漆喰の小粒による表面差と、描いた人物・物の大きな体積影を分けて扱う。',
  '古さや剥落は固有条件ではない。経年が指定された場合だけ局所に加え、カメラ・選択色・識別点を維持する。'
 ],checks:['色が壁の上の厚い光沢塗膜ではなく漆喰の内部へ定着して見える。','表面の粒より主題の輪郭・表情・支持関係が明確である。'],avoid:['必ず古い亀裂・剥落を全画面へ追加する。','壁画を理由に教会・柱・壁の前の部屋を新しく描く。'],references:[{title:'National Gallery — Fresco',url:'https://www.nationalgallery.org.uk/paintings/glossary/fresco',kind:'technique',note:'湿った漆喰へ描く方法と、乾いた漆喰に描く方式との区別を照合。'},{title:'V&A — The South Court and Leighton Frescos',url:'https://www.vam.ac.uk/articles/the-south-court-and-leighton-frescos',kind:'work',note:'漆喰の壁へ描く制作工程を持つ実作品を照合。'}]},
 {value:'パステル画',status:'documented',basis:[
  '微細な粉の面を支持紙の目へ載せ、広い面の明暗を先に作る。',
  '棒の側面による紙目を残す面と、先端・圧で作る鮮明な直接線を使い分ける。',
  '粉を擦る面と選択色の独立した筆を併用し、混ぜすぎて鮮やかさや暗い芯を消さない。',
  'パステルは不透明粉なので明るい粉で光を作れる。下地を必ず白へ変えず、配色と指定視点の形を保つ。'
 ],checks:['粉の粒・擦った面・鮮明な直接線が使い分けられている。','明るい粉と濃い粉が残り、全体が白っぽいぼけへ均されていない。'],avoid:['透明水彩と同じ下地白への依存を強制する。','顔だけ写真の平滑な表面を残す。'],references:[{title:'The Met — Pastel: Materials and Techniques',url:'https://www.metmuseum.org/it/perspectives/materials-and-techniques-drawing-pastel',kind:'technique',note:'不透明な粉、紙目、側面と先端、擦り、別々の色筆の性質を照合。'}]},
 {value:'色鉛筆画',status:'documented',basis:[
  '軽い色線で構造を確定し、紙目を残す薄い塗りから選択色を重ねる。',
  '平行線・交差線の向きと密度を面の構造へ合わせ、紙の粒を全画面同じ網目へしない。',
  '明部は薄い層、暗部は重なる線と強い局所筆圧で作る。必要な焦点だけ密な磨き込みを許す。',
  '色線と紙目を顔・衣服・景物に共有させ、指定カメラの短縮と前後を保持する。'
 ],checks:['拡大すると薄い色層と方向を持つ線があり、縮小すると体積が読める。','淡い面と密な焦点で紙目の見え方に差がある。'],avoid:['全ての線を消した写真へ色鉛筆の紙目だけ貼る。','鉛筆画を理由に指定色を別の色へ交換する。'],references:[{title:'Faber-Castell — Coloring Techniques',url:'https://fabercastell.com/pages/coloring-techniques',kind:'technique',note:'軽い陰影、平行・交差ハッチング、明色から暗色の積層を照合。'}]},
 {value:'鉛筆デッサン',status:'documented',basis:[
  '比例・面の向き・支持点を軽い線で測り、大きな明暗を先に確定する。',
  '黒鉛の筆圧、線の重なり、紙目、局所の擦りから広い濃度範囲を作る。',
  '硬い重なりの縁と柔らかい曲面の縁を分け、識別点と投影影を線と濃度で示す。',
  'この作画は黒鉛の黒・白・灰による無彩色を基準とする。有彩色の描線が必要なら色鉛筆画を選び、黒鉛デッサンを彩色写真や油彩面へ置き換えない。'
 ],checks:['黒鉛の筆圧差・線・紙目・擦りが主題そのものに残る。','最明部と深い暗部があり、比例と支持点が読める。'],avoid:['写真の灰色へ紙のノイズだけを重ねる。','有彩色の塗りを黒鉛の物性として扱う。'],references:[{title:'Faber-Castell — Basic Techniques with Castell 9000',url:'https://fabercastell.com/pages/basic-techniques-with-castell-9000',kind:'technique',note:'無彩色の濃度、筆圧、紙質、線密度、交差線、擦りを照合。彩色が必要なら色鉛筆画を選ぶ。'}]},
 {value:'木炭画',status:'documented',basis:[
  '木炭の側面による広い暗面から質量を作り、直接の濃い線と擦った粉の中間調を分ける。',
  '粗い紙目に残る炭粒と粉の広がりを見せ、消し取った柔らかい明部と鋭い明部を使い分ける。',
  '深い接触影から柔らかい粉の灰へつなぎ、見える縁と失われる縁で体積を示す。',
  'この作画は木炭の黒・白・灰による無彩色が基準。有彩色の粉による描画が必要ならパステル画を選び、CGの発光や別画材の塗膜を足さない。'
 ],checks:['暗い直接線、粉の面、消し跡の三種類が主題と背景へ共通する。','大きな明暗で主題が読め、暗面にも形の重なりが残る。'],avoid:['墨の濡れた滲みを木炭粉へ置換する。','黒いベタや写真陰影だけを粉の質感として扱う。'],references:[{title:'The Met — Charcoal: Materials and Techniques',url:'https://www.metmuseum.org/ja/perspectives/materials-and-techniques-drawing-charcoal',kind:'technique',note:'棒の側面、炭粉を擦る広い面、消去による光を照合。有彩色の粉の描画はパステル画で選ぶ。'}]},
 {value:'ボールペン画',status:'synthesis',basis:[
  '細いインク線で輪郭と構造を作り、線の間隔・交差・筆圧の差で濃度を重ねる。',
  '曲面には曲がる線、平面には揃う線、細部には短い線を使い、材質と形へ方向を合わせる。',
  '選択した許可色のペン線を使い、明部は下地の隙間、暗部は密な線の重なりとして形成する。',
  '顔・手・背景も同じ線から構築する。写真的な連続陰影や別の絵具面で線の仕事を代用しない。'
 ],checks:['暗部を拡大しても細いインク線が読み取れる。','線の密度が形・材質・指定視点の前後に対応する。'],avoid:['全画面同じハッチング模様を写真へ貼る。','消せない線の性質を、人物の特徴やポーズを変える口実にする。'],references:[{title:'The Met — Robert Kipniss, Study for Interior w/cup, spoon, & window',url:'https://www.metmuseum.org/art/collection/search/742915',kind:'work',note:'ボールペンで描かれた実作品の媒体記録と線による面の成立を照合。線密度の全画面適用は本ツールの合成基準。'},{title:'The Met — David Hockney, Henry Seated with Cigar at Steve’s',url:'https://www.metmuseum.org/art/collection/search/493706',kind:'work',note:'黒いボールペンによる人物素描を参照し、細線で人物が成立することを照合。'}]},
 {value:'線画',status:'synthesis',basis:[
  '外形・遮蔽・接触・主要な内部構造の線へ主題を整理し、少数の線で識別点を維持する。',
  '手前の重なり・外形を強く、内部や遠景を細くするなど、線の階層を決める。',
  '光の側の線を局所的に抜き、影側や接触側を締める。必要な短いハッチングは構造へ沿わせる。',
  '線色・支持面は選択配色を守り、隠れる線を正しく止める。全体の写真的な塗り面へ戻さない。'
 ],checks:['線だけで主題の外形・重なり・支持点が読める。','全てを均一な幅で囲わず、焦点と奥に線の差がある。'],avoid:['写真や3Dの連続陰影が線の役割を奪う。','必要な識別点まで省略し、別人物・別ポーズへ変える。'],references:[{title:'The Met — Ink: Materials and Techniques',url:'https://www.metmuseum.org/pt/perspectives/materials-and-techniques-drawing-ink',kind:'technique',note:'ペン・筆による線と調子の表現を抽出。輪郭優先の線階層は本ツールの合成基準。'},{title:'The Met — Rembrandt, Two Studies of a Woman Reading',url:'https://www.metmuseum.org/art/collection/search/347899',kind:'work',note:'線とハッチングによる光・暗部の表現を照合。'}]},
 {value:'点描画',status:'documented',basis:[
  '大きな明暗を先に割り当て、個別に見える点の密度と間隔から面を形成する。',
  'カラーでは許可色の点を並置し、縮小時の視覚的な混色を使う。単色では点密度と支持面の隙間で調子を作る。',
  '輪郭も点の分布差から作り、均一なノイズや完成済み写真の上のドット膜にしない。',
  '点の細かさ・濃度差を焦点から周辺へ段階化し、指定視点の体積と前後関係を保持する。'
 ],checks:['拡大時は色点が独立し、縮小時は連続した形として読める。','明暗に応じて点の密度が変わり、光る部分に隙間がある。'],avoid:['連続した太い輪郭で全周を囲み点を装飾だけにする。','一律のデジタルノイズを点描として扱う。'],references:[{title:'National Gallery of Art — Georges Seurat, The Lighthouse at Honfleur',url:'https://www.nga.gov/artworks/61383-lighthouse-honfleur',kind:'work',note:'小さな純色の点から景物と光を作る実作品の点描を照合。'},{title:'National Galleries of Scotland — Pointillism',url:'https://www.nationalgalleries.org/art-and-artists/glossary-terms/pointillism',kind:'technique',note:'個別の色点と視覚的混色の技法を照合。'}]},
 {value:'スクラッチボード',status:'documented',basis:[
  '暗いインク層から明るい下地を削り出す順序で、輪郭・明部・素材の形を構築する。',
  '削り線の幅・方向・間隔を面の構造へ対応させ、削らない暗面を深い影として残す。',
  '彩色が許可される場合は、削った明部へ透明インクを載せ、必要な最明部を再び削る。許可されない色は追加しない。',
  '顔・髪・服・背景の全てが削りと残る下地から成立し、カメラと主題の識別点は維持する。'
 ],checks:['暗い下地と露出した明線が一目で区別できる。','彩色時も削り線の方向と密度が表面構造を説明している。'],avoid:['明るい紙へ黒い筆線を描く方法へ逆転する。','写真の灰色ぼかしや白い絵具面だけで明部を作る。'],references:[{title:'Ampersand — Scratchbord overview',url:'https://ampersandart.com/full/scratchbord-overview',kind:'technique',note:'暗層を削って白・色層を出す原理と、露出部への彩色後に再び削る工程を照合。'}]}
];
