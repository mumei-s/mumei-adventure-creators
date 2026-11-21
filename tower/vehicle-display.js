import { decodeArtwork } from './public-directory.js?v=20261119-review';

// Use the silhouette, including wheels and tall handlebars, as the displayed vehicle's bounds.
export function trimTransparentEdges(canvas) {
  const {width,height}=canvas;
  const pixels=canvas.getContext('2d').getImageData(0,0,width,height).data;
  let left=width,top=height,right=-1,bottom=-1;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    if(pixels[(y*width+x)*4+3]<=20)continue;
    left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
  }
  if(right<left)throw {code:'bad_image'};
  if(left===0&&top===0&&right===width-1&&bottom===height-1)return canvas;
  const cropped=document.createElement('canvas');
  cropped.width=right-left+1;cropped.height=bottom-top+1;
  cropped.getContext('2d').drawImage(canvas,left,top,cropped.width,cropped.height,0,0,cropped.width,cropped.height);
  return cropped;
}

const presentations=new Map();
export function displayVehicle(url) {
  if(presentations.has(url))return presentations.get(url);
  const ready=(async()=>{
    const img=new Image();img.crossOrigin='anonymous';img.src=url;await decodeArtwork(img);
    const canvas=document.createElement('canvas');
    canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
    canvas.getContext('2d').drawImage(img,0,0);
    const cropped=trimTransparentEdges(canvas);
    return cropped===canvas?img.src:cropped.toDataURL('image/webp',.96);
  })().catch(()=>{presentations.delete(url);return url;});
  if(presentations.size>=24)presentations.delete(presentations.keys().next().value);
  presentations.set(url,ready);
  return ready;
}

// The B1 backdrop is 1536 × 1024. Measure both painted side lines in each
// visible bay, with a shorter usable span where the aisle or columns cut in.
const garageImage = [1536, 1024];
const garageBays = [
  {far:[[277,611],[558,625]],near:[[277,655],[405,662]],span:[283,458]},
  {far:[[653,565],[742,568]],near:[[653,579],[742,582]],span:[653,746]},
  {far:[[800,547],[858,549]],near:[[800,555],[858,557]],span:[800,858]},
  {far:[[880,537],[930,539]],near:[[880,542],[930,544]],span:[881,930]},
];

// Correct two known source silhouettes by immutable media version. These are
// rear/front wheel contacts on the trimmed image, not overrides by resident or
// room. Replacement artwork uses the direction selected at registration.
const knownGarageArt = new Map([
  ['fd841db7aecbec5ccfeb5802', { facing:'right', wheels:[[.095,.896],[.493,.998]] }],
  ['8e3064b99218d3bd53c60276', { facing:'left', wheels:[[815/909,436/469],[462/909,468/469]] }],
]);
const nominalRightWheels = [[.12,.90],[.53,.995]];
const lineY = ([[x0,y0],[x1,y1]], x) => y0+(y1-y0)*(x-x0)/(x1-x0);

export function garageVehiclePose(index, sourceFacing, version, heightOverWidth = .5) {
  const {far, near, span:[left,right]} = garageBays[index];
  const art = knownGarageArt.get(version);
  const flip = (art?.facing ?? sourceFacing) !== 'right';
  const displayed = art
    ? art.wheels.map(([x,y]) => [flip ? 1-x : x,y])
    : nominalRightWheels;
  const [[rearX,rearY],[frontX,frontY]] = displayed;
  const anchorX = (rearX+frontX)/2, anchorY = (rearY+frontY)/2;
  const width = right-left, x = left+width*anchorX;
  // The visible wheels run nearer to the viewer than the middle of the bay.
  const tireY = u => .32*lineY(far,u)+.68*lineY(near,u);
  const rear = left+width*rearX, front = left+width*frontX;
  const lineSlope = (tireY(front)-tireY(rear))/(front-rear);
  const imageSlope = (frontY-rearY)*heightOverWidth/(frontX-rearX);
  // Shear vertically instead of rotating the body. Pillars on the car stay
  // vertical and its tire contact line follows the pavement perspective.
  const skew = Math.atan(lineSlope-imageSlope)*180/Math.PI;
  return {
    u:x/garageImage[0], v:tireY(x)/garageImage[1], width:width/garageImage[0],
    anchorX, anchorY, flip, skew:art ? skew : Math.max(-8,Math.min(8,skew)),
  };
}

// Foot positions and widths are measured in the respective full photographs.
export const vehicleBays={
  parking:garageBays,
  parkingTower:[[.16,.72,.23,'right'],[.343,.633,.17,'right'],[.687,.628,.17,'left'],[.854,.715,.23,'left']],
  motorcycle:[[.263,.682,.133,'left'],[.420,.676,.133,'left'],[.586,.676,.133,'left'],[.745,.682,.133,'left']],
  bicycle:[[.123,.724,.122,'right'],[.231,.666,.102,'right'],[.322,.626,.087,'right'],[.395,.592,.074,'right']],
};
