import { chatgptAppLink, hostNoteUrl, parseNoteId, towerUrl, insightUrl, articleCardBlock, articleWritingInstructions, bindArticleDraft, articleCoverInstructions, articleVoiceInstructions, cardPasteInstructions, bindCardButtons, makeArtifactPrompt, creatorReference, characterReferenceInstructions, characterArtInstructions, settingInstructions } from '../../../tower/prompt-play.js?v=20261118-city2';
import { bindQualityAssist } from '../../../tower/quality-assist.js?v=202611181820';

export { characterReferenceInstructions as spotReferenceInstructions };

export function makeSpotPrompt({ label, scene, href, id, referenceMode, referenceUrl, backgroundUrl, experience }) {
  const profile = id ? `公開プロフィール： https://note.com/${id}\n` : '';
  const room = new URL(towerUrl);
  if (id) room.searchParams.set('creator', id);
  room.hash = 'prompt-import';
  return `【#無名Sプロンプト｜${label}で過ごす一日】

noteクリエイターID：${id ? '@' + id : '［自分のID］'}
${profile}${characterReferenceInstructions({referenceMode,referenceUrl})}

【描く場面】
${scene}
${experience ? 'この参加者が実際に行ったこと：'+experience+'\n' : ''}${settingInstructions(backgroundUrl)}

確認できた登録済みまたは今回添付したキャラクターを主人公に、この場所で過ごす２つの異なる瞬間を、画像生成機能で横3対2の別々の完成イラスト２枚として描き、このチャットに表示してください。１枚目では、広めの構図で場所の特徴と人物の全身、足を置いた床を見せてください。２枚目では続いて起きた行動に近づき、１枚目と異なる角度から視線や手と物の接点を描いてください。足の接地・影の方向、指と持ち手の重なり、人物と家具や遊具の縮尺を場面ごとに見直してください。２枚を同じ絵の色違いやコラージュにせず、それぞれ文字・操作ボタンのない完成画像にしてください。
${characterArtInstructions}
公開プロフィールを読める場合は、公開作品のモチーフを背景や小物に取り入れてください。読めなくても添付と場面指定で制作を続けてください。IDが記載されていれば再質問しないでください。キャラ画像は確認できない場合だけ聞いてください。

【そのまま貼れるnote参加記事】
記事のタイトルを先に決め、本文イラスト２枚と専用サムネイルを生成します。画像が出たら必ず次の質問をしてください：「今回のイラストをnoteの記事にしますか？『記事にする』と送ってください。」 画像だけで応答が終わる環境では、利用者がサイトの「note記事を作る」ボタンを使えるように案内してください。「記事にする」と返答されたら、その場で記事を書いてください。
${articleWritingInstructions({id})}
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
  const refState = dialog.querySelector('#spot-reference-status');
  const refLabel = dialog.querySelector('#spot-reference-label');
  const saveRef = dialog.querySelector('#spot-save-reference');
  const resetRef = dialog.querySelector('#spot-reset-reference');
  const restorePrompt = dialog.querySelector('#spot-main-prompt');
  let current, objectUrl, attachmentCreator, reviewedCreator, referenceRevision = 0;
  const draft=bindArticleDraft(dialog.querySelector('#spot-article-draft'),()=>{
    const id=parseNoteId(field.value);
    return {...current,id,title:quality.articleTitle,experience:!current.id || id===current.id ? current.experience : ''};
  });

  function savedReference() {
    return creatorReference(parseNoteId(field.value), current?.id, current?.avatarSource);
  }
  function reference() {
    return objectUrl ? { referenceMode: 'attachment' } : savedReference();
  }
  function clearAttachment() {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = '';
    attachmentCreator = null;
    fileField.value = '';
  }
  function validCreator() {
    const invalid = Boolean(field.value.trim()) && !parseNoteId(field.value);
    field.setAttribute('aria-invalid', String(invalid));
    if (invalid) {
      message.textContent = 'noteのIDまたはプロフィールのURLを確認してください。';
      field.focus();
    }
    return !invalid;
  }
  async function copyPrompt(success) {
    try {
      await navigator.clipboard.writeText(text.value);
      message.textContent = success;
    } catch {
      dialog.querySelector('.spot-preview').open = true;
      text.focus();
      text.select();
      message.textContent = '選択したプロンプトをコピーしてください。';
    }
  }
  function render() {
    const id = parseNoteId(field.value);
    field.setAttribute('aria-invalid', String(Boolean(field.value.trim()) && !id));
    const ref = reference();
    const saved = ref.referenceMode !== 'attachment';
    text.value = makeSpotPrompt({ ...current, id, experience:(!current.id || id===current.id) ? current.experience : '', ...ref });
    copy.textContent = 'イラスト作成プロンプトをコピー';
    restorePrompt.hidden = true;
    if (saved) {
      const where = ref.referenceMode === 'registered' ? '画像URLもプロンプトに入ります。' : '同じChatGPTチャットで参照済みなら、添付は不要です。';
      refState.textContent = '@' + id + ' の登録画像を使います。' + where + ' ChatGPTで絵が見られないときは保存して添付してください。';
    } else {
      refState.textContent = objectUrl ? '今回選んだキャラ画像を、ChatGPTにも添付してください。' :
        '使うキャラ画像をChatGPTに添付してください。同じチャットにある本人の絵も使えます。';
    }
    refLabel.textContent = saved ? '別のイラストに変更する場合だけ画像を添付（任意）' : 'キャラクターの参照画像';
    saveRef.hidden = !saved;
    resetRef.hidden = !objectUrl;
    resetRef.textContent = savedReference().referenceMode === 'attachment' ? '選んだ画像を外す' : '登録済み画像に戻す';
    const source = objectUrl || (saved ? current.avatarSource : '');
    if (source) preview.src = source;
    else preview.removeAttribute('src');
    preview.hidden = !source;
  }
  function copyArtifact(kind, articleTitle, reason) {
    if (!validCreator()) return;
    text.value = makeArtifactPrompt({ kind, title: articleTitle, reason, id: parseNoteId(field.value),
      scene: current.scene, href: current.href, reference: reference(), backgroundUrl: current.backgroundUrl,
      experience:!current.id || parseNoteId(field.value)===current.id ? current.experience : null, draft:kind==='article' ? draft.text : undefined });
    restorePrompt.hidden = false;
    copy.textContent = kind === 'article' ? '記事用プロンプトをコピー' : '選んだ作品の修正プロンプトをコピー';
    return copyPrompt(kind === 'article' ? '記事用プロンプトをコピーしました。イラストを作った同じチャットに貼り付けてください。' :
      '選んだ作品だけの修正プロンプトをコピーしました。');
  }
  const quality = bindQualityAssist(dialog.querySelector('#spot-quality'), {
    mode: 'spot',
    getContext: () => ({ urls: [hostNoteUrl, current?.href, towerUrl + '#prompt-play', insightUrl].filter(Boolean),
      creator: parseNoteId(field.value), scene: current?.scene, backgroundUrl: current?.backgroundUrl,
      referenceKey: objectUrl || referenceRevision, occupied: current?.occupied === true && parseNoteId(field.value) === current.id }),
    repair: copyArtifact,
  });
  bindCardButtons(dialog.querySelector('#spot-card-actions'), [['企画主', hostNoteUrl], ['この場所', () => current?.href], ['部屋づくり', towerUrl + '#prompt-play'], ['INSIGHT', insightUrl]], message);
  field.addEventListener('input', () => {
    if (attachmentCreator && parseNoteId(field.value) !== attachmentCreator) clearAttachment();
    render();
    quality.refresh();
    draft.refresh();
    message.textContent = '';
  });
  fileField.addEventListener('change', () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    const file = fileField.files[0];
    objectUrl = file ? URL.createObjectURL(file) : '';
    attachmentCreator = file ? parseNoteId(field.value) : null;
    render();
    quality.refresh();
    message.textContent = '';
  });
  field.addEventListener('change', () => {
    const id = parseNoteId(field.value);
    if (!id) return;
    if (reviewedCreator && reviewedCreator !== id) quality.reset();
    reviewedCreator = id;
    if (objectUrl && !attachmentCreator) attachmentCreator = id;
    quality.refresh();
  });
  resetRef.addEventListener('click', () => {
    clearAttachment();
    render();
    quality.refresh();
    message.textContent = '';
  });
  saveRef.addEventListener('click', async () => {
    if (reference().referenceMode === 'attachment') return;
    const source = current.avatarSource, creator = current.id;
    try {
      if (reference().referenceMode === 'local') {
        const download = document.createElement('a');
        download.href = source;
        download.download = creator + '-avatar.' + (source.match(/^data:image\/([a-z]+)/i)?.[1]?.replace('jpeg', 'jpg') || 'png');
        download.click();
        message.textContent = '保存した画像をChatGPTに添付できます。';
        return;
      }
      const response = await fetch(source);
      if (!response.ok) throw Error();
      const blob = await response.blob();
      if (!blob.type.startsWith('image/')) throw Error();
      if (current.avatarSource !== source || parseNoteId(field.value) !== creator) return;
      const url = URL.createObjectURL(blob);
      const download = document.createElement('a');
      download.href = url;
      download.download = creator + '-avatar.' + blob.type.split('/')[1].replace('jpeg', 'jpg');
      download.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      message.textContent = '参照画像を保存しました。必要な場合だけChatGPTに添付してください。';
    } catch {
      if (current.avatarSource !== source || parseNoteId(field.value) !== creator) return;
      const original = document.createElement('a');
      original.href = source;
      original.textContent = '登録画像を開く';
      original.target = '_blank';
      original.rel = 'noopener noreferrer';
      message.replaceChildren('画像を別画面で開き、長押しまたは右クリックで保存できます。 ', original);
    }
  });
  dialog.querySelector('#spot-article').addEventListener('click', () => copyArtifact('article', quality.articleTitle));
  preview.addEventListener('error', () => {
    preview.hidden = true;
    message.textContent = '画像を開けませんでした。元のキャラ画像を選び直してください。';
  });
  restorePrompt.addEventListener('click', () => { render(); message.textContent = ''; });
  copy.addEventListener('click', () => {
    if (validCreator()) void copyPrompt(restorePrompt.hidden ?
      'イラスト用プロンプトをコピーしました。画像ができたら同じチャットで「記事にする」と送れます。' :
      '表示中のプロンプトをコピーしました。同じChatGPTチャットで使ってください。');
  });
  window.addEventListener('pagehide', ({ persisted }) => {
    if (objectUrl && !persisted) URL.revokeObjectURL(objectUrl);
  });
  return spot => {
    const changedCreator = current?.id !== spot.id;
    if (!current || changedCreator || current.avatarSource !== spot.avatarSource) referenceRevision++;
    if (!current || changedCreator || current.href !== spot.href) {
      clearAttachment();
      quality.reset();
    }
    if (!current || changedCreator) {
      field.value = spot.id || '';
      reviewedCreator = parseNoteId(field.value);
    }
    current = spot;
    dialog.querySelector('#spot-article-draft').open=false;
    title.textContent = `${spot.label}でイラストをつくる`;
    summary.textContent = spot.scene;
    message.textContent = '';
    render();
    quality.refresh();
    dialog.showModal();
    if(spot.article)draft.reveal();
    else copy.focus();
  };
}
