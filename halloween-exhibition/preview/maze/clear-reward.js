/** Number allocation is supplied by the caller; this module does not claim global uniqueness. */
function singleLine(value, max=100) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0,max);
}
export function issuePrompt(run, allocation, options={}) {
  if (!run || run.completed !== true || !singleLine(run.id)) throw new Error('A completed run is required');
  // Reopening, copying, or downloading the same completed run must not issue another number.
  if (run.reward?.runId === run.id) return run.reward;
  if (!Number.isSafeInteger(allocation?.number) || allocation.number < 1) throw new Error('A valid allocated number is required');
  if (!['device','global'].includes(allocation.scope)) throw new Error('Number scope must be explicit');
  const creatorId=singleLine(options.creatorId,50).replace(/^@/, '');
  if (creatorId && !/^[a-zA-Z0-9_]+$/.test(creatorId)) throw new Error('Use a note creator ID, not a URL');
  const label='この端末のクリア';
  const serial=String(allocation.number).padStart(3,'0');
  const prompt=buildCardPrompt(serial,creatorId);
  return Object.freeze({runId:run.id,number:allocation.number,scope:allocation.scope,label,serial,prompt,filename:`halloween-clear-${serial}.txt`});
}
export function buildCardPrompt(serial,creatorId=''){
  const id=singleLine(creatorId,50).replace(/^@/,'');
  if(id&&!/^[a-zA-Z0-9_]+$/.test(id))throw new Error('noteのクリエイターIDを入力してください');
  return [
    '添付した好きなイラストをキャラクター参照として、縦長2:3の豪華なHalloweenクリア記念ステータスカード画像を1枚描いてください。',
    `クリエイターID（調査用。画像には絶対に印字しない）：${id||'【ここに自分のnoteクリエイターIDを入力】'}`,
    `クリア表示：この端末のクリア No.${serial}`,
    '',
    '【名前と創作ステータス】',
    '可能ならnoteの公開プロフィールを確認し、正式な表示名と、公開されている一般的な創作活動だけを参考にする。IDは名前の代わりに印字しない。',
    'プロフィールを確認できない場合は、表示名と簡単な創作活動を本人に聞く。正式名や実績を推測・捏造しない。医療・収入などの機微な情報は使わない。',
    '創作活動から、ファンタジーの職業・属性・スキルを各1つ考える。「創作ステータス」と明記し、実際の能力や測定値と誤認させる数値を入れない。',
    '',
    '【人物と絵】',
    '添付イラストはキャラクターの顔立ち・髪・特徴の参照のみ。本人らしさを保ちつつ、新しいポーズ・衣装のアレンジ・構図・宮殿背景を描く。添付の文字や背景をコピーしない。',
    'カード上部55〜60％は、魔法の門を開いた主役が祝福される高精細イラスト。宝石の透明感と光の屈折、輝く瞳、立体的な陰影。金と宝石色にHalloweenのオレンジを添える。',
    'カボチャや小さなおばけ、キャンディ、光のリボンで華やかさと可愛さ。主役の顔を飾りで隠さない。下部35〜40％は濃い落ち着いた色の読みやすいステータス欄。',
    '上下左右に十分な安全余白。文字切れ、詰め込み、文字と顔の重なりは禁止。配色や背景はキャラクターに合わせて毎回個別に設計する。',
    '',
    '【必ず画像に入れる文字】',
    '無名S note',
    'Halloween Atelier',
    '魔法の入口',
    'CLEAR',
    '確認したクリエイターの表示名',
    '創作ステータス',
    '職業・属性・スキル（上記で個別に創作した内容）',
    '主役らしい短いファンタジーの一言',
    `この端末のクリア No.${serial}`,
    '',
    'ID、URL、QRコード、認証済みマーク、実力を測ったような数値は画像に入れない。クリア番号はこのブラウザ内の記念番号で、全員共通の順位や本人認証ではない。',
    '画像作成も記事投稿も任意。アプリから自動生成・投稿するものではない。完成画像そのものを描いてください。',
  ].join('\n');
}

export const REWARD_PREFIX='halloween-exhibition:clear-receipt:v1:';
export function eligibleForEnding({unlocked,cleared,reachedVault},monsterIds){
  return unlocked===true && reachedVault===true && monsterIds.length>0 && monsterIds.every(id=>Array.isArray(cleared)&&cleared.includes(id));
}
export function newRunId(){return globalThis.crypto?.randomUUID?.() || `run-${Date.now()}-${Math.random().toString(36).slice(2)}`;}
export function createRewardStore({storage,locks=globalThis.navigator?.locks}={}){
  const session=new Map();
  function read(id){
    if(session.has(id))return session.get(id);
    try{const r=JSON.parse(storage.getItem(REWARD_PREFIX+id));if(r?.runId===id && Number.isSafeInteger(r.number)&&r.number>0)return r;}catch{}
    return null;
  }
  function all(){
    const records=[...session.values()];
    try{for(let i=0;i<storage.length;i++){const k=storage.key(i);if(k?.startsWith(REWARD_PREFIX)){try{const r=JSON.parse(storage.getItem(k));if(Number.isSafeInteger(r?.number)&&r.number>0)records.push(r);}catch{}}}}catch{}
    return records;
  }
  async function issue(run,options){
    const allocate=()=>{
      const existing=read(run.id);if(existing)return existing;
      const number=Math.max(0,...all().map(r=>r.number))+1;
      const reward={...issuePrompt(run,{number,scope:'device'},options),persistent:true};
      try{storage.setItem(REWARD_PREFIX+run.id,JSON.stringify(reward));if(storage.getItem(REWARD_PREFIX+run.id)!==JSON.stringify(reward))throw Error('Storage unavailable');}
      catch{reward.persistent=false;}
      session.set(run.id,reward);return reward;
    };
    // Secure-context Web Locks serialize numbering between tabs. Without it,
    // records stay keyed by run ID: no overwrite, but simultaneous tabs can share a number.
    return locks?.request ? locks.request('halloween-clear-number-v1',allocate) : allocate();
  }
  return {read,issue,hasCrossTabLock:!!locks?.request};
}
