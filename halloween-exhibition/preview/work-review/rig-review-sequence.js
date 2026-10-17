/** Deterministic review input, shared by the browser review and native proof tool.
 * This drives the real pilot runtime; it is not a captured browser play session.
 */
export const RIG_REVIEW_SECONDS=11.5;
export const RIG_REVIEW_FPS=30;
export const RIG_REVIEW_HEIGHTS=Object.freeze([76,86]);
export function rigReviewInput(time,previous={x:0,z:0},dt=1/RIG_REVIEW_FPS){
  const position={...previous};let moving=false,heading=0,label='正面・待機',attack=false;
  if(time>=.6&&time<3.6){position.z+=1.2*dt;moving=true;label='正面・歩く';}
  else if(time>=3.6&&time<4.3){label='急停止・着地を待つ';}
  else if(time>=4.3&&time<5.4){heading=Math.PI/2;label='停止したまま右へ向き直る';}
  else if(time>=5.4&&time<6.2){position.x+=1.2*dt;moving=true;heading=Math.PI/2;label='右へ歩く';}
  else if(time>=6.2&&time<6.8){heading=0;label='正面に戻り、止まる';}
  else if(time>=6.8&&time<8.8){heading=0;label='正面・攻撃の準備・発動・復帰';attack=time-dt<6.8;}
  else if(time>=8.8&&time<9.6){heading=0;label='攻撃後の待機';}
  else if(time>=9.6){heading=0;label='正面へ向き直り、待機';}
  return{position,dt,heading,moving,attack,label};
}
export function createRigReviewFrames(createRig,{manifest,fps=RIG_REVIEW_FPS,displayHeightPx=76,worldPixelsPerUnit=64,groundDepthScale=.78}={}){
  if(typeof createRig!=='function'||!Number.isFinite(fps)||fps<1||fps>120)throw new TypeError('A rig factory and a bounded sample rate are required');
  const rig=createRig({manifest}),frames=[];let position={x:0,z:0};
  try{for(let index=0;index<=Math.round(RIG_REVIEW_SECONDS*fps);index++){
    const time=index/fps,input=rigReviewInput(time,position,index===0?0:1/fps);position=input.position;
    frames.push({time,label:input.label,pose:rig.update({...input,displayHeightPx,worldPixelsPerUnit,groundDepthScale})});
  }}finally{rig.destroy();}
  return frames;
}
/** Independent foot simulations are required at each displayed size: one world
 * unit is 64 screen pixels, while the skeleton remains in authored units. */
export function createRigReviewSizeFrames(createRig,options={}){
  const bySize=Object.fromEntries(RIG_REVIEW_HEIGHTS.map(displayHeightPx=>[displayHeightPx,createRigReviewFrames(createRig,{...options,displayHeightPx})]));
  return bySize[76].map((frame,index)=>({...frame,poses:Object.fromEntries(RIG_REVIEW_HEIGHTS.map(size=>[size,bySize[size][index].pose]))}));
}
