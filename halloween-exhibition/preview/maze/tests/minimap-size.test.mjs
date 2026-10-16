import test from 'node:test';
import assert from 'node:assert/strict';
import {MINIMAP_SIZE_KEY, MINIMAP_SIZES, normalizeMinimapSize, nextMinimapSize, initMinimapSize} from '../minimap-size.js';
const button=()=>({dataset:{},attributes:{},setAttribute(k,v){this.attributes[k]=v;}});
test('untrusted size inputs normalize without coercing objects or admitting prototypes',()=>{
 for(const value of [null,undefined,'','UNKNOWN','__proto__','constructor','SMALL',' small ',0,84,true,false,{},[],['large'],Symbol('large'),()=>{},new String('large')])assert.equal(normalizeMinimapSize(value),'small');
 for(const value of MINIMAP_SIZES)assert.equal(normalizeMinimapSize(value),value);
 assert(Object.isFrozen(MINIMAP_SIZES));
});
test('cycles through exactly three choices, beginning small',()=>{
 let size=normalizeMinimapSize(null);
 for(const expected of ['medium','large','small','medium','large','small']){size=nextMinimapSize(size);assert.equal(size,expected);}
 assert.equal(nextMinimapSize('unknown'),'medium');
});
test('model sets visual/accessibility labels, persists only own key, and restores exact selection',()=>{
 const values=new Map([['halloween-exhibition:labyrinth:v1','untouched'],['halloween-exhibition:horror-view:v1','2d']]);
 const storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 const b=button(),r={dataset:{}},model=initMinimapSize({button:b,root:r,storage});
 assert.equal(model.getSize(),'small');assert.equal(b.textContent,'地図：小');assert.equal(r.dataset.minimapSize,'small');
 for(const [size,label,next] of [['medium','中','大'],['large','大','小'],['small','小','中']]){
  b.onclick();assert.equal(model.getSize(),size);assert.equal(r.dataset.minimapSize,size);assert.equal(b.dataset.size,size);assert.equal(b.textContent,'地図：'+label);assert.equal(b.attributes['aria-label'],`地図サイズ：${label}。押すと${next}に切り替え`);assert.equal(values.get(MINIMAP_SIZE_KEY),size);
  assert.equal(initMinimapSize({button:button(),root:{dataset:{}},storage}).getSize(),size);
 }
 assert.equal(values.get('halloween-exhibition:labyrinth:v1'),'untouched');assert.equal(values.get('halloween-exhibition:horror-view:v1'),'2d');
});
test('model unknown fallback and denied read/write/absent storage remain interactive',()=>{
 for(const storage of [undefined,null,{}, {getItem(){throw Error('read denied')},setItem(){throw Error('write denied')}}, {getItem(){return 'unrecognized'},setItem(){}}, {getItem(){return 'large'},setItem(){throw Error('quota')}}]){
  const b=button(),r={dataset:{}},model=initMinimapSize({button:b,root:r,storage});
  const start=model.getSize();assert(['small','large'].includes(start));
  assert.doesNotThrow(()=>b.onclick());assert.equal(model.getSize(),nextMinimapSize(start));assert.equal(r.dataset.minimapSize,model.getSize());
 }
});
test('onChange observes rendered choice even when persistence fails',()=>{
 const b=button(),r={dataset:{}},seen=[];
 const model=initMinimapSize({button:b,root:r,storage:{getItem(){return 'large'},setItem(){throw Error('denied')}},onChange:size=>seen.push({size,rendered:r.dataset.minimapSize,label:b.textContent})});
 assert.equal(seen.length,0);b.onclick();assert.deepEqual(seen,[{size:'small',rendered:'small',label:'地図：小'}]);assert.equal(model.getSize(),'small');
});
