const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const site = process.env.ATELIER_TEST_URL || 'http://127.0.0.1:4173/';
const city = new URL('halloween-exhibition/preview/diorama-city/', site);
const tower = new URL('tower/', site);
const streetMap = /\/(?:district|canal)-detailed\.(?:webp|avif)$/;
const originalFeed = /\/assets\/(?:entrance-lounge|driveway|garage|bicycle-court)\.webp$/;

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.BROWSER_EXECUTABLE || '/usr/bin/chromium',
    headless: true, args: ['--no-sandbox'],
  });
  try {
    const context = await browser.newContext({
      viewport:{width:390,height:844}, reducedMotion:'reduce', serviceWorkers:'block',
      permissions:['clipboard-read','clipboard-write'],
    });
    const page = await context.newPage();
    const paths = [];
    const errors = [];
    page.on('request', request => paths.push(new URL(request.url()).pathname));
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://*.supabase.co/**', route => route.fulfill({
      json:{floors:12,perFloor:12,rooms:[],residents:[]},headers:{'access-control-allow-origin':'*'},
    }));
    const waitForBackdrop = () => page.waitForFunction(() => document.querySelector('#scene-load-status').hidden);
    let release;
    const hold = new Promise(resolve => {release=resolve;});
    await page.route('**/assets/cafe.webp', async route => {await hold;await route.continue();});
    await page.goto(new URL('?spot=cafe.counter',city).href,{waitUntil:'domcontentloaded'});
    await page.waitForSelector('#city-world[data-venue="cafe"]');
    assert.equal(await page.isVisible('#scene-load-status'),true);
    await page.click('#spot-prompt');
    await page.selectOption('#spot-output','scene1');
    await page.click('#spot-copy');
    const first = await page.evaluate(() => navigator.clipboard.readText());
    assert.ok(first.includes('本文イラスト１だけ') && first.includes('/assets/cafe.webp'));
    await page.selectOption('#spot-output','scene2');
    assert.match(await page.inputValue('#spot-text'),/本文イラスト２だけ/);
    await page.selectOption('#spot-output','cover');
    assert.match(await page.inputValue('#spot-text'),/1280×650/);
    await page.selectOption('#spot-output','set');
    assert.match(await page.inputValue('#spot-text'),/別々の完成画像２枚/);
    assert.equal(paths.some(path=>streetMap.test(path)),false,'A facility must not fetch a hidden full exterior');
    release();
    await waitForBackdrop();
    assert.equal(paths.filter(path=>path.endsWith('/assets/cafe.webp')).length,1);
    await page.locator('#spot-dialog .spot-return button').click();
    await page.goto(new URL('?spot=street.marketGate',city).href,{waitUntil:'domcontentloaded'});
    await page.waitForSelector('#city-world[data-area="tower"]');
    await waitForBackdrop();
    const start = await page.getAttribute('#citizen','data-position');
    const doc = await page.evaluateHandle(()=>document);
    await page.click('#visit');
    await page.waitForSelector('#city-world[data-area="canal"]');
    await waitForBackdrop();
    assert.ok(await page.evaluate(old=>old===document,doc),'Crossing must keep the existing document and walker');
    const mapsBefore = paths.filter(path=>streetMap.test(path)).length;
    await page.goBack();
    await page.waitForSelector('#city-world[data-area="tower"]');
    await waitForBackdrop();
    assert.equal(await page.getAttribute('#citizen','data-position'),start);
    assert.equal(paths.filter(path=>streetMap.test(path)).length,mapsBefore,'Back must reuse the decoded exterior');
    await page.goForward();
    await page.waitForSelector('#city-world[data-area="canal"]');
    assert.ok(await page.evaluate(old=>old===document,doc));

    paths.length=0;
    await page.goto(new URL('?space=concierge',tower).href,{waitUntil:'domcontentloaded'});
    await page.waitForSelector('.shared-stage[data-space="concierge"] .suite-interior');
    await page.locator('.concierge-wall-screens img').evaluateAll(images=>Promise.all(images.map(img=>img.decode())));
    assert.equal(paths.filter(path=>originalFeed.test(path)).length,0,'Small monitors must not fetch four full-size rooms');
    assert.equal(new Set(paths.filter(path=>path.includes('/thumbs/') && /entrance-lounge|driveway|garage|bicycle-court/.test(path))).size,4);
    await page.locator('.security-bank').click();
    await page.locator('.camera-viewer .security-feed img').evaluateAll(images=>Promise.all(images.map(img=>img.decode())));
    assert.equal(new Set(paths.filter(path=>originalFeed.test(path))).size,4,'Expanded monitors retain full resolution');
    assert.deepEqual(errors,[]);
    console.log('PASS direct venue: one backdrop, zero exterior transfers; prompt copied while art was pending; district crossing, back and forward: one document; small and expanded cameras use the right resolution.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
