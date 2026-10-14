import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, access} from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const workerSource = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
const installSource = await readFile(new URL('../pwa.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../magical-entrance.css', import.meta.url), 'utf8');
const manifest = JSON.parse(await readFile(new URL('../manifest.webmanifest', import.meta.url)));
const base = 'https://mumei-s.github.io/mumei-adventure-creators/halloween-exhibition/preview/';
const title = '無名S note / 🎃Halloween Atelier / 魔法の入口🚪';

test('manifest identity and start URL are confined to the preview subtree', async()=>{
 assert.equal(manifest.name,title);assert.equal(manifest.display,'standalone');
 for(const key of ['id','scope','start_url'])assert.equal(new URL(manifest[key],base).href,base);
 assert.equal(manifest.icons.length,3);
 for(const icon of manifest.icons){
  assert.ok(new URL(icon.src,base).href.startsWith(base+'assets/'));
  const bytes=await readFile(new URL('../'+icon.src,import.meta.url));
  assert.equal(bytes.subarray(1,4).toString(),'PNG');
  assert.equal(bytes.readUInt32BE(16)+'x'+bytes.readUInt32BE(20),icon.sizes);
 }
 assert.ok(manifest.icons.some(icon=>icon.purpose==='maskable'));
});

test('social metadata has the exact title and a real 1200 by 630 absolute HTTPS PNG',async()=>{
 assert.ok(html.includes('<title>'+title+'</title>'));
 assert.ok(html.includes('property="og:title" content="'+title+'"'));
 const image=html.match(/property="og:image" content="([^"]+)"/)[1];
 assert.equal(image,base+'assets/atelier-og.png');
 const bytes=await readFile(new URL('../assets/atelier-og.png',import.meta.url));
 assert.equal(bytes.readUInt32BE(16),1200);assert.equal(bytes.readUInt32BE(20),630);
 assert.match(html,/name="twitter:card" content="summary_large_image"/);
});

test('new static script, stylesheet, manifest, and icon references resolve locally',async()=>{
 for(const path of ['pwa.js','sw.js','magical-entrance.css','manifest.webmanifest','assets/atelier-icon.svg','assets/atelier-icon-192.png'])await access(new URL('../'+path,import.meta.url));
 for(const match of html.matchAll(/(?:href|src)="\.\/([^"]+\.(?:css|js|webmanifest|svg|png))"/g))await access(new URL('../'+match[1],import.meta.url));
});

function workerHarness({scope=base, offline=false}={}){
 const handlers={}, fetched=[], puts=[], deleted=[], precached=[];
 const cache={addAll:async requests=>{precached.push(...requests);},put:async (request)=>{puts.push(request.url);}};
 const context=vm.createContext({
  URL,Request,Response,Set,
  self:{location:{href:scope+'sw.js'},addEventListener:(type,fn)=>handlers[type]=fn},
  caches:{open:async()=>cache,keys:async()=>['root-app','mumei-atelier-shell-old:/other/','mumei-atelier-shell-old:'+new URL(scope).pathname],delete:async key=>deleted.push(key),match:async()=>new Response('offline shell')},
  fetch:async request=>{fetched.push(request.url);if(offline)throw Error('offline');return {ok:true,type:'basic',redirected:false,clone(){return new Response('shell');}}}
 });
 vm.runInContext(workerSource,context);
 async function dispatch(type,url,method='GET'){
  let response=null,wait=null;
  handlers[type]?.({request:url?new Request(url,{method}):null,respondWith:value=>response=value,waitUntil:value=>wait=value});
  if(wait)await wait;
  return {intercepted:Boolean(response),response:response?await response:null};
 }
 return {dispatch,fetched,puts,deleted,precached};
}

test('worker precaches only its explicit public shell allowlist',async()=>{
 const h=workerHarness();await h.dispatch('install');
 assert.ok(h.precached.length>10);
 for(const request of h.precached){
  assert.ok(request.url.startsWith(base));assert.equal(request.credentials,'omit');
  assert.doesNotMatch(request.url,/\/admin\/|\/maze\/|\/data\/|draft|supabase|INSIGHT/i);
  await access(new URL('../'+request.url.slice(base.length),import.meta.url));
 }
});

test('worker bypasses root, INSIGHT, admin, maze, public archive, external resources, and all queries',async()=>{
 const h=workerHarness();
 for(const url of [
  'https://mumei-s.github.io/','https://mumei-s.github.io/INSIGHT/app.js',
  base+'admin/index.html',base+'admin/private-draft.json',base+'maze/index.html',
  base+'data/archive.json',base+'index.html?token=private',base+'unknown.js',
  'https://note.com/ss_yr','https://assets.st-note.com/private.png'
 ])assert.equal((await h.dispatch('fetch',url)).intercepted,false,url);
 assert.equal((await h.dispatch('fetch',base+'theater.js','POST')).intercepted,false);
 assert.equal(h.fetched.length,0);assert.equal(h.puts.length,0);
});

