// Seven independent full-body poses. Every crop has its own transparent gutter;
// source heads and planted ground are registered before packing, including the
// genuinely lower crouch and kneel poses (never enlarged to standing height).
const descriptors=[
 {frame:[16,16,416,512],anchorX:219.52/416,anchorY:504/512,contentHeight:491},
 {frame:[464,16,416,512],anchorX:219.52/416,anchorY:505/512,contentHeight:489},
 {frame:[912,16,416,512],anchorX:219.52/416,anchorY:506/512,contentHeight:489},
 {frame:[16,560,416,512],anchorX:219.52/416,anchorY:504/512,contentHeight:491,pose:{kind:'step',authored:true,headBounds:[.46806,.10451,.61077,.22387]}},
 {frame:[464,560,416,512],anchorX:219.52/416,anchorY:504/512,contentHeight:491,pose:{kind:'step',authored:true,headBounds:[.46758,.10767,.60868,.22568]}},
 {frame:[912,560,416,512],anchorX:219.52/416,anchorY:504/512,contentHeight:491,pose:{kind:'hit',authored:true,headBounds:[.48341,.26602,.60601,.35977]}},
 {frame:[16,1104,416,512],anchorX:219.52/416,anchorY:504/512,contentHeight:491,pose:{kind:'kneel',authored:true,headBounds:[.48413,.42592,.58798,.49975]}},
];
const frames=Object.freeze(descriptors.map(frame=>Object.freeze({...frame,frame:Object.freeze(frame.frame),...(frame.pose?{pose:Object.freeze({...frame.pose,headBounds:Object.freeze(frame.pose.headBounds)})}:{})})));
const action=Object.freeze({frames:Object.freeze([0,1,2,1,0]),stops:Object.freeze([0,.18,.40,.76,.91]),duration:1.85});
const sequence=(frames,stops,duration,loop=false)=>Object.freeze({frames:Object.freeze(frames),stops:Object.freeze(stops),duration,loop});
export const OVERLORD_SPRITE_LAYOUT=Object.freeze({
 width:1344,height:1632,idleFrame:0,frames,
 actions:Object.freeze({attack:action,special:action,
  seated:sequence([6],[0],.28),stand:sequence([6,5,0],[0,.38,.76],1.27),
  walk:sequence([0,3,0,4],[0,.12,.50,.62],.72,true),
  hit:sequence([0,5,0],[0,.10,.86],.28),
  defeat:sequence([0,5,6],[0,.20,.57],1.4)}),
 authoredPoseCount:7,frontWalkArt:true,directionalWalk:false,defeatArt:true,
});
const measuredBounds=frames.reduce((bounds,part)=>{
 const [,,width,height]=part.frame,h=part.contentHeight;
 bounds.left=Math.min(bounds.left,-width*part.anchorX/h);
 bounds.right=Math.max(bounds.right,width*(1-part.anchorX)/h);
 bounds.top=Math.min(bounds.top,1-height*part.anchorY/h);
 bounds.bottom=Math.max(bounds.bottom,1+height*(1-part.anchorY)/h);
 return bounds;
},{left:0,right:0,top:0,bottom:1});
export const OVERLORD_SPRITE_BOUNDS=Object.freeze({left:measuredBounds.left-.10,right:measuredBounds.right+.10,top:measuredBounds.top-.05,bottom:measuredBounds.bottom+.03});
