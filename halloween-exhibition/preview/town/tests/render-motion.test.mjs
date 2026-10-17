import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {followTownCamera,townCameraTarget,townVisibleBounds,townWorldToScreen,townScreenToWorld} from '../motion.js';
import {townPropSprite} from '../visual-data.js';
import {getTownMap} from '../story-data.js';

test('camera follow has the same response at 30, 60 and 120 Hz and snaps on map changes',()=>{
  const results=[30,60,120].map(hz=>{let camera={x:100,y:50};for(let i=0;i<hz;i++)camera=followTownCamera(camera,{x:700,y:300},1/hz);return camera;});
  for(const camera of results){assert.ok(Math.abs(camera.x-results[0].x)<1e-8);assert.ok(Math.abs(camera.y-results[0].y)<1e-8);}
  assert.deepEqual(followTownCamera(results[0],{x:10,y:20},1/60,{snap:true}),{x:10,y:20});
});

test('tap coordinate transforms remain inverse on phone, tablet and desktop views',()=>{
  const map=getTownMap();for(const [width,height,tile]of[[320,430,52],[800,600,61],[1280,720,70]]){
    const camera=townCameraTarget({x:32.5,z:8.5},map,width,height,tile),scale=tile/64;
    for(const depthScale of[1,.78])for(const point of[{x:32.5,z:8.5},{x:29.5,z:8.5},{x:36.5,z:10.5}]){const at=townWorldToScreen(point,camera,width,height,scale,depthScale),back=townScreenToWorld(at,camera,width,height,scale,depthScale);assert.ok(Math.abs(back.x-point.x)<1e-10);assert.ok(Math.abs(back.z-point.z)<1e-10);}
    const bounds=townVisibleBounds(camera,width,height,scale,map);assert.ok(bounds.left>=0&&bounds.right<map.width);assert.ok(bounds.top>=0&&bounds.bottom<map.height);
  }
});

test('bundled scenery and fictional resident manifests use measured in-bounds transparent cells',async()=>{
  for(const file of['props-manifest.json','residents-manifest.json']){
    const manifest=JSON.parse(await fs.readFile(new URL('../assets/'+file,import.meta.url),'utf8'));
    assert.ok(Object.keys(manifest.sprites).length>=10);
    for(const sprite of Object.values(manifest.sprites)){
      const[x,y,w,h]=sprite.frame;assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=manifest.width&&y+h<=manifest.height);
      assert.ok(sprite.anchorY>.8&&sprite.anchorY<=1);assert.ok(sprite.contentHeight>0&&sprite.contentHeight<=h);
    }
    if(file==='props-manifest.json'){
      const sprite=townPropSprite({width:manifest.width,height:manifest.height},'house',manifest.sprites);
      assert.equal(sprite.contentWidth,manifest.sprites.house.bounds[2]);
      assert.equal(sprite.anchorY,manifest.sprites.house.anchorY);
    }
  }
});