test('static shell is network-first and old cache deletion is isolated to this exact app scope',async()=>{
 const h=workerHarness();assert.equal((await h.dispatch('fetch',base+'theater.js')).intercepted,true);
 assert.deepEqual(h.fetched,[base+'theater.js']);assert.deepEqual(h.puts,[base+'theater.js']);
 await h.dispatch('activate');assert.deepEqual(h.deleted,['mumei-atelier-shell-old:'+new URL(base).pathname]);
 const offline=workerHarness({offline:true});assert.equal(await (await offline.dispatch('fetch',base+'theater.js')).response.text(),'offline shell');
 assert.doesNotMatch(workerSource.replace(/\/\/[^\n]*/g,''),/self\.skipWaiting\s*\(|clients\.claim\s*\(/);
});

test('a copied worker outside preview does not precache, activate, or intercept',async()=>{
 const h=workerHarness({scope:'https://example.com/'});
 await h.dispatch('install');await h.dispatch('activate');
 assert.equal((await h.dispatch('fetch','https://example.com/theater.js')).intercepted,false);
 assert.equal(h.precached.length,0);assert.equal(h.deleted.length,0);
});

async function installerHarness({registrations=[], secure=true, script=base+'pwa.js', prompt=null,userAgent='Test browser',platform='Linux',maxTouchPoints=0,isStandalone=false}={}){
 const calls=[],events={},elements=[];
 class El {
  constructor(tag){this.tagName=tag;this.handlers={};this.children=[];this.open=false;this.hidden=false;this.disabled=false;elements.push(this);}
  setAttribute(k,v){this[k]=v;}
  append(...values){this.children.push(...values);}
  addEventListener(k,v){this.handlers[k]=v;}
  focus(){this.focused=true;}
  showModal(){this.open=true;}
  close(){this.open=false;this.handlers.close?.();}
  getBoundingClientRect(){return {left:0,top:0,right:100,bottom:100};}
 }
 const header=new El('div'),body=new El('body');
 const context=vm.createContext({
  URL, isSecureContext:secure, matchMedia:()=>({matches:isStandalone}),
  document:{createElement:tag=>new El(tag),querySelector:()=>header,body},
  navigator:{userAgent,platform,maxTouchPoints,standalone:isStandalone,serviceWorker:{getRegistrations:async()=>registrations,register:async(...args)=>calls.push(args)}},
  window:{addEventListener:(type,fn)=>events[type]=fn}
 });
 vm.runInContext(installSource.replaceAll('import.meta.url',JSON.stringify(script)),context);
 for(let i=0;i<20;i++)await Promise.resolve();
 if(prompt)events.beforeinstallprompt({...prompt,preventDefault(){}});
 return {calls,events,elements,header};
}

test('registration uses only the preview scope and never takes over existing workers',async()=>{
 const clean=await installerHarness();assert.equal(clean.calls.length,1);assert.equal(clean.calls[0][0],base+'sw.js');assert.equal(clean.calls[0][1].scope,base);
 for(const registrations of [
  [{scope:'https://mumei-s.github.io/',active:{scriptURL:'https://mumei-s.github.io/sw.js'}}],
  [{scope:base,active:{scriptURL:base+'other-app.js'}}],
  [{scope:base+'admin/',active:{scriptURL:base+'admin/sw.js'}}]
 ])assert.equal((await installerHarness({registrations})).calls.length,0);
 assert.equal((await installerHarness({script:'https://mumei-s.github.io/pwa.js'})).calls.length,0);
 assert.equal((await installerHarness({secure:false})).calls.length,0);
});

test('native install prompt is invoked only after a user action and cannot be replayed',async()=>{
 let prompts=0;const h=await installerHarness({prompt:{prompt:async()=>prompts++,userChoice:Promise.resolve({outcome:'dismissed'})}});
 assert.equal(prompts,0);
 const button=h.elements.find(e=>e.className==='pwa-install');assert.equal(button.hidden,false);
 await button.handlers.click();assert.equal(prompts,1);assert.equal(button.hidden,true);
 await button.handlers.click();assert.equal(prompts,1);
 const status=h.elements.find(e=>e.role==='status');assert.match(status.textContent,/見送り/);
});

test('Halloween decorative layers have static, pause, pointer, and normal-mode guards',()=>{
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/data-motion-paused=true/);
 assert.match(css,/portal-doors[^}]*pointer-events:none/);
 assert.match(css,/data-mode=normal[^}]*portal-doors[^}]*display:none/);
 assert.doesNotMatch(css,/@keyframes[^}]*flash|strobe/i);
 assert.match(html,/id="roulette-help"/);
});



