import test from 'node:test';
import assert from 'node:assert/strict';
import {initialTownState} from '../town-model.js';
import {TOWN_SAVE_KEY,TOWN_SAVE_BACKUP_KEY,createTownStore,exportTownState,importTownState} from '../save-model.js';
function memory(){const data=new Map([['original-palace','leave-me']]);return {data,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};}
test('save roundtrip uses an isolated namespace and restore never touches original palace data',()=>{
  const storage=memory(),store=createTownStore(storage),state=initialTownState();state.coins=41;
  assert.equal(store.load().empty,true);assert.equal(store.save(state).ok,true);assert.equal(store.load().state.coins,41);assert.equal(storage.data.get('original-palace'),'leave-me');
  store.clear();assert.equal(storage.data.has(TOWN_SAVE_KEY),false);assert.equal(storage.data.get('original-palace'),'leave-me');
});
test('corrupt and unsupported saves are protected from automatic overwriting until explicit replacement',()=>{
  for(const raw of ['{broken',JSON.stringify({version:99,state:{}}),'x'.repeat(100001)]){
    const storage=memory();storage.setItem(TOWN_SAVE_KEY,raw);const store=createTownStore(storage);
    assert.equal(store.load().ok,false);assert.equal(store.save(initialTownState()).code,'protected');assert.equal(store.readRaw(),raw);
    assert.equal(store.replace(initialTownState()).ok,true);assert.equal(storage.data.get(TOWN_SAVE_BACKUP_KEY),raw);assert.equal(store.load().ok,true);
  }
});
test('quota and denied storage preserve previous data and return an actionable failed save',()=>{
  const storage=memory(),old=exportTownState(initialTownState());storage.setItem(TOWN_SAVE_KEY,old);
  storage.setItem=()=>{throw Object.assign(new Error('full'),{name:'QuotaExceededError'});};const store=createTownStore(storage);
  assert.equal(store.save(initialTownState()).code,'quota');assert.equal(storage.getItem(TOWN_SAVE_KEY),old);
  const denied=createTownStore({getItem(){throw new Error('denied');},setItem(){throw new Error('denied');},removeItem(){throw new Error('denied');}});
  assert.equal(denied.load().ok,false);assert.equal(denied.save(initialTownState()).ok,false);assert.equal(denied.clear().ok,false);
});
test('import rejects invalid envelopes and the explicit clear permits a fresh save',()=>{
  assert.equal(importTownState(exportTownState(initialTownState())).ok,true);assert.equal(importTownState('{}').ok,false);assert.equal(importTownState('{').ok,false);
  const storage=memory();storage.setItem(TOWN_SAVE_KEY,'bad');const store=createTownStore(storage);store.load();assert.equal(store.clear().ok,true);assert.equal(store.save(initialTownState()).ok,true);
});
test('a failed read cannot overwrite an unknown old save when storage becomes writable later',()=>{
  const storage=memory(),raw=exportTownState({...initialTownState(),coins:73});storage.setItem(TOWN_SAVE_KEY,raw);
  const get=storage.getItem;let fail=true;storage.getItem=key=>{if(fail)throw Error('read temporarily denied');return get(key);};
  const store=createTownStore(storage);assert.equal(store.load().ok,false);fail=false;assert.equal(store.save(initialTownState()).code,'protected');assert.equal(storage.getItem(TOWN_SAVE_KEY),raw);
  assert.equal(store.load().state.coins,73);assert.equal(store.save({...initialTownState(),coins:74}).ok,true);
});
test('structurally malformed records are rejected rather than silently converted into a new journey',()=>{
  for(const field of ['flags','inventory','position'])for(const value of [true,2,'wrong',[]]){
    const state={...initialTownState(),[field]:value};assert.equal(importTownState(JSON.stringify({version:1,state})).ok,false,`${field}/${JSON.stringify(value)}`);
  }
});
