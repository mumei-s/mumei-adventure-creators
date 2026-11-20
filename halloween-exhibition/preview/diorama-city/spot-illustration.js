import { chatgptAppLink, hostNoteUrl, parseNoteId, towerUrl, insightUrl, articleCardBlock, drawFirst, bindArticleDraft, articleCoverInstructions, articleVoiceInstructions, bindCardButtons, makeArtifactPrompt, characterReferenceInstructions, spotSubjectInstructions, settingInstructions, checkArtwork, articleCardEntries } from '../../../tower/prompt-play.js?v=20261119-handoff';
import { bindQualityAssist, articleImageMarkers } from '../../../tower/quality-assist.js?v=20261119-scene';
import { bindSpotReferences } from './spot-references.js?v=20261119-handoff';
import { bindSpotHandoff } from './spot-handoff.js?v=20261120-art-choice';

export { characterReferenceInstructions as spotReferenceInstructions };

export function makeSpotPrompt({ label, scene, href, id, referenceMode, referenceUrl, selectedFile, item, backgroundUrl, experience, articleScene }) {
  const noPeople=referenceMode==='none';
  const room = new URL(towerUrl);
  if(id)room.searchParams.set('creator',id);
  room.hash='prompt-import';
  return `【#無名Sプロンプト｜${label}】
まず本文イラスト１を、画像生成機能で１枚描いてください。${drawFirst}
noteクリエイターID：${id?'@'+id:'［自分のID］'}
${spotSubjectInstructions({referenceMode,referenceUrl,selectedFile},item)}
${checkArtwork}

場面：${noPeople ? articleScene||label : scene}
${experience?'ゲームで実際に行ったこと：'+experience+'\n':''}${settingInstructions(backgroundUrl)}
本文イラストは横３対２、別々の完成画像２枚。${noPeople?'１枚目は場所と物の全景。２枚目は別の角度から光と素材の細部を描く。':'１枚目は場所の特徴、全身、足元の接地が分かる引き。２枚目は続く行動に寄り、別の角度から視線と手が物に触れる位置を描く。'}影・遠近・縮尺を合わせ、文字・UI・コラージュは入れません。
${articleCoverInstructions(noPeople)}
【画像の抜け・取り違えチェック】
画像生成は本文イラスト１ → 本文イラスト２ → 専用サムネイルの順。本文２枚がそろってから記事の題を決めて表紙を作る。３点は合成やコラージュにせず、それぞれ別の完成画像としてこのチャットに表示する。
本文２枚は今回の場所が分かる特徴と、それぞれの構図・場面の違いを確認する。写真資料・参照画像・説明文・「ここに画像」などの目印は完成画像として数えない。既にチャットに届いた人物・小物の参照資料は再添付を求めない。背景資料のURLが開けないだけなら、上の場面説明で描く。
画像が表示されなかった、生成できなかった、または別の場所の絵になった場合は、その画像名だけを未完了と伝える。「続き」「不足分を作って」と言われたら、同じ場所と参照を引き継ぎ、未完了の画像だけを作る。すでに完成した画像は再生成しない。画像生成が使えない場合は短く伝え、完成したと書かない。
画像３点が表示できたら「今回のイラストをnoteの記事にしますか？『記事にする』と送ってください。」と案内。利用者が先に「記事にする」と言った場合は、不足画像を待たず次の指示で本文だけ書く。サイトの記事作成ボタンからも続けられます。

「記事にする」なら、追加の画像や検索を待たず、タイトルと完成本文を渡す。題名の指定を優先し、今回の表紙と合わせる。実際の行動と創作の設定を区別し、${articleImageMarkers('spot').join('と')}を各段落のあとの独立した行に１回ずつ置く。${articleVoiceInstructions(id)}
記事末で無名S noteの企画を紹介し、各URLはカード用に単独行へ。
${articleCardBlock(articleCardEntries('spot',href))}

末尾は #無名Sプロンプト。本文の外で、noteにURLを１つずつ貼り改行することと、部屋・アバターを保存してTowerで下見・入居できることを案内。戻り先：${room.href}`;

}

