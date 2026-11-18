import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';

const load = async path => import('data:text/javascript;base64,' +
  Buffer.from(await readFile(new URL(path, import.meta.url), 'utf8')).toString('base64'));
const { districtCamera, exteriorHeight } = await load('../../halloween-exhibition/preview/diorama-city/camera.js');
const { streetAreas, walkingRoute, walkable } = await load('../../halloween-exhibition/preview/diorama-city/paths.js');
import { venues, venueSpawn, venueWalkable } from '../../halloween-exhibition/preview/diorama-city/venues.js';
const { atlasChecks, articleChecks, normalizeCardLines, pixelDifference } = await load('../quality-assist.js');
const { makeArtifactPrompt } = await load('../prompt-play.js');
import { playgroundPose } from '../../halloween-exhibition/preview/diorama-city/district-activities.js';
const { readWalkDraft, saveWalkDraft, clearWalkDraft, WALK_DRAFT_STORAGE } = await load('../avatar-travel.js');

test('walking camera reveals the character while overview has a distinct stable scale', () => {
  for (const [width, height] of [[390, 575], [844, 235], [820, 910], [1180, 650], [1440, 700]]) {
    const settings = { width, height, position: [480, 500], inside: false };
    const walk = districtCamera({ ...settings, overview: false });
    const full = districtCamera({ ...settings, overview: true });
    assert.ok(walk.scale / full.scale >= 2.1);
    assert.ok(exteriorHeight(500) * walk.scale >= 70);
    assert.equal(districtCamera({ ...settings, position: [200, 320], overview: false }).scale, walk.scale);
    assert.ok(Number.isFinite(walk.x) && Number.isFinite(walk.y));
  }
});

test('street arrivals reach every public facility and all indoor actions stay on their floor', () => {
  for (const area of Object.values(streetAreas)) {
    for (const start of Object.values(area.arrivals)) {
      for (const place of Object.values(area.places)) {
        assert.ok(walkable(place.point, area), place.label);
        assert.ok(walkingRoute(start, place.point, area).length, place.label);
      }
    }
  }
  for (const venue of Object.values(venues)) {
    assert.ok(venueWalkable(venueSpawn, venue), venue.title);
    for (const spot of Object.values(venue.spots)) assert.ok(venueWalkable(spot.point, venue), spot.label);
    assert.equal(venueWalkable([500, 100], venue), false);
  }
  assert.equal(venueWalkable([870, 480], venues.market), false);
  assert.equal(venueWalkable([700, 420], venues.mirrorRoom), false);
});

test('sprite inspection detects missing cells, opaque backdrops, and clipping warnings', () => {
  const width = 160, height = 160, data = new Uint8ClampedArray(width * height * 4);
  for (let cell = 0; cell < 16; cell++) {
    for (let y = 4; y < 36; y++) for (let x = 13; x < 27; x++) {
      const index = ((Math.floor(cell / 4) * 40 + y) * width + cell % 4 * 40 + x) * 4;
      data[index + 3] = 255;
    }
  }
  assert.deepEqual(atlasChecks({ width, height, data }).errors, []);
  for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) data[(y * width + x) * 4 + 3] = 0;
  assert.match(atlasChecks({ width, height, data }).errors.join(' '), /1マス/);
  data.fill(255);
  assert.match(atlasChecks({ width, height, data }).errors.join(' '), /透過/);
});

test('article validation preserves raw card URLs and catches incomplete or premature articles', () => {
  const urls = ['https://note.com/ss_yr', 'https://mumei-s.github.io/note-insight/'];
  const article = ['題名', '［ここに街のイラスト１］', '［ここに街のイラスト２］', '企画主・無名S note', ...urls, '#無名Sプロンプト'].join('\n\n');
  assert.deepEqual(articleChecks(article, { title: '題名', urls }), []);
  assert.match(articleChecks(article.replace(urls[0], `[企画主](${urls[0]})`), { urls }).join(' '), /単独行/);
  assert.match(articleChecks(article.replace('題名', '入居しました'), { urls }).join(' '), /入居/);
  const normalized = normalizeCardLines(`[企画主](${urls[0]})\n関連記事\nhttps://note.com/ss_yr/n/n1234`, urls);
  assert.ok(normalized.split('\n').includes(urls[0]));
  assert.ok(normalized.split('\n').includes('https://note.com/ss_yr/n/n1234'));
  assert.equal(pixelDifference([1, 2, 3], [1, 2, 3]), 0);
  assert.equal(pixelDifference([1], [255]) > .9, true);
});

