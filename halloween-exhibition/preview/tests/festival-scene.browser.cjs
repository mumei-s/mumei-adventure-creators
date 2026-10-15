const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const server=http.createServer((req,res)=>{const file=path.join(root,new URL(req.url,'http://localhost').pathname);fs.readFile(file.endsWith('/')?file+'index.html':file,(e,d)=>{if(e){res.writeHead(404);return res.end()}res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp'})[path.extname(file)]||'text/html');res.end(d)})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const width of [390,820,1280]){
   await page.setViewportSize({width,height:900});await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.locator('#palace-gate').click();await page.locator('.festival-scene').scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>document.querySelector('#festival-picture').complete && document.querySelector('#festival-picture').naturalWidth>0);
   const metrics=await page.locator('.festival-scene').evaluate(el=>{const r=el.getBoundingClientRect();return {width:r.width,height:r.height,ratio:r.width/r.height,buttons:[...el.querySelectorAll('button')].map(b=>{const r=b.getBoundingClientRect();return [r.width,r.height]})}});
   assert(Math.abs(metrics.ratio-(width<=600?1.7:2.4))<.01);assert(metrics.buttons.every(([w,h])=>w>=44&&h>=44));
   await page.locator('#festival-play').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('.festival-scene').getAttribute('data-magic'),'brew');
   await page.locator('.festival-coda').screenshot({path:`/tmp/festival-courtyard-${width}.png`});
   await page.locator('.festival-pumpkin').click();assert.equal(await page.locator('.festival-scene').getAttribute('data-magic'),'pumpkin');
   await page.locator('.festival-ghost').focus();await page.keyboard.press('Space');assert.equal(await page.locator('.festival-scene').getAttribute('data-magic'),'ghost');
   await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));assert.equal(await page.locator('.festival-spark').count(),0);
   await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));await page.locator('#festival-play').click();assert.equal(await page.locator('.festival-scene').getAttribute('data-magic'),'brew');
   await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#festival-play').click();assert.equal(await page.locator('.festival-scene').getAttribute('data-still'),'true');
   await page.waitForTimeout(2400);assert.equal(await page.locator('.festival-spark').count(),0);await page.emulateMedia({reducedMotion:'no-preference'});
   console.log(JSON.stringify({viewport:width,...metrics}));
  }
  assert.deepEqual(errors,[]);console.log('Browser checks passed: responsive geometry, keyboard, five reactions, reduced motion, bfcache, cleanup, no runtime errors.');
 } finally{await browser?.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
