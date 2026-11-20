import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {sceneArtwork} from './scene-art-catalog.mjs';

test('Tower and city scene artwork exists with the expected image format', async () => {
  assert.ok(sceneArtwork.has('tower/assets/seismic-gallery.webp'));
  assert.ok(sceneArtwork.has('tower/assets/thumbs/seismic-gallery.webp'));
  const failures = [];
  await Promise.all([...sceneArtwork].map(async ([file, labels]) => {
    try {
      const data = await readFile(new URL('../../' + file, import.meta.url));
      const webp = data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WEBP';
      const avif = data.subarray(4, 8).toString() === 'ftyp' && data.subarray(8, 32).includes('avif');
      assert.ok(file.endsWith('.webp') ? webp : file.endsWith('.avif') && avif, 'unexpected image format');
    } catch (error) {
      failures.push(labels.join(', ') + ': ' + file + ' (' + (error.code || error.message) + ')');
    }
  }));
  assert.deepEqual(failures.sort(), []);
});
