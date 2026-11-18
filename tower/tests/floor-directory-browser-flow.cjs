const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:4173';
const towerUrl = process.env.TOWER_TEST_URL || new URL('/tower/#floors', origin).href;
const sizes = [[320, 720], [360, 800], [390, 844], [640, 900], [641, 900], [844, 390], [820, 1180], [1440, 960]];
const profiles = ['auto', 'phone', 'tablet', 'desktop'];

function measureDirectory() {
  const failures = [];
  const buttons = [...document.querySelectorAll('#floor-buttons button')];
  const boxes = [];
  let smallest = Infinity;
  for (const button of buttons) {
    const rect = button.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(button);
    const label = range.getBoundingClientRect();
    const text = button.textContent.trim();
    if (rect.width < 43.9 || rect.height < 43.9) failures.push(text + ' target ' + rect.width + '×' + rect.height);
    if (label.left < rect.left + 1 || label.right > rect.right - 1 || label.top < rect.top || label.bottom > rect.bottom) failures.push(text + ' label extends outside its target');
    for (const previous of boxes) {
      if (rect.left < previous.right && rect.right > previous.left && rect.top < previous.bottom && rect.bottom > previous.top) failures.push(text + ' overlaps another button');
    }
    const dot = getComputedStyle(button, '::after');
    if (dot.content !== 'none' && dot.display !== 'none' && dot.position === 'absolute') {
      const border = button.clientLeft;
      const right = rect.right - border - parseFloat(dot.right);
      const top = rect.top + border + parseFloat(dot.top);
      if (label.left < right && label.right > right - parseFloat(dot.width) && label.top < top + parseFloat(dot.height) && label.bottom > top) failures.push(text + ' overlaps occupancy light');
    }
    boxes.push(rect);
    smallest = Math.min(smallest, rect.width);
  }
  const panel = document.querySelector('.directory-grid').getBoundingClientRect();
  const elevator = document.querySelector('.elevator').getBoundingClientRect();
  if (boxes.some(rect => rect.left < elevator.left || rect.right > elevator.right)) failures.push('Button extends outside elevator');
  if (panel.left < 0 || panel.right > innerWidth + 1 || document.documentElement.scrollWidth > innerWidth) failures.push('Page or directory overflows the viewport');
  return { failures, smallest, labels: buttons.map(button => button.textContent.trim()) };
}

async function setProfile(page, profile) {
  await page.locator('.site-header [data-game-settings]').click();
  await page.locator('#game-layout').selectOption(profile);
  await page.locator('#game-settings .game-dialog-bar button').click();
  await page.waitForFunction(value => document.body.dataset.layoutMode === value, profile);
}

async function selectFloor(page, number) {
  await page.locator('#floor-buttons').getByRole('button', { name: number + 'F', exact: true }).click();
  await page.waitForFunction(expected => document.querySelector('#current-floor').textContent === expected, number + 'F');
  assert.equal(await page.locator('#floor-buttons [aria-pressed=true]').textContent(), number + 'F');
  const numbers = await page.locator('#room-cards .card-number').allTextContents();
  const expected = Array.from({ length: 12 }, (_, index) => number + String(index + 1).padStart(2, '0') + '号室');
  assert.deepEqual(numbers.filter(text => text.endsWith('号室')), expected);
}

async function verifyConnections(page) {
  const levels = await page.locator('#cutaway-floor option').evaluateAll(options => options.map(option => option.value));
  assert.ok(levels.includes('sky') && levels.includes('parking') && levels.includes('seismic'));
  await page.locator('#cutaway-floor').selectOption('parking');
  const visible = await page.locator('#cutaway-building [data-level=parking]').evaluate(row => {
    const target = row.getBoundingClientRect();
    const frame = document.querySelector('#cutaway-building').getBoundingClientRect();
    return target.bottom > frame.top && target.top < frame.bottom;
  });
  assert.equal(visible, true, 'B1 cutaway level in view');
  assert.equal(await page.locator('#current-floor').textContent(), '12F');
  await page.locator('#open-stairs').click();
  await page.locator('#stair-up').click();
  assert.match(await page.locator('#stair-title').textContent(), /13F/);
  await page.locator('#stair-exit').click();
  await page.locator('#shared-dialog[open] [data-space=sky].shared-stage').waitFor();
  await page.keyboard.press('Escape');
  await selectFloor(page, 1);
  await page.locator('#open-stairs').click();
  await page.locator('#stair-down').click();
  assert.match(await page.locator('#stair-title').textContent(), /^G /);
  await page.locator('#stair-down').click();
  assert.match(await page.locator('#stair-title').textContent(), /B1/);
  await page.locator('#stair-exit').click();
  await page.locator('#shared-dialog[open] [data-space=parking].shared-stage').waitFor();
}

async function run() {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE || '/usr/bin/chromium', args: ['--no-sandbox'] });
  const evidence = process.env.TOWER_EVIDENCE_DIR;
  const residents = Array.from({length: 12}, (_, index) => ({
    id: '12345678-1234-4123-8123-' + String(index + 1).padStart(12, '0'), slot: 12 * index + 1,
    noteId: 'resident_' + index, title: '入居中のアトリエ', name: '住人', theme: 'story'
  }));
  const catalog = { floors: 12, perFloor: 12, rooms: residents };
  let cases = 0;
  let minimum = Infinity;
  try {
    if (evidence) await fs.mkdir(evidence, { recursive: true });
    for (const [width, height] of sizes) {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', serviceWorkers: 'block' });
      await context.route('https://**.supabase.co/**', route => route.fulfill({json: new URL(route.request().url()).searchParams.get('view') === 'list' ? catalog : {residents}, headers: {'access-control-allow-origin':'*'}}));
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(towerUrl, {waitUntil: 'domcontentloaded'});
      await page.locator('#floor-buttons [data-occupied=true]').first().waitFor();
      for (const profile of profiles) {
        await setProfile(page, profile);
        await page.locator('#floor-buttons').scrollIntoViewIfNeeded();
        const result = await page.evaluate(measureDirectory);
        assert.deepEqual(result.labels, Array.from({length: 12}, (_, index) => (index + 1) + 'F'));
        if (evidence && result.failures.length) await page.locator('.elevator').screenshot({path:path.join(evidence, 'failure-' + width + '-' + profile + '.png')});
        assert.deepEqual(result.failures, [], width + '×' + height + ' ' + profile + ': ' + result.failures.join(', '));
        minimum = Math.min(minimum, result.smallest);
        for (const floor of [10, 11, 12]) await selectFloor(page, floor);
        if (evidence && profile === 'auto') await page.locator('.elevator').screenshot({path:path.join(evidence, 'elevator-' + width + '.png')});
        cases++;
      }
      if (width === 390) await verifyConnections(page);
      assert.deepEqual(errors, []);
      console.log('PASS ' + width + '×' + height + ', 4 display modes');
      await context.close();
    }
    console.log('PASS ' + cases + ' layouts; minimum target width ' + minimum + 'px; floor 10–12 room numbers; stairs to 13F and B1.');
  } finally {
    await browser.close();
  }
}
run().catch(error => {console.error(error); process.exitCode = 1;});
