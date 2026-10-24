import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {settlePalaceImage,initPalaceStartup,guardPalaceDecorations,schedulePalaceResidents} from '../palace-startup.js';
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

test('deadline fallback hides broken placeholders and still upgrades a late successful castle image',async()=>{const f=fixture();let upgrades=0;const ready=settlePalaceImage(f.image,{...f,onReady:()=>upgrades++});[...f.pending.values()][0]();assert.equal(await ready,'fallback');assert.equal(f.image.style.visibility,'hidden');assert.equal(f.pending.size,0);f.image.naturalWidth=900;f.events.load();assert.equal(f.image.style.visibility,'visible');assert.equal(upgrades,1);assert.deepEqual(Object.keys(f.events),[]);});

test('a synchronously throwing decoder cannot reject or trap a painted castle',async()=>{
 const f=fixture({complete:true,naturalWidth:800,decode:()=>{throw Error('decoder unavailable');}});
 assert.equal(await settlePalaceImage(f.image,f),'ready');assert.equal(f.image.style.visibility,'visible');assert.equal(f.pending.size,0);
});

test('decorative failures stay invisible and a later real image restores visibility',()=>{
 const optional=fixture(),managed=fixture();managed.image.id='artwork-image';const events={};
 const root={querySelectorAll:()=>[optional.image,managed.image],addEventListener:(type,handler)=>events[type]=handler,removeEventListener:type=>delete events[type]};
 const destroy=guardPalaceDecorations(root);assert.equal(optional.image.style.visibility,'hidden');assert.equal(managed.image.style.visibility,undefined);
 events.error({target:optional.image});assert.equal(optional.image.style.visibility,'hidden');optional.image.naturalWidth=128;events.load({target:optional.image});assert.equal(optional.image.style.visibility,'visible');
 destroy();assert.deepEqual(Object.keys(events),[]);
});

function startupFixture(){
 const castle=fixture(),gate=fixture(),events={},status={textContent:'宮殿を準備しています…',hidden:false},palace={getBoundingClientRect:()=>({width:390,height:600})};
 const doc={getElementById:id=>({'palace-image':castle.image,'palace-load-status':status,'palace-entrance':palace}[id])};
 const root={ownerDocument:doc,dataset:{palaceReady:'loading'},style:{setProperty(){}},querySelector:()=>null,querySelectorAll:()=>[castle.image],addEventListener:(type,handler)=>events[type]=handler};
 const ImageClass=class{constructor(){return gate.image;}};
 return{castle,gate,root,status,options:{timers:castle.timers,ImageClass,loadResidents:()=>new Promise(()=>{})}};
}

test('independent bootstrap immediately uses embedded pixels and never waits for optional residents',async()=>{
 const f=startupFixture(),ready=initPalaceStartup(f.root,f.options);assert.equal(initPalaceStartup(f.root,f.options),ready,'theater must reuse independent bootstrap');
 assert.equal(f.status.hidden,true);assert.equal(f.status.textContent,'');assert.equal(f.root.dataset.palaceReady,'fallback');
 f.castle.image.naturalWidth=900;f.castle.events.load();assert.equal(f.root.dataset.palaceReady,'fallback','gate still uses its own preview');
 f.gate.image.naturalWidth=600;f.gate.events.load();assert.deepEqual(await ready,['ready','ready']);assert.equal(f.root.dataset.palaceReady,'ready');assert.equal(f.castle.pending.size,0);
});

test('independent bootstrap has a bounded fallback and allows a late full castle and gate upgrade',async()=>{
 const f=startupFixture(),ready=initPalaceStartup(f.root,f.options);for(const timer of[...f.castle.pending.values()])timer();assert.deepEqual(await ready,['fallback','fallback']);
 assert.equal(f.status.hidden,true);assert.equal(f.root.dataset.palaceReady,'fallback');f.castle.image.naturalWidth=900;f.castle.events.load();f.gate.image.naturalWidth=700;f.gate.events.load();assert.equal(f.root.dataset.palaceReady,'ready');
});

test('theater installs image protection before unrelated setup and exposes a readiness marker',async()=>{
 const source=await read('theater.js');assert.ok(source.indexOf('void initPalaceStartup(root)')<source.indexOf('initViewport();'));assert.match(source,/load\(\);\s*root\.dataset\.theaterReady='ready'/);
});

