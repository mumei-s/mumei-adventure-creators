import test from 'node:test';
import assert from 'node:assert/strict';
import {renderOverlordBattle2D,overlordBattleSwordShape,overlordBattleSwordFlightShape} from '../overlord-battle-2d.js';
import {newBattle,battleTurn} from '../encounter-model.js';
import {overlordActionDuration} from '../overlord-battle-director.js';

function surface(width=390,height=330){
 const calls=[],draws=[],stack=[];let matrix={x:0,y:0,sx:1,sy:1};
 const target={globalAlpha:1,save(){stack.push({...matrix,alpha:this.globalAlpha});calls.push(['save']);},restore(){const next=stack.pop();matrix=next||matrix;this.globalAlpha=next?.alpha??1;calls.push(['restore']);},setTransform(sx,b,c,sy,x,y){matrix={x,y,sx,sy};calls.push(['setTransform',sx,b,c,sy,x,y]);},translate(x,y){matrix.x+=x*matrix.sx;matrix.y+=y*matrix.sy;calls.push(['translate',x,y]);},scale(x,y){matrix.sx*=x;matrix.sy*=y;calls.push(['scale',x,y]);},rotate(a){assert.equal(a,0,'actors remain upright');calls.push(['rotate',a]);},drawImage(image,...args){const [x,y,w,h]=args.length===8?args.slice(4):args;draws.push({image,args,left:matrix.x+x*matrix.sx,top:matrix.y+y*matrix.sy,width:w*matrix.sx,height:h*matrix.sy});calls.push(['drawImage',image.id,...args]);},createLinearGradient(...args){const g={args,stops:[],addColorStop(p,c){this.stops.push([p,c]);}};calls.push(['linear',args,g.stops]);return g;},createRadialGradient(...args){const g={args,stops:[],addColorStop(p,c){this.stops.push([p,c]);}};calls.push(['radial',args,g.stops]);return g;}};
 for(const name of ['beginPath','moveTo','lineTo','closePath','fill','stroke','ellipse','arc','bezierCurveTo','quadraticCurveTo','fillRect','clearRect','strokeRect','fillText'])target[name]=(...args)=>calls.push([name,...args]);
 const c=new Proxy(target,{set(obj,key,value){obj[key]=value;if(['globalAlpha','fillStyle','strokeStyle','lineWidth','shadowBlur','shadowColor'].includes(key))calls.push(['property',key,value]);return true;}});
 return {canvas:{clientWidth:width,clientHeight:height,width,height,getContext:()=>c},calls,draws};
}
const queen={id:'approved-queen-art',width:1024,height:1536},player={id:'existing-owner-atlas',width:1024,height:1024};
const art={images:{nameless_overlord:queen,playerAtlas:player}};

test('fallback uses the approved queen and existing player art with fully bounded responsive frames',()=>{
 for(const [w,h] of[[390,330],[844,220],[280,420],[180,130]]){
  const s=surface(w,h),layout=renderOverlordBattle2D({canvas:s.canvas,art,battle:newBattle('nameless_overlord'),motion:false});
  assert.equal(layout.loading,false);const q=s.draws.find(x=>x.image===queen),hero=s.draws.find(x=>x.image===player);assert(q&&hero);
  assert(q.height>=h*.6&&q.height<=h*.9);assert(hero.height<=h*.36);assert(q.height>hero.height*2);
  for(const draw of [q,hero]){assert(draw.left>=0);assert(draw.top>=0);assert(draw.left+draw.width<=w+.001);assert(draw.top+draw.height<=h+.001);}
  assert(s.calls.filter(x=>x[0]==='beginPath').length<100,'background and effects have a bounded drawing budget');
  assert(!s.calls.some(x=>x[0]==='fillText'&&String(x[1]).includes('♛')));
 }
});

test('reduced motion produces the same frame across time, including a guarded special turn',()=>{
 const battle=battleTurn({...newBattle('nameless_overlord'),turn:1},'guard'),effect={type:'guard',started:0,damage:0,retaliation:0,blocked:5,counterSpecial:true};
 const first=surface(),last=surface();
 renderOverlordBattle2D({canvas:first.canvas,art,battle,effect,time:.2,motion:false});renderOverlordBattle2D({canvas:last.canvas,art,battle,effect,time:200,motion:false});
 assert.deepEqual(JSON.parse(JSON.stringify(first.calls)),JSON.parse(JSON.stringify(last.calls)));assert.equal(first.draws.filter(d=>d.image===queen).length,1);
});

