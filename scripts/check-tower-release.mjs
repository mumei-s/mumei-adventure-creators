import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { exclusionReason } from './stage-pages.mjs';

const root = path.resolve(process.argv[2] || '.');
const base = 'https://mumei-s.github.io/mumei-adventure-creators/';
const revision = process.env.GITHUB_SHA || 'manual';
const trackedFiles = execFileSync('git', ['ls-files', '--', 'tower', 'halloween-exhibition/preview/diorama-city', 'halloween-exhibition/preview/admin'],
  { cwd: root, encoding: 'utf8' }).trim().split('\n').filter(file => file && !exclusionReason(file));
const admissionAlias = 'admission/tower/index.html';
const files = [...trackedFiles, admissionAlias];
const digest = data => createHash('sha256').update(data).digest('hex');
const expected = new Map(await Promise.all(files.map(async file =>
  [file, digest(await readFile(file === admissionAlias ? path.join(root, '_site', file) : path.join(root, file)))])));
let pending = files;

async function check(file, attempt) {
  const route = file.endsWith('/index.html') ? file.slice(0, -10) : file;
  const url = base + route + '?v=20261118&release=' + encodeURIComponent(revision) + '&check=' + attempt;
  try {
    const response = await fetch(url, { headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) return false;
    return digest(Buffer.from(await response.arrayBuffer())) === expected.get(file);
  } catch {
    return false;
  }
}

for (let attempt = 0; pending.length && attempt < 8; attempt++) {
  const remaining = [];
  for (let start = 0; start < pending.length; start += 6) {
    const batch = pending.slice(start, start + 6);
    const matches = await Promise.all(batch.map(file => check(file, attempt)));
    batch.forEach((file, index) => { if (!matches[index]) remaining.push(file); });
  }
  pending = remaining;
  if (pending.length && attempt < 7) {
    console.log('Waiting for the public release at ' + pending.length + ' paths.');
    await new Promise(resolve => setTimeout(resolve, 8000));
  }
}
if (pending.length) {
  throw new Error('Published content differs from this release at\n' + pending.join('\n'));
}
console.log('Verified ' + files.length + ' published Tower, city and editor files (including the generated admission alias) match release ' + revision + '.');
console.log('https://mumei-s.github.io/mumei-adventure-creators/tower/?v=20261118');
console.log('https://mumei-s.github.io/mumei-adventure-creators/halloween-exhibition/preview/diorama-city/?v=20261118');
