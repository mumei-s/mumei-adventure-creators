/** Existing battle clocks drive the enemy's own joints; no extra turn/damage. */
export function enemyRigEffect(effect,time,{won=false}={}){
 if(!effect||won||!Number.isFinite(time)||!Number.isFinite(effect.started))return null;
 if(effect.type==='enemy'){
  const duration=Number.isFinite(effect.duration)&&effect.duration>0?effect.duration:.55;
  return time>=effect.started&&time<effect.started+duration?{...effect,type:'attack',duration}:null;
 }
 if(!['attack','shine'].includes(effect.type)||!(effect.retaliation>0))return null;
 const offset=effect.type==='shine'?1.9:.68,started=effect.started+offset,duration=effect.type==='shine'?.5:.52;
 return time>=started&&time<started+duration?{type:'attack',started,duration}:null;
}
