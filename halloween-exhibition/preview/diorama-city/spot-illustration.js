import { chatgptAppLink, hostNoteUrl, parseNoteId, towerUrl, insightUrl, articleCardBlock, articleCoverInstructions, articleVoiceInstructions, cardPasteInstructions, bindCardButtons, makeArtifactPrompt } from '../../../tower/prompt-play.js?v=202611180955';
import { bindQualityAssist } from '../../../tower/quality-assist.js?v=202611180955';

export function spotReferenceInstructions({ referenceMode, referenceUrl } = {}) {
  if (referenceMode === 'registered' && referenceUrl) return '登録済みアバター画像URL：'+referenceUrl+'\n新規添付は原則不要です。このURLの画像を実際に閲覧できる場合のみ同じキャラクターを使用してください。URLを開けない、または画像を確認できない場合だけ、元のキャラ画像１枚の添付を依頼してください。IDは再質問しないでください。';
  if (referenceMode === 'local') return '登録済みアバター（端末内）：同じChatGPTチャットで既に参照した本人のキャラクター画像があれば再添付不要です。別チャットなど画像が確認できない場合だけ、サイトの参照画像保存ボタンから画像を取得して添付してください。';
  return 'キャラクターを変更する場合、今回添付する新しい画像を最優先してください。以前の画像より今回の添付を優先し、画像がない場合だけ添付を依頼してください。';
}

