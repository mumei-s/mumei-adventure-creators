export function chooseView(saved, reducedMotion = false) {
  return ['2d','3d'].includes(saved) ? saved : reducedMotion ? '2d' : '3d';
}
// The 2D view always uses cardinal directions; arrow keys never rotate a camera.
export function movementVector(view, yaw, forward, right, speed) {
  const length=Math.hypot(forward,right)||1;
  return view==='2d' ? {dx:right/length*speed,dz:forward?-forward/length*speed:0} : {
    dx:(-Math.sin(yaw)*forward+Math.cos(yaw)*right)/length*speed,
    dz:(-Math.cos(yaw)*forward-Math.sin(yaw)*right)/length*speed,
  };
}

// North stays at the top in both views; the pointer follows the player.
export function mapHeading(view,yaw,facing){
  return view==='2d'?({up:0,right:Math.PI/2,down:Math.PI,left:-Math.PI/2}[facing]??0):-yaw;
}

// An atlas row is relative to the viewer, while movement stays in world space.
// In a rear camera, walking away must always select the character's back row.
export function facingForCamera(facing,cameraYaw=0,heading){
  const vector=Number.isFinite(heading)?[Math.sin(heading),Math.cos(heading)]:({up:[0,-1],right:[1,0],down:[0,1],left:[-1,0]})[facing];
  if(!vector)return facing;
  const yaw=Number.isFinite(cameraYaw)?cameraYaw:0,[x,z]=vector;
  const right=x*Math.cos(yaw)-z*Math.sin(yaw),toward=x*Math.sin(yaw)+z*Math.cos(yaw);
  return Math.abs(right)>Math.abs(toward)?right>0?'right':'left':toward>0?'down':'up';
}
