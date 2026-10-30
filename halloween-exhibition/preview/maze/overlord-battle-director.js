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
  if(!live||!fullCounter||(!special&&index!==2))return {active:false,visible:false,summon:0,opacity:0,launch:0,travel:0,impact:0};
  const launchAt=chargeEnd+(special?index*.105:0),travelDuration=special?.38:Math.max(.18,(counterEnd-chargeEnd)*.55),arrival=launchAt+travelDuration;
  const active=age>=launchAt&&age<=arrival+.22;
  const summonAt=counterStart+(special?index*.035:0),summon=smooth(progress(age,summonAt,Math.min(launchAt,summonAt+.20)));
  const visible=age>=summonAt&&age<=arrival+.14,opacity=visible?summon*(1-smooth(progress(age,arrival,arrival+.14))):0;
  return {active,visible,summon,opacity,launch:smooth((age-launchAt)/.11),travel:smooth(progress(age,launchAt,arrival)),impact:bell(age,arrival-.025,arrival+.20),impactProgress:progress(age,arrival-.025,arrival+.20)};
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
 // Pose transitions use the same clock as the visible effects and commands.
 // A low frame rate may drop intermediate poses, but cannot stretch them out.
 const stateElapsed=state==='stand'?Math.max(0,entrance-.28):state==='walk'?Math.max(0,entrance-1.55):state==='defeat'?(!motion||!effect?1.4:Math.max(0,age-.85)):state==='hit'?Math.max(0,age-hit+.05):counterActive?Math.max(0,age-counterStart):0;
 // A body pose needs its own action clock. Projectile travel is already late
 // when the queen takes a hit, so reusing that value skipped most of her recoil.
 // Both art renderers consume this same normalized pose, including after a
 // dropped frame; only the surrounding effects use their separate clocks.
 const bodyDuration=state==='seated'?.28:state==='stand'?1.27:state==='walk'?1.05:state==='defeat'?1.4:state==='hit'?.28:counterActive?counterEnd-counterStart:0;
 const bodyProgress=bodyDuration?clamp(stateElapsed/bodyDuration):0;
 const lastArrival=chargeEnd+(special?.42:0)+(special?.38:Math.max(.18,(counterEnd-chargeEnd)*.55));
 const bodyPhase=counterActive?(age<chargeEnd?'charge':age<lastArrival?'release':'recovery'):state==='hit'?'recoil':state;
 const body={phase:bodyPhase,duration:bodyDuration,progress:bodyProgress,
  charge:counterActive?smooth(progress(age,counterStart,chargeEnd)):0,
  release:counterActive?progress(age,chargeEnd,lastArrival):0,
  recovery:counterActive?progress(age,lastArrival,counterEnd):0};
 const hitRecoil=live&&kind!=='guard'?bell(age,hit-.02,hit+.30):0;
 const heroAdvance=live&&kind==='attack'?bell(age,.10,.72)*.46:0;
 const heroRecoil=impact*(kind==='guard'?.035:.11);
 const ambience=motion&&intro===1&&!finished;
 const shake=motion&&impact>0?impact*(special?.018:.009)*(kind==='guard'?.65:1):0;
 // The room is physically present between actions, then opens into a flowing
 // astral passage for a counter. A quiet full-health room can still perform a
 // spectacular special; its visual change does not depend on low HP.
 const rift=motion&&counterActive?smooth((age-counterStart)/.16)*(1-smooth((age-counterEnd+.15)/.15))*(special?1:.58):0;
 const stream=motion?clamp(rift*.85+playerCharge*.48+impact*.22):0;
 const flash=motion?clamp(playerImpact*.18+impact*(special?.44:.24),0,.58):0;
 const shock=motion?clamp(impact+playerImpact*.75):0;
 const strongestBlade=blades.reduce((best,blade)=>blade.impact>best.impact?blade:best,{impact:0,impactProgress:0});
 const shockTravel=motion?(impact>playerImpact*.75?strongestBlade.impactProgress:progress(age,hit-.05,hit+.23)):0;
 const victoryRays=motion?gold:0;
 // Move around a deliberate subject during anticipation, then widen for the
 // actual five-blade arrival. Both arcs return continuously before input resumes.
 const commandOrbit=live?bell(age,0,hit+.25)*(kind==='attack'?-.025:kind==='guard'?.016:.025):0;
 const counterOrbit=counterActive?bell(age,counterStart,counterEnd)*(special?-.045:-.025):0;
 const settlePullback=counterActive?bell(age,chargeEnd,counterEnd)*(special?.095:.025):0;
 const impactTarget=playerImpact*.75>=impact?'boss':'hero';
 return {
  duration:effect?duration:0,intro,age,walkProgress,state,stateElapsed,phase,phaseLabel:phaseName(phase,kind,special),
  attackProgress:bodyProgress,body,
  environment:{rage,gold,portal,rift,stream,flash,shock,shockTravel,impactTarget,eclipse:rift*(special?1:.35),victoryRays,hallVisibility:1-rift*.84,emberSpeed:motion?.16+rage*.55+counterCharge*.25+stream*.5:0,wind:motion?.14+rage*.46+counterCharge*.35+rift*.4:0,floorGlow:clamp(rage*.6+counterCharge*.6+impact*.22+rift*.35)*(1-gold),pulse},
  camera:{push:motion?playerCharge*.04+counterCharge*(special?.075:.045)+(ambience?Math.sin(clock*.23)*.004:0):0,
   orbit:motion?commandOrbit+counterOrbit+(ambience?Math.sin(clock*.14)*.014:0):0,pullback:motion?settlePullback:0,
   shakeX:shake*Math.sin(clock*47),shakeY:shake*Math.cos(clock*39)*.6},
  actors:{heroAdvance,heroLift:live&&kind==='attack'?bell(age,.10,.65)*.045:0,heroRecoil,bossRecoil:hitRecoil*.095,bossLean:counterCharge*(special?.14:.06),swordFlare:counterActive&&special?smooth(counterProgress/.26):rage*.12},
  player:{kind:effect?kind:null,active:live&&kind!=='guard'&&age<=hit+.23,charge:playerCharge,travel:playerTravel,impact:playerImpact,shield},
  counter:{active:counterActive,special,progress:counterProgress,charge:counterCharge,impact},blades
 };
}
