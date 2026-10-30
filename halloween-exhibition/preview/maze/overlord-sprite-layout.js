// Only the three independently clean drawings are packed in this atlas.
// Sixteen transparent pixels isolate each crop from neighbouring mip levels.
// Crown/sole bounds and foot anchors retain the source artwork registration.
const frames=[
 {frame:[16,16,384,507],anchorX:.53,anchorY:504/507,contentHeight:491},
 {frame:[432,16,384,512],anchorX:.53,anchorY:505/512,contentHeight:489},
 {frame:[848,16,384,512],anchorX:.53,anchorY:506/512,contentHeight:489},
].map(frame=>Object.freeze({...frame,frame:Object.freeze(frame.frame)}));

const action=Object.freeze({frames:Object.freeze([0,1,2,1,0]),stops:Object.freeze([0,.18,.40,.76,.91]),duration:1.85});
export const OVERLORD_SPRITE_LAYOUT=Object.freeze({
 width:1248,height:544,idleFrame:0,frames:Object.freeze(frames),
 actions:Object.freeze({attack:action,special:action}),
 authoredPoseCount:3,directionalWalk:false,defeatArt:false,
});

// Character-height coordinates: y grows down, with the planted floor at y=1.
// Include every complete crop corner, even transparent padding. Renderers can
// fit once before image loading and retain one scale through the whole cast.
const measuredBounds=frames.reduce((bounds,part)=>{
 const [, ,width,height]=part.frame,h=part.contentHeight;
 bounds.left=Math.min(bounds.left,-width*part.anchorX/h);
 bounds.right=Math.max(bounds.right,width*(1-part.anchorX)/h);
 bounds.top=Math.min(bounds.top,1-height*part.anchorY/h);
 bounds.bottom=Math.max(bounds.bottom,1+height*(1-part.anchorY)/h);
 return bounds;
},{left:0,right:0,top:0,bottom:1});
// Reserve the complete continuous cloth/casting envelope before assets load.
export const OVERLORD_SPRITE_BOUNDS=Object.freeze({left:measuredBounds.left-.10,right:measuredBounds.right+.10,top:measuredBounds.top-.05,bottom:measuredBounds.bottom+.03});
