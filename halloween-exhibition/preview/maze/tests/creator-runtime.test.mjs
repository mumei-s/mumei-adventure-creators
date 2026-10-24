import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {compileCharacterRoster,compileCompanions,placeCreatorNPCs,creatorPose,creatorGuide,creatorAvailable,characterSprite,scaledCharacterLayout,createCharacterAssets,chooseCreatorAssets,buildCreatorActors,companionActor,isCharacterTap,layoutProblem,CREATOR_SLOTS,CHARACTER_BUDGET} from '../creator-runtime.js';
import {initialState,blocked,CELL,move} from '../maze-model.js';
import {inFurniture,moveAroundFurniture} from '../rpg-model.js';
import {createArtLibrary,playerPose} from '../rpg-art.js';
const read=path=>JSON.parse(fs.readFileSync(new URL(path,import.meta.url)));
const archive=read('../../data/archive.json'),manifest=read('../data/creator-characters.json');
const roster=()=>compileCharacterRoster(archive,manifest,2026);
const allDefinitions=()=>[...manifest.characters,...(manifest.companions||[])];
function dimensions(bytes){if(bytes.subarray(1,4).toString()==='PNG')return [bytes.readUInt32BE(16),bytes.readUInt32BE(20)];assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');for(let at=12;at+8<=bytes.length;){const type=bytes.toString('ascii',at,at+4),length=bytes.readUInt32LE(at+4),p=at+8;if(type==='VP8X')return [1+bytes.readUIntLE(p+4,3),1+bytes.readUIntLE(p+7,3)];if(type==='VP8 ')return [bytes.readUInt16LE(p+6)&16383,bytes.readUInt16LE(p+8)&16383];if(type==='VP8L'){const bits=bytes.readUInt32LE(p+1);return [1+(bits&16383),1+((bits>>>14)&16383)];}at=p+length+(length%2);}throw Error('No image dimensions');}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const fakeAsset=(name)=>({...structuredClone(manifest.characters[0].asset),src:`assets/creator-npcs/test-${name}.png`});

test('all submitted creators plus the user-approved CNA visual guests are ready while its article stays pending',()=>{
  const r=roster(),expected=[...new Set(archive.years.find(y=>y.year===2026).entries.filter(e=>e.visible!==false&&e.submissionStatus==='submitted').map(e=>e.creatorId))].sort();
  assert.equal(expected.length,16);assert.equal(r.hero?.creatorId,'ss_yr');
  const actual=[...new Set([r.hero,...r.npcs].filter(Boolean).map(e=>e.creatorId))].sort();
  // The later explicit user approval adds three profile guests; it never turns
  // the prior pending article into a submission. All other pending profiles stay excluded.
  assert.deepEqual(actual,[...expected,'grand_daisy8632'].sort());
  assert.deepEqual(r.omitted,[]);assert.equal(r.readyCreatorCount,17);assert.equal(r.submittedCreatorCount,16);assert.deepEqual(r.missingCreators,[]);
  assert.equal(r.npcs.filter(n=>n.participationRole==='profile-guest').length,3);
  assert.equal(archive.years.find(y=>y.year===2026).entries.find(e=>e.creatorId==='grand_daisy8632').submissionStatus,'pending');
});
test('every declared ready atlas exists with exact integrity, real encoded dimensions and measured in-bounds crops',()=>{
  for(const entry of allDefinitions().filter(e=>e.ready)){
    const bytes=fs.readFileSync(new URL('../'+entry.asset.src,import.meta.url));const [width,height]=dimensions(bytes);
    assert.equal(width,entry.asset.width,entry.id);assert.equal(height,entry.asset.height,entry.id);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),entry.asset.sha256,entry.id);assert.equal(layoutProblem(entry.asset),null,entry.id);
    assert(entry.identityReviewed&&entry.animationReviewed,entry.id);
  }
  assert.equal(roster().hero.source.referenceId,'owner-lantern-reference-20261016');assert.equal(roster().hero.source.referenceSHA256,'04b38f44043704243740cb7bcc1b7dbb58603162001bf1bc611a47687240eabd');assert.equal(roster().hero.source.libraryFileId,undefined);
  assert.equal(compileCompanions(manifest).some(c=>c.id==='owner-black-cat'),true);
});
test('unready, invalid, hidden, pending, or incomplete references cannot impersonate a ready participant',()=>{
  const first=manifest.characters.find(c=>c.role==='npc');assert(first);
  for(const mutate of [c=>c.ready=false,c=>c.identityReviewed=false,c=>c.animationReviewed=false,c=>c.asset.src='https://remote.invalid/other.png',c=>c.creatorId='grand_daisy8632',c=>c.articleURL='https://note.com/unknown/n/n123',c=>c.source.verified=false]){
    const m=structuredClone(manifest),c=m.characters.find(c=>c.id===first.id);mutate(c);const r=compileCharacterRoster(archive,m,2026);assert(!r.npcs.some(c=>c.id===first.id));assert(r.omitted.some(c=>c.id===first.id));
  }
  const m=structuredClone(manifest);m.groups.push({id:first.groupId,requiredEntityIds:['missing-companion']});assert(!compileCharacterRoster(archive,m,2026).npcs.some(c=>c.id===first.id));
});
test('canonical submission links are preserved independently of verified alternate reference articles',()=>{
  const r=roster();for(const c of [r.hero,...r.npcs]){if(c.participationRole==='profile-guest'){assert.equal(c.articleURL,null);assert.equal(c.profileURL,'https://note.com/grand_daisy8632');assert.equal(c.submissionStatus,'pending');continue;}const entries=archive.years.find(y=>y.year===2026).entries.filter(e=>e.creatorId===c.creatorId&&e.submissionStatus==='submitted');assert(entries.some(e=>[...(e.works||[]),...(e.links||[])].some(l=>l.url===c.articleURL)),c.id);assert.equal(c.source.verified,true);}
  const mako=r.npcs.find(c=>c.creatorId==='koakumako');if(mako){assert.equal(new URL(mako.source.articleURL).pathname.split('/')[1],'koakumako');assert.equal(new URL(mako.articleURL).pathname.split('/')[1],'koakumako');}
});
test('resized owner and NPC frames preserve anchors and all sixteen crops fit the decoded texture',async()=>{
  const hero=roster().hero,image={width:1024,height:1024};const art=createArtLibrary({loadImage:async()=>({width:1024,height:1024})});await art.ready;art.setPlayerAtlas(image,scaledCharacterLayout(hero.asset,image));
  for(const dir of ['down','left','right','up'])for(let col=0;col<4;col++){
    const phase=(col+.1)*Math.PI/2,p=playerPose(art,dir,true,phase),npc=characterSprite(hero.asset,image,dir,true,phase);assert.deepEqual(p.frame,npc.frame);const [x,y,w,h]=p.frame;assert(x>=0&&y>=0&&x+w<=1024.001&&y+h<=1024.001);assert(p.contentHeight<=h);
  }
});
test('all declared NPC groups fit safe slots and all actor homes, motion and guides remain on floor',()=>{
  const placed=placeCreatorNPCs(roster().npcs,manifest.slotAssignments);assert.deepEqual(placed.omitted,[]);
  for(const npc of placed.placed){const state={unlocked:true,horrorAccepted:true};assert(!blocked(npc.x*CELL,npc.z*CELL,state),npc.id);assert(!inFurniture(npc.x*CELL,npc.z*CELL),npc.id);
    for(let t=0;t<48;t+=.25){const p=creatorPose(npc,t,true,state);assert(!blocked(p.x*CELL,p.z*CELL,state),npc.id);assert(!inFurniture(p.x*CELL,p.z*CELL),npc.id);assert.deepEqual(creatorPose(npc,t,false,state),creatorPose(npc,0,false,state));}
    for(const s of [{},state]){const guide=creatorGuide(npc,s);assert(!blocked(guide.x*CELL,guide.z*CELL,s),npc.id);assert(!inFurniture(guide.x*CELL,guide.z*CELL),npc.id);}
  }
});
test('all participant approaches are reachable in both movement modes after their doors open',()=>{
 const npcs=placeCreatorNPCs(roster().npcs,manifest.slotAssignments).placed;
 for(const movement of[move,moveAroundFurniture]){const start={...initialState(),unlocked:true,horrorAccepted:true},queue=[start],seen=new Set([`${start.x},${start.z}`]);
  for(let i=0;i<queue.length;i++)for(const[dx,dz]of[[.5,0],[-.5,0],[0,.5],[0,-.5]]){const next=movement(queue[i],dx,dz),key=`${next.x},${next.z}`;if(!seen.has(key)){seen.add(key);queue.push(next);}}
  for(const npc of npcs)assert(queue.some(s=>Math.hypot(s.x-npc.x*CELL,s.z-npc.z*CELL)<1),npc.id);
 }
});
test('lazy selection keeps multi-entity groups whole and never bypasses a locked area',()=>{
 const npcs=[{id:'a',groupId:'pair',x:8,z:12},{id:'b',groupId:'pair',x:8.3,z:12},{id:'c',groupId:'single',x:10,z:12},{id:'locked',groupId:'locked',x:8,z:12,needsKey:true}];
 assert.deepEqual(chooseCreatorAssets(npcs,{x:8,z:12},{},2).map(c=>c.id),['a','b']);assert.deepEqual(chooseCreatorAssets(npcs,{x:8,z:12},{},1).map(c=>c.id),['c']);assert(!creatorAvailable(npcs[3],{}));
});
test('character requests deduplicate and concurrency never exceeds two active loads',async()=>{
 const waiting=[],calls=[];let running=0,max=0;const manager=createCharacterAssets({loadImage:async(url,asset)=>{calls.push(asset.src);running++;max=Math.max(max,running);await new Promise(r=>waiting.push(r));running--;return {width:1024,height:1024};}});const a=fakeAsset('a'),b=fakeAsset('b'),c=fakeAsset('c');
 const p=manager.request(a);assert.equal(manager.request(a),p);const rest=[manager.request(b),manager.request(c)];await tick();assert.equal(calls.length,2);waiting.splice(0).forEach(r=>r());await tick();assert.equal(calls.length,3);waiting.splice(0).forEach(r=>r());await Promise.all([p,...rest]);assert.equal(max,2);assert.equal(manager.status().loaded,3);manager.dispose();assert.equal(manager.status().loaded,0);
});
test('LRU eviction keeps pinned hero and closes evicted decoded images',async()=>{
 const closed=[],manager=createCharacterAssets({maxResident:2,maxBytes:8*1024*1024,loadImage:async(url,asset)=>({width:1024,height:1024,close(){closed.push(asset.src);}})});const a=fakeAsset('hero'),b=fakeAsset('old'),c=fakeAsset('new');manager.setPinned([a.src]);await manager.request(a);await manager.request(b);await manager.request(c);assert(manager.get(a.src));assert.equal(manager.get(b.src),null);assert(closed.includes(b.src));assert(manager.status().decodedBytes<=8*1024*1024);manager.dispose();
});
test('failed atlases stay unavailable without substituting another person and can be retried',async()=>{
 let fail=true;const a=fakeAsset('missing'),manager=createCharacterAssets({loadImage:async()=>{if(fail)throw Error('offline');return {width:1024,height:1024};}});assert.equal(await manager.request(a),null);await tick();assert.equal(manager.status().failed,1);assert.equal(manager.get(a.src),null);
 const actor={id:'missing',asset:a,x:8,z:12};assert.deepEqual(buildCreatorActors([actor],manager,{state:{}}),[]);manager.retry();fail=false;assert(await manager.request(a));assert.equal(manager.status().failed,0);manager.dispose();
});
test('disposing pending requests resolves cleanly without reintroducing decoded images',async()=>{
 let resolve;const manager=createCharacterAssets({concurrent:1,loadImage:()=>new Promise(r=>resolve=r)});const first=manager.request(fakeAsset('one')),second=manager.request(fakeAsset('two'));await tick();manager.dispose();let closed=false;resolve({width:1024,height:1024,close(){closed=true;}});assert.deepEqual(await Promise.all([first,second]),[null,null]);assert(closed);assert.equal(manager.status().loaded,0);
});
test('tap versus drag, canceled pointer, different pointers and long holds cannot open a dialogue',()=>{
 const s={pointerId:4,x:10,y:10,time:100};assert(isCharacterTap(s,{pointerId:4,x:13,y:10,time:200}));for(const e of[{pointerId:5,x:10,y:10,time:200},{pointerId:4,x:20,y:10,time:200},{pointerId:4,x:10,y:10,time:500}])assert(!isCharacterTap(s,e));assert(!isCharacterTap({...s,moved:true},{...s,time:200}));assert(!isCharacterTap(null,s));
});
test('pinned requests cannot exceed the hard decoded-image byte budget',async()=>{
 const assets=Array.from({length:9},(_,i)=>fakeAsset('pinned-'+i)),manager=createCharacterAssets({loadImage:async()=>({width:1254,height:1254,close(){}})});manager.setPinned(assets.map(a=>a.src));await Promise.all(assets.map(a=>manager.request(a)));assert(manager.status().decodedBytes<=CHARACTER_BUDGET.decodedBytes);assert(manager.status().loaded<=CHARACTER_BUDGET.resident);assert(manager.status().failed>0);manager.dispose();
});
test('default decoder falls back to bounded canvas when image bitmap resizing fails',async()=>{
 const old={Image:globalThis.Image,createImageBitmap:globalThis.createImageBitmap,OffscreenCanvas:globalThis.OffscreenCanvas,document:globalThis.document};let drawCount=0;
 class FakeImage{constructor(){this.width=1254;this.height=1254;}set src(value){queueMicrotask(()=>this.onload());}}
 class FakeCanvas{constructor(w,h){this.width=w;this.height=h;}getContext(){return {drawImage(){drawCount++;}};}}
 try{globalThis.Image=FakeImage;globalThis.createImageBitmap=async()=>{throw Error('not supported');};globalThis.OffscreenCanvas=FakeCanvas;const m=createCharacterAssets();const large={...fakeAsset('fallback'),width:1254,height:1254};const image=await m.request(large);assert.equal(image.width,1024);assert.equal(image.height,1024);assert.equal(drawCount,1);assert.equal(m.status().decodedBytes,4194304);m.dispose();
   delete globalThis.OffscreenCanvas;delete globalThis.document;const failed=createCharacterAssets();assert.equal(await failed.request({...large,src:'assets/creator-npcs/test-unavailable.png'}),null);assert.equal(failed.status().loaded,0);assert.equal(failed.status().failed,1);failed.dispose();
 }finally{for(const[k,v]of Object.entries(old))if(v===undefined)delete globalThis[k];else globalThis[k]=v;}
});
test('current avatar entities and explicit owner/Mako exceptions define the complete cast',()=>{
 const expected=['ss-yr-lantern-hero','ss-yr-black-cat','koakumako-base-devil','minato-shio-witch','mama-avatar-woman','mama-avatar-creature','naemo-masquerade','takechi-bread-avatar','yamakon-navy-figure','yamakon-pink-figure','tenkai-moon-robed-avatar','marimo','marimo-cat','chamomile-flower-avatar','tantan-streetwalker','tantan-avatar-hedgehog-pink-bow','tantan-avatar-hedgehog-green-cap','tantan-avatar-hedgehog-pacifier','aihan-avatar-woman','aihan-avatar-shiba','lokiron-avatar','iris','cna-black-bob','cna-star-twintails','cna-orange-glasses','rin-rai-lion','doyle-halloween-boy'].sort();
 const actual=allDefinitions().filter(e=>e.ready).flatMap(e=>e.entityIds);assert.equal(new Set(actual).size,actual.length);assert.deepEqual(actual.sort(),expected);assert(!actual.includes('ss-yr-white-lavender-character'));
});
test('nearby actions use two rows of44px controls within120px portrait dock',()=>{
 const css=fs.readFileSync(new URL('../creator-ui.css',import.meta.url),'utf8');assert(css.includes('.nearby:has(#creator-open:not([hidden])){display:grid;grid-template-columns:repeat(2,minmax(44px,1fr));gap:4px}'));
 assert(css.includes('height:44px;max-height:44px;min-width:44px!important'));assert(2*44+4<=120);assert(css.includes('width:96px!important;max-width:96px'));assert(css.includes('.move-pad{justify-self:start;margin-left:50px!important}'));
 for(const width of[320,360,390,750])assert((width-136)/2>=44*2+4,`portrait width ${width}`);
});

