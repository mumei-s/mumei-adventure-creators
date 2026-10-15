export const WALKING_SPEED_KEY='halloween-exhibition:walking-speed:v1';
export function normalizeWalkingSpeed(value){const n=Number(value);return value===null||value===''||!Number.isFinite(n)?1:Math.max(.5,Math.min(2,Math.round(n*4)/4));}
export function advanceWithSubsteps(state,dx,dz,move){const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.2));for(let i=0;i<steps;i++)state=move(state,dx/steps,dz/steps);return state;}
