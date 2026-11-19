import { residentWalkers } from '../../../tower/resident-walkers.js?v=20261119-owner';
import { talkToResident } from '../../../tower/resident-talk.js?v=20261119-owner';
import { publicView } from '../../../tower/public-directory.js?v=20261119-review';
import { exteriorHeight } from './camera.js?v=20261118';

export function streetResidents(layer,menu){
  const select=menu.querySelector('select'),talk=menu.querySelector('button');
  let area,venue=false,rooms=[],page=0,rotation=0,lastRequest=0,pending=false,paintTime=0,signature='';
  let directory=[],exclude='';
  const groupSize=8;
  function pathFor(i){
    const lanes=area.lanes;
    const [from,to]=lanes[(i*3+page)%lanes.length];
    return [area.points[from],area.points[to]];
  }
  const actors=residentWalkers(layer,pathFor,(node,x,y)=>{
    const h=exteriorHeight(y);node.style.left=x+'px';node.style.top=y+'px';
    node.style.height=h+'px';node.style.width=h*.85+'px';node.style.zIndex=String(Math.round(y));
  });
  function paint(){
    layer.hidden=venue;menu.hidden=venue||!rooms.length;
    if(venue||!area){actors.set([]);return;}
    const n=Math.max(1,Math.ceil(rooms.length/groupSize));page=page%n;
    actors.set(rooms.slice(page*groupSize,(page+1)*groupSize));
  }
  function updateRoster(){
    const list=directory.filter(r=>r.id!==exclude);
    const sig=JSON.stringify(list);if(signature===sig)return;
    signature=sig;rooms=list;const old=select.value;
    select.replaceChildren(...rooms.map(r=>new Option(r.avatarName||r.name||r.noteId,r.id)));
    if(rooms.some(r=>r.id===old))select.value=old;
    paint();
  }
  async function refresh(){
    if(document.hidden||venue||pending||Date.now()-lastRequest<18000)return;
    pending=true;lastRequest=Date.now();
    try{
      const data=await publicView('list');
      directory=data.rooms;updateRoster();
    }catch{ /* Retain the last good street directory. */ }finally{pending=false;}
  }
  function greet(id){
    const room=rooms.find(r=>r.id===id);if(!room)return;
    const home=new URL('../../../tower/',import.meta.url);home.searchParams.set('room',id);
    talkToResident(room,{roomUrl:home.href,place:area.title});
  }
  layer.addEventListener('click',e=>{const node=e.target.closest('[data-resident]');if(node){e.stopPropagation();greet(node.dataset.resident);}});
  select.addEventListener('change',()=>{page=Math.floor(rooms.findIndex(r=>r.id===select.value)/groupSize);rotation=0;paint();});
  talk.addEventListener('click',()=>greet(select.value));
  document.addEventListener('visibilitychange',refresh);window.addEventListener('focus',refresh);
  setInterval(refresh,20000);
  return {
    setPlayer(id){exclude=id;updateRoster();},
    scene(next,indoors){area=next;venue=indoors;page=0;rotation=0;paint();if(!indoors)void refresh();},
    tick(seconds,mayMove){if(!venue&&rooms.length&&mayMove){
      rotation+=seconds;paintTime+=seconds;
      if(rotation>=24&&rooms.length>groupSize){rotation=0;page++;paint();}
      if(paintTime>=.075){actors.tick(paintTime,true);paintTime=0;}
    }},
  };
}
