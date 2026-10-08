// Primary-source comparison notes. References remain picker documentation, never image inputs.
export const movementsPhotoBases = [
  {
    "value": "ゴシック・ロマン主義",
    "basis": [
      "選択シーンの大きな形を絵具の色面で立て、光を受ける焦点と周囲の暗い量感を対比させる。",
      "重要な縁は読みやすく、影や遠い縁は隣接色へ溶かし、情感を形と空気の関係で表す。",
      "指定の人物・舞台・カメラを保ち、様式名を城・墓・宗教記号の追加理由にしない。"
    ],
    "checks": [
      "絵具で統一された量感と輪郭",
      "焦点と周辺の明暗の主従"
    ],
    "avoid": [
      "ゴシックとロマン主義を一つの歴史的技法だと断定する",
      "装飾追加だけで画風を代用する"
    ],
    "references": [
      {
        "title": "The Met — Romanticism",
        "url": "https://www.metmuseum.org/essays/romanticism",
        "kind": "work",
        "note": "掲載作品の情感を伴う明暗と自然のスケール。ゴシックとの組合せはツールの合成方針。"
      }
    ],
    "status": "synthesis"
  },
  {
    "value": "バロック",
    "basis": [
      "指定された姿勢・カメラの中で、曲線と斜めの面の連動を作る。カメラ自体を傾ける必要はない。",
      "明暗の大きな対比と曲面に沿う中間調で絵画の量感を作り、素材ごとに反射の幅を変える。",
      "焦点を最も明瞭にし、周辺の縁と筆触を整理する。豪華な衣装や宗教的な人物へ置換しない。"
    ],
    "checks": [
      "連動する形の流れ",
      "連続する絵画の体積と明暗"
    ],
    "avoid": [
      "全バロック作品を暗い照明だけへ限定する"
    ],
    "references": [
      {
        "title": "National Gallery — Baroque",
        "url": "https://www.nationalgallery.org.uk/paintings/glossary/baroque",
        "kind": "technique",
        "note": "動的な構成と幻視的な量感。強い明暗だけがバロック全体の定義ではない。"
      }
    ],
    "status": "synthesis"
  },
  {
    "value": "象徴主義",
    "basis": [
      "選択シーンに既にある形・対象・空白へ情感や観念を担わせ、関係を読み取れる配置にする。",
      "輪郭、色面、明暗の反復で意味のつながりを作り、描き込みはその関係の焦点へ集める。",
      "技法に単一の線や配色はないため、この作品では一つの絵画的な面処理へ統一する。"
    ],
    "checks": [
      "選択対象の意味をつなぐ配置",
      "主題と背景を共有する面処理"
    ],
    "avoid": [
      "未選択の神話・宗教記号を付け足す"
    ],
    "references": [
      {
        "title": "The Met — Symbolism",
        "url": "https://www.metmuseum.org/essays/symbolism",
        "kind": "work",
        "note": "掲載作品の形・配置が情感や観念を担う関係。"
      }
    ],
    "status": "synthesis"
  },
  {
    "value": "シュルレアリスム",
    "basis": [
      "この基準では、選択対象を明瞭な輪郭と絵画の材質で描き、指定シーンにある非日常の関係を読ませる。",
      "カメラ・身体の支持・舞台を固定した場合、その構造を壊さず、既存の形の重なりや反射に違和感を集中する。",
      "意図した関係以外の光・影・材質を一場面でそろえる。流派全体を写実的な夢の絵だけへ限定しない。"
    ],
    "checks": [
      "意図のある異質な関係",
      "明瞭な主題と一貫した面処理"
    ],
    "avoid": [
      "指定関節や重力を無断で破壊する",
      "時計や別世界の景物を自動追加する"
    ],
    "references": [
      {
        "title": "MoMA — Surrealism",
        "url": "https://www.moma.org/collection/terms/surrealism",
        "kind": "work",
        "note": "今回取得できたこのURLは作品索引のみ。個別工程は併記した一次資料の本文で照合。自動描画から精密描写まで幅のある運動。本ツールは明瞭な物体の関係を用いる方法を採用。"
      },
      {
        "title": "The Met — Surrealism",
        "url": "https://www.metmuseum.org/essays/surrealism",
        "kind": "technique",
        "note": "自動描画と精密な幻視的描写の幅を本文で確認。本ツールは後者の一方法へ翻訳する。"
      }
    ],
    "status": "synthesis"
  },
  {
    "value": "マジックリアリズム",
    "basis": [
      "選択された日常・幻想の舞台を、具体的な形・材質・静かな絵画の面で実在感を持たせる。",
      "不思議さは既存シーンの対象や関係を静かに強調して表し、魔法エフェクトを標準装備にしない。",
      "主題と背景を同じ光と距離の中に置き、精密な焦点と抑制した周辺をつなぐ。"
    ],
    "checks": [
      "日常の具体的な構造",
      "同じ空間にある静かな不可思議"
    ],
    "avoid": [
      "異世界の舞台への置換",
      "不可思議を光粒の個数で代用する"
    ],
    "references": [
      {
        "title": "MoMA — Modern Portraits / Christina’s World",
        "url": "https://www.moma.org/visit/accessibility/meetme/modules/module_three.html",
        "kind": "work",
        "note": "日常の精密な形に謎や不確かさが生じる表現。"
      }
    ],
    "status": "synthesis"
  },
  {
    "value": "印象主義",
    "basis": [
      "大きな光の色関係を先に置き、隣接する短い筆触で形を立てる。",
      "色を一様に混ぜず、許可配色の色差・明度差を筆触の隣接に残す。限定色でも筆の方向と濃淡で成立させる。",
      "近くでは筆触、縮小では光と形が読める密度にし、輪郭を一律の黒線で囲わない。"
    ],
    "checks": [
      "独立して読める短い筆触",
      "縮小でまとまる光と形"
    ],
    "avoid": [
      "均一な点や写真への筆跡フィルター"
    ],
    "references": [
      {
        "title": "MoMA — Impressionism",
        "url": "https://www.moma.org/collection/terms/impressionism",
        "kind": "work",
        "note": "今回取得できたこのURLは作品索引のみ。個別工程は併記した一次資料の本文で照合。短く分割された筆触と、一時的な光の色関係。"
      },
      {
        "title": "The Met — Impressionism: Art and Modernity",
        "url": "https://www.metmuseum.org/essays/impressionism-art-and-modernity",
        "kind": "technique",
        "note": "短い分割筆触、混ぜない色、光の効果を説明する本文を照合。"
      }
    ],
    "status": "synthesis"
  },
  {
    "value": "表現主義",
    "basis": [
      "選択感情を線の圧力、形の整理、面の緊張へ変換する。未指定の恐怖や怒りを増やさない。",
      "許可配色の面を強く隣接させ、形の変形には同じ規則を通す。識別特徴・関節接続・指定投影を保持する。",
      "写真の滑らかな表面を残さず、主題と背景を同じ線と面で構築する。"
    ],
    "checks": [
      "感情へ対応する線と面",
      "一貫した意図的な形の整理"
    ],
    "avoid": [
      "変形を関節破綻の口実にする"
    ],
    "references": [
      {
        "title": "MoMA — Expressionism",
        "url": "https://www.moma.org/collection/terms/expressionism",
        "kind": "work",
        "note": "今回取得できたこのURLは作品索引のみ。個別工程は併記した一次資料の本文で照合。整理・変形された形と色による感情の強調。"
      },
      {
        "title": "MoMA — Masterworks of German Expressionism",
        "url": "https://www.moma.org/calendar/exhibitions/146",
        "kind": "technique",
        "note": "形と色の変形による感情、白黒版画を含む表現の幅を照合。"
      }
    ],
    "status": "synthesis"
  },
  {
    "value": "キュビスム",
    "basis": [
      "主題を識別できる面へ分解し、硬い面と一部の溶ける面を重ねて浅い空間へ再構成する。",
      "明示カメラではその投影・遮蔽を読める軸として保ち、見えない顔面や奥の手を追加せず、見える形の分析へ複数面の方法を翻訳する。",
      "許可配色の明度差と面の重なりで構造を示し、写真の深いぼけや宝石片の追加で代用しない。"
    ],
    "checks": [
      "識別点の残る分析された面",
      "面の重なりで読める浅い空間"
    ],
    "avoid": [
      "多視点を固定カメラ変更の理由にする"
    ],
    "references": [
      {
        "title": "MoMA — Cubism",
        "url": "https://www.moma.org/collection/terms/cubism",
        "kind": "work",
        "note": "今回取得できたこのURLは作品索引のみ。個別工程は併記した一次資料の本文で照合。角張った面・圧縮された空間・複数視点。固定カメラ時の翻訳はツールの合成方針。"
      },
      {
        "title": "The Met — Cubism",
        "url": "https://www.metmuseum.org/essays/cubism",
        "kind": "technique",
        "note": "面の分析・再構成と浅い空間を本文で照合。固定カメラへ適用する部分はツール独自の翻訳。"
      }
    ],
    "status": "synthesis"
  },
  {
    "value": "未来派",
    "basis": [
      "選択動作や場面に実際にある流れから、弧・斜めの面・輪郭反復の軸を作る。",
      "本体の姿勢と支持を明確に残し、反復は開いた輪郭と濃淡が減衰する面として描く。",
      "静止指定はそのまま保ち、既存の輪郭や周辺の面のリズムで運動感を表す。"
    ],
    "checks": [
      "一つの方向を持つ弧と反復",
      "識別可能な本体と支持"
    ],
    "avoid": [
      "余分な手足を作る",
      "一様なモーションブラー"
    ],
    "references": [
      {
        "title": "MoMA — Swifts: Paths of Movement + Dynamic Sequences",
        "url": "https://www.moma.org/collection/works/79347",
        "kind": "work",
        "note": "Balla作品にある弧と反復による運動の構造。鳥や作品構図は採用しない。"
      }
    ],
    "status": "synthesis"
  },
  {
    "value": "構成主義",
    "basis": [
      "主題を識別できる幾何面・線・重なりへ整理し、図形同士の面積と位置を設計する。",
      "角度と線幅の規則を共有し、許可配色で面の関係と重心を明確にする。",
      "形式と文字の選択に従い、不要な政治的記号や文字を加えず、一場面を幾何の構造として成立させる。"
    ],
    "checks": [
      "規則を共有する幾何面と線",
      "設計された面積と重心"
    ],
    "avoid": [
      "既存絵の周囲へ幾何飾りを足すだけ"
    ],
    "references": [
      {
        "title": "MoMA — Constructivism",
        "url": "https://www.moma.org/collection/terms/constructivism",
        "kind": "work",
        "note": "今回取得できたこのURLは作品索引のみ。個別工程は併記した一次資料の本文で照合。掲載作品の幾何要素・面の関係。図案への翻訳はツールの方針。"
      },
      {
        "title": "MoMA post — The Many Lives of Proun 19D",
        "url": "https://post.moma.org/the-many-lives-of-el-lissitzkys-proun-19d-1920-or-1921/",
        "kind": "technique",
        "note": "幾何面・線・重なりと多様な空間解釈を本文で照合。"
      }
    ],
    "status": "synthesis"
  },
  {
    "value": "ポップアート",
    "basis": [
      "この基準では主題を明瞭な輪郭と印刷的な色面へ図像化する。網点は必要な中間調だけに使い、全作品の必須にしない。",
      "許可配色の大きな隣接面と明暗差で強い対比を作り、細密な写真陰影へ戻さない。",
      "反復は形式が許す範囲で使い、単独の人物や一場面の指定を複数画像へ増やさない。"
    ],
    "checks": [
      "明瞭な図像と印刷的な面",
      "選択に従う対比と反復"
    ],
    "avoid": [
      "全ポップ作品に漫画網点を必須にする"
    ],
    "references": [
      {
        "title": "MoMA — Pop art",
        "url": "https://www.moma.org/collection/terms/pop-art",
        "kind": "work",
        "note": "今回取得できたこのURLは作品索引のみ。個別工程は併記した一次資料の本文で照合。印刷図像・面の反復など複数の方法。本ツールは輪郭と色面の方法を採用。"
      },
      {
        "title": "MoMA — Drowning Girl audio description",
        "url": "https://www.moma.org/audio/playlist/3/176",
        "kind": "technique",
        "note": "明瞭な黒い輪郭、平らな色面、印刷の網点を本文で照合。全ポップアート共通の必須ではない。"
      }
    ],
    "status": "synthesis"
  },
  {
    "value": "アウトサイダーアート",
    "basis": [
      "この選択は単一の歴史的画風ではないため、本ツールでは独自の描線と記号の反復を使う合成基準とする。",
      "選択主題の識別特徴から線・形の規則を決め、密集する領域と空白を意図して分ける。",
      "技法としての形の整理を使い、粗雑さや人の属性・診断を作品の表現条件にしない。"
    ],
    "checks": [
      "作品内で続く独自の線と形の規則",
      "意味のある密度差と空白"
    ],
    "avoid": [
      "特定作者の記号の複製",
      "下手さの演出を画風の定義にする"
    ],
    "references": [
      {
        "title": "The Met — View of Paris with Furtive Pedestrians",
        "url": "https://www.metmuseum.org/art/collection/search/489975",
        "kind": "work",
        "note": "Dubuffet作品の独自の描線・記号。アウトサイダーアートに単一の共通画風はない。"
      }
    ],
    "status": "synthesis"
  },
  {
    "value": "ミニマリズム",
    "basis": [
      "この基準では具象を残した最小構成へ翻訳する。識別に必要な形を選び、角度・曲率・位置と空白の形を精密に整える。",
      "色・線・重なりを少数の役割へ整理し、未選択の飾りや光粒を空白へ補わない。",
      "主題の撮影距離と動作、必要な原稿は保持し、簡潔さを理由に選択条件を削らない。"
    ],
    "checks": [
      "少数の精密な形と間隔",
      "形の関係を支える余白"
    ],
    "avoid": [
      "歴史的ミニマリズムと簡潔な具象絵を同一視する"
    ],
    "references": [
      {
        "title": "MoMA — Minimalism",
        "url": "https://www.moma.org/collection/terms/minimalism",
        "kind": "work",
        "note": "今回取得できたこのURLは作品索引のみ。個別工程は併記した一次資料の本文で照合。単純な形、材料、反復の関係。具象を残す最小構成はツール独自の翻訳。"
      },
      {
        "title": "MoMA — Donald Judd, Untitled (Stack)",
        "url": "https://www.moma.org/collection/works/81324?sov_referrer=art_term",
        "kind": "technique",
        "note": "単純な幾何形と形間の空間・間隔を照合。具象を残す本ツールの方法は独自翻訳。"
      }
    ],
    "status": "synthesis"
  },
  {
    "value": "サイケデリックアート",
    "basis": [
      "選択主題の既存の曲線を連動させ、曲率と密度の変化、図と地の入り組みを設計する。",
      "許可配色の隣接順序と明度差で振動するリズムを作る。限定色に無断で虹色を加えない。",
      "主題の重要な輪郭と許可原稿を読み取れる状態に保ち、元作品の文字や人物は使わない。"
    ],
    "checks": [
      "連続する曲線と図地の関係",
      "密度と色境界のリズム"
    ],
    "avoid": [
      "無秩序な色ノイズや粒の追加"
    ],
    "references": [
      {
        "title": "MoMA — The Yardbirds, The Doors",
        "url": "https://www.moma.org/collection/works/5475",
        "kind": "work",
        "note": "曲線の連動と図地のリズム。既存の文字・出演者・構図は採用しない。"
      }
    ],
    "status": "synthesis"
  },
  {
    "value": "実写風フィルム写真",
    "basis": [
      "一つのカメラで撮った像として、連続する露光階調・材質・焦点を先に成立させる。",
      "粒状感は像の細部より控えめな微細構造とし、全画面の砂模様や傷を必須にしない。",
      "選択されたレンズと画角を保ち、実物の識別形と光の反応をフィルムの色調へ統一する。"
    ],
    "checks": [
      "連続した光学像と露光階調",
      "細部と区別できる微細な粒状感"
    ],
    "avoid": [
      "絵の表面へのフィルムノイズだけ"
    ],
    "references": [
      {
        "title": "Kodak — Professional Still Film",
        "url": "https://www.kodak.com/en/still-film/products/professional/",
        "kind": "technique",
        "note": "微細な粒状性、色と細部、露光の連続した階調。"
      }
    ],
    "status": "documented"
  },
  {
    "value": "実写風スタジオ写真",
    "basis": [
      "主光・補助光・背景へ届く光を分け、影と反射から光源の配置を説明できる撮影像を作る。",
      "広い光による柔らかな反射と、材料ごとの鋭い反射を分け、均一な樹脂の艶へしない。",
      "選択舞台を保ち、照明の制御を理由に背景を無地へ置換しない。"
    ],
    "checks": [
      "光源と対応する影の方向",
      "素材ごとに異なる反射幅"
    ],
    "avoid": [
      "全方向の均一照明",
      "無断の無地スタジオへの変更"
    ],
    "references": [
      {
        "title": "Nikon — Controlling the Light Spilling onto the Subject",
        "url": "https://www.nikonusa.com/learn-and-explore/c/tips-and-techniques/controlling-the-light-spilling-onto-the-subject",
        "kind": "technique",
        "note": "光の広がりと背景への回り込みを制御する撮影例。"
      }
    ],
    "status": "documented"
  },
  {
    "value": "実写風街角スナップ",
    "basis": [
      "選択したカメラから見た一瞬を、環境の連続する遠近・遮蔽・露光差で記録する。",
      "動作と支持は指定どおりにし、瞬間の自然さを別のポーズに変更する理由にしない。",
      "ぶれは動く端にだけ必要に応じて使い、静止物と焦点の識別を保つ。"
    ],
    "checks": [
      "環境と被写体の連続した遠近",
      "指定動作が読める瞬間"
    ],
    "avoid": [
      "静止物まで一律にぶらす"
    ],
    "references": [
      {
        "title": "V&A — Henri Cartier-Bresson",
        "url": "https://www.vam.ac.uk/blog/museum-life/henri-cartier-bresson",
        "kind": "work",
        "note": "今回HTTP 403で本文取得不能。併記したFondation Henri Cartier-Bressonの本人説明を代替根拠とする。"
      },
      {
        "title": "Fondation Henri Cartier-Bresson — HCB",
        "url": "https://www.henricartierbresson.org/en/hcb/",
        "kind": "technique",
        "note": "一瞬の事実と見える形の配置を同時に捉える、本人の説明を本文で照合。"
      }
    ],
    "status": "synthesis"
  },
  {
    "value": "実写風シネマティック写真",
    "basis": [
      "場面に根拠のある照明を中心に、明部・中間調・暗部と材質の反応を設計する。",
      "レンズ、焦点、露光、色調を同じ像へ統一する。映画風を特定の二色や黒帯の追加へ限定しない。",
      "既存の前後関係を光と焦点で読ませ、画角・人物・舞台を映画の定番へ変えない。"
    ],
    "checks": [
      "動機のある光と連続した露光",
      "同じ光学像の主題と背景"
    ],
    "avoid": [
      "一律の青橙カラーや映画黒帯"
    ],
    "references": [
      {
        "title": "ARRI — Textures",
        "url": "https://www.arri.com/en/learn/camera-systems/image-science/arri-textures",
        "kind": "technique",
        "note": "レンズ・絞り・光・露光・色・粒状感の組合せ。映画に一律の色調はない。"
      }
    ],
    "status": "synthesis"
  },
  {
    "value": "実写風ファッション写真",
    "basis": [
      "選択衣装のシルエット、縫い目、重なり、材質を同じ撮影照明で読ませる。",
      "衣装を中心に面の向きと反射を整え、人物・背景を別々の素材画像へしない。",
      "服を見せる都合でも指定のポーズ・顔向き・カメラ・被覆を変えない。"
    ],
    "checks": [
      "読める衣装の裁断と素材",
      "人物と背景の共有照明"
    ],
    "avoid": [
      "別人のモデルや露出の増加"
    ],
    "references": [
      {
        "title": "V&A — 100 years of fashion photography",
        "url": "https://www.vam.ac.uk/articles/100-years-of-fashion-photography",
        "kind": "work",
        "note": "衣服と人物、スタジオ・街角にまたがる表現。服の構造を読ませる方法を採用。"
      }
    ],
    "status": "synthesis"
  },
  {
    "value": "実写風モノクロ銀塩写真",
    "basis": [
      "選択が定める無彩色の光学像を、白・中間灰・深い暗部の連続する露光階調で作る。",
      "銀塩の微細な粒状感と実物の材質を分け、輪郭線や均一な黒い塗りへ戻さない。",
      "灰色の値と反射の幅で異なる素材を判別させる。傷・黄ばみは必須条件にしない。"
    ],
    "checks": [
      "広い連続灰色階調",
      "材質が分かる反射と微細像"
    ],
    "avoid": [
      "単なるイラストの彩度ゼロ加工"
    ],
    "references": [
      {
        "title": "V&A — An A to Z of photographic processes",
        "url": "https://www.vam.ac.uk/articles/photographic-processes",
        "kind": "technique",
        "note": "銀塩の像と支持体。白黒銀塩の階調をノイズ加工と区別。"
      }
    ],
    "status": "documented"
  },
  {
    "value": "実写風湿板写真",
    "basis": [
      "湿板由来の細密な光学像を基本にし、中央から周辺まで実物の形と露光階調をつなぐ。",
      "塗布由来の流れや欠けは局所の任意痕跡とし、傷・ぼけ・汚れの強さを技法の必須にしない。",
      "歴史的な像の色調と選択配色の翻訳を区別し、人物の衣装・ポーズを昔の肖像の定型へ変えない。"
    ],
    "checks": [
      "細密な主題と連続する像",
      "控えめな局所の塗布感"
    ],
    "avoid": [
      "粗い粒状ノイズを湿板の主特徴にする"
    ],
    "references": [
      {
        "title": "V&A — Photography: Processes and Techniques",
        "url": "https://www.vam.ac.uk/info/collection-selection-boxes-photography-processes-and-techniques",
        "kind": "work",
        "note": "掲載湿板由来プリントの細密像、局所的な塗布跡。傷やぼけは常に必須ではない。"
      }
    ],
    "status": "documented"
  },
  {
    "value": "実写風ポラロイド",
    "basis": [
      "露光された実物の像がインスタントフィルム上で現像された表現とし、形・材質・焦点を先に作る。",
      "緩やかなハイライトと小さな現像差を使う場合も識別形を残す。極端な色かぶりは必須にしない。",
      "白枠や現像日付はデザイン・文字で許可された場合だけ置く。"
    ],
    "checks": [
      "像を保つ現像の階調",
      "光学像と区別できるフィルムの差"
    ],
    "avoid": [
      "無断の白枠や日付の印字"
    ],
    "references": [
      {
        "title": "Polaroid — How does the Polaroid Lab work?",
        "url": "https://support.polaroid.com/hc/en-us/articles/360037128713-How-does-the-Polaroid-Lab-work",
        "kind": "technique",
        "note": "露光後の化学現像。白枠や色むらは全画像の必須条件ではない。"
      }
    ],
    "status": "documented"
  },
  {
    "value": "実写風水中写真",
    "basis": [
      "選択場面を水越しに見る光学像にし、距離に伴う明瞭度と色の減衰、境界の屈折を対応させる。",
      "選択配色内で光源と反射を整え、近い素材と遠い像のコントラストを分ける。",
      "海底・魚群・泡を標準で足さず、選択舞台の構造を水の光学へ翻訳する。"
    ],
    "checks": [
      "距離に対応する減衰",
      "水の境界と整合する光"
    ],
    "avoid": [
      "全域を一色の青へ塗る"
    ],
    "references": [
      {
        "title": "Nikon — How to Photograph Underwater Like a Pro",
        "url": "https://www.nikonusa.com/learn-and-explore/c/tips-and-techniques/how-to-photograph-underwater-like-a-pro-exposure-settings-composition-tips-and-more",
        "kind": "work",
        "note": "掲載水中写真と、水による距離・色・明瞭度の変化。"
      }
    ],
    "status": "documented"
  },
  {
    "value": "実写風マクロ写真",
    "basis": [
      "指定画角で見える焦点部に、表面の繊維・粒・曲率・微細な反射を一貫した縮尺で作る。",
      "前後の焦点差は選択対象が読めるよう設計し、極端に薄い焦点だけをマクロの必須条件にしない。",
      "全景指定は画角を保ち、見える近景の細部へ近接の精密さを配分する。"
    ],
    "checks": [
      "一貫した縮尺の微細構造",
      "対象が読める焦点設計"
    ],
    "avoid": [
      "主題の画角を無断で切り詰める"
    ],
    "references": [
      {
        "title": "Nikon — Easy Macro Photography",
        "url": "https://www.nikonusa.com/learn-and-explore/c/tips-and-techniques/easy-macro-photography-with-the-af-s-dx-micro-nikkor-40mm-f-2-8g-lens",
        "kind": "work",
        "note": "掲載近接写真と焦点深度。マクロでも絞りや合成で深い焦点が成立する。"
      }
    ],
    "status": "documented"
  },
  {
    "value": "実写風長時間露光",
    "basis": [
      "静止物を安定させ、移動する光・水・雲だけを時間に沿って積分した像にする。",
      "移動経路、反射、遮蔽を対応させ、静止構造と連続する流れを別々に読む。",
      "指定ポーズの静止の芯を保ち、時間表現で主題の形を消さない。"
    ],
    "checks": [
      "安定した静止構造",
      "経路と対応する移動像と反射"
    ],
    "avoid": [
      "全画面の一律ブラー"
    ],
    "references": [
      {
        "title": "Nikon — The Joy of Long Exposure Photography",
        "url": "https://www.nikonusa.com/learn-and-explore/c/tips-and-techniques/the-joy-of-long-exposure-photography",
        "kind": "work",
        "note": "掲載長時間露光写真の静止構造と時間を積分した移動部。"
      }
    ],
    "status": "documented"
  },
  {
    "value": "実写風インスタントカメラ",
    "basis": [
      "簡易なインスタント撮影の光学像として、実物の形と環境光に応じた露光を作る。",
      "近い主題と遠景への届く光を分け、フラッシュは光が必要な場合だけにする。",
      "控えめな周辺解像差と現像階調を使い、白枠・日付・極端なぼけを無断で足さない。"
    ],
    "checks": [
      "連続する簡易カメラの像",
      "距離を読める露光と光の届き方"
    ],
    "avoid": [
      "昼間でも強いフラッシュを常に必須にする"
    ],
    "references": [
      {
        "title": "FUJIFILM — instax mini 12",
        "url": "https://www.instax.com/mini_12/en/",
        "kind": "work",
        "note": "掲載インスタント写真と周囲光に応じた露光・フラッシュ。発光は無条件ではない。"
      }
    ],
    "status": "documented"
  }
];
