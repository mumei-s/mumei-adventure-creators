(() => {
  'use strict';
  const API='https://xxhaerjvrgmnadxjqetz.supabase.co';
  const KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4aGFlcmp2cmdtbmFkeGpxZXR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNTMxMTQsImV4cCI6MjEwMTYyOTExNH0.DtoUvuMTrW7rA3jLThLD4zijvluuTB_LmEBIjWJs-jA';
  const EDIT='mumei-v3-edit-';
  const SESSION='mumei-v3-session';
  const headers={apikey:KEY,Authorization:`Bearer ${KEY}`,'Content-Type':'application/json'};
  const packs={
    gentle:{win:['いい勝負でした。また遊びましょう。','その一手、見事でした。'],draw:['互角ですね。次も楽しみにしています。'],lose:['今回は私の勝ち。次はきっともっと強いですよ。']},
    brave:{win:['やるな！その勝負、認めた！','熱い一戦だった！次も来い！'],draw:['決着は次だ！まだ終われないな！'],lose:['まだまだ！鍛えてまた挑んでこい！']},
    cool:{win:['悪くない判断だ。次も期待している。','結果は君の勝ちだ。'],draw:['互いに読み切れなかったようだ。'],lose:['今回は私が一枚上だったようだ。']},
    mystical:{win:['運命の風が、今日は君に微笑んだようですね。'],draw:['星はまだ答えを決めていないようです。'],lose:['今宵の星は、こちらを選んだようです。']},
    comic:{win:['うわっ、負けた！でも次はそうはいかないぞ！'],draw:['え、引き分け！？これは再戦しかない！'],lose:['よしっ！今日はこっちの勝ちー！']},
    job:{win:['{job}として、見事な勝負だった。'],draw:['{job}同士、譲らない勝負だったな。'],lose:['{job}の技、まだまだ見せられそうだ。']}
  };
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const series=()=>new URLSearchParams(location.search).get('series')==='sengoku'?'sengoku':'adventure';
  async function rpc(name,body={}){const r=await fetch(`${API}/rest/v1/rpc/${name}`,{method:'POST',headers,body:JSON.stringify(body),cache:'no-store'});const t=await r.text();let d;try{d=t?JSON.parse(t):null}catch{d=t}if(!r.ok)throw new Error(d?.message||d?.error||String(d||r.statusText));return d}
  const choose=a=>a[Math.floor(Math.random()*a.length)];
  const lineFor=(pack,result,job)=>choose((packs[pack]||packs.gentle)[result]||packs.gentle[result]).replaceAll('{job}',job||'冒険者');
  function toast(msg){const n=document.querySelector('#toast');if(n){n.textContent=msg;n.classList.add('show');setTimeout(()=>n.classList.remove('show'),2600)}else alert(msg)}

  function addLeaveButton(){
    if(location.hash!=='#mypage')return;
    const page=document.querySelector('#app .page'); if(!page||page.querySelector('[data-leave-catalog]'))return;
    const id=localStorage.getItem(SESSION); if(!id)return;
    const sec=document.createElement('section'); sec.className='section panel'; sec.innerHTML='<p class="eyebrow">LEAVE DIRECTORY</p><h3>名鑑から抜ける</h3><p class="lead">名鑑・ランキングから外れます。あとで同じnote IDから再参加できます。</p><div class="actions"><button class="danger" type="button" data-leave-catalog>名鑑から抜ける</button></div>';
    page.appendChild(sec);
  }

  function paginateDirectory(){
    if(location.hash!=='#directory')return;
    const grid=document.querySelector('#directoryGrid'); if(!grid||grid.dataset.paged==='1')return;
    const cards=[...grid.children].filter(x=>x.classList.contains('creator-card'));
    if(!cards.length)return;
    grid.dataset.paged='1'; grid.classList.add('directory-list-v17');
    const wrap=document.createElement('nav'); wrap.className='directory-pages-v17'; grid.after(wrap);
    const count=Math.ceil(cards.length/5);
    let current=Math.min(Math.max(Number(new URLSearchParams(location.search).get('page')||1),1),count);
    const render=()=>{
      cards.forEach((c,i)=>c.hidden=!(i>=(current-1)*5&&i<current*5));
      wrap.innerHTML=`<button class="btn" ${current<=1?'disabled':''} data-dir-prev>前のページ</button><div class="dir-page-numbers">${Array.from({length:count},(_,i)=>`<button class="${current===i+1?'primary':'btn'}" data-dir-page="${i+1}">${i+1}</button>`).join('')}</div><button class="btn" ${current>=count?'disabled':''} data-dir-next>次のページ</button>`;
      const u=new URL(location.href);u.searchParams.set('page',String(current));history.replaceState(null,'',u.href);
      grid.scrollIntoView({block:'start'});
    };
    wrap.addEventListener('click',e=>{const p=e.target.closest('[data-dir-page]');if(p)current=Number(p.dataset.dirPage);else if(e.target.closest('[data-dir-prev]')&&current>1)current--;else if(e.target.closest('[data-dir-next]')&&current<count)current++;else return;render()});
    render();
  }

  async function handleBattle(e){
    const play=e.target.closest?.('[data-play]'); if(!play)return;
    e.preventDefault();e.stopImmediatePropagation();
    try{
      const opp=document.querySelector('input[name="opponent"]:checked')?.value;if(!opp)throw new Error('対戦相手を選んでください。');
      const selected=document.querySelector('[data-action].selected')?.dataset.action||'strike';
      const action=selected==='strike'?'attack':selected;
      const pid=localStorage.getItem(SESSION),edit=pid?localStorage.getItem(EDIT+pid):null;
      const result=await rpc('play_catalog_battle',{p_series:series(),p_opponent_id:opp,p_action:action,p_participant_id:pid||null,p_edit_token:edit||null});
      const title=result.result==='win'?'勝利！':result.result==='draw'?'引き分け':'敗北';
      const mark=result.result==='win'?'🏆':result.result==='draw'?'🤝':'⚔️';
      const line=lineFor(result.dialogue_pack,result.result,result.opponent_job);
      const m=document.querySelector('#modal');
      m.innerHTML=`<div class="modal-shell battle-result"><button class="modal-close" data-v17-close>×</button><div class="result-mark">${mark}</div><p class="eyebrow">BATTLE RESULT</p><h2>${title}</h2><div class="battle-dialogue-v17"><b>${esc(result.opponent_name||'対戦相手')}</b><p>「${esc(line)}」</p></div><div class="battle-log"><div>判定：DBランダム抽選</div><div>抽選値：${Number(result.roll).toFixed(2)}</div><div>${result.ranked?`ランキング加算対象・今週 ${result.week_rank||'-'}位`:'練習／ゲスト対戦'}</div></div><div class="actions" style="justify-content:center"><button class="primary" data-v17-close>戻る</button></div></div>`;
      m.showModal();
    }catch(x){alert(x.message||x)}
  }

  window.addEventListener('click',async e=>{
    if(e.target.closest?.('[data-play]'))return handleBattle(e);
    if(e.target.closest?.('[data-v17-close]')){e.preventDefault();document.querySelector('#modal')?.close();return}
    if(e.target.closest?.('[data-leave-catalog]')){
      e.preventDefault();
      if(!confirm('名鑑から抜けますか？公開名鑑とランキングから外れます。'))return;
      const id=localStorage.getItem(SESSION),token=id&&localStorage.getItem(EDIT+id);if(!id||!token)return alert('参加情報が見つかりません。');
      try{await rpc('leave_catalog',{p_id:id,p_edit_token:token});localStorage.removeItem(SESSION);localStorage.removeItem(EDIT+id);toast('名鑑から退出しました。');setTimeout(()=>{location.hash='home';location.reload()},500)}catch(x){alert(x.message||x)}
    }
  },true);

  const obs=new MutationObserver(()=>{addLeaveButton();paginateDirectory()});obs.observe(document.body,{childList:true,subtree:true});
  addLeaveButton();paginateDirectory();
})();
