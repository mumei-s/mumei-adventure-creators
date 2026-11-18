import { bindDirectionPad, protectGameSurface } from '../maze/game-input.js?v=district-1';
import { readPadMode } from '../control-preferences.js';

export const moveVector = {
  forward:[0,-1], 'forward-right':[1,-1], right:[1,0], 'back-right':[1,1],
  back:[0,1], 'back-left':[-1,1], left:[-1,0], 'forward-left':[-1,-1],
};
const keys = {
  arrowup:'forward', w:'forward', arrowdown:'back', s:'back',
  arrowleft:'left', a:'left', arrowright:'right', d:'right',
};
const padButtons = [['forward','北','↑'],['left','西','←'],['right','東','→'],['back','南','↓']];

export function makeWalkPad() {
  const pad = document.createElement('div');
  pad.className = 'direction-pad walk-pad';
  pad.setAttribute('role','group');
  pad.setAttribute('aria-label','方向パッド。押したまま指を動かすと歩く向きが変わります');
  const nub = document.createElement('span');
  nub.className = 'pad-nub';
  nub.setAttribute('aria-hidden','true');
  pad.append(nub);
  for (const [direction,label,arrow] of padButtons) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.move = direction;
    button.setAttribute('aria-label',label+'へ歩く');
    button.textContent = arrow;
    pad.append(button);
  }
  return pad;
}

const protectedSurfaces=new WeakSet();

export function bindWalking(root,pad,{change,step,signal,blocked=()=>false}={}) {
  const pressed = new Map();
  let held = null, touchedAt=0;
  const update = () => {
    const directions = [...pressed.values()].map(entry=>entry.direction);
    if(held) directions.push(held);
    const vector = directions.reduce(([x,y],name)=>[x+moveVector[name][0],y+moveVector[name][1]],[0,0]);
    const length = Math.hypot(...vector);
    change(length ? vector.map(value=>value/length) : null);
  };
  const directionPad = bindDirectionPad(pad, {
    blocked, diagonal:true, mode:()=>document.body.dataset.padMode??readPadMode(),
    onChange(value){held=value;update();},
  });
  pad.addEventListener('pointerdown',()=>{touchedAt=performance.now();},{capture:true,signal});
  pad.addEventListener('pointerup',()=>{
    const tapped=held;
    if(tapped&&!blocked()&&performance.now()-touchedAt<125) queueMicrotask(()=>{if(!signal?.aborted&&!blocked())step(moveVector[tapped]);});
  },{capture:true,signal});
  if(!protectedSurfaces.has(root)){protectGameSurface(root);protectedSurfaces.add(root);}
  const release = () => {pressed.clear();directionPad.reset();};
  root.addEventListener('keydown', event => {
    const direction = keys[event.key.toLowerCase()];
    if (!direction || blocked() || event.target.closest('input,select,textarea,[contenteditable]')) return;
    event.preventDefault();
    if(!pressed.has(event.key.toLowerCase())) pressed.set(event.key.toLowerCase(),{direction,started:performance.now()});
    update();
  }, {signal});
  root.addEventListener('keyup', event => {
    const key=event.key.toLowerCase(), entry=pressed.get(key);
    if(!pressed.delete(key)) return;
    update();
    if(!held&&!pressed.size&&!blocked()&&performance.now()-entry.started<125) step(moveVector[entry.direction]);
  }, {signal});
  root.addEventListener('focusout', event => {
    if (!root.contains(event.relatedTarget)) release();
  }, {signal});
  window.addEventListener('blur',release,{signal});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)release();},{signal});
  for (const button of pad.querySelectorAll('[data-move]')) {
    button.addEventListener('click', event => {
      if (event.detail===0 && !blocked()) step(moveVector[button.dataset.move]);
    }, {signal});
  }
  signal?.addEventListener('abort',()=>directionPad.destroy(),{once:true});
  return {reset:release};
}
