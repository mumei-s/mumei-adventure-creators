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
必ず部屋画像を最初に実際に生成し、次にアバター画像を別の画像として生成してください。３枚目は部屋を題材にした記事専用サムネイルです。３枚は独立した画像ファイルとして生成し、部屋画像とサムネイルを絶対に兼用・合成しないでください。１回で全部を出せない場合は、未生成の各成果物だけを生成する短い指示を全て提示してください。文章だけや生成指示だけを完成品にしないでください。画像を１枚に合成しないこと。部屋の床・遠近・家具の比率、文字や人物の混入を確認すること。未生成の画像がある場合は未完了と明記し、完成や入居済みとしないこと。

【参加者のnote記事】
最初に記事タイトルを決め、部屋・アバター・専用サムネイルの３枚を揃えたら、追加の依頼を待たずに、そのままnoteに貼れる参加記事を１本書いてください。タイトルと本文を付け、「［ここにアバター画像］」「［ここに部屋画像］」を本文の自然な位置に置きます。自分のキャラと、部屋名や窓の景色、選んだ小物など、今回の絵に実際に出てくる見どころを参加者の視点で紹介してください。入居済みと分かるまでは、「部屋をつくった」「これから下見する」など、今の段階で書いてください。
${articleVoiceInstructions(id)}

${articleCoverInstructions()}

記事の最後に無名S noteの企画を紹介し、以下のカード用ブロックをそのまま使ってください。
${articleCardBlock([['企画主・無名S note', hostNoteUrl], ['自分のキャラで参加する', `${towerUrl}#prompt-play`], ['noteの反応を分析する INSIGHT', insightUrl]])}

末尾のハッシュタグは #無名Sプロンプト です。${cardPasteInstructions()}

記事の下に、参加者が次に使う案内も書いてください。「アバター・部屋・専用サムネイルを個別に保存（サムネイルはnote記事の見出し用） → Towerの『生成した画像を添付する』で２枚を選ぶ → 自分のアバターで下見や街歩き → 入居する」の順で、「Atelier Towerに画像を添付する」という押せるリンクを付けてください。
${id ? `リンク先は ${returnUrl} を使ってください。` : `リンク先は ${returnUrl} です。note IDが分かっていれば「#prompt-import」の直前に「?creator=本人のnote ID」を入れてください。IDは先頭の@を外し、英字を小文字にしてください。`}`;
}

export function residentPost(title, roomUrl) {
  return `# 自分のキャラが暮らす「${title}」ができました\n\n無名S noteの #無名Sプロンプト「Atelier Towerに住む」で、自分のキャラと部屋をつくりました。\n\n［ここにアバター画像］\n\n［ここに部屋画像］\n\n部屋ではアバターを動かしたり、本棚からnoteの記事を開いたりできます。\n\n私の部屋\n${roomUrl}\n\n${articleCardBlock([['企画主・無名S note',hostNoteUrl],['自分のキャラで参加する',`${towerUrl}#prompt-play`],['noteの反応を分析する INSIGHT',insightUrl]])}\n\n#無名Sプロンプト`;
}

export function articleCardBlock(entries) {
  return entries.map(([label,url]) => label + '\n\n' + url).join('\n\n');
}

export function cardPasteInstructions() {
  return 'カード用URLは必ず裸のURLだけを独立した行に置く。引用符、括弧、箇条書き記号、Markdownリンク、コード枠、URLの直後の句読点は禁止。本文の外に「note編集画面でURLを空行に個別に貼り、改行してカード表示を確認」と案内してください。';
}

export function articleCoverInstructions() {
  return '【note専用サムネイル】記事のタイトルを制作前に決め、そのタイトルと「#無名Sプロンプト」を正しい日本語で読みやすく入れた横1280×650のサムネイルを、別の完成画像で生成してください。本文用の絵とは明確に異なる構図で、同じ場所・人物が分かる表紙に仕上げます。人物の向きと視線に合わせて題名の余白を取り、小さい一覧表示でも主役と文字が読める背景と明暗差を選びます。本文画像に文字を重ねて流用しないでください。キャラの顔立ち・頭身・衣装は維持。上下左右7％を安全余白にし、noteの一覧やマガジンの中央トリミングでも顔と題名が読める中央領域へ配置します。タイトルは記事と完全に一致させ、文字切れ・誤字・脱字・重複・透かしを確認します。自動で画像を続けて出せない場合は、未生成の画像名とその１枚だけを生成する短い指示を提示してください。未生成の画像がある間は未完了と明記してください。';
}

export function articleVoiceInstructions(id) {
  return id === 'ss_yr' ?
    '運営者・無名S note本人の文章は、読者に親しみを込めて語りかけ、顔文字を多めに使ってください。斜め向きの涙笑い絵文字は使わないでください。' :
    '参加者本人の公開文章や会話で分かる文体を尊重してください。文体が分からなければ読みやすい一人称で書き、実際に遊んだと確認できない行動を体験談にしないでください。';
}

export function makeArtifactPrompt({ kind, id, title, scene, href, reason, mode = 'spot', reference, backgroundUrl } = {}) {
  const context = [
    'noteクリエイターID：' + (id ? '@' + id : '［自分のID］'),
    id && '公開プロフィール：https://note.com/' + id,
    title && '確定した記事タイトル：' + title,
    scene && '場面や希望：' + scene,
    reason && '今回直す点：' + reason,
  ].filter(Boolean).join('\n');
  if (kind === 'article') {
    const markers = mode === 'room' ? '［ここにアバター画像］と［ここに部屋画像］' : '［ここに街のイラスト１］と［ここに街のイラスト２］';
    const cards = articleCardBlock([['企画主・無名S note', hostNoteUrl], ...(href ? [['遊んだ場所', href]] : []), ['Atelier Tower', towerUrl + '#prompt-play'], ['INSIGHT', insightUrl]]);
    return `【#無名Sプロンプト｜note記事をつくる】
${context}
完成した作品を使い、タイトルと記事本文だけを書いてください。画像は再生成しないでください。同じチャットで今回の画像を確認し、見られない場合に限り本文用画像の添付を依頼してください。専用サムネイルがあれば記事タイトルをその文字と一致させます。
本文には絵に写った具体的な行動や小物を紹介し、${markers}を対応する場面の直後に置きます。${mode === 'spot' ? '今回と同じ人のTower用アバターと部屋画像も完成済みなら、［ここにアバター画像］と［ここに部屋画像］を加えて、部屋から街へ出かける１本の記事にできます。' : ''}
${articleVoiceInstructions(id)}
入居したかどうかは本人が確認できた内容だけを書いてください。記事の末尾に企画を紹介し、次のURLを記載してください。
${cards}

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
