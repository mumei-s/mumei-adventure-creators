export function swipeStep(dx,dy){return Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.5?(dx<0?1:-1):0;}
export function ringWindow(items,index,limit=6){
 if(!items.length)return {index:0,items:[]};
 const safe=((index%items.length)+items.length)%items.length;
 return {index:safe,items:Array.from({length:Math.min(limit,items.length)},(_,i)=>items[(safe+i)%items.length])};
}
export function ringPosition(slot,count=6,rotation=0){
 const angle=(90-slot*360/Math.max(1,count)+rotation)*Math.PI/180,depth=(Math.sin(angle)+1)/2;
 return {x:37*Math.cos(angle),y:33*Math.sin(angle),scale:.78+.22*depth,z:2+Math.round(depth*6)};
}
