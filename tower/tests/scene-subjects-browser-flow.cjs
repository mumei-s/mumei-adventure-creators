const assert=require('node:assert/strict');
const {readFile}=require('node:fs/promises');
const path=require('node:path');
const {chromium}=require('playwright');
const base=process.env.ATELIER_TEST_URL||'http://127.0.0.1:4173/';
const tower=new URL('tower/',base), city=new URL('halloween-exhibition/preview/diorama-city/',base);
const roomId='cba00012-abcd-4f00-a001-04000000abcd',noteId='scene_artist';
const room={id:roomId,noteId,slot:21,isOwner:true,avatarVersion:9,profile:{name:'自分のキャラ',articles:[]},
  design:{avatarMode:'custom',world:{atlas:true},transport:{garage:{version:2},parkingTower:{version:5},motorcycle:{version:6},bicycle:{version:7}}}};
const media=new URL('published/media/'+roomId+'/',tower).href;
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});
  try{
    const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion:'reduce'});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(owner=>{
      localStorage.setItem('atelier-tower-owner-v1',JSON.stringify(owner));
      window.wrongFrames=[];
      const inspect=()=>{
        for(const img of document.querySelectorAll('#shared-content .world-resident img, #room-content .world-resident img, #citizen img')){
          if(img.naturalWidth && img.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}) && /resident\.webp|avatar-9\.img/.test(img.currentSrc)){
            window.wrongFrames.push(img.currentSrc);
          }
        }
        requestAnimationFrame(inspect);
      };requestAnimationFrame(inspect);
    },{id:roomId,noteId,key:'a'.repeat(64)});
    let releaseKey,releaseImage;
    const key=new Promise(resolve=>{releaseKey=resolve;}),art=new Promise(resolve=>{releaseImage=resolve;});
    const bytes=await readFile(path.join(__dirname,'../../halloween-exhibition/preview/diorama-city/assets/host-walk.webp'));
    const vehicle=await readFile(path.join(__dirname,'../assets/garage.webp'));
    await page.route(media+'*',async route=>{
      const avatar=route.request().url().endsWith('avatar-9.img');
      if(avatar)await art;
      await route.fulfill({body:avatar?bytes:vehicle,contentType:'image/webp'});
    });
    await page.route('https://*.supabase.co/**',async route=>{
      const body=route.request().postDataJSON();
      if(body?.action==='visit'){await key;await route.fulfill({json:room});}
      else await route.fulfill({json:{residents:[],rooms:[]}});
    });
    await page.goto(new URL('?space=bicycle',tower).href,{waitUntil:'domcontentloaded'});
    const walker=page.locator('#shared-content .world-resident');
    await page.locator('.shared-stage[data-space="bicycle"]').waitFor();
    assert.ok(await walker.isHidden());assert.equal(await walker.locator('img').count(),0);
    if(!await page.locator('#shared-details').isVisible())await page.click('#shared-info');
    await page.getByRole('button',{name:'ここでイラスト・note記事をつくる'}).click();
    const prompt=page.locator('#spot-text');
    assert.ok(!(await prompt.inputValue()).includes(media));
    releaseKey();await page.waitForFunction(url=>document.querySelector('#spot-text').value.includes(url),media+'bicycle-7.img');
    assert.ok((await prompt.inputValue()).includes(media+'avatar-9.img'));
    releaseImage();await walker.locator('canvas:not([hidden])').waitFor({state:'attached'});
    await page.selectOption('#spot-person','none');
    for(const kind of ['set','scene1','scene2','cover']){
      await page.selectOption('#spot-output',kind);const value=await prompt.inputValue();
      assert.ok(value.includes('人物なし') && value.includes(media+'bicycle-7.img') && !value.includes(media+'avatar-9.img'));
    }
    const ref1=path.join(__dirname,'../assets/prop-desk.webp'),ref2=path.join(__dirname,'../assets/gallery.webp');
    await page.selectOption('#spot-person','attachment');
    await page.locator('#spot-image').setInputFiles(ref1);
    assert.ok((await prompt.inputValue()).includes(media+'bicycle-7.img'));
    await page.locator('#spot-item-image').setInputFiles(ref2);
    await page.waitForFunction(()=>!document.getElementById('spot-copy').disabled);
    const two=await prompt.inputValue();assert.ok(two.includes('１枚目が人物、２枚目が乗り物・小物') && !two.includes(media));
    assert.equal(await page.locator('.spot-ref-preview:visible').count(),2);
    await page.selectOption('#spot-item','none');assert.ok((await prompt.inputValue()).includes('乗り物・小物は今回の絵に追加しない'));
    await page.click('#spot-reset-reference');await page.selectOption('#spot-item','parkingTower');
    assert.ok((await prompt.inputValue()).includes(media+'parkingTower-5.img'));
    await page.fill('#spot-id','other_creator');
    assert.ok(!(await prompt.inputValue()).includes(media));
    assert.deepEqual(await page.evaluate(()=>window.wrongFrames),[]);
    for(const [i,kind] of ['car','motorcycle','bicycle'].entries()){
      const area=i===1?'canal':'tower';
      await page.goto(new URL('?area='+area,city).href);
      await page.locator('#district[data-walker-state=ready]').waitFor();
      await page.locator('#shopfront-art').evaluate(img=>img.decode());
      if(i===1){
        await page.click('#camera');
        await page.locator('#street-shops [data-shop='+kind+']').click();
      }else{
        await page.click('#shop-directory');
        await page.locator('#shop-dialog [data-shop='+kind+']').click();
      }
      await page.locator('#city-world[data-venue=avenueShops]').waitFor();
      assert.equal(new URL(page.url()).searchParams.get('spot'),'avenueShops.'+kind);
      await page.click('#spot-prompt');
      const subject=kind==='car'?'parkingTower-5':kind==='bicycle'?'bicycle-7':'motorcycle-6';
      assert.ok((await prompt.inputValue()).includes(media+subject+'.img'));
      await page.locator('#spot-dialog .spot-return button').click();
      await page.waitForFunction(()=>document.querySelector('#scene-load-status').hidden);
      await page.click('#visit');
      await page.locator('.shop-window img').evaluate(img=>img.decode());
      await page.click('#activity-close');await page.click('#leave-venue');
      await page.waitForFunction(()=>!document.querySelector('#city-world').dataset.venue);
      assert.equal(new URL(page.url()).searchParams.get('area'),area);
      assert.deepEqual(await page.evaluate(()=>window.wrongFrames),[]);
    }
    await page.goto(new URL('?area=canal&spot=fair.carousel',city).href);
    await page.waitForSelector('#district[data-walker-state=ready]');
    await page.click('#visit');
    const gondola=page.locator('.ride-carriage.carousel-coach');
    await gondola.locator('.coach-back').evaluate(img=>img.decode());
    assert.ok(await gondola.locator('.coach-back').evaluate(img=>img.naturalWidth>=700));
    assert.equal(await gondola.locator('.coach-side').getAttribute('src'),await gondola.locator('.coach-back').getAttribute('src'));
    assert.ok(await gondola.locator('.coach-side').evaluate(img=>getComputedStyle(img).clipPath.startsWith('polygon')));
    assert.equal(await gondola.locator('.ride-avatar + .coach-side').count(),1);
    assert.deepEqual(errors,[]);
    console.log('PASS two independent references, automatic owned cars/motorcycles/bicycles, object-only and no-object artwork, no placeholder frames, both districts’ shop doors and layered carousel gondola.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
