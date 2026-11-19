// NPCs use public room settings and articles. Opening a conversation never contacts the real resident.
export function talkToResident(person,{parent=document.body,roomUrl,place='街'}={}){
  const name=person.design?.avatarName||person.avatarName||person.name||person.profile?.name||person.noteId;
  const room=person.design?.title||person.title||'アトリエ';
  const line=(tag,text,css='')=>{const el=document.createElement(tag);el.className=css;el.textContent=text;return el;};
  const dialog=line('dialog','','resident-talk');dialog.setAttribute('aria-label',name+'の住人会話');
  const head=line('header',''),title=line('h2',name+'と話す'),close=line('button','閉じる');close.type='button';
  close.addEventListener('click',()=>dialog.close());head.append(title,close);
  const reply=line('p','どのお話にしますか？');reply.setAttribute('role','status');
  const choices=line('div','','talk-choices'),links=line('div','','talk-links');
  const article=person.profile?.articles?.find(a=>a.url===person.design?.pin)||person.profile?.articles?.[0];
  const topics=[
    ['あいさつする',person.design?.welcome||('こんにちは。'+place+'でお会いできましたね。')],
    ['部屋の話をする','私の部屋は「'+room+'」。'+(person.slot?'号室は'+(Math.floor((person.slot-1)/12)+1)+String((person.slot-1)%12+1).padStart(2,'0')+'です。':'どうぞ、ゆっくりしていってください。')],
    ['作品の話をする',article?'本棚に「'+article.title+'」を置いています。':'公開している作品は、noteのページから読めます。'],
  ];
  for(const [index,[label,text]] of topics.entries()){
    const b=line('button',label);b.type='button';
    b.addEventListener('click',()=>{
      reply.textContent=text;links.replaceChildren();
      choices.querySelectorAll('button').forEach(btn=>btn.setAttribute('aria-pressed',String(btn===b)));
      if(index===2&&person.noteId){const link=line('a',article?'この作品を読む ↗':'noteの作品を見る ↗');link.href=article?.url||'https://note.com/'+encodeURIComponent(person.noteId);link.target='_blank';link.rel='noopener';links.append(link);}
      if(index===1&&roomUrl){const link=line('a','この住人の部屋へ');link.href=roomUrl;links.append(link);}
    });choices.append(b);
  }
  dialog.append(head,line('small','住人NPCとの会話'),reply,choices,links);
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});parent.append(dialog);dialog.showModal();
  return dialog;
}
