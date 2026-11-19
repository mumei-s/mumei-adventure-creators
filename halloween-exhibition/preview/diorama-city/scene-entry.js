import { streetAreas } from './paths.js?v=20261119-scene';
import { venues } from './venues.js?v=20261118-city2';

export const areaFor=url=>url.searchParams.get('area')==='canal' ? 'canal' : 'tower';

function initialEntry(url,state) {
  const area=streetAreas[areaFor(url)], spots=area.places;
  const [requested,key]=url.searchParams.get('spot')?.split('.') || [];
  const restoring=Object.hasOwn(venues,state?.dioramaVenue);
  const useLink=!state?.inline || state.dioramaVenue===requested;
  const id=restoring?state.dioramaVenue:useLink?requested:null;
  const venue=Object.hasOwn(venues,id) ? venues[id] : null;
  const entrance=venue && Object.values(spots).find(place=>place.venue===(venue.parent || id));
  if(entrance)return {id,image:venue.image,entrance:entrance.point,
    point:id===requested && Object.hasOwn(venue.spots,key) ? venue.spots[key].point : null, inline:!restoring};
  const point=useLink && requested==='street' && Object.hasOwn(spots,key) ? spots[key].point : null;
  return {image:area.image,point};
}

// Keep only the current and a few recently selected full-resolution scenes in memory.
const backdrops=new Map();
export function sceneArt(source, priority) {
  let item=backdrops.get(source);
  if (!item) {
    const image=new Image();
    image.decoding='async';
    image.fetchPriority=priority;
    image.draggable=false;
    let frame=image, alternative;
    if(source===streetAreas.tower.image || source===streetAreas.canal.image){
      frame=document.createElement('picture');
      alternative=document.createElement('source');
      alternative.type='image/avif';
      alternative.srcset=source.replace('.webp','.avif');
      frame.append(alternative,image);
    }
    image.src=source;
    item={image,frame,decoded:false,discard(){if(backdrops.get(source)===item)backdrops.delete(source);}};
    item.ready=image.decode().catch(error=>{
      if(!alternative || !image.currentSrc.endsWith('.avif'))throw error;
      alternative.remove();
      image.src=source;
      return image.decode();
    }).then(()=>{item.decoded=true;},error=>{
      item.discard();
      throw error;
    });
    // Walking can change direction before the requested image is displayed.
    item.ready.catch(()=>{});
  } else if(priority==='high') item.image.fetchPriority='high';
  backdrops.delete(source);
  backdrops.set(source,item);
  if(backdrops.size>4)backdrops.delete(backdrops.keys().next().value);
  return item;
}

// This module can start the single visible backdrop before controls or avatar scripts arrive.
export const firstScene=initialEntry(new URL(location.href),history.state);
sceneArt(firstScene.image,'high');