export function bindSpotIllustration(dialog) {
  const title = dialog.querySelector('#spot-title');
  const summary = dialog.querySelector('#spot-scene');
  const field = dialog.querySelector('#spot-id');
  const text = dialog.querySelector('#spot-text');
  const message = dialog.querySelector('#spot-message');
  const copy = dialog.querySelector('#spot-copy');
  const output = dialog.querySelector('#spot-output');
  const articlePanel = dialog.querySelector('#spot-article-draft');
  const articleMessage = dialog.querySelector('#spot-article-message');
  const articlePreview = dialog.querySelector('#spot-article-preview');
  const articleText = dialog.querySelector('#spot-article-text');
  const app = dialog.querySelector('#spot-app');
  const link = chatgptAppLink(navigator);
  app.href = link.href;
  app.textContent = link.label;
  if (link.newTab) {
    app.target = '_blank';
    app.rel = 'noopener';
  }
  const restorePrompt = dialog.querySelector('#spot-main-prompt');
  let current, reviewedCreator, idEdited=false;
  const refs=bindSpotReferences(dialog,()=>({spot:current,id:parseNoteId(field.value)}),()=>{render();quality.refresh();});
  const handoff=bindSpotHandoff(dialog,refs.files,success=>{if(validCreator())return copyText(success);});
  const draft=bindArticleDraft(articlePanel,()=>{
    const id=parseNoteId(field.value);
    return {...current,id,title:quality.articleTitle,occupied:Boolean(id && current.id===id && current.occupied),
      experience:!current.id || id===current.id ? current.experience : ''};
  });

  function validCreator(status=message) {
    const invalid = Boolean(field.value.trim()) && !parseNoteId(field.value);
    field.setAttribute('aria-invalid', String(invalid));
    if (invalid) {
      status.textContent = 'noteのIDまたはプロフィールのURLを確認してください。';
      field.focus();
    }
    return !invalid;
  }
  async function copyText(success) {
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
  async function copyArticleText(prompt) {
    articlePanel.open = true;
    articleText.value = prompt;
    articlePreview.hidden = true;
    try {
      await navigator.clipboard.writeText(prompt);
      articleMessage.textContent = '記事本文だけの指示をコピーしました。ChatGPTに貼り付けると、画像を作らず本文を書きます。';
    } catch {
      articlePreview.hidden = false;
      articleText.focus();
      articleText.select();
      articleMessage.textContent = '選択した記事本文だけの指示をコピーしてください。';
    }
  }
  function transfer(success) {
    if(refs.files().length) return handoff.send();
    return copyText(success);
  }
  function imageCopyLabel(handoffLabel,repair=false) {
    return handoffLabel ? '画像を作る：'+handoffLabel : repair ? '選んだ画像の修正指示をコピー' : '画像を作る指示をコピー';
  }
  function render() {
    const id = parseNoteId(field.value);
    field.setAttribute('aria-invalid', String(Boolean(field.value.trim()) && !id));
    const {reference:ref,item,issue}=refs.paint();
    const experience=!current.id || id===current.id ? current.experience : '';
    const params={...current,id,experience,item,scene:ref.referenceMode==='none' ? current.articleScene||current.label : current.scene,occupied:Boolean(id && id===current.id && current.occupied)};
    text.value = output.value==='set' ? makeSpotPrompt({...params,...ref}) :
      makeArtifactPrompt({...params,kind:output.value,reference:ref,title:quality.articleTitle});
    copy.textContent = imageCopyLabel(handoff.paint(true,issue));
    copy.disabled = Boolean(issue);
    restorePrompt.hidden = true;
  }
  function copyArtifact(kind, articleTitle, reason, reviewedDraft) {
    const articleOnly=kind==='article';
    if (articleOnly) articlePanel.open=true;
    if (!validCreator(articleOnly ? articleMessage : message)) return;
    const {reference,item,issue}=refs.selection();
    if (kind !== 'article' && issue) { message.textContent=issue;return; }
    const id = parseNoteId(field.value);
    const prompt = makeArtifactPrompt({ kind, title: articleTitle, reason, id,
      label:current.label, articleScene:current.articleScene, scene:reference.referenceMode==='none' ? current.articleScene||current.label : current.scene, href:current.href,
      reference,item, backgroundUrl:current.backgroundUrl, occupied:Boolean(id && id===current.id && current.occupied),
      experience:!current.id || id===current.id ? current.experience : null, draft:articleOnly ? reviewedDraft ?? draft.text : undefined });
    // Article-only is a separate destination. Never replace the selected image prompt or its reference handoff.
    if(articleOnly)return copyArticleText(prompt);
    text.value = prompt;
    copy.disabled = false;
    restorePrompt.hidden = false;
    copy.textContent = imageCopyLabel(handoff.paint(true,issue),true);
    return transfer('選んだ作品だけの修正プロンプトをコピーしました。');
  }
  const quality = bindQualityAssist(dialog.querySelector('#spot-quality'), {
    mode: 'spot',
    getContext: () => ({ urls: articleCardEntries('spot',current?.href).map(([,url])=>url),
      creator: parseNoteId(field.value), scene: current?.scene, backgroundUrl: current?.backgroundUrl,
      referenceKey: refs.selection().key, occupied: current?.occupied === true && parseNoteId(field.value) === current.id }),
    repair: copyArtifact,
  });
  bindCardButtons(dialog.querySelector('#spot-card-actions'), [['企画主', hostNoteUrl], ['この場所', () => current?.href], ['部屋づくり', towerUrl + '#prompt-play'], ['INSIGHT', insightUrl]], message);
  field.addEventListener('input', () => {
    idEdited=true;refs.changeCreator(parseNoteId(field.value));
    render();
    quality.refresh();
    draft.refresh();
    message.textContent = '';
    articleMessage.textContent = '';
    articlePreview.hidden = true;
  });
  field.addEventListener('change', () => {
    const id = parseNoteId(field.value);
    if (!id) return;
    if (reviewedCreator && reviewedCreator !== id) quality.reset();
    reviewedCreator = id;
    refs.commitCreator(id);
    quality.refresh();
  });
  dialog.querySelector('#spot-article').addEventListener('click', () => copyArtifact('article', quality.articleTitle));
  output.addEventListener('change',()=>{render();message.textContent='';});
  restorePrompt.addEventListener('click', () => { output.value='set';render(); message.textContent = ''; });
  copy.addEventListener('click', () => {
    if (validCreator()) void transfer(restorePrompt.hidden ?
      'イラスト用プロンプトをコピーしました。画像ができたら同じチャットで「記事にする」と送れます。' :
      '表示中のプロンプトをコピーしました。同じChatGPTチャットで使ってください。');
  });
  function open(spot) {
    const changedCreator = current?.id !== spot.id;
    if (!current || changedCreator || current.href !== spot.href) {
      refs.reset();
      quality.reset();
    }
    if (!current || changedCreator) {
      idEdited=false;field.value = spot.id || '';
      reviewedCreator = parseNoteId(field.value);
    }
    current = spot;
    articlePanel.open=false;
    articleMessage.textContent='';
    articleText.value='';
    articlePreview.hidden=true;
    title.textContent = `${spot.label}でイラストをつくる`;
    summary.textContent = spot.scene;
    message.textContent = '';
    render();
    quality.refresh();
    dialog.showModal();
    if(spot.article)draft.reveal();
    else copy.focus();
  }
  open.updateActor=actor=>{
    if(!dialog.open || !current || !actor?.id)return;
    if(!idEdited)field.value=actor.noteId;
    current={...current,id:actor.noteId,occupied:true,vehicles:actor.vehicles,
      avatarSource:actor.custom||actor.profile||actor.host ? actor.source : null};
    render();quality.refresh();draft.refresh();
  };
  return open;
}
