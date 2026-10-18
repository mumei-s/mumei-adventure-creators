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

test('social metadata has a concise share title and real crop-safe 1200 by 628 JPEG',async()=>{
 assert.ok(html.includes('<title>'+title+'</title>'));
 assert.ok(html.includes('property="og:title" content="魔法の入口｜Halloween Atelier"'));
 const image=html.match(/property="og:image" content="([^"]+)"/)[1];
 assert.equal(image,base+'assets/atelier-magic-gate-share-wide-20261015.jpg');
 const bytes=await readFile(new URL('../assets/atelier-magic-gate-share-wide-20261015.jpg',import.meta.url));
 assert.equal(bytes.readUInt16BE(0),0xffd8);let dimensions;for(let pos=2;pos<bytes.length;){if(bytes[pos++]!==0xff)continue;const marker=bytes[pos++],length=bytes.readUInt16BE(pos);if([0xc0,0xc1,0xc2].includes(marker)){dimensions=[bytes.readUInt16BE(pos+5),bytes.readUInt16BE(pos+3)];break;}pos+=length;}assert.deepEqual(dimensions,[1200,628]);assert.match(html,/property="og:image:type" content="image\/jpeg"/);assert.match(html,/property="og:image:height" content="628"/);
 assert.match(html,/name="twitter:card" content="summary_large_image"/);
 assert.match(html,/name="note:card" content="summary_large_image"/);
});

test('new static script, stylesheet, manifest, and icon references resolve locally',async()=>{
 for(const path of ['pwa.js','sw.js','magical-entrance.css','manifest.webmanifest','assets/atelier-icon.svg','assets/atelier-icon-192.png'])await access(new URL('../'+path,import.meta.url));
 for(const match of html.matchAll(/(?:href|src)="\.\/([^"]+\.(?:css|js|webmanifest|svg|png))"/g))await access(new URL('../'+match[1],import.meta.url));
});

async function installerHarness({registrations=[], secure=true, script=base+'pwa.js', prompt=null,userAgent='Test browser',platform='Linux',maxTouchPoints=0,isStandalone=false,settingsReady=true}={}){
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
 const header=new El('div'),settings=new El('div'),body=new El('body'),panel=new El('button');panel.id='atelier-install-panel';
 const context=vm.createContext({
  URL, isSecureContext:secure, matchMedia:()=>({matches:isStandalone}),
  setTimeout:fn=>fn(), document:{readyState:'complete',createElement:tag=>new El(tag),querySelector:selector=>selector==='#atelier-install-panel'?panel:selector==='.visitor-preferences'?(settingsReady?settings:null):header,body},
  navigator:{userAgent,platform,maxTouchPoints,standalone:isStandalone,serviceWorker:{getRegistrations:async()=>registrations,register:async(...args)=>calls.push(args)}},
  window:{addEventListener:(type,fn)=>events[type]=fn}
 });
 vm.runInContext(installSource.replaceAll('import.meta.url',JSON.stringify(script)),context);
 for(let i=0;i<20;i++)await Promise.resolve();
 if(prompt)events.beforeinstallprompt({...prompt,preventDefault(){}});
 return {calls,events,elements,header,panel,settings};
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


test('top installation panel returns focus, hides in standalone, and hides after installation',async()=>{
 const h=await installerHarness();assert.equal(h.panel.hidden,false);
 h.panel.handlers.click();const dialog=h.elements.find(e=>e.className==='pwa-guide');assert.equal(dialog.open,true);
 dialog.close();assert.equal(h.panel.focused,true);
 h.panel.handlers.click();assert.equal(dialog.open,true);
 h.events.appinstalled();assert.equal(h.panel.hidden,true);dialog.close();
 assert.equal(h.elements.find(e=>e.id==='atelier-install-open').focused,true);
 const standalone=await installerHarness({isStandalone:true});assert.equal(standalone.panel.hidden,true);
});
test('title precedes compact toolbar invitation and Apple icon has a dedicated 180px source',async()=>{
 assert.match(html,/<header class="masthead"><a class="brand"/);
 assert.ok(html.indexOf('class="palace-toolbar"')<html.indexOf('id="atelier-install-panel"'));
 assert.ok(html.indexOf('id="atelier-install-panel"')<html.indexOf('id="palace-world-links"'));
 assert.match(html,/ホーム画面に追加/);
 assert.match(html,/rel="apple-touch-icon" href=".\/assets\/atelier-door-180.png"/);
 const bytes=await readFile(new URL('../assets/atelier-door-180.png',import.meta.url));
 assert.equal(bytes.readUInt32BE(16),180);assert.equal(bytes.readUInt32BE(20),180);
});

test('the secondary install control never appears in the header during startup',async()=>{
 for(const settingsReady of [true,false]){
  const h=await installerHarness({settingsReady});
  const trigger=h.elements.find(e=>e.id==='atelier-install-open');
  assert.equal(h.header.children.includes(trigger),false);
  assert.equal(trigger.hidden,!settingsReady);
  if(settingsReady)assert.ok(h.settings.children.includes(trigger));
 }
});
