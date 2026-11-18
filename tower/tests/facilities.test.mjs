import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';

const source=await readFile(new URL('../supabase/functions/creator-tower/index.ts',import.meta.url),'utf8');
const require=createRequire(new URL('../../halloween/package.json',import.meta.url));
const {transformSync}=require('esbuild');
const compiled=transformSync(source,{loader:'ts',target:'es2022'}).code;
const image=(await readFile(new URL('../assets/resident.webp',import.meta.url))).toString('base64');
const id='12345678-1234-1234-1234-123456789012',other='12345678-1234-1234-1234-123456789013',key='a'.repeat(64);
const hashed=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key))).toString('hex');
function fixture(){
 let room={id,slot:13,noteId:'creator_one',version:1,profile:{name:'Creator',articles:[]},
   design:{title:'My world',theme:'story',light:'natural',avatarMode:'custom',avatarName:'Creator',pin:'',
     world:{seed:1,hue:23,accent:45,lightness:50,view:3,layout:2,character:true,atlas:true,artwork:'b'.repeat(24)},interiorB64:image,interiorMime:'image/webp'}};
 let handler;
 const clone=value=>structuredClone(value);
 const fetch=async(url,options)=>{
   const {command,input}=JSON.parse(options.body);
   if(command==='limit')return Response.json({allowed:true});
   if(command==='owner')return Response.json(input.id===id&&input.hash===hashed?clone(room):{error:'owner_required'});
   if(command==='room')return Response.json(input.id===id?clone(room):{error:'missing'});
   if(command==='save'){
     if(input.id!==id||input.hash!==hashed)return Response.json({error:'owner_required'});
     if(input.version!==room.version)return Response.json({error:'conflict'});
     room={...room,design:clone(input.design),version:room.version+1};return Response.json(clone(room));
   }
   throw Error('Unexpected RPC '+command);
 };
 const api=new Function('Deno','fetch',compiled+'\nreturn {mutate,roomResponse};')({env:{get:n=>n==='SUPABASE_URL'?'https://test.supabase.co':'test-service'},serve:fn=>{handler=fn;}},fetch);
 const request=(body,token=key)=>new Request('https://test.supabase.co/functions/v1/creator-tower',{method:'POST',headers:{'Content-Type':'application/json',...(token?{'X-Tower-Key':token}:{})},body:JSON.stringify({id,...body})});
 return {api,request,handler,room:()=>clone(room)};
}

test('vehicle registration requires the room key, a current version and a supported space',async()=>{
 const f=fixture();
 const body={action:'park',space:'garage',version:1,imageB64:image};
 for(const [change,token,error] of [[{},null,'owner_required'],[{},'b'.repeat(64),'owner_required'],[{id:other},key,'owner_required'],[{version:7},key,'conflict'],[{space:'someone-elses-room'},key,'invalid']]){
   await assert.rejects(f.api.mutate(f.request({...body,...change},token)),e=>e.code===error);
 }
 assert.equal(f.room().version,1);
});

test('all four vehicle spaces persist independently and carry the correct room address',async()=>{
 const f=fixture();
 for(const space of ['garage','parkingTower','bicycle','motorcycle'])await f.api.mutate(f.request({action:'park',space,version:f.room().version,imageB64:image,title:'愛車'}));
 const saved=f.room();assert.equal(saved.slot,13);
 assert.deepEqual(Object.keys(saved.design.transport),['garage','parkingTower','bicycle','motorcycle']);
 assert.deepEqual(Object.values(saved.design.transport).map(v=>v.kind),['car','car','bicycle','motorcycle']);
 assert.equal(saved.design.transport.garage.base64,image);
 await f.api.mutate(f.request({action:'park',space:'garage',version:saved.version,clear:true}));
 assert.equal(f.room().design.transport.garage,undefined);
 assert.ok(f.room().design.transport.bicycle);
});

test('renovating a room retains vehicles, engineer membership, walking format and interior',async()=>{
 const f=fixture();
 await f.api.mutate(f.request({action:'park',space:'garage',version:1,imageB64:image}));
 await f.api.mutate(f.request({action:'engineer',version:2,join:true}));
 const before=f.room();
 await f.api.mutate(f.request({action:'save',version:before.version,design:{...before.design,title:'New title'}}));
 const after=f.room();
 assert.equal(after.design.title,'New title');
 assert.deepEqual(after.design.transport,before.design.transport);
 assert.equal(after.design.engineer,true);
 assert.equal(after.design.interiorB64,before.design.interiorB64);
 assert.equal(after.design.world.atlas,true);
 assert.equal(after.design.world.artwork,before.design.world.artwork);
});

