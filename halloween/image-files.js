const extensions = {png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',avif:'image/avif',bmp:'image/bmp',heic:'image/heic',heif:'image/heif'};
export function normalizeImageFile(file) {
  const type = file.type?.toLowerCase() || extensions[file.name?.split('.').pop()?.toLowerCase()];
  if (!type?.startsWith('image/') || type === 'image/svg+xml') return null;
  return file.type === type ? file : new File([file], file.name, {type,lastModified:file.lastModified});
}
