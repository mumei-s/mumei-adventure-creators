import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const line=prefix=>app.split('\n').find(value=>value.startsWith(prefix));

test('address-bar viewport changes and window resizing retain held walking input; actual rotation and blur release it',()=>{
 const events={},frames=[],held=new Set(['forward']),record={clears:0,resizes:0,layout:0,invalidates:0};
 const main={dataset:{},getBoundingClientRect:()=>({width:390,height:780})},lantern={setAttribute(){}};
 let viewportChanged,context;
 context=vm.createContext({resizeFrame:null,held,direction:'forward',settings:{lantern:true},motion:()=>true,document:{body:{dataset:{}}},
  $:id=>id==='town-main'?main:lantern,renderer:{invalidate(){record.invalidates++;}},
  layoutPreferences:{refresh(){record.layout++;context.scheduleResize();}},
  clearInput(){record.clears++;held.clear();context.direction=null;},resize(){record.resizes++;},
  requestAnimationFrame(fn){frames.push(fn);return frames.length;},
  window:{addEventListener(name,fn){events[name]=fn;}},reduced:{addEventListener(){}},
  initViewport({onChange}){viewportChanged=onChange;},audio:{stop(){}}
 });
 vm.runInContext([line('function applySettings(){'),line('function scheduleResize(){'),line("window.addEventListener('blur'"),line("window.addEventListener('resize'")].join('\n'),context);
 viewportChanged();events.resize();viewportChanged();events.resize();
 assert.equal(record.clears,0);assert.deepEqual([...held],['forward']);assert.equal(context.direction,'forward');
 assert.equal(frames.length,1,'viewport resize and scroll bursts share one scheduled layout pass');
 frames.shift()();assert.ok(record.resizes>0);assert.equal(record.layout,2);assert.equal(main.dataset.townOrientation,'portrait');
 assert.equal(context.direction,'forward','layout refresh and canvas resize do not stop a held pad');
 events.orientationchange();assert.equal(record.clears,1);assert.equal(held.size,0);assert.equal(context.direction,null);
 assert.equal(frames.length,1);frames.shift()();
 held.add('forward');context.direction='forward';events.blur();assert.equal(record.clears,2);assert.equal(held.size,0);
});
