import {createActorPatrol,samplePatrolPosition,patrolPointSafe,patrolSegmentSafe} from './patrol-model.js?v=20261016-living1';
import {OPTIONAL_MONSTERS} from './optional-encounters.js?v=20261016-living1';
import {encounterStory} from './story-model.js?v=20261016-living1';
import {blocked} from './maze-model.js?v=20261014-adventure2';
// Fictional stage characters only. Never derived from participant identities.
export const MONSTERS = Object.freeze([
  {id:'pumpkin', name:'カボチャの番人', icon:'🎃', color:'#ec8236', x:8.7, z:11, hint:'入口の少し先'},
  {id:'ghost', name:'おばけの本好き', icon:'👻', color:'#b9d3e0', x:14, z:11, hint:'東の鍵の間'},
  {id:'zombie', name:'つぎはぎゾンビ', icon:'🧟', color:'#8baf83', x:6.4, z:13.2, hint:'南側のランタン柱のそば'},
  {id:'vampire', name:'宵の吸血伯爵', icon:'🧛', color:'#ac688c', x:2, z:11, hint:'西の肖像の回廊（扉から入室）', needsCorridor:true},
  {id:'franken', name:'錬金術のゴーレム', icon:'⚙', color:'#99ae87', x:10.4, z:8.8, hint:'中央の交差廊・東側の月紋'},
  {id:'bat', name:'書庫のコウモリ', icon:'🦇', color:'#b5a0da', x:8, z:3.8, hint:'解錠した北の書庫', needsKey:true},
]);
export {OPTIONAL_MONSTERS};
export const REQUIRED_MONSTER_IDS=Object.freeze(MONSTERS.map(m=>m.id));
// An optional authored character: never adds a seventh required clear or migrates saves.
export const OVERLORD_BOSS=Object.freeze({
  id:'nameless_overlord',name:'無名から頂点へ至る覇王 S',icon:'♛',color:'#c9a348',
  x:23,z:4,hint:'北の書庫・第666階層「無名の覇王城」への試練（解錠後）',
  optional:true,nativeModel:true,needsKey:true,needsOverlordDoor:true,
  arena:'第666階層「無名の覇王城」',titleLevel:999,titleHP:999999,
  signatureSkill:'無名神話・覇天絶滅斬',
});
export const ALL_MONSTERS=Object.freeze([...MONSTERS,...OPTIONAL_MONSTERS,OVERLORD_BOSS]);
export function monsterAvailable(monster,state){return (!monster.needsKey||state.unlocked)&&(!monster.needsCorridor||state.horrorAccepted)&&(!monster.needsOverlordDoor||state.overlordUnlocked);}
export const BATTLE_ACTIONS = Object.freeze(['shine','guard','attack']);
// A telegraph is shown before every decision. There are no hidden rolls or timers.
const turn=(name,damage,stance,hint,weakness=null,armor=0)=>Object.freeze({name,damage,stance,hint,weakness,armor});
export const ENCOUNTER_RULES = Object.freeze({
  // Level/HP on the character card are lore. This lantern trial remains winnable
  // with the existing eight courage points and fully telegraphed commands.
  nameless_overlord:Object.freeze({spirit:30,turns:Object.freeze([
    turn('五振りの紅剣を展開',1,'五振りの魔剣が玉座の周囲へ広がる','光で剣の間を照らし、影をほどこう。','shine',1),
    turn('無名神話・覇天絶滅斬',5,'王冠が輝き、五振りの紅剣が頭上に集まる','大技の予告。守れば勇気を失わず完全に防げる。',null,2),
    turn('覇王の一礼',0,'剣を下げ、挑戦者に一礼した','杖で足元の影を払う好機。反撃はない。','attack'),
    turn('紅のマントを翻す',3,'赤いマントに影が集まる','守って次の光をためよう。'),
  ])}),
  werewolf:Object.freeze({spirit:21,turns:Object.freeze([
    turn('星の音に耳を澄ます',0,'耳を立て、足元の影を見失った','杖で星に絡まる影を払う好機。','attack'),
    turn('星を数える遠吠え',4,'銀の鈴を持ち、息を大きく吸った','守って、遠吠えの合図を聞こう。'),
    turn('銀の足跡をたどる',1,'窓明かりに足跡の影が浮かぶ','光で銀の足跡を照らそう。','shine'),
    turn('星影を跳び越える',3,'両足をそろえて跳ぶ構え','もう一度守り、着地するのを待とう。'),
  ])}),
  mummy:Object.freeze({spirit:19,turns:Object.freeze([
    turn('砂時計をかざす',1,'ガラスの中で砂の影が止まった','包帯には杖が届きにくい。光を通そう。','shine',1),
    turn('包帯で輪を描く',4,'ほどいた包帯が大きく輪になる','守って、包帯の輪が静まるのを待とう。'),
    turn('古い結び目をたしかめる',0,'手元の包帯に影の結び目が見える','杖で小さな結び目の影を払おう。','attack'),
    turn('砂の影を集める',2,'床にこぼれた影を集めている','もう一度杖を使い、砂の影を払おう。','attack'),
  ])}),
  witch:Object.freeze({spirit:18,turns:Object.freeze([
    turn('月影の魔法陣',4,'杖の先に月影が集まる','守って、魔法陣が消えるのを待とう。'),
    turn('杖を休める',0,'帽子の影が開いた','光で月影をほどく好機。','shine'),
    turn('リボンを結ぶ',1,'影の結び目が見える','杖で結び目を払おう。','attack'),
  ])}),
  masked_wanderer:Object.freeze({spirit:20,turns:Object.freeze([
    turn('重たい構え',4,'大きく腕を構えた','守って、振り終わりを待とう。',null,1),
    turn('足を止める',0,'足元に影が残った','杖で足元の影を払う好機。','attack'),
    turn('仮面を上げる',1,'仮面の影が開く','光を通して影をほどこう。','shine'),
  ])}),
  pumpkin:Object.freeze({spirit:12,turns:Object.freeze([
    turn('火種をかばう',1,'火種が見えている','光が影に届く。次は大きな枝の一振り。','shine'),
    turn('枝の大きな一振り',3,'枝を振り上げた','守れば勇気を失わず、次の一手を強められる。'),
    turn('ランタンを置く',0,'腕を下ろしている','杖で枝の影を払う好機。反撃はない。','attack'),
  ])}),
  ghost:Object.freeze({spirit:14,turns:Object.freeze([
    turn('閉じた本のささやき',1,'本に影が隠れている','閉じた本には杖が届きにくい。光を通そう。','shine',1),
    turn('忘れられた紙吹雪',3,'ページが舞い上がる','守ってページが静まるのを待とう。'),
    turn('しおりを拾う',0,'しおりが床に落ちた','杖でまとわりつく影を払おう。','attack'),
  ])}),
  zombie:Object.freeze({spirit:15,turns:Object.freeze([
    turn('のんびり足踏み',0,'影の糸が足元にある','杖で糸を払うと、次の光もたまる。','attack'),
    turn('つぎはぎステップ',3,'足元の糸が暴れている','守って、ほどける瞬間を待とう。'),
    turn('縫い目をたしかめる',1,'針の穴が暗い','光で手元を照らすと影がほどける。','shine'),
  ])}),
  vampire:Object.freeze({spirit:16,turns:Object.freeze([
    turn('マントのいたずら',3,'マントに身を隠した','杖はマントに遮られる。守って一礼を待とう。',null,1),
    turn('月明かりの挨拶',1,'深く一礼している','マントの内側へ光を。影が大きくほどける。','shine'),
    turn('影のワルツ',2,'影の分身が残っている','杖で分身を払えば、反撃も少し弱まる。','attack'),
  ])}),
  franken:Object.freeze({spirit:18,turns:Object.freeze([
    turn('重たい足踏み',2,'石の装甲を閉じた','杖は装甲に阻まれる。胸のすき間へ光を。','shine',1),
    turn('ぜんまいを巻く',0,'歯車が止まっている','杖で歯車の影を払う好機。反撃はない。','attack'),
    turn('大きな手拍子',4,'両手を大きく広げた','いちばん大きないたずら。守れば完全に防げる。'),
  ])}),
  bat:Object.freeze({spirit:20,turns:Object.freeze([
    turn('翼で起こす夜風',2,'翼を大きく広げた','光で飛ぶ道を示すと、夜風も弱まる。','shine'),
    turn('封筒の急降下',4,'高い書架から構えている','急降下を予告。守って着地を待とう。'),
    turn('止まり木でひと息',0,'翼をたたんで休んでいる','杖で封筒の影を払おう。反撃はない。','attack'),
  ])}),
});
export function prankFor(battle){
  const rules=ENCOUNTER_RULES[battle.id]||ENCOUNTER_RULES.pumpkin;
  const index=Math.max(0,Math.floor(battle.turn||0))%rules.turns.length;
  return {...rules.turns[index],index,total:rules.turns.length};
}
const monsterPatrols=new Map();
export function monsterPose(monster,time=0,motion=true,state={}){
 // The throne character waits on its stage. A patrol crossing through the
 // traveller could put it behind the first-person camera while the interaction
 // control still reported it nearby. Both rendering and guidance use this pose.
 if(monster.id==='nameless_overlord')return {x:monster.x,z:monster.z,yaw:0,facing:'down',walking:false,turning:false,phase:0,speed:0,distance:0,turnProgress:0,animationAssetComplete:false};
 let route=monsterPatrols.get(monster.id);if(!route){route=createActorPatrol(monster,{role:'monster'});monsterPatrols.set(monster.id,route);}
 return samplePatrolPosition(route,time,{motion,state});
}

