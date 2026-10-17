import {buildCardPrompt} from './clear-reward.js?v=20261015-clear1';
import {MONSTERS} from './encounter-model.js?v=20261016-living1';
import {STORY,encounterStory} from './story-model.js?v=20261016-living1';
import {ART_FILES} from './rpg-art.js?v=20261017-rig2';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
export function renderEnding({container,receipt,onNewRun,onBack,motion=true}){
  const scene=el('section',undefined,'clear-celebration');scene.dataset.motion=String(motion);
  const backdrop=el('img',undefined,'clear-backdrop');backdrop.src='./assets/rpg/battle-library.webp';backdrop.alt='';scene.append(backdrop);
  const light=el('div',undefined,'clear-dawn');light.setAttribute('aria-hidden','true');scene.append(light);
  const heading=el('div',undefined,'clear-story');heading.append(el('p','HALLOWEEN ATELIER','eyebrow'),el('h3','夜明けの書庫が、ひらいた。'),el('p',STORY.ending),el('p',STORY.endingDialogue));
  scene.append(heading);
  const friends=el('div',undefined,'clear-friends');
  MONSTERS.forEach((m,i)=>{const img=el('img');img.src=`./assets/rpg/${ART_FILES[m.id]}`;img.alt=m.name;img.style.setProperty('--order',i);friends.append(img);});scene.append(friends);
  scene.append(el('p','物語はここでひと区切り。次の冒険も、魔法の入口から。','clear-last-line'));container.append(scene);
  const memories=el('section',undefined,'clear-memories');memories.setAttribute('aria-label','取り戻した六つの記憶');
  for(const m of MONSTERS){const story=encounterStory(m.id),card=el('article',undefined,'clear-memory');card.append(el('strong',`${m.icon} ${story.keepsake}`),el('p',story.memory));memories.append(card);}
  container.append(memories,el('p',STORY.fictionLabel,'story-fiction'));
  const badge=el('p',`このブラウザでのクリア No.${receipt.serial}`,'clear-number');container.append(badge);
  if(!receipt.persistent)container.append(el('p','保存できないため、この番号は今の画面を閉じるまでの記録です。','clear-storage-warning'));
  container.append(el('p','記念カードを作りたい方だけ、プロンプトを使えます。','clear-optional'));
  const show=el('button','クリア記念カードのプロンプト','primary');show.type='button';show.setAttribute('aria-expanded','false');
  const box=el('section',undefined,'clear-prompt-box');box.hidden=true;
  const idLabel=el('label','noteクリエイターID（画像には表示しません）');idLabel.htmlFor='clear-creator-id';const idInput=el('input');idInput.id='clear-creator-id';idInput.type='text';idInput.maxLength=50;idInput.placeholder='例：ss_yr';idInput.autocomplete='off';
  const label=el('label','画像作成用プロンプト');label.htmlFor='clear-prompt-text';const field=el('textarea');field.id='clear-prompt-text';field.value=receipt.prompt;field.readOnly=true;field.rows=8;
  const status=el('p','');status.setAttribute('role','status');
  idInput.addEventListener('input',()=>{try{field.value=buildCardPrompt(receipt.serial,idInput.value);copy.disabled=false;download.disabled=false;status.textContent='';}catch(error){field.value='';copy.disabled=true;download.disabled=true;status.textContent=error.message;}});
  const copy=el('button','コピー');copy.type='button';copy.onclick=async()=>{try{await navigator.clipboard.writeText(field.value);status.textContent='コピーしました。画像作成チャットに貼り付けて使えます。';}catch{field.focus();field.select();status.textContent='コピーできないため、選択した文章をコピーしてください。';}};
  const download=el('button','TXTで保存');download.type='button';download.onclick=()=>{const url=URL.createObjectURL(new Blob([field.value],{type:'text/plain;charset=utf-8'}));const a=el('a');a.href=url;a.download=receipt.filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);};
  const actions=el('div',undefined,'tabs');actions.append(copy,download);box.append(idLabel,idInput,el('p','ID入りのプロンプトと好きなイラストを、画像作成チャットに添付してください。'),label,field,actions,status);show.onclick=()=>{box.hidden=!box.hidden;show.setAttribute('aria-expanded',String(!box.hidden));if(!box.hidden)field.focus();};container.append(show,box);
  const nav=el('div',undefined,'tabs clear-navigation');const back=el('button','書庫の探索に戻る');back.onclick=onBack;
  const restart=el('button','新しい冒険を始める');const confirmation=el('div',undefined,'clear-restart-confirm');confirmation.hidden=true;
  confirmation.append(el('p','鍵と6体の対戦記録をリセットして、入口から始めます。クリア番号の累計は残ります。'));
  const yes=el('button','リセットして始める');yes.onclick=onNewRun;const no=el('button','やめる');no.onclick=()=>{confirmation.hidden=true;restart.focus();};confirmation.append(yes,no);restart.onclick=()=>{confirmation.hidden=false;yes.focus();};
  const castle=el('a','お城へ戻る');castle.href='../?return=palace';const gallery=el('a','クリア名鑑');gallery.href='./clear-gallery/';nav.append(back,restart,gallery,castle);container.append(nav,confirmation);
}