test('repair prompts target only missing work and preserve the author voice', () => {
  const prompt = makeArtifactPrompt({ kind: 'scene2', id: 'ss_yr', title: '雨の街へ', scene: '運河のカフェ' });
  assert.match(prompt, /本文イラスト２だけ/);
  assert.match(prompt, /完成済みの他の画像を再生成しない/);
  assert.match(prompt, /顔文字を多め/);
  assert.match(prompt, /斜め向きの涙笑い絵文字は使わない/);
  assert.match(makeArtifactPrompt({ kind: 'cover' }), /1280×650/);
});

test('finishing the slide leaves the actor on walkable ground', () => {
  const pose = playgroundPose({ kind: 'slide', origin: [847, 513], started: 0 }, 4000);
  assert.equal(pose.done, true);
  assert.ok(venueWalkable(pose.exit, venues.playground));
});

test('drafts survive a new tab and a failed storage write without preferring stale images', () => {
  const original = globalThis.window;
  const storage = () => {
    const values = new Map();
    return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  };
  const sessionStorage = storage(), localStorage = storage();
  globalThis.window = { sessionStorage, localStorage };
  try {
    const old = { noteId: 'one', avatar: { source: 'data:image/png;base64,AAAA' } };
    sessionStorage.setItem(WALK_DRAFT_STORAGE, JSON.stringify(old));
    assert.equal(readWalkDraft().noteId, 'one');
    sessionStorage.setItem = () => { throw Error('quota'); };
    assert.equal(saveWalkDraft({ ...old, noteId: 'two' }), true);
    assert.equal(readWalkDraft().noteId, 'two');
    clearWalkDraft('one');
    assert.equal(readWalkDraft().noteId, 'two');
    globalThis.window.sessionStorage = storage();
    assert.equal(readWalkDraft().noteId, 'two');
  } finally {
    if (original === undefined) delete globalThis.window;
    else globalThis.window = original;
  }
});

test('facility card pages have original metadata and a direct entrance', async () => {
  for (const [id, venue] of Object.entries(venues)) {
    const html = await readFile(new URL('../../halloween-exhibition/preview/diorama-city/spots/' + id + '.html', import.meta.url), 'utf8');
    assert.ok(html.includes('og:title') && html.includes(venue.title));
    assert.ok(html.includes('og:image') && html.includes(venue.image.slice(2)));
    assert.ok(html.includes('data-venue="' + id + '"'));
  }
});

test('legacy transparent cropped atlas is detected without saved format; single actor is not',async()=>{
 const {detectAtlas}=await load('../../halloween-exhibition/preview/diorama-city/atlas-layout.js');
 for(const [width,height] of [[160,160],[173,231]]){
   const data=new Uint8ClampedArray(width*height*4);
   for(let row=0;row<4;row++)for(let col=0;col<4;col++){
     for(let y=Math.floor(row*height/4+height*.016);y<Math.floor((row+1)*height/4-height*.016);y++)
       for(let x=Math.floor(col*width/4+width*.065);x<Math.floor((col+1)*width/4-width*.065);x++)data[(y*width+x)*4+3]=255;
   }
   assert.equal(detectAtlas({width,height,data})?.length,16);
   data.fill(0);
   for(let y=8;y<height-8;y++)for(let x=Math.floor(width*.35);x<Math.floor(width*.65);x++)data[(y*width+x)*4+3]=255;
   assert.equal(detectAtlas({width,height,data}),null);
 }
});

test('touching legacy sheet rows are split while four ordinary standing people stay intact',async()=>{
 const {detectAtlas}=await load('../../halloween-exhibition/preview/diorama-city/atlas-layout.js');
 const width=240,height=320,data=new Uint8ClampedArray(width*height*4);
 function figure(row,col,whole=false){
  const span=whole?height:height/4;
  for(let y=0;y<span;y++){
   const phase=y/span;
   const half=phase<.15?10:phase<.22?6:phase<.55?16:phase<.72?13:9;
   const center=30+col*60;
   for(let x=center-half;x<center+half;x++)data[((row*height/4+y)*width+x)*4+3]=255;
  }
 }
 for(let row=0;row<4;row++)for(let col=0;col<4;col++)figure(row,col);
 assert.equal(detectAtlas({width,height,data})?.length,16);
 data.fill(0);
 for(let col=0;col<4;col++)figure(0,col,true);
 assert.equal(detectAtlas({width,height,data}),null);
});
