import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {exclusionReason, stagePages, validateReferences} from './stage-pages.mjs';

test('dependencies, development evidence and backend code stay out', () => {
  for (const file of ['halloween/node_modules/esbuild/bin/esbuild', 'halloween/scripts/check.mjs', 'halloween/audit/report.json', 'halloween/verification/v18/published.jpg', 'halloween/supabase/functions/main.ts', 'halloween-exhibition/preview/maze/tests/rpg.test.mjs', '.github/workflows/pages.yml']) assert.ok(exclusionReason(file), file);
});
test('originals, dynamic assets, visual proofs, backend config and public data stay available', () => {
  for (const file of ['halloween/assets/verification/v14/woodcut-sea.png', 'halloween/assets/style-film-light-original-v28-4-3.png', 'halloween/japan-photo-v18.png', 'halloween/sample-001.jpg', 'halloween/runtime-config.js', 'halloween-exhibition/preview/data/archive.json', 'halloween-exhibition/preview/maze/assets/rigs/owner/parts.webp', 'preview-v3/chunks/app-01.txt', 'CNAME', '.nojekyll']) assert.equal(exclusionReason(file), null, file);
});
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'pages-stage-test-'));
  t.after(() => fs.rm(root, {recursive: true, force: true}));
  return root;
}
async function put(root, relative, content) { await fs.mkdir(path.dirname(path.join(root, relative)), {recursive: true}); await fs.writeFile(path.join(root, relative), content); }

test('stages copies and leaves source evidence untouched', async t => {
  const root = await fixture(t); const source = path.join(root, 'source'); const out = path.join(root, 'out');
  await put(source, 'index.html', '<script src="./app.js?v=1"></script>');
  await put(source, 'app.js', 'export const ready = true;');
  await put(source, 'halloween/audit/report.json', '{"keepOriginal":true}');
  await put(source, 'halloween/node_modules/package/big.js', 'do not publish');
  const report = await stagePages(source, out);
  assert.equal(report.stagedFiles, 2); assert.ok(report.savedBytes > 0);
  assert.equal(await fs.readFile(path.join(source, 'halloween/audit/report.json'), 'utf8'), '{"keepOriginal":true}');
  await assert.rejects(fs.stat(path.join(out, 'halloween/node_modules')));
  assert.equal(await fs.readFile(path.join(out, 'app.js'), 'utf8'), 'export const ready = true;');
});
test('removed runtime dependencies fail staging before copying', async t => {
  const root = await fixture(t);
  await put(root, 'halloween/app.js', 'fetch("./audit/report.json?v=1")');
  await put(root, 'halloween/audit/report.json', '{}');
  await assert.rejects(validateReferences(root, ['halloween/app.js', 'halloween/audit/report.json'], ['halloween/app.js']), /excludes referenced/);
});
test('nested public JSON dependencies are checked', async t => {
  const root = await fixture(t);
  await put(root, 'halloween/assets/manifest.json', '{"proof":"../verification/proof.jpg"}');
  await assert.rejects(validateReferences(root, ['halloween/assets/manifest.json', 'halloween/verification/proof.jpg'], ['halloween/assets/manifest.json']), /verification\/proof.jpg/);
});
test('refuses destructive destination choices or existing contents', async t => {
  const root = await fixture(t);
  await put(root, 'index.html', 'keep me');
  await assert.rejects(stagePages(root, root), /must not replace/);
  await assert.rejects(stagePages(root, path.dirname(root)), /must not replace/);
  const dest = path.join(root, '_site'); await put(dest, 'existing.txt', 'keep me too');
  await assert.rejects(stagePages(root, dest), /must be empty/);
  assert.equal(await fs.readFile(path.join(dest, 'existing.txt'), 'utf8'), 'keep me too');
});
