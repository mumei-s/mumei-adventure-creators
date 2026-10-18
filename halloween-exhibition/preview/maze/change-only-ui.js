/** Small value gates: keep moving markers live without redrawing unchanged UI. */
export function createChangeTracker(){
 let previous;
 return {changed(value){const next=JSON.stringify(value);if(next===previous)return false;previous=next;return true;},invalidate(){previous=undefined;}};
}
export function setChangedProperty(node,key,value){if(node[key]!==value)node[key]=value;}
export function setChangedAttribute(node,key,value){const next=String(value);if(node.getAttribute(key)!==next)node.setAttribute(key,next);}
