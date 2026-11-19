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

// Foot positions and widths are measured in the full photograph. The garage aisle is on the right.
export const vehicleBays={
  parking:[[.213,.658,.235,'right'],[.447,.572,.151,'right'],[.549,.533,.104,'right'],[.620,.51,.079,'right']],
  parkingTower:[[.16,.72,.23,'right'],[.343,.633,.17,'right'],[.687,.628,.17,'left'],[.854,.715,.23,'left']],
  motorcycle:[[.263,.682,.133,'left'],[.420,.676,.133,'left'],[.586,.676,.133,'left'],[.745,.682,.133,'left']],
  bicycle:[[.123,.724,.122,'right'],[.231,.666,.102,'right'],[.322,.626,.087,'right'],[.395,.592,.074,'right']],
};
