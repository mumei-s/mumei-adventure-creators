import test from 'node:test';
import assert from 'node:assert/strict';
import {renderOverlordBattle2D,overlordBattleSwordShape,overlordBattleSwordFlightShape} from '../overlord-battle-2d.js';
import {newBattle,battleTurn} from '../encounter-model.js';
import {overlordActionDuration} from '../overlord-battle-director.js';
import {OVERLORD_ART_PARTS} from '../overlord-art-rig.js';

function surface(width=390,height=330){
 const calls=[],draws=[],stack=[];let matrix=[1,0,0,1,0,0];
 const multiply=([a,b,c,d,e,f])=>{const [ma,mb,mc,md,me,mf]=matrix;matrix=[ma*a+mc*b,mb*a+md*b,ma*c+mc*d,mb*c+md*d,ma*e+mc*f+me,mb*e+md*f+mf];};
 const target={globalAlpha:1,
  save(){stack.push({matrix:[...matrix],alpha:this.globalAlpha});calls.push(['save']);},
  restore(){const next=stack.pop();if(next){matrix=next.matrix;this.globalAlpha=next.alpha;}calls.push(['restore']);},
  setTransform(...values){assert(values.every(Number.isFinite));matrix=[...values];calls.push(['setTransform',...values]);},
  translate(x,y){multiply([1,0,0,1,x,y]);calls.push(['translate',x,y]);},
  scale(x,y){multiply([x,0,0,y,0,0]);calls.push(['scale',x,y]);},
  rotate(a){assert(Number.isFinite(a));multiply([Math.cos(a),Math.sin(a),-Math.sin(a),Math.cos(a),0,0]);calls.push(['rotate',a]);},
  drawImage(image,...args){const [x,y,w,h]=args.length===8?args.slice(4):args,[a,b,c,d,e,f]=matrix;
   const corners=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]].map(([u,v])=>[a*u+c*v+e,b*u+d*v+f]),xs=corners.map(p=>p[0]),ys=corners.map(p=>p[1]);
   draws.push({image,args,matrix:[...matrix],corners,left:Math.min(...xs),top:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)});calls.push(['drawImage',image.id,...args]);},
  createLinearGradient(...args){const g={args,stops:[],addColorStop(p,c){this.stops.push([p,c]);}};calls.push(['linear',args,g.stops]);return g;},createRadialGradient(...args){const g={args,stops:[],addColorStop(p,c){this.stops.push([p,c]);}};calls.push(['radial',args,g.stops]);return g;}};
 for(const name of ['beginPath','moveTo','lineTo','closePath','fill','stroke','ellipse','arc','bezierCurveTo','quadraticCurveTo','fillRect','clearRect','strokeRect','fillText'])target[name]=(...args)=>calls.push([name,...args]);
 const c=new Proxy(target,{set(obj,key,value){obj[key]=value;if(['globalAlpha','fillStyle','strokeStyle','lineWidth','shadowBlur','shadowColor'].includes(key))calls.push(['property',key,value]);return true;}});
 return {canvas:{clientWidth:width,clientHeight:height,width,height,getContext:()=>c},calls,draws};
}
const queen={id:'articulated-queen-atlas',width:1254,height:1254},portrait={id:'roster-portrait-only',width:1024,height:1536},player={id:'existing-owner-atlas',width:1024,height:1024};
const art={images:{overlordArtAtlas:queen,nameless_overlord:portrait,playerAtlas:player}};
const queenDraws=s=>s.draws.filter(draw=>draw.image===queen);
function partDraw(s,name){const expected=OVERLORD_ART_PARTS[name].source.map(v=>v*queen.width);return queenDraws(s).find(draw=>draw.args.slice(0,4).every((v,i)=>Math.abs(v-expected[i])<.001));}
const rotation=draw=>Math.atan2(draw.matrix[1],draw.matrix[0]);
function bounds(draws){const left=Math.min(...draws.map(d=>d.left)),top=Math.min(...draws.map(d=>d.top)),right=Math.max(...draws.map(d=>d.left+d.width)),bottom=Math.max(...draws.map(d=>d.top+d.height));return {left,top,width:right-left,height:bottom-top};}

test('fallback draws an articulated queen and existing player art inside responsive frames',()=>{
 for(const [w,h] of[[390,330],[844,220],[280,420],[180,130]]){
  const s=surface(w,h),layout=renderOverlordBattle2D({canvas:s.canvas,art,battle:newBattle('nameless_overlord'),motion:false});
  assert.equal(layout.loading,false);const parts=queenDraws(s),q=bounds(parts),hero=s.draws.find(x=>x.image===player);assert.equal(parts.length,16);assert(hero);assert(!s.draws.some(draw=>draw.image===portrait),'the roster portrait cannot replace the body atlas');
  assert(q.height>=h*.5&&q.height<=h*.9);assert(hero.height<=h*.36);assert(q.height>hero.height*1.5);
  for(const draw of [q,hero]){assert(draw.left>=0);assert(draw.top>=0);assert(draw.left+draw.width<=w+.001);assert(draw.top+draw.height<=h+.001);}
  assert(s.calls.filter(x=>x[0]==='beginPath').length<100,'background and effects have a bounded drawing budget');
  assert(!s.calls.some(x=>x[0]==='fillText'&&String(x[1]).includes('♛')));
 }
});

