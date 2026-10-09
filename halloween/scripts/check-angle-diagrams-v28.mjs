import assert from 'node:assert/strict';
import fs from 'node:fs';
import {angleItems,cameraContract} from '../angles.js?v=28.4.4';
import {angleConstraint} from '../view-constraints.js?v=28.4.4';
import {applyCollection} from '../collection.js?v=28.4.4';
import {initialSelections} from '../modes.js?v=28.4.4';
import {resolveSelections} from '../catalog.js?v=28.4.4';
import {buildDirection} from '../direction.js?v=28.4.4';
import {applyPose} from '../poses.js?v=28.4.4';
import {productionPlan} from '../production-plan.js?v=28.4.4';
import {composePrompt} from '../prompt.js?v=28.4.4';
import {renderChatInput} from '../compiled-production.js?v=28.4.4';

const root=new URL('../',import.meta.url),degrees=r=>r*180/Math.PI;
function attrs(tag){return Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));}
function element(svg,tag,id){const found=svg.match(new RegExp('<'+tag+'\\b[^>]*\\bid="'+id+'"[^>]*>'))?.[0];assert.ok(found,'Missing visible geometry: '+tag+'#'+id);return attrs(found);}
function vector(svg,id){const a=element(svg,'line',id);return {start:[Number(a.x1),Number(a.y1)],end:[Number(a.x2),Number(a.y2)],dx:Number(a.x2)-Number(a.x1),dy:Number(a.y2)-Number(a.y1)};}
function close(actual,expected,name){assert.ok(Math.abs(actual-expected)<1e-5,name+': visible coordinates encode '+actual+'°, expected '+expected+'°');}
function polygon(svg,id){return element(svg,'polygon',id).points.trim().split(/\s+/).map(pair=>pair.split(',').map(Number));}
const results=[],kindCounts={};
for(const [index,item] of angleItems.entries()){
 const svg=fs.readFileSync(new URL(item.file,root),'utf8'),spec=angleConstraint(item.value),kind=attrs(svg.match(/<svg\b[^>]*>/)[0])['data-diagram-kind'];
 assert.match(svg,/<title\b/);assert.match(svg,/<desc\b/);assert.ok(svg.includes(item.value));assert.match(svg,/完成作品|完成投影/);assert.match(svg,/人物.*画風.*見本ではありません/);
 assert.doesNotMatch(svg,/<image\b|data:image\/|M151 72v68|cy="57" r="13"/,'Technical diagram must not contain a finished person or old stick figure');
 kindCounts[kind]=(kindCounts[kind]||0)+1;
 const measured={file:item.file};
 if(spec.axes.pitch!==undefined){
  const v=vector(svg,'optical-axis');assert.ok(Math.hypot(v.dx,v.dy)>100);measured.pitch=degrees(Math.atan2(v.dy,-v.dx));close(measured.pitch,spec.axes.pitch,item.value+' pitch');
  if(Math.abs(spec.axes.pitch)===90)assert.ok(Math.abs(v.dx)<1e-6,'Vertical optical axis must have zero horizontal component');
  const reference=vector(svg,'horizontal-reference');assert.equal(reference.dy,0,'Pitch is measured from a truly horizontal reference');assert.ok(reference.dx<0);
  const transform=svg.match(/class="camera-symbol" transform="translate\(([^)]+)\) rotate\(([^)]+)\)"/)?.[2];assert.ok(transform!==undefined);const a=Number(transform)*Math.PI/180,lens=[-Math.cos(a),-Math.sin(a)],length=Math.hypot(v.dx,v.dy);close(lens[0],v.dx/length,item.value+' lens x');close(lens[1],v.dy/length,item.value+' lens y');
 }
 if(spec.axes.yaw!==undefined){
  const v=vector(svg,'azimuth-axis');measured.yaw=(degrees(Math.atan2(-v.dx,-v.dy))+360)%360;close(measured.yaw,spec.axes.yaw,item.value+' yaw');
  assert.match(svg,/上から|上面図/,'Azimuth must be explained in a top view rather than horizontal displacement in the side diagram');
 }
 if(spec.axes.roll!==undefined){
  const horizon=vector(svg,'screen-horizontal'),top=vector(svg,'frame-top-axis'),frame=polygon(svg,'rotated-frame'),subject=polygon(svg,'subject-shape');
  measured.roll=degrees(Math.atan2(horizon.dy,horizon.dx));close(measured.roll,spec.axes.roll,item.value+' roll');close(degrees(Math.atan2(top.dy,top.dx)),spec.axes.roll,item.value+' frame roll');
  close(degrees(Math.atan2(subject[1][1]-subject[0][1],subject[1][0]-subject[0][0])),spec.axes.roll,item.value+' subject roll');
  close(degrees(Math.atan2(frame[3][1]-frame[0][1],frame[3][0]-frame[0][0])),90+spec.axes.roll,item.value+' frame vertical');
  assert.match(svg,/高さ・方位は未固定/);assert.doesNotMatch(svg,/id="(?:optical-axis|azimuth-axis)"/,'Roll must not quietly impose row-default pitch or yaw');
 }
 if(!Object.keys(spec.axes).length)assert.doesNotMatch(svg,/id="(?:optical-axis|azimuth-axis|screen-horizontal)"/,'Illustrative row angles are not newly fixed camera axes: '+item.value);
 if(spec.kind==='crop'){assert.ok(element(svg,'rect','selected-crop'));assert.ok(element(svg,'rect','detail-frame'));assert.match(svg,/作画見本ではない/);}
 results.push(measured);
}
assert.equal(results.length,36);assert.equal(results.filter(r=>r.pitch!==undefined).length,11);assert.equal(results.filter(r=>r.yaw!==undefined).length,4);assert.equal(results.filter(r=>r.roll!==undefined).length,2);
const low=results.find(r=>r.file==='angle-016.svg');close(low.pitch,-70,'Regression: super low angle visible ray');
// These concrete coordinate checks catch the old unequal x/y scales, 9-unit
// offsets, icon-only rotation, collapsed yaw and identical crop placeholders.
for(const id of ['angle-007.svg','angle-008.svg','angle-009.svg','angle-010.svg','angle-011.svg','angle-013.svg','angle-014.svg','angle-015.svg','angle-016.svg','angle-017.svg'])assert.ok(results.find(r=>r.file===id).pitch!==undefined);
const source=id=>fs.readFileSync(new URL(id,root),'utf8');
const lowHorizon=vector(source('angle-033.svg'),'horizon'),highHorizon=vector(source('angle-034.svg'),'horizon');assert.ok(lowHorizon.start[1]>highHorizon.start[1]);assert.equal(lowHorizon.dy,0);assert.equal(highHorizon.dy,0);
const diagonal=vector(source('angle-035.svg'),'depth-diagonal');assert.ok(diagonal.dx>0&&diagonal.dy<0);assert.doesNotMatch(source('angle-035.svg'),/rotated-frame/,'A diagonal within the scene is not camera roll');
const mirror=source('angle-036.svg'),plane=vector(mirror,'reflection-plane'),original=element(mirror,'rect','original-shape'),reflection=element(mirror,'rect','reflected-shape');assert.equal(plane.dx,0);assert.equal(Number(original.width),Number(reflection.width));assert.equal(Number(original.x)+Number(original.width)/2+Number(reflection.x)+Number(reflection.width)/2,plane.start[0]*2,'Reflect the same subject at equal distance from the mirror');
assert.notEqual(source('angle-021.svg'),source('angle-022.svg'));assert.notEqual(source('angle-028.svg'),source('angle-029.svg'));assert.notEqual(source('angle-029.svg'),source('angle-030.svg'));

