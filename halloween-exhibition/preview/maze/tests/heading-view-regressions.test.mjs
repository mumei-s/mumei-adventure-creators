import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {facingForCamera,movementVector} from '../view-model.js';
import {directionFromMovement} from '../rpg-model.js';
import {characterSprite,characterSpriteForCamera,scaledCharacterLayout} from '../creator-runtime.js';
import {playerPose} from '../rpg-art.js';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const manifest=JSON.parse(fs.readFileSync(new URL('../data/creator-characters.json',import.meta.url),'utf8'));
const owner=manifest.characters.find(character=>character.role==='hero');

test('walking away, toward, and across the rear camera selects the correct atlas row at every yaw',()=>{
  const image={width:1024,height:1024},art={images:{playerAtlas:image},playerLayout:scaledCharacterLayout(owner.asset,image)};
  for(let n=0;n<64;n++){
    const yaw=n*Math.PI/32;
    for(const [forward,right,expected] of [[1,0,'up'],[-1,0,'down'],[0,1,'right'],[0,-1,'left']]){
      const {dx,dz}=movementVector('3d',yaw,forward,right,1),heading=Math.atan2(dx,dz);
      const display=facingForCamera(directionFromMovement(dx,dz),yaw,heading);
      assert.equal(display,expected,`yaw ${yaw}, forward ${forward}, right ${right}`);
      const pose=playerPose(art,display,true,.8);
      assert.equal(pose.row,owner.asset.layout.directions.indexOf(expected));
    }
  }
});

test('camera-facing creator frames change without rewriting world orientation or actor location',()=>{
  const image={width:1024,height:1024},sprite=characterSprite(owner.asset,image,'up',true,.8);
  const actor={...owner,x:8,z:10,facing:'up',yaw:Math.PI,walking:true,phase:.8,sprite},before=JSON.stringify(actor);
  const visible=characterSpriteForCamera(actor,Math.PI);
  assert.deepEqual(visible.frame,characterSprite(owner.asset,image,'down',true,.8).frame);
  assert.equal(JSON.stringify(actor),before);
  assert.equal(characterSpriteForCamera(actor,0),sprite);
  const live={image:{width:256,height:512},poseVersion:3,frame:[0,0,256,512]};
  assert.equal(characterSpriteForCamera({...actor,sprite:live},Math.PI),live,'an articulated canvas is one rendered pose, never recropped as its source atlas');
});

function stepHarness({blocked=false,automatic=false}={}){
  const context=vm.createContext({Math,movementVector,directionFromMovement,
    advanceWithSubsteps:(state,dx)=>blocked?state:{...state,x:state.x+dx},
    moveAroundFurniture(){},move(){},keys:new Set(['w','d']),held:new Set(),padDirection:null,
    view:'2d',state:{x:32,z:48,yaw:0},walkingSpeed:1,facing:'down',walking:false,walkPhase:0,
    viewPending:automatic,viewAbort:{automatic},
  });
  vm.runInContext(app.slice(app.indexOf('function step(dt){'),app.indexOf('function renderExploration(dt){')),context);
  return context;
}

test('actual maze movement faces accepted wall sliding and records a continuous heading',()=>{
  const h=stepHarness({automatic:true});vm.runInContext('step(1/60)',h);
  assert.equal(h.walking,true);assert.equal(h.facing,'right');assert.equal(h.state.z,48);assert(h.state.x>32);
  assert.equal(h.state.heading,Math.PI/2);assert(h.walkPhase>0);assert.equal(h.viewAbort.userMoved,true);
  const stopped=stepHarness({blocked:true});vm.runInContext('step(1/60)',stopped);
  assert.equal(stopped.walking,false);assert.equal(stopped.walkPhase,0);
});

test('turning in place keeps the rear-view owner oriented with the selected look direction',()=>{
  const h=stepHarness({blocked:true});h.view='3d';h.keys=new Set(['arrowleft']);vm.runInContext('step(.1)',h);
  assert(h.state.yaw>0);assert.equal(h.walking,false);assert.equal(h.walkPhase,0);
  assert.equal(facingForCamera(h.facing,h.state.yaw,h.state.heading),'up');
});

test('the reduced-motion change handler stops effects without choosing another camera',()=>{
  const match=app.match(/reducedMotion\.addEventListener\('change',\(\)=>\{([\s\S]*?)\}\);updateMotion\(\);/);assert(match);
  const context=vm.createContext({motion:true,reducedMotion:{matches:true},cameraChanges:0,updates:0,setViewpoint(){this.cameraChanges++;},updateMotion(){context.updates++;}});
  vm.runInContext(match[1],context);assert.equal(context.motion,false);assert.equal(context.updates,1);assert.equal(context.cameraChanges,0);
});

test('mobile viewport resizing preserves held movement until an actual orientation change',()=>{
  const viewport=app.match(/^initViewport\(\{onChange:[^\n]+/m),orientation=app.match(/^window\.addEventListener\('orientationchange',clearInput\);/m);assert(viewport&&orientation);
  const events=new Map(),keys=new Set(['w']),held=new Set(['forward']);
  const context=vm.createContext({events,keys,held,resizes:0,clears:0,
    initViewport({onChange}){context.viewportChange=onChange;},
    resizeGameViewport(){context.resizes++;},
    clearInput(){context.clears++;keys.clear();held.clear();},
    window:{addEventListener(name,callback){events.set(name,callback);}},
  });
  vm.runInContext(viewport[0]+'\n'+orientation[0],context);
  context.viewportChange();context.viewportChange();
  assert.equal(context.resizes,2);assert.equal(context.clears,0);assert(keys.has('w'));assert(held.has('forward'));
  events.get('orientationchange')();assert.equal(context.clears,1);assert.equal(keys.size,0);assert.equal(held.size,0);
});