test('reduced motion produces the same frame across time, including a guarded special turn',()=>{
 const battle=battleTurn({...newBattle('nameless_overlord'),turn:1},'guard'),effect={type:'guard',started:0,damage:0,retaliation:0,blocked:5,counterSpecial:true};
 const first=surface(),last=surface();
 renderOverlordBattle2D({canvas:first.canvas,art,battle,effect,time:.2,motion:false});renderOverlordBattle2D({canvas:last.canvas,art,battle,effect,time:200,motion:false});
 assert.deepEqual(JSON.parse(JSON.stringify(first.calls)),JSON.parse(JSON.stringify(last.calls)));assert.equal(queenDraws(first).length,16);
});

test('five timed cuts belong only to a resolved special counter, never a peaceful bow',()=>{
 const battle=newBattle('nameless_overlord'),effect={type:'guard',started:0,damage:0,retaliation:0,blocked:5,counterSpecial:true},active=surface(),quiet=surface();
 renderOverlordBattle2D({canvas:active.canvas,art,battle,effect,time:2.23,motion:true});renderOverlordBattle2D({canvas:quiet.canvas,art,battle,effect:{...effect,blocked:0},time:2.23,motion:true});
 assert.equal(active.calls.filter(x=>x[0]==='quadraticCurveTo').length,5);assert.equal(quiet.calls.filter(x=>x[0]==='quadraticCurveTo').length,0);
 assert(active.calls.filter(x=>x[0]==='beginPath').length<180);
});

test('an absent joint atlas gives a loading state and renders the character as soon as it arrives',()=>{
 const s=surface(),library={images:{playerAtlas:player,nameless_overlord:portrait}},battle=newBattle('nameless_overlord');
 const loading=renderOverlordBattle2D({canvas:s.canvas,art:library,battle,motion:false});assert.equal(loading.loading,true);assert(s.calls.some(x=>x[0]==='fillText'&&x[1].includes('準備')));
 assert(!s.draws.some(draw=>draw.image===portrait),'a complete portrait is not a valid joint atlas');library.images.overlordArtAtlas=queen;
 const ready=renderOverlordBattle2D({canvas:s.canvas,art:library,battle,motion:false});assert.equal(ready.loading,false);assert.equal(queenDraws(s).length,16);
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
 for(const s of [idle,charge,flow,settled])assert.equal(queenDraws(s).length,16,'the same articulated body remains present through every background phase');
});

test('casting and taking a hit move separate body joints in actual fallback drawing commands',()=>{
 const battle=newBattle('nameless_overlord'),idle=surface(),strike=surface(),special=surface(),hit=surface();
 renderOverlordBattle2D({canvas:idle.canvas,art,battle,time:4,motion:true});
 renderOverlordBattle2D({canvas:strike.canvas,art,battle,effect:{type:'guard',started:10,blocked:1},time:10.88,motion:true});
 renderOverlordBattle2D({canvas:special.canvas,art,battle,effect:{type:'guard',started:10,blocked:5,counterSpecial:true},time:11.94,motion:true});
 renderOverlordBattle2D({canvas:hit.canvas,art,battle,effect:{type:'shine',started:10,damage:4,retaliation:1},time:10.67,motion:true});
 const jointAngle=(s,child,parent)=>rotation(partDraw(s,child))-rotation(partDraw(s,parent));
 assert(Math.abs(jointAngle(strike,'forearmR','upperArmR')-jointAngle(idle,'forearmR','upperArmR'))>.4,'an ordinary cast bends the elbow independently of shoulder and camera');
 for(const side of ['L','R'])assert(Math.abs(jointAngle(special,'upperArm'+side,'torso')-jointAngle(idle,'upperArm'+side,'torso'))>1,'a special raises both arms rather than sliding the complete character');
 assert(Math.abs(jointAngle(hit,'head','torso')-jointAngle(idle,'head','torso'))>.04,'a hit recoils the torso while the head counterbalances');
 assert(Math.abs(jointAngle(strike,'shinR','thighR')-jointAngle(idle,'shinR','thighR'))>.1,'a casting step changes the supporting knee');
 for(const s of [idle,strike,special,hit]){assert.equal(queenDraws(s).length,16);assert(s.draws.every(draw=>draw.corners.flat().every(Number.isFinite)));}
});

test('the complete articulated body stays inside phone and landscape viewports through its actions',()=>{
 const battle=newBattle('nameless_overlord'),ordinary={type:'guard',started:10,blocked:1},special={type:'guard',started:10,blocked:5,counterSpecial:true},hit={type:'shine',started:10,damage:4,retaliation:1};
 const frames=[{label:'idle',time:4},...[.5,.7,.9,1.1,1.3].map(age=>({label:'attack '+age,effect:ordinary,time:10+age})),...[1.4,1.6,1.8,2,2.2,2.4,2.6,2.8].map(age=>({label:'special '+age,effect:special,time:10+age})),...[.54,.6,.67,.74,.8].map(age=>({label:'hit '+age,effect:hit,time:10+age}))];
 for(const [w,h]of[[390,518],[844,220],[280,420]])for(const frame of frames){
  const s=surface(w,h);renderOverlordBattle2D({canvas:s.canvas,art,battle,...frame,motion:true});const parts=queenDraws(s);assert.equal(parts.length,16);
  for(const draw of parts)for(const [x,y]of draw.corners){assert(x>=-.001&&x<=w+.001,`${frame.label} body clipped horizontally at ${w}×${h}: ${x}`);assert(y>=-.001&&y<=h+.001,`${frame.label} body clipped vertically at ${w}×${h}: ${y}`);}
 }
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
