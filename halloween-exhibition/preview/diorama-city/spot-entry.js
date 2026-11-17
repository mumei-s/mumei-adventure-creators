const destination = new URL('./', import.meta.url);
const entry = document.body.dataset;
const point = new URL(location.href).searchParams.get('point');
destination.searchParams.set('spot', entry.venue + (point && /^[a-zA-Z][a-zA-Z0-9]*$/.test(point) ? '.' + point : ''));
if (entry.area === 'canal') destination.searchParams.set('area', 'canal');
location.replace(destination.href);
