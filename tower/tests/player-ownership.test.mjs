import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createPlayerSession, residentTraveler, visitor} from '../avatar-travel.js';

const owner={id:'12aaaaaa-abcd-4a00-abcd-700000000001',noteId:'test_walk',key:'a'.repeat(64)};
const room={id:owner.id,noteId:owner.noteId,isOwner:true,avatarVersion:2,
  profile:{name:'私のキャラ'},design:{avatarMode:'custom',world:{atlas:true}}};

test('showing a room or a creator name does not authorize a player',async()=>{
  for(const device of [null,{id:owner.id,noteId:owner.noteId}]){
    let calls=0;
    const player=createPlayerSession(()=>device,async()=>{calls++;return room;});
    assert.equal(await player.load(),null);assert.equal(calls,0);
  }
  for(const response of [null,{...room,isOwner:false},{...room,isOwner:null},{...room,id:'a'.repeat(36)},{...room,noteId:'another_author'}]){
    const player=createPlayerSession(()=>owner,async()=>response);
    assert.equal(await player.load(),null);assert.equal(player.room,null);
  }
  assert.equal(residentTraveler({...room,isOwner:false}),null);
  assert.ok(visitor.source.endsWith('/assets/resident.webp'));
});

test('a confirmed room is shared within its page and never retained after changing owners',async()=>{
  let device=owner,finish,calls=0;
  const player=createPlayerSession(()=>device,()=>{calls++;return new Promise(resolve=>{finish=resolve;});});
  const first=player.load(),second=player.load();await Promise.resolve();
  assert.equal(player.room,null);assert.equal(calls,1);finish(room);
  assert.deepEqual(await first,await second);assert.equal(await player.load(),room);assert.equal(calls,1);
  const actor=residentTraveler(player.room);assert.equal(actor.noteId,owner.noteId);assert.ok(actor.source.endsWith('/avatar-2.img'));
  const refresh=player.load(true);await Promise.resolve();
  device=null;finish(room);assert.equal(await refresh,null);assert.equal(player.room,null);
});
