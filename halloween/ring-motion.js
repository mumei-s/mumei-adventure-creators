// Later pages sit to the right, so moving the content left reveals the next page.
export function swipeStep(dx,dy){return Math.abs(dx)>=24&&Math.abs(dx)>Math.abs(dy)*1.25?(dx<0?1:-1):0;}
export function pagePatternTone(page,pages){const tone=page%6;return page>0&&page===pages-1&&tone===0?2:tone;}
export function ringWindow(items,index,limit=6){
 if(!items.length)return {index:0,items:[]};
 const safe=((index%items.length)+items.length)%items.length;
 return {index:safe,items:Array.from({length:Math.min(limit,items.length)},(_,i)=>items[(safe+i)%items.length])};
}
export function ringPosition(slot,count=6,rotation=0){
 const angle=(90-slot*360/Math.max(1,count)+rotation)*Math.PI/180,depth=(Math.sin(angle)+1)/2;
 return {x:38*Math.cos(angle),y:35*Math.sin(angle),scale:.78+.22*depth,z:2+Math.round(depth*6)};
}
// Keep a real empty horizontal band beside the center while cards are at rest.
// Intentional dragging uses ringPosition directly so the orbit remains continuous.
export function restingRingPosition(position,{height,cardHeight,gap=72,slot=0,count=6}){
 if(!(height>0&&cardHeight>0))return position;
 const halfCard=cardHeight*position.scale/2,minOffset=gap/2+halfCard+8,maxOffset=height/2-halfCard-8;
 const sign=Math.abs(position.y)>1e-5?Math.sign(position.y):(slot<count/2?1:-1);
 const offset=Math.min(maxOffset,Math.max(minOffset,Math.abs(position.y)*height/100));
 return {...position,y:sign*offset/height*100};
}
