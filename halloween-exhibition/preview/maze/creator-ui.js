import {CREATOR_FICTION_NOTICE,creatorAvailable} from './creator-runtime.js?v=20261016-resident1';
const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;};
export function renderCreatorConversation(container,npc,{onDirectory,onGuide}={}){
  const card=el('section',undefined,'creator-conversation');
  card.append(el('p',npc.name,'creator-author'),el('h3',npc.label),el('p',npc.greeting,'creator-dialogue'),el('p',CREATOR_FICTION_NOTICE,'creator-fiction'));
  const article=el('a','作者の参加記事を読む ↗','primary');article.href=npc.articleURL;article.target='_blank';article.rel='noopener noreferrer';card.append(article);
  const actions=el('div',undefined,'tabs');if(onGuide){const b=el('button','近くへ案内');b.onclick=()=>onGuide(npc);actions.append(b);}if(onDirectory){const b=el('button','仲間の一覧へ');b.onclick=onDirectory;actions.append(b);}card.append(actions);container.append(card);
}
export function renderCreatorDirectory(container,{roster,state,status,onTalk,onGuide,onRetry}={}){
  const groups=new Map();for(const npc of roster.npcs.filter(npc=>npc.interactive!==false)){if(!groups.has(npc.creatorId))groups.set(npc.creatorId,[]);groups.get(npc.creatorId).push(npc);}
  container.append(el('p',`宮殿に集まった仲間 ${groups.size}組。名前を選ぶと、短い会話や元の記事を読めます。無名S noteは、あなたが動かす主人公です。`),el('p',CREATOR_FICTION_NOTICE,'creator-fiction'));
  const list=el('div',undefined,'creator-npc-roster');for(const members of groups.values()){
    const card=el('section',undefined,'creator-npc-card');card.append(el('h3',members[0].name));for(const npc of members){const talk=el('button',npc.label+'と話す');talk.onclick=()=>onTalk(npc.id);card.append(talk);}
    const npc=members[0],guide=el('button',creatorAvailable(npc,state)?'近くへ案内':'入口へ案内');guide.onclick=()=>onGuide(npc);card.append(guide);list.append(card);
  }container.append(list);
  if(status.failed){const p=el('p','一部の仲間の画像を読み込めませんでした。記事と会話はここから使えます。');const retry=el('button','仲間の画像を再読み込み');retry.onclick=onRetry;container.append(p,retry);}
  if(!groups.size)container.append(el('p','仲間のゲーム画像を準備中です。参加記事は「記事一覧」で読めます。'));
}