test('avatar-first policy requires a verified current profile review and rejects superseded casts',()=>{
 assert.equal(manifest.referencePolicy.preference,'creator-avatar');assert.equal(manifest.referencePolicy.requireReviewed,true);
 assert.equal(Object.keys(manifest.referenceReviews).length,17);for(const [creatorId,review] of Object.entries(manifest.referenceReviews)){if(creatorId==='dandy_snake880'){assert.equal(review.decision,'owner-selected-article');assert.equal(review.articleVisuallyInspected,true);assert.equal(review.avatarReference,undefined);assert(Number.isFinite(Date.parse(review.articleReference.verifiedAtUTC)));continue;}assert.equal(review.avatarVisuallyInspected,true);assert(Number.isFinite(Date.parse(review.avatarReference.verifiedAtUTC)));}
 const replacements=['mama_ca','imota14','clever_hare2654','tenkai_notes','cheeky_rhino7031','aihan_days'];
 for(const cid of replacements){const review=manifest.referenceReviews[cid];assert.equal(review.decision,'profile-avatar-replacement');assert.equal(review.reviewed,true);for(const c of manifest.characters.filter(c=>c.creatorId===cid))assert.equal(c.source.kind,'profile-avatar');}
 const retired=['mama-yorimichuu-suit','takechi-ao','takechi-paper-face','takechi-shu','chamomile-apprentice','tenkai-kurose-jin','tenkai-sakaki-mafuyu','lokiron-inukichi-held','aihan-narrator','aihan-shiba'];
 for(const id of retired)assert(!allDefinitions().some(c=>c.id===id||c.entityIds.includes(id)),id);
 const target=manifest.characters.find(c=>c.creatorId==='aihan_days');
 for(const mutate of[m=>delete m.referenceReviews[target.creatorId],m=>m.referenceReviews[target.creatorId].reviewed=false,m=>m.referenceReviews[target.creatorId].entityIds=[],m=>m.referenceReviews[target.creatorId].avatarReference.profileURL='https://note.com/someone_else',m=>m.characters.find(c=>c.id===target.id).source.userSelected=false,m=>m.characters.find(c=>c.id===target.id).source.referenceSHA256='unverified',m=>m.characters.find(c=>c.id===target.id).source.profileURL='https://note.com/someone_else',m=>m.characters.find(c=>c.id===target.id).source.imageURL='https://unverified.example/avatar.png']){
  const m=structuredClone(manifest);mutate(m);assert(!compileCharacterRoster(archive,m,2026).npcs.some(c=>c.id===target.id));
 }
});
test('same-identity preserved characters retain article generation provenance and separate avatar evidence',()=>{
 for(const cid of['n_kazumai55633','naemotion','real_hyena9474','fond_holly3483','soh_style_work']){assert.equal(manifest.referenceReviews[cid].decision,'profile-avatar-match');for(const c of manifest.characters.filter(c=>c.creatorId===cid))assert.equal(c.source.kind,'article-art');}
 const publicJSON=JSON.stringify(manifest);for(const token of['/workspace/','libfile_','localSourcePath','referencePath'])assert(!publicJSON.includes(token),token);
 const files=fs.readdirSync(new URL('../assets/creator-npcs/',import.meta.url)).sort(),declared=allDefinitions().map(c=>c.asset.src.split('/').at(-1)).sort();assert.deepEqual(files,declared,'No superseded or unused character files enter the publication package');
});
test('grouped hedgehog companions render with their creator without independent dialogue targets',()=>{
 const human=manifest.characters.find(c=>c.id==='tantan-streetwalker'),pets=manifest.characters.find(c=>c.id==='tantan-avatar-hedgehogs');assert(human&&pets);assert.equal(pets.interactive,false);assert.equal(pets.entityIds.length,3);assert.equal(human.groupId,pets.groupId);
 const pair=[human,pets].map((c,i)=>({...c,x:14+i*.6,z:8})),images=new Map(pair.map(c=>[c.asset.src,{width:1024,height:1024}]));const actors=buildCreatorActors(pair,images,{state:{},motion:false});assert.equal(actors.length,2);assert.equal(actors.filter(a=>a.interactive).length,1);
});
test('bread mascot direction remapping and constant scale preserve its hop poses',()=>{
 const c=manifest.characters.find(c=>c.id==='takechi-bread-avatar');assert(c);assert(c.asset.layout.frames[1][0].frame[1]>c.asset.layout.frames[2][0].frame[1]);
 const heights=c.asset.layout.frames.flat().map(f=>f.contentHeight);assert(heights.every(h=>h===heights[0]));assert.equal(new Set(c.asset.layout.frames.flat().map(f=>f.frame.join(','))).size,16);
});