export function guidePoint(monster,state={},time=0,motion=true){
  if(monster.needsKey&&!state.unlocked)return {x:8,z:7.4,yaw:0,hint:'北の格子扉です。東の鍵の間で鍵を見つけ、ここで使います。'};
  if(monster.needsCorridor&&!state.horrorAccepted)return {x:5,z:10,yaw:Math.PI/2,hint:'西の扉です。「調べる」から回廊へ入れます。'};
  if(monster.needsOverlordDoor&&!state.overlordUnlocked)return {x:17,z:3,yaw:-Math.PI/2,hint:'「666」の封印扉です。調べると、ハロウィーンの魔法が隠された覇王城への道をひらきます。'};
  const position=monsterPose(monster,time,motion,state);
  for(const [dx,dz]of[[0,.7],[.7,0],[-.7,0],[0,-.7]]){const p={x:position.x+dx,z:position.z+dz};if(patrolPointSafe(p,state)&&patrolSegmentSafe(position,p,state))return{...p,yaw:Math.atan2(dx,dz),hint:`${monster.name}の近くです。`};}
  return{x:8,z:12,yaw:0,hint:'入口から、地図でモンスターの位置を確認できます。'};

}
export function nearestMonster(state, cleared = [],{time=0,motion=false}={}) {
  return ALL_MONSTERS.filter(m => !cleared.includes(m.id) && monsterAvailable(m,state))
    .map(m => {const p=monsterPose(m,time,motion,state);return {monster:m,distance:Math.hypot(state.x-p.x*4,state.z-p.z*4)};})
    .filter(m=>m.distance<5.5&&patrolSegmentSafe({x:state.x/4,z:state.z/4},monsterPose(m.monster,time,motion,state),state,0)).sort((a,b)=>a.distance-b.distance)[0]?.monster || null;
}
export function newBattle(id) {
  if (!ALL_MONSTERS.some(m=>m.id===id)) throw new Error('Unknown stage character');
  const maxSpirit=ENCOUNTER_RULES[id].spirit,story=encounterStory(id);
  return {id,energy:8,maxEnergy:8,spirit:maxSpirit,maxSpirit,focus:2,maxFocus:3,turn:0,charged:false,status:'playing',
    message:'予告を見て、光・守り・杖を選ぼう。時間制限はありません。',dialogue:story.dialogue,lastAction:null};
}
export function commandFor(battle,action){
  if(!BATTLE_ACTIONS.includes(action))return null;
  const intent=prankFor(battle),focus=battle.focus??2,maxFocus=battle.maxFocus??3,guard=action==='guard';
  const disabled=battle.status!=='playing'||(action==='shine'&&focus<2);
  const weakness=!guard&&intent.weakness===action;
  const base=action==='shine'?3:action==='attack'?2:0;
  const damage=guard||disabled?0:Math.min(battle.spirit,Math.max(1,base+(battle.charged?1:0)+(weakness?1:0)-(action==='attack'?intent.armor:0)));
  const finishing=damage>=battle.spirit;
  const retaliation=guard||disabled||finishing?0:Math.max(0,intent.damage-(weakness?1:0));
  const focusAfter=disabled?focus:Math.min(maxFocus,Math.max(0,focus+(action==='shine'?-2:1)));
  const label={shine:'光を放つ',guard:'ランタンを守る',attack:'杖で影を払う'}[action];
  const description=disabled&&action==='shine'&&focus<2?'灯りが2必要。守るか杖で1ためよう。':guard?'次のいたずらを完全に防ぐ。灯り＋1、次の攻め＋1。':`影 −${damage} ／ 勇気 −${retaliation} ／ 灯り ${action==='shine'?'−2':'＋1'}${weakness?' · 好機！':''}`;
  const recommended=!disabled&&(finishing||(intent.damage>=3?guard:intent.weakness===action));
  return {action,label,description,disabled,damage,retaliation,focusAfter,recommended,weakness,finishing};
}
export function battleTurn(current, action) {
  const command=commandFor(current,action);
  if(!command||command.disabled)return current;
  const intent=prankFor(current),story=encounterStory(current.id),guard=action==='guard';
  const next={...current,turn:current.turn+1,focus:command.focusAfter,charged:guard,
    spirit:Math.max(0,current.spirit-command.damage),energy:Math.max(0,current.energy-command.retaliation)};
  next.lastAction={action,damage:command.damage,retaliation:command.retaliation,blocked:guard?intent.damage:0,focusChange:next.focus-current.focus,weakness:command.weakness,finished:next.spirit===0};
  if(!next.spirit){
    next.status='won';next.message=`影がほどけた！「${story.keepsake}」を受け取りました。`;next.dialogue=story.victory;return next;
  }
  if(!next.energy){next.status='rest';next.message='勇気を使い切ったので、ひと休み。鍵や集めたしるしは失いません。';next.dialogue=story.reactions.rest;return next;}
  if(guard){next.message=`${intent.name}を防いだ（勇気 −0）。灯り ${next.focus}/${next.maxFocus}。次の攻め＋1。`;}
  else {next.message=`${command.label}：影 −${command.damage}${command.weakness?'、影の弱点をほどいた':''}。${intent.name}：勇気 −${command.retaliation}。`;}
  next.dialogue=story.reactions[command.weakness?'weakness':action];return next;
}
export function intentFor(battle) {
  const {damage,name,stance,hint}=prankFor(battle);
  return `${name}（勇気 −${damage}） · ${stance}。${hint}`;
}
