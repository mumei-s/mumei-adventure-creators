import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {swipeStep,ringWindow,ringPosition} from '../ring-motion.js?v=27.0.0';
import {wrappedPage} from '../compatibility.js?v=27.0.0';

// Exercise the actual event handlers, including the old excluded button targets.
const source=fs.readFileSync(new URL('../picker.js',import.meta.url),'utf8');
const from=source.indexOf(' let swipe=null'),to=source.indexOf(" window.addEventListener('storage'",from);
const listeners={},classList={add(){},remove(){}},style={setProperty(){}};
const stage={classList,getBoundingClientRect:()=>({top:0,left:0,width:600,height:500})};
let captures=0,now=0,paintedPage=0;
const surface={addEventListener:(name,fn)=>listeners[name]=fn,hasPointerCapture:()=>captures>0,setPointerCapture:()=>captures++,releasePointerCapture:()=>captures=0,querySelector:()=>({classList,style,offsetWidth:600})};
const context=vm.createContext({$:id=>id==='picker'?surface:stage,window:{addEventListener(){}},performance:{now:()=>now},setTimeout:()=>0,clearTimeout(){},innerWidth:400,Math,ringOffset:0,page:0,question:{},comparing:false,view:'ring',currentRingItems:['A','B','C','D','E','F'],records:()=>Array(18),pageSize:()=>18,wrappedPage,swipeStep,ringWindow,ringPosition,positionRing(){},focusRecord(){},render:()=>paintedPage=context.page});
vm.runInContext(source.slice(from,to),context);
const target=kind=>({closest:selector=>selector.split(',').some(s=>s.trim()===kind)?{}:null});
function dispatch(name,kind,x,y,extra={}){const event={target:target(kind),pointerId:1,isPrimary:true,clientX:x,clientY:y,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;},...extra};listeners[name](event);return event;}
for(const kind of ['#ring-focus','.ring-pick','.ring-tools','img','b']){
 context.page=0;now+=1000;
 dispatch('pointerdown',kind,300,250);dispatch('pointermove',kind,400,255);dispatch('pointerup',kind,400,255);
 assert.equal(paintedPage,1,kind+' must permit central horizontal paging');
 const click=dispatch('click',kind,400,255);assert.ok(click.prevented&&click.stopped,'Dragging must not select the centered card');
 now+=1000;dispatch('pointerdown',kind,300,250);dispatch('pointerup',kind,302,251);
 assert.ok(!dispatch('click',kind,302,251).prevented,'Taps must retain ordinary controls');
 now+=1000;dispatch('pointerdown',kind,300,200);dispatch('pointermove',kind,310,300);dispatch('pointerup',kind,310,300);
 assert.equal(context.page,1,'Vertical scrolling must not turn pages');
}
context.page=0;now+=1000;dispatch('pointerdown','img',300,250);dispatch('pointermove','img',200,252);dispatch('pointerup','img',200,252);assert.equal(context.page,2,'The first page wraps backward with the existing direction');
dispatch('pointerdown','img',300,250);dispatch('pointercancel','img',400,250);dispatch('pointerup','img',400,250);assert.equal(context.page,2);
console.log('PASS central swipe: sample, image, title and central controls all page horizontally; tap controls preserved; vertical scroll, wrap direction and pointer cancellation retained.');
