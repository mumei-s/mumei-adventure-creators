export const worldSize = { width: 1000, height: 667 };

export function exteriorHeight(y) {
  return Math.max(18, 9 + y * .071);
}

export function districtCamera({ width, height, position, overview, inside }) {
  const fit = Math.min(width / worldSize.width, height / worldSize.height);
  const cover = Math.max(width / worldSize.width, height / worldSize.height);
  const visibleHeight = Math.min(112, Math.max(78, width * .19), height * .6);
  const walking = inside ? Math.max(cover, fit * 1.15) :
    Math.max(fit * 2.2, visibleHeight / exteriorHeight(500));
  const scale = overview ? fit : walking;
  const bound = (span, total, focus, fraction) => total <= span ?
    (span - total) / 2 : Math.max(span - total, Math.min(0, span * fraction - focus * scale));
  return {
    x: bound(width, worldSize.width * scale, position[0], .5),
    y: bound(height, worldSize.height * scale, position[1], .68),
    scale,
  };
}
