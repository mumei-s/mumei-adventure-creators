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
assert.equal(meta('og:title'), '無名S note — Atelier');
assert.equal(meta('twitter:title'), meta('og:title'));
assert.ok(!/halloween/i.test(meta('og:title') + meta('og:description') + meta('twitter:description')), 'share text must be season-neutral');
assert.ok(meta('og:description').length > 20);
assert.equal(meta('twitter:card'), 'summary_large_image');
assert.equal(meta('og:image'), `${base}assets/atelier-text-card-20261108.jpg`);
assert.equal(meta('twitter:image'), meta('og:image'));
assert.equal(meta('og:image:type'), 'image/jpeg');
assert.equal(meta('og:image:width'), '1254');
assert.equal(meta('og:image:height'), '1254');
assert.ok(meta('og:image:alt').length > 10);
assert.ok(meta('twitter:image:alt').length > 10);
for (const [name,width,height] of [
  ['halloween-share-card-v28-4-6.png',1200,630],
  ['atelier-icon-32.png',32,32],
  ['atelier-icon-192.png',192,192]
]) {
  const png = fs.readFileSync(path.join(root, 'assets', name));
  assert.equal(png.subarray(0,8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(png.subarray(12,16).toString(), 'IHDR');
  assert.equal(png.readUInt32BE(16), width);
  assert.equal(png.readUInt32BE(20), height);
  assert.ok(png.length > 500);
}
assert.match(html, /<link\b(?=[^>]*rel=["']icon["'])(?=[^>]*href=["']\.\/assets\/atelier-icon-32\.png["'])[^>]*>/);
assert.match(html, /<link\b(?=[^>]*rel=["']apple-touch-icon["'])(?=[^>]*href=["']\.\/assets\/atelier-icon-192\.png["'])[^>]*>/);
const jpg = fs.readFileSync(path.join(root, 'assets', 'atelier-text-card-20261108.jpg'));
assert.equal(jpg.subarray(0,2).toString('hex'), 'ffd8', 'JPEG SOI marker required');
assert.equal(jpg.subarray(-2).toString('hex'), 'ffd9', 'JPEG EOI marker required');
assert.ok(jpg.length > 2500, 'OG preview asset unexpectedly small');
let dimensions;
for (let offset = 2; offset < jpg.length - 9;) {
  assert.equal(jpg[offset], 0xff, 'invalid JPEG marker');
  const marker = jpg[offset + 1];
  const length = jpg.readUInt16BE(offset + 2);
  if ([0xc0, 0xc1, 0xc2].includes(marker)) {
    dimensions = { height: jpg.readUInt16BE(offset + 5), width: jpg.readUInt16BE(offset + 7) };
    break;
  }
  assert.ok(length >= 2, 'invalid JPEG segment length');
  offset += 2 + length;
}
assert.deepEqual(dimensions, { width: 1254, height: 1254 }, 'square preview dimensions must match metadata');
console.log('Share preview metadata, square-safe JPEG and season-neutral favicon assets: PASS');
