export const towerUrl = new URL(import.meta.url).protocol === 'https:' && new URL(import.meta.url).pathname.includes('/admission/') ? new URL('./',import.meta.url).href : 'https://mumei-s.github.io/mumei-adventure-creators/tower/';
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
  if (/^https:\/\//i.test(source) || /^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\//i.test(source)) return { referenceMode: 'registered', referenceUrl: source };
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

export const drawFirst = '参照がそろったら、前置き・構成案・プロフィール検索を挟まず画像生成を実行し、できた画像からこのチャットに表示してください。';
export function settingInstructions(backgroundUrl) {
  return backgroundUrl ? '場所の背景資料：' + backgroundUrl + '\n窓・照明・家具の配置と奥行きを保つ。画像を開けない場合は再検索せず、場面の説明を使ってください。' : '';
}

export function makeRoomPrompt({ id, description, articles = [], ideas, returnUrl = `${towerUrl}#prompt-import`, roomOnly = false, avatarOnly = false, reference } = {}) {
  if (avatarOnly) return makeArtifactPrompt({ kind: 'avatar', id, scene: ideas, mode: 'room', reference });
  if (roomOnly) {
    const scene = [ideas, description, ...articles.slice(0, 5).map(article => article.title)].filter(Boolean).join('\n');
    return makeArtifactPrompt({ kind: 'interior', id, scene, mode: 'room', reference }) +
      '\n保存した部屋画像をTowerの個別添付欄に入れてください。\n' + returnUrl;
  }
  const back = new URL(returnUrl);
  if (id) back.searchParams.set('creator', id);
  back.hash = 'prompt-import';
  return `【#無名Sプロンプト｜Atelier Tower 入居用】
noteクリエイターID：${id ? '@'+id : '［自分のnote ID］'}
${characterReferenceInstructions(reference)}
${characterArtInstructions}
① 最初にゲーム用アバター画像を１枚生成して表示する。${drawFirst}
背景透過の正方形の歩行シート。４列×４行。上から正面、左向き、左斜め後ろ、真後ろ。各行は停止、左足前、中間、右足前。各マスに同じ人物の頭から靴までを収め、足底と縮尺をそろえる。枠線・文字・床を入れない。
② アバターを表示してから「どんなお部屋に住みたいですか？ 色や窓からの景色など、ひとことでも大丈夫です」と聞く。${ideas ? '候補として「'+ideas+'」を伝える。' : ''} ここで返事を待つ。
③ 本人の返事を受けてから、希望に合わせて部屋画像を１枚生成して表示する。横３対２、人物や文字のない内装。下３分の１に歩ける床を残し、家具は奥と両端に置く。
④「アバターと部屋の２枚をそれぞれ保存してください」と伝え、次のリンクを「空室を選んで入居する」として表示する。
${back.href}
${id ? '' : 'リンクを渡す前に、今回入力されたnote IDをcreatorパラメータに入れてください。'}
入居ページでは空室を選び、２枚を添付し、確認用パスコードで本人確認する。記事制作は入居後に本人が選べる。`;
}

export function makeMoveInArticlePrompt({id, title, address, href, avatar, interior}) {
  return [
    '【#無名Sプロンプト｜入居を記事にする】',
    '入居確認済み。note IDは @'+id+'。入居先はAtelier Tower '+address+'号室「'+title+'」。',
    '登録したアバターと部屋を使ってください。画像の添付は任意です。今回の添付があれば該当するキャラや部屋の参考として優先します。登録画像は公開先から読み、まだ反映されていない画像だけ、その下の一時URLから読みます。どちらも開けない場合は同じチャットの元絵または部屋情報を使い、IDや追加添付を求めずに仕上げてください。画像の参照URLは記事本文に載せません。',
    avatar && '登録アバター：'+avatar, interior && '登録した部屋：'+interior,
    characterArtInstructions,
    '記事の題を一つ決めて、次の３枚を別々の完成画像として順に表示してください。事前の検索や長い説明は省きます。',
    articleCoverInstructions(),
    '本文イラスト１はエントランスで自分の部屋の鍵を受け取る場面。本文イラスト２は部屋に入ってお気に入りの場所で過ごす場面。画角・行動を変え、本文用の絵には文字を入れない。',
    '続けて同じ題でnoteに貼れる記事を最後まで書く。［ここにイラスト１］［ここにイラスト２］を該当する段落の直後に置く。創作の場面を実生活の出来事と混同せず、プロフィールの外の名前・個人情報を推測しない。',
    articleVoiceInstructions(id), articleCards('room',href), cardPasteInstructions(), '最後の行は #無名Sプロンプト。',
  ].filter(Boolean).join('\n');
}

export function residentPost(title, roomUrl) {
  return makeArticleDraft({ mode: 'room', roomTitle: title, href: roomUrl, occupied: true });
}

export function articleCardBlock(entries) {
  return entries.map(([label,url]) => label + '\n\n' + url).join('\n\n');
}

export function cardPasteInstructions() {
  return '企画主の公開名は「無名S note」。個人名を補わない。カード用URLは必ず裸のURLだけを独立した行に置く。引用符、括弧、箇条書き記号、Markdownリンク、コード枠、URLの直後の句読点は禁止。本文の外に「note編集画面でURLを空行に個別に貼り、改行してカード表示を確認」と案内してください。';
}

export function articleCoverInstructions() {
  return '【note専用サムネイル】記事と同じタイトルと「#無名Sプロンプト」を入れた横1280×650の独立画像。本文用の絵とは明確に異なる構図にし、顔・衣装・場所を保つ。上下左右7％を空け、中央トリミングでも顔と正しい題名が読めるように。生成できなかった画像だけ未完了と伝え、各１枚を出す短い指示を添えてください。';
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
    id && kind === 'article' && '公開プロフィール：https://note.com/' + id,
    title && '確定した記事タイトル：' + title,
    label && '場所：' + label,
    roomTitle && '部屋名：' + roomTitle,
    kind==='article' && articleScene && '舞台の説明：' + articleScene,
    kind==='article' && articleClosing && '舞台の続き：' + articleClosing,
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
    '【#無名Sプロンプト｜画像１枚】', request[kind], drawFirst, context,
    characterReferenceInstructions(reference), characterArtInstructions, settingInstructions(backgroundUrl),
    'この１枚で完了。完成済みの他の画像を再生成しないでください。',
    mode === 'spot' && '完成後「今回のイラストをnoteの記事にしますか？『記事にする』と送ってください。」と案内。希望があれば場面・行動記録から本文と画像挿入位置をすぐに書く。' + articleVoiceInstructions(id),
  ].filter(Boolean).join('\n');
}

export function bindArticleDraft(panel, getContext) {
  const field=panel.querySelector('textarea');
  const message=panel.querySelector('[role=status]');
  let previous='';
  function refresh() {
    const next=makeArticleDraft(getContext());
    if(next!==previous) { field.value=next; previous=next; message.textContent=''; }
  }
  panel.addEventListener('toggle',()=>{if(panel.open)refresh();});
  panel.querySelector('button').addEventListener('click',async()=>{
    try {
      await navigator.clipboard.writeText(field.value);
      message.textContent='記事本文をコピーしました。noteの本文に貼り付けられます。';
    } catch {
      field.focus();field.select();message.textContent='選択中の記事本文をコピーできます。';
    }
  });
  return {
    reveal() {refresh();panel.open=true;field.focus();},
    refresh,
    get text() {refresh();return field.value;},
  };
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
