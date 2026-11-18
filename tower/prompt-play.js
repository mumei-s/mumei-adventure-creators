export const towerUrl = 'https://mumei-s.github.io/mumei-adventure-creators/tower/';
export const hostNoteUrl = 'https://note.com/ss_yr';
export const insightUrl = 'https://mumei-s.github.io/note-insight/';
const appUrl = 'https://chatgpt.com/open-app';
const androidStore = 'https://play.google.com/store/apps/details?id=com.openai.chatgpt';

export function parseNoteId(value = '') {
  let id = value.trim().replace(/^[@＠]/, '');
  if (/^(?:https?:\/\/)?note\.com\//i.test(id)) {
    try {
      const url = new URL(/^https?:\/\//i.test(id) ? id : `https://${id}`);
      if (url.hostname !== 'note.com' || url.username || url.password) return null;
      id = url.pathname.split('/')[1] || '';
    } catch { return null; }
  }
  id = id.toLowerCase();
  return /^[a-z0-9_]{1,32}$/.test(id) ? id : null;
}

export function chatgptAppLink({ userAgent, platform, maxTouchPoints }) {
  if (/Android/i.test(userAgent)) {
    return {
      href: `intent://chatgpt.com/open-app#Intent;scheme=https;package=com.openai.chatgpt;S.browser_fallback_url=${encodeURIComponent(androidStore)};end`,
      label: 'アプリ版を開く',
    };
  }
  if (/iPhone|iPad|iPod/i.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1)) {
    return { href: appUrl, label: 'アプリ版を開く' };
  }
  return { href: 'https://chatgpt.com/download/', label: 'アプリ版の案内', newTab: true };
}

