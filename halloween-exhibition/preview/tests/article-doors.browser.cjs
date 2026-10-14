// Real-browser acceptance helper. Requires Playwright and an allowed Chromium environment.
const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..'),prefix='/halloween-exhibition/preview/';
 const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(!pathname.startsWith(prefix)){res.writeHead(404);return res.end();}
  let file=path.resolve(root,pathname.slice(prefix.length)||'index.html');
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404);return res.end();}const ext=path.extname(file);res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'})[ext]||'text/html');res.end(data);});
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  const page=await browser.newPage({reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const viewport of [{width:400,height:606},{width:333,height:619},{width:1180,height:758}]){
   await page.setViewportSize(viewport);await page.goto(`http://127.0.0.1:${server.address().port}${prefix}`);await page.waitForFunction(()=>document.getElementById('total-index').textContent==='10'&&!document.getElementById('artwork-open').disabled);
   assert.equal(await page.locator('#article-theater').isVisible(),false);assert.equal(await page.locator('#passport-open').count(),0);
   const top=await page.locator('#palace-gate').boundingBox();assert(top.width>=44&&top.height>=44);
   await page.screenshot({path:`/tmp/palace-top-${viewport.width}x${viewport.height}.png`,fullPage:true});
   await page.locator('#palace-gate').click();assert.equal(await page.locator('#article-theater').isVisible(),true);
   for(const index of [0,1,2,9]){
    await page.locator('#room-dots button').nth(index).click();
    const geometry=await page.evaluate(()=>{
     const box=id=>{const r=document.getElementById(id).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
     const image=document.getElementById('artwork-image'),mat=image.parentElement.getBoundingClientRect();
     return {frame:box('artwork-open'),image:box('artwork-image'),world:box('room-world'),previous:box('previous'),next:box('next'),mat:{left:mat.left,right:mat.right,top:mat.top,bottom:mat.bottom},fit:getComputedStyle(image).objectFit,overflow:document.documentElement.scrollWidth>innerWidth};
    });
    assert.equal(geometry.fit,'contain');assert.equal(geometry.overflow,false);
    assert(geometry.frame.bottom<=geometry.previous.top+1);assert(geometry.frame.bottom<=geometry.next.top+1);
    assert(geometry.image.left>=geometry.mat.left-1&&geometry.image.right<=geometry.mat.right+1);
    assert(geometry.image.top>=geometry.mat.top-1&&geometry.image.bottom<=geometry.mat.bottom+1);
    assert(geometry.frame.bottom<=geometry.world.bottom+1);assert(geometry.previous.height>=44&&geometry.next.height>=44);
   }
   await page.locator('#list-open').click();await page.locator('#roster-next').click();await page.locator('#roster-grid [data-door-id="owner-work-2026"]').click();
   await page.locator('#artwork-open').click();assert.match(await page.locator('#detail-content').textContent(),/主催者の個人作品/);await page.locator('#detail .close').click();
   await page.locator('#list-open').click();assert.equal(await page.locator('#roster-page-status').textContent(),'2 / 2 ページ');await page.locator('#roster .close').click();
   await page.screenshot({path:`/tmp/article-doors-${viewport.width}x${viewport.height}.png`,fullPage:true});
   await page.locator('#palace-return').click();assert.equal(await page.locator('#article-theater').isVisible(),false);await page.locator('#palace-gate').click();assert.equal(await page.locator('#theater').getAttribute('data-door-id'),'owner-work-2026');
  }
  assert.deepEqual(errors,[]);console.log('PASS: contained images, navigation below art, all target viewports, and page-two owner door return.');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1});
