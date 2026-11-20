import { sharedSpaces } from '../shared-spaces.js';
import { streetAreas } from '../../halloween-exhibition/preview/diorama-city/paths.js';
import { venues } from '../../halloween-exhibition/preview/diorama-city/venues.js';

const city = 'halloween-exhibition/preview/diorama-city/';

// Keep the audit data driven: a newly declared facility, district, or venue is
// automatically covered without requiring a hand-maintained list of scenes.
export const sceneArtwork = new Map();
const add = (label, file) => {
  if (!file) throw new Error('No illustration configured: ' + label);
  const key = file.replace(/^\.\//, '');
  sceneArtwork.set(key, [...(sceneArtwork.get(key) ?? []), label]);
};
const districtAsset = file => file && city + file.replace(/^\.\//, '');
for (const [id, space] of Object.entries(sharedSpaces)) {
  add('Tower: ' + id, 'tower/assets/' + space.image + '.webp');
  // The private owner's suite is not preloaded or used as a small preview.
  if (id !== 'owner') add('Tower thumbnail: ' + id, 'tower/assets/thumbs/' + space.image + '.webp');
}
for (const [id, area] of Object.entries(streetAreas)) {
  add('District: ' + id, districtAsset(area.image));
  if (id === 'tower' || id === 'canal') add('District AVIF: ' + id, districtAsset(area.image?.replace(/\.webp$/, '.avif')));
  for (const [place, spec] of Object.entries(area.places)) {
    if (spec.image) add('District stop: ' + id + '/' + place, districtAsset(spec.image));
  }
}
for (const [id, venue] of Object.entries(venues)) {
  add('Venue: ' + id, districtAsset(venue.image));
  for (const [spot, spec] of Object.entries(venue.spots)) {
    if (spec.image) add('Venue stop: ' + id + '/' + spot, districtAsset(spec.image));
  }
}
