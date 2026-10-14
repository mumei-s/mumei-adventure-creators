const {chromium}=require('playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'../../..');
 const server=http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';
  let file=path.resolve(root,'.'+p);
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  // Also support older checkouts whose catalog lived outside preview/.
  if(!fs.existsSync(file)&&p.startsWith('/preview/maze/'))file=path.resolve(root,'.'+p.replace('/preview/maze/','/maze/'));
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end();}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':'text/html');res.end(data);});
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  const base=`http://127.0.0.1:${server.address().port}/preview/admin/`,save=()=>page.locator('#entry-form button[type=submit]').click();
  const draft=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('halloween-exhibition:article-editor:v1')));
  const select=title=>page.locator('.entry').filter({has:page.locator('strong').filter({hasText:title})}).click();
  await page.goto(base);await page.waitForFunction(()=>!document.getElementById('workspace').disabled);
  await page.evaluate(()=>localStorage.setItem('unrelated-app-marker','keep'));
  await page.locator('#title').fill('ブラウザ検証作品');await page.locator('#url').fill('https://note.com/ss_yr/n/test');await page.locator('#description').fill('プレビュー検証');
  await page.locator('#add-link').click();await page.locator('#links-0-title').fill('第二の記事');await page.locator('#links-0-url').fill('https://note.com/ss_yr/n/test-two');await save();
  await page.locator('.entry strong').filter({hasText:'ブラウザ検証作品'}).waitFor();
  assert.equal(await page.locator('#preview-title').textContent(),'ブラウザ検証作品');assert.equal(await page.locator('#links-0-title').inputValue(),'第二の記事');
  const firstID=await page.locator('#door-id').inputValue();assert.match(firstID,/^door-/);assert.equal(await page.locator('#door-id').getAttribute('readonly'),'');
  await page.locator('#add').click();await page.locator('#title').fill('同じ参加者の準備中');await page.locator('#submission').selectOption('pending');
  assert.equal(await page.locator('#url').evaluate(n=>n.required),false);assert.equal(await page.locator('#url').inputValue(),'');await save();
  const secondID=await page.locator('#door-id').inputValue();assert.notEqual(secondID,firstID);assert.equal(await page.locator('.entry').count(),2);
  let saved=await draft();assert.equal(saved.archive.evergreenEntries[1].links[0].url,'');assert.equal(saved.archive.evergreenEntries[1].role,undefined);
  await page.locator('#submission').selectOption('submitted');assert.equal(await page.locator('#url').evaluate(n=>n.required),true);await save();
  assert.equal((await draft()).archive.evergreenEntries[1].submissionStatus,'pending','browser validation prevents publishing with an unknown article URL');
  await page.locator('#url').fill('https://note.com/ss_yr/n/second');await page.locator('#image').fill('assets/portraits/ss_yr.jpg');await save();
  assert.equal(await page.locator('#door-id').inputValue(),secondID);assert.equal((await draft()).archive.evergreenEntries[0].title,'ブラウザ検証作品');
  await page.reload();await page.waitForFunction(()=>!document.getElementById('workspace').disabled);await select('ブラウザ検証作品');assert.equal(await page.locator('#door-id').inputValue(),firstID);
  await page.locator('#title').fill('最初の扉だけ変更');await save();saved=await draft();assert.equal(saved.archive.evergreenEntries[1].title,'同じ参加者の準備中');assert.equal(saved.archive.evergreenEntries[1].doorId,secondID);
  await page.locator('#delete').click();assert.equal(await page.locator('#trash-count').textContent(),'1');assert.equal(await page.locator('.entry').count(),1);
  await page.locator('#trash summary').click();await page.locator('#trash-list button').click();assert.equal(await page.locator('#trash-count').textContent(),'0');await select('最初の扉だけ変更');assert.equal(await page.locator('#door-id').inputValue(),firstID);
  const halloweenCount=(await draft()).archive.years.find(y=>y.year===2026).entries.length;
  await page.locator('[data-collection=halloween]').click();assert.equal(await page.locator('.entry').count(),halloweenCount);
  const legacy=(await draft()).archive.years.find(y=>y.year===2026).entries.find(e=>e.submissionStatus==='pending'&&e.links?.[0]?.url);
  await page.locator('.entry').filter({hasText:legacy.creatorId}).click();assert.equal(await page.locator('#url').inputValue(),'');assert.equal(await page.locator('#links-0-url').inputValue(),legacy.links[0].url);
  const legacyID=await page.locator('#door-id').inputValue();await save();assert.equal(await page.locator('#door-id').inputValue(),legacyID);assert.equal(await page.locator('#url').inputValue(),'');
  await page.locator('[data-collection=horror]').click();assert.equal(await page.locator('#url').evaluate(n=>n.required),true);assert.equal(await page.locator('#door-id-wrap').isVisible(),false);
  const catalogCount=(await draft()).catalog.articles.length;
  await page.locator('#title').fill('書庫の検証作品');await page.locator('#url').fill('https://note.com/ss_yr/n/catalog-test');await save();assert.equal(await page.locator('.entry').count(),catalogCount+1);
  await page.locator('#show-json').click();assert.equal(await page.locator('#json-dialog').evaluate(n=>n.open),true);await page.locator('#json-kind').selectOption('catalog');const out=JSON.parse(await page.locator('#json-output').inputValue());assert.equal(out.articles.at(-1).title,'書庫の検証作品');await page.keyboard.press('Escape');
  const downloadPromise=page.waitForEvent('download');await page.locator('#export-archive').click();const download=await downloadPromise;assert.equal(download.suggestedFilename(),'archive.json');
  assert.equal(await page.evaluate(()=>localStorage.getItem('unrelated-app-marker')),'keep');
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/atelier-editor-mobile.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'/tmp/atelier-editor-desktop.png',fullPage:true});
  const unlabeled=await page.locator('input:not([type=hidden]),select,textarea').evaluateAll(inputs=>inputs.filter(i=>!i.labels?.length&&!i.getAttribute('aria-label')).map(i=>i.id));assert.deepEqual(unlabeled,[]);assert.deepEqual(errors,[]);
  console.log('PASS browser: initial load, multi-door CRUD, pending URLs, stable IDs, legacy profile extras, draft reload, independent edit/restore, catalog compatibility, exports, storage isolation, 390px overflow and input labels; no page errors.');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exit(1);});
