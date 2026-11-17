import { chatgptAppLink, hostNoteUrl, parseNoteId, towerUrl, insightUrl, articleCardBlock, articleCoverInstructions, articleVoiceInstructions, cardPasteInstructions, bindCardButtons, makeArtifactPrompt } from '../../../tower/prompt-play.js?v=20261118';
import { bindQualityAssist } from '../../../tower/quality-assist.js?v=20261118';

export function makeSpotPrompt({ label, scene, href, id }) {
  const profile = id ? `公開プロフィール： https://note.com/${id}\n` : '';
  const room = new URL(towerUrl);
  if (id) room.searchParams.set('creator', id);
  room.hash = 'prompt-import';
  return `【#無名Sプロンプト｜${label}で過ごす一日】

noteクリエイターID：${id ? '@' + id : '［自分のID］'}
${profile}添付：自分のキャラクターの参考画像

【描く場面】
${scene}

添付のキャラクターを主人公に、この場所で過ごす２つの異なる瞬間を、画像生成機能で横3対2の別々の完成イラスト２枚として描き、このチャットに表示してください。１枚目は場所・空気感・人物の全体が伝わるシーン、２枚目はその後の別の行動や表情、別のカメラ角度のシーンです。同じ構図の色違い、コラージュ、分割画像は禁止。添付画像の顔立ち、髪型、服、アクセサリーと、写真調・アニメ調など元の画風を受け継いでください。歩行シートを添付した場合は同じキャラクター1人を描きます。街の遠近感と、人物・家具・遊具の大きさをそろえ、足や手が触れる位置に気を配ってください。画像には文字・枠・ゲームの操作ボタンを入れません。
公開プロフィールを読める場合は、公開作品のモチーフを背景や小物に取り入れてください。読めなくても添付と場面指定で制作を続けてください。IDやキャラ画像がまだなければ、不足しているものだけ聞いてください。

【そのまま貼れるnote参加記事】
記事のタイトルを先に決め、２枚の絵に実際に描かれた行動と街の風景をもとに、参加者の視点でタイトルと本文を書いてください。本文の異なる位置に「［ここに街のイラスト１］」「［ここに街のイラスト２］」を入れます。未生成の画像は未完了と明記し、別々の２枚とサムネイルを生成し終えるまで完了としないでください。同じチャットですでにTower用のアバターと部屋の画像ができている場合は、「［ここにアバター画像］」「［ここに部屋画像］」も入れて、部屋から街へ出かけた1本の記事にまとめてください。
${articleVoiceInstructions(id)}
${articleCoverInstructions()}

記事の最後に無名S noteが主催する #無名Sプロンプト の遊びだと紹介し、以下のカード用ブロックを改変せずに置いてください。
${articleCardBlock([['企画主・無名S note',hostNoteUrl],['この場所で遊ぶ',href],['自分の部屋をつくる',towerUrl+'#prompt-play'],['noteの反応を分析する INSIGHT',insightUrl]])}

末尾に #無名Sプロンプト を付けます。${cardPasteInstructions()}
記事のあとに、Towerに画像を持ち帰る人向けの案内も書いてください。「アバターと部屋の画像を保存 → Towerの『生成した画像を添付する』へ → 自分の部屋を下見・入居」と案内し、「生成した画像を添付する」から ${room.href} にリンクしてください。`;
}

export function bindSpotIllustration(dialog) {
  const title = dialog.querySelector('#spot-title');
  const summary = dialog.querySelector('#spot-scene');
  const field = dialog.querySelector('#spot-id');
  const fileField = dialog.querySelector('#spot-image');
  const preview = dialog.querySelector('#spot-image-preview');
  const text = dialog.querySelector('#spot-text');
  const message = dialog.querySelector('#spot-message');
  const copy = dialog.querySelector('#spot-copy');
  const app = dialog.querySelector('#spot-app');
  const link = chatgptAppLink(navigator);
  app.href = link.href;
  app.textContent = link.label;
  if (link.newTab) {
    app.target = '_blank';
    app.rel = 'noopener';
  }
  let current, objectUrl, targeted = false;
  const quality = bindQualityAssist(dialog.querySelector('#spot-quality'), {
    mode: 'spot',
    getContext: () => ({ urls: [hostNoteUrl, current?.href, towerUrl + '#prompt-play', insightUrl].filter(Boolean),
      creator: parseNoteId(field.value), scene: current?.scene, occupied: current?.occupied === true }),
    repair: async (kind, articleTitle, reason) => {
      targeted = true;
      text.value = makeArtifactPrompt({ kind, title: articleTitle, reason, id: parseNoteId(field.value),
        scene: current?.scene, href: current?.href });
      try {
        await navigator.clipboard.writeText(text.value);
        message.textContent = '指定した成果物だけのプロンプトをコピーしました。';
      } catch {
        dialog.querySelector('.spot-preview').open = true;
        text.focus();
        text.select();
        message.textContent = '選択したプロンプトをコピーしてください。';
      }
    },
  });
  bindCardButtons(dialog.querySelector('#spot-card-actions'), [['企画主',hostNoteUrl],['この場所',()=>current?.href],['部屋づくり',towerUrl+'#prompt-play'],['INSIGHT',insightUrl]], message);
  const render = () => {
    targeted = false;
    const id = parseNoteId(field.value);
    field.setAttribute('aria-invalid', String(Boolean(field.value.trim()) && !id));
    text.value = makeSpotPrompt({ ...current, id });
  };

  field.addEventListener('input', () => {
    render();
    quality.refresh();
    message.textContent = '';
  });
  fileField.addEventListener('change', () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    const file = fileField.files[0];
    objectUrl = file ? URL.createObjectURL(file) : '';
    if (objectUrl) preview.src = objectUrl;
    else preview.removeAttribute('src');
    preview.hidden = !objectUrl;
  });
  preview.addEventListener('error', () => {
    preview.hidden = true;
    message.textContent = '画像を開けませんでした。PNG・JPEG・WebP・GIFを選んでください。';
  });
  copy.addEventListener('click', async () => {
    if (field.getAttribute('aria-invalid') === 'true') {
      message.textContent = 'noteのIDまたはプロフィールのURLを確認してください。';
      field.focus();
      return;
    }
    try {
      await navigator.clipboard.writeText(text.value);
      message.textContent = targeted ? '不足分だけのプロンプトをコピーしました。' :
        'コピーしました。本文イラスト２枚・専用サムネイル１枚を別々に生成します。';
    } catch {
      dialog.querySelector('.spot-preview').open = true;
      text.focus();
      text.select();
      message.textContent = '選択したプロンプトをコピーしてください。';
    }
  });
  window.addEventListener('pagehide', ({ persisted }) => {
    if (objectUrl && !persisted) URL.revokeObjectURL(objectUrl);
  });
  return spot => {
    current = spot;
    title.textContent = `${spot.label}でイラストをつくる`;
    summary.textContent = spot.scene;
    if (!field.value) field.value = spot.id || '';
    message.textContent = '';
    render();
    quality.refresh();
    dialog.showModal();
    copy.focus();
  };
}
