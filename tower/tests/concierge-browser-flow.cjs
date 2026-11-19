const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const tower = process.env.TOWER_TEST_URL || new URL('/tower/', process.env.TEST_ORIGIN || 'http://127.0.0.1:4173').href;
const evidence = process.env.TOWER_EVIDENCE_DIR;

// Minimum visible floor height at the pictured glass door, left cabinet, desk and chairs.
// Coordinates describe the background photograph itself and intentionally exclude the desktop layout.
function floorEdge(x) {
  const lowerEdge = [[0,.70],[.10,.67],[.22,.62],[.30,.59],[.43,.55],[.49,.55],[.51,.61],[.57,.62],[.59,.65],[.80,.66],[.82,.63],[.96,.64],[.99,.70],[1,.70]];
  const index = lowerEdge.findIndex(([stop]) => stop >= x);
  if (index <= 0) return lowerEdge[0][1];
  const [left,y1] = lowerEdge[index-1], [right,y2] = lowerEdge[index];
  return y1 + (y2-y1) * (x-left)/(right-left);
}

function visibleFeet() {
  const actor = document.querySelector('#shared-content .world-resident');
  const scene = actor.closest('.world-stage').getBoundingClientRect();
  const sprite=actor.querySelector('img:not([hidden]),canvas:not([hidden])');
  const box=sprite.getBoundingClientRect(),width=sprite.naturalWidth || sprite.width,height=sprite.naturalHeight || sprite.height;
  const sample=document.createElement('canvas');sample.width=width;sample.height=height;
  const ctx=sample.getContext('2d');ctx.drawImage(sprite,0,0);
  const pixels = ctx.getImageData(0, 0, width, height).data;
  const scale = Math.min(box.width/width, box.height/height);
  for (let y=height-1; y>=0; y--) {
    let mass=0, center=0;
    for (let x=0; x<width; x++) {
      if (pixels[(y*width+x)*4+3] < 140) continue;
      mass++;
      center+=x+.5;
    }
    if (mass<3) continue;
    const screenX=box.left+(box.width-width*scale)/2+(center/mass)*scale;
    const screenY=box.bottom-(height-1-y)*scale;
    return { x:(screenX-scene.left)/scene.width, y:(screenY-scene.top)/scene.height };
  }
  throw Error('No opaque foot pixels in the visible sprite');
}

async function checkFeet(page, width, name) {
  const {x,y} = await page.evaluate(visibleFeet);
  if (evidence && (width===390 || y<floorEdge(x))) {
    await page.locator('#shared-dialog').screenshot({path:path.join(evidence,'concierge-'+width+'-'+name+'.png')});
  }
  assert.ok(y>=floorEdge(x)-.012, name+' foot ('+x.toFixed(3)+', '+y.toFixed(3)+') on the cabinet, door or chairs; pictured floor starts at '+floorEdge(x).toFixed(3));
  return { x,y };
}

async function toggleToOverview(page) {
  if (await page.locator('#shared-dialog').getAttribute('data-camera')!=='overview') await page.locator('.shared-camera').click();
}

async function tapPhoto(page,x,y) {
  const stage = await page.locator('#shared-content .world-stage').boundingBox();
  await page.mouse.click(stage.x+x*stage.width,stage.y+y*stage.height);
}

async function checkCamera(page) {
  const bank=page.locator('#shared-dialog .security-bank');
  const fixes = await bank.evaluate(bank => {
    const v = bank.closest('.shared-viewport').getBoundingClientRect(), b = bank.getBoundingClientRect();
    const frames=[...bank.querySelectorAll('.security-feed')].map(feed=>feed.getBoundingClientRect());
    return frames.length===4 && b.left>=v.left && b.top>=v.top && b.right<=v.right && b.bottom<=v.bottom &&
      frames[0].right<=frames[1].left && frames[0].bottom<=frames[2].top && frames.every(frame=>frame.width>=30&&frame.height>=15);
  });
  assert.ok(fixes, 'All four cameras are visible in a two-by-two grid');
  await bank.click();
  const viewer=page.locator('.camera-viewer[open]');
  await viewer.waitFor();
  const photographed=await viewer.locator('.security-feed img').evaluateAll(async images=>{
    await Promise.all(images.map(image=>image.decode()));
    return images.map(image=>({source:image.currentSrc,w:image.naturalWidth}));
  });
  assert.equal(new Set(photographed.map(feed=>feed.source)).size,4);
  assert.ok(photographed.every(feed=>feed.w>=200));
  await viewer.getByRole('button').first().click();
}

async function run() {
  if(evidence) await fs.mkdir(evidence,{recursive:true});
  const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});
  try {
    for(const [width,height] of [[390,844],[320,720],[844,390]]){
      const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',serviceWorkers:'block'});
      await context.route('https://**.supabase.co/**',route=>route.fulfill({json:{rooms:[],floors:12,perFloor:12,residents:[]},headers:{'access-control-allow-origin':'*'}}));
      const page=await context.newPage();
      const url=new URL(tower);url.searchParams.set('space','concierge');
      await page.goto(url.href,{waitUntil:'domcontentloaded'});
      await page.locator('#shared-content .world-resident img').evaluate(image=>image.decode());
      await page.locator('#shared-content .suite-interior').evaluate(image=>image.decode());
      await toggleToOverview(page);
      await checkFeet(page,width,'entry');
      // Approach the left cabinet on the floor, then press toward it and tap its face.
      await page.locator('#shared-controls [data-move=left]').focus();
      await page.keyboard.down('ArrowLeft');
      await page.waitForFunction(() => parseFloat(document.querySelector('#shared-content .world-resident').style.left)<36);
      await page.keyboard.up('ArrowLeft');
      await page.locator('#shared-controls [data-move=forward]').focus();
      await page.keyboard.down('ArrowUp');await page.waitForTimeout(1550);await page.keyboard.up('ArrowUp');
      const stopped=await checkFeet(page,width,'cabinet');
      await tapPhoto(page,.35,.43);await page.waitForTimeout(650);
      const afterTap=await checkFeet(page,width,'cabinet-tap');
      assert.ok(Math.abs(afterTap.y-stopped.y)<.075, 'A tap on the cabinet stays on the floor');
      await tapPhoto(page,.73,.84);
      await page.waitForFunction(() => parseFloat(document.querySelector('#shared-content .world-resident').style.left)>69);
      await page.locator('#shared-controls [data-move=forward]').focus();
      await page.keyboard.down('ArrowUp');await page.waitForTimeout(1550);await page.keyboard.up('ArrowUp');
      await checkFeet(page,width,'chairs');
      await checkCamera(page);
      await page.locator('.shared-camera').click();
      await checkCamera(page);
      const join=page.getByRole('button',{name:'入居して管理人に参加',exact:true});
      if(!await join.isVisible()) await page.locator('#shared-info').click();
      await join.click();
      assert.equal(await page.locator('#shared-dialog').isVisible(),false);
      await page.locator('#prompt-dialog[open]').waitFor();
      assert.equal(await page.locator('#prompt-id').evaluate(input=>document.activeElement===input),true);
      await context.close();
      console.log('PASS '+width+'×'+height+' photographed floor/cabinet/chairs, four cameras in both views, guest registration');
    }
  } finally {await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
