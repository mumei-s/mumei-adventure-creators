import {normalizeCameraZoom} from '../camera-distance.js?v=20261019-journey1';

// A little more street context, shared by 2D and 3D; interiors retain their fit.
// Manual zoom still retains its existing range and saved values.
export const TOWN_VIEW_SCALE=.96;
export const townViewZoom=value=>normalizeCameraZoom(value)*TOWN_VIEW_SCALE;

/** Move the focal point into the visible area above an overlapping thumb pad.
 * Measure on resize, not per animation frame. No preference or save mutation. */
export function townControlOffset(world,pad,viewControl){
 if(!world||!pad||!(world.height>0)||!(pad.height>0)||pad.top>=world.bottom||pad.bottom<=world.top)return 0;
 const top=viewControl?.height>0&&viewControl.bottom>world.top&&viewControl.top<world.bottom?Math.min(pad.top,viewControl.top):pad.top;
 const clearBottom=Math.max(0,Math.min(world.height,top-world.top-18));
 return Math.min(world.height*.22,Math.max(0,(world.height-clearBottom)/2));
}
