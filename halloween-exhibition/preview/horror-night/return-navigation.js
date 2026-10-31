// Only offers an explicit, truthfully labelled browser-Back control.
// History.length includes forward entries; it cannot prove a previous page exists
// or that the previous page is note. No referrer or private preview URL is stored.
export function canOfferBrowserBack(length){return Number.isInteger(length)&&length>1;}
