import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {loadArtworkImage} from '../magical-loading.js';
function fixture(complete=false,naturalWidth=0){let n=0;const events={},pending=new Map(),states=[];const image={complete,naturalWidth,addEventListener:(name,fn)=>events[name]=fn,removeEventListener:name=>delete events[name]};const options={onState:state=>states.push(state),timers:{setTimeout:fn=>{pending.set(++n,fn);return n},clearTimeout:id=>pending.delete(id)}};return {image,events,pending,states,options};}
test('artwork stays loading until loaded then stops all listeners/timers',()=>{const f=fixture();loadArtworkImage(f.image,'https://example.com/a.jpg',f.options);assert.deepEqual(f.states,['loading']);f.image.naturalWidth=800;f.events.load();assert.deepEqual(f.states,['loading','ready']);assert.equal(f.pending.size,0);assert.deepEqual(f.events,{});});
test('cached image immediately completes without an artificial wait',()=>{const f=fixture(true,800);loadArtworkImage(f.image,'a.jpg',f.options);assert.deepEqual(f.states,['loading','ready']);assert.equal(f.pending.size,0);});
test('image error, empty cached image and timeout each produce terminal fallback',()=>{for(const method of ['error','cached','timeout']){const f=fixture(method==='cached');loadArtworkImage(f.image,'a.jpg',f.options);if(method==='error')f.events.error();if(method==='timeout')[...f.pending.values()][0]();assert.deepEqual(f.states,['loading','error']);assert.equal(f.pending.size,0);assert.deepEqual(f.events,{});}});
test('rapid navigation cancellation cannot overwrite the later image state',()=>{const f=fixture();const cancel=loadArtworkImage(f.image,'a.jpg',f.options);const stale=f.events.load;cancel();f.image.naturalWidth=900;stale();assert.deepEqual(f.states,['loading']);assert.equal(f.pending.size,0);loadArtworkImage(f.image,'b.jpg',f.options);f.events.load();assert.deepEqual(f.states,['loading','loading','ready']);});
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
test('entry hides all sibling walkers, retains castle and uses a noninteractive luminous journey',async()=>{const css=await read('magical-loading.css'),html=await read('index.html');assert.match(css,/not\(\[data-palace-state=palace\]\) \.palace-path-walkers\{display:none!important/);assert.match(css,/@keyframes palace-step-forward\{from\{[^}]*opacity:1\}to\{[^}]*opacity:1/);assert.match(css,/palace-journey\{[^}]*pointer-events:none/);assert.match(css,/data-palace-state=walking\] \.palace-journey\{display:block/);assert.match(html,/class="gate-corridor"/);assert.doesNotMatch(html,/class="palace-gate-inner"[^>]*>✧/);});
test('loading states are bounded and theme/pause/reduced-motion safe',async()=>{const css=await read('magical-loading.css'),js=await read('theater.js');assert.match(js,/withDeadline\(/);assert.match(js,/timeout:12000,signal:abort.signal/);assert.match(js,/archiveState='error'/);assert.match(js,/finally\{if\(archiveLoadAbort===abort\)archiveLoadAbort=null/);assert.match(js,/cancelArtworkLoad\(\)/);assert.match(css,/prefers-reduced-motion:reduce/);assert.match(css,/data-motion-paused=true/);assert.match(css,/data-mode=normal/);assert.doesNotMatch(css,/strobe|flash/i);});
test('gate and journey use the same original raster hall with inline fallback and no extra wait',async()=>{const css=await read('magical-loading.css');assert.match(css,/palace-interior\.webp/);assert.match(css,/--palace-interior-preview:url\('data:image\/webp;base64,/);assert.match(css,/\.gate-corridor\{display:none/);assert.match(css,/\.journey-arches,\.journey-motes\{display:none/);assert.match(css,/illustrated-hall-arrival \.55s/);assert.match(css,/data-palace-ready=fallback\] \.palace-load-status\{display:none!important/);const image=await readFile(new URL('../assets/palace/palace-interior.webp',import.meta.url));assert.equal(image.toString('ascii',0,4),'RIFF');assert.ok(image.length<220000);});

test('loaded artwork waits for actual decode; cancellation prevents old decode from painting',async()=>{
 const f=fixture();let completeDecode;
 f.image.naturalWidth=800;f.image.decode=()=>new Promise(resolve=>completeDecode=resolve);
 const cancel=loadArtworkImage(f.image,'a.jpg',f.options);f.events.load();await Promise.resolve();
 assert.deepEqual(f.states,['loading']);cancel();completeDecode();await Promise.resolve();await Promise.resolve();
 assert.deepEqual(f.states,['loading']);assert.equal(f.pending.size,0);
 const ready=fixture();ready.image.naturalWidth=800;ready.image.decode=async()=>{};
 loadArtworkImage(ready.image,'b.jpg',ready.options);ready.events.load();
 for(let i=0;i<5;i++)await Promise.resolve();
 assert.deepEqual(ready.states,['loading','ready']);assert.equal(ready.pending.size,0);
});
test('a stalled or failed decoder leaves a terminal image fallback',async()=>{
 for(const stall of [false,true]){
  const f=fixture();f.image.naturalWidth=800;f.image.decode=()=>stall?new Promise(()=>{}):Promise.reject(new Error('decode'));
  loadArtworkImage(f.image,'a.jpg',f.options);f.events.load();
  for(let i=0;i<5;i++)await Promise.resolve();
  if(stall)[...f.pending.values()][0]();
  assert.deepEqual(f.states,['loading','error']);assert.equal(f.pending.size,0);
 }
});
test('cached load plus the queued native load event decodes the same image only once',async()=>{
 const f=fixture(true,800);let decoded=0,done;f.image.decode=()=>{decoded++;return new Promise(resolve=>done=resolve);};
 loadArtworkImage(f.image,'a.jpg',f.options);f.events.load();await Promise.resolve();assert.equal(decoded,1);
 done();for(let i=0;i<5;i++)await Promise.resolve();assert.deepEqual(f.states,['loading','ready']);
});
