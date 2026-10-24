import test from 'node:test';
import assert from 'node:assert/strict';
import {viewpointOptions,cycleViewpoint,migrateViewpoint,readViewpoint,saveViewpoint} from '../viewpoint-presets.js';
for(const page of ['town','maze'])test(page+' preserves all six legacy renderer/distance combinations',()=>{
 const storage=new Map(),adapter={getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)};
 for(const view of ['2d','3d'])for(const distance of ['normal','wide','far']){
  storage.clear();const old={view,distance},migrated=readViewpoint(page,old,adapter);
  assert.equal(migrated.view,view);assert.equal(migrated.distance,distance);
  saveViewpoint(page,migrated.id,adapter);assert.deepEqual(readViewpoint(page,{view:'invalid'},adapter),migrated);
 }
 assert.equal(storage.size,1);
});
test('common names have identical camera/renderer semantics',()=>{
 for(const id of ['eye','overhead','far','overhead-wide'])assert.deepEqual(viewpointOptions('town').find(v=>v.id===id),viewpointOptions('maze').find(v=>v.id===id));
 assert.equal(viewpointOptions('town').filter(v=>!v.detail).length,3);
 assert.equal(viewpointOptions('maze').filter(v=>!v.detail).length,3);
});
test('blocked or malformed storage never blocks choosing a view',()=>{
 const denied={getItem(){throw Error('denied');},setItem(){throw Error('denied');}};
 assert.equal(readViewpoint('maze',{view:'2d',distance:'far'},denied).id,'far');
 assert.equal(saveViewpoint('maze','behind',denied).id,'behind');
 assert.equal(migrateViewpoint('town',{view:'2d',distance:'bad'}).id,'overhead');
});

for(const page of ['town','maze'])test(page+' cycles every viewpoint and wraps in both directions',()=>{
 const options=viewpointOptions(page);
 for(let index=0;index<options.length;index++)for(const direction of [1,-1])assert.deepEqual(cycleViewpoint(page,options[index].id,direction),options[(index+direction+options.length)%options.length]);
});
