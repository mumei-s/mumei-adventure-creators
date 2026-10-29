import test from 'node:test';
import assert from 'node:assert/strict';
import {renderPixelRatio} from '../render-quality.js';

test('dense phone screens get native detail instead of fixed 1.25 or 1.35 downsampling',()=>{
 const ratio=renderPixelRatio(390,844,2.625);
 assert.equal(ratio,2.625);assert(390*844*ratio**2<2400000);
 assert((ratio/1.35)**2>3.7,'more than three times the former maze pixel detail');
 assert.equal(renderPixelRatio(390,430,3),3,'phone battle buffers can use all three screen pixels');
});

test('large dense viewports respect their fill budget without supersampling low-DPR screens',()=>{
 for(const [w,h,dpr,budget]of[[390,844,3,2400000],[768,1024,3,3600000],[1920,1080,3,6000000]]){
  const ratio=renderPixelRatio(w,h,dpr);assert(ratio<=dpr);assert(w*h*ratio**2<=budget+1e-6);
 }
 assert.equal(renderPixelRatio(390,844,1),1);assert.equal(renderPixelRatio(390,844,.75),.75);
 assert.equal(renderPixelRatio(3840,2160,1),1,'native 1x resolution is never made coarser');
});

test('orientation and custom budgets stay finite while invalid measurements cannot allocate huge buffers',()=>{
 assert.equal(renderPixelRatio(844,390,2.625),2.625);
 const limited=renderPixelRatio(390,844,3,{maxPixels:1500000});assert(390*844*limited**2<=1500000+1e-6);
 for(const value of [undefined,NaN,Infinity,0,-1])assert(Number.isFinite(renderPixelRatio(value,value,value)));
});