test('Aihan crop metadata remains in the same address space as its runtime texture',()=>{
 const woman=manifest.characters.find(c=>c.id==='aihan-avatar-woman'),dog=manifest.characters.find(c=>c.id==='aihan-avatar-shiba');
 assert(Math.abs(woman.asset.layout.frames[0][0].frame[3]-313*1024/1254)<.001);
 assert(Math.abs(dog.asset.layout.frames[0][0].frame[3]-321*1024/1254)<.001);
 for(const c of[woman,dog]){assert.equal(c.asset.width,1024);assert.equal(c.asset.height,1024);assert(c.asset.layout.frames[3][0].frame[1]>700);assert(c.asset.layout.frames[0][3].frame[0]>700);}
});

test('CNA profile approval is exact, SHA-bound and atomic even when global review policy is disabled',()=>{
 const guestIds=['cna-black-bob','cna-star-twintails','cna-orange-glasses'];
 const mutations=[
  m=>delete m.profileGuests,m=>m.profileGuests[0].approved=false,m=>m.profileGuests[0].approvalId='different-approval',
  m=>m.profileGuests[0].referenceSHA256='0'.repeat(64),m=>m.profileGuests[0].profileURL='https://note.com/other',
  m=>m.profileGuests[0].submissionStatus='submitted',m=>m.profileGuests[0].entityIds.pop(),m=>m.profileGuests[0].entityIds.push('invented-pet'),
  m=>m.profileGuests.push({...m.profileGuests[0]}),m=>delete m.referenceReviews.grand_daisy8632,
  m=>m.referenceReviews.grand_daisy8632.reviewed=false,m=>m.referenceReviews.grand_daisy8632.decision='profile-avatar-match',
  m=>m.referenceReviews.grand_daisy8632.avatarReference.imageURL=manifest.referenceReviews.ss_yr.avatarReference.imageURL,
  m=>m.referenceReviews.grand_daisy8632.entityIds.pop(),m=>m.groups.find(g=>g.id==='cna-profile-guests').requiredEntityIds.pop(),
  m=>m.characters.find(c=>c.id===guestIds[0]).ready=false,
  m=>m.characters.find(c=>c.id===guestIds[0]).articleURL='https://note.com/grand_daisy8632/n/n123',
  m=>m.characters.find(c=>c.id===guestIds[0]).profileURL='https://note.com/other',
  m=>m.characters.find(c=>c.id===guestIds[0]).source.referenceSHA256='0'.repeat(64),
  m=>m.characters.find(c=>c.id===guestIds[0]).source.verified=false,
  m=>m.characters.find(c=>c.id===guestIds[0]).source.referenceId='owner-lantern-reference-20261016',
  m=>m.characters.find(c=>c.id===guestIds[0]).asset.src='https://example.com/guest.webp',
  m=>m.characters.find(c=>c.id===guestIds[0]).asset.src=m.characters.find(c=>c.id===guestIds[1]).asset.src,
  m=>delete m.characters.find(c=>c.id===guestIds[0]).participationRole,
 ];
 for(const mutate of mutations)for(const requireReviewed of [true,false]){
  const m=structuredClone(manifest);m.referencePolicy.requireReviewed=requireReviewed;mutate(m);
  const r=compileCharacterRoster(archive,m,2026);assert.equal(r.npcs.some(n=>n.creatorId==='grand_daisy8632'),false,mutate.toString());
  assert.equal(r.submittedCreatorCount,16);assert.deepEqual(r.missingCreators,[]);assert.equal(r.readyCreatorCount,16);
 }
});
test('the CNA grant does not authorize another pending creator or hidden pending entries',()=>{
 const copy=structuredClone(archive),m=structuredClone(manifest);
 const creator=copy.creators.find(c=>c.id==='grand_daisy8632');creator.id='unapproved_pending';creator.profileURL='https://note.com/unapproved_pending';
 for(const e of copy.years[0].entries)if(e.creatorId==='grand_daisy8632')e.creatorId='unapproved_pending';
 m.profileGuests[0].creatorId='unapproved_pending';m.profileGuests[0].profileURL=creator.profileURL;
 for(const c of m.characters)if(c.creatorId==='grand_daisy8632'){c.creatorId=creator.id;c.profileURL=creator.profileURL;}
 const r=compileCharacterRoster(copy,m,2026);assert.equal(r.npcs.some(c=>c.creatorId===creator.id),false);
 const hidden=structuredClone(archive);for(const e of hidden.years[0].entries)if(e.creatorId==='grand_daisy8632')e.visible=false;
 assert.equal(compileCharacterRoster(hidden,manifest,2026).npcs.some(c=>c.creatorId==='grand_daisy8632'),false);
});
test('approved CNA appearances have independent source atlases, grouped loading and no submitted record',()=>{
 const before=JSON.stringify(archive),r=roster(),guests=r.npcs.filter(c=>c.participationRole==='profile-guest');assert.equal(guests.length,3);
 assert.equal(new Set(guests.map(c=>c.asset.src)).size,3);assert(guests.every(c=>c.continuousAnimationReviewed===false));
 for(const c of guests){assert.equal(c.articleURL,null);assert.equal(c.submissionStatus,'pending');assert.equal(c.source.referenceSHA256,manifest.profileGuests[0].referenceSHA256);}
 const images=new Map(guests.slice(0,2).map(c=>[c.asset.src,{width:c.asset.width,height:c.asset.height}]));
 assert.deepEqual(buildCreatorActors(guests,images,{state:{},motion:false}),[]);
 const last=guests[2];images.set(last.asset.src,{width:last.asset.width,height:last.asset.height});assert.equal(buildCreatorActors(guests,images,{state:{},motion:false}).length,3);
 assert.equal(chooseCreatorAssets(guests,{x:0,z:0},{},2).length,0);assert.equal(chooseCreatorAssets(guests,{x:0,z:0},{},3).length,3);
 assert.equal(JSON.stringify(archive),before);
});
