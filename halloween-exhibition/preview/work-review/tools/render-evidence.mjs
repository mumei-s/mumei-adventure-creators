/** Offline native Canvas evidence. No browser, server, network, GPU, live counter, or writes to runtime assets.
 * Run: node --expose-gc halloween-exhibition/preview/work-review/tools/render-evidence.mjs [baseline-repo-root]
 * Requires @napi-rs/canvas from CODEX_PRIMARY_RUNTIME_NODE_MODULES and ffmpeg on PATH.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {performance} from 'node:perf_hooks';
const here=path.dirname(fileURLToPath(import.meta.url)),review=path.dirname(here),repo=path.resolve(review,'../../..');
const baseline=path.resolve(process.argv[2]||path.join(repo,'../baseline'));
const out=path.join(review,'evidence'),contacts=path.join(out,'contacts'),clips=path.join(out,'cast-clips');
await fs.mkdir(contacts,{recursive:true});await fs.mkdir(clips,{recursive:true});
const require=createRequire(import.meta.url),nodeModules=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {createCanvas,loadImage,GlobalFonts}=require(path.join(nodeModules,'@napi-rs/canvas'));
const fontPath=process.env.EVIDENCE_CJK_FONT||path.resolve(repo,'../evidence-fonts/NotoSansCJKjp-Regular.otf');
await fs.access(fontPath);
for(const family of ['Yu Gothic','Hiragino Kaku Gothic ProN','Noto Sans CJK JP'])if(!GlobalFonts.registerFromPath(fontPath,family))throw Error('Font registration failed '+family);
const fontHash=shaFont(await fs.readFile(fontPath));
function shaFont(b){return crypto.createHash('sha256').update(b).digest('hex');}
const FPS=24,W=390,H=420,PAIR_W=804,PAIR_H=492,DT=1/FPS,TAU=Math.PI*2;
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const readJSON=async f=>JSON.parse(await fs.readFile(f,'utf8'));
const jsonFiles=['data/archive.json','maze/data/creator-characters.json','maze/data/residents.json','maze/assets/rpg/animated/monster-motion.json'];
const measurements={generatedAt:new Date().toISOString(),method:'Offline @napi-rs/canvas software rendering of actual JS renderers; raw RGBA encoded by ffmpeg libx264; no browser or device was used.',notVerified:['DOM/CSS layout','browser input','actual iPhone/iPad/Android','WebGL/GPU','device FPS','network transfer time','actual audio'],baselineRoot:baseline,modifiedRoot:repo,canvasViewport:{width:W,height:H,pixelRatio:1,framesPerSecondInEncodedVideo:FPS},font:{file:path.basename(fontPath),sha256:fontHash,source:'https://raw.githubusercontent.com/notofonts/noto-cjk/main/Sans/OTF/Japanese/NotoSansCJKjp-Regular.otf',license:'SIL Open Font License 1.1',licenseSource:'https://github.com/notofonts/noto-cjk/blob/main/Sans/LICENSE',delivery:'font used from scratch for offline evidence only, not shipped with runtime'},sourceFiles:[],assets:[],timings:{},clips:[],limitations:['Four-pose source atlases have no authored continuous turning or attack clip. These videos expose that limitation; they are not an animation acceptance claim.','Phone-sized Canvas content is not a screenshot from a phone or browser.','Image byte counts are local file sizes, not network measurements. Decode estimates use width*height*4 and exclude GPU/native overhead.']};
const scenicCache=new Map();
async function decode(file,{shared=false}={}){
 const bytes=await fs.readFile(file),hash=sha(bytes);
 if(shared&&scenicCache.has(hash))return scenicCache.get(hash);
 const t=performance.now(),image=await loadImage(bytes);
 measurements.assets.push({file:path.relative(repo,file),bytes:bytes.length,sha256:hash,width:image.width,height:image.height,estimatedRGBABytes:image.width*image.height*4,nativeDecodeMs:performance.now()-t});
 if(shared)scenicCache.set(hash,image);return image;
}
async function mod(dir,name){return import(pathToFileURL(path.join(dir,name)).href);}
async function setup(root,label){
 const preview=path.join(root,'halloween-exhibition/preview'),maze=path.join(preview,'maze');
 const [stage,artMod,creator,resident,encounter,battle,patrol,monster,castle,walking]=await Promise.all([
  mod(maze,'stage-2d.js'),mod(maze,'rpg-art.js'),mod(maze,'creator-runtime.js'),mod(maze,'resident-model.js'),mod(maze,'encounter-model.js'),mod(maze,'battle-scene.js'),mod(maze,'patrol-model.js'),mod(maze,'monster-motion.js'),mod(preview,'palace-living-scene.js'),mod(maze,'walking-speed.js')]);
 let movement=null;try{movement=await mod(maze,'movement-runtime.js');}catch{}
 const [archive,manifest,residents,monsterManifest]=await Promise.all(jsonFiles.map(f=>readJSON(path.join(preview,f))));
 let queue=Promise.resolve();const art=artMod.createArtLibrary({loadPlayer:false,loadImage:url=>{const task=queue.then(()=>decode(fileURLToPath(url),{shared:true}));queue=task.catch(()=>{});return task;}});await art.ready;
 if(art.failures.length)throw Error(label+' artwork failures: '+art.failures.join(','));
 const roster=creator.compileCharacterRoster(archive,manifest),npcs=creator.placeCreatorNPCs(roster.npcs,manifest.slotAssignments).placed;
 const friendly=resident.compileResidents(residents),companions=creator.compileCompanions(manifest),hero=await decode(path.join(maze,roster.hero.asset.src),{shared:true});
 art.setPlayerAtlas(hero,creator.scaledCharacterLayout(roster.hero.asset,hero));
 const sourceNames=['stage-2d.js','rpg-art.js','creator-runtime.js','patrol-model.js','monster-motion.js','battle-scene.js','encounter-model.js'];
 if(movement)sourceNames.push('movement-runtime.js');
 for(const f of sourceNames){const bytes=await fs.readFile(path.join(maze,f));measurements.sourceFiles.push({version:label,path:'maze/'+f,sha256:sha(bytes)});}
 for(const f of jsonFiles){const bytes=await fs.readFile(path.join(preview,f));measurements.sourceFiles.push({version:label,path:f,sha256:sha(bytes)});}
 return{root,label,preview,maze,stage,artMod,creator,resident,encounter,battle,patrol,monster,castle,walking,movement,archive,manifest,residents,monsterManifest,roster,npcs,friendly,companions,art};
}
function label(c,text,x,y,size=14,color='#f1deb7'){c.fillStyle=color;c.font=`${size}px sans-serif`;c.textAlign='left';c.textBaseline='top';c.fillText(text,x,y);}
function blank(cv){const c=cv.getContext('2d');c.setTransform(1,0,0,1,0,0);c.fillStyle='#101521';c.fillRect(0,0,cv.width,cv.height);return c;}
function pairFrame(left,right,title,subtitle){const cv=createCanvas(PAIR_W,PAIR_H),c=blank(cv);label(c,title,12,10,16);label(c,'BASELINE e989cd5',12,37,12);label(c,'WORK COMPARISON',414,37,12);c.drawImage(left,12,58);c.drawImage(right,414,58);label(c,subtitle,12,480,10,'#c7d2e1');return cv;}
async function encoder(file,width,height){
 const finalFile=file;file=path.join(path.dirname(file),'.'+path.basename(file,'.mp4')+'-'+process.pid+'-'+crypto.randomBytes(4).toString('hex')+'.mp4');
 const proc=spawn('ffmpeg',['-hide_banner','-loglevel','error','-xerror','-y','-f','rawvideo','-pixel_format','rgba','-video_size',`${width}x${height}`,'-framerate',String(FPS),'-i','pipe:0','-an','-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',file],{stdio:['pipe','ignore','pipe']});
 let errors='',writtenFrames=0;proc.stderr.on('data',b=>errors+=b);const done=once(proc,'close');
 return{async frame(cv){const data=Buffer.from(cv.getContext('2d').getImageData(0,0,width,height).data);if(!proc.stdin.write(data))await once(proc.stdin,'drain');writtenFrames++;},async finish(){proc.stdin.end();const[code]=await done;if(code!==0)throw Error('ffmpeg failed: '+errors);const probe=spawn('ffprobe',['-v','error','-count_frames','-select_streams','v:0','-show_entries','stream=nb_read_frames','-of','csv=p=0',file],{stdio:['ignore','pipe','pipe']});let frameCount='';probe.stdout.on('data',b=>frameCount+=b);const[pcode]=await once(probe,'close');if(pcode!==0||Number(frameCount.trim())!==writtenFrames)throw Error('Video frame count failed '+file+': '+frameCount+' expected '+writtenFrames+' errors '+errors);await fs.rename(file,finalFile);}};
}
function stats(values){const s=[...values].sort((a,b)=>a-b);return{samples:s.length,meanMs:s.reduce((a,b)=>a+b,0)/s.length,medianMs:s[Math.floor(s.length*.5)],p95Ms:s[Math.min(s.length-1,Math.floor(s.length*.95))],maximumMs:s.at(-1),excludes:'image decoding, encoder, browser, DOM, GPU; architecture construction is separate'};}
function timed(name,fn){const t=performance.now(),r=fn();(measurements.timings[name]??=[]).push(performance.now()-t);return r;}
async function png(name,cv){await fs.writeFile(path.join(out,name),cv.toBuffer('image/png'));}
const versions=[await setup(baseline,'baseline'),await setup(repo,'work')];
console.log('Loaded actual baseline/work modules.');
const stateOpen={unlocked:true,horrorAccepted:true,hasKey:true};
// Real stage renderer, real owner art, current nearby NPCs, same speed/input script.
const scenes=[];
for(const v of versions){
 const selected=v.npcs.filter(n=>['hall-west-south','hall-east','hall-south-east'].includes(n.slotId)).slice(0,3);
 const loaded=new Map();for(const n of selected)loaded.set(n.asset.src,await decode(path.join(v.maze,n.asset.src),{shared:true}));
 const cat=v.companions[0];loaded.set(cat.asset.src,await decode(path.join(v.maze,cat.asset.src),{shared:true}));
 const t=performance.now(),renderer=v.stage.createStageRenderer({makeCanvas:createCanvas,art:v.art});
 measurements.timings[v.label+'ArchitectureConstructionMs']=[performance.now()-t];
 const movementModel=await mod(v.maze,'rpg-model.js'),mazeModel=await mod(v.maze,'maze-model.js');
 const position={...mazeModel.initialState(),...stateOpen};
 scenes.push({v,selected,loaded,cat,renderer,cv:createCanvas(W,H),movementModel,loc:{position,velocity:{x:0,z:0},distance:0,phase:0,facing:'down',walking:false},trail:v.movement?.createDistanceTrail(),legacyTrail:[]});
}
function targetFor(t){if(t<1)return{x:0,z:0,label:'idle'};if(t<3)return{x:0,z:-6.8,label:'walk north'};if(t<4)return{x:0,z:0,label:'stop'};if(t<6)return{x:6.8,z:0,label:'walk east'};if(t<7)return{x:0,z:0,label:'stop'};if(t<9)return{x:0,z:6.8,label:'walk south'};if(t<10)return{x:0,z:0,label:'stop'};return{x:-6.8,z:0,label:'walk west'};}
const exploration=await encoder(path.join(out,'exploration-comparison.mp4'),PAIR_W,PAIR_H);
for(let i=0;i<12*FPS;i++){
 const time=i/FPS,target=targetFor(time);
 for(const s of scenes){
  const{v}=s,prev=s.loc;
  const move=(p,dx,dz)=>v.walking.advanceWithSubsteps(p,dx,dz,s.movementModel.moveAroundFurniture);
  if(v.movement)s.loc=v.movement.advanceLocomotion(prev,target,DT,{move,strideLength:TAU/2.3});
  else{const position=move(prev.position,target.x*DT,target.z*DT),dx=position.x-prev.position.x,dz=position.z-prev.position.z,distance=Math.hypot(dx,dz);s.loc={position,distance:prev.distance+distance,phase:(prev.phase+distance*2.3)%TAU,walking:distance>.0001,facing:s.movementModel.directionFromMovement(target.x,target.z,prev.facing),velocity:{x:target.x,z:target.z}};}
  const p={x:s.loc.position.x/4,z:s.loc.position.z/4,facing:s.loc.facing};s.trail?.push(p);s.legacyTrail.push(p);if(s.legacyTrail.length>40)s.legacyTrail.shift();
  const actors=v.creator.buildCreatorActors(s.selected,{get:src=>s.loaded.get(src)},{state:s.loc.position,time,motion:true});
  const cat=v.creator.companionActor(s.cat,s.loaded.get(s.cat.asset.src),s.trail||s.legacyTrail,s.loc.position,{facing:s.loc.facing,walking:s.loc.walking,phase:s.loc.phase});if(cat)actors.push(cat);
  timed(v.label+'StageRenderMs',()=>s.renderer.render({canvas:s.cv,state:s.loc.position,brightness:1,lantern:true,encounters:true,time,dt:DT,motion:true,facing:s.loc.facing,walking:s.loc.walking,walkPhase:s.loc.phase,creatorActors:actors}));
 }
 const cv=pairFrame(scenes[0].cv,scenes[1].cv,'Actual 2D renderer | 390 x 420 each',`${target.label} | native Canvas, no DOM/CSS/mobile/GPU verification`);await exploration.frame(cv);
 if([0,2*FPS,4*FPS,7*FPS].includes(i))await png(`exploration-${String(i/FPS).padStart(2,'0')}s.png`,cv);
}
await exploration.finish();console.log('Exploration comparison complete.');
// Actual battle renderer, same basic battle and shine effect clock; no input event simulation.
const battleCV=versions.map(()=>createCanvas(W,H)),battleEncoder=await encoder(path.join(out,'special-move-comparison.mp4'),PAIR_W,PAIR_H);
for(let i=0;i<6*FPS;i++){
 const t=i/FPS,local=t%3;
 for(let n=0;n<versions.length;n++){const v=versions[n],battle=v.encounter.newBattle('pumpkin');const effect=local>=.35?{type:'shine',started:t-local+.35,damage:3,retaliation:1}:null;
  timed(v.label+'BattleRenderMs',()=>v.battle.renderBattleScene({canvas:battleCV[n],art:v.art,battle,effect,time:t,motion:true,pixelRatio:1}));}
 const cv=pairFrame(...battleCV,'Actual battle renderer | shine sequence','Source art has no authored attack/turn clip. Native Canvas evidence only.');await battleEncoder.frame(cv);if(i===FPS)await png('special-move-1s.png',cv);
}
await battleEncoder.finish();
// Castle art and actual decorative-cast function; not the browser gate/CSS transition.
const castleCV=versions.map(()=>createCanvas(W,H)),castleLayers=versions.map(()=>createCanvas(W,H)),castleMaps=[],palaceImages=[];
for(const v of versions){const map=new Map();for(const actor of v.castle.CASTLE_CAST){const meta=v.monsterManifest[actor.id];map.set(actor.id,{image:await decode(path.join(v.maze,'assets/rpg/animated',meta.castleSrc),{shared:true}),layout:{...meta,frames:meta.castleFrames}});}castleMaps.push(map);palaceImages.push(await decode(path.join(v.preview,'assets/palace/palace-phone.webp'),{shared:true}));}
const castleEncoder=await encoder(path.join(out,'castle-cast-comparison.mp4'),PAIR_W,PAIR_H);
for(let i=0;i<8*FPS;i++){
 for(let n=0;n<versions.length;n++){const c=blank(castleCV[n]),image=palaceImages[n],scale=Math.max(W/image.width,H/image.height);c.drawImage(image,(W-image.width*scale)/2,(H-image.height*scale)/2,image.width*scale,image.height*scale);versions[n].castle.drawCastleCast(castleLayers[n].getContext('2d'),castleMaps[n],i/FPS,W,H);c.drawImage(castleLayers[n],0,0);}
 const cv=pairFrame(...castleCV,'Actual castle cast | background image composition','No DOM/CSS gate, scene layout, viewport, or browser animation is represented.');await castleEncoder.frame(cv);if(i===0)await png('castle-comparison.png',cv);
}
await castleEncoder.finish();console.log('Battle and castle comparisons complete.');
// Every source atlas in sequence; never decode the full 18-person roster together.
const actors=[...versions[1].manifest.characters.map(a=>({...a,kind:a.role})),...versions[1].manifest.companions.map(a=>({...a,kind:'companion'})),...versions[1].friendly.map(a=>({...a,kind:'resident'})),...versions[1].encounter.ALL_MONSTERS.map(a=>({...a,kind:'monster'}))];
const concat=[],overview=createCanvas(1200,Math.ceil(actors.length/5)*190),oc=blank(overview),actorResults=[];
for(let ai=0;ai<actors.length;ai++){
 const a=actors[ai],isMonster=a.kind==='monster',v=versions[1],meta=isMonster?v.monsterManifest[a.id]:a.asset;
 const image=await decode(path.join(v.maze,isMonster?'assets/rpg/animated/'+meta.src:meta.src));
 const sheet=createCanvas(720,isMonster?250:640),sc=blank(sheet);label(sc,`${String(ai+1).padStart(2,'0')} ${a.id}`,12,10,18);label(sc,'Exact source crops / measured anchors / no invented intermediate art',12,36,12);
 const sample=(version,facing,walking,phase,time=0)=>isMonster?version.monster.motionSprite(image,{...meta,frames:meta.frames,walkFrames:meta.walkFrames},{time,motion:true,walking,facing,phase}):version.creator.characterSprite(a.asset,image,facing,walking,phase);
 const dirs=isMonster?['right']:['down','left','right','up'];
 for(let row=0;row<dirs.length;row++)for(let col=0;col<4;col++){const x=90+col*176,y=185+row*145;sc.strokeStyle='#526273';sc.beginPath();sc.moveTo(x-68,y);sc.lineTo(x+68,y);sc.stroke();const sp=sample(v,dirs[row],true,(col+.1)/4*TAU,col/(meta.fps||5));v.artMod.drawArtSprite(sc,sp,x,y,110,{flip:sp.flip});label(sc,`${dirs[row]} / ${col}`,x-55,y+10,12);}
 await fs.writeFile(path.join(contacts,`${String(ai+1).padStart(2,'0')}-${a.id}.png`),sheet.toBuffer('image/png'));
 const ox=(ai%5)*240,oy=Math.floor(ai/5)*190;oc.drawImage(sheet,0,54,176,140,ox+30,oy+20,150,120);label(oc,`${String(ai+1).padStart(2,'0')} ${a.id}`,ox+8,oy+150,11);label(oc,a.kind,ox+8,oy+166,10,'#b6c8d6');
 const clipName=`${String(ai+1).padStart(2,'0')}-${a.id}.mp4`,enc=await encoder(path.join(clips,clipName),W,H);
 const frames=8*FPS,usedFrames=new Set(),turnSamples=[];
 // Use actual patrol sampling for NPCs/residents/monsters, with the clip centered on a stop/turn.
 let routes=versions.map(version=>{try{if(a.kind==='npc'){const placed=version.npcs.find(n=>n.id===a.id);return version.patrol.createActorPatrol(placed,{role:'creator'});}if(a.kind==='resident')return version.patrol.createActorPatrol(a,{role:'resident'});if(isMonster)return version.patrol.createActorPatrol(a,{role:'monster'});}catch{}return null;});
 for(let i=0;i<frames;i++){
  const t=i/FPS,cv=createCanvas(W,H),c=blank(cv);label(c,`${String(ai+1).padStart(2,'0')} / ${actors.length} ${a.id}`,12,12,14);label(c,'SOURCE ATLAS / NATIVE CANVAS REVIEW',12,35,11);label(c,'BASELINE',36,65,12);label(c,'WORK',236,65,12);
  for(let vi=0;vi<versions.length;vi++){
   const version=versions[vi],route=routes[vi];let pose;
   if(route){const clock=route.segments[0].travel-route.offset-1+t;pose=version.patrol.samplePatrolPosition(route,clock,{motion:true,state:stateOpen});}
   else{const cycle=t%8,dir=['down','left','up','right'][Math.floor(cycle/2)],walking=cycle%2<1.5;pose={x:walking?(cycle%2)*.24:.36,z:0,facing:dir,walking,phase:walking?cycle*7:0};}
   const sp=sample(version,pose.facing,pose.walking,pose.phase,t),anchorX=vi?292:97;
   c.strokeStyle='#728295';c.beginPath();c.moveTo(anchorX-60,190);c.lineTo(anchorX+60,190);c.stroke();version.artMod.drawArtSprite(c,sp,anchorX,190,75,{flip:sp.flip});
   version.artMod.drawArtSprite(c,sp,anchorX,370,150,{flip:sp.flip});label(c,`${pose.facing} ${pose.walking?'walk':'stop'}`,anchorX-52,202,10);label(c,'2x detail below',anchorX-47,385,10,'#b6c8d6');
   usedFrames.add((vi?'work:':'base:')+pose.facing+':'+(sp.frameIndex??sp.frame.join(',')));if(vi===1&&pose.turning)turnSamples.push(t);
  }
  label(c,'75 px body height above = stage scale at 390 px wide',12,405,10,'#bacad7');await enc.frame(cv);
 }
 await enc.finish();concat.push(`file '${clipName}'`);actorResults.push({id:a.id,kind:a.kind,contact:`contacts/${String(ai+1).padStart(2,'0')}-${a.id}.png`,clip:`cast-clips/${clipName}`,seconds:8,uniqueSampledPoseKeys:usedFrames.size,workTurnSamples:turnSamples.length,animationQualityPassed:false,knownLimitation:'Only 4 authored walking poses; no authored continuous turn/attack clip. Manual quality assessment still required.'});
 console.log(`Atlas review ${ai+1}/${actors.length}: ${a.id}`);global.gc?.();
}
await fs.writeFile(path.join(clips,'concat.txt'),concat.join('\n')+'\n');
const mergeFile=path.join(out,'.all-cast-review-'+process.pid+'.mp4');
const merge=spawn('ffmpeg',['-hide_banner','-loglevel','error','-xerror','-y','-f','concat','-safe','0','-i',path.join(clips,'concat.txt'),'-c','copy','-movflags','+faststart',mergeFile],{stdio:['ignore','ignore','inherit']});const [mergeCode]=await once(merge,'close');if(mergeCode)throw Error('cast concat failed');await fs.rename(mergeFile,path.join(out,'all-cast-review.mp4'));
await fs.writeFile(path.join(out,'all-cast-overview.png'),overview.toBuffer('image/png'));
measurements.actors=actorResults;
// Verify every finalized clip again after the concat, not just on encoder exit.
const verifyNames=[...actorResults.map(a=>a.clip),'exploration-comparison.mp4','special-move-comparison.mp4','castle-cast-comparison.mp4','all-cast-review.mp4'];
const verified=[];
for(const name of verifyNames){
 const file=path.join(out,name),probe=spawn('ffprobe',['-v','error','-count_frames','-select_streams','v:0','-show_entries','stream=width,height,nb_read_frames:format=duration','-of','json',file],{stdio:['ignore','pipe','pipe']});let result='';probe.stdout.on('data',b=>result+=b);const[code]=await once(probe,'close');if(code)throw Error('Final video probe failed '+name);const data=JSON.parse(result),stream=data.streams[0];verified.push({file:name,frames:Number(stream.nb_read_frames),width:stream.width,height:stream.height,durationSeconds:Number(data.format.duration)});
}
if(verified.find(v=>v.file==='all-cast-review.mp4').frames!==30*8*FPS)throw Error('Full cast reel has missing frames');
measurements.encodedVideoVerification={method:'ffprobe -count_frames after all atomic outputs and concat completed',videos:verified,all30CastClipsPass:true,allCastReelFrames:30*8*FPS,allCastReelSeconds:240};
measurements.timingInterpretation='One fixed native Canvas path replay. CPU observations are not a benchmark of browser frame rate or a statistical speedup claim.';
// Only clean this tool's abandoned hidden MP4 temporaries inside its own output directories.
for(const dir of [out,clips])for(const name of await fs.readdir(dir))if(name.startsWith('.')&&name.endsWith('.mp4'))await fs.unlink(path.join(dir,name));

for(const[k,v]of Object.entries(measurements.timings))measurements.timings[k]=stats(v);
measurements.imageCache={sharedDecodedImageCount:scenicCache.size,sharedEstimatedRGBABytes:[...scenicCache.values()].reduce((n,im)=>n+im.width*im.height*4,0),characterPolicy:'3 nearby NPC renderables + hero + follower cached for scene evidence; atlas review decodes one additional actor at a time. No full roster preload.',maximumSceneCharacterRenderables:5,fullRosterDecodePerformed:false};
measurements.outputs=await Promise.all(['exploration-comparison.mp4','special-move-comparison.mp4','castle-cast-comparison.mp4','all-cast-review.mp4','all-cast-overview.png'].map(async name=>({name,bytes:(await fs.stat(path.join(out,name))).size,sha256:sha(await fs.readFile(path.join(out,name)))})));
await fs.writeFile(path.join(out,'measurements.json'),JSON.stringify(measurements,null,2)+'\n');
await fs.writeFile(path.join(out,'README.md'),`# Native Canvas comparison evidence\n\nGenerated by ../tools/render-evidence.mjs.\n\n- exploration-comparison.mp4: actual createStageRenderer, 390×420 per version, same directional input and speed ceiling.\n- special-move-comparison.mp4: actual battle-scene renderer and shine effect clock.\n- castle-cast-comparison.mp4: actual drawCastleCast over the packaged palace image; not browser gate/CSS.\n- all-cast-review.mp4: sequential 8-second reviews of 18 cast, 2 fictional residents, 10 monsters. Same source art; four-pose/turn limitations remain visible.\n- contacts/: every atlas, direction, walking pose and measured foot anchor.\n- measurements.json: source hashes, file sizes, decode estimates and native Canvas CPU timings.\n\nNo browser, phone, DOM/CSS, WebGL, audio or device FPS was tested. Offline CJK text uses Noto Sans CJK JP from the official notofonts repository under SIL OFL 1.1; its hash/source are recorded, and the font is not shipped in this runtime. The upper actor in each cast clip has 75-pixel body height, matching the stage renderer scale at 390-pixel width. The lower actor is explicitly a 2× inspection. Source assets are unmodified. To reproduce Japanese text, set EVIDENCE_CJK_FONT to NotoSansCJKjp-Regular.otf from the official source recorded in measurements.json. No interpolation or fabricated intermediate artwork is inserted.\n\nReproduce from repo root: node --expose-gc halloween-exhibition/preview/work-review/tools/render-evidence.mjs /path/to/baseline-repo\n\nCanvas render milliseconds exclude image decoding and ffmpeg, and are not browser/GPU frame-rate measurements. The complete source pose review is not a claim that all animations pass.\n`);
console.log('Evidence and measurements complete:',out);
