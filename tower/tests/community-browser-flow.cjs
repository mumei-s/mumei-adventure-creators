const assert=require('node:assert/strict');
const { chromium }=require('playwright');
const site=process.env.ATELIER_TEST_URL||'http://127.0.0.1:4173/';
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});
  try{
    const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce',serviceWorkers:'block'});
    const errors=[],backend=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('request',req=>{if(new URL(req.url()).hostname.endsWith('supabase.co'))backend.push(req.url());});
    const tower=new URL('tower/',site);
    const directory=await (await page.request.get(new URL('published/list.json',tower).href)).json();
    const person=directory.rooms.find(r=>r.noteId==='amita777');
    assert.ok(person && person.slot===52);
    await page.addInitScript(()=>Object.defineProperty(navigator,'share',{value:async data=>{window.sharedRoomUrl=data.url;},configurable:true}));
    await page.goto(new URL('?creator=previous_visitor&slot=12&space=lobby&room='+person.id,tower).href);
    const host=page.locator('#room-content .room-host');
    await host.waitFor();
    assert.equal(await page.locator('#room-content .world-resident').count(),1);
    assert.equal(await page.getByRole('button',{name:/アバターで街を歩く/}).count(),0);
    const streetExit=await page.locator('#room-content').getByRole('link',{name:'街へ出る'}).getAttribute('href');
    assert.equal(new URL(streetExit,tower).search,'?arrival=tower');
    await page.locator('#share-room').click();
    assert.deepEqual([...new URL(await page.evaluate(()=>window.sharedRoomUrl)).searchParams],[['room',person.id]]);
    await host.click();
    for(const name of ['部屋の話をする','作品の話をする','部屋の話をする']){
      await page.locator('.resident-talk').getByRole('button',{name}).click();
      assert.equal(await page.locator('.resident-talk').getByRole('button',{name}).getAttribute('aria-pressed'),'true');
    }
    await page.locator('.resident-talk').getByRole('button',{name:'閉じる'}).click();
    await page.goto(new URL('?space=boiler',tower).href);
    await page.getByRole('button',{name:'設備のイラストを見る'}).click();
    const art=page.locator('.equipment-art');
    assert.ok(await art.evaluate(async img=>{await img.decode();return img.naturalWidth>=1000;}));
    await page.locator('.equipment-choices').getByRole('button',{name:'配管をたどる'}).click();
    await page.goto(new URL('?space=seismic',tower).href);
    const playSeismic=name=>page.locator('.seismic-tools').getByRole('button',{name,exact:true}).click();
    await playSeismic('免震の動きを見る');await page.locator('.isolation-model').waitFor();
    await playSeismic('もう一度再生');
    await page.locator('.isolation-model').waitFor({state:'hidden',timeout:8000});
    await playSeismic('免震の動きをもう一度見る');await page.locator('.isolation-model').waitFor();
    await page.goto(new URL('?space=motorcycle',tower).href);
    const bike=page.locator('.parked-vehicle').first();
    await bike.waitFor();
    await bike.click();
    const portrait=page.locator('.vehicle-portrait img');
    assert.ok(await portrait.evaluate(async img=>{await img.decode();return img.naturalWidth>100;}));
    await page.goto(new URL('halloween-exhibition/preview/diorama-city/?area=canal',site).href);
    await page.locator('#street-roster').waitFor();
    const id=await page.locator('#street-roster select').selectOption(person.id);
    assert.deepEqual(id,[person.id]);
    await page.locator('#street-roster button').click();
    const talk=page.locator('.resident-talk');
    assert.equal(await talk.getByRole('button',{name:/アバターで街を歩く/}).count(),0);
    await talk.getByRole('button',{name:'部屋の話をする'}).click();
    assert.equal(new URL(await talk.getByRole('link',{name:'この住人の部屋へ'}).getAttribute('href')).searchParams.get('room'),person.id);
    await talk.getByRole('button',{name:'閉じる'}).click();

    // Old bookmarks still open the named place as a visitor.
    const bookmark=new URL('halloween-exhibition/preview/diorama-city/?spot=cafe.counter&resident='+person.id,site);
    await page.goto(bookmark.href);
    await page.locator('#district[data-walker-state=ready]').waitFor();
    assert.equal(await page.textContent('#walker-name'),'ビジター');
    assert.equal(new URL(page.url()).searchParams.has('resident'),false);
    assert.ok((await page.locator('#citizen img').getAttribute('src')).endsWith('/tower/assets/resident.webp'));
    await page.click('#spot-prompt');
    await page.fill('#spot-id',person.noteId);
    assert.ok(await page.locator('#spot-save-reference').isHidden());
    assert.ok(!(await page.inputValue('#spot-text')).includes('/media/'+person.id+'/'));
    await page.goto(new URL('?creator='+person.noteId+'#prompt-play',tower).href);
    await page.locator('#prompt-dialog[open]').waitFor();
    assert.ok(!(await page.inputValue('#prompt-text')).includes('/media/'+person.id+'/'));
    assert.deepEqual(errors,[]);assert.deepEqual(backend,[]);
    console.log('PASS existing resident, visitor and repeat dialogue; boiler illustration, repeatable isolation, motorcycle enlargement, residents in both districts and conversations, legacy bookmarks and prompt references with a visitor avatar and zero backend reads.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