test('optional resident downloads wait for working entrance, painted images and first idle opportunity, and cancel on entry',async()=>{
 let notify,idle,loads=0;const tasks=new Map();let id=0,painted;
 const root={dataset:{palaceState:'palace'},ownerDocument:{defaultView:{MutationObserver:class{constructor(fn){notify=fn;}observe(){}disconnect(){}},requestIdleCallback(fn){idle=fn;}}}};
 const timers={setTimeout(fn,delay){assert.equal(delay,0);tasks.set(++id,fn);return id;},clearTimeout(key){tasks.delete(key);}};
 schedulePalaceResidents(root,{ready:new Promise(resolve=>{painted=resolve;}),timers,loadResidents:async()=>{loads++;return {initPalaceLivingScene(){}};}});
 root.dataset.theaterReady=root.dataset.archiveState='ready';notify();assert.equal(tasks.size,0);
 painted();await Promise.resolve();assert.equal(tasks.size,1);assert.equal(loads,0);
 root.dataset.palaceState='gallery';notify();assert.equal(tasks.size,0);
 root.dataset.palaceState='palace';notify();assert.equal(tasks.size,1);
 [...tasks.values()][0]();assert.equal(loads,0);assert.equal(typeof idle,'function');idle();await Promise.resolve();assert.equal(loads,1);
});
test('data saving connections retain the lightweight residents without downloading animation atlases',async()=>{
 let scheduled=false;const root={dataset:{},ownerDocument:{defaultView:{navigator:{connection:{saveData:true}}}}};
 schedulePalaceResidents(root,{ready:Promise.resolve(),timers:{setTimeout(){scheduled=true;}},loadResidents(){throw Error('unnecessary download');}});
 await Promise.resolve();assert.equal(scheduled,false);
});

test('late optional import cannot initialize after leaving TOP and resumes without parallel imports',async()=>{
 let notify,loaded,starts=0,imports=0;const tasks=new Map();let id=0;
 const root={dataset:{palaceState:'palace',theaterReady:'ready',archiveState:'ready'},ownerDocument:{defaultView:{MutationObserver:class{constructor(fn){notify=fn;}observe(){}disconnect(){}}}}};
 const timers={setTimeout(fn,delay){assert.equal(delay,0);tasks.set(++id,fn);return id;},clearTimeout(key){tasks.delete(key);}};
 const flush=async()=>{for(let n=0;n<8;n++)await Promise.resolve();};
 const run=()=>{const [key,fn]=tasks.entries().next().value;tasks.delete(key);fn();};
 schedulePalaceResidents(root,{ready:Promise.resolve(),timers,loadResidents:()=>{imports++;return new Promise(resolve=>loaded=resolve);}});
 await flush();run();await flush();notify();assert.equal(imports,1);assert.equal(tasks.size,0);
 root.dataset.palaceState='gallery';notify();loaded({initPalaceLivingScene(){starts++;}});await flush();assert.equal(starts,0);
 root.dataset.palaceState='palace';notify();run();await flush();loaded({initPalaceLivingScene(){starts++;}});await flush();assert.equal(starts,1);assert.equal(imports,2);
});

test('optional module failure has only one bounded retry and never blocks entrance',async()=>{
 let loads=0,id=0;const tasks=new Map();const root={dataset:{theaterReady:'ready',archiveState:'ready'},ownerDocument:{defaultView:{}}};
 const timers={setTimeout(fn){tasks.set(++id,fn);return id;},clearTimeout(key){tasks.delete(key);}};
 schedulePalaceResidents(root,{ready:Promise.resolve(),timers,loadResidents:async()=>{loads++;throw Error('offline');}});
 for(let n=0;n<30;n++){await Promise.resolve();if(tasks.size){const [key,fn]=tasks.entries().next().value;tasks.delete(key);fn();}}
 assert.equal(loads,2);assert.equal(tasks.size,0);assert.equal(root.dataset.theaterReady,'ready');
});

test('repeated successful imports deferred outside TOP never exhaust the failure retry budget',async()=>{
 let notify,loaded,starts=0,imports=0,id=0;const tasks=new Map();
 const root={dataset:{palaceState:'palace',theaterReady:'ready',archiveState:'ready'},ownerDocument:{defaultView:{MutationObserver:class{constructor(fn){notify=fn;}observe(){}disconnect(){}}}}};
 const timers={setTimeout(fn){tasks.set(++id,fn);return id;},clearTimeout(key){tasks.delete(key);}};
 const flush=async()=>{for(let n=0;n<8;n++)await Promise.resolve();};
 const run=()=>{assert.equal(tasks.size,1);const [key,fn]=tasks.entries().next().value;tasks.delete(key);fn();};
 schedulePalaceResidents(root,{ready:Promise.resolve(),timers,loadResidents:()=>{imports++;return new Promise(resolve=>loaded=resolve);}});
 await flush();
 for(let visit=0;visit<3;visit++){
  run();await flush();notify();assert.equal(tasks.size,0,'pending import must remain single-flight');
  root.dataset.palaceState='gallery';notify();loaded({initPalaceLivingScene(){starts++;}});await flush();
  assert.equal(starts,0);assert.equal(tasks.size,0);
  root.dataset.palaceState='palace';notify();await flush();assert.equal(tasks.size,1,'successful deferred imports do not count as failures');
 }
 run();await flush();loaded({initPalaceLivingScene(){starts++;}});await flush();
 assert.equal(starts,1);assert.equal(imports,4);assert.equal(tasks.size,0);
});
