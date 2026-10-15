const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..'),prefix='/halloween-exhibition/preview/';
 const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');let file=path.join(root,u.pathname.slice(prefix.length));if(u.pathname.endsWith('/'))file=path.join(file,'index.html');fs.readFile(file,(e,data)=>{if(e){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'})[path.extname(file)]||'text/html');res.end(data);});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));const base=`http://127.0.0.1:${server.address().port}${prefix}`;
 await page.goto(base);await page.waitForFunction(()=>!document.getElementById('palace-gate').disabled);await page.locator('#palace-gate').click();
 for(const [button,dialog] of [['#list-open','#roster'],['#year-open','#years'],['#artwork-open','#detail']]){await page.locator(button).click();await page.locator(`${dialog} .safe-dialog-back`).click();assert.equal(await page.locator(dialog).isVisible(),false);}
 await page.locator('#mode-normal').click();await page.locator('.visitor-settings-trigger').click();await page.locator('.visit-finish-panel summary').click();await page.locator('.visit-finish-button').click();assert.equal(await page.locator('#palace-entrance').isVisible(),true);assert.equal(await page.evaluate(()=>localStorage.getItem('halloween-yearbook:display-mode:v1')),'normal');assert.equal(await page.locator('.visitor-music-toggle').getAttribute('aria-pressed'),'false');
 await page.goto(base+'?return=palace');await page.waitForFunction(()=>!document.getElementById('palace-gate').disabled);assert.equal(await page.locator('#palace-entrance').isVisible(),true);
 await page.goto(base+'maze/');await page.waitForFunction(()=>document.getElementById('loading').hidden);await page.locator('#list-open').click();await page.locator('#panel .safe-dialog-back').click();assert.equal(await page.locator('#panel').isVisible(),false);await page.locator('.exit-link').click();await page.waitForFunction(()=>!document.getElementById('palace-gate').disabled);assert.equal(await page.locator('#palace-entrance').isVisible(),true);
 await page.goto(base+'admin/');await page.waitForFunction(()=>!document.getElementById('workspace').disabled);await page.locator('#title').fill('Keep this unsaved draft');await page.locator('header .back').click();assert.match(page.url(),/admin\/$/);assert.equal(await page.locator('#title').inputValue(),'Keep this unsaved draft');assert.match(await page.locator('#status').textContent(),/入力はこの画面に残/);assert.deepEqual(errors,[]);console.log('PASS: iPhone-size dialog returns, normal-mode finish/preference preservation, explicit castle deep link, maze finish, unsaved admin protection; no page errors.');
 }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
