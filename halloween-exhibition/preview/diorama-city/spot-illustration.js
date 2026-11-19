import { chatgptAppLink, hostNoteUrl, parseNoteId, towerUrl, insightUrl, articleCardBlock, drawFirst, bindArticleDraft, articleCoverInstructions, articleVoiceInstructions, bindCardButtons, makeArtifactPrompt, creatorReference, characterReferenceInstructions, characterArtInstructions, settingInstructions, checkArtwork, articleCardEntries } from '../../../tower/prompt-play.js?v=20261119-review';
import { bindQualityAssist, inspectImage, artworkMime, articleImageMarkers } from '../../../tower/quality-assist.js?v=20261119-review';
import { pendingMediaUrl } from '../../../tower/public-directory.js?v=20261119-review';

export { characterReferenceInstructions as spotReferenceInstructions };

export function makeSpotPrompt({ label, scene, href, id, guest, referenceMode, referenceUrl, backgroundUrl, experience }) {
  const room = new URL(towerUrl);
  if(id)room.searchParams.set('creator',id);
  room.hash='prompt-import';
  return `【#無名Sプロンプト｜${label}】
まず本文イラスト１を描いてください。${drawFirst}
noteクリエイターID：${id?'@'+id:'［自分のID］'}
${characterReferenceInstructions({referenceMode,referenceUrl,guest})}
${characterArtInstructions}
${checkArtwork}

場面：${scene}
${experience?'ゲームで実際に行ったこと：'+experience+'\n':''}${settingInstructions(backgroundUrl)}
本文イラストは横３対２、別々の完成画像２枚。１枚目は場所の特徴、全身、足元の接地が分かる引き。２枚目は続く行動に寄り、別の角度から視線と手が物に触れる位置を描く。影・遠近・縮尺を合わせ、文字・UI・コラージュは入れません。
${articleCoverInstructions()}
本文２枚のあとで記事の題を決めて表紙を制作。画像ができたら「今回のイラストをnoteの記事にしますか？『記事にする』と送ってください。」と案内。画像のみで終了したら、サイトの記事作成ボタンからも続けられます。

「記事にする」なら、追加の画像や検索を待たず、タイトルと完成本文を渡す。題名の指定を優先し、今回の表紙と合わせる。実際の行動と創作の設定を区別し、${articleImageMarkers('spot').join('と')}を各段落のあとの独立した行に１回ずつ置く。${articleVoiceInstructions(id)}
記事末で無名S noteの企画を紹介し、各URLはカード用に単独行へ。
${articleCardBlock(articleCardEntries('spot',href))}

末尾は #無名Sプロンプト。本文の外で、noteにURLを１つずつ貼り改行することと、部屋・アバターを保存してTowerで下見・入居できることを案内。戻り先：${room.href}`;

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
  const output = dialog.querySelector('#spot-output');
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
  let referenceIssue = '';
  const draft=bindArticleDraft(dialog.querySelector('#spot-article-draft'),()=>{
    const id=parseNoteId(field.value);
    return {...current,id,title:quality.articleTitle,occupied:Boolean(id && current.id===id && current.occupied),
      experience:!current.id || id===current.id ? current.experience : ''};
  });

  function savedReference() {
    if (current?.guest && current.avatarSource) return {referenceMode:'guest',referenceUrl:current.avatarSource,guest:current.guest};
    return creatorReference(parseNoteId(field.value), current?.id, current?.avatarSource);
  }
  function reference() {
    return objectUrl ? { referenceMode: 'attachment' } : savedReference();
  }
  function clearAttachment() {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = '';
    attachmentCreator = null;
    referenceIssue = '';
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
    const experience=!current.id || id===current.id ? current.experience : '';
    const params={...current,id,experience,occupied:Boolean(id && id===current.id && current.occupied)};
    text.value = output.value==='set' ? makeSpotPrompt({...params,...ref}) :
      makeArtifactPrompt({...params,kind:output.value,reference:ref,title:quality.articleTitle});
    copy.textContent = output.value==='set' ? 'イラスト作成プロンプトをコピー' : output.selectedOptions[0].textContent+'のプロンプトをコピー';
    copy.disabled = Boolean(referenceIssue);
    restorePrompt.hidden = true;
    if (saved) {
      const where = ref.referenceMode === 'registered' ? '画像URLもプロンプトに入ります。' : '同じChatGPTチャットで参照済みなら、添付は不要です。';
      refState.textContent = ref.referenceMode === 'guest' ? '@'+current.guest+' のアバターで街歩き中です。記事は遊んだ方の名義で作ります。' :
        '@' + id + ' の登録画像を使います。' + where + ' ChatGPTで絵が見られないときは保存して添付してください。';
    } else {
      refState.textContent = objectUrl ? '今回選んだキャラ画像を、ChatGPTにも添付してください。' :
        '使うキャラ画像をChatGPTに添付してください。同じチャットにある本人の絵も使えます。';
    }
    refLabel.textContent = saved ? '別のイラストに変更する場合だけ画像を添付（任意）' : 'キャラクターの参照画像';
    saveRef.hidden = !saved;
    resetRef.hidden = !objectUrl;
    resetRef.textContent = savedReference().referenceMode === 'attachment' ? '選んだ画像を外す' : '登録済み画像に戻す';
    const source = objectUrl || (saved ? current.avatarSource : '');
    if (source && preview.getAttribute('src')!==source) preview.src=source;
    else if (!source) preview.removeAttribute('src');
    preview.hidden = !source;
  }
  function copyArtifact(kind, articleTitle, reason, reviewedDraft) {
    if (!validCreator()) return;
    if (kind !== 'article' && referenceIssue) { message.textContent = referenceIssue; return; }
    const id = parseNoteId(field.value);
    text.value = makeArtifactPrompt({ kind, title: articleTitle, reason, id: parseNoteId(field.value),
      label:current.label, articleScene:current.articleScene, scene:current.scene, href:current.href, guest:current.guest,
      reference:reference(), backgroundUrl:current.backgroundUrl, occupied:Boolean(id && id===current.id && current.occupied),
      experience:!current.id || id===current.id ? current.experience : null, draft:kind==='article' ? reviewedDraft ?? draft.text : undefined });
    copy.disabled = false;
    restorePrompt.hidden = false;
    copy.textContent = kind === 'article' ? '記事用プロンプトをコピー' : '選んだ作品の修正プロンプトをコピー';
    return copyPrompt(kind === 'article' ? '記事用プロンプトをコピーしました。イラストを作った同じチャットに貼り付けてください。' :
      '選んだ作品だけの修正プロンプトをコピーしました。');
  }
  const quality = bindQualityAssist(dialog.querySelector('#spot-quality'), {
    mode: 'spot',
    getContext: () => ({ urls: articleCardEntries('spot',current?.href).map(([,url])=>url),
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
  fileField.addEventListener('change', async () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    const file = fileField.files[0];
    objectUrl = file ? URL.createObjectURL(file) : '';
    const selected = objectUrl;
    attachmentCreator = file ? parseNoteId(field.value) : null;
    referenceIssue = file ? '参照画像を検査しています。' : '';
    render();
    quality.refresh();
    message.textContent = referenceIssue;
    if (!file) return;
    try {
      const review = await inspectImage(file,'reference');
      if (objectUrl !== selected) return;
      referenceIssue = review.errors.join(' ');
    } catch (error) {
      if (objectUrl !== selected) return;
      referenceIssue = error.message;
    }
    render();
    message.textContent = referenceIssue || '参照画像の表示を確認しました。ChatGPTにもこの画像を添えてください。';
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
    const source = current.avatarSource, creator = current.guest || current.id;
    const stillSelected = () => current.avatarSource === source && (current.guest || parseNoteId(field.value)) === creator && !objectUrl;
    try {
      if (reference().referenceMode === 'local') {
        const download = document.createElement('a');
        download.href = source;
        download.download = creator + '-avatar.' + (source.match(/^data:image\/([a-z]+)/i)?.[1]?.replace('jpeg', 'jpg') || 'png');
        download.click();
        message.textContent = '保存した画像をChatGPTに添付できます。';
        return;
      }
      let response = await fetch(source);
      const pending = pendingMediaUrl(source);
      if (response.status === 404 && pending) response = await fetch(pending);
      if (!response.ok) throw Error();
      const bytes = await response.blob();
      const mime = artworkMime(new Uint8Array(await bytes.slice(0,12).arrayBuffer()));
      if (!mime) throw Error();
      const blob = bytes.slice(0,bytes.size,mime);
      if (!stillSelected()) return;
      const url = URL.createObjectURL(blob);
      const download = document.createElement('a');
      download.href = url;
      download.download = creator + '-avatar.' + blob.type.split('/')[1].replace('jpeg', 'jpg');
      download.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      message.textContent = '参照画像を保存しました。必要な場合だけChatGPTに添付してください。';
    } catch {
      if (!stillSelected()) return;
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
  output.addEventListener('change',()=>{render();message.textContent='';});
  restorePrompt.addEventListener('click', () => { output.value='set';render(); message.textContent = ''; });
  copy.addEventListener('click', () => {
    if (validCreator()) void copyPrompt(restorePrompt.hidden ?
      'イラスト用プロンプトをコピーしました。画像ができたら同じチャットで「記事にする」と送れます。' :
      '表示中のプロンプトをコピーしました。同じChatGPTチャットで使ってください。');
  });
  window.addEventListener('pagehide', ({ persisted }) => {
    if (objectUrl && !persisted) URL.revokeObjectURL(objectUrl);
  });
  return spot => {
    const changedCreator = current?.id !== spot.id || current?.guest !== spot.guest;
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
