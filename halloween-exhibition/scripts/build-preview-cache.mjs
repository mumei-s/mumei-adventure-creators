// Build an exact, finite cache allowlist from the public gallery dependency graph.
// Run after changing gallery HTML/modules/styles; --check validates without writing.
import { readFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../preview/', import.meta.url));
const origin = new URL('https://public.invalid/halloween-exhibition/preview/');
const workerFile = path.join(root, 'sw.js');
const source = await readFile(workerFile, 'utf8');
const marker = /\/\/ BEGIN GENERATED SHELL[^\n]*\n[\s\S]*?\/\/ END GENERATED SHELL/;
const assets = new Map();
const contents = new Map();
const queue = ['index.html'];
const allowedPath = value => /^(?:[^/]+\.(?:js|css|webmanifest)|assets\/(?:[\w./-]+)\.(?:svg|png|webp|jpe?g|ico))$/.test(value) && !['sw.js', 'palace-cast-rig.js'].includes(value);
while (queue.length) {
  const relative = queue.shift();
  if (contents.has(relative)) continue;
  const parsed = new URL(relative, origin);
  const local = parsed.pathname.slice(origin.pathname.length);
  const body = await readFile(path.join(root, local));
  contents.set(relative, body);
  if (relative !== 'index.html') {
    // Small deployment/header differences are fine; unexpectedly large bodies
    // still reach the page but must not become persistent cache entries.
    const budget = Math.min(2 * 1024 * 1024, Math.ceil(body.length * 1.1) + 4096);
    assets.set(relative, budget);
  }
  if (!/\.(?:html|js|css|webmanifest)$/.test(local)) continue;
  const text = body.toString('utf8');
  // Static HTML attributes, JS imports/new URL(), and CSS url() literals only.
  // Data/templates/remote URLs, fetched archives, maze/town and admin are absent.
  for (const match of text.matchAll(/["'(](\.\/[^"'\s)<>`]+)["')]/g)) {
    const target = new URL(match[1], parsed);
    if (target.origin !== origin.origin || !target.pathname.startsWith(origin.pathname) || target.hash) continue;
    const targetPath = target.pathname.slice(origin.pathname.length);
    if (!allowedPath(targetPath) || targetPath.includes('..')) continue;
    if (target.search && !/^\?v=[a-zA-Z0-9._-]+$/.test(target.search)) continue;
    await stat(path.join(root, targetPath));
    queue.push(targetPath + target.search);
  }
}
const pairs = [...assets].sort(([a], [b]) => a.localeCompare(b));
const hash = createHash('sha256').update(source.replace(marker, ''));
for (const [key, value] of [...contents].sort(([a], [b]) => a.localeCompare(b))) hash.update(key).update(value);
const revision = hash.digest('hex').slice(0, 16);
const generated = `// BEGIN GENERATED SHELL (node halloween-exhibition/scripts/build-preview-cache.mjs)\nconst SHELL_REVISION = '${revision}';\nconst PUBLIC_ASSETS = [\n${pairs.map(pair => '  ' + JSON.stringify(pair)).join(',\n')}\n];\n// END GENERATED SHELL`;
if (!marker.test(source)) throw new Error('Missing generated shell markers');
const output = source.replace(marker, generated);
const total = pairs.reduce((sum, [, budget]) => sum + budget, 192 * 1024);
if (pairs.length > 90 || total > 8 * 1024 * 1024) throw new Error(`Public shell exceeds budget: ${pairs.length} URLs, ${total} bytes`);
if (process.argv.includes('--check')) {
  if (output !== source) throw new Error('Public cache map is stale. Run node halloween-exhibition/scripts/build-preview-cache.mjs');
} else await writeFile(workerFile, output);
console.log(`Public shell ${revision}: ${pairs.length} exact asset URLs + 1 HTML key; maximum ${total} cached body bytes. Install: 1 HTML request.`);