test('five timed cuts belong only to a resolved special counter, never a peaceful bow',()=>{
 const battle=newBattle('nameless_overlord'),effect={type:'guard',started:0,damage:0,retaliation:0,blocked:5,counterSpecial:true},active=surface(),quiet=surface();
 renderOverlordBattle2D({canvas:active.canvas,art,battle,effect,time:2.23,motion:true});renderOverlordBattle2D({canvas:quiet.canvas,art,battle,effect:{...effect,blocked:0},time:2.23,motion:true});
 assert.equal(active.calls.filter(x=>x[0]==='quadraticCurveTo').length,5);assert.equal(quiet.calls.filter(x=>x[0]==='quadraticCurveTo').length,0);
 assert(active.calls.filter(x=>x[0]==='beginPath').length<180);
});

test('an absent illustration gives a loading state and renders real art as soon as it arrives',()=>{
 const s=surface(),library={images:{playerAtlas:player}},battle=newBattle('nameless_overlord');
 const loading=renderOverlordBattle2D({canvas:s.canvas,art:library,battle,motion:false});assert.equal(loading.loading,true);assert(s.calls.some(x=>x[0]==='fillText'&&x[1].includes('準備')));
 library.images.nameless_overlord=queen;const ready=renderOverlordBattle2D({canvas:s.canvas,art:library,battle,motion:false});assert.equal(ready.loading,false);assert(s.draws.some(x=>x.image===queen));
 assert.equal(renderOverlordBattle2D({canvas:{getContext:()=>null},art:library,battle}),false);
});


test('ordinary fallback counters visibly land before the shared UI unlock, then leave no stale cuts',()=>{
 for(const type of ['shine','guard','attack']){
  const battle=battleTurn(newBattle('nameless_overlord'),type),effect={type,started:0,...battle.lastAction,retaliation:type==='guard'?0:1,blocked:type==='guard'?1:0,counterSpecial:false},duration=overlordActionDuration(effect);
  let drewReturnStrike=false;
  for(let time=0;time<duration;time+=.05){const s=surface();renderOverlordBattle2D({canvas:s.canvas,art,battle,effect,time,motion:true});drewReturnStrike ||= s.calls.some(call=>call[0]==='quadraticCurveTo');}
  assert(drewReturnStrike,`${type} must show its return strike before ${duration}s unlock`);
  const settled=surface();renderOverlordBattle2D({canvas:settled.canvas,art,battle,effect,time:duration+.01,motion:true});
  assert.equal(settled.calls.filter(call=>call[0]==='quadraticCurveTo').length,0);
 }
});

test('fallback backdrop has bounded living motion, changes after damage and warms after victory',()=>{
 const battle=newBattle('nameless_overlord'),first=surface(),later=surface(),rage=surface(),victory=surface();
 renderOverlordBattle2D({canvas:first.canvas,art,battle,time:3,motion:true});renderOverlordBattle2D({canvas:later.canvas,art,battle,time:5,motion:true});
 assert.notDeepEqual(first.calls,later.calls,'banners and embers are active while waiting for a command');
 renderOverlordBattle2D({canvas:rage.canvas,art,battle:{...battle,spirit:8},time:5,motion:true});renderOverlordBattle2D({canvas:victory.canvas,art,battle:{...battle,spirit:0,status:'won'},time:5,motion:true});
 const gradientStops=s=>s.calls.filter(call=>call[0]==='linear'||call[0]==='radial').map(call=>call[2]);
 assert.notDeepEqual(gradientStops(later),gradientStops(rage),'the low-health portal changes the room');assert.notDeepEqual(gradientStops(rage),gradientStops(victory),'victory closes the red phase into warm light');
 for(const state of [battle,{...battle,spirit:8},{...battle,spirit:0,status:'won'}])for(let time=0;time<3.3;time+=.11){
  const s=surface(),effect={type:'guard',started:0,blocked:5,counterSpecial:true};renderOverlordBattle2D({canvas:s.canvas,art,battle:state,effect,time,motion:true});
  assert(s.calls.filter(call=>call[0]==='beginPath').length<180,'mobile painting budget stays bounded through five-blade impacts');
  assert(!JSON.stringify(s.calls).includes('NaN'),'paint coordinates and mixed colors stay finite');
 }
});

