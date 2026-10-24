import {CREATOR_QUARTER_ID,CREATOR_QUARTER_LAYOUT_VERSION,migrateCreatorQuarterPosition} from './creator-homes.js?v=20261019-homes2';
import {TOWN_VERSION,TOWN_START_MAP,TOWN_ITEMS,TOWN_QUESTS,TOWN_LAMPS,TOWN_STAMPS,getTownMap,isTownWalkable,mapTargets} from './story-data.js?v=20261019-homes2';
export {getTownMap,isTownWalkable,TOWN_MAPS,TOWN_NPCS,TOWN_TITLE} from './story-data.js?v=20261019-homes2';

export function initialTownState(){return {version:TOWN_VERSION,layoutVersion:CREATOR_QUARTER_LAYOUT_VERSION,mapId:TOWN_START_MAP,position:{...getTownMap().spawn},facing:'down',hp:60,maxHp:60,energy:1,coins:24,inventory:{tonic:2},flags:{lamps:[],stamps:[],gearNotes:[]},visited:[TOWN_START_MAP],battleReceipts:[],checkpoint:{mapId:TOWN_START_MAP,position:{...getTownMap().spawn}},steps:0,updatedAt:Date.now()};}
const knownFlags=['intro','breadTaken','breadDelivered','wickTaken','act1Complete','gardenVictory','moonwaterTaken','riverClue','gearTaken','sluiceRepaired','clockVictory','clockRestored','maskStarted','ribbonTaken','maskComplete','starComplete','ending'];
// Recover at the nearest clear tile, never inside a moved house or a tree.
// Invalid coordinates use the map's known safe entrance, not a random home.
export function recoverTownPosition(mapOrId,position,{avoidPassages=false}={}){
 const map=typeof mapOrId==='string'?getTownMap(mapOrId):mapOrId;
 if(position&&isTownWalkable(map,position.x,position.z)&&(!avoidPassages||!map.portals.some(p=>p.openPassage&&Math.hypot(p.x-position.x,p.z-position.z)<1.2)))return {x:position.x,z:position.z};
 if(!position||!Number.isFinite(position.x)||!Number.isFinite(position.z)||position.x<0||position.z<0||position.x>map.width||position.z>map.height)return {...map.spawn};
 let nearest=null,best=Infinity;
 for(let z=1;z<map.height-1;z++)for(let x=1;x<map.width-1;x++){
  const point={x:x+.5,z:z+.5},distance=(point.x-position.x)**2+(point.z-position.z)**2;
  if(distance<best&&isTownWalkable(map,point.x,point.z)&&!map.portals.some(p=>p.openPassage&&Math.hypot(p.x-point.x,p.z-point.z)<1.2)){nearest=point;best=distance;}
 }
 return nearest||{...map.spawn};
}
export function restoreTownState(raw){
  const defaults=initialTownState();if(!raw||typeof raw!=='object'||raw.version!==TOWN_VERSION)return defaults;
  const legacyLayout=!Number.isFinite(raw.layoutVersion)||raw.layoutVersion<CREATOR_QUARTER_LAYOUT_VERSION;
  const finite=(n,f,min=0,max=999999)=>typeof n==='number'&&Number.isFinite(n)?Math.min(max,Math.max(min,n)):f;
  const flags={lamps:[],stamps:[],gearNotes:[]};
  for(const key of knownFlags)flags[key]=raw.flags?.[key]===true;
  for(const [key,ids]of [['lamps',TOWN_LAMPS],['stamps',TOWN_STAMPS],['gearNotes',['amber','blue','silver']]])flags[key]=[...new Set(Array.isArray(raw.flags?.[key])?raw.flags[key].filter(id=>ids.includes(id)):[])];
  if(['quiet','bright'].includes(raw.flags?.route))flags.route=raw.flags.route;
  if(['lanterns','river'].includes(raw.flags?.endingChoice))flags.endingChoice=raw.flags.endingChoice;
  flags.breadTaken=flags.breadTaken&&flags.intro;
  flags.breadDelivered=flags.breadDelivered&&flags.breadTaken;
  flags.wickTaken=flags.wickTaken&&flags.breadDelivered;
  if(!flags.wickTaken)flags.lamps=[];
  flags.act1Complete=flags.act1Complete&&flags.lamps.length===3;
  flags.riverClue=flags.riverClue&&flags.act1Complete;
  flags.gearTaken=flags.gearTaken&&flags.act1Complete&&flags.gearNotes.length===3;
  flags.gardenVictory=flags.gardenVictory&&flags.act1Complete;
  flags.moonwaterTaken=flags.moonwaterTaken&&flags.gardenVictory;
  flags.sluiceRepaired=flags.sluiceRepaired&&flags.gearTaken&&flags.moonwaterTaken&&!!flags.route;
  flags.clockVictory=flags.clockVictory&&flags.sluiceRepaired;
  flags.clockRestored=flags.clockRestored&&flags.clockVictory;
  flags.ending=flags.ending&&flags.clockRestored&&!!flags.endingChoice;
  flags.ribbonTaken=flags.ribbonTaken&&flags.maskStarted;
  flags.maskComplete=flags.maskComplete&&flags.ribbonTaken;
  flags.starComplete=flags.starComplete&&flags.stamps.length===3;
  const inventory={};for(const id of Object.keys(TOWN_ITEMS)){const count=Math.floor(finite(raw.inventory?.[id],0,0,id==='tonic'?99:1));if(count)inventory[id]=count;}
  const questItems={festivalBread:flags.breadTaken&&!flags.breadDelivered,wick:flags.wickTaken,bronzeKey:flags.act1Complete,gear:flags.gearTaken&&!flags.sluiceRepaired,moonwater:flags.moonwaterTaken&&!flags.sluiceRepaired,ribbon:flags.ribbonTaken&&!flags.maskComplete,starCharm:flags.starComplete};
  for(const [id,present] of Object.entries(questItems)){if(present)inventory[id]=1;else delete inventory[id];}
  const map=getTownMap(raw.mapId==='clocktower'&&!flags.sluiceRepaired?TOWN_START_MAP:raw.mapId),pos=map.id===CREATOR_QUARTER_ID?migrateCreatorQuarterPosition(raw.position,raw.layoutVersion):raw.position;
  const maxHp=flags.starComplete?72:60;
  const state={...defaults,mapId:map.id,position:map.id===CREATOR_QUARTER_ID?recoverTownPosition(map,pos,{avoidPassages:legacyLayout}):pos&&isTownWalkable(map,pos.x,pos.z)?{x:pos.x,z:pos.z}:{...map.spawn},facing:['up','down','left','right'].includes(raw.facing)?raw.facing:'down',hp:finite(raw.hp,maxHp,1,maxHp),maxHp,energy:Math.floor(finite(raw.energy,1,0,3)),coins:Math.floor(finite(raw.coins,24,0,9999)),inventory,flags,visited:[...new Set([TOWN_START_MAP,...(Array.isArray(raw.visited)?raw.visited.filter(id=>getTownMap(id).id===id):[])])],battleReceipts:Array.isArray(raw.battleReceipts)?raw.battleReceipts.filter(id=>typeof id==='string'&&/^town-battle-[\w-]{1,80}$/.test(id)).slice(-64):[],steps:finite(raw.steps,0),updatedAt:finite(raw.updatedAt,Date.now())};
  const cp=raw.checkpoint;
  if(cp&&getTownMap(cp.mapId).id===cp.mapId&&(cp.mapId!=='clocktower'||flags.sluiceRepaired)){
  const position=cp.mapId===CREATOR_QUARTER_ID?migrateCreatorQuarterPosition(cp.position,raw.layoutVersion):cp.position;
  if(position&&Number.isFinite(position.x)&&Number.isFinite(position.z)&&(cp.mapId===CREATOR_QUARTER_ID||isTownWalkable(cp.mapId,position.x,position.z)))state.checkpoint={mapId:cp.mapId,position:recoverTownPosition(cp.mapId,position,{avoidPassages:cp.mapId===CREATOR_QUARTER_ID&&legacyLayout})};
 }
  // Inconsistent edited saves cannot mark the ending while skipping its route.
  if(!flags.clockVictory){flags.clockRestored=false;flags.ending=false;delete flags.endingChoice;}
  return state;
}
function copy(state){return {...state,position:{...state.position},flags:{...state.flags,lamps:[...(state.flags.lamps||[])],stamps:[...(state.flags.stamps||[])],gearNotes:[...(state.flags.gearNotes||[])]},inventory:{...state.inventory},visited:[...state.visited],battleReceipts:[...(state.battleReceipts||[])],checkpoint:{mapId:state.checkpoint.mapId,position:{...state.checkpoint.position}},updatedAt:Date.now()};}
function face(dx,dz,previous){return Math.abs(dx)+Math.abs(dz)<.00001?previous:Math.abs(dx)>Math.abs(dz)?dx>0?'right':'left':dz>0?'down':'up';}
export function moveTown(previous,dx,dz){
  if(!Number.isFinite(dx)||!Number.isFinite(dz))return previous;
  const length=Math.hypot(dx,dz);if(length===0)return previous;
  const multiplier=Math.min(1,1.5/length);dx*=multiplier;dz*=multiplier;
  const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.12)),position={...previous.position};
  for(let i=0;i<count;i++){if(isTownWalkable(previous.mapId,position.x+dx/count,position.z))position.x+=dx/count;if(isTownWalkable(previous.mapId,position.x,position.z+dz/count))position.z+=dz/count;}
  const moved=Math.hypot(position.x-previous.position.x,position.z-previous.position.z),facing=face(dx,dz,previous.facing);
  return moved===0&&facing===previous.facing?previous:{...previous,position,facing,steps:(previous.steps||0)+moved};
}
export function nearestTownTarget(state,maxDistance=1.65){return mapTargets(state.mapId).map(t=>({...t,distance:Math.hypot(t.x-state.position.x,t.z-state.position.z)})).filter(t=>t.distance<=maxDistance).sort((a,b)=>a.distance-b.distance)[0]||null;}
export function getNearbyTargets(state,maxDistance=2){return mapTargets(state.mapId).filter(t=>Math.hypot(t.x-state.position.x,t.z-state.position.z)<=maxDistance);}
const choice=(id,label)=>({id,label});
function say(state,title,text,choices=[],extras={}){return {state,dialogue:{title,speaker:title,text,choices},...extras};}
function notice(state,text){return {state,notice:text};}
function objective(state){
  const f=state.flags;
  if(f.ending)return '祭りの灯りを楽しもう。まだ見ていない路地や寄り道へ。';
  if(f.clockRestored)return '城の西の道にいる灯守リュカに、時計が動きだしたことを伝えよう。';
  if(f.clockVictory)return '時計塔の大時計をもう一度調べよう。';
  if(f.sluiceRepaired)return '時計塔へ入り、止まった大時計を調べよう。';
  if(f.act1Complete){if(!f.riverClue)return '夜の書庫で、水門と三色の歯車の記録を読もう。';if(!f.gearTaken)return '星歯車工房で、記録の順番どおりに調律盤を鳴らそう。';if(!f.moonwaterTaken)return '月映し庭園の泉を調べ、月映しの水を分けてもらおう。';return '運河南の水門へ。歯車と月映しの水で流れを直そう。';}
  if(f.lamps?.length===3)return '三つの灯籠が灯った。城の西の道のリュカに報告しよう。';
  if(!f.intro)return '城の前から西（左）へ進み、西の道にいる灯守リュカに話そう。';
  if(!f.breadTaken)return '月麦市場のパン屋ミレットから、リュカへの包みを預かろう。';
  if(!f.breadDelivered)return '焼きたてパンを、城の西の道のリュカに届けよう。';
  if(!f.wickTaken)return '市場の「月糸の店」に入り、灯芯屋トワと話そう。';
  return `市場・広場・庭園の灯籠をともそう。あと${3-(f.lamps?.length||0)}つ。`;
}
export function townProgress(state){const f=state.flags;return {title:f.ending?'終幕　また会う夜へ':f.sluiceRepaired?'第三幕　十二時をなくした時計塔':f.act1Complete?'第二幕　逆さの運河と三色の歯車':'第一幕　消えた街灯と焼きたての約束',objective:objective(state),act:f.ending?4:f.sluiceRepaired?3:f.act1Complete?2:1,completed:!!f.ending,lamps:f.lamps.length,stars:f.stamps.length,route:f.route||null};}
export function townInventory(state){return Object.entries(state.inventory).filter(([id,n])=>TOWN_ITEMS[id]&&n>0).map(([id,count])=>({...TOWN_ITEMS[id],count}));}
export function townJournal(state){
  const f=state.flags;
  return TOWN_QUESTS.map(q=>({...q,status:q.id==='lights'?f.act1Complete?'complete':f.intro?'active':'available':q.id==='river'?f.sluiceRepaired?'complete':f.act1Complete?'active':'locked':q.id==='clock'?f.ending?'complete':f.sluiceRepaired?'active':'locked':q.id==='mask'?f.maskComplete?'complete':f.maskStarted?'active':'available':f.starComplete?'complete':f.stamps.length?'active':'available',objective:q.id==='lights'?f.act1Complete?'三つの灯籠をともして、水門の鍵を受け取った。':!f.intro?'城の西の道にいる灯守リュカと話そう。':!f.breadDelivered?'市場のパンをリュカへ届けよう。':!f.wickTaken?'月糸の店で灯芯を受け取ろう。':`市場・広場・庭園の灯籠をともす（${f.lamps.length}/3）。`:q.id==='river'?f.sluiceRepaired?`水門を修復した。${f.route==='quiet'?'静かな流れ':'きらめく流れ'}が街を巡る。`:'夜の書庫の記録 → 工房の三色調律 → 庭園の月映しの水 → 運河南の水門。':q.id==='clock'?f.ending?'時計に時間が戻り、次の夜を約束した。':'水門の修復後、時計塔の大時計を調べる。影を鎮め、最後に城の西の道のリュカへ。':q.id==='mask'?f.maskComplete?'セラにリボンを届けた。':f.ribbonTaken?'仮面職人セラにリボンを届けよう。':'市場のセラと話し、宿屋近くの猫コハクを探そう。':f.starComplete?'司書から三ツ星の護符を受け取った。':`市場・運河・庭園の星印を集め、夜の書庫の司書へ（${f.stamps.length}/3）。`}));
}

