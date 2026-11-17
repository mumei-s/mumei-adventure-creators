export const towerUrl = 'https://mumei-s.github.io/mumei-adventure-creators/tower/';
export const hostNoteUrl = 'https://note.com/ss_yr';
const appUrl = 'https://chatgpt.com/open-app';
const androidStore = 'https://play.google.com/store/apps/details?id=com.openai.chatgpt';

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

export function makeRoomPrompt({ id, description, articles = [], ideas, returnUrl = `${towerUrl}#prompt-import` } = {}) {
  const titles = articles.slice(0, 5).map(({ title }) => `・${title}`).join('\n');
  return `【#無名Sプロンプト｜Atelier Towerに住む】

noteクリエイターID：${id ? `@${id}` : '［自分のnote IDを入れる］'}
${id ? `公開プロフィール：https://note.com/${id}\n` : ''}添付：自分のキャラクターの参考画像
部屋に入れたい世界観や好きなもの：${ideas || 'キャラクターとnoteの作風から考えてください。'}
${description ? `\n公開プロフィールの自己紹介：${description}\n` : ''}${titles ? `\n公開記事の題名\n${titles}\n` : ''}
このキャラクターが暮らす部屋と、部屋を歩くアバターを画像生成機能で作ってください。noteの公開プロフィールや記事の作風を読める場合は、創作のモチーフにしてください。アクセスできないときは、添付画像と希望から作ってください。添付と公開ページから推測した個人情報を作品や説明に入れないでください。
IDか参考画像がまだない場合は、不足しているものだけ聞いてください。そろったら画像を生成してください。

【アバター画像】
全身が見える歩行スプライトを、透明背景の正方形に４列×４行の均等なマスで描いてください。上から「正面」「画面の左向き」「左斜め後ろ」「真後ろ」。各行の左から「立ち姿」「左足を前へ」「足がすれ違う中間」「右足を前へ」。各マスの中央に１体、頭から靴まで入れ、足底の位置と体の縮尺をそろえてください。マスの境界まで十分な透明余白を取り、線・文字・枠・床・落ち影を描かないでください。顔立ち、髪、服とアクセサリーを全コマでそろえます。実写のキャラは写真調、アニメのキャラは元のタッチを保ちます。

【部屋画像】
アバターとは別の、横３：２の内装画像を１枚描いてください。視点は少し高い位置から室内を見渡す角度。画像の下３分の１はアバターが歩く床なので、家具は両脇と奥に置いてください。添付キャラの好みやnoteの作風が伝わる素材、光、窓の外の景色、小物で、ここで誰がどんなふうに暮らしているか想像できる部屋にしてください。人物・文字・UI・枠は描かないでください。

２枚の完成画像を別々にチャットに表示してください。１回に１枚なら、まずアバター画像を出し、「部屋を描いて」と送られたら２枚目を出してください。

【参加者のnote記事】
２枚ができたら、追加の依頼を待たずに、そのままnoteに貼れる参加記事を１本書いてください。タイトルと本文を付け、「［ここにアバター画像］」「［ここに部屋画像］」を本文の自然な位置に置きます。自分のキャラと、部屋名や窓の景色、選んだ小物など、今回の絵に実際に出てくる見どころを参加者の視点で紹介してください。入居済みと分かるまでは、「部屋をつくった」「これから下見する」など、今の段階で書いてください。

記事の最後に、無名S noteが主催する #無名Sプロンプト「Atelier Towerに住む」の紹介を入れ、「企画主・無名S note」から ${hostNoteUrl} へ、「自分のキャラで参加する」から ${towerUrl}#prompt-play へリンクしてください。末尾のハッシュタグは #無名Sプロンプト です。

記事の下に、参加者が次に使う案内も書いてください。「２枚を保存 → Towerの『生成した画像を添付する』で２枚を選ぶ → 自分のアバターで下見や街歩き → 入居する」の順で、「Atelier Towerに画像を添付する」という押せるリンクを付けてください。
${id ? `リンク先は ${returnUrl} を使ってください。` : `リンク先は ${returnUrl} です。note IDが分かっていれば「#prompt-import」の直前に「?creator=本人のnote ID」を入れてください。IDは先頭の@を外し、英字を小文字にしてください。`}`;
}

export function residentPost(title, roomUrl) {
  return `# 自分のキャラが暮らす「${title}」ができました\n\n無名S noteの #無名Sプロンプト「Atelier Towerに住む」で、自分のキャラと部屋をつくりました。\n\n［ここにアバター画像］\n\n［ここに部屋画像］\n\n部屋ではアバターを動かしたり、本棚からnoteの記事を開いたりできます。\n\n私の部屋\n${roomUrl}\n\n企画主・無名S note\n${hostNoteUrl}\n\n自分のキャラで参加する\n${towerUrl}#prompt-play\n\n#無名Sプロンプト`;
}
