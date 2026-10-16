/** Render-independent motion. Distances use the caller's world units; time is seconds.
 * These helpers only move coordinates. They do not invent intermediate body poses.
 */
export const TAU = Math.PI * 2;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const finite=(n,fallback=0)=>Number.isFinite(n)?n:fallback;
export function locomotionPhase(distance,strideLength=1){
  if(!Number.isFinite(strideLength)||strideLength<=0)throw new TypeError('Invalid stride length');
  return ((finite(distance)/strideLength*TAU)%TAU+TAU)%TAU;
}
export function facingForVector(x,z,previous='down'){
  return Math.hypot(x,z)<1e-8?previous:Math.abs(x)>Math.abs(z)?x>0?'right':'left':z>0?'down':'up';
}
export function yawForVector(x,z,previous=0){return Math.hypot(x,z)<1e-8?previous:Math.atan2(x,z);}
export function shortestTurn(from,to){return ((to-from+Math.PI)%TAU+TAU)%TAU-Math.PI;}
/** Exact integral of dv/dt=(target-v)/response, including distance travelled.
 * Partitioning one input interval into 30, 60 or 120 Hz frames gives the same path.
 * A resumed tab must reset its clock; maxDelta is an additional jump guard.
 */
export function integrateVelocity(velocity,target,dt,{acceleration=.12,braking=.09,maxDelta=.05}={}){
  if(!Number.isFinite(acceleration)||acceleration<=0||!Number.isFinite(braking)||braking<=0||!Number.isFinite(maxDelta)||maxDelta<=0)throw new TypeError('Invalid motion response');
  const vx=finite(velocity?.x),vz=finite(velocity?.z),tx=finite(target?.x),tz=finite(target?.z),step=clamp(finite(dt),0,maxDelta);
  // Use one response for each fixed input interval. Switching response based on
  // current speed would reintroduce frame-rate dependent reversal thresholds.
  const response=Math.hypot(tx,tz)<1e-8?braking:acceleration;
  const decay=Math.exp(-step/response),area=response*(1-decay);
  return {x:tx+(vx-tx)*decay,z:tz+(vz-tz)*decay,dx:tx*step+(vx-tx)*area,dz:tz*step+(vz-tz)*area,dt:step};
}
/** Collision-aware integration; phase is based only on accepted travel.
 * move(position,dx,dz) must perform the game's ordinary swept collision checks.
 */
export function advanceLocomotion(previous,target,dt,{move=(p,dx,dz)=>({...p,x:p.x+dx,z:p.z+dz}),strideLength=1,...response}={}){
  const step=integrateVelocity(previous.velocity,target,dt,response),before=previous.position;
  const position=move(before,step.dx,step.dz),dx=position.x-before.x,dz=position.z-before.z,distance=Math.hypot(dx,dz),total=finite(previous.distance)+distance;
  // Remove blocked velocity components rather than accumulating pressure at walls.
  const velocity={x:Math.abs(dx-step.dx)>1e-7?0:step.x,z:Math.abs(dz-step.dz)>1e-7?0:step.z};
  return {position,velocity,distance:total,phase:locomotionPhase(total,strideLength),walking:distance>1e-7,facing:facingForVector(dx,dz,previous.facing),speed:Math.hypot(velocity.x,velocity.z)};
}
/** Finite path history sampled by travelled distance, never by a frame index.
 * Both an anchor and the latest sample are retained within minSpacing, so slow
 * subpixel motion cannot evict the whole useful path at high refresh rates.
 */
export function createDistanceTrail({maxDistance=3,maxSamples=128,minSpacing=.015,teleportDistance=2,strideLength=.68}={}){
  if(!Number.isFinite(maxDistance)||maxDistance<=0||!Number.isInteger(maxSamples)||maxSamples<2||!Number.isFinite(minSpacing)||minSpacing<=0||!Number.isFinite(teleportDistance)||teleportDistance<=0||!Number.isFinite(strideLength)||strideLength<=0)throw new TypeError('Invalid trail budget');
  let samples=[],distance=0,origin=null;
  const reset=()=>{samples=[];distance=0;origin=null;};
  return {
    reset,
    push(point){
      if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.z))return false;
      const last=samples.at(-1),step=last?Math.hypot(point.x-last.x,point.z-last.z):0;
      if(last&&step>teleportDistance){reset();}
      else if(last){if(step<1e-9)return false;distance+=step;}
      const sample={x:point.x,z:point.z,facing:point.facing||last?.facing||'down',distance};
      origin??=Object.freeze({...sample});
      if(samples.length>1&&samples.at(-1).distance-samples.at(-2).distance<minSpacing)samples[samples.length-1]=sample;
      else samples.push(sample);
      while(samples.length>maxSamples||samples.length>2&&samples[1].distance<distance-maxDistance)samples.shift();
      return true;
    },
    sample(lagDistance=.42){
      if(!samples.length)return null;
      const target=Math.max(samples[0].distance,distance-Math.max(0,finite(lagDistance))),head=samples.at(-1);
      let a=samples[0],b=a;
      for(let i=1;i<samples.length;i++){b=samples[i];if(b.distance>=target)break;a=b;}
      const fraction=b.distance>a.distance?clamp((target-a.distance)/(b.distance-a.distance),0,1):0;
      const x=a.x+(b.x-a.x)*fraction,z=a.z+(b.z-a.z)*fraction;
      return {x,z,facing:facingForVector(b.x-a.x,b.z-a.z,b.facing),distance:target,phase:locomotionPhase(target,strideLength),lag:head.distance-target,headDistance:distance,origin};
    },
    status(){return{samples:samples.length,distance,retainedDistance:samples.length?distance-samples[0].distance:0,maxDistance,maxSamples};},
  };
}
