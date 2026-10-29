/** Authored combat timing. Pure data only: no renderer, DOM or random state.
 * All distances are world units; camera.push/pullback are fractions of the
 * fitted camera distance and camera.orbit is radians. */
const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,Number.isFinite(value)?value:0));
const smooth=value=>{const p=clamp(value);return p*p*(3-2*p);};
const progress=(time,start,end)=>clamp((time-start)/Math.max(.001,end-start));
const bell=(time,start,end)=>time<start||time>end?0:Math.sin(progress(time,start,end)*Math.PI);
const hasCounter=effect=>!!effect&&!effect.finished&&((effect.retaliation||0)>0||(effect.blocked||0)>0);

/** The UI and renderer share the same duration, including fully blocked hits. */
export function overlordActionDuration({type='shine',counterSpecial=false,retaliation=0,blocked=0,finished=false,motion=true}={}){
 if(!motion)return .12;
 if(finished)return 1.4;
 if(retaliation>0||blocked>0){
  if(counterSpecial)return 3.2;
  return type==='guard'?1.65:type==='attack'?1.85:2.1;
 }
 return type==='guard'?.9:type==='attack'?1.05:1.15;
}

function timeline(effect,motion){
 const kind=effect?.type||'shine',duration=overlordActionDuration({...effect,motion});
 const hit=kind==='attack'?.43:kind==='guard'?.24:.58;
 const counterStart=effect?.counterSpecial?1.35:kind==='guard'?.43:kind==='attack'?.72:.90;
 return {kind,duration,hit,chargeEnd:kind==='attack'?.13:kind==='guard'?.20:.28,
  counterStart,counterEnd:duration-.18};
}

function phaseName(phase,kind,special){
 if(phase==='entrance')return '覇王が歩み寄る';
 if(phase==='victory')return '決着・影がほどける';
 if(phase==='rest')return 'ひと息つこう';
 if(phase==='player-charge')return kind==='guard'?'守りを広げる':kind==='attack'?'踏み込む':'光を集める';
 if(phase==='player-impact')return kind==='guard'?'ランタンを守る':kind==='attack'?'杖で影を払う':'光を放つ';
 if(phase==='charge')return special?'五本の剣が集う':'覇王が狙いを定める';
 if(phase==='cast')return special?'五剣を迎え撃つ':'覇王の一閃';
 if(phase==='impact')return kind==='guard'?'攻撃を受け止める':'衝撃が走る';
 if(phase==='settle')return '次の一手へ';
 return '予告を見て、次の一手を選ぶ';
}

/** A continuous encounter rather than a sequence of disconnected stills.
 * A resolved turn already contains the post-hit HP; reconstruct its starting
 * value so the room changes when the hit lands, not when the button is pressed.
 * Reduced motion keeps the final palette, but removes every moving cue. */
