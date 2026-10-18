import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Publish a copy, never remove or rewrite sources or browser/user data.
export const publicRoots = new Set(['halloween', 'halloween-exhibition', 'preview-v2', 'preview-v3', 'atelier-rebuild-20261017']);
export function exclusionReason(relative) {
  const parts = relative.split('/');
  if (parts.some(part => part.startsWith('.') && part !== '.well-known' && part !== '.nojekyll')) return 'private or tool metadata';
  if (parts.some(part => ['node_modules', 'tests', 'scripts', 'supabase'].includes(part))) return 'build/test/server-only files';
  if (/(?:^|\/)(?:runtime-build|gallery-script-manifest|game-script-manifest|gallery-style-sources|game-style-sources)\.json$/.test(relative)) return 'build manifests';
  if (/^halloween\/(?:audit|verification)\//.test(relative)) return 'development evidence; runtime visual proofs under assets/verification are retained';
  if (/\.(?:md|py|mjs|cjs|log|map)$/i.test(relative) || /(?:^|\/)package(?:-lock)?\.json$/.test(relative)) return 'development documentation/configuration';
  if (parts.length > 1 && !publicRoots.has(parts[0])) return 'outside public site roots';
  if (parts.length === 1 && !['index.html', 'app.js', 'styles.css', 'CNAME', '.nojekyll', 'robots.txt', 'sitemap.xml'].includes(relative)) return 'outside public entry files';
  return null;
}
async function walk(root, prefix = '') {
  const entries = await fs.readdir(path.join(root, prefix), {withFileTypes: true});
  const files = [];
  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === '_site' || entry.name === 'node_modules') continue;
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) throw new Error(`Refusing to publish symlink: ${relative}`);
    if (entry.isDirectory()) files.push(...await walk(root, relative));
    else if (entry.isFile()) files.push(relative);
  }
  return files.sort();
}
// Detect a removed file referenced by any retained HTML/CSS/JS/JSON. Keep all
// runtime assets and their original URLs, including dynamic filename families.
export async function validateReferences(source, files, included) {
  const all = new Set(files), kept = new Set(included), failures = [];
  for (const relative of included.filter(file => /\.(?:html|css|js|json|webmanifest)$/.test(file))) {
    const content = await fs.readFile(path.join(source, relative), 'utf8');
    const values = [...content.matchAll(/["'`](\.?\.?\/[^"'`\s<>]+|[A-Za-z0-9_][^"'`\s<>]*\.(?:js|css|json|png|jpe?g|webp|svg|html|woff2?)(?:\?[^"'`\s<>]*)?)["'`]/g)].map(match => match[1]);
    for (const value of values) {
      if (/^(?:[a-z]+:|\/\/)/i.test(value) || value.includes('${')) continue;
      const clean = value.split(/[?#]/)[0];
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(relative), clean));
      if (all.has(resolved) && !kept.has(resolved)) failures.push(`${relative} -> ${resolved}`);
    }
  }
  if (failures.length) throw new Error(`Release excludes referenced files:\n${[...new Set(failures)].join('\n')}`);
}
export async function stagePages(source, destination) {
  source = path.resolve(source); destination = path.resolve(destination);
  if (destination === source || source.startsWith(destination + path.sep)) throw new Error('Output must not replace source or its parent');
  // Refuse non-empty destinations rather than clearing anything implicitly.
  await fs.mkdir(destination, {recursive: true});
  if ((await fs.readdir(destination)).length) throw new Error('Output directory must be empty');
  const files = await walk(source);
  const included = files.filter(file => !exclusionReason(file));
  await validateReferences(source, files, included);
  const report = {sourceBytes: 0, stagedBytes: 0, sourceFiles: files.length, stagedFiles: included.length, excluded: []};
  for (const relative of files) {
    const bytes = (await fs.stat(path.join(source, relative))).size;
    report.sourceBytes += bytes;
    const reason = exclusionReason(relative);
    if (reason) { report.excluded.push({path: relative, bytes, reason}); continue; }
    const target = path.join(destination, relative);
    await fs.mkdir(path.dirname(target), {recursive: true});
    await fs.copyFile(path.join(source, relative), target);
    report.stagedBytes += bytes;
  }
  report.savedBytes = report.sourceBytes - report.stagedBytes;
  report.note = 'Logical source bytes exclude .git, node_modules and _site; dependency/build caches never enter the release. All image originals and runtime URLs retained except development-only halloween/verification evidence.';
  return report;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const source = path.resolve(process.argv[2] || '.');
  const destination = path.resolve(process.argv[3] || '_site');
  const report = await stagePages(source, destination);
  if (process.env.GITHUB_STEP_SUMMARY) await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `\n### Public release staging\n${report.stagedFiles} files: ${report.stagedBytes} bytes (${(report.stagedBytes / 1048576).toFixed(2)} MiB). Excluded ${report.savedBytes} source bytes, plus installed build dependencies. Sources unchanged.\n`);
  console.log(JSON.stringify(report, null, 2));
}
