/** Shared review drawing. Character size follows the same contentHeight convention
 * as drawArtSprite; the native tool additionally records actual alpha bounds.
 */
export function drawRigReviewScene(context,{width,height,frame,manifest,atlas,drawOwnerPose,markers=true}={}){
  const c=context,pose=frame.pose;
  c.save();c.clearRect(0,0,width,height);c.fillStyle='#22313c';c.fillRect(0,0,width,height);
  const baseline=Math.min(height-70,height*.77),lanes=[{x:width*.25,size:76},{x:width*.75,size:86}];
  c.strokeStyle='#8da89844';c.beginPath();c.moveTo(width/2,16);c.lineTo(width/2,height-34);c.stroke();
  for(const lane of lanes){
    const pose=frame.poses?.[lane.size]||frame.pose,scale=lane.size/manifest.contentHeight,unit=(pose.projection?.unitsToPixels||64)*scale,depth=pose.projection?.depthScale||.78;
    c.save();c.beginPath();c.rect(lane.x-width*.25,0,width*.5,height);c.clip();
    c.fillStyle='#17252d';c.fillRect(lane.x-width*.25,baseline-17,width*.5,height-baseline+17);
    c.strokeStyle='#8da89822';c.lineWidth=1;
    for(let i=-80;i<=80;i++){
      const x=lane.x+(i*.5-pose.root.x)*unit;
      if(x>=lane.x-width*.25&&x<=lane.x+width*.25){c.beginPath();c.moveTo(x,baseline-17);c.lineTo(x,height-34);c.stroke();}
      const y=baseline+(i*.5-pose.root.z)*unit*depth;
      if(y>=baseline-17&&y<=height-34){c.beginPath();c.moveTo(lane.x-width*.25,y);c.lineTo(lane.x+width*.25,y);c.stroke();}
    }
    c.fillStyle='#0a131966';c.beginPath();c.ellipse(lane.x,baseline+2,lane.size*.26,4,0,0,Math.PI*2);c.fill();
    drawOwnerPose(c,atlas,manifest,pose,{x:lane.x,y:baseline,scale});
    if(markers)for(const side of['left','right']){
      const foot=pose.feet[side],x=lane.x+(foot.world.x-pose.root.x)*unit,y=baseline+(foot.world.z-pose.root.z)*unit*depth-foot.lift*unit;
      c.strokeStyle=foot.contact?'#9fe3c5':'#f0c86c';c.fillStyle=foot.contact?'#9fe3c5':'#22313c';c.lineWidth=1.3;c.beginPath();c.arc(x,y,2.8,0,Math.PI*2);c.fill();c.stroke();
    }
    c.font='600 15px sans-serif';c.textAlign='center';c.fillStyle='#f0dfbb';c.fillText(lane.size+' px',lane.x,31);
    c.font='11px sans-serif';c.fillStyle='#cbd8d0';
    c.fillText('L '+(pose.feet.left.contact?'CONTACT':pose.feet.left.mode.toUpperCase())+' / R '+(pose.feet.right.contact?'CONTACT':pose.feet.right.mode.toUpperCase()),lane.x,height-12);
    c.restore();
  }
  c.font='12px sans-serif';c.textAlign='center';c.fillStyle='#d6e1d9';c.fillText(frame.time.toFixed(2)+' s  ·  '+(pose.action.kind==='attack'?pose.action.stage.toUpperCase():pose.moving?'WALK':'STOP'),width/2,58);
  c.font='10px sans-serif';c.fillStyle=pose.artwork.usingFallbackView?'#f4c393':'#9fe3c5';
  c.fillText('REQUEST '+pose.artwork.requestedView+' / ART '+pose.view+(pose.artwork.usingFallbackView?' · MISSING VIEW':''),width/2,78);
  c.restore();
}
