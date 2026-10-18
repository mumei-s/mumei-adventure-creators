// One visible action for the nearest real target. No generic "inspect" duplicate.
export function resolveContextAction({feature=null,exit=null,creator=null,resident=null,monster=null,scenery=null}={}){
 const candidates=[exit&&{...exit,kind:'exit',priority:0},feature&&{...feature,kind:'feature',priority:1},resident&&{...resident,kind:'resident',priority:2},creator&&{...creator,kind:'creator',priority:3},monster&&{...monster,kind:'monster',priority:4},scenery&&{...scenery,kind:'scenery',priority:5}]
  .filter(value=>value&&Number.isFinite(value.distance)&&value.distance>=0&&value.available!==false);
 candidates.sort((a,b)=>a.distance-b.distance||a.priority-b.priority);
 return candidates[0]||null;
}
export function actionButtonFor(target){return target?.kind==='creator'||target?.kind==='resident'?'creator-open':target?.kind==='monster'?'battle-open':target?'interact':null;}
