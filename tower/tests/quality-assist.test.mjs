import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../quality-assist.js', import.meta.url));
const { articleChecks, imageContentChecks, normalizeCardLines } =
  await import('data:text/javascript;base64,' + source.toString('base64'));

test('blank checks reject single layers while preserving silhouettes, line art and translucent shading', () => {
  assert.match(imageContentChecks([200, 70, 70, 0, 100, 100, 100, 0])[0], /透明/);
  for (const color of [[255, 255, 255], [0, 0, 0], [140, 20, 70]]) {
    assert.match(imageContentChecks([...color, 255, ...color, 255])[0], /一色/);
    assert.deepEqual(imageContentChecks([...color, 255, ...color, 0]), []);
    assert.deepEqual(imageContentChecks([...color, 0, ...color, 128]), []);
    assert.deepEqual(imageContentChecks([...color, 32, ...color, 64]), []);
  }
  assert.deepEqual(imageContentChecks([254, 254, 254, 255, 254, 254, 255, 255]), []);
});

test('card formatter preserves multiple labels, distinct URLs, unrelated links and code examples', () => {
  const host = 'https://note.com/ss_yr';
  const spot = 'https://example.org/?arrival=tower&spot=cafe';
  const sample = [
    '[企画主](' + host + ') [カフェ](' + spot + ')',
    '関連記事 [最新記事](' + host + '/n/123) を読む',
    '画像 ![カードの例](' + host + ')',
    '例として `' + spot + '` と書く',
    '```text', '[例](' + host + ')', spot, '```',
    '本文の改行', '', '', '', 'を維持。',
  ];
  const formatted = normalizeCardLines(sample.join('\n'), [host, spot]);
  assert.ok(formatted.startsWith(['企画主', host, 'カフェ', spot].join('\n\n') + '\n'));
  assert.ok(formatted.endsWith(sample.slice(1).join('\n')));
  assert.equal(normalizeCardLines(formatted, [host, spot]), formatted);
  assert.equal(normalizeCardLines('企画主 <' + host + '> 場所 ' + spot + '。', [host, spot]),
    ['企画主', host, '場所', spot].join('\n\n'));
});

test('article checks only count publishable card links and image markers outside fenced examples', () => {
  const url = 'https://example.org/place';
  const text = ['# 題名', '企画主・無名S note', '［ここに街のイラスト１］',
    '~~~text', url, '［ここに街のイラスト２］', '~~~', '#無名Sプロンプト'].join('\n');
  const errors = articleChecks(text, { title: '題名', urls: [url] });
  assert.equal(errors.length, 2);
  assert.ok(errors.some(error => error.includes(url)));
  assert.ok(errors.some(error => error.includes('イラスト２')));
});
