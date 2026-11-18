const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {chromium}=require('playwright');
const site=process.env.ATELIER_TEST_URL||'http://127.0.0.1:4173/';
const source=path.join(__dirname,'..');
const noteId='enrollment_test', id='a2222222-aaaa-4444-bbbb-222222222222';
const profile={name:'テスト住人',photo:'',description:'',articles:[]};
const design={title:'月の書斎',theme:'story',light:'natural',avatarMode:'resident',avatarName:'',pin:'',welcome:''};
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});
  try {
    const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',serviceWorkers:'block',permissions:['clipboard-read','clipboard-write']});
    const page=await ctx.newPage(), calls=[], errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('https://*.supabase.co/**',async route=>{
      const req=route.request(),u=new URL(req.url());
      assert.equal(u.hostname,'slamzhgsawfnmwlejgqp.supabase.co');
      const data=req.method()==='POST'?req.postDataJSON():{};
      const kind=u.searchParams.get('view')||data.action;
      calls.push(kind);
      const response=kind==='preview'?{noteId,profile,design}:kind==='begin'?{code:'AT-TEST-123',key:'f'.repeat(64),expiresIn:1200}:
        {id,slot:1,noteId,profile,design:{...design,avatarMode:'custom',world:{atlas:true,artwork:'b'.repeat(24)}},avatarVersion:1,version:2,stamps:{}};
      if(kind==='begin') assert.equal(data.slot,1);
      if(kind==='confirm') {assert.equal(req.headers()['x-tower-key'],'f'.repeat(64));assert.ok(data.avatarB64 && data.interiorB64);}
      await route.fulfill({json:response,headers:{'access-control-allow-origin':'*'}});
    });
    await page.goto(new URL('tower/?space=lobby',site).href);
    await page.getByRole('button',{name:'ここから入居する'}).click();
    await page.fill('#prompt-id',noteId);
    await page.click('#copy-play-prompt');
    const prompt=await page.evaluate(()=>navigator.clipboard.readText());
    assert.ok(prompt.indexOf('ゲーム用アバター画像') < prompt.indexOf('ここで返事を待つ'));
    const back=new URL(prompt.split('\n').find(line=>line.startsWith('https://') && line.includes('#prompt-import')));
    assert.equal(back.searchParams.get('creator'),noteId);
    assert.deepEqual(calls,[]);
    await page.goto(new URL('tower/'+back.search+back.hash,site).href);
    await page.waitForSelector('#entry-slot option[value="1"]',{state:'attached'});
    assert.equal(await page.inputValue('#prompt-id'),noteId);
    assert.equal(await page.locator('#entry-slot option[value="52"]').count(),0);
    await page.selectOption('#entry-slot','1');
    const files=await fs.readdir(path.join(source,'published/media/1a8aed3e-bf97-42ac-bcb7-c2e4703b8a55'));
    for(const kind of ['avatar','interior']){
      const file=files.find(f=>f.startsWith(kind+'-'));
      await page.setInputFiles('#generated-'+kind,{name:kind+'.webp',mimeType:'image/webp',buffer:await fs.readFile(path.join(source,'published/media/1a8aed3e-bf97-42ac-bcb7-c2e4703b8a55',file))});
      await page.locator('#generated-'+kind+'-preview').waitFor();
    }
    await page.waitForFunction(()=>document.querySelector('#import-status').textContent.includes('２枚がそろいました'));
    await page.locator('#prompt-import button[type=submit]').click();
    await page.getByText('AT-TEST-123',{exact:true}).waitFor();
    assert.equal(await page.locator('#room-dialog[open]').count(),0);
    await page.click('#verify-proof');
    await page.locator('.move-in-complete').getByRole('button',{name:'記事にする'}).click();
    const article=await page.inputValue('#move-article-text');
    for(const text of ['@'+noteId,'101号室','1280×650','本文イラスト１','本文イラスト２','添付は任意',id]) assert.ok(article.includes(text),text);
    assert.deepEqual(calls,['preview','begin','confirm']);assert.deepEqual(errors,[]);
    console.log('PASS lobby, avatar, room preference, ID-bearing return, vacant unit, both images, ownership challenge and optional four-part article.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
