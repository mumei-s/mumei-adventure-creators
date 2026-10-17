import {TOWN_ENEMIES} from './story-data.js';

let battleSequence=0;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const intents={
  strike:{id:'strike',label:'小さな影が近づく',description:'次は通常攻撃。攻めるか、灯りをためよう。'},
  gather:{id:'gather',label:'大きな力をためている',description:'次の行動は準備。さらに次の光の波には「守る」が有効。'},
  wave:{id:'wave',label:'強い光の波が来る！',description:'「守る」で大きく軽減できる。'},
  mist:{id:'mist',label:'霧が渦を巻く',description:'霧の攻撃。「灯り」で霧を払うと少し回復する。'},
};
function intentFor(b){return {...intents[b.enemy.intent[b.turn%b.enemy.intent.length]]};}
function copyBattle(b){return {...b,enemy:{...b.enemy,intent:[...b.enemy.intent]},enemyIntent:{...b.enemyIntent},history:[...b.history]};}
function log(b,text){b.message=text;b.history=[...b.history.slice(-7),text];return b;}

export function startTownBattle(state,enemyId){
  const original=TOWN_ENEMIES[enemyId];
  const enemy=original?{...original,power:original.power-(enemyId==='clock-shadow'&&state.flags?.route==='quiet'?2:0)}:null;
  if(!enemy)return null;
  const battle={id:`town-battle-${Date.now()}-${++battleSequence}`,enemyId,enemy:{...enemy,intent:[...enemy.intent]},enemyHp:enemy.maxHp,playerHp:clamp(Number(state.hp)||1,1,state.maxHp||60),maxHp:state.maxHp||60,energy:clamp(Number(state.energy)||0,0,3),maxEnergy:3,tonics:clamp(Number(state.inventory?.tonic)||0,0,99),phase:'player',turn:0,guarded:false,lastAction:null,lastDamage:0,playerDamage:0,history:[enemy.intro],message:enemy.intro};
  battle.enemyIntent=intentFor(battle);return battle;
}

// One command advances to the telegraphed enemy phase. Repeated taps during
// that phase are ignored; the controller resolves it after its animation.
export function townBattleCommand(previous,command){
  if(!previous||previous.phase!=='player')return previous;
  const action=typeof command==='string'?command:command?.id;
  if(!['attack','guard','spark','tonic','escape'].includes(action))return previous;
  if(action==='spark'&&previous.energy<2)return log(copyBattle(previous),'灯りが足りない。「攻撃」か「守る」でためよう。');
  if(action==='tonic'&&previous.tonics<1)return log(copyBattle(previous),'星蜜の小瓶を持っていない。');
  const b=copyBattle(previous);b.lastAction=action;b.lastDamage=0;b.playerDamage=0;b.guarded=false;
  if(action==='escape'){b.phase='escaped';return log(b,'灯りを手元に戻し、安全な道まで退いた。準備してから、また挑める。');}
  if(action==='attack'){b.lastDamage=12;b.enemyHp=Math.max(0,b.enemyHp-12);b.energy=Math.min(3,b.energy+1);log(b,'灯杖を振るい、光の輪で12のダメージ。灯りが1たまった。');}
  if(action==='spark'){b.lastDamage=25;b.enemyHp=Math.max(0,b.enemyHp-25);b.energy-=2;if(b.enemyIntent.id==='mist')b.playerHp=Math.min(b.maxHp,b.playerHp+6);log(b,b.enemyIntent.id==='mist'?'星灯りが霧をほどく。25のダメージ、体力が6回復。':'星灯りが弧を描き、25のダメージ。');}
  if(action==='guard'){b.guarded=true;b.energy=Math.min(3,b.energy+1);log(b,'灯りの傘を広げて守る。次の攻撃を軽減し、灯りが1たまった。');}
  if(action==='tonic'){const recovered=Math.min(28,b.maxHp-b.playerHp);b.tonics--;b.playerHp+=recovered;log(b,`星蜜の小瓶で体力が${recovered}回復。`);}
  b.phase=b.enemyHp===0?'victory':'enemy';
  if(b.phase==='victory')log(b,`${b.enemy.name}はやわらかな光にほどけた。街に静けさが戻る。`);
  return b;
}

export function townBattleTurn(previous,action='enemy'){
  if(!previous||previous.phase!=='enemy'||action!=='enemy')return previous;
  const b=copyBattle(previous),intent=b.enemyIntent.id;
  let damage=intent==='gather'?0:intent==='wave'?b.enemy.power*2+4:intent==='mist'?b.enemy.power+2:b.enemy.power;
  if(b.guarded)damage=Math.ceil(damage*.25);
  b.playerDamage=damage;b.playerHp=Math.max(0,b.playerHp-damage);b.guarded=false;b.turn++;
  if(b.playerHp===0){b.phase='defeat';return log(b,'灯りが小さく揺れた。最後に休んだ場所で立て直そう。持ち物や街の灯りは失われない。');}
  b.phase='player';b.enemyIntent=intentFor(b);
  return log(b,intent==='gather'?'影は大きな力をためた。次の波に備えよう。':damage===0?'光の傘が霧を受け止めた。':`影の${intent==='wave'?'大波':intent==='mist'?'霧':'一撃'}。${damage}のダメージ。`);
}

export function finishTownBattle(previous,battle){
  if(!battle||!['victory','defeat','escaped'].includes(battle.phase))return {state:previous,notice:'戦闘はまだ続いている。'};
  const receipts=previous.battleReceipts||[];
  if(receipts.includes(battle.id))return {state:previous,notice:'この戦闘の結果は受け取り済み。'};
  const state={...previous,flags:{...previous.flags},inventory:{...previous.inventory},battleReceipts:[...receipts.slice(-63),battle.id],updatedAt:Date.now()};
  state.inventory.tonic=battle.tonics;state.hp=battle.playerHp;state.energy=battle.energy;
  if(battle.phase==='victory'){
    const first=!state.flags[battle.enemy.rewardFlag];
    if(first){state.flags[battle.enemy.rewardFlag]=true;state.coins+=battle.enemy.coins;}
    return {state,notice:first?`${battle.enemy.name}を鎮めた。${battle.enemy.coins}ルーメンを受け取った。`:'すでに街へ光を戻した場所だ。',dialogue:{title:'灯りが戻る',speaker:'旅の記録',text:battle.enemyId==='canal-mist'?'泉の底に月がくっきり映った。もう一度泉を調べて、水を分けてもらおう。':'時計塔の影は、祭りが終わる寂しさだった。「次の夜も会いに来るよ」。約束を聞いた時計が動き始める。もう一度大時計を調べよう。',choices:[]}};
  }
  if(battle.phase==='defeat'){
    const cp=state.checkpoint||{mapId:'lantern-town',position:{x:32.5,z:7.5}};
    state.mapId=cp.mapId;state.position={...cp.position};state.hp=state.maxHp;state.energy=1;
    return {state,notice:'最後の休憩場所で体力を回復した。もう一度準備して挑める。'};
  }
  return {state,notice:'街へ戻った。回復や買い物をしてから、いつでも再挑戦できる。'};
}
