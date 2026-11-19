import { setArtworkSource } from './public-directory.js?v=20261119-review';
import { avatarImageUrl } from './avatar-travel.js?v=20261119-review';
import { autoResidentWalker } from '../halloween-exhibition/preview/diorama-city/host-avatar.js?v=202611181820';

const defaultResident=new URL('./assets/resident.webp',import.meta.url).href;

// Each path is a straight, walkable stretch of floor. Feet stay on the path while residents
// slow to a stop, wait, turn and walk back. The creator's artwork stays intact.
export function residentWalkers(layer,pointFor,position) {
  const actors=new Map();
  let elapsed=0;
  function set(residents){
    const keep=new Set(residents.map(person=>person.id));
    for(const [id,actor] of actors)if(!keep.has(id)){actor.node.remove();actors.delete(id);}
    residents.forEach((person,index)=>{
      const custom=Boolean(person.avatarVersion);
      const photo=person.avatarMode==='profile'&&person.photo;
      const source=custom?avatarImageUrl(person.id,person.avatarVersion):photo||defaultResident;
      const name=person.avatarName||person.name||person.noteId;
      const key=JSON.stringify([source,name,person.world?.atlas]);
      let actor=actors.get(person.id);
      if(!actor||actor.key!==key){
        actor?.node.remove();
        const node=document.createElement('span');node.className='public-walker';node.dataset.resident=person.id;
        const art=new Image();art.alt=name;art.draggable=false;
        if(custom)art.crossOrigin='anonymous';
        if(photo)node.classList.add('profile-walker');
        const label=document.createElement('small');label.textContent=name;
        node.append(art,label);layer.append(node);setArtworkSource(art,source);
        const pose=custom?autoResidentWalker(art,{atlas:person.world?.atlas===true}):null;
        actor={key,node,pose,slot:person.slot};actors.set(person.id,actor);
      }
      actor.path=pointFor(index,person);
    });
    tick(0,false);
  }
  function tick(delta,moving){
    if(moving)elapsed+=delta;
    for(const actor of actors.values()){
      const [from,to]=actor.path;
      const leg=8+actor.slot%5,cycle=2*(leg+2);
      const phase=(elapsed+actor.slot*3.37)%cycle;
      const forward=phase<leg+2;
      const segment=forward?phase:phase-leg-2;
      const ratio=Math.min(segment/leg,1);
      const t=forward?ratio:1-ratio;
      const dx=to[0]-from[0],dy=to[1]-from[1],direction=forward?1:-1;
      position(actor.node,from[0]+dx*t,from[1]+dy*t);
      actor.pose?.(elapsed*4+actor.slot,moving&&ratio<1,dx*direction,dy*direction);
    }
  }
  return {set,tick};
}