export function creatorReference(creator, registeredCreator, source) {
  if (!creator || creator !== registeredCreator || !source) return { referenceMode: 'attachment' };
  if (/^https:\/\//i.test(source)) return { referenceMode: 'registered', referenceUrl: source };
  if (/^(?:data:image\/|blob:)/i.test(source)) return { referenceMode: 'local' };
  return { referenceMode: 'attachment' };
}

export function characterReferenceInstructions({ referenceMode, referenceUrl } = {}) {
  if (referenceMode === 'registered' && referenceUrl) {
    return '登録済みアバター画像URL：' + referenceUrl + '\n今回の添付があればその画像を優先し、それ以外はこのURLで本人の絵を確認してください。開けないときだけ、同じチャットにある本人の参照画像を使うか、元の画像１枚の添付を依頼してください。IDは再質問しないでください。';
  }
  if (referenceMode === 'local') {
    return '登録済みアバターはこの端末内にあります。同じチャットで確認できた本人の絵を使い、別チャットで絵が見られないときだけ、元の画像１枚の添付を依頼してください。今回添付する別のキャラ画像があれば、その画像を優先します。';
  }
  return '今回添付する新しいキャラ画像を使ってください。添付がなければ同じチャットで確認済みの、このID本人の参照画像を使います。確認できない場合だけ元の画像１枚を依頼してください。';
}

export const characterArtInstructions = '顔立ち、髪の分け目・色、頭身、衣装と装身具を本人の絵に合わせてください。実写は肌・布・光の質感、アニメは輪郭・目・塗り、幻想画は筆致や発光の描き方を引き継ぎます。背景や別の登場人物の画風・顔を主人公に移さないでください。歩行シートの各マスは同じ１人の動作資料です。';

export function settingInstructions(backgroundUrl) {
  return backgroundUrl ? '場所の背景資料：' + backgroundUrl + '\n画像を開ける場合は窓・照明・家具などの位置と奥行きを確かめてください。この場所で別の方向を向いても同じ空間に見えるように描いてください。開けない場合は場面の説明を使ってください。' : '';
}

export function makeRoomPrompt({ id, description, articles = [], ideas, returnUrl = `${towerUrl}#prompt-import`, roomOnly = false, avatarOnly = false, reference } = {}) {
  if (avatarOnly) return makeArtifactPrompt({ kind: 'avatar', id, scene: ideas, mode: 'room', reference });
  if (roomOnly) {
    const scene = [ideas, description, ...articles.slice(0, 5).map(article => article.title)].filter(Boolean).join('\n');
    return makeArtifactPrompt({ kind: 'interior', id, scene, mode: 'room', reference }) +
      '\n保存した部屋画像をTowerの個別添付欄に入れてください。\n' + returnUrl;
  }
  const titles = articles.slice(0, 5).map(({ title }) => `・${title}`).join('\n');
  return `【#無名Sプロンプト｜Atelier Towerに住む】

noteクリエイターID：${id ? `@${id}` : '［自分のnote IDを入れる］'}
${id ? `公開プロフィール：https://note.com/${id}\n` : ''}${characterReferenceInstructions(reference)}
部屋に入れたい世界観や好きなもの：${ideas || 'キャラクターとnoteの作風から考えてください。'}
${description ? `\n公開プロフィールの自己紹介：${description}\n` : ''}${titles ? `\n公開記事の題名\n${titles}\n` : ''}
この初回依頼で、ゲーム用部屋画像・歩行アバター・記事専用の部屋サムネイルの３枚と参加記事を作ってください。最初の成果物は必ず部屋画像です。
noteの公開プロフィールや記事の作風を読める場合は、創作のモチーフにしてください。アクセスできないときは、添付画像と希望から作ってください。添付と公開ページから推測した個人情報を作品や説明に入れないでください。
ID記載済みなら再質問せず、参照画像が確認できたら生成してください。
${characterArtInstructions}

【ゲーム用部屋画像（文字なし・サムネイルと別）】
アバターとは別の、横３：２の内装画像を１枚描いてください。視点は少し高い位置から室内を見渡す角度。画像の下３分の１はアバターが歩く床なので、家具は両脇と奥に置いてください。添付キャラの好みやnoteの作風が伝わる素材、光、窓の外の景色、小物で、ここで誰がどんなふうに暮らしているか想像できる部屋にしてください。人物・文字・UI・枠は描かないでください。

【アバター画像（部屋の次に生成）】
全身が見える歩行スプライトを、透明背景の正方形に４列×４行の均等なマスで描いてください。上から「正面」「画面の左向き」「左斜め後ろ」「真後ろ」。各行の左から「立ち姿」「左足を前へ」「足がすれ違う中間」「右足を前へ」。各マスの中央に１体、頭から靴まで入れ、足底の位置と体の縮尺をそろえてください。マスの境界まで十分な透明余白を取り、線・文字・枠・床・落ち影を描かないでください。顔立ち、髪、服とアクセサリーを全コマでそろえます。動く行では脚の前後に合わせて腕を振り、接地足が滑らないよう、靴底の高さと重心移動を隣のコマと見比べてください。

【生成順序・完了検査】
必ず部屋画像を最初に実際に生成し、次にアバター画像を別の画像として生成してください。３枚目は部屋を題材にした記事専用サムネイルです。３枚は独立した画像ファイルとして生成し、部屋画像とサムネイルを絶対に兼用・合成しないでください。１回で全部を出せない場合は、未生成の各成果物だけを生成する短い指示を全て提示してください。画像として届けるものは、実際にチャットに表示した画像だけです。画像を１枚に合成しないこと。部屋の床・遠近・家具の比率、文字や人物の混入を確認すること。未生成の画像がある場合は画像制作の未完了分として記事の後で知らせてください。入居の完了は本人が確認した場合にだけ記載します。

【参加者のnote記事】
最初に記事タイトルを決め、追加の依頼を待たずにこの返答で参加記事も書いてください。画像を全て出せない環境でも、部屋に入れたい世界観や希望から部屋づくりの紹介を書けます。
${articleWritingInstructions({ id, mode: 'room' })}

${articleCoverInstructions()}

記事の最後に無名S noteの企画を紹介し、以下のカード用ブロックをそのまま使ってください。
${articleCardBlock([['企画主・無名S note', hostNoteUrl], ['自分のキャラで参加する', `${towerUrl}#prompt-play`], ['noteの反応を分析する INSIGHT', insightUrl]])}

末尾のハッシュタグは #無名Sプロンプト です。${cardPasteInstructions()}

記事の下に、参加者が次に使う案内も書いてください。「アバター・部屋・専用サムネイルを個別に保存（サムネイルはnote記事の見出し用） → Towerの『生成した画像を添付する』で２枚を選ぶ → 自分のアバターで下見や街歩き → 入居する」の順で、「Atelier Towerに画像を添付する」という押せるリンクを付けてください。
${id ? `リンク先は ${returnUrl} を使ってください。` : `リンク先は ${returnUrl} です。note IDが分かっていれば「#prompt-import」の直前に「?creator=本人のnote ID」を入れてください。IDは先頭の@を外し、英字を小文字にしてください。`}`;
}

export function residentPost(title, roomUrl) {
  return makeArticleDraft({ mode: 'room', roomTitle: title, href: roomUrl, occupied: true });
}

export function articleCardBlock(entries) {
  return entries.map(([label,url]) => label + '\n\n' + url).join('\n\n');
}

export function cardPasteInstructions() {
  return 'カード用URLは必ず裸のURLだけを独立した行に置く。引用符、括弧、箇条書き記号、Markdownリンク、コード枠、URLの直後の句読点は禁止。本文の外に「note編集画面でURLを空行に個別に貼り、改行してカード表示を確認」と案内してください。';
}

export function articleCoverInstructions() {
  return '【note専用サムネイル】記事のタイトルを制作前に決め、そのタイトルと「#無名Sプロンプト」を正しい日本語で読みやすく入れた横1280×650のサムネイルを、別の完成画像で生成してください。本文用の絵とは明確に異なる構図で、同じ場所・人物が分かる表紙に仕上げます。人物の向きと視線に合わせて題名の余白を取り、小さい一覧表示でも主役と文字が読める背景と明暗差を選びます。本文画像に文字を重ねて流用しないでください。キャラの顔立ち・頭身・衣装は維持。上下左右7％を安全余白にし、noteの一覧やマガジンの中央トリミングでも顔と題名が読める中央領域へ配置します。タイトルは記事と完全に一致させ、文字切れ・誤字・脱字・重複・透かしを確認します。自動で画像を続けて出せない場合は、未生成の画像名とその１枚だけを生成する短い指示を提示してください。未生成の分は画像制作の未完了分として記事の外に記してください。記事本文は先に渡せます。';
}

export function articleVoiceInstructions(id) {
  return id === 'ss_yr' ?
    '運営者・無名S note本人の文章は、読者に親しみを込めて語りかけ、顔文字を多めに使ってください。斜め向きの涙笑い絵文字は使わないでください。' :
    '参加者本人の公開文章や会話で分かる文体を尊重してください。文体が分からなければ読みやすい一人称で書き、実際に遊んだと確認できない行動を体験談にしないでください。';
}

function articleCards(mode, href) {
  const cards = new Map([[hostNoteUrl, '企画主・無名S note']]);
  if (href) cards.set(href, mode === 'room' ? '私の部屋' : 'この場所へ');
  cards.set(towerUrl + '#prompt-play', '自分のキャラで参加する');
  cards.set(insightUrl, 'noteの反応を分析する INSIGHT');
  return articleCardBlock(Array.from(cards, ([url, label]) => [label, url]));
}

export function articleWritingInstructions({ id, mode = 'spot' } = {}) {
  const room = mode === 'room';
  const markers = room ? '［ここにアバター画像］と［ここに部屋画像］' : '［ここに街のイラスト１］と［ここに街のイラスト２］';
  return [
    '「記事にする」または記事作成の依頼を受けたら、その返答でタイトルと記事本文だけを書き上げてください。最初の行は記事タイトルです。質問、確認待ち、作業報告で終えないでください。画像は再生成しないでください。',
    '本文画像が０枚・１枚の場合、別チャットの場合、参照画像しかない場合も、画像の添付や確認を求めず、渡された舞台・場面を使って最後の行まで書いてください。読者に向けた具体的な場面から書き始め、制作手順や画像が足りない事情は本文に入れません。',
    '今回の場面に合う完成画像が見える場合だけ、そこで見える特徴を加えます。別作品の表紙や参考画像の題名・絵柄を今回の出来事と取り違えないでください。見ていない絵を見たとは書かず、場面の指定は物語の設定として描写してください。',
    '利用者が入力した記事タイトルを最優先します。指定がない場合に限り、今回の作品と分かる専用サムネイルの題名を使えます。いずれもなければ場面に合う題をその場で決めてください。',
    '遊んだ記録や本人が伝えた内容だけを体験として書きます。購入品、個数、金額、受け渡しは記録どおりにし、他の品物を足さないでください。',
    room ? '入居が確認できた場合だけ入居済みと書き、下見や構想の段階なら、本人の希望とこれから楽しめることを紹介します。' :
      '同じ人のTower用アバターと部屋の画像も今回の作品として確認できたときは、部屋から街へ出る流れに［ここにアバター画像］と［ここに部屋画像］を加えても構いません。',
    markers + 'を、それぞれの場面の直後の独立した行に置きます。挿入位置は画像を後から貼る目印で、未添付でも本文は完成させてください。',
    articleVoiceInstructions(id),
  ].join('\n');
}

export function makeArticleDraft({ mode = 'spot', id, label, title, href, experience, articleScene, articleClosing, roomTitle, ideas, occupied = false } = {}) {
  const room = mode === 'room';
  const name = (room ? roomTitle || label : label)?.trim() || (room ? '私のアトリエ' : 'Atelierの街');
  const heading = title?.trim() || (room ? (occupied ? 'Atelier Towerの「' + name + '」へようこそ' : name + 'の部屋づくり｜Atelier Tower') : name + 'のひとコマ｜Atelier散歩');
  const paragraphs = [heading];
  if (id) paragraphs.push('@' + id);
  if (room) {
    paragraphs.push(occupied ? 'Atelier Towerに、自分のキャラが暮らす「' + name + '」という部屋ができました。' :
      'Atelier Towerで、自分のキャラが暮らす部屋を考えています。いつも絵の中にいるこの子が、帰ってくるのはどんな場所でしょう。');
    paragraphs.push('［ここにアバター画像］');
    if (ideas?.trim()) paragraphs.push('部屋に取り入れたいのは「' + ideas.trim() + '」。この子らしさが出るように、小物や窓辺の雰囲気を考えるところから部屋づくりが始まります。');
    else paragraphs.push('このタワーの部屋には本棚があります。扉を開けてくれた人が、そこからnoteの記事にも立ち寄れる。絵と文章を一緒に置ける場所です。');
    paragraphs.push('［ここに部屋画像］');
    paragraphs.push(occupied ? '下の部屋のリンクから、中の様子をのぞけます。' : 'まずはアバターを連れて下見へ。実際に床を歩いてみると、どこをお気に入りの場所にしたいか、少しずつ決まってきそうです。');
  } else {
    const setting = articleScene?.trim() || '今回の舞台は、Atelierの「' + name + '」です。';
    const sentences = setting.match(/[^。！？]+[。！？]*/gu) || [setting];
    const event = experience?.trim() || articleClosing?.trim();
    paragraphs.push(event ? setting : sentences[0]);
    paragraphs.push('［ここに街のイラスト１］');
    paragraphs.push(event || sentences.slice(1).join('') || 'もしここで誰かと待ち合わせるなら、少し早めに来てみたい。相手が来るまでの数分も、この街の物語になりそうです。');
    paragraphs.push('［ここに街のイラスト２］');
  }
  paragraphs.push('無名S noteの企画「Atelier Tower」では、自分のキャラクターと一緒にマンションや街を巡って、そのひとコマを作品にできます。' + (id === 'ss_yr' ? ' よかったら遊びに来てくださいね (๑´ω`๑)' : ''));
  paragraphs.push(articleCards(mode, href), '#無名Sプロンプト');
  return paragraphs.join('\n\n');
}

