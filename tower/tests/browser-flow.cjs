const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const root=path.resolve(__dirname,'../..');
let evidence;
const id='12345678-1234-1234-1234-123456789012';
const spaces=['owner','sky','lobby','concierge','driveway','bicycle','parking','parkingTower','motorcycle','boiler','seismic'];

async function checkGarageDisplay(page) {
 const residents = [
  {id:'00000001-0000-4000-8000-000000000001',slot:40,name:'404',transport:{garage:{version:'8e3064b99218d3bd53c60276',facing:'right'}}},
  {id:'00000002-0000-4000-8000-000000000002',slot:52,name:'504',transport:{garage:{version:'fd841db7aecbec5ccfeb5802',facing:'left'}}},
 ];
 await page.route('**/tower/published/facilities.json*', route => route.fulfill({json:{residents}}));
 await page.goto('http://127.0.0.1:4173/tower/?space=parking');
 const cars = page.locator('.shared-stage[data-space="parking"] .parked-vehicle');
 await page.waitForFunction(() => {
  const images = [...document.querySelectorAll('.parked-vehicle img')];
  return images.length === 2 && images.every(image => image.naturalWidth > 0);
 });
 const together = await cars.evaluateAll(buttons => buttons.map(button => {
  const box = button.getBoundingClientRect();
  const view = button.closest('.shared-viewport').getBoundingClientRect();
  const imageMatrix = new DOMMatrix(getComputedStyle(button.querySelector('img')).transform);
  const fullyVisible = box.left >= view.left && box.right <= view.right && box.top >= view.top && box.bottom <= view.bottom;
  return {slot:button.dataset.slot, face:imageMatrix.a, left:box.left, right:box.right, width:button.offsetWidth, fullyVisible};
 }));
 assert.deepEqual(together.map(car => [car.slot,car.face]), [['40',-1],['52',1]]);
 assert.ok(together.every(car => car.fullyVisible),'both cars are fully visible on entering B1');
 assert.ok(together[0].right < together[1].left && together[0].width > together[1].width);
 const floor = page.getByRole('combobox',{name:'駐車区画の階を選ぶ'});
 if (!await floor.isVisible()) await page.click('#shared-info');
 for (const [index,number] of ['4','5'].entries()) {
  await floor.selectOption(number);
  assert.equal(await cars.count(),1);
  assert.equal(await cars.getAttribute('data-slot'),together[index].slot);
  const single = await cars.evaluate(button => ({
   width:button.offsetWidth,
   face:new DOMMatrix(getComputedStyle(button.querySelector('img')).transform).a,
  }));
  assert.equal(single.width,together[0].width,'a car displayed alone occupies the foreground bay');
  assert.equal(single.face,together[index].face);
 }
}

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
  const writes=[];let holdFacilities;
  await ctx.addInitScript(({id})=>localStorage.setItem('atelier-tower-owner-v1',JSON.stringify({id,noteId:sessionStorage.getItem('fixture-noteId')||'creator_test',key:'a'.repeat(64)})),{id});
  const handleRoom=async route=>{
   const request=route.request(),url=new URL(request.url()),file=url.pathname.split('/').at(-1),view=url.searchParams.get('view') || (file==='list.json'?'list':file==='facilities.json'?'facilities':url.pathname.includes('/published/rooms/')?'room':url.pathname.includes('/published/media/')?(file.startsWith('avatar-')?'avatar':'vehicle'):null);
   const headers={'access-control-allow-origin':'*','content-type':'application/json'};
   if(view==='avatar')return route.fulfill({status:200,contentType:'image/webp',body:sheet,headers:{'access-control-allow-origin':'*'}});
   if(view==='vehicle')return route.fulfill({status:200,contentType:'image/webp',body:vehicle,headers:{'access-control-allow-origin':'*'}});
   if(view==='list')return route.fulfill({status:200,headers,body:JSON.stringify({floors:12,perFloor:12,rooms:[{id,slot:13,noteId:room.noteId,name:room.profile.name,title:room.design.title,theme:room.design.theme,avatarMode:'custom',world:room.design.world,avatarVersion:1}]})});
   if(view==='facilities'){
    const snapshot=JSON.stringify({residents:[{id,slot:13,noteId:room.noteId,name:room.profile.name,transport:room.design.transport??{},engineer:room.design.engineer===true,manager:room.design.manager===true}]});
    if(holdFacilities)await holdFacilities;
    return route.fulfill({status:200,headers,body:snapshot});
   }
   if(view==='room')return route.fulfill({status:200,headers,body:JSON.stringify(room)});
   if(request.method()==='POST'){
    const body=request.postDataJSON();writes.push(body);
    assert.equal(request.headers()['x-tower-key'],'a'.repeat(64));
    if(body.action==='park'){
     assert.equal(body.version,room.version);room.design.transport??={};
     if(body.clear)delete room.design.transport[body.space];else room.design.transport[body.space]={version:'b'.repeat(24),kind:{garage:'car',parkingTower:'car',motorcycle:'motorcycle',bicycle:'bicycle'}[body.space]};
     room.version++;
    }
    if(['engineer','manager'].includes(body.action)){assert.equal(body.version,room.version);room.design[body.action]=body.join;room.version++;}
    return route.fulfill({status:200,headers,body:JSON.stringify(room)});
   }
   await route.fulfill({status:400,headers,body:'{"error":"invalid"}'});
  };
  await page.route('https://slamzhgsawfnmwlejgqp.supabase.co/functions/v1/creator-tower**',handleRoom);
  await page.route('**/tower/published/**',handleRoom);
  await page.goto('http://127.0.0.1:4173/tower/?space=lobby',{waitUntil:'networkidle'});
  await page.waitForSelector('#shared-content .world-resident canvas:not([hidden])');
  const start=await page.locator('#shared-content .world-resident').getAttribute('data-position');
  await page.locator('#shared-controls [data-move="right"]').focus();
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(350);await page.keyboard.up('ArrowRight');
  assert.notEqual(await page.locator('#shared-content .world-resident').getAttribute('data-position'),start);
  for(const space of spaces){
   if(!(await page.locator('#shared-nav').isVisible()))await page.locator('#shared-info').click();
   if(space!=='lobby'){
    const labels={owner:'14F オーナーズ・アトリエ',sky:'13F 天空ラウンジ',concierge:'1F 管理人室',driveway:'G 車寄せ',bicycle:'G 駐輪コート',parking:'B1 地下駐車場',parkingTower:'G 立体駐車場',motorcycle:'G バイク置き場',boiler:'B2 ボイラー・設備室',seismic:'B3 免震構造・見学回廊'};
    await page.locator('#shared-nav').getByRole('button',{name:labels[space],exact:true}).click();
   }else await page.locator('#shared-nav').getByRole('button',{name:'1F エントランス・ラウンジ',exact:true}).click();
   if(space==='owner'){
    await page.locator('#shared-content .owner-door').waitFor();
    assert.match(await page.locator('#shared-content').innerText(),/オーナー専用/);
    assert.equal(await page.locator('#shared-content .shared-stage').count(),0);
    assert.equal(await page.locator('#shared-details').getByRole('button',{name:'ここでイラスト・note記事をつくる'}).count(),0);
    await page.getByRole('button',{name:'天空ラウンジへ戻る',exact:true}).click();
    await page.waitForSelector('#shared-content [data-space="sky"]');passed++;continue;
   }
   await page.waitForSelector(`#shared-content [data-space="${space}"]`);
   await page.waitForTimeout(80);
   assert.equal(await page.locator('#shared-content .suite-interior').evaluate(i=>i.complete&&i.naturalWidth>0),true,space+' backdrop');
   assert.equal(await page.locator('#shared-content .world-resident canvas:not([hidden])').count(),1,space+' one actor');
   if(name==='phone'){
    await page.getByRole('button',{name:'ここでイラスト・note記事をつくる'}).click();
    const prompt=await page.inputValue('#spot-text');
    const url=new URL('http://127.0.0.1:4173/tower/');url.searchParams.set('space',space);
    assert.ok(prompt.split('\n').includes(url.href),space+' facility article card');
    const backdrop=await page.locator('#shared-content .suite-interior').getAttribute('src');
    assert.ok(prompt.includes(new URL(backdrop,url).href),space+' illustration backdrop');
    await page.locator('#spot-dialog .spot-return button').click();
   }
   const clipped=await page.locator('#shared-content .shared-viewport').evaluate(e=>{const b=e.getBoundingClientRect(),d=e.closest('dialog').getBoundingClientRect();return b.width>0&&b.height>0&&b.right<=d.right+1;});assert.ok(clipped,space+' viewport');
   if(space==='concierge'){
    assert.equal(await page.locator('.security-feed').count(),4);
    const physical=await page.locator('.concierge-wall-screens img').evaluateAll(async screens=>{
     await Promise.all(screens.map(screen=>screen.decode()));
     return screens.map(screen=>[screen.currentSrc,screen.naturalWidth,getComputedStyle(screen).clipPath]);
    });
    assert.equal(new Set(physical.map(([url])=>url)).size,4);
    assert.ok(physical.every(([,width,edge])=>width>=800&&edge.startsWith('polygon(')));
    assert.ok(await page.locator('.security-bank').evaluate(bank=>{
     const r=bank.getBoundingClientRect(),viewport=bank.closest('.shared-viewport').getBoundingClientRect();
     return r.width>100&&r.right<=viewport.right&&r.left>=viewport.left&&r.top>=viewport.top&&r.bottom<=viewport.bottom;
    }),'four camera feeds completely visible');
    await page.locator('.security-bank').click();
    assert.equal(await page.locator('.camera-viewer[open] .security-feed').count(),4);
    await page.locator('.camera-viewer button').click();
    if(name==='phone'){
     await page.getByRole('button',{name:'管理人になる',exact:true}).click();
     await page.getByRole('button',{name:'管理人を辞める',exact:true}).waitFor();
     assert.equal(room.design.manager,true);
     await page.reload({waitUntil:'networkidle'});
     await page.getByRole('button',{name:'管理人を辞める',exact:true}).click();
     await page.getByRole('button',{name:'管理人になる',exact:true}).waitFor();
     assert.equal(room.design.manager,false);
    }
   }
   if(['parking','parkingTower','bicycle','motorcycle'].includes(space)){
    assert.equal(await page.locator('.parking-bay').count(),12);
    assert.match(await page.locator('.parking-bay').first().textContent(),/201号室/);
    if(name==='phone'){
     // The broad flat backdrop and transparent window must both survive a vehicle upload.
     let upload = root + '/tower/assets/prop-desk.webp';
     if (space === 'parking') {
      const blank=await page.evaluate(()=>{
       const canvas=document.createElement('canvas');
       canvas.width=280;canvas.height=160;
       const paint=canvas.getContext('2d');paint.fillStyle='navy';paint.fillRect(0,0,280,160);
       return canvas.toDataURL().split(',')[1];
      });
      const parks=writes.filter(item=>item.action==='park').length;
      await page.locator('.vehicle-upload input[type="file"]').setInputFiles({name:'car.png',mimeType:'image/png',buffer:Buffer.from(blank,'base64')});
      await page.locator('.vehicle-upload button[type="submit"]').click();
      await page.waitForFunction(()=>document.querySelector('#shared-status').textContent.includes('一色'));
      assert.equal(writes.filter(item=>item.action==='park').length,parks);
      const source = await page.evaluate(() => {
       const canvas = document.createElement('canvas');
       canvas.width = 280; canvas.height = 160;
       const paint = canvas.getContext('2d');
       paint.fillStyle = '#f2d98b'; paint.fillRect(0, 0, 280, 160);
       paint.fillStyle = '#18659a'; paint.fillRect(48, 50, 180, 62);
       paint.clearRect(96, 62, 48, 28);
       return canvas.toDataURL('image/png').split(',')[1];
      });
      upload = {name:'car-with-window.png', mimeType:'image/png', buffer:Buffer.from(source, 'base64')};
     }
     await page.locator('.vehicle-upload input[type="file"]').setInputFiles(upload);
     await page.locator('.vehicle-upload button[type="submit"]').click();
     await page.waitForFunction(()=>document.querySelector('#shared-status').textContent.includes('車両を保存しました'));
     assert.equal(await page.locator('.parking-bay img').count(),1);
     if (space === 'parking') {
      const parked=page.locator('.shared-stage[data-space="parking"] .parked-vehicle');
      await page.waitForFunction(()=>document.querySelector('.shared-stage[data-space=parking] .parked-vehicle img')?.naturalWidth>0);
      const parkedStyle=await parked.evaluate(button=>{
       const style=getComputedStyle(button), matrix=new DOMMatrix(style.transform);
       return {face:style.getPropertyValue('--face').trim(),left:parseFloat(button.style.left),
        top:parseFloat(button.style.top),width:parseFloat(button.style.width),shear:matrix.b,rotate:matrix.c};
      });
      assert.equal(parkedStyle.face,'-1','left-facing fixture follows the aisle');
      assert.ok(parkedStyle.left>21 && parkedStyle.left<23 && parkedStyle.top>62 && parkedStyle.top<64,
        'B1 fixture is anchored on the white-lined bay');
      assert.ok(parkedStyle.width>11 && parkedStyle.width<12);
      assert.ok(parkedStyle.shear!==0 && Math.abs(parkedStyle.shear)<.15 && parkedStyle.rotate===0,
        'vehicle aligns to floor without tilting its cabin');
      const stored = writes.filter(request => request.action === 'park').at(-1).imageB64;
      assert.ok(Buffer.from(stored, 'base64').length <= 98_304);
      const samples = await page.evaluate(async data => {
       const image = new Image();
       image.src = 'data:image/webp;base64,' + data;
       await image.decode();
       const canvas = document.createElement('canvas');
       canvas.width = image.width; canvas.height = image.height;
       const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
       return {width:image.width, height:image.height, corner:[...ctx.getImageData(6, 6, 1, 1).data], windowAlpha:ctx.getImageData(114, 76, 1, 1).data[3]};
      }, stored);
      assert.deepEqual([samples.width, samples.height], [280, 160]);
      assert.ok(samples.corner[0] > 220 && samples.corner[1] > 180 && samples.corner[3] === 255);
      assert.equal(samples.windowAlpha, 0);
     }
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
   await page.locator('.shared-camera').click();
   assert.equal(await page.locator('#shared-nav').isVisible(),false);
   await page.screenshot({path:path.join(evidence,'sky-phone.png')});
  }
  if(!(await page.locator('#shared-details').isVisible()))await page.locator('#shared-info').click();
  await page.getByRole('button',{name:'ここでイラスト・note記事をつくる',exact:true}).click();
  assert.equal(await page.locator('#spot-id').inputValue(),'creator_test');
  assert.match(await page.locator('#spot-text').inputValue(),/登録済みアバター画像URL/);
  assert.match(await page.locator('#spot-text').inputValue(),/明示指定がない場合は、このURLで見られる本人と一致する登録アバターを使います/);
  assert.match(await page.locator('#spot-text').inputValue(), /場所の背景資料：.*\.webp/);
  if (name === 'phone') {
   const panel = page.locator('#spot-quality');
   await panel.locator('summary').click();
   await panel.getByLabel('記事とサムネイルのタイトル').fill('夜景の向こうへ');
   const results = panel.locator('.quality-file input[type=file]');
   await results.nth(0).setInputFiles(root + '/tower/assets/gallery.webp');
   await results.nth(1).setInputFiles(root + '/tower/assets/cinema.webp');
   const cover = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 1280; canvas.height = 650;
    const paint = canvas.getContext('2d'); paint.fillStyle = '#163348'; paint.fillRect(0, 0, 1280, 650);
    paint.fillStyle = '#c8e5ed'; paint.fillRect(140, 95, 650, 280);
    return canvas.toDataURL('image/png').split(',')[1];
   });
   await results.nth(2).setInputFiles({name:'cover.png', mimeType:'image/png', buffer:Buffer.from(cover, 'base64')});
   const approval = panel.locator('.quality-manual input').first();
   await approval.check();
   await page.locator('#spot-image').setInputFiles(root + '/tower/assets/prop-desk.webp');
   assert.equal(await approval.isChecked(), false);
   assert.doesNotMatch(await page.locator('#spot-text').inputValue(), /登録済みアバター画像URL/);
   await page.locator('#spot-reset-reference').click();
   assert.match(await page.locator('#spot-text').inputValue(), /登録済みアバター画像URL/);
   await page.locator('#spot-id').fill('other_creator');
   assert.doesNotMatch(await page.locator('#spot-text').inputValue(), /登録済みアバター画像URL/);
   await page.locator('#spot-id').fill('bad/id');
   await panel.getByRole('button', {name:'本文イラスト２だけ修正する'}).click();
   assert.equal(await page.locator('#spot-id').getAttribute('aria-invalid'), 'true');
   await page.locator('#spot-article-draft > summary').click();
   await page.locator('#spot-article').click();
   assert.match(await page.locator('#spot-article-message').textContent(), /IDまたはプロフィール/);
   await page.locator('#spot-id').fill('creator_test');
   await page.locator('#spot-article').click();
   assert.match(await page.locator('#spot-article-text').inputValue(), /確定した記事タイトル：夜景の向こうへ/);
  }
  if(!await page.locator('#spot-article').isVisible())await page.locator('#spot-article-draft > summary').click();
  await page.locator('#spot-article').click();assert.match(await page.locator('#spot-article-text').inputValue(),/画像は再生成しない/);
  await page.locator('#spot-dialog form button').click();
  assert.ok(await page.locator('#shared-dialog').getAttribute('open')!==null);
  if(await page.locator('#shared-dialog').getAttribute('data-camera')!=='overview')await page.locator('.shared-camera').click();
  if(await page.locator('#shared-nav').isVisible())await page.locator('#shared-info').click();
  assert.equal(await page.locator('#shared-nav').isVisible(),false);
  if(name==='landscape')await page.screenshot({path:path.join(evidence,'landscape.png')});
  if(name==='desktop')await page.screenshot({path:path.join(evidence,'desktop.png')});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);
  if(name==='phone'){
   // Finish a directory request after the user walked, selected a different floor and picked an image.
   let releaseFacilities;
   holdFacilities=new Promise(resolve=>{releaseFacilities=resolve;});
   await page.goto('http://127.0.0.1:4173/tower/?space=parking',{waitUntil:'domcontentloaded'});
   const stage=page.locator('#shared-content .shared-stage');
   await stage.waitFor();
   if(!(await page.locator('#shared-details').isVisible()))await page.locator('#shared-info').click();
   await page.locator('#shared-details select').first().selectOption('12');
   await page.locator('.vehicle-upload input[type=file]').setInputFiles(root+'/tower/assets/prop-desk.webp');
   await page.locator('#shared-controls [data-move="right"]').focus();
   await page.keyboard.down('ArrowRight');await page.waitForTimeout(180);await page.keyboard.up('ArrowRight');
   const walker=page.locator('#shared-content .world-resident');
   await page.waitForTimeout(50);
   const position=await walker.getAttribute('data-position'),stageHandle=await stage.elementHandle();
   const read=page.waitForResponse(response=>new URL(response.url()).pathname.endsWith('/published/facilities.json'));
   releaseFacilities();holdFacilities=null;await read;
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   assert.equal(await stageHandle.evaluate(node=>node.isConnected),true,'late data retains original scene');
   assert.equal(await walker.getAttribute('data-position'),position,'late data retains walker');
   assert.equal(await page.locator('#shared-details select').first().inputValue(),'12');
   assert.equal(await page.locator('.vehicle-upload input[type=file]').evaluate(node=>node.files.length),1);
   assert.match(await page.locator('.parking-bay').first().innerText(),/1201号室/);

   // The stored note ID alone does not unlock the private suite.
   await page.evaluate(()=>sessionStorage.setItem('fixture-noteId','ss_yr'));
   await page.goto('http://127.0.0.1:4173/tower/?space=owner',{waitUntil:'networkidle'});
   assert.match(await page.locator('.owner-door').innerText(),/鍵を確認できません/);
   room.noteId='ss_yr';room.isOwner=false;
   await page.reload({waitUntil:'networkidle'});
   assert.equal(await page.locator('.owner-door').count(),1);
   room.isOwner=true;
   await page.reload({waitUntil:'networkidle'});
   assert.equal(await page.locator('.shared-stage[data-space="owner"]').count(),1,'verified owner enters');
   assert.equal(await page.locator('.owner-door').count(),0);
   room.noteId='creator_test';
   await page.evaluate(()=>sessionStorage.removeItem('fixture-noteId'));
   await page.goto('http://127.0.0.1:4173/tower/?room=' + id);
   await page.getByRole('button', {name:'部屋を改装',exact:true}).click();
   const avatarPreview = page.locator('#avatar-preview');
   assert.equal(await avatarPreview.isVisible(), true);
   assert.match(await avatarPreview.getAttribute('alt'), /登録済みの歩行シート/);
   assert.equal(await page.locator('#avatar-preview-note').isVisible(), true);
   assert.equal(await avatarPreview.evaluate(async image => { await image.decode(); return image.naturalWidth > 0; }), true);
   await page.locator('#save-room').click();
   await page.waitForSelector('#edit-dialog', {state:'hidden'});
   const renovation = writes.filter(request => request.action === 'save').at(-1);
   assert.ok(renovation && !renovation.avatarB64 && !renovation.clearInterior);
   assert.equal(renovation.design.world.atlas, true);
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
  await checkGarageDisplay(page);
  console.log(name,'all spaces, movement, original avatar, paired and individual garage bays, and article flow passed');await ctx.close();
 }
 console.log('Evidence:',evidence);
 console.log('PASS',passed,'space/viewport combinations and two ride flows');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
