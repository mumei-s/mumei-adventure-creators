// Standard frames show the room at a usable phone scale; the pullbacks reveal
// the complete room. Manual zoom continues to work in both renderers.
export const creatorRoomCameraScale=distance=>({normal:1.35,wide:1,far:.84})[distance]||1.35;
export const creatorRoomCameraFollow=scale=>Math.max(0,Math.min(1,(scale-1)/.5));
