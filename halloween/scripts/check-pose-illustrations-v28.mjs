import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {poseItems} from '../poses.js?v=28.4.0';

const added=poseItems.slice(48),hashes=new Set();
const source=n=>fs.readFileSync(new URL('../'+added[n-49].file,import.meta.url),'utf8');
const joints=(svg,part)=>[...svg.matchAll(new RegExp('data-part="'+part+'" data-joints="([^"]+)" data-radii="([^"]+)"','g'))].map(m=>({points:m[1].split(' ').map(p=>p.split(',').map(Number)),radii:m[2].split(',').map(Number)}));
const hands=svg=>[...svg.matchAll(/data-part="hand" data-gesture="[^"]+" transform="translate\(([\d.-]+),([\d.-]+)\)/g)].map(m=>[Number(m[1]),Number(m[2])]);
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const near=(svg,p,tolerance=5)=>hands(svg).some(h=>distance(h,p)<=tolerance);
const floorY=395,shoeSole=12;
for(const item of added){
 const svg=fs.readFileSync(new URL('../'+item.file,import.meta.url),'utf8');
 assert(svg.includes(item.value),'Accessible Japanese action identity must survive');
 assert.match(svg,/data-part="clothed-adult"/);
 for(const part of ['shirt-body','trouser-waist','collar','head'])assert(svg.includes('data-part="'+part+'"'),item.value+' needs a finished '+part);
 assert.equal(joints(svg,'skin-arm').length,2,item.value+' has exactly two arms');
 assert.equal(joints(svg,'trouser-leg').length,2,item.value+' has exactly two legs');
 assert.equal(new Set(hands(svg).map(h=>h.join(','))).size,2,item.value+' has two wrist locations, including prop overlays');
 for(const arm of joints(svg,'skin-arm')){
  assert(arm.radii[0]>=12&&arm.radii[1]>=9&&arm.radii[2]>=5,'Visible limb volume must taper, not become a thin line');
  assert(near(svg,arm.points[2],4),'Each visible hand meets its actual wrist');
 }
 for(const text of [...svg.matchAll(/<text\b[^>]*>(.*?)<\/text>/g)].map(m=>m[1]))assert.match(text,/^[\x20-\x7e]*$/,'Portable captions cannot require an unavailable Japanese font');
 assert.doesNotMatch(svg,/<script|<foreignObject|(?:href|src)=["'](?!#)/i,'Preview must remain standalone native SVG');
 for(const id of [...svg.matchAll(/url\(#([^)]+)\)/g)].map(m=>m[1]))assert(svg.includes('id="'+id+'"'),'Every filter/gradient must resolve internally');
 hashes.add(crypto.createHash('sha256').update(svg).digest('hex'));
}
assert.equal(hashes.size,24,'Every selected movement has its own asset');

// Physical contacts are checked against rendered joint/prop geometry rather
// than only checking the existence of a filename or prompt wording.
const landing=source(62),landingLegs=joints(landing,'trouser-leg');
const grounded=landingLegs.filter(l=>Math.abs(l.points[2][1]+shoeSole-floorY)<=3);
assert.equal(grounded.length,1,'Landing uses one supporting foot; the other must stay folded above the floor');
assert(landingLegs.some(l=>l.points[2][1]+shoeSole<floorY-20),'Rear foot visibly clears the ground');
assert(near(landing,[176,381],1),'One palm reaches the same floor as the supporting foot');
assert.match(landing,/data-gesture="floor-contact"/);
const seiza=source(55),seizaLegs=joints(seiza,'trouser-leg');
assert(seizaLegs.every(l=>Math.abs(l.points[1][1]+l.radii[1]-366)<=2),'Both knees meet the seiza floor');
assert(seiza.includes('M55 366H425'),'Seiza baseline follows its knees and heels');
const thought=source(57),thinkingArm=joints(thought,'skin-arm')[1];
assert(Math.abs(thinkingArm.points[1][1]+thinkingArm.radii[1]-215)<=2,'Thinking elbow rests on the desk top');
const headMatch=thought.match(/data-part="head" data-center="([\d.-]+),([\d.-]+)"/);
assert(distance(thinkingArm.points[2],[Number(headMatch[1])+10,Number(headMatch[2])+25])<5,'The thinking hand supports the chin');
const jumpLegs=joints(source(60),'trouser-leg');
assert(jumpLegs.every(l=>l.points[2][1]+shoeSole<328),'Both jumping feet clear the obstacle top');
const rear=jumpLegs[0].points,u=[rear[1][0]-rear[0][0],rear[1][1]-rear[0][1]],v=[rear[2][0]-rear[1][0],rear[2][1]-rear[1][1]];
assert((u[0]*v[0]+u[1]*v[1])/(Math.hypot(...u)*Math.hypot(...v))<.5,'Rear jumping knee is visibly folded');
assert(near(source(66),[344,178],1),'Lantern hand contacts the top of its handle');
assert(near(source(67),[217,124],1)&&near(source(67),[256,151],1),'Camera has one shutter/grip hand and one supporting hand below the lens');
assert(near(source(65),[239,190],1),'Umbrella hand holds the shaft');
assert(near(source(71),[174,205],1),'Staff hand meets its continuous shaft');
const bow=source(70),bowPath=bow.match(/d="M([\d.]+) ([\d.]+)Q[\d.]+ [\d.]+ ([\d.]+) ([\d.]+)Q[\d.]+ [\d.]+ ([\d.]+) ([\d.]+)" fill="none" stroke="#c4ad85"/);
assert(bowPath,'Bow has a continuous curved limb and an explicit handle');
assert(near(bow,[Number(bowPath[3]),Number(bowPath[4])],5),'Forward hand actually holds the bow limb');
assert(bow.includes('M'+bowPath[1]+' '+bowPath[2]+'L231 153L'+bowPath[5]+' '+bowPath[6]),'Drawn string stays anchored to both bow tips');
console.log('PASS 24 illustrated previews: shaded clothed adult, two articulated arms/legs/hands, portable captions, unique standalone assets; floor, folded knee, chin/desk, lantern, camera, umbrella, staff and bow contacts.');
