import { chatgptAppLink, hostNoteUrl, parseNoteId, towerUrl, insightUrl, articleCardBlock, drawFirst, bindArticleDraft, articleCoverInstructions, articleVoiceInstructions, bindCardButtons, makeArtifactPrompt, characterReferenceInstructions, spotSubjectInstructions, settingInstructions, checkArtwork, articleCardEntries } from '../../../tower/prompt-play.js?v=20261119-scene';
import { bindQualityAssist, articleImageMarkers } from '../../../tower/quality-assist.js?v=20261119-scene';
import { bindSpotReferences } from './spot-references.js?v=20261119-scene';

export { characterReferenceInstructions as spotReferenceInstructions };

export function makeSpotPrompt({ label, scene, href, id, referenceMode, referenceUrl, item, backgroundUrl, experience, articleScene }) {
  const noPeople=referenceMode==='none';
  const room = new URL(towerUrl);
  if(id)room.searchParams.set('creator',id);
  room.hash='prompt-import';
  return `【#無名Sプロンプト｜${label}】
まず本文イラスト１を描いてください。${drawFirst}
noteクリエイターID：${id?'@'+id:'［自分のID］'}
${spotSubjectInstructions({referenceMode,referenceUrl},item)}
${checkArtwork}

場面：${noPeople ? articleScene||label : scene}
${experience?'ゲームで実際に行ったこと：'+experience+'\n':''}${settingInstructions(backgroundUrl)}
本文イラストは横３対２、別々の完成画像２枚。${noPeople?'１枚目は場所と物の全景。２枚目は別の角度から光と素材の細部を描く。':'１枚目は場所の特徴、全身、足元の接地が分かる引き。２枚目は続く行動に寄り、別の角度から視線と手が物に触れる位置を描く。'}影・遠近・縮尺を合わせ、文字・UI・コラージュは入れません。
${articleCoverInstructions(noPeople)}
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
  const restorePrompt = dialog.querySelector('#spot-main-prompt');
  let current, reviewedCreator, idEdited=false;
  const refs=bindSpotReferences(dialog,()=>({spot:current,id:parseNoteId(field.value)}),()=>{render();quality.refresh();});
  const draft=bindArticleDraft(dialog.querySelector('#spot-article-draft'),()=>{
    const id=parseNoteId(field.value);
    return {...current,id,title:quality.articleTitle,occupied:Boolean(id && current.id===id && current.occupied),
      experience:!current.id || id===current.id ? current.experience : ''};
  });

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
    const {reference:ref,item,issue}=refs.paint();
    const experience=!current.id || id===current.id ? current.experience : '';
    const params={...current,id,experience,item,scene:ref.referenceMode==='none' ? current.articleScene||current.label : current.scene,occupied:Boolean(id && id===current.id && current.occupied)};
    text.value = output.value==='set' ? makeSpotPrompt({...params,...ref}) :
      makeArtifactPrompt({...params,kind:output.value,reference:ref,title:quality.articleTitle});
    copy.textContent = output.value==='set' ? 'イラスト作成プロンプトをコピー' : output.selectedOptions[0].textContent+'のプロンプトをコピー';
    copy.disabled = Boolean(issue);
    restorePrompt.hidden = true;
  }
  function copyArtifact(kind, articleTitle, reason, reviewedDraft) {
    if (!validCreator()) return;
    const {reference,item,issue}=refs.selection();
    if (kind !== 'article' && issue) { message.textContent=issue;return; }
    const id = parseNoteId(field.value);
    text.value = makeArtifactPrompt({ kind, title: articleTitle, reason, id: parseNoteId(field.value),
      label:current.label, articleScene:current.articleScene, scene:reference.referenceMode==='none' ? current.articleScene||current.label : current.scene, href:current.href,
      reference,item, backgroundUrl:current.backgroundUrl, occupied:Boolean(id && id===current.id && current.occupied),
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
    if (validCreator()) void copyPrompt(restorePrompt.hidden ?
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
    dialog.querySelector('#spot-article-draft').open=false;
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
