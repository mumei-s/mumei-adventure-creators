// Static CSS regression checks only. This does not execute the browser cascade,
// responsive layout, mode-switch handlers, or saved appearance restoration.
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(process.argv[2] || new URL('../atelier-global-theme.css', import.meta.url), 'utf8');
const prefix = '--atelier-dark-';
const darkScope = 'html[data-site-theme=dark] body[data-lights=night]';
const everydayScope = `${darkScope}[data-collection=everyday]`;
const compact = value => value.replace(/\s+/g, '');
const normal = {
  page: '#1d293b', surface: '#29384c', raised: '#304158', input: '#202d40',
  button: '#34465e', active: '#3e5875', hover: '#3a506c', hero: '#243247',
  border: '#8296b1', 'button-border': '#91a5bf', 'input-border': '#91a5bf',
};
const halloween = {
  page: '#050608', surface: '#101216', raised: '#15181e', input: '#090b0f',
  button: '#171b22', active: '#223047', hover: '#202631', hero: '#0c0e12',
  border: '#49515e', 'button-border': '#626d7f', 'input-border': '#687386',
};

// Validate the sheet's structural syntax, including strings and comments, before
// extracting leaf rules. Color expressions below receive stricter value checks.
const stack = [];
let source = '', quote = '', comment = false;
for (let i = 0; i < css.length; i++) {
  const ch = css[i], next = css[i + 1];
  if (comment) { if (ch === '*' && next === '/') { comment = false; i++; } continue; }
  if (quote) {
    source += ch;
    if (ch === '\\') { assert.ok(next, 'Unterminated CSS escape'); source += next; i++; }
    else if (ch === quote) quote = '';
    continue;
  }
  if (ch === '/' && next === '*') { comment = true; source += ' '; i++; continue; }
  if (ch === '"' || ch === "'") quote = ch;
  else if ('{(['.includes(ch)) stack.push(ch);
  else if ('})]'.includes(ch)) assert.equal(stack.pop(), { '}': '{', ')': '(', ']': '[' }[ch], `Unbalanced CSS ${ch}`);
  source += ch;
}
assert.equal(comment, false, 'Unterminated CSS comment');
assert.equal(quote, '', 'Unterminated CSS string');
assert.deepEqual(stack, [], 'Unclosed CSS delimiter');

function declarations(block) {
  const parts = []; let start = 0, depth = 0, string = '';
  for (let i = 0; i <= block.length; i++) {
    const ch = block[i];
    if (string) { if (ch === '\\') i++; else if (ch === string) string = ''; continue; }
    if (ch === '"' || ch === "'") string = ch;
    else if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    else if ((ch === ';' && depth === 0) || i === block.length) { parts.push(block.slice(start, i).trim()); start = i + 1; }
  }
  const values = new Map();
  for (const part of parts.filter(Boolean)) {
    const match = part.match(/^([\w-]+)\s*:\s*([\s\S]+)$/);
    assert.ok(match, `Malformed CSS declaration: ${part}`);
    values.set(match[1], match[2].trim());
  }
  return values;
}
const rules = [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .map(([, selector, block]) => ({ selector: selector.trim(), values: declarations(block) }));
const findRule = selector => {
  const matches = rules.filter(rule => compact(rule.selector) === compact(selector));
  assert.equal(matches.length, 1, `Expected one CSS rule: ${selector}`);
  return matches[0].values;
};
const base = findRule(darkScope);
const everyday = findRule(everydayScope);
const value = text => text.replace(/\s*!important\s*$/, '').trim();
for (const rule of rules) for (const [name] of rule.values) {
  if (name.startsWith(prefix)) assert.equal(compact(rule.selector), compact(everydayScope), `${name} must only be assigned in everyday dark mode`);
}
assert.equal([...everyday.keys()].filter(name => name.startsWith(prefix)).length, Object.keys(normal).length);
for (const [name, color] of Object.entries(normal)) assert.equal(everyday.get(prefix + name), color, `Everyday ${name}`);
assert.equal(everyday.get('--night-chip'), 'var(--atelier-dark-raised)');

const fallbackNames = new Set();
for (const [, name, fallback] of source.matchAll(/var\(--atelier-dark-([a-z-]+),\s*([^)]*)\)/g)) {
  assert.equal(fallback.trim(), halloween[name], `Halloween ${name} fallback must remain unchanged`);
  fallbackNames.add(name);
}
assert.deepEqual([...fallbackNames].sort(), Object.keys(halloween).sort(), 'All shared dark tokens retain explicit Halloween fallbacks');
assert.equal(base.get('background'), 'var(--atelier-dark-page,#050608)!important', 'Dark body must override the earlier critical appearance');
assert.equal(findRule('html[data-site-theme=dark]').get('background'), halloween.page);
assert.equal(findRule('html[data-site-theme=dark][data-atelier-boot-collection=everyday]:not(:has(body)), html[data-site-theme=dark]:has(body[data-collection=everyday])').get('background'), normal.page, 'Outer canvas follows everyday mode at startup and after switching');

