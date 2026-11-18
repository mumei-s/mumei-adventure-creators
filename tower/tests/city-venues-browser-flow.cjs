const assert = require('node:assert/strict');
const {chromium} = require('playwright');

async function renderedFeet(page) {
  return page.evaluate(() => {
    const sprite = document.querySelector('#citizen canvas:not([hidden]):not(.pose-frame)');
    const plate = document.getElementById('venue-plate').getBoundingClientRect();
    const box = sprite.getBoundingClientRect(), width = sprite.width, height = sprite.height;
    const alpha = sprite.getContext('2d').getImageData(0, 0, width, height).data;
    const scale = Math.min(box.width / width, box.height / height);
    for (let y = height - 1; y >= 0; y--) {
      let weight = 0, totalX = 0;
      for (let x = 0; x < width; x++) {
        if (alpha[(y * width + x) * 4 + 3] > 128) { totalX += x + .5; weight++; }
      }
      if (weight < 3) continue;
      const screenX = box.left + (box.width - width * scale) / 2 + totalX / weight * scale;
      const screenY = box.bottom - (height - y - 1) * scale;
      return [(screenX - plate.left) / plate.width * 1000, (screenY - plate.top) / plate.height * 667];
    }
    throw Error('No visible foot pixels');
  });
}

(async () => {
  const {venues, venueWalkable} = await import('../../halloween-exhibition/preview/diorama-city/venues.js');
  const browser = await chromium.launch({headless:true, executablePath:process.env.BROWSER_EXECUTABLE || '/usr/bin/chromium', args:['--no-sandbox']});
  async function visit(name) {
    const venue = venues[name];
    const page = await browser.newPage({viewport:{width:390,height:844}, reducedMotion:'reduce', serviceWorkers:'block'});
    try {
      const url = new URL(process.env.CITY_URL || 'http://127.0.0.1:4173/halloween-exhibition/preview/diorama-city/');
      if (['market','manor','mirrorRoom','fair','avenueShops'].includes(name)) url.searchParams.set('area','canal');
      url.searchParams.set('spot',name);
      await page.goto(url.href,{waitUntil:'domcontentloaded'});
      await page.waitForSelector('#city-world[data-venue="' + name + '"]');
      await page.locator('#venue-plate').evaluate(image => image.decode());
      await page.waitForSelector('#citizen canvas:not([hidden]):not(.pose-frame)');
      for (const [key,spot] of Object.entries(venue.spots)) {
        await page.locator('#destination-menu summary').click();
        await page.locator('#venue-guide [data-head-to="' + key + '"]').click();
        await page.waitForFunction(([x,y]) => {
          const point = document.querySelector('#citizen').dataset.position.split(',').map(Number);
          return Math.abs(point[0] - x) < .25 && Math.abs(point[1] - y) < .25;
        },spot.point,{timeout:18000});
        const foot = await renderedFeet(page);
        assert.ok(venueWalkable(foot,venue), name + '/' + key + ' visible foot at ' + foot);
        assert.equal(await page.locator('#visit').isEnabled(),true,name+' '+key);
        assert.equal(await page.locator('#place-name').textContent(),spot.label);
      }
      console.log('PASS registered walk-to actions and visible feet on pictured floor: '+name+' ('+Object.keys(venue.spots).length+')');
    } finally { await page.close(); }
  }
  try {
    const names = Object.keys(venues);
    for (let i = 0; i < names.length; i += 3) await Promise.all(names.slice(i,i+3).map(visit));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