export function makeSpotPrompt({ label, scene, href, id, referenceMode, referenceUrl }) {
  const profile = id ? `公開プロフィール： https://note.com/${id}\n` : '';
  const room = new URL(towerUrl);
  if (id) room.searchParams.set('creator', id);
  room.hash = 'prompt-import';
  return `【#無名Sプロンプト｜${label}で過ごす一日】

noteクリエイターID：${id ? '@' + id : '［自分のID］'}
${profile}${spotReferenceInstructions({referenceMode,referenceUrl})}

【描く場面】
${scene}

確認できた登録済みまたは今回添付したキャラクターを主人公に、この場所で過ごす２つの異なる瞬間を、画像生成機能で横3対2の別々の完成イラスト２枚として描き、このチャットに表示してください。１枚目は場所・空気感・人物の全体が伝わるシーン、２枚目はその後の別の行動や表情、別のカメラ角度のシーンです。同じ構図の色違い、コラージュ、分割画像は禁止。添付画像の顔立ち、髪型、服、アクセサリーと、写真調・アニメ調など元の画風を受け継いでください。歩行シートを添付した場合は同じキャラクター1人を描きます。街の遠近感と、人物・家具・遊具の大きさをそろえ、足や手が触れる位置に気を配ってください。画像には文字・枠・ゲームの操作ボタンを入れません。
公開プロフィールを読める場合は、公開作品のモチーフを背景や小物に取り入れてください。読めなくても添付と場面指定で制作を続けてください。IDが記載されていれば再質問しないでください。キャラ画像は確認できない場合だけ聞いてください。

【そのまま貼れるnote参加記事】
記事のタイトルを先に決め、本文イラスト２枚と専用サムネイルを生成します。画像が出たら必ず次の質問をしてください：「今回のイラストをnoteの記事にしますか？『記事にする』と送ってください。」 画像だけで応答が終わる環境では、利用者がサイトの「note記事を作る」ボタンを使えるように案内してください。「記事にする」と返答されたら、２枚の絵に実際に描かれた行動と街の風景をもとに、参加者の視点でタイトルと本文を書いてください。既にある画像を再生成しないでください。本文の異なる位置に「［ここに街のイラスト１］」「［ここに街のイラスト２］」を入れます。未生成の画像は未完了と明記し、別々の２枚とサムネイルを生成し終えるまで完了としないでください。同じチャットですでにTower用のアバターと部屋の画像ができている場合は、「［ここにアバター画像］」「［ここに部屋画像］」も入れて、部屋から街へ出かけた1本の記事にまとめてください。
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
  const refState=dialog.querySelector('#spot-reference-status');
  const refLabel=dialog.querySelector('#spot-reference-label');
  const saveRef=dialog.querySelector('#spot-save-reference');
  const resetRef=dialog.querySelector('#spot-reset-reference');
  const articleButton=dialog.querySelector('#spot-article');
  const reference=()=> {
    if(fileField.files?.length) return {referenceMode:'attachment'};
    if(!current?.avatarSource || parseNoteId(field.value)!==current.id) return {referenceMode:'attachment'};
    return current.avatarSource.startsWith('https://') ? {referenceMode:'registered',referenceUrl:current.avatarSource} : {referenceMode:'local'};
  };
  const quality = bindQualityAssist(dialog.querySelector('#spot-quality'), {
    mode: 'spot',
    getContext: () => ({ urls: [hostNoteUrl, current?.href, towerUrl + '#prompt-play', insightUrl].filter(Boolean),
      creator: parseNoteId(field.value), scene: current?.scene, occupied: current?.occupied === true }),
    repair: async (kind, articleTitle, reason) => {
      targeted = true;
      text.value = makeArtifactPrompt({ kind, title: articleTitle, reason, id: parseNoteId(field.value),
        scene: current?.scene, href: current?.href }) + (kind==='article' ? '\n同じチャットで作った画像をもとに記事のみ作成する。画像を読めない場合のみ本文画像を添付してもらう。' : '\n'+spotReferenceInstructions(reference()));
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
    const ref=reference();
    text.value = makeSpotPrompt({ ...current, id, ...ref });
    const saved=ref.referenceMode!=='attachment';
    refState.textContent=saved ? '登録済み：@'+id+' のアバターを使用します。IDの再入力は不要です。'+(ref.referenceMode==='registered'?' 画像URLをプロンプトへ引き継ぎます。ChatGPTで画像を読めない場合だけ添付してください。':' 同じChatGPTチャットで参照済みなら添付不要。別チャットで画像が読めない場合は保存して添付してください。') : fileField.files?.length ? '今回添付したキャラクターを使用します。ChatGPTにも同じ画像を添付してください。' : '登録済みの参照画像がありません。note IDを入力し、ChatGPTへ自分のキャラ画像を添付してください。';
    refLabel.textContent=saved?'別のイラストに変更する場合だけ画像を添付（任意）':'キャラクターの参照画像';
    saveRef.hidden=!saved;
    resetRef.hidden=!fileField.files?.length;
    if(!objectUrl){ if(saved)preview.src=current.avatarSource;else preview.removeAttribute('src'); preview.hidden=!saved; }
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
    render(); quality.refresh();
  });
  resetRef.addEventListener('click',()=>{fileField.value='';fileField.dispatchEvent(new Event('change'));});
  saveRef.addEventListener('click',async()=>{
    if(reference().referenceMode==='attachment')return;
    try{
      const response=await fetch(current.avatarSource);if(!response.ok)throw Error('reference');
      const blob=await response.blob();if(!blob.type.startsWith('image/'))throw Error('reference');
      const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='atelier-avatar.'+(blob.type.split('/')[1]||'png').replace('jpeg','jpg');a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
      message.textContent='参照画像を保存しました。必要な場合だけChatGPTに添付してください。';
    }catch{message.textContent='画像を保存できませんでした。元の登録画像を添付してください。';}
  });
  articleButton.addEventListener('click',async()=>{
    targeted=true;
    text.value=makeArtifactPrompt({kind:'article',id:parseNoteId(field.value),scene:current?.scene,href:current?.href})+'\n同じチャットで完成した今回のイラストと専用サムネイルを使って、記事にしてください。画像は再生成しない。記事タイトルは既に生成したサムネイルの文字と一致させる。画像が見られない場合のみ本文画像の添付を依頼する。';
    try{await navigator.clipboard.writeText(text.value);message.textContent='記事用プロンプトをコピーしました。イラストを作った同じChatGPTチャットに貼り付けてください。';}
    catch{dialog.querySelector('.spot-preview').open=true;text.focus();text.select();message.textContent='記事用プロンプトを選択しました。コピーして同じチャットへ。';}
  });
  preview.addEventListener('error', () => {
    preview.hidden = true;
    message.textContent = '画像を開けませんでした。PNG・JPEG・WebP・GIFを選んでください。';
  });
  dialog.querySelector('#spot-main-prompt').addEventListener('click',render);
  copy.addEventListener('click', async () => {
    if (field.getAttribute('aria-invalid') === 'true') {
      message.textContent = 'noteのIDまたはプロフィールのURLを確認してください。';
      field.focus();
      return;
    }
    try {
      await navigator.clipboard.writeText(text.value);
      message.textContent = targeted ? '不足分だけのプロンプトをコピーしました。' :
        'コピーしました。'+(reference().referenceMode==='attachment'?'キャラ画像をChatGPTにも添付してください。':'同じキャラを利用します。')+' 画像ができたら「記事にする」または下の「note記事を作る」を使えます。';
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
    if(current?.href!==spot.href || current?.id!==spot.id){
      if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl='';fileField.value='';quality.reset();
    }
    current = spot;
    title.textContent = `${spot.label}でイラストをつくる`;
    summary.textContent = spot.scene;
    if (spot.id) field.value = spot.id;
    else if (!field.value) field.value = '';
    message.textContent = '';
    render();
    quality.refresh();
    dialog.showModal();
    copy.focus();
  };
}