// Resolve only the constrained color expressions used by this layer. Do not
// mistake these static pairs for computed-style or browser accessibility tests.
function resolve(expression, collection) {
  const clean = value(expression);
  if (/^#[\da-f]{6}$/i.test(clean)) return clean;
  const match = clean.match(/^var\((--[\w-]+)(?:,\s*(#[\da-f]{6}))?\)$/i);
  assert.ok(match, `Unexpected color expression: ${expression}`);
  const configured = collection === 'everyday' ? everyday.get(match[1]) : undefined;
  return resolve(configured || match[2] || base.get(match[1]), collection);
}
const coloredRules = rules.filter(rule => [...rule.values.values()].some(v => /var\(--atelier-dark-/.test(v)));
for (const rule of coloredRules) {
  if (compact(rule.selector) === compact(everydayScope)) continue;
  assert.ok(rule.selector.startsWith(darkScope), `Palette use escaped dark scope: ${rule.selector}`);
}
const lum = hex => {
  const rgb = hex.slice(1).match(/../g).map(v => parseInt(v, 16) / 255)
    .map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
};
const contrast = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
const checks = [];
const check = (label, fg, bg, minimum) => {
  const ratio = contrast(fg, bg);
  assert.ok(ratio >= minimum, `${label}: ${ratio.toFixed(2)}:1 is below ${minimum}:1`);
  checks.push({ label, ratio });
};
for (const collection of ['everyday', 'halloween']) {
  for (const rule of coloredRules) {
    const background = rule.values.get('background'), foreground = rule.values.get('color');
    if (background?.startsWith('var(--atelier-dark-') && foreground) {
      check(`${collection} text in ${rule.selector}`, resolve(foreground, collection), resolve(background, collection), 4.5);
    }
  }
}
for (const name of ['surface', 'raised', 'input', 'button', 'hero']) {
  check(`everyday ${name} secondary`, resolve(base.get('--night-secondary'), 'everyday'), normal[name], 4.5);
}
for (const name of ['button', 'input']) check(`everyday ${name} boundary`, normal[`${name}-border`], normal[name], 3);
const placeholder = findRule(`${darkScope} :is(input,textarea)::placeholder`);
check('everyday placeholder', resolve(placeholder.get('color'), 'everyday'), normal.input, 4.5);
const selected = rules.find(rule => rule.selector.startsWith(darkScope) && rule.selector.includes('button[aria-pressed=true]'));
assert.ok(selected, 'Selected control rule is present');
check('everyday selected outline', resolve(selected.values.get('border-color'), 'everyday'), normal.active, 3);
assert.ok(lum(normal.page) > lum(halloween.page) * 10, 'Everyday page is visibly brighter than Halloween');
assert.ok(lum(normal.surface) > lum(halloween.surface) * 5, 'Everyday panels are visibly brighter than Halloween');
console.log(`PASS normal dark static CSS: balanced syntax, everyday-only token assignments, exact palettes and Halloween fallbacks, ${checks.length} text/placeholder/control-boundary contrast pairs. Browser rendering, responsive layout and saved-setting behavior are not exercised.`);
