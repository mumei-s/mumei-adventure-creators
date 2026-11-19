import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { mediaUrl, pendingMediaUrl, publicView, TOWER_API } from '../public-directory.js';

test('only a missed public room falls back to MUUMEI and no owner data travels with it', async t => {
  const id='11111111-bbbb-4242-afaf-123456789012';
  const calls=[];
  t.mock.method(globalThis,'fetch',async url=>{
    calls.push(new URL(url));
    return new URL(url).origin===new URL(TOWER_API).origin ? Response.json({id}) : new Response(null,{status:404});
  });
  await assert.rejects(publicView('list'));
  assert.equal(calls.length,1);
  assert.deepEqual(await publicView('room',{id}),{id});
  assert.equal(calls.length,3);
  assert.deepEqual([...calls[2].searchParams],[['view','room'],['id',id]]);
  for (const kind of ['avatar','interior','garage','motorcycle','parkingTower','bicycle']) {
    const production=mediaUrl(id,kind,1);
    const intake=new URL(pendingMediaUrl(production));
    assert.equal(intake.origin,new URL(TOWER_API).origin);
    assert.equal(intake.searchParams.get('view'),['avatar','interior'].includes(kind)?kind:'vehicle');
    assert.equal(intake.searchParams.get('id'),id);
    assert.equal(pendingMediaUrl(production+'?private=1'),'');
    assert.equal(pendingMediaUrl('https://example.org/'+id+'/avatar-1.img'),'');
  }
});

test('the archive checks the real directory, note articles and existing picture receipt before writing',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'tower-archive-check-'));
  t.after(()=>rm(dir,{recursive:true,force:true}));
  await mkdir(join(dir,'scripts'));await mkdir(join(dir,'tower'));
  await cp(new URL('../../scripts/archive-tower.mjs',import.meta.url),join(dir,'scripts/archive-tower.mjs'));
  await cp(new URL('../quality-assist.js',import.meta.url),join(dir,'tower/quality-assist.js'));
  const pub=join(dir,'tower/published');
  await cp(new URL('../published/',import.meta.url),pub,{recursive:true});
  const audit=()=>spawnSync(process.execPath,['scripts/archive-tower.mjs','local'],{cwd:dir,encoding:'utf8'});
  const initial=audit();assert.equal(initial.status,0,initial.stderr);
  const catalog=JSON.parse(await readFile(join(pub,'list.json')));
  const {id}=catalog.rooms.find(room=>room.avatarVersion);
  const file=join(pub,'rooms',id+'.json');
  const original=await readFile(file,'utf8');
  const room=JSON.parse(original);
  await writeFile(file,JSON.stringify({...room,slot:room.slot+1}));
  assert.match(audit().stderr,/identity disagree/);
  room.profile.articles=[{title:'Another creator',url:'https://note.com/non_resident/n/n12345678'}];
  await writeFile(file,JSON.stringify(room));
  assert.match(audit().stderr,/public note ID/);
  await writeFile(file,original);
  const asset=join(pub,'media',id,'avatar-'+room.avatarVersion+'.img');
  const bytes=await readFile(asset);bytes[bytes.length-16]^=1;await writeFile(asset,bytes);
  assert.match(audit().stderr,/Invalid archived image/);
});
