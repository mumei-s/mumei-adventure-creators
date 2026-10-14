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
