/** Shape-preserving motion for the two original nonhuman mascots.
 * Bread has one white two-joint appendage. Flower has two tiny feet,
 * its original book and die. No human limb artwork is introduced.
 */
import {createOwnerRig,OWNER_ATTACK_DURATION} from './owner-rig.js?v=20261017-rig2';
const finite=(n,f)=>Number.isFinite(n)?n:f;
const point=(v,f)=>Array.isArray(v)&&v.length===2&&v.every(Number.isFinite)?{x:v[0],y:v[1]}:{...f};
const tip=(a,length,angle)=>({x:a.x+Math.cos(angle)*length,y:a.y+Math.sin(angle)*length});

export function createMascotRig({archetype,manifest={},...options}={}){
 const kind=archetype||manifest.archetype;
 if(!['bread','flower'].includes(kind))throw new TypeError('Unknown mascot anatomy');
 const baseShape=manifest.rig||{},bodyHeight=finite(baseShape.bodyHeight,108);
 if(bodyHeight<=0)throw new TypeError('Positive mascot body height is required');
 // The supports are invisible inside the lower body; only the two painted
 // tiny feet are drawn. Their world contacts use the common physical solver.
 const legLength=Math.max(74,finite(baseShape.legLength,80));
 const skeleton={thigh:legLength*.49,shin:legLength*.51,hipHeight:legLength*.82,hipHalfWidth:Math.max(1,finite(baseShape.footSpacing,14))};
 const shadow={...manifest,rig:skeleton,views:Object.fromEntries(Object.entries(manifest.views||{}).map(([key,v])=>[key,{...v,rig:{}}]))};
 const source=createOwnerRig({...options,manifest:shadow});
 let last=null,disposed=false,version=0;
 function transform(pose){
  const shape={...baseShape,...manifest.views?.[pose.view]?.rig},bodyCenter=point(shape.bodyCenter,{x:0,y:-56}),bodyHeight=finite(shape.bodyHeight,108);
  const layers=[],joints={body:{...bodyCenter}},add=(part,origin,height,rotation=0)=>layers.push({part,origin:{...origin},height,rotation,scaleX:1,scaleY:1});
  const time=pose.time,act=pose.action,attack=act.kind==='attack'?Math.sin(Math.PI*Math.min(1,act.elapsed/OWNER_ATTACK_DURATION)):0;
  if(kind==='bread'){
   const root=point(shape.appendageRoot,{x:bodyCenter.x+bodyHeight*.27,y:bodyCenter.y+bodyHeight*.2}),a=finite(shape.appendageBase,24),b=finite(shape.appendageTip,24);
   if(a<=0||b<=0)throw new TypeError('Positive appendage lengths are required');
   const angle=finite(shape.appendageAngle,1.25)+Math.sin(time*2.2)*.2-attack*.7,middle=tip(root,a,angle),end=tip(middle,b,angle+finite(shape.appendageBend,0)+Math.sin(time*2.2-.5)*.28);
   joints.appendageRoot=root;joints.appendageJoint=middle;joints.appendageTip=end;
   add('appendageBase',root,a,angle-Math.PI/2);layers.at(-1).boneEnd=middle;
   add('appendageTip',middle,b,Math.atan2(end.y-middle.y,end.x-middle.x)-Math.PI/2);layers.at(-1).boneEnd=end;
   add('body',bodyCenter,bodyHeight);
  }else{
   for(const side of ['right','left']){
    const ankle=pose.joints[side+'Ankle'];joints[side+'Foot']={...ankle};
    add(side+'Foot',ankle,finite(shape.footHeight,9),pose.feet[side].contact?0:Math.sin(pose.gaitPhase+(side==='left'?0:Math.PI))*.16);
   }
   add('body',bodyCenter,bodyHeight);
   const petals=point(shape.petalOffset,bodyCenter);joints.petals=petals;
   add('petalRing',petals,finite(shape.petalHeight,bodyHeight),Math.sin(time*1.5)*.018);
   add('face',point(shape.faceOffset,bodyCenter),finite(shape.headHeight,bodyHeight*.8));
   const book=point(shape.bookOffset,{x:bodyCenter.x-bodyHeight*.3,y:bodyCenter.y+bodyHeight*.12}),die=point(shape.dieOffset,{x:bodyCenter.x+bodyHeight*.3,y:bodyCenter.y+bodyHeight*.15});
   joints.book=book;joints.die=die;
   add('book',book,finite(shape.bookHeight,bodyHeight*.29),Math.sin(time*1.7)*.012-attack*.08);
   add('die',die,finite(shape.dieHeight,bodyHeight*.22),Math.sin(time*1.7+.3)*.012+attack*.08);
  }
  last={...pose,version:++version,archetype:kind,layers,joints:{...pose.joints,...joints},feet:kind==='bread'?{}:pose.feet,anatomy:kind==='bread'?{feet:0,appendages:1}:{feet:2,appendages:0},body:{origin:{...bodyCenter},height:bodyHeight,rotation:0,scaleX:1,scaleY:1}};
  return last;
 }
 const check=()=>{if(disposed)throw Error('Mascot rig is disposed');};
 return {
  update(options={}){check();if(options.paused&&last)return last;return transform(source.update(options));},
  reset(position,heading){check();return transform(source.reset(position,heading));},
  seekAction(elapsed,options){check();return transform(source.seekAction(elapsed,options));},
  requestAttack(){check();return source.requestAttack();},snapshot:()=>last,
  destroy(){if(disposed)return;disposed=true;source.destroy();last=null;},
 };
}
