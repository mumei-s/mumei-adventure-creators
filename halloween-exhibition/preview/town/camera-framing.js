import {normalizeCameraZoom} from '../camera-distance.js?v=20261019-journey1';

// Bring the street one step closer in both renderers, including palace pullback.
// Manual zoom still retains its existing range and saved values.
export const TOWN_VIEW_SCALE=1.12;
export const townViewZoom=value=>normalizeCameraZoom(value)*TOWN_VIEW_SCALE;
