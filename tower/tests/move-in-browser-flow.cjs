const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {chromium}=require('playwright');
const site=process.env.ATELIER_TEST_URL||'http://127.0.0.1:4173/';
const source=path.join(__dirname,'..');
const noteId='enrollment_test', id='a2222222-aaaa-4444-bbbb-222222222222';
const profile={name:'テスト住人',photo:'',description:'',articles:[]};
const design={title:'月の書斎',theme:'story',light:'natural',avatarMode:'resident',avatarName:'',pin:'',welcome:''};
// Enrollment uses a local catalog fixture so a real move-in cannot change which slots are tested.
const catalog={floors:12,perFloor:12,rooms:[
  {id:'a3333333-aaaa-4444-bbbb-333333333333',slot:52,noteId:'occupied_test',name:'入居済みテスト住人',theme:'story'}
]};
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});
  try {
    const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',serviceWorkers:'block',permissions:['clipboard-read','clipboard-write']});
    await ctx.route('**/tower/published/list.json',route=>route.fulfill({json:catalog}));
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
    for (const [kind,version] of [['avatar','1'],['interior','b'.repeat(24)]]) {
      assert.ok(article.includes('/published/media/'+id+'/'+kind+'-'+version+'.img'));
      const staged = new URL(article.match(new RegExp('https://[^\\s]+[?]view='+kind+'[^\\s]+'))[0]);
      assert.equal(staged.origin,'https://slamzhgsawfnmwlejgqp.supabase.co');
      assert.deepEqual([...staged.searchParams],[['view',kind],['id',id],['v',version]]);
    }
    assert.ok(!article.includes('f'.repeat(64)));
    assert.ok(article.includes('「無名S note」と表記') && article.includes('本名・姓は記事にも画像にも載せません'));
    const panel=page.locator('#move-article-quality');
    await panel.locator('summary').click();
    await panel.getByLabel('記事とサムネイルのタイトル').fill('月の書斎の鍵');
    const roomHref='https://mumei-s.github.io/mumei-adventure-creators/tower/?room='+id;
    const manuscript=['月の書斎の鍵','企画主・無名S note','鍵を受け取り、青い飾りがついた本棚の前に座りました。',
      '［ここにイラスト１］','お気に入りは窓辺のランプです。','［ここにイラスト２］',
      'https://note.com/ss_yr',roomHref,'https://mumei-s.github.io/mumei-adventure-creators/tower/#prompt-play',
      'https://mumei-s.github.io/note-insight/','#無名Sプロンプト'].join('\n');
    await panel.getByLabel('生成した参加記事').fill(manuscript.replace('［ここにイラスト１］','［ここにアバター画像］'));
    await panel.getByText(/［ここにイラスト１］ は本文中の独立した行/).waitFor();
    await panel.getByLabel('生成した参加記事').fill(manuscript);
    await panel.getByText(/URL・ハッシュタグの書式を確認しました/).waitFor();
    const filesToCheck=await page.evaluate(()=>{
      const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=650;
      const ctx=canvas.getContext('2d');
      return ['#13768a','#af3272','#174427'].map((color,i)=>{
        ctx.fillStyle=color;ctx.fillRect(0,0,1280,650);
        ctx.fillStyle='#eee';ctx.fillRect(200*i+35,34+85*i,360,180);
        return canvas.toDataURL().split(',')[1];
      });
    });
    const inputs=panel.locator('input[type=file]');
    const upload=(i,bytes)=>inputs.nth(i).setInputFiles({name:'illustration.png',mimeType:'image/png',buffer:Buffer.from(bytes,'base64')});
    await upload(0,filesToCheck[0]);await upload(1,filesToCheck[0]);await upload(2,filesToCheck[2]);
    await panel.locator('.quality-file').nth(1).getByText(/本文イラスト１と同じ画像/).waitFor();
    assert.ok(await panel.getByRole('button',{name:'検査後の記事をコピー'}).isDisabled());
    await upload(1,filesToCheck[1]);
    for(const input of await panel.getByRole('checkbox').all()) await input.check();
    await panel.getByRole('button',{name:'検査後の記事をコピー'}).click();
    assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),manuscript);
    await panel.getByRole('button',{name:'記事だけ修正する'}).click();
    const repair=await page.inputValue('#move-article-text');
    assert.equal(JSON.parse(repair.split('\n').find(line=>line.startsWith('"'))),manuscript);
    assert.ok(repair.split('\n').includes(roomHref));
    assert.ok(!repair.includes('f'.repeat(64)));
    assert.deepEqual(calls,['preview','begin','confirm']);assert.deepEqual(errors,[]);
    console.log('PASS lobby, avatar, room preference, ID-bearing return, vacant unit, both images, ownership challenge and optional four-part article.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