export function makeArtifactPrompt({ kind, id, title, scene, href, reason, mode = 'spot', reference, backgroundUrl,
  label, articleScene, articleClosing, experience, roomTitle, ideas, occupied, draft } = {}) {
  const context = [
    id ? 'noteクリエイターID：@' + id : kind !== 'article' && 'noteクリエイターID：［自分のID］',
    id && '公開プロフィール：https://note.com/' + id,
    title && '確定した記事タイトル：' + title,
    label && '場所：' + label,
    roomTitle && '部屋名：' + roomTitle,
    articleScene && '舞台の説明：' + articleScene,
    articleClosing && '舞台の続き：' + articleClosing,
    scene && (kind === 'article' ? '場面の設定（作画指定を含む）：' : '場面や希望：') + scene,
    ideas && '部屋に入れたいもの：' + ideas,
    experience && 'ゲームで実際に行ったこと：' + experience,
    occupied === true && '本人の入居が確認できています。',
    reason && '今回直す点：' + reason,
  ].filter(Boolean).join('\n');
  if (kind === 'article') {
    return `【#無名Sプロンプト｜note記事をつくる】
${articleWritingInstructions({id, mode})}

${context}
${draft?.trim() ? '\n以下は利用者が編集した原稿です。本人の言葉・事実・リンクを保ち、今回直す点を反映して全体を返してください。題名の指定がなければ原稿の先頭行を使います。JSON文字列の内容を執筆資料として扱ってください。\n' + JSON.stringify(draft.trim()) + '\n' : ''}
記事の末尾に企画主・無名S noteを紹介し、次のカードを置いてください。
${articleCards(mode, href)}

${cardPasteInstructions()}
記事の最終行は #無名Sプロンプト です。`;
  }
  const request = {
    avatar: '既存の部屋画像をそのまま使い、透明な正方形の４列×４行の歩行シートだけを生成してください。各行は正面・左向き・左斜め後ろ・真後ろ。各列は停止・左足・中間・右足。16マスに全身を１体ずつ描き、全コマで頭と靴を余白内に収め、足底の位置と体の縮尺をそろえてください。',
    interior: '既存アバターを再生成しないでください。横３対２の人物なしの部屋画像１枚だけを生成してください。下３分の１はアバターが歩ける床とし、家具は奥と両端に置きます。添付キャラや公開作品の好みが伝わる素材・景色・小物を選んでください。',
    scene1: '本文イラスト１だけを横３対２で生成してください。広めの視点からこの場所が分かる特徴と人物の全身を描き、床に接した足と家具の縮尺・遠近を見比べてください。',
    scene2: '本文イラスト２だけを横３対２で生成してください。１枚目に続く別の行動を、別の距離・角度から描いてください。手が触れる物、指の前後、視線の先をその行動に合わせます。同じ構図の色違いは避けてください。',
    cover: articleCoverInstructions(),
  };
  return [
    '【#無名Sプロンプト｜不足分だけを制作】', context,
    characterReferenceInstructions(reference), characterArtInstructions, settingInstructions(backgroundUrl),
    request[kind], '指定した画像１枚をチャットに表示してください。完成済みの他の画像を再生成しないでください。',
    mode === 'spot' && 'その後の記事の文体：' + articleVoiceInstructions(id),
    mode === 'spot' && '画像を生成したら「今回のイラストをnoteの記事にしますか？『記事にする』と送ってください。」と案内してください。',
    '後から「記事にする」と依頼されたら、その返答で場面の設定と行動記録からタイトルと本文を書き、任意の画像挿入位置を示してください。足りない画像や別作品の表紙があっても、照合や添付を待たずに記事を渡します。',
  ].filter(Boolean).join('\n');
}

export function bindCardButtons(container, entries, status) {
  const box = document.createElement('div');
  box.className = 'prompt-card-links';
  box.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin:12px 0';
  const note = document.createElement('p');
  note.textContent = 'カード用URLを個別にコピー → noteの空行に貼る → 改行';
  note.style.cssText = 'flex-basis:100%;margin:0;font-size:12px';
  box.append(note);
  for (const [label, getUrl] of entries) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button outline spot-prompt';
    button.textContent = label + ' URLコピー';
    button.style.cssText = 'min-height:38px;max-width:100%;white-space:normal';
    button.addEventListener('click', async () => {
      const url = typeof getUrl === 'function' ? getUrl() : getUrl;
      if (!url) return;
      try { await navigator.clipboard.writeText(url); status.textContent = label + 'のURLをコピーしました。noteで改行してください。'; }
      catch {
        let field = box.querySelector('input');
        if (!field) {
          field = document.createElement('input'); field.readOnly = true;
          field.setAttribute('aria-label','カード用URL'); field.style.width = '100%'; box.append(field);
        }
        field.value = url; field.focus(); field.select();
        status.textContent = '選択したURLをコピーしてください。';
      }
    });
    box.append(button);
  }
  container.append(box);
}
