const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const root=path.resolve(__dirname,'../..');
let evidence;
const id='12345678-1234-1234-1234-123456789012';
const spaces=['owner','sky','lobby','concierge','driveway','bicycle','parking','parkingTower','motorcycle','boiler','seismic'];
(async()=>{
 evidence=await fs.mkdtemp(path.join(os.tmpdir(),'atelier-tower-browser-'));
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const sheet=await fs.readFile(root+'/halloween-exhibition/preview/diorama-city/assets/host-walk.webp');
 const vehicle=await fs.readFile(root+'/tower/assets/prop-desk.webp');
 let passed=0;
 for(const [name,width,height] of [['phone',390,844],['landscape',844,390],['tablet',820,1180],['desktop',1440,960]]){
  const ctx=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
  const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  let room={id,slot:13,noteId:'creator_test',version:1,isOwner:true,avatarVersion:1,profile:{name:'Test creator',photo:'',description:'Test room',articles:[]},
   design:{title:'Original room',theme:'story',light:'natural',avatarMode:'custom',avatarName:'Test creator',pin:'',world:{seed:1,hue:35,accent:80,view:3,layout:2,lightness:50,atlas:true,character:true}}};
  const writes=[];
  await ctx.addInitScript(({id})=>localStorage.setItem('atelier-tower-owner-v1',JSON.stringify({id,noteId:'creator_test',key:'a'.repeat(64)})),{id});
  await page.route('https://xxhaerjvrgmnadxjqetz.supabase.co/**',async route=>{
   const request=route.request(),url=new URL(request.url()),view=url.searchParams.get('view');
   const headers={'access-control-allow-origin':'*','content-type':'application/json'};
   if(view==='avatar')return route.fulfill({status:200,contentType:'image/webp',body:sheet,headers:{'access-control-allow-origin':'*'}});
   if(view==='vehicle')return route.fulfill({status:200,contentType:'image/webp',body:vehicle,headers:{'access-control-allow-origin':'*'}});
   if(view==='list')return route.fulfill({status:200,headers,body:JSON.stringify({floors:12,perFloor:12,rooms:[{id,slot:13,noteId:room.noteId,name:room.profile.name,title:room.design.title,theme:room.design.theme,avatarMode:'custom',world:room.design.world,avatarVersion:1}]})});
   if(view==='facilities')return route.fulfill({status:200,headers,body:JSON.stringify({residents:[{id,slot:13,noteId:room.noteId,name:room.profile.name,transport:room.design.transport??{},engineer:room.design.engineer===true}]})});
   if(view==='room')return route.fulfill({status:200,headers,body:JSON.stringify(room)});
   if(request.method()==='POST'){
    const body=request.postDataJSON();writes.push(body);
    assert.equal(request.headers()['x-tower-key'],'a'.repeat(64));
    if(body.action==='park'){
     assert.equal(body.version,room.version);room.design.transport??={};
     if(body.clear)delete room.design.transport[body.space];else room.design.transport[body.space]={version:'b'.repeat(24),kind:{garage:'car',parkingTower:'car',motorcycle:'motorcycle',bicycle:'bicycle'}[body.space]};
     room.version++;
    }
    if(body.action==='engineer'){assert.equal(body.version,room.version);room.design.engineer=body.join;room.version++;}
    return route.fulfill({status:200,headers,body:JSON.stringify(room)});
   }
   await route.fulfill({status:400,headers,body:'{"error":"invalid"}'});
  });
  await page.goto('http://127.0.0.1:4173/tower/?space=lobby',{waitUntil:'networkidle'});
  await page.waitForSelector('#shared-content .world-resident canvas:not([hidden])');
  const start=await page.locator('#shared-content .world-resident').getAttribute('data-position');
  await page.locator('#shared-controls [data-move="right"]').focus();
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(350);await page.keyboard.up('ArrowRight');
  assert.notEqual(await page.locator('#shared-content .world-resident').getAttribute('data-position'),start);
  for(const space of spaces){
   if(space!=='lobby'){
    const labels={owner:'14F オーナーズ・アトリエ',sky:'13F 天空ラウンジ',concierge:'1F 管理人室',driveway:'G 車寄せ',bicycle:'G 駐輪コート',parking:'B1 地下駐車場',parkingTower:'G 立体駐車場',motorcycle:'G バイク置き場',boiler:'B2 ボイラー・設備室',seismic:'B3 免震構造・見学回廊'};
    await page.locator('#shared-nav').getByRole('button',{name:labels[space],exact:true}).click();
   }else await page.locator('#shared-nav').getByRole('button',{name:'1F エントランス・ラウンジ',exact:true}).click();
   await page.waitForSelector(`#shared-content [data-space="${space}"]`);
   await page.waitForTimeout(80);
   assert.equal(await page.locator('#shared-content .suite-interior').evaluate(i=>i.complete&&i.naturalWidth>0),true,space+' backdrop');
   assert.equal(await page.locator('#shared-content .world-resident canvas:not([hidden])').count(),1,space+' one actor');
   const clipped=await page.locator('#shared-content .shared-viewport').evaluate(e=>{const b=e.getBoundingClientRect(),d=e.closest('dialog').getBoundingClientRect();return b.width>0&&b.height>0&&b.right<=d.right+1;});assert.ok(clipped,space+' viewport');
   if(space==='concierge')assert.equal(await page.locator('.security-feed').count(),4);
   if(['parking','parkingTower','bicycle','motorcycle'].includes(space)){
    assert.equal(await page.locator('.parking-bay').count(),12);
    assert.match(await page.locator('.parking-bay').first().textContent(),/201号室/);
    if(name==='phone'){
     await page.locator('.vehicle-upload input[type="file"]').setInputFiles(root+'/tower/assets/prop-desk.webp');
     await page.locator('.vehicle-upload button[type="submit"]').click();
     await page.waitForFunction(()=>document.querySelector('#shared-status').textContent.includes('車両を保存しました'));
     assert.equal(await page.locator('.parking-bay img').count(),1);
    }
   }
   if(space==='boiler'&&name==='phone'){
    await page.getByRole('button',{name:'タワー技術部に参加する',exact:true}).click();
    await page.waitForSelector('button:text-is("技術部から退部する")');
    assert.equal(room.design.engineer,true);
   }
   passed++;
  }
  if(name==='phone'){
   assert.deepEqual(writes.filter(x=>x.action==='park').map(x=>x.space),['bicycle','garage','parkingTower','motorcycle']);
   assert.ok(Object.keys(room.design.transport).length===4);
   await page.locator('#shared-nav').getByRole('button',{name:'13F 天空ラウンジ',exact:true}).click();
   await page.waitForSelector('[data-space="sky"].shared-stage');
   await page.screenshot({path:path.join(evidence,'sky-phone.png')});
  }
  await page.getByRole('button',{name:'ここでイラスト・note記事をつくる',exact:true}).click();
  assert.equal(await page.locator('#spot-id').inputValue(),'creator_test');
  assert.match(await page.locator('#spot-text').inputValue(),/登録済みアバター画像URL/);
  await page.locator('#spot-article').click();assert.match(await page.locator('#spot-text').inputValue(),/画像は再生成しない/);
  await page.locator('#spot-dialog form button').click();
  assert.ok(await page.locator('#shared-dialog').getAttribute('open')!==null);
  if(name==='landscape')await page.screenshot({path:path.join(evidence,'landscape.png')});
  if(name==='desktop')await page.screenshot({path:path.join(evidence,'desktop.png')});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);
  if(name==='phone'){
   for(const kind of ['carousel','wheel']){
    await page.goto(`http://127.0.0.1:4173/halloween-exhibition/preview/diorama-city/?area=canal&spot=fair.${kind}&resident=${id}`,{waitUntil:'networkidle'});
    await page.waitForSelector('#district[data-walker-state="ready"]');
    await page.locator('#visit').click();await page.waitForSelector('#activity-dialog[open] .ride-avatar');
    await page.getByRole('button',{name:'乗る',exact:true}).click();
    await page.screenshot({path:path.join(evidence,`${kind}.png`)});
    assert.equal(await page.locator('.ride-carriage .ride-avatar').count(),1);
    assert.ok(await page.locator('.ride-avatar').evaluate(c=>c.width>0&&c.height>0));
    await page.locator('#activity-close').click();
   }
  }
  console.log(name,'all spaces, movement, original avatar, parking and article flow passed');await ctx.close();
 }
 console.log('Evidence:',evidence);
 console.log('PASS',passed,'space/viewport combinations and two ride flows');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
