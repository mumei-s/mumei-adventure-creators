export const towerUrl = 'https://mumei-s.github.io/mumei-adventure-creators/tower/';
export const hostNoteUrl = 'https://note.com/ss_yr';
export const insightUrl = 'https://mumei-s.github.io/note-insight/';
const appUrl = 'https://chatgpt.com/open-app';
const androidStore = 'https://play.google.com/store/apps/details?id=com.openai.chatgpt';

export function parseNoteId(value) {
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

export function makeRoomPrompt({ id, description, articles = [], ideas, returnUrl = `${towerUrl}#prompt-import`, roomOnly = false, avatarOnly = false } = {}) {
  if (avatarOnly) return makeArtifactPrompt({ kind: 'avatar', id, scene: ideas, mode: 'room' });
  if (roomOnly) {
    const scene = [ideas, description, ...articles.slice(0, 5).map(article => article.title)].filter(Boolean).join('\n');
    return makeArtifactPrompt({ kind: 'interior', id, scene, mode: 'room' }) +
      '\n保存した部屋画像をTowerの個別添付欄に入れてください。\n' + returnUrl;
  }
  const titles = articles.slice(0, 5).map(({ title }) => `・${title}`).join('\n');
  return `【#無名Sプロンプト｜Atelier Towerに住む】

noteクリエイターID：${id ? `@${id}` : '［自分のnote IDを入れる］'}
${id ? `公開プロフィール：https://note.com/${id}\n` : ''}添付：自分のキャラクターの参考画像
部屋に入れたい世界観や好きなもの：${ideas || 'キャラクターとnoteの作風から考えてください。'}
${description ? `\n公開プロフィールの自己紹介：${description}\n` : ''}${titles ? `\n公開記事の題名\n${titles}\n` : ''}
${roomOnly ? 'すでにアバターは完成しています。今回は部屋画像を最優先で生成し、既存アバターを再生成しないでください。' : 'この初回依頼で、ゲーム用部屋画像・歩行アバター・記事専用の部屋サムネイルの３枚と参加記事を作ってください。最初の成果物は必ず部屋画像です。'}
noteの公開プロフィールや記事の作風を読める場合は、創作のモチーフにしてください。アクセスできないときは、添付画像と希望から作ってください。添付と公開ページから推測した個人情報を作品や説明に入れないでください。
IDか参考画像がまだない場合は、不足しているものだけ聞いてください。そろったら画像を生成してください。

${roomOnly ? '【既存アバター】完成済みの画像をそのまま使います。以下は既存画像の仕様です。新しく生成しないでください。' : '【アバター画像（部屋の次に生成）】'}
全身が見える歩行スプライトを、透明背景の正方形に４列×４行の均等なマスで描いてください。上から「正面」「画面の左向き」「左斜め後ろ」「真後ろ」。各行の左から「立ち姿」「左足を前へ」「足がすれ違う中間」「右足を前へ」。各マスの中央に１体、頭から靴まで入れ、足底の位置と体の縮尺をそろえてください。マスの境界まで十分な透明余白を取り、線・文字・枠・床・落ち影を描かないでください。顔立ち、髪、服とアクセサリーを全コマでそろえます。実写のキャラは写真調、アニメのキャラは元のタッチを保ちます。

【ゲーム用部屋画像（文字なし・サムネイルと別）】
アバターとは別の、横３：２の内装画像を１枚描いてください。視点は少し高い位置から室内を見渡す角度。画像の下３分の１はアバターが歩く床なので、家具は両脇と奥に置いてください。添付キャラの好みやnoteの作風が伝わる素材、光、窓の外の景色、小物で、ここで誰がどんなふうに暮らしているか想像できる部屋にしてください。人物・文字・UI・枠は描かないでください。

【生成順序・完了検査】
${roomOnly ? '今回は横３：２の人物なしの部屋画像を実際に生成して表示してください。アバターは生成不要です。' : '必ず部屋画像を最初に実際に生成し、次にアバター画像を別の画像として生成してください。３枚目は部屋を題材にした記事専用サムネイルです。３枚は独立した画像ファイルとして生成し、部屋画像とサムネイルを絶対に兼用・合成しないでください。１回で全部を出せない場合は、未生成の各成果物だけを生成する短い指示を全て提示してください。'} 文章だけや生成指示だけを完成品にしないでください。画像を１枚に合成しないこと。部屋の床・遠近・家具の比率、文字や人物の混入を確認すること。未生成の画像がある場合は未完了と明記し、完成や入居済みとしないこと。

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
  return '【note専用サムネイル】記事のタイトルを制作前に決め、そのタイトルと「#無名Sプロンプト」を正しい日本語で読みやすく入れた横1280×650のサムネイルを、別の完成画像で生成してください。本文用の絵とは明確に異なる世界観・演出・構図・光・視点を毎回設計し、高級感のある映画ポスターや雑誌表紙のように仕上げます。本文画像に文字を重ねて流用しないでください。キャラの顔立ち・頭身・衣装は維持。上下左右7％を安全余白にし、noteの一覧やマガジンの中央トリミングでも顔と題名が読める中央領域へ配置します。タイトルは記事と完全に一致させ、文字切れ・誤字・脱字・重複・透かしを確認します。自動で画像を続けて出せない場合は、未生成の画像名とその１枚だけを生成する短い指示を提示してください。未生成の画像がある間は未完了と明記してください。';
}

export function articleVoiceInstructions(id) {
  return id === 'ss_yr' ?
    '運営者・無名S note本人の文章は、読者に親しみを込めて語りかけ、顔文字を多めに使ってください。斜め向きの涙笑い絵文字は使わないでください。' :
    '参加者本人の公開文章や会話で分かる文体を尊重してください。文体が分からなければ読みやすい一人称で書き、実際に遊んだと確認できない行動を体験談にしないでください。';
}

export function makeArtifactPrompt({ kind, id, title, scene, href, reason, mode = 'spot' } = {}) {
  const request = {
    avatar: '既存の部屋画像をそのまま使い、添付キャラの４列×４行の歩行シートだけを透明背景で生成してください。各行は正面・左向き・左斜め後ろ・真後ろ。各列は停止・左足・中間・右足の順です。16マスに全身を１体ずつ描き、頭と靴までを十分な余白内に収め、全マスで顔立ち・頭身・髪・衣装・大きさをそろえます。',
    interior: '既存アバターを再生成しないでください。横３対２の人物なしの部屋画像１枚だけを生成してください。下３分の１は家具を避けた床とし、家具は奥と両端に置きます。添付キャラや公開作品の好みが伝わる素材・景色・小物を選んでください。',
    scene1: '本文イラスト１だけを横３対２の完成画像で生成してください。場所と空気感、人物の全身が伝わる広めの構図を設計してください。',
    scene2: '本文イラスト２だけを横３対２の完成画像で生成してください。完成済みの１枚目を見て、その後の別の行動・別のポーズ・別のカメラ角度へ切り替えてください。同じ構図の色違いや微変更は避けてください。',
    cover: articleCoverInstructions(),
    article: `完成した画像を読み、参加者本人のnote記事だけを書き直してください。タイトル、導入、本文、${mode === 'room' ? '［ここにアバター画像］と［ここに部屋画像］' : '［ここに街のイラスト１］と［ここに街のイラスト２］'}の挿入位置、企画紹介を含めてください。`,
  };
  return `【#無名Sプロンプト｜不足分だけを制作】
noteクリエイターID：${id ? '@' + id : '［自分のID］'}
${id ? '公開プロフィール：https://note.com/' + id : ''}
${title ? '確定した記事タイトル：' + title : ''}
${scene ? '場面や希望：' + scene : ''}
${reason ? '修正が必要な点：' + reason : ''}
添付のキャラクターと、このチャットで完成済みの画像・設定を引き継いでください。顔立ち、髪型、髪色、衣装と元の画風を保ちます。
${request[kind] || request.article}
今回指定した成果物だけを出し、完成済みの他の画像を再生成しないでください。画像は分割や合成をせず、個別の完成画像をチャットに表示してください。
${articleVoiceInstructions(id)}
${kind === 'article' ? articleCardBlock([['企画主・無名S note',hostNoteUrl],...(href ? [['遊んだ場所',href]] : []),['Atelier Tower',towerUrl+'#prompt-play'],['INSIGHT',insightUrl]]) + '\n\n' + cardPasteInstructions() + '\n記事の末尾に #無名Sプロンプト を入れてください。' : ''}
足りない成果物は未完了と明記し、未確認の生成物や入居を完了扱いしないでください。`;
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
