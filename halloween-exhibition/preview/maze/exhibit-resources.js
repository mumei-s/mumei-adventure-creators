/** Own only replaceable exhibit resources; shared scene geometry stays outside. */
export function createExhibitResources(parent=new Set()){
 const owned=new Set();let generation=0,closed=false;
 function release(resource){if(!owned.delete(resource))return;parent.delete(resource);resource.dispose?.();}
 function reset(){generation++;for(const resource of [...owned])release(resource);return generation;}
 const current=token=>!closed&&token===generation;
 return {reset,current,release,track(resource,token=generation){if(!current(token)){resource.dispose?.();parent.delete(resource);return false;}owned.add(resource);parent.add(resource);return true;},dispose(){if(closed)return;reset();closed=true;},get size(){return owned.size;}};
}