test('public room responses exclude interior and vehicle payloads without changing stored data',async()=>{
 const f=fixture();await f.api.mutate(f.request({action:'park',space:'garage',version:1,imageB64:image}));
 const stored=f.room(),publicRoom=f.api.roomResponse(stored);
 assert.equal(publicRoom.design.interiorB64,undefined);
 assert.equal(publicRoom.design.transport.garage.base64,undefined);
 assert.equal(publicRoom.design.transport.garage.mime,undefined);
 assert.match(publicRoom.design.transport.garage.version,/^[a-f0-9]{24}$/);
 assert.equal(f.room().design.transport.garage.base64,image);
});

test('vehicle image endpoint checks both space and content version',async()=>{
 const f=fixture();await f.api.mutate(f.request({action:'park',space:'garage',version:1,imageB64:image}));
 const version=f.room().design.transport.garage.version;
 const get=async(space,v)=>f.handler(new Request(`https://test.supabase.co/functions/v1/creator-tower?view=vehicle&id=${id}&space=${space}&v=${v}`));
 const ok=await get('garage',version);assert.equal(ok.status,200);assert.equal(ok.headers.get('content-type'),'image/webp');
 assert.equal(Buffer.from(await ok.arrayBuffer()).toString('base64'),image);
 assert.equal((await get('garage','c'.repeat(24))).status,404);
 assert.equal((await get('bicycle',version)).status,404);
 assert.equal((await get('other',version)).status,400);
});

test('engineering membership is reversible and never changes ownership credentials',async()=>{
 const f=fixture();const before=f.room();
 await f.api.mutate(f.request({action:'engineer',version:1,join:true}));
 assert.equal(f.room().design.engineer,true);assert.equal(f.room().id,before.id);
 await f.api.mutate(f.request({action:'engineer',version:2,join:false}));
 assert.equal(f.room().design.engineer,false);
 await assert.rejects(f.api.mutate(f.request({action:'engineer',version:3,join:true},'f'.repeat(64))),e=>e.code==='owner_required');
});

test('manager enrolment and withdrawal are owner-only, versioned and independent of artwork and other roles', async () => {
  const f = fixture();
  const post = async (body, token) => f.handler(f.request(body, token));
  const join = { action: 'manager', join: true, version: 1 };
  for (const [body, token, status, error] of [
    [join, null, 403, 'owner_required'],
    [{ ...join, id: other }, key, 403, 'owner_required'],
    [{ ...join, version: 2 }, key, 409, 'conflict'],
    [{ ...join, join: 'true' }, key, 400, 'invalid'],
  ]) {
    const response = await post(body, token);
    assert.equal(response.status, status);
    assert.equal((await response.json()).error, error);
  }
  const before = f.room();
  assert.equal(before.version, 1);
  const response = await post(join);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).design.manager, true);
  const member = f.room();
  assert.deepEqual(member, { ...before, version: 2, design: { ...before.design, manager: true } });

  await post({ action: 'park', space: 'garage', imageB64: image, version: 2 });
  await post({ action: 'engineer', join: true, version: 3 });
  const occupied = f.room();
  assert.equal(occupied.design.manager, true);
  assert.equal(occupied.design.engineer, true);

  const remodel = await post({ action: 'save', version: 4, design: { ...occupied.design, manager: false, title: 'New room' } });
  assert.equal(remodel.status, 200);
  assert.equal(f.room().design.manager, true);
  assert.deepEqual(f.room().design.world, occupied.design.world);
  assert.equal(f.room().design.interiorB64, occupied.design.interiorB64);
  assert.deepEqual(f.room().design.transport, occupied.design.transport);

  const stale = await post({ action: 'manager', join: false, version: 4 });
  assert.equal(stale.status, 409);
  assert.equal(f.room().design.manager, true);
  const current = f.room();
  const withdrawn = await post({ action: 'manager', join: false, version: current.version });
  assert.equal(withdrawn.status, 200);
  assert.deepEqual(f.room(), {
    ...current, version: current.version + 1, design: { ...current.design, manager: false },
  });
});

test('legacy room data remains opt-in and renovation cannot set manager membership', async () => {
  const f = fixture();
  const original = f.room();
  const remodel = await f.handler(f.request({ action: 'save', version: 1, design: { ...original.design, manager: true } }));
  assert.equal(remodel.status, 200);
  assert.equal(Object.hasOwn(f.room().design, 'manager'), false);
});
