/** Five people per page; every article of a selected person keeps its own door.
 * Creator membership follows first appearance, while door ordering stays intact. */
export function paginateRoster(entries, requestedPage, size = 5) {
  const creators = [...new Set(entries.map(entry => entry.creatorId))];
  const pageCount = Math.ceil(creators.length / size);
  const page = Math.max(0, Math.min(Number.isInteger(requestedPage) ? requestedPage : 0, Math.max(0, pageCount - 1)));
  const start = page * size;
  const visibleCreators = new Set(creators.slice(start, start + size));
  return {
    page, pageCount, start,
    creatorCount: creators.length,
    visibleCreatorCount: visibleCreators.size,
    entries: entries.filter(entry => visibleCreators.has(entry.creatorId)),
  };
}
