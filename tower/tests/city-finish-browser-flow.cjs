const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.env.CITY_URL || 'http://127.0.0.1:4173/halloween-exhibition/preview/diorama-city/';

(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE || '/usr/bin/chromium',args:['--no-sandbox']});
  try {
    const context=await browser.newContext({viewport:{width:390,height:844},permissions:['clipboard-read','clipboard-write']});
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('https://*.supabase.co/**',route=>route.fulfill({json:{floors:12,perFloor:12,rooms:[],residents:[]},headers:{'access-control-allow-origin':'*'}}));
    async function reach(spot,canal=true) {
      const url=new URL(base);if(canal)url.searchParams.set('area','canal');
      url.searchParams.set('spot',spot);
      await page.goto(url.href);
      await page.waitForFunction(()=>!document.querySelector('#visit').disabled && document.querySelector('#scene-load-status').hidden);
    }
    const displayed=new Set();
    for(const [key,asset,canal] of [
      ['station','street-station',false],['waterfront','street-deck',false],['canopy','street-market',true],
      ['southCourt','street-south-court',true],['waterside','street-canal-plaza',true],
    ]) {
      await reach('street.'+key,canal);
      await page.locator('#visit').click();
      const img=page.locator('#place-dialog .place-image');
      await img.evaluate(node=>node.decode());
      const src=await img.getAttribute('src');assert.ok(src.endsWith('/'+asset+'.webp'));displayed.add(src);
      await page.locator('#place-create').click();
      assert.ok((await page.locator('#spot-text').inputValue()).includes(src.slice(1)));
      assert.ok(await page.locator('#spot-dialog').isVisible());
    }
    assert.equal(displayed.size,5);
    for(const [kind,name,space] of [['car','車','parking'],['motorcycle','バイク','motorcycle'],['bicycle','自転車','bicycle']]) {
      await page.goto(new URL('spots/avenueShops.html?point='+kind,base).href);
      await page.waitForSelector('#city-world[data-venue="avenueShops"]');
      await page.waitForFunction(()=>document.querySelector('#scene-load-status').hidden);
      await page.locator('#visit').click();
      const studio=page.locator('#activity-dialog .vehicle-studio');
      await studio.locator('input').fill('紺色と金色');
      await studio.getByRole('button',{name:name+'の生成プロンプトをコピー'}).click();
      const prompt=await page.evaluate(()=>navigator.clipboard.readText());
      assert.ok(prompt.includes('紺色と金色') && prompt.includes('透過PNG') && prompt.includes(name+'を１台'));
      await studio.getByRole('link',{name:'できた画像を号室に登録する'}).click();
      await page.waitForSelector('.shared-stage[data-space="'+space+'"]');
      assert.ok(await page.locator('#vehicle-registration').isVisible());
      await page.locator('.vehicle-maker > summary').click();
      assert.ok(await page.locator('#shared-details .vehicle-studio input').isVisible());
    }
    await reach('market.snacks');
    await page.locator('#visit').click();
    await page.getByRole('button',{name:'たまごサンドをかごに入れる'}).click();
    await reach('market.register');
    await page.locator('#visit').click();
    await page.getByRole('button',{name:'ゲーム内で会計する'}).click();
    await page.getByRole('button',{name:'この買い物で記事を書く'}).click();
    const draft=page.locator('#spot-article-draft textarea');
    assert.ok(await draft.isVisible());
    assert.match(await draft.inputValue(),/たまごサンドを1点.*260円.*紙袋/s);
    await draft.fill((await draft.inputValue())+'\n窓辺でひと休み。');
    await page.locator('#spot-article-draft button').click();
    await page.locator('#spot-article-draft [role=status]').filter({hasText:'末尾のハッシュタグ'}).waitFor();
    assert.ok((await draft.inputValue()).endsWith('窓辺でひと休み。'));
    const corrected=(await draft.inputValue()).replace('#無名Sプロンプト\n窓辺でひと休み。','窓辺でひと休み。\n#無名Sプロンプト');
    await draft.fill(corrected);
    await page.locator('#spot-article-draft button').click();
    assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),corrected);
    await page.locator('#spot-article').click();
    assert.ok((await page.locator('#spot-text').inputValue()).includes('窓辺でひと休み。'));
    await reach('fair.carousel');
    await page.locator('#visit').click();
    await page.locator('.ride-horse').first().evaluate(i=>i.decode());
    assert.ok((await page.locator('.ride-horse').first().getAttribute('src')).endsWith('ride-saddle.webp'));
    const mount=page.locator('.ride-carousel .ride-carriage');
    await mount.locator('.coach-side').waitFor({state:'visible'});
    await page.getByRole('button',{name:'乗る',exact:true}).click();
    await page.waitForFunction(()=>parseFloat(document.querySelector('.ride-carousel .ride-carriage').style.left)<24);
    assert.ok(await mount.locator('.ride-avatar').isVisible());
    await page.waitForFunction(()=>parseFloat(document.querySelector('.ride-carousel .ride-carriage').style.left)>73);
    await page.getByRole('button',{name:'もう一周'}).waitFor({timeout:13000});
    await reach('fair.wheel');
    await page.locator('#visit').click();
    assert.equal(await page.locator('.wheel-cabin').count(),12);
    await page.getByRole('button',{name:'乗る',exact:true}).click();
    await page.waitForFunction(()=>parseFloat(document.querySelector('.selected-cabin').style.top)<16);
    const angle=await page.locator('.wheel-rim').evaluate(e=>parseFloat(e.style.transform.slice(7)));
    assert.ok(angle>105 && angle<255);
    assert.equal(await page.locator('.selected-cabin').evaluate(c=>new DOMMatrix(getComputedStyle(c).transform).b),0);
    await page.getByRole('button',{name:'外の景色を見る'}).click();
    assert.ok(await page.locator('.wheel-interior .ride-avatar').isVisible());
    await page.getByRole('button',{name:'観覧車全体に戻す'}).click();
    await page.getByRole('button',{name:'もう一周'}).waitFor({timeout:14000});
    assert.equal(await page.locator('.selected-cabin').evaluate(c=>parseFloat(c.style.top)),96);
    assert.deepEqual(errors,[]);
    console.log('PASS five street views and their prompts, three shops and Tower registration, receipt to editable article, horse orbit and upright cabins over a full revolution.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