test('a full-health special opens a flowing astral corridor and returns to the hall after the resolved action',()=>{
 const battle={...newBattle('nameless_overlord'),spirit:26},effect={type:'shine',started:10,damage:4,retaliation:5,counterSpecial:true};
 const idle=surface(),charge=surface(),flow=surface(),settled=surface();
 renderOverlordBattle2D({canvas:idle.canvas,art,battle,time:9,motion:true});
 renderOverlordBattle2D({canvas:charge.canvas,art,battle,effect,time:11.50,motion:true});
 renderOverlordBattle2D({canvas:flow.canvas,art,battle,effect,time:11.56,motion:true});
 renderOverlordBattle2D({canvas:settled.canvas,art,battle,effect,time:13.3,motion:true});
 const streakPath=s=>{
  const end=s.calls.findIndex(call=>call[0]==='property'&&call[1]==='strokeStyle'&&String(call[2]).startsWith('rgba(210,218,255,'));
  if(end<0)return[];
  let begin=end;while(begin>0&&s.calls[begin][0]!=='beginPath')begin--;
  return s.calls.slice(begin,end).filter(call=>call[0]==='moveTo'||call[0]==='lineTo');
 };
 assert.equal(streakPath(idle).length,0,'the corridor does not replace a command-selection room');
 assert.equal(streakPath(charge).length,48,'twenty-four streaks are painted as one bounded path');
 assert.notDeepEqual(streakPath(charge),streakPath(flow),'the light streams actually travel through the corridor');
 assert.equal(streakPath(settled).length,0,'the corridor and speed streaks end with the shared encounter clock');
 assert(charge.calls.some(call=>call[0]==='radial'&&call[2].some(stop=>stop[1]==='#05071200')),'the full-health charge changes the backdrop itself');
 for(const s of [idle,charge,flow,settled])assert.equal(s.draws.filter(draw=>draw.image===queen).length,1,'the original queen remains one upright, unwarped painting');
});

test('impact painting expands rings at the target and reduced motion omits the astral spectacle',()=>{
 const battle={...newBattle('nameless_overlord'),spirit:26},effect={type:'shine',started:10,damage:4,retaliation:5,counterSpecial:true};
 const impact=surface(),quiet=surface();
 renderOverlordBattle2D({canvas:impact.canvas,art,battle,effect,time:12.28,motion:true});
 renderOverlordBattle2D({canvas:quiet.canvas,art,battle,effect,time:12.28,motion:false});
 assert(impact.calls.some(call=>call[0]==='property'&&call[1]==='strokeStyle'&&String(call[2]).startsWith('rgba(255,221,191,')),'the impact has broad shock rings in addition to the travelling cut');
 assert(impact.calls.some(call=>call[0]==='property'&&call[1]==='fillStyle'&&String(call[2]).startsWith('rgba(255,239,221,')),'an impact receives one bounded warm pulse');
 assert(!quiet.calls.some(call=>call[0]==='property'&&['rgba(210,218,255,','rgba(255,221,191,','rgba(255,239,221,'].some(prefix=>String(call[2]).startsWith(prefix))),'reduced motion removes streams, shock movement and impact flashes');
 assert(impact.calls.filter(call=>call[0]==='beginPath').length<180,'the spectacle still fits the existing mobile draw-path budget');
});

test('recognizable swords point their blades at the target while their guards cross the flight axis',()=>{
 for(const target of [[180,90],[30,210],[220,200]]){
  const origin=[110,100],shape=overlordBattleSwordShape(...origin,...target,55),dx=target[0]-origin[0],dy=target[1]-origin[1],length=Math.hypot(dx,dy),axis=[dx/length,dy/length];
  const forward=p=>(p[0]-origin[0])*axis[0]+(p[1]-origin[1])*axis[1];
  assert(forward(shape.tip)>35,'a long pointed blade extends toward the target');
  assert(forward(shape.hilt)<-15,'the dark grip and pommel sit behind the blade');
  const cross=[shape.guard[1][0]-shape.guard[5][0],shape.guard[1][1]-shape.guard[5][1]];
  assert(Math.abs(cross[0]*axis[0]+cross[1]*axis[1])<.0001,'the crossguard is visibly transverse to the flight');
  assert(Math.hypot(...cross)>20,'the gilded guard is readable at phone size');
 }
});

test('five gilded sword grips appear for the special summon and disappear after the attack',()=>{
 const battle={...newBattle('nameless_overlord'),spirit:26},effect={type:'shine',started:10,damage:4,retaliation:5,counterSpecial:true};
 const guards=time=>{const s=surface();renderOverlordBattle2D({canvas:s.canvas,art,battle,effect,time,motion:true});return s.calls.filter(call=>call[0]==='property'&&call[1]==='fillStyle'&&call[2]==='#e6b865').length;};
 assert.equal(guards(11.65),5,'the charge briefly forms five actual guarded swords');
 assert.equal(guards(13.3),0,'no swords hang in the idle scene after the attack');
 const quiet=surface();renderOverlordBattle2D({canvas:quiet.canvas,art,battle,effect,time:11.65,motion:false});
 assert(!quiet.calls.some(call=>call[0]==='property'&&call[1]==='fillStyle'&&call[2]==='#e6b865'));
});

test('the actual sword point follows the timed flight and reaches the hero instead of overshooting',()=>{
 const source=[270,180],target=[74,340];
 for(const progress of [0,.2,.5,.9,1]){
  const shape=overlordBattleSwordFlightShape(...source,...target,progress,55);
  const expected=source.map((v,i)=>v+(target[i]-v)*progress);
  assert(Math.hypot(shape.tip[0]-expected[0],shape.tip[1]-expected[1])<.00001);
 }
});