export function overlordBattleDirector({battle={},effect=null,time=0,motion=true,start=0}={}){
 const clock=motion?Math.max(0,Number.isFinite(time)?time:0):0;
 const age=effect&&motion?Math.max(0,clock-(Number.isFinite(effect.started)?effect.started:0)):0;
 const line=timeline(effect,motion),{kind,duration,hit,counterStart,counterEnd}=line;
 const finished=!!effect?.finished||battle.status==='won';
 const live=!!effect&&motion&&age<duration;
 const entrance=effect||!motion?2.6:Math.max(0,clock-(Number.isFinite(start)?start:0));
 const intro=clamp(entrance/2.6),walkProgress=smooth((entrance-1.55)/1.05);
 const fullCounter=hasCounter(effect)&&!finished;
 const special=fullCounter&&!!effect.counterSpecial;
 const counterProgress=fullCounter?progress(age,counterStart,counterEnd):0;
 const counterActive=!!(live&&fullCounter&&age>=counterStart&&age<=counterEnd);
 const chargeEnd=counterStart+(counterEnd-counterStart)*(special?.24:.20);
 const counterCharge=counterActive?bell(age,counterStart,chargeEnd):0;
 const playerImpact=live&&kind!=='guard'?bell(age,hit-.05,hit+.23):0;
 const playerTravel=live?progress(age,line.chargeEnd,hit):0;
 const playerCharge=live?bell(age,0,line.chargeEnd):0;
 const shield=live&&kind==='guard'?smooth(age/.15)*(1-smooth((age-duration+.20)/.20)):0;
 const blades=Array.from({length:5},(_,index)=>{
  if(!live||!fullCounter||(!special&&index!==2))return {active:false,launch:0,travel:0,impact:0};
  const launchAt=chargeEnd+(special?index*.105:0),travelDuration=special?.38:Math.max(.18,(counterEnd-chargeEnd)*.55),arrival=launchAt+travelDuration;
  const active=age>=launchAt&&age<=arrival+.22;
  return {active,launch:smooth((age-launchAt)/.11),travel:smooth(progress(age,launchAt,arrival)),impact:bell(age,arrival-.025,arrival+.20)};
 });
 const impact=blades.reduce((value,blade)=>Math.max(value,blade.impact),0);
 const maxSpirit=Math.max(1,Number.isFinite(battle.maxSpirit)?battle.maxSpirit:30);
 const current=clamp((Number.isFinite(battle.spirit)?battle.spirit:maxSpirit)/maxSpirit);
 const previous=clamp(current+Math.max(0,effect?.damage||0)/maxSpirit);
 const hitBlend=!motion||!effect?1:smooth((age-hit+.04)/.28);
 const health=previous+(current-previous)*hitBlend;
 const gold=finished?(!motion||!effect?1:smooth((age-.85)/1.05)):0;
 const rage=clamp((.64-health)/.36)*(1-gold);
 const portal=clamp(rage*.82+counterCharge*(special?.30:.08))*(1-gold);
 const pulse=motion?.55+Math.sin(clock*(1.15+rage*.7))*.18:0;
 let phase=intro<1?'entrance':battle.status==='rest'&&(!live||age>=counterEnd)?'rest':finished&&(!motion||age>=.85)?'victory':!live?'idle':
  counterActive?(age<chargeEnd?'charge':impact>.01?'impact':'cast'):age<line.chargeEnd?'player-charge':age<hit+.23?'player-impact':'settle';
 let state=intro<1?(entrance<.28?'seated':entrance<1.55?'stand':'walk'):phase==='victory'?'defeat':counterActive?(special?'special':'attack'):playerImpact>0&&(effect.damage||0)>0?'hit':'idle';
 const hitRecoil=live&&kind!=='guard'?bell(age,hit-.02,hit+.30):0;
 const heroAdvance=live&&kind==='attack'?bell(age,.10,.72)*.46:0;
 const heroRecoil=impact*(kind==='guard'?.035:.11);
 const ambience=motion&&intro===1&&!finished;
 const shake=motion&&impact>0?impact*(special?.018:.009)*(kind==='guard'?.65:1):0;
 return {
  duration:effect?duration:0,intro,age,walkProgress,state,phase,phaseLabel:phaseName(phase,kind,special),
  attackProgress:counterActive?counterProgress:progress(age,line.chargeEnd,hit+.23),
  environment:{rage,gold,portal,emberSpeed:motion?.16+rage*.55+counterCharge*.25:0,wind:motion?.14+rage*.46+counterCharge*.35:0,floorGlow:clamp(rage*.6+counterCharge*.6+impact*.22)*(1-gold),pulse},
  camera:{push:motion?playerCharge*.025+counterCharge*(special?.065:.025)+(ambience?Math.sin(clock*.23)*.004:0):0,
   orbit:ambience?Math.sin(clock*.14)*.014:0,pullback:motion&&special?bell(age,chargeEnd,counterEnd)*.065:0,
   shakeX:shake*Math.sin(clock*47),shakeY:shake*Math.cos(clock*39)*.6},
  actors:{heroAdvance,heroLift:live&&kind==='attack'?bell(age,.10,.65)*.045:0,heroRecoil,bossRecoil:hitRecoil*.095,bossLean:counterCharge*(special?.14:.06),swordFlare:counterActive&&special?smooth(counterProgress/.26):rage*.12},
  player:{kind:effect?kind:null,active:live&&kind!=='guard'&&age<=hit+.23,charge:playerCharge,travel:playerTravel,impact:playerImpact,shield},
  counter:{active:counterActive,special,progress:counterProgress,charge:counterCharge,impact},blades
 };
}
