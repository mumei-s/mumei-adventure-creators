import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const base = 'https://mumei-s.github.io/mumei-adventure-creators/halloween/';
const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map(([tag]) => {
  const attrs = Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map(([,k,v])=>[k,v]));
  return attrs;
});
function meta(name) {
  const matches = metas.filter(item => (item.property || item.name) === name);
  assert.equal(matches.length, 1, `${name} must be declared once`);
  return matches[0].content;
}
assert.equal(meta('og:type'), 'website');
assert.equal(meta('og:locale'), 'ja_JP');
assert.equal(meta('og:url'), base);
assert.match(meta('og:title'), /無名S note.*Halloween Atelier/);
assert.ok(meta('og:description').length > 20);
assert.equal(meta('twitter:card'), 'summary_large_image');
assert.equal(meta('og:image'), `${base}assets/halloween-share-card-v28-4-6.png`);
assert.equal(meta('twitter:image'), meta('og:image'));
assert.equal(meta('og:image:type'), 'image/png');
assert.equal(meta('og:image:width'), '1200');
assert.equal(meta('og:image:height'), '630');
assert.ok(meta('og:image:alt').length > 10);
assert.ok(meta('twitter:image:alt').length > 10);
for (const [name,width,height] of [
  ['halloween-share-card-v28-4-6.png',1200,630],
  ['halloween-icon-32-v28-4-6.png',32,32],
  ['halloween-icon-192-v28-4-6.png',192,192]
]) {
  const png = fs.readFileSync(path.join(root, 'assets', name));
  assert.equal(png.subarray(0,8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(png.subarray(12,16).toString(), 'IHDR');
  assert.equal(png.readUInt32BE(16), width);
  assert.equal(png.readUInt32BE(20), height);
  assert.ok(png.length > 500);
}
assert.match(html, /<link\b(?=[^>]*rel=["']icon["'])(?=[^>]*href=["']\.\/assets\/halloween-icon-32-v28-4-6\.png["'])[^>]*>/);
assert.match(html, /<link\b(?=[^>]*rel=["']apple-touch-icon["'])(?=[^>]*href=["']\.\/assets\/halloween-icon-192-v28-4-6\.png["'])[^>]*>/);
console.log('Share preview metadata, public image URLs, PNG dimensions and favicon assets: PASS');