export function interactTown(previous,targetId,choiceId){
  const target=mapTargets(previous.mapId).find(t=>t.id===targetId);
  if(!target)return notice(previous,'近くに調べられるものは見つからない。');
  if(Math.hypot(target.x-previous.position.x,target.z-previous.position.z)>2.05)return notice(previous,'もう少し近づいてみよう。');
  const s=copy(previous),f=s.flags;
  if(target.type==='portal'||target.type==='creator-home'&&target.portal===true){
    if(target.to==='clocktower'&&!f.sluiceRepaired)return say(previous,'時計塔の扉','時計の扉はびくともしない。運河の水門を直して、水の力を戻そう。');
    if(getTownMap(target.to).id!==target.to||!isTownWalkable(target.to,target.spawn?.x,target.spawn?.z))return notice(previous,'入口の先を確認できませんでした。少し待って、もう一度訪ねてください。');
    s.mapId=target.to;s.position={...target.spawn};
    s.facing=target.arrivalFacing||(target.to===TOWN_START_MAP?'down':'up');if(!s.visited.includes(s.mapId))s.visited.push(s.mapId);
    return {state:s,notice:getTownMap(s.mapId).name,transition:true};
  }
  if(target.type==='creator-works')return {state:previous,creatorWorks:target.creatorId};
  if(target.dialogue)return say(previous,target.name,target.dialogue);
  if(targetId==='castle-exit')return {state:previous,exit:true};
  if(targetId==='keeper'){
    if(!f.intro){if(choiceId==='accept'){f.intro=true;return say(s,target.name,'ありがとう。まず市場のミレットへ。灯りの作業を始める前に、約束していたパンを取りに行ってほしい。店は城門から西、道を下ったところだ。');}return say(previous,target.name,'祭りの夜なのに、市場・広場・庭園の灯籠が眠ったままなんだ。いっしょに、街の灯りを起こしてくれない？',[choice('accept','街の灯りを取り戻す')]);}
    if(f.breadTaken&&!f.breadDelivered){if(choiceId==='deliver'){f.breadDelivered=true;delete s.inventory.festivalBread;s.coins+=8;return say(s,target.name,'焼きたてだ！ これで元気が出たよ。8ルーメンはお駄賃。市場の月糸の店で、トワから特別な灯芯を受け取って。三つの灯籠は、市場・噴水の広場・東の庭園にある。');}return say(previous,target.name,'ミレットの包みを持ってきてくれたんだね。',[choice('deliver','パンを渡す')]);}
    if(!f.act1Complete&&f.lamps.length===3){f.act1Complete=true;s.inventory.bronzeKey=1;s.coins+=18;s.checkpoint={mapId:s.mapId,position:{...s.position}};return say(s,target.name,'街に光が戻った！ これは水門の真鍮鍵。運河の流れが逆さになって、時計まで止まっているんだ。橋を渡って夜の書庫のフィオに、昔の水門のことを聞いて。',[],{notice:'第一幕をクリア。真鍮鍵と18ルーメンを受け取った。'});}
    if(f.clockRestored&&!f.ending){if(['ending-lanterns','ending-river'].includes(choiceId)){f.ending=true;f.endingChoice=choiceId==='ending-river'?'river':'lanterns';s.coins+=20;return say(s,'終幕　また会う夜へ',f.endingChoice==='river'?'小さな舟に灯りをのせると、運河にもうひとつの星空が生まれた。街の人たちは岸辺を歩き、見送りながら次の約束を交わす。祭りが終わっても、会いに来られる場所がここにある。':'広場の灯りをいっせいに掲げると、時計塔から十二の音が降りてきた。市場の窓も、庭園の花も、ひとつずつ輝きだす。あなたが戻した時間は、街のみんなの次の夜へ続いていく。',[],{notice:'物語をクリア。寄り道と街歩きは引き続き楽しめる。'});}return say(previous,target.name,'時計の音が戻ったね。影は、終わる夜を怖がっていたんだ。最後の灯りは、どこへ届けよう？',[choice('ending-lanterns','広場のみんなと、灯りを掲げる'),choice('ending-river','運河に灯りの舟を流す')]);}
    return say(previous,target.name,f.ending?'おかえり。祭りの夜は、何度だって歩いていいんだよ。':objective(s));
  }
  if(targetId==='baker'){
    if(f.intro&&!f.breadTaken){if(choiceId==='bread'){f.breadTaken=true;s.inventory.festivalBread=1;return say(s,target.name,'リュカへの包み、お願いね。城の西の道で待っているよ。橋は三つ、どれを渡っても東の街へ行けるよ。');}return say(previous,target.name,'リュカに頼まれた旅人さんね。門の見張りを交代できないあの子に、焼きたての月麦パンを届けて。',[choice('bread','パンの包みを預かる')]);}
    return say(previous,target.name,f.breadDelivered?'包みを届けてくれてありがとう。今夜はシナモンとお星さまの香り！':'ようこそ月麦市場へ。城の西の道にいるリュカが、何か困っているみたい。');
  }
  if(targetId==='waxkeeper'){
    if(f.breadDelivered&&!f.wickTaken){if(choiceId==='wick'){f.wickTaken=true;s.inventory.wick=1;return say(s,target.name,'この月糸なら三つとも、ともせるよ。市場の灯籠、噴水の西の灯籠、橋を渡った庭園の灯籠。灯りの糸はなくならないから、安心して。');}return say(previous,target.name,'パンの約束を届けた人には、この月糸の灯芯を。',[choice('wick','月糸の灯芯を受け取る')]);}
    if(choiceId==='buy'){if(s.coins<10)return notice(previous,'星蜜の小瓶は10ルーメン。今の持ち金では足りない。');if((s.inventory.tonic||0)>=99)return notice(previous,'星蜜の小瓶をこれ以上持てない。');s.coins-=10;s.inventory.tonic=(s.inventory.tonic||0)+1;return say(s,target.name,'星蜜をひとつどうぞ。戦闘中に28回復できるよ。',[choice('buy','もう一つ買う · 10ルーメン')]);}
    return say(previous,target.name,f.breadDelivered?'月糸の灯りは、消えた灯籠に近づけば結べるよ。旅のお守りに星蜜はいかが？':'灯守のリュカが待っているよ。先に、あの子の頼みごとを聞いてあげて。',[choice('buy','星蜜の小瓶 · 10ルーメン')]);
  }
  if(TOWN_LAMPS.includes(targetId)){
    if(f.lamps.includes(targetId))return say(previous,target.name,'灯籠は静かにまたたき、通りをあたたかく照らしている。');
    if(!f.wickTaken)return say(previous,target.name,'灯芯がすっかり傷んでいる。城の西の道の灯守に話し、市場の月糸の店を訪ねよう。');
    f.lamps.push(targetId);return say(s,target.name,`月糸を結ぶと、小さな星のように灯りがふくらんだ。${f.lamps.length===3?'三つの灯籠がともった。リュカに知らせよう。':`あと${3-f.lamps.length}つの灯籠に、光を届けよう。`}`,[],{notice:`街の灯り ${f.lamps.length}/3`});
  }
  if(targetId==='archivist'){
    if(f.stamps.length===3&&!f.starComplete){f.starComplete=true;s.inventory.starCharm=1;s.maxHp=72;s.hp=Math.min(72,s.hp+12);return say(s,target.name,'街の三つの星、全部見つけたんだね。これは三ツ星の護符。目印をたどった旅人を、ずっと見守ってくれるよ。',[],{notice:'三ツ星の護符を受け取った。最大体力が12増えた。'});}
    if(f.act1Complete&&!f.riverClue){f.riverClue=true;return say(s,target.name,'水門の星歯車は、工房の三色の音で調律するの。「夕暮れの琥珀 → 水の青 → 月の銀」。それから庭園の月映しの水を。二つがそろえば南の水門を直せる。机の記録でも読み返せるよ。');}
    return say(previous,target.name,f.riverClue?'調律の順番は「琥珀 → 青 → 銀」。星の印を三つ見つけたら、また教えて。':'街の片隅には三つの星の印が隠れているの。市場、運河、庭園。集めてきたら、小さなお礼を。');
  }
  if(targetId==='river-book'){
    if(!f.act1Complete)return say(previous,target.name,'古い図に、水門と三色の星が描かれている。街の灯りを取り戻したら、司書に聞いてみよう。');
    f.riverClue=true;return say(s,target.name,'〈水門の記録〉 星歯車の調律は「琥珀 → 青 → 銀」。星歯車に月映しの水を注ぎ、流れを選ぶ。静かな流れは影の力を弱め、きらめく流れは旅人の灯りを満たす。');
  }
  if(targetId==='clocksmith')return say(previous,target.name,f.act1Complete?'星歯車は中央の調律盤で目を覚ます。正しい三つの色を続けて鳴らしてみて。わからなければ東の夜の書庫へ。':'街の灯りが止まると、歯車も眠るんだ。まずは灯守のリュカを手伝ってあげて。');
  if(targetId==='gear-console'){
    if(f.gearTaken)return say(previous,target.name,'調律盤は澄んだ和音を奏でている。星歯車は受け取り済みだ。');
    if(!f.act1Complete)return say(previous,target.name,'三色の石は、街の灯りを待って眠っている。');
    const order=['amber','blue','silver'];
    if(order.includes(choiceId)){if(choiceId===order[f.gearNotes.length])f.gearNotes.push(choiceId);else f.gearNotes=[];if(f.gearNotes.length===3){f.gearTaken=true;s.inventory.gear=1;return say(s,target.name,'琥珀、青、銀。三つの音が重なり、星歯車がゆっくり回り始めた。庭園の月映しの水といっしょに、南の水門へ運ぼう。',[],{notice:'星歯車を受け取った。'});}}
    return say(s,target.name,`${f.gearNotes.length?`${f.gearNotes.length}つの音が調和した。次の色は？`:'三つの色を、物語の順に鳴らそう。間違えても最初からやり直せる。夜の書庫に古い記録がある。'}`,[choice('amber','琥珀の音'),choice('blue','青の音'),choice('silver','銀の音')]);
  }
  if(targetId==='gardener')return say(previous,target.name,f.gardenVictory?'泉の霧もおとなしくなったね。水に映った月は、遠くへ持ち出してもやさしいんだ。':'庭園の泉には、灯りをまねする霧がいるの。強い波が来る前に守って、灯りがたまったら放ってみて。体力が減ったら星蜜の小瓶を。');
  if(targetId==='moon-pool'){
    if(!f.act1Complete)return say(previous,target.name,'泉は霧に包まれている。先に街の灯籠をともして、灯守から水門の鍵を受け取ろう。');
    if(f.moonwaterTaken)return say(previous,target.name,'澄んだ泉に、月とあなたの灯りが揺れている。');
    if(!f.gardenVictory){if(choiceId==='mist-battle')return {state:previous,battle:'canal-mist'};return say(previous,target.name,'丸くふくらんだ霧が行く手をふさいだ。攻撃と守りで灯りをため、強い光で霧をほどこう。',[choice('mist-battle','灯りをかざして、霧に向き合う')]);}
    f.moonwaterTaken=true;s.inventory.moonwater=1;return say(s,target.name,'泉から月映しの水を、小さな瓶に分けてもらった。星歯車とそろったら、運河南の古い水門へ。',[],{notice:'月映しの水を受け取った。'});
  }
  if(targetId==='boatwarden')return say(previous,target.name,f.sluiceRepaired?`ほら、水が${f.route==='quiet'?'静かに':'星を散らして'}流れてる。時計塔の扉も開いたよ。北東の通りを上がってみて。`:f.act1Complete?'南の水門には星歯車と月映しの水が必要なんだ。書庫は東の大通り、工房は広場の西。庭園は南東だよ。':'西と東をつなぐ橋は、北の市場橋、中央の広場橋、南の花橋。流れを眺めて、のんびり歩こう。');
  if(targetId==='sluice'){
    if(f.sluiceRepaired)return say(previous,target.name,'星歯車が回り、水が時計塔へと流れていく。北東の時計塔へ向かおう。');
    if(!f.act1Complete||!f.gearTaken||!f.moonwaterTaken)return say(previous,target.name,'水門のくぼみには、調律した星歯車と月映しの水が必要だ。夜の書庫で手がかりを聞こう。');
    if(['route-quiet','route-bright'].includes(choiceId)){f.route=choiceId==='route-quiet'?'quiet':'bright';f.sluiceRepaired=true;delete s.inventory.gear;delete s.inventory.moonwater;s.hp=s.maxHp;s.energy=f.route==='bright'?3:1;s.checkpoint={mapId:s.mapId,position:{...s.position}};return say(s,target.name,f.route==='quiet'?'水をゆっくり流すと、街の影が穏やかに揺れた。時計塔の影の力が弱まる。北東の時計塔の扉が開いた。':'水を光の輪へ放つと、運河に星が散った。灯りが満ちて力がわく。北東の時計塔の扉が開いた。',[],{notice:'第二幕をクリア。体力が回復し、時計塔が開いた。'});}
    return say(previous,target.name,'歯車をはめ、水を注いだ。どんな流れを街に戻そう？ この選択が、時計塔であなたを助ける。',[choice('route-quiet','静かな流れ · 影の攻撃を弱める'),choice('route-bright','きらめく流れ · 灯りを満タンにする')]);
  }
  if(targetId==='clock-heart'){
    if(!f.clockVictory){if(choiceId==='clock-battle')return {state:previous,battle:'clock-shadow'};return say(previous,target.name,'影がささやく。「夜が終わったら、誰も戻ってこない？」 時計の中で、最後の音が迷子になっている。',[choice('clock-battle','また会いに来ると約束する')]);}
    if(!f.clockRestored){f.clockRestored=true;s.hp=s.maxHp;return say(s,target.name,'時計の針がひとつ進む。窓の外に、灯籠・庭園・運河の光がつながった。「また来るよ」。その言葉が、十二時の最後の音になった。城の西の道のリュカへ戻ろう。');}
    return say(previous,target.name,'大時計は、街と同じ速さで時を刻んでいる。');
  }
  if(targetId==='masked'){
    if(f.ribbonTaken&&!f.maskComplete){if(choiceId==='ribbon'){f.maskComplete=true;delete s.inventory.ribbon;s.coins+=12;return say(s,target.name,'このリボン！ コハクが持っていたのね。これで夜の仮面が完成する。ありがとう、12ルーメンを受け取って。',[],{notice:'「猫コハクと迷子のリボン」をクリア。'});}return say(previous,target.name,'そのリボン、探していたものかもしれない。',[choice('ribbon','リボンを見せる')]);}
    if(!f.maskStarted){f.maskStarted=true;return say(s,target.name,'仮面のリボンが風で飛ばされてしまったの。宿屋の東で猫のコハクを見かけたら、聞いてみてくれる？');}
    return say(previous,target.name,f.maskComplete?'仮面の向こうに、誰の笑顔があるか。今夜はそれを楽しむの。':'コハクは宿屋の東の路地が好きなの。市場から南へ歩いてみて。');
  }
  if(targetId==='cat'){
    if(f.maskStarted&&!f.ribbonTaken){f.ribbonTaken=true;s.inventory.ribbon=1;return say(s,target.name,'にゃ。コハクはベンチの下を前足で指した。そこには銀色のリボン。市場の仮面職人セラに届けよう。',[],{notice:'迷子の仮面のリボンを見つけた。'});}
    return say(previous,target.name,'にゃあ。コハクは尻尾をくるりと巻いて、あなたの灯りを見つめている。');
  }
  if(TOWN_STAMPS.includes(targetId)){
    if(f.stamps.includes(targetId))return say(previous,target.name,'手帳には、この場所の星印がもう写し取ってある。');
    f.stamps.push(targetId);return say(s,target.name,`手帳に星印を写し取った。${f.stamps.length===3?'三つそろった。夜の書庫の司書フィオに見せよう。':`三つの星のうち${f.stamps.length}つ目。ほかの印も探してみよう。`}`,[],{notice:`星の散歩 ${f.stamps.length}/3`});
  }
  if(targetId==='innkeeper'||targetId==='bench'){
    if(choiceId==='rest'){s.hp=s.maxHp;s.energy=1;s.checkpoint={mapId:s.mapId,position:{...s.position}};return say(s,target.name,'あたたかな灯りの下で、ゆっくりひと休みした。体力がすべて戻った。ここからまた、歩き出そう。',[],{notice:'体力が回復した。ここが新しい休憩場所になった。'});}
    return say(previous,target.name,targetId==='innkeeper'?'三日月亭へようこそ。祭りを手伝う旅人さんの休憩は、お代をいただかない決まりなの。':'運河を渡る風は、パンと花の匂いがする。ひと休みしていこうか。',[choice('rest','休んで体力を回復する')]);
  }
  if(targetId==='fountain')return say(previous,target.name,f.ending?'噴水のしずくに、小さな祭りの光がいくつも映っている。時計塔の音が、街の向こうまで届いた。':'噴水の水面に、止まった時計塔が映っている。街の灯りが戻れば、水もまた動き始めるだろう。');
  return say(previous,target.name,'祭りの街の片隅に、小さな物語が息づいている。');
}
