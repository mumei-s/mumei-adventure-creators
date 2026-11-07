/** Ordinary courtyard residents reuse the town's articulated character artwork. */
import {createPalaceCastRigs} from './palace-cast-rig.js';

export const DAY_RESIDENTS = Object.freeze([
  {id:'gardener',rig:'town-resident-gardener',side:-1,phase:.4,period:24,depth:.9},
  {id:'innkeeper',rig:'town-resident-innkeeper',side:1,phase:2.5,period:28,depth:1},
  {id:'keeper',rig:'town-resident-keeper',side:-1,phase:4.1,period:32,depth:.66},
]);

export function dayResidentPose(actor,time,width,height) {
  const angle=time*Math.PI*2/actor.period+actor.phase;
  const x=width*((actor.side<0?.12:.88)+Math.sin(angle)*.035);
  const y=height*((actor.id==='keeper'?.76:.92)-Math.sin(angle)*.015);
  const size=Math.min(width*.17,height*.18,94)*actor.depth;
  return {x,y,size,flip:Math.cos(angle)<0,heading:Math.cos(angle)<0?-Math.PI/2:Math.PI/2};
}

export function initPalaceDayResidents(root) {
  const palace=root?.querySelector('#palace-entrance');
  if(!palace||palace.querySelector('.palace-day-residents'))return null;
  const doc=root.ownerDocument,win=doc.defaultView;
  const canvas=doc.createElement('canvas');canvas.className='palace-day-residents';canvas.setAttribute('aria-hidden','true');
  palace.append(canvas);
  const ctx=canvas.getContext('2d',{alpha:true});if(!ctx){canvas.remove();return null;}
  let frame=null,last=null,time=0,width=0,height=0,ratio=1,disposed=false,pageActive=true;
  const reduced=win.matchMedia('(prefers-reduced-motion: reduce)');
  const visible=()=>!disposed&&pageActive&&!doc.hidden&&!root.hidden&&!root.inert&&root.dataset.homeTheme==='fantasy'&&root.dataset.palaceState==='palace';
  const moving=()=>visible()&&!reduced.matches&&root.dataset.motionPaused!=='true'&&doc.body.dataset.ambientPaused!=='true';
  const rigs=createPalaceCastRigs({
    residents:DAY_RESIDENTS.map(actor=>actor.id),rigNames:Object.fromEntries(DAY_RESIDENTS.map(actor=>[actor.id,actor.rig])),
    fetcher:win.fetch.bind(win),timers:win,onChange:refresh,
    async loadImage(url,{signal}) {
      const response=await win.fetch(url,{signal});if(!response.ok)throw Error('Resident art unavailable');
      const blob=await response.blob();if(blob.size>4*1024*1024)throw Error('Resident art too large');
      return win.createImageBitmap(blob);
    },
  });
  function paint() {
    if(!width||!height)return;
    ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);
    const actors=DAY_RESIDENTS.map(actor=>({actor,pose:dayResidentPose(actor,time,width,height)})).sort((a,b)=>a.pose.y-b.pose.y);
    for(const {actor,pose} of actors){
      if(!rigs.has(actor.id))continue;
      ctx.save();ctx.fillStyle='rgba(36,43,39,.2)';ctx.beginPath();ctx.ellipse(pose.x,pose.y,pose.size*.22,pose.size*.035,0,0,Math.PI*2);ctx.fill();ctx.restore();
      rigs.draw(ctx,actor.id,pose,time,width,height);
    }
  }
  function tick(now) {
    frame=null;if(!visible()){last=null;return;}
    if(last!==null)time+=Math.min(.05,Math.max(0,(now-last)/1000));last=now;paint();
    if(moving())frame=win.requestAnimationFrame(tick);else last=null;
  }
  function refresh() {
    if(frame!==null)win.cancelAnimationFrame(frame);frame=null;last=null;
    if(!visible())return;
    paint();if(moving())frame=win.requestAnimationFrame(tick);
  }
  function resize() {
    const rect=palace.getBoundingClientRect();width=rect.width;height=rect.height;ratio=Math.min(win.devicePixelRatio||1,2);
    canvas.width=Math.max(1,Math.round(width*ratio));canvas.height=Math.max(1,Math.round(height*ratio));refresh();
  }
  const observer=new win.MutationObserver(refresh);
  observer.observe(root,{attributes:true,attributeFilter:['data-home-theme','data-palace-state','data-motion-paused','hidden','inert']});
  observer.observe(doc.body,{attributes:true,attributeFilter:['data-ambient-paused']});
  const resizer=new win.ResizeObserver(resize);resizer.observe(palace);
  doc.addEventListener('visibilitychange',refresh);reduced.addEventListener('change',refresh);
  const hide=()=>{pageActive=false;refresh();},show=()=>{pageActive=true;refresh();};
  win.addEventListener('pagehide',hide);win.addEventListener('pageshow',show);resize();
  return {ready:rigs.ready,destroy(){disposed=true;refresh();observer.disconnect();resizer.disconnect();rigs.destroy();canvas.remove();doc.removeEventListener('visibilitychange',refresh);reduced.removeEventListener('change',refresh);win.removeEventListener('pagehide',hide);win.removeEventListener('pageshow',show);}};
}
