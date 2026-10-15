// A completed opening is followed by the full selected display interval.
export const DOOR_OPENING_MS = 1200;
export function createDoorRevealClock({setBlocked, schedule=setTimeout, clear=clearTimeout}) {
 let timer=null, version=0;
 const cancel=()=>{version++;if(timer!==null)clear(timer);timer=null;setBlocked(false);};
 return {cancel,start(){cancel();const token=version;setBlocked(true);timer=schedule(()=>{if(token!==version)return;timer=null;setBlocked(false);},DOOR_OPENING_MS);}};
}
