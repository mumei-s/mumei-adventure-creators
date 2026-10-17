import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {settlePalaceImage} from '../palace-startup.js';
function fixture({complete=false,naturalWidth=0,decode}={}){const events={},pending=new Map();let n=0;return {image:{complete,naturalWidth,decode,style:{},addEventListener:(k,f)=>events[k]=f,removeEventListener:k=>delete events[k]},events,pending,timers:{setTimeout:f=>{pending.set(++n,f);return n},clearTimeout:id=>pending.delete(id)}};}
test('castle guard waits for decode, not just load or archive completion',async()=>{let decodeDone;const f=fixture({complete:true,naturalWidth:800,decode:()=>new Promise(r=>decodeDone=r)});let result;const ready=settlePalaceImage(f.image,f).then(x=>result=x);await Promise.resolve();assert.equal(result,undefined);decodeDone();await ready;assert.equal(result,'ready');assert.equal(f.pending.size,0);});
test('image error keeps embedded castle preview and resolves fallback',async()=>{const f=fixture();const ready=settlePalaceImage(f.image,f);f.events.error();assert.equal(await ready,'fallback');assert.equal(f.image.style.visibility,'hidden');assert.equal(f.pending.size,0);});
test('stalled image and stalled decode cannot trap the entrance indefinitely',async()=>{for(const decode of [undefined,()=>new Promise(()=>{})]){const f=fixture({complete:!!decode,naturalWidth:decode?800:0,decode});const ready=settlePalaceImage(f.image,f);[...f.pending.values()][0]();assert.equal(await ready,'fallback');assert.equal(f.pending.size,0);}});
test('loaded image without decode and missing image settle safely',async()=>{const f=fixture({complete:true,naturalWidth:600});assert.equal(await settlePalaceImage(f.image,f),'ready');assert.equal(await settlePalaceImage(null),'fallback');});
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
test('first HTML carries castle pixels and prioritizes only the matching castle',async()=>{const html=await read('index.html');assert.match(html,/class="palace-art"[^>]*data:image\/webp;base64,/);assert.match(html,/id="palace-image"[^>]*fetchpriority="high"[^>]*loading="eager"/);assert.equal((html.match(/rel="preload" as="image"/g)||[]).length,2);assert.match(html,/id="palace-gate"[^>]*disabled/);assert.doesNotMatch(html,/eerie-parapet/);});
test('three captions stay inside actual remaining viewport and walkers cannot block gate',async()=>{const css=await read('palace-entrance.css');assert.match(css,/100svh - var\(--palace-header-height,180px\)/);assert.match(css,/palace-caption-stack\{[^}]*bottom:8px[^}]*width:min\(62%,330px\)/);assert.match(css,/palace-path-walkers\{[^}]*pointer-events:none/);assert.match(css,/prefers-reduced-motion/);for(const [width,height,header] of [[333,640,180],[360,640,180],[390,740,180],[740,390,150]]){const scene=Math.max(230,height-header);const captionBottom=header+scene-8;assert.ok(captionBottom<=height);assert.ok(Math.min(width*.62,330)<width*.7);}});
test('archive paint does not wait for optional full images, settings size is first',async()=>{const js=await read('theater.js'),pwa=await read('pwa.js');assert.doesNotMatch(js,/await palaceVisualReady|palaceVisualReady\.then/);assert.match(js,/void initPalaceStartup\(root\)/);assert.match(js,/prepend\(displayPreferences\)/);assert.match(js,/表示サイズ（この端末）/);assert.match(pwa,/window.addEventListener\('load',schedulePreviewWorker/);assert.match(pwa,/requestIdleCallback/);});

test('walkers attach to visible scene and stay outside caption side lanes at short widths',async()=>{const html=await read('index.html'),css=await read('palace-entrance.css');assert.match(html,/<div class="palace-path-walkers"/);assert.match(css,/palace-entrance>\.palace-path-walkers/);for(const width of [333,360,390]){const side=width*.19,walker=width*.17;assert.ok(walker+3<side);assert.ok(width*.04+width*.10+3<side);}});

test('usable fallback never leaves technical text over the castle',async()=>{const source=await read('palace-startup.js');assert.doesNotMatch(source,/軽量表示で開けます/);assert.match(source,/status\.textContent='';status\.hidden=true/);});

test('castle format follows visible scene aspect, not a phone-width cutoff',async()=>{
 const {palaceSceneFormat}=await import('../palace-startup.js');
 for(const [w,h,want] of [[320,420,'portrait'],[390,550,'portrait'],[430,620,'portrait'],[980,1740,'portrait'],[1180,531,'landscape'],[844,230,'landscape'],[600,600,'portrait']])assert.equal(palaceSceneFormat(w,h),want);
 for(const [w,h] of [[0,0],[NaN,500],[300,Infinity]])assert.equal(palaceSceneFormat(w,h),'landscape');
 const css=await read('presentation-profiles.css'),js=await read('palace-startup.js');
 assert.match(css,/data-palace-format=portrait[^}]+100cqh \* \.75[^}]+--gate-texture:url\('\.\/assets\/palace\/gate-phone.webp'\)/);
 assert.match(css,/data-palace-format=landscape[^}]+100cqh \* 1\.777[^}]+--gate-texture:url\('\.\/assets\/palace\/gate-desktop.webp'\)/);
 assert.match(js,/format==='portrait'\?'all':'not all'/);assert.match(js,/observer.observe\(palace\)/);
 // At the reported tall geometry, portrait avoids the desktop painting's extreme crop.
 const w=980,h=1740;const oldGate=Math.max(w,h*1.777)*.23744019,newGate=Math.max(w,h*.75)*.32872928;
 assert.ok(oldGate>700);assert.ok(newGate<450);assert.ok(newGate>w*.4);
});

test('deadline fallback never hides a late successful castle image',async()=>{const f=fixture();const ready=settlePalaceImage(f.image,f);[...f.pending.values()][0]();assert.equal(await ready,'fallback');assert.equal(f.image.style.visibility,undefined);assert.equal(f.pending.size,0);assert.deepEqual(Object.keys(f.events),[]);});
