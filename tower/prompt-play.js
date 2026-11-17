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

export function makeRoomPrompt({ id, description, articles = [], ideas, returnUrl = `${towerUrl}#prompt-import`, roomOnly = false } = {}) {
  const titles = articles.slice(0, 5).map(({ title }) => `・${title}`).join('\n');
  return `【#無名Sプロンプト｜Atelier Towerに住む】

noteクリエイターID：${id ? `@${id}` : '［自分のnote IDを入れる］'}
${id ? `公開プロフィール：https://note.com/${id}\n` : ''}添付：自分のキャラクターの参考画像
部屋に入れたい世界観や好きなもの：${ideas || 'キャラクターとnoteの作風から考えてください。'}
${description ? `\n公開プロフィールの自己紹介：${description}\n` : ''}${titles ? `\n公開記事の題名\n${titles}\n` : ''}
${roomOnly ? 'すでにアバターは完成しています。今回は部屋画像を最優先で生成し、既存アバターを再生成しないでください。' : 'このキャラクターが暮らす部屋と、部屋を歩くアバターを画像生成機能で作ってください。最初の成果物は必ず部屋画像です。'}noteの公開プロフィールや記事の作風を読める場合は、創作のモチーフにしてください。アクセスできないときは、添付画像と希望から作ってください。添付と公開ページから推測した個人情報を作品や説明に入れないでください。
IDか参考画像がまだない場合は、不足しているものだけ聞いてください。そろったら画像を生成してください。

${roomOnly ? '【既存アバター】完成済みの画像をそのまま使います。以下は既存画像の仕様です。新しく生成しないでください。' : '【アバター画像（部屋の次に生成）】'}
全身が見える歩行スプライトを、透明背景の正方形に４列×４行の均等なマスで描いてください。上から「正面」「画面の左向き」「左斜め後ろ」「真後ろ」。各行の左から「立ち姿」「左足を前へ」「足がすれ違う中間」「右足を前へ」。各マスの中央に１体、頭から靴まで入れ、足底の位置と体の縮尺をそろえてください。マスの境界まで十分な透明余白を取り、線・文字・枠・床・落ち影を描かないでください。顔立ち、髪、服とアクセサリーを全コマでそろえます。実写のキャラは写真調、アニメのキャラは元のタッチを保ちます。

【部屋画像】
アバターとは別の、横３：２の内装画像を１枚描いてください。視点は少し高い位置から室内を見渡す角度。画像の下３分の１はアバターが歩く床なので、家具は両脇と奥に置いてください。添付キャラの好みやnoteの作風が伝わる素材、光、窓の外の景色、小物で、ここで誰がどんなふうに暮らしているか想像できる部屋にしてください。人物・文字・UI・枠は描かないでください。

【生成順序・完了検査】
${roomOnly ? '今回は横３：２の人物なしの部屋画像を実際に生成して表示してください。アバターは生成不要です。' : '必ず部屋画像を最初に実際に生成し、次にアバター画像を別の画像として生成してください。１回で両方を出せない場合は部屋を表示し、残るアバターの生成用の短い指示を提示してください。'} 文章だけや生成指示だけを完成品にしないでください。画像を１枚に合成しないこと。部屋の床・遠近・家具の比率、文字や人物の混入を確認すること。未生成の画像がある場合は未完了と明記し、完成や入居済みとしないこと。

【参加者のnote記事】
２枚ができたら、追加の依頼を待たずに、そのままnoteに貼れる参加記事を１本書いてください。タイトルと本文を付け、「［ここにアバター画像］」「［ここに部屋画像］」を本文の自然な位置に置きます。自分のキャラと、部屋名や窓の景色、選んだ小物など、今回の絵に実際に出てくる見どころを参加者の視点で紹介してください。入居済みと分かるまでは、「部屋をつくった」「これから下見する」など、今の段階で書いてください。

${articleCoverInstructions()}

記事の最後に無名S noteの企画を紹介し、以下のカード用ブロックをそのまま使ってください。
${articleCardBlock([['企画主・無名S note', hostNoteUrl], ['自分のキャラで参加する', `${towerUrl}#prompt-play`], ['noteの反応を分析する INSIGHT', insightUrl]])}

末尾のハッシュタグは #無名Sプロンプト です。${cardPasteInstructions()}

記事の下に、参加者が次に使う案内も書いてください。「アバターと部屋を個別に保存 → Towerの『生成した画像を添付する』で２枚を選ぶ → 自分のアバターで下見や街歩き → 入居する」の順で、「Atelier Towerに画像を添付する」という押せるリンクを付けてください。
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
  return '【note専用サムネイル】記事のタイトルを制作前に決め、そのタイトルと「#無名Sプロンプト」を正しい日本語で読みやすく入れた横1280×650相当のサムネイルも別画像で生成してください。本文用の絵とは異なる衣装以外の演出・構図・光・視点で、高級感のある映画ポスターのように仕上げます。キャラの顔立ちと衣装は維持。文字も顔も端から十分離し、切れ・誤字・重複・透かしを検査。サムネイルを本文画像に流用しないこと。タイトルは記事と完全に一致させます。画像を一度に生成できない場合は未生成の画像名と、それだけを生成する短い指示を示し、完成扱いにしないでください。';
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