test('iPhone and desktop-UA iPad show four honest Safari steps, never a fabricated install prompt',async()=>{
 for(const device of [{userAgent:'iPhone',platform:'iPhone',maxTouchPoints:5},{userAgent:'Macintosh Safari',platform:'MacIntel',maxTouchPoints:5}]){
  const h=await installerHarness(device);h.elements.find(e=>e.id==='atelier-install-open').handlers.click();
  const steps=h.elements.find(e=>e.className==='pwa-steps');assert.equal(steps.hidden,false);assert.equal(steps.children.length,4);
  assert.match(steps.children.map(e=>e.textContent).join(' '),/Safari.*共有.*ホーム画面に追加.*Webアプリとして開く/);
  assert.equal(h.elements.find(e=>e.className==='pwa-install').hidden,true);
  const links=h.elements.find(e=>e.className==='pwa-apple-links');assert.equal(links.hidden,false);
  assert.ok(links.children.every(e=>e.href.startsWith('https://support.apple.com/guide/')&&e.rel==='noopener noreferrer'));
 }
});
test('standalone and unsupported browsers keep accurate installation states',async()=>{
 const app=await installerHarness({userAgent:'iPhone',isStandalone:true});app.elements.find(e=>e.id==='atelier-install-open').handlers.click();
 assert.equal(app.elements.find(e=>e.className==='pwa-steps').hidden,true);assert.equal(app.elements.find(e=>e.className==='pwa-install').hidden,true);
 assert.ok(app.elements.some(e=>e.textContent==='このアトリエはアプリ表示で開いています。'));
 const unsupported=await installerHarness();unsupported.elements.find(e=>e.id==='atelier-install-open').handlers.click();
 assert.equal(unsupported.elements.find(e=>e.className==='pwa-install').hidden,true);assert.equal(unsupported.elements.find(e=>e.className==='pwa-steps').hidden,true);
 assert.ok(unsupported.elements.some(e=>e.textContent?.includes('表示されていれば')));
});
test('gallery and editor include Apple icon, standalone metadata and zoom-safe viewport',async()=>{
 for(const page of ['index.html','admin/index.html']){
  const text=await readFile(new URL('../'+page,import.meta.url),'utf8');
  assert.match(text,/rel="apple-touch-icon"/);assert.match(text,/name="apple-mobile-web-app-capable" content="yes"/);
  assert.match(text,/name="apple-mobile-web-app-status-bar-style" content="default"/);assert.match(text,/viewport-fit=cover/);
  assert.doesNotMatch(text,/maximum-scale=1|user-scalable=no/);
 }
});

test('release-versioned JS/CSS are coherent and only the exact public release query is cacheable',async()=>{
 const release='20261014-layout1';
 for(const path of ['index.html','admin/index.html']){
  const text=await readFile(new URL('../'+path,import.meta.url),'utf8');
  for(const match of text.matchAll(/(?:href|src)="(\.\.?\/[^"?]+\.(?:js|css))(\?[^" ]*)?"/g)){
   assert.equal(match[2],'?v='+release,match[1]);await access(new URL('../'+(path.startsWith('admin/')?'admin/':'')+match[1],import.meta.url));
  }
 }
 for(const path of ['theater.js','admin/app.js','admin/display-settings.js']){
  const text=await readFile(new URL('../'+path,import.meta.url),'utf8');
  for(const match of text.matchAll(/from '(\.\.?\/[^'?]+\.js)(\?[^']*)?'/g))assert.equal(match[2],'?v='+release,match[1]);
 }
 const h=workerHarness();
 for(const path of ['theater.js','slideshow.js','display-mode.js','display-mode.css'])assert.equal((await h.dispatch('fetch',base+path+'?v='+release)).intercepted,true);
 for(const path of ['admin/app.js','admin/index.html','maze/app.js','data/archive.json','unknown.js'])assert.equal((await h.dispatch('fetch',base+path+'?v='+release)).intercepted,false);
 for(const query of ['?v=old','?v='+release+'&token=private','?token=private','?v='+release+'&v=other'])assert.equal((await h.dispatch('fetch',base+'theater.js'+query)).intercepted,false);
 assert.match(workerSource,/mumei-atelier-shell-v3-/);assert.match(workerSource,/cacheName: CACHE/);
 assert.doesNotMatch(workerSource,/localStorage|sessionStorage|\.clear\(/);
});
