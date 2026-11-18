// Detect four separated rows and columns in transparent sprite sheets, including
// legacy uploads cropped as a single image. Do not classify ordinary portraits.
export function detectAtlas({width:w,height:h,data}) {
  if(w<48||h<48||w/h<.5||w/h>2) return null;
  const xs=new Uint16Array(w),ys=new Uint16Array(h);
  let mass=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    if(data[(y*w+x)*4+3]<64)continue;
    xs[x]++;ys[y]++;mass++;
  }
  if(mass>w*h*.78||mass<w*h*.035)return null;
  function bands(counts,other){
    const groups=[];let start=-1,last=-1;
    for(let i=0;i<counts.length;i++){
      if(counts[i]<Math.max(2,other*.009))continue;
      if(start<0||i-last>Math.max(3,counts.length*.025)){
        if(start>=0)groups.push([start,last+1]);
        start=i;
      }
      last=i;
    }
    if(start>=0)groups.push([start,last+1]);
    const valid=groups.filter(([a,b])=>b-a>=counts.length*.055);
    if(valid.length!==4)return null;
    const centers=valid.map(([a,b])=>(a+b)/2);
    const spacings=centers.slice(1).map((v,i)=>v-centers[i]);
    if(Math.min(...spacings)<counts.length*.15||Math.max(...spacings)>Math.min(...spacings)*1.6)return null;
    return [0,...valid.slice(1).map(([a],i)=>Math.floor((valid[i][1]+a)/2)),counts.length];
  }
  const bx=bands(xs,h);
  let by=bands(ys,w);
  // Legacy uploads can be trimmed until consecutive rows almost touch. Require
  // four separated columns and recurring silhouettes before splitting those rows.
  // This rejects ordinary four-person group portraits, which have one body per column.
  if(bx&&!by){
    const cuts=[0];
    for(let row=1;row<4;row++){
      const target=h*row/4,radius=Math.max(2,Math.floor(h*.045));
      let best=Math.round(target),score=Infinity;
      for(let y=Math.max(2,Math.floor(target)-radius);y<=Math.min(h-3,Math.ceil(target)+radius);y++){
        const value=(ys[y-1]+ys[y]+ys[y+1])/3+Math.abs(y-target)*.07;
        if(value<score){score=value;best=y;}
      }
      cuts.push(best);
    }
    cuts.push(h);
    const profiles=Array.from({length:4},(_,row)=>Array.from({length:32},(_,i)=>{
      const at=cuts[row]+(cuts[row+1]-cuts[row]-1)*i/31,lo=Math.floor(at),fraction=at-lo;
      return ys[lo]*(1-fraction)+ys[Math.min(h-1,lo+1)]*fraction;
    }));
    const correlation=(a,b)=>{
      const ma=a.reduce((s,n)=>s+n,0)/a.length,mb=b.reduce((s,n)=>s+n,0)/b.length;
      let dot=0,aa=0,bb=0;
      for(let i=0;i<a.length;i++){const x=a[i]-ma,y=b[i]-mb;dot+=x*y;aa+=x*x;bb+=y*y;}
      return aa&&bb?dot/Math.sqrt(aa*bb):0;
    };
    const repeats=profiles.slice(1).map((row,index)=>correlation(profiles[index],row));
    if(repeats.every(n=>n>0)&&repeats.filter(n=>n>.35).length>=2&&repeats.reduce((a,b)=>a+b,0)/3>.42)by=cuts;
  }
  if(!bx||!by)return null;
  const frames=[];
  for(let row=0;row<4;row++)for(let col=0;col<4;col++){
    let l=w,t=h,r=-1,b=-1,n=0;
    for(let y=by[row];y<by[row+1];y++)for(let x=bx[col];x<bx[col+1];x++){
      if(data[(y*w+x)*4+3]<32)continue;
      l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);n++;
    }
    if(n<Math.max(12,w*h*.0015)||b-t<h*.075||r-l<w*.025)return null;
    frames.push([Math.max(bx[col],l-1),Math.max(by[row],t-1),Math.min(bx[col+1],r+2),Math.min(by[row+1],b+2)]);
  }
  const heights=frames.map(q=>q[3]-q[1]);
  if(Math.max(...heights)>Math.min(...heights)*2)return null;
  return frames;
}
export function scanAtlas(image) {
  const ratio=Math.min(1,320/Math.max(image.naturalWidth||image.width,image.naturalHeight||image.height));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round((image.naturalWidth||image.width)*ratio));
  canvas.height=Math.max(1,Math.round((image.naturalHeight||image.height)*ratio));
  const context=canvas.getContext('2d',{willReadFrequently:true});
  if(!context)return null;
  context.drawImage(image,0,0,canvas.width,canvas.height);
  const boxes=detectAtlas(context.getImageData(0,0,canvas.width,canvas.height));
  if(!boxes)return null;
  const sx=(image.naturalWidth||image.width)/canvas.width,sy=(image.naturalHeight||image.height)/canvas.height;
  return boxes.map(([l,t,r,b])=>[Math.floor(l*sx),Math.floor(t*sy),Math.ceil(r*sx),Math.ceil(b*sy)]);
}
