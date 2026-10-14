import {blocked} from './maze-model.js?v=20261014-adventure2';
// Fictional stage characters only. Never derived from participant identities.
export const MONSTERS = Object.freeze([
  {id:'pumpkin', name:'カボチャの番人', icon:'🎃', color:'#ec8236', x:8.7, z:11, hint:'入口の少し先'},
  {id:'ghost', name:'おばけの本好き', icon:'👻', color:'#b9d3e0', x:14, z:11, hint:'東の鍵の間'},
  {id:'zombie', name:'つぎはぎゾンビ', icon:'🧟', color:'#8baf83', x:6.4, z:13.2, hint:'南側のランタン柱のそば', pattern:[0,2], moves:['のんびり足踏み','つぎはぎステップ']},
  {id:'vampire', name:'宵の吸血伯爵', icon:'🧛', color:'#ac688c', x:2, z:11, hint:'西の肖像の回廊（扉から入室）', needsCorridor:true, pattern:[2,1,1], moves:['マントのいたずら','月明かりの挨拶','気まぐれな一礼']},
  {id:'franken', name:'錬金術のゴーレム', icon:'⚙', color:'#99ae87', x:10.4, z:8.8, hint:'中央の交差廊・東側の月紋', pattern:[1,0,2], moves:['重たい足踏み','ぜんまいを巻く','やさしい手拍子']},
  {id:'bat', name:'書庫のコウモリ', icon:'🦇', color:'#b5a0da', x:8, z:3.8, hint:'解錠した北の書庫', needsKey:true},
]);
export function monsterAvailable(monster,state){return (!monster.needsKey||state.unlocked)&&(!monster.needsCorridor||state.horrorAccepted);}
export function prankFor(battle){const m=MONSTERS.find(m=>m.id===battle.id),pattern=m?.pattern||[1,2],index=battle.turn%pattern.length;return {damage:pattern[index],name:m?.moves?.[index]||(index===0?'小さないたずら':'大きないたずら')};}
export function monsterPose(monster,time=0,motion=true,state={}){
  if(!motion)return {x:monster.x,z:monster.z};
  const seed=MONSTERS.findIndex(m=>m.id===monster.id)*1.7,speed=monster.id==='franken'?.32:monster.id==='zombie'?.4:.55;
  const x=monster.x+Math.sin(time*speed+seed)*.16,z=monster.z+Math.cos(time*speed*.8+seed)*.11;
  return blocked(x*4,z*4,state)?{x:monster.x,z:monster.z}:{x,z};
}
export function guidePoint(monster,state={}){
  if(monster.needsKey&&!state.unlocked)return {x:8,z:7.4,yaw:0,hint:'北の格子扉です。東の鍵の間で鍵を見つけ、ここで使います。'};
  if(monster.needsCorridor&&!state.horrorAccepted)return {x:5,z:10,yaw:Math.PI/2,hint:'西の扉です。「調べる」から回廊へ入れます。'};
  const points={pumpkin:[8,12,-.45],ghost:[13,10,-Math.PI/2],zombie:[7.1,13.3,Math.PI/2],vampire:[2,12,0],bat:[8,4.8,0],franken:[9.4,8.8,-Math.PI/2]};
  const [x,z,yaw]=points[monster.id];return {x,z,yaw,hint:`${monster.name}の近くです。近づいて「話しかける」を選びます。`};
}
export function nearestMonster(state, cleared = [],{time=0,motion=false}={}) {
  return MONSTERS.filter(m => !cleared.includes(m.id) && monsterAvailable(m,state))
    .map(m => {const p=monsterPose(m,time,motion,state);return {monster:m,distance:Math.hypot(state.x-p.x*4,state.z-p.z*4)};})
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

