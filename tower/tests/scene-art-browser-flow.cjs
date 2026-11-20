const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const site = process.env.ATELIER_TEST_URL || 'http://127.0.0.1:4173/';
const seismic = new URL('tower/?space=seismic', site).href;
const fullAsset = '/tower/assets/seismic-gallery.webp';

(async () => {
  const {sceneArtwork}=await import('./scene-art-catalog.mjs');
  const browser=await chromium.launch({
    executablePath:process.env.BROWSER_EXECUTABLE || '/usr/bin/chromium',
    args:['--no-sandbox'],
  });
  try {
    const context=await browser.newContext({
      viewport:{width:390,height:844}, reducedMotion:'reduce', serviceWorkers:'block',
      permissions:['clipboard-read','clipboard-write'],
    });
    await context.route('https://*.supabase.co/**', route => route.fulfill({
      json:{floors:12,perFloor:12,rooms:[],residents:[]},headers:{'access-control-allow-origin':'*'},
    }));
    const page=await context.newPage(), errors=[];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(seismic,{waitUntil:'domcontentloaded'});
    const getAsset=path=>new URL(path,site).href;
    const assets=[...sceneArtwork].map(([path,labels])=>({url:getAsset(path), labels}));
    const failures=await page.evaluate(async assets=>{
      const failures=[];
      for(let offset=0;offset<assets.length;offset+=6){
        await Promise.all(assets.slice(offset,offset+6).map(async ({url,labels})=>{
          const image=new Image();image.src=url;
          try{
            await image.decode();
            if(!image.naturalWidth || !image.naturalHeight) throw new Error('No image dimensions');
          }catch(error){failures.push(labels.join(', ')+': '+url+' ('+error.message+')');}
        }));
      }
      return failures;
    },assets);
    assert.deepEqual(failures.sort(),[],'Every staged scene must decode in the browser');
    await page.waitForFunction(() => document.querySelector('[data-space=seismic].shared-stage .suite-interior')?.naturalWidth > 0);
    const shared=page.locator('#shared-dialog[open]');
    await shared.getByRole('button',{name:'免震構造のイラストを見る'}).click();
    const guide=shared.getByRole('dialog',{name:'免震構造のイラスト',exact:true});
    await guide.getByRole('img',{name:'免震見学回廊：回廊全景'}).waitFor();
    await page.waitForFunction(()=>document.querySelector('.facility-viewer[open] .equipment-art')?.naturalWidth === 1536);
    await guide.getByRole('button',{name:'積層ゴム支承'}).click();
    await guide.getByRole('img',{name:'免震見学回廊：積層ゴム支承'}).waitFor();
    await guide.getByText(/建物の重さを支えながら/).waitFor();
    await guide.getByRole('button',{name:'ダンパー',exact:true}).click();
    await guide.getByText(/揺れのエネルギーを吸収します/).waitFor();
    await guide.getByRole('button',{name:'← 見学回廊に戻る'}).click();
    await guide.waitFor({state:'hidden'});
    await shared.getByRole('button',{name:'免震の動きを見る',exact:true}).click();
    await shared.locator('.isolation-model').waitFor({state:'visible'});

    const spotButton=shared.getByRole('button',{name:'ここでイラスト・note記事をつくる'});
    if(!await spotButton.isVisible()) await shared.locator('#shared-info').click();
    await spotButton.click();
    const spot=page.locator('#spot-dialog[open]');
    const imageCopy=spot.getByRole('button',{name:'画像を作る指示をコピー',exact:true});
    const flowHint=spot.locator('#spot-standard-flow');
    await flowHint.waitFor({state:'visible'});
    await imageCopy.click();
    const standard=await page.evaluate(()=>navigator.clipboard.readText());
    assert.match(standard,/本文イラスト１・本文イラスト２・専用サムネイルすべてに、同じキャラクター/);
    assert.match(standard,/届くまで生成しません。人物なしに切り替えず/);
    assert.match(standard,/「記事をつくりますか？」と一度だけ聞き、返事を待つ/);
    await spot.locator('#spot-output').selectOption('scene1');
    await flowHint.waitFor({state:'hidden'});
    await spot.locator('#spot-person').selectOption('none');
    await imageCopy.click();
    const prompt=await page.evaluate(()=>navigator.clipboard.readText());
    assert.match(prompt,/本文イラスト１/);
    assert.match(prompt,/積層ゴム支承とダンパー/);
    assert.match(prompt,/\/tower\/assets\/seismic-gallery\.webp/);
    const articleCopy=spot.getByRole('button',{name:'ChatGPT用：記事本文だけの指示をコピー',exact:true});
    assert.ok(await articleCopy.isHidden());
    await spot.getByText('記事本文だけ（画像は作らない）',{exact:true}).click();
    await articleCopy.click();
    const article=await page.evaluate(()=>navigator.clipboard.readText());
    assert.match(article,/^【#無名Sプロンプト｜note記事をつくる】/);
    assert.match(article,/画像は再生成しない/);
    assert.match(article,/免震構造/);
    assert.equal(await spot.locator('#spot-output').inputValue(),'scene1');
    assert.equal(await spot.locator('#spot-text').inputValue(),prompt);
    assert.ok(await spot.locator('#spot-main-prompt').isHidden());
    // Manual-copy fallback exposes article text separately from the image prompt.
    await page.evaluate(()=>Object.defineProperty(navigator.clipboard,'writeText',{
      value:async()=>{throw new DOMException('denied','NotAllowedError');},configurable:true,
    }));
    await articleCopy.click();
    await spot.locator('#spot-article-text').waitFor({state:'visible'});
    assert.equal(await spot.locator('#spot-article-text').inputValue(),article);
    await page.evaluate(()=>{delete navigator.clipboard.writeText;});
    await imageCopy.click();
    assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),prompt);
    assert.deepEqual(errors,[]);

    // Exercise a fresh page with the original image intentionally unavailable.
    // A manual retry uses the same original path and a fresh request.
    const backup=await context.newPage();
    await backup.route(url=>url.pathname.endsWith(fullAsset) && !url.search,route=>route.abort());
    await backup.goto(seismic,{waitUntil:'domcontentloaded'});
    await backup.getByRole('button',{name:'免震構造のイラストを見る'}).click();
    await backup.getByText(/縮小版を表示しています/).waitFor();
    await backup.waitForFunction(()=>
      document.querySelector('.facility-viewer[open] .equipment-art')?.currentSrc.endsWith('/thumbs/seismic-gallery.webp'));
    await backup.getByRole('button',{name:'イラストを再読み込み',exact:true}).click();
    await backup.waitForFunction(()=>{
      const image=document.querySelector('.facility-viewer[open] .equipment-art');
      return image?.currentSrc.includes('/seismic-gallery.webp?retry=') && image.naturalWidth === 1536;
    });
    console.log('PASS '+assets.length+' staged scene images, B3 view, animation, three-image character contract, separate image and article-only clipboard, preview fallback and full-image retry.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
