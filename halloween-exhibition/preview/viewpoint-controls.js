/** Keep the selector in the existing bottom utility slot at every frame size.
 * Camera clamping and saved zoom can move the hero away from the screen center,
 * so a floating above-pad control is never safe based on viewport height alone.
 */
export function createViewpointControlLayout({root,utilities,control}){
 return {refresh(){
  root.dataset.compactViewpoint='true';
  if(control.parentNode===utilities)return;
  const focused=control.ownerDocument?.activeElement,restoreFocus=focused&&control.contains(focused);
  utilities.append(control);
  if(restoreFocus)focused.focus({preventScroll:true});
 }};
}
