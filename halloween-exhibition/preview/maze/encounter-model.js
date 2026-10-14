// Fictional stage characters only. Never derived from participant identities.
export const MONSTERS = Object.freeze([
  {id:'pumpkin', name:'カボチャの番人', icon:'🎃', color:'#ec8236', x:8.7, z:11, hint:'入口の少し先'},
  {id:'ghost', name:'おばけの本好き', icon:'👻', color:'#b9d3e0', x:14, z:11, hint:'東の鍵の間'},
  {id:'zombie', name:'つぎはぎゾンビ', icon:'🧟', color:'#8baf83', x:6.4, z:13.2, hint:'南側のランタン柱のそば', pattern:[0,2], moves:['のんびり足踏み','つぎはぎステップ']},
  {id:'vampire', name:'宵の吸血伯爵', icon:'🧛', color:'#ac688c', x:2, z:11, hint:'西の肖像の回廊（扉から入室）', needsCorridor:true, pattern:[2,1,1], moves:['マントのいたずら','月明かりの挨拶','気まぐれな一礼']},
  {id:'bat', name:'書庫のコウモリ', icon:'🦇', color:'#b5a0da', x:8, z:3.8, hint:'解錠した北の書庫', needsKey:true},
]);
export function monsterAvailable(monster,state){return (!monster.needsKey||state.unlocked)&&(!monster.needsCorridor||state.horrorAccepted);}
export function prankFor(battle){const m=MONSTERS.find(m=>m.id===battle.id),pattern=m?.pattern||[1,2],index=battle.turn%pattern.length;return {damage:pattern[index],name:m?.moves?.[index]||(index===0?'小さないたずら':'大きないたずら')};}
export function nearestMonster(state, cleared = []) {
  return MONSTERS.filter(m => !cleared.includes(m.id) && monsterAvailable(m,state))
    .map(m => ({monster:m, distance:Math.hypot(state.x-m.x*4,state.z-m.z*4)}))
    .filter(m=>m.distance<5.5).sort((a,b)=>a.distance-b.distance)[0]?.monster || null;
}
export function newBattle(id) {
  if (!MONSTERS.some(m=>m.id===id)) throw new Error('Unknown stage character');
  return {id, energy:4, spirit:3, turn:0, charged:false, status:'playing', message:'光を当てて、いたずらをしずめよう。時間制限はありません。'};
}
export function battleTurn(current, action) {
  if (current.status !== 'playing' || !['shine','guard'].includes(action)) return current;
  const next={...current,turn:current.turn+1};
  if(action==='shine') {
    const power=current.charged?2:1;
    next.spirit=Math.max(0,current.spirit-power);next.charged=false;
    if(!next.spirit) return {...next,status:'won',message:'いたずらがおさまった！住人からキャンディのしるしをもらいました。'};
    const {damage,name}=prankFor(current);
    next.energy=Math.max(0,current.energy-damage);
    next.message=damage?`ランタンの光が${power}届いた。${name}で勇気が${damage}減った。`:`ランタンの光が${power}届いた。相手は${name}。勇気は減りません。`;
    if(!next.energy){next.status='rest';next.message='ひと休み。失うものはありません。もう一度挑戦するか、探索に戻れます。';}
  } else {
    next.charged=true;
    next.message='ランタンを守って、いたずらを防いだ！次の光は2倍です。';
  }
  return next;
}
export function intentFor(battle) {const {damage,name}=prankFor(battle);return `${name}（勇気 −${damage}）`;}

