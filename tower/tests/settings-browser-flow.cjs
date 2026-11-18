const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const path=require('node:path');
const fs=require('node:fs/promises');
const origin=process.env.TEST_ORIGIN||'http://127.0.0.1:4173';
const evidence=path.resolve(__dirname,'../../../settings-evidence');
const layoutKey='halloween-exhibition:preview:layout:v1';
let browser;
async function assertFits(page){
 const size=await page.evaluate(()=>({width:innerWidth,total:document.documentElement.scrollWidth,offenders:Array.from(document.querySelectorAll('body *')).filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,10).map(e=>({tag:e.tagName,id:e.id,class:e.className,right:e.getBoundingClientRect().right}))}));
 assert.ok(size.total<=size.width,JSON.stringify(size));
}
(async()=>{
 await fs.mkdir(evidence,{recursive:true});
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 let checks=0;
 for(const [name,width,height] of [['phone',390,844],['landscape',844,390],['tablet',820,1180],['desktop',1440,960]]){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'no-preference'});
  await context.route('https://xxhaerjvrgmnadxjqetz.supabase.co/**',route=>route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({floors:12,perFloor:12,rooms:[],residents:[]})}));
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin+'/tower/',{waitUntil:'networkidle'});
  await page.locator('.site-header [data-game-settings]').click();
  assert.equal(await page.locator('#game-music').getAttribute('aria-pressed'),'false');
  assert.equal(await page.locator('#game-volume').inputValue(),'0');checks++;
  const nav=page.locator('#game-settings .game-menu-links');
  assert.equal(await nav.getByRole('link',{name:'INSIGHT',exact:true}).getAttribute('href'),'https://mumei-s.github.io/note-insight/');
  assert.equal(new URL(await nav.getByRole('link',{name:'Atelier（イラスト作成ツール）',exact:true}).getAttribute('href')).pathname,'/halloween/');
  assert.equal(new URL(await nav.getByRole('link',{name:'魔法の入口（通常の入口）',exact:true}).getAttribute('href')).pathname,'/halloween-exhibition/preview/');
  assert.equal(new URL(await nav.getByRole('link',{name:'元の街へ戻る（時空の歪みの手前）',exact:true}).getAttribute('href')).search,'?arrival=future-gate');checks++;
  for(const mode of ['desktop','tablet','phone','auto']){
   await page.selectOption('#game-layout',mode);
   assert.equal(await page.locator('body').getAttribute('data-layout-mode'),mode);
   assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).mode,layoutKey),mode);
   await assertFits(page);
   const rect=await page.locator('#game-settings').boundingBox();assert.ok(rect.width<=width&&rect.height<=height);checks++;
  }
  await page.selectOption('#game-speed','1.5');
  await page.selectOption('#game-motion','off');
  await page.selectOption('#game-pad-mode','fixed');
  await page.locator('#game-brightness').fill('60');
  assert.equal(await page.locator('body').getAttribute('data-walk-speed'),'1.5');
  assert.equal(await page.locator('body').getAttribute('data-game-motion'),'reduced');checks++;
  await page.locator('#game-volume').fill('25');await page.locator('#game-music').click();
  await page.waitForFunction(()=>document.querySelector('#game-audio-status').textContent==='街の音楽：ON');
  assert.equal(await page.locator('#game-music').getAttribute('aria-pressed'),'true');
  await page.locator('#game-music').click();assert.equal(await page.locator('#game-music').getAttribute('aria-pressed'),'false');checks++;
  await page.locator('#game-volume').fill('20');await page.locator('#game-music').click();
  await page.waitForFunction(()=>document.querySelector('#game-audio-status').textContent==='街の音楽：ON');
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide')));
  assert.equal(await page.locator('#game-music').getAttribute('aria-pressed'),'false');
  assert.equal(await page.locator('#game-volume').inputValue(),'0');checks++;
  await page.locator('#game-settings .game-dialog-bar button').click();
  await page.locator('.game-home-links [data-game-install]').click();
  assert.equal(await page.locator('#game-install').isVisible(),true);
  assert.match(await page.locator('#game-install').textContent(),/Edge・Chrome/);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#game-install').isVisible(),false);checks++;
  await page.evaluate(()=>{
   const event=new Event('beforeinstallprompt',{cancelable:true});
   event.prompt=async()=>{};event.userChoice=Promise.resolve({outcome:'accepted'});window.dispatchEvent(event);
  });
  await page.locator('.game-home-links [data-game-install]').click();await page.locator('#game-install-native').click();
  assert.match(await page.locator('#game-install').textContent(),/操作を受け付けました/);
  assert.doesNotMatch(await page.locator('#game-install').textContent(),/追加が完了/);
  await page.evaluate(()=>window.dispatchEvent(new Event('appinstalled')));
  assert.match(await page.locator('#game-install').textContent(),/追加が完了/);
  await page.keyboard.press('Escape');checks++;
  await page.goto(origin+'/tower/?space=sky',{waitUntil:'networkidle'});
  await page.waitForSelector('#shared-dialog[open] .world-resident');
  const actor=page.locator('#shared-dialog .world-resident').last();
  await page.locator('#shared-dialog [data-game-settings]').click();
  const position=await actor.getAttribute('data-position');await page.keyboard.press('ArrowRight');await page.waitForTimeout(150);
  assert.equal(await actor.getAttribute('data-position'),position);
  assert.equal(await page.locator('#game-music').getAttribute('aria-pressed'),'false');
  assert.equal(await page.locator('#game-volume').inputValue(),'0');
  assert.equal(await page.locator('#game-speed').inputValue(),'1.5');
  assert.equal(await page.locator('#game-brightness').inputValue(),'60');
  await page.screenshot({path:path.join(evidence,'settings-'+name+'.png')});
  await page.locator('#game-settings .game-dialog-bar button').click();
  assert.equal(await page.locator('#shared-dialog').isVisible(),true);checks++;
  await page.locator('#shared-controls [data-move=right]').focus();
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(250);await page.keyboard.up('ArrowRight');
  assert.notEqual(await actor.getAttribute('data-position'),position);checks++;
  await page.goto(origin+'/halloween-exhibition/preview/diorama-city/',{waitUntil:'networkidle'});
  await page.locator('[data-game-settings]').click();
  assert.equal(await page.locator('#game-speed').inputValue(),'1.5');
  assert.equal(await page.locator('#game-pad-mode').inputValue(),'fixed');
  assert.equal(await page.locator('#game-music').getAttribute('aria-pressed'),'false');
  for(const mode of ['phone','tablet','desktop','auto']){
   await page.selectOption('#game-layout',mode);
   await assertFits(page);
   const bounds=await page.locator('#district').boundingBox();assert.ok(bounds.width<=width);
  }
  await page.screenshot({path:path.join(evidence,'city-settings-'+name+'.png')});
  await page.locator('#game-settings .game-dialog-bar button').click();
  assert.equal(await page.locator('#game-settings').isVisible(),false);
  await page.screenshot({path:path.join(evidence,'city-'+name+'.png')});checks++;
  assert.deepEqual(errors,[]);
  // The normal game and the Tower use exactly the same display key/controller.
  if(name==='desktop'){
   await page.locator('[data-game-settings]').click();await page.selectOption('#game-layout','tablet');
   await page.getByRole('link',{name:'元の街へ戻る（時空の歪みの手前）',exact:true}).click();
   await page.waitForURL('**/town/?arrival=future-gate');
   await page.waitForFunction(()=>document.body.dataset.layout==='tablet');
   assert.equal(await page.locator('body').getAttribute('data-layout-mode'),'tablet');checks++;
  }
  console.log('PASS '+name);await context.close();
 }
 // Safari-style instructions and reduced motion remain available on touch tablets.
 const apple=await browser.newContext({viewport:{width:820,height:1180},userAgent:'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',reducedMotion:'reduce'});
 const page=await apple.newPage();await page.goto(origin+'/tower/',{waitUntil:'domcontentloaded'});
 await page.locator('.game-home-links [data-game-install]').click();assert.match(await page.locator('#game-install').textContent(),/Safari/);await page.keyboard.press('Escape');
 await page.locator('.site-header [data-game-settings]').click();assert.equal(await page.locator('#game-motion').isDisabled(),true);checks++;
 await apple.close();await browser.close();console.log('PASS '+checks+' settings/navigation checks; evidence '+evidence);
})().catch(async error=>{console.error(error);await browser?.close();process.exitCode=1;});
