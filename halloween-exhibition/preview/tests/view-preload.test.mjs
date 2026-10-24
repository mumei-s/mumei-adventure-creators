import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {preloadSelectedView,selectedViewDependencyURLs} from '../view-preload.js';

function documentFixture({supported=true}={}){
 const links=[],requests=[];
 const doc={baseURI:'https://example.test/preview/town/?return=theatre',links,requests};
 doc.createElement=tag=>({tag,relList:{supports:rel=>supported&&rel==='modulepreload'},attributes:{},setAttribute(name,value){this.attributes[name]=value;},remove(){const index=links.indexOf(this);if(index!==-1)links.splice(index,1);}});
 doc.head={append(link){links.push(link);requests.push(link.href);}};
 doc.querySelectorAll=()=>links.filter(link=>link.rel==='modulepreload');
 return doc;
}
const worldURL='https://example.test/preview/town/world-3d.js?v=source';

test('selected dependency URLs preserve the world version and exact vendored THREE chain',async()=>{
 assert.deepEqual(selectedViewDependencyURLs('./world-3d.js?v=source',{baseURL:'https://example.test/preview/town/',moduleURL:'https://example.test/preview/view-preload.js?v=release'}),[
  worldURL,'https://example.test/preview/maze/vendor/three.module.js','https://example.test/preview/maze/vendor/three.core.min.js',
 ]);
 const module=await readFile(new URL('../maze/vendor/three.module.js',import.meta.url),'utf8');
 assert.match(module,/from["']\.\/three\.core\.min\.js["']/);
 assert.deepEqual(selectedViewDependencyURLs(null),[]);
});

test('2D, already aborted, missing document and unsupported preload never request dependencies',()=>{
 const doc=documentFixture(),abort=new AbortController();abort.abort();
 preloadSelectedView({requires3D:false,worldURL,doc})();
 preloadSelectedView({requires3D:true,worldURL,doc,signal:abort.signal})();
 preloadSelectedView({requires3D:true,worldURL,doc:null})();
 const unsupported=documentFixture({supported:false});
 preloadSelectedView({requires3D:true,worldURL,doc:unsupported})();
 assert.deepEqual(doc.requests,[]);assert.deepEqual(unsupported.requests,[]);
});

test('the build-provided world URL uses the selected source directory and retains its exact hash',t=>{
 const prior=globalThis.__ATELIER_GAME_WORLD_URL__;
 t.after(()=>{if(prior===undefined)delete globalThis.__ATELIER_GAME_WORLD_URL__;else globalThis.__ATELIER_GAME_WORLD_URL__=prior;});
 globalThis.__ATELIER_GAME_WORLD_URL__='./game-world.js?v=20261019-game-fast1-012345abcdef';
 const urls=selectedViewDependencyURLs(worldURL,{baseURL:'https://example.test/unrelated/',moduleURL:'https://example.test/preview/view-preload.js'});
 assert.equal(urls[0],'https://example.test/preview/town/game-world.js?v=20261019-game-fast1-012345abcdef');
 assert.equal(urls.length,3);
});

test('all three selected modules are hinted synchronously at low priority without a readiness wait',()=>{
 const doc=documentFixture();
 const release=preloadSelectedView({requires3D:true,worldURL,doc});
 assert.equal(typeof release,'function');assert.equal(doc.requests.length,3);
 assert.deepEqual(doc.requests,selectedViewDependencyURLs(worldURL,{baseURL:doc.baseURI}));
 assert.ok(doc.links.every(link=>link.rel==='modulepreload'&&link.crossOrigin==='anonymous'&&link.attributes.fetchpriority==='low'));
 release();assert.equal(doc.links.length,0);
});

test('overlapping preparation shares hints; releasing one owner does not remove another owner’s hints',()=>{
 const doc=documentFixture();
 const first=preloadSelectedView({requires3D:true,worldURL,doc});
 const second=preloadSelectedView({requires3D:true,worldURL,doc});
 assert.equal(doc.requests.length,3);first();first();assert.equal(doc.links.length,3);
 second();assert.equal(doc.links.length,0);
 const next=preloadSelectedView({requires3D:true,worldURL,doc});
 assert.equal(doc.requests.length,3,'issued URLs stay deduped after rapid view switches');next();
});

test('existing exact modulepreloads are reused and never removed by this helper',()=>{
 const doc=documentFixture(),prior=doc.createElement('link');prior.rel='modulepreload';prior.href=worldURL;doc.links.push(prior);
 const release=preloadSelectedView({requires3D:true,worldURL,doc});
 assert.equal(doc.requests.length,2);release();assert.deepEqual(doc.links,[prior]);
});

test('abort releases only its lease and never queues a later request or app completion callback',()=>{
 const doc=documentFixture(),first=new AbortController(),second=new AbortController();
 const release=preloadSelectedView({requires3D:true,worldURL,signal:first.signal,doc});
 preloadSelectedView({requires3D:true,worldURL,signal:second.signal,doc});
 first.abort();assert.equal(doc.links.length,3);
 second.abort();release();assert.equal(doc.links.length,0);assert.equal(doc.requests.length,3);
 preloadSelectedView({requires3D:true,worldURL,signal:first.signal,doc});
 assert.equal(doc.requests.length,3);
});

test('only the selected world is prepared and each document owns its own hint lifecycle',()=>{
 const doc=documentFixture(),other=documentFixture();
 preloadSelectedView({requires3D:true,worldURL,doc});
 assert.equal(doc.requests.filter(url=>url.includes('world')).length,1);
 preloadSelectedView({requires3D:true,worldURL:'https://example.test/preview/maze/world.js?v=source',doc});
 assert.equal(doc.requests.length,4,'shared THREE dependencies are reused for a new explicit target');
 preloadSelectedView({requires3D:true,worldURL,doc:other});assert.equal(other.requests.length,3);
});

test('invalid optional URLs safely fall back to normal dynamic import',()=>{
 const doc=documentFixture();
 assert.doesNotThrow(()=>preloadSelectedView({requires3D:true,worldURL:'https://[',doc})());
 assert.deepEqual(doc.requests,[]);
});

test('preparation never fetches or evaluates modules and does not create renderers or timers',async()=>{
 const source=await readFile(new URL('../view-preload.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/\b(?:fetch|import|setTimeout|requestAnimationFrame)\s*\(|\bnew\s+WebGLRenderer\b/);
});
