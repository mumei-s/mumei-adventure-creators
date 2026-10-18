import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {buildGalleryStyles} from '../scripts/build-gallery-styles.mjs';

const root=new URL('../',import.meta.url);
const read=name=>readFile(new URL(name,root),'utf8');
const sources=JSON.parse(await read('gallery-style-sources.json'));
const bundle=await read('gallery-styles.css'),html=await read('index.html');

test('one blocking stylesheet replaces the original 25 without changing cascade bytes or order',async()=>{
 const links=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(match=>match[1]);
 assert.deepEqual(links,['./gallery-styles.css?v=20261019-unified1']);
 assert.equal(sources.length,26);
 assert.equal(bundle,await buildGalleryStyles(),'edit source styles, then run npm run build:styles');
 let previous=-1;
 for(const source of sources){
  const css=await read(source.split('?')[0]);
  const exact=`/* Source: ${source} */\n${css}\n`;
  const index=bundle.indexOf(exact);assert.ok(index>previous,`${source} is byte-preserved in cascade order`);previous=index;
 }
 // Tiny matching gate previews are included; the compressed CSS budget stays close
 // to the previous 25 responses rather than trading requests for a larger payload.
 const oldBytes=(await Promise.all(sources.slice(0,-1).map(async name=>gzipSync(await read(name.split('?')[0])).length))).reduce((sum,n)=>sum+n,0);
 assert.ok(gzipSync(bundle).length<=oldBytes*1.08);
});

test('bundling preserves every CSS image and font URL destination',async()=>{
 const destinations=[];
 for(const source of sources){
  const text=await read(source.split('?')[0]);
  assert.doesNotMatch(text,/@(?:import|charset|namespace)\b/i);
  for(const match of text.matchAll(/url\(\s*(?:(["'])(.*?)\1|([^)]*))\s*\)/g)){
   const url=(match[2]??match[3]).trim();
   const before=new URL(url,new URL(source,root)),after=new URL(url,new URL('gallery-styles.css',root));
   assert.equal(after.href,before.href,`${source}: ${url}`);
   if(after.protocol==='file:'){await access(after);destinations.push(after.href);}
  }
 }
 assert.ok(destinations.length>10,'verified actual referenced local artwork, not only CSS text');
});

test('gate previews match both current compositions and full-resolution artwork still upgrades in place',async()=>{
 const preview=await read('palace-preview.css');
 const images=[...preview.matchAll(/data:image\/webp;base64,([A-Za-z0-9+/=]+)/g)].map(match=>Buffer.from(match[1],'base64'));
 assert.equal(images.length,3);
 for(const bytes of images){assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');assert.ok(bytes.length<7000);}
 assert.match(preview,/data-palace-format=portrait[^}]*--gate-preview:var\(--gate-preview-portrait\)/);
 assert.match(preview,/data-palace-format=landscape[^}]*--gate-preview:var\(--gate-preview-landscape\)/);
 assert.match(preview,/data-palace-format=landscape[^}]*background-image:var\(--palace-preview-landscape\)/);
 assert.match(preview,/data-palace-format=portrait[^}]*background-image:var\(--palace-preview-portrait\)/);
 assert.match(preview,/not\(\[data-palace-ready=ready\]\)[^}]*background-image:var\(--gate-texture\),var\(--gate-preview\)/);
 assert.match(bundle,/--gate-texture:url\('\.\/assets\/palace\/gate-phone.webp'\)/);
 assert.match(bundle,/--gate-texture:url\('\.\/assets\/palace\/gate-desktop.webp'\)/);
});

test('embedded previews keep provenance tied to the unchanged full-resolution art',async()=>{
 const preview=await read('palace-preview.css');
 for(const source of ['gate-phone','gate-desktop','palace-desktop']){
  const bytes=await readFile(new URL(`assets/palace/${source}.webp`,root));
  assert.ok(preview.includes(`Preview source ${source}.webp SHA256 ${createHash('sha256').update(bytes).digest('hex')}`));
 }
});