// Verify the new 70-degree visible-surface requirements survive the actual
// production, concise generation and full-audit deliveries. No rendered
// model result is inferred from a textual contract or this diagram.
applyCollection('halloween');
const profile={displayName:'角度図検査',activityEnabled:false},random=()=>.34;
let handoffs=0;
for(const angle of ['超ローアングル・70度','急な俯瞰・70度'])for(const costume of ['亡霊騎士','風景を主役にする']){
 const noPerson=costume==='風景を主役にする',values=resolveSelections({...initialSelections(),sceneUnified:true,medium:'艶彩幻想アニメ',theme:'吸血鬼の晩餐会',costume,pose:noPerson?'おまかせ':'低くしゃがむ',mood:noPerson?'毎回大胆に変える':'牙を見せて威嚇',angle,design:'通常の一枚絵',type:'文字を一切入れない',line:'セリフなし'},random),geometry=cameraContract(values,{noPerson}),variant=applyPose(buildDirection([],values.mood,random,'halloween',values),values.pose),plan=productionPlan(profile,values,variant,'halloween',random),prompt=composePrompt({collection:'halloween',profile,creator:'',values,variant:plan.variant,references:[],edition:'ANGLE-DIAGRAM-VERIFY',preparedPlan:plan});
 assert.deepEqual((plan.issues||[]).filter(issue=>issue.severity==='error'),[],'The camera handoff fixture must be an executable person or scenery combination');
 const preciseClause=geometry.instructions.find(instruction=>instruction.includes('70度の光軸では'));assert.ok(preciseClause,angle+' must describe surfaces actually visible through its optical axis');
 if(costume==='風景を主役にする')assert.doesNotMatch(preciseClause,/首|顎|鼻|口|隠れる目|額|頭|肩/,'The non-person 70-degree clause must concern scenery surfaces, without anatomical instructions');
 for(const [label,body] of [['concise generated handoff',prompt],['full audit handoff',renderChatInput(plan)]])assert.ok(body.includes(preciseClause),angle+' / '+costume+' / '+label+' dropped its actual visible-surface camera contract');
 handoffs++;
}
applyCollection('halloween');
console.log(JSON.stringify({result:'PASS visible angle-diagram geometry: all 36 technical diagrams; exact side-view pitch, top-view yaw, whole-image roll; no stick figure or unrequested fixed axes; crop/lens/layout distinctions; 70-degree visible surfaces in actual handoffs',kindCounts,measurements:results.filter(r=>Object.keys(r).length>1),handoffs}));
