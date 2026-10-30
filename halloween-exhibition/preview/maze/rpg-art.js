import {MONSTER_MOTION_DATA} from './monster-motion-data.js?v=20261016-living1';
import {MONSTER_IDS,validMonsterLayout,motionSprite} from './monster-motion.js?v=20261019-unified1';
// Original, locally bundled Halloween RPG art. No external/franchise art requests.
export const ART_FILES = {
  playerAtlas:'lantern-keeper-atlas.webp',nameless_overlord:'../overlord/queen-original-art-v1.webp',witch:'witch-story-v3.webp',masked_wanderer:'masked_wanderer-story-v3.webp',pumpkin:'pumpkin-story-v2.webp',ghost:'ghost-story-v2.webp',bat:'bat-story-v2.webp',zombie:'zombie-story-v2.webp',vampire:'vampire-story-v2.webp',franken:'franken-story-v2.webp',battle:'battle-library.webp',battleEclipse:'battle-eclipse-palace-v1.webp',battleEnergy:'battle-energy-v1.webp',
  bookcase:'bookcase.webp',window:'window.webp',column:'column.webp',pumpkins:'pumpkins.webp',floor:'floor.webp',
};
export const ART_BOUNDS={witch:[144,17,481,731],masked_wanderer:[225,17,323,727],franken:[31,4,710,760],zombie:[49,15,671,736],vampire:[129,10,517,748],pumpkin:[140,7,493,752],ghost:[148,11,532,741],bat:[21,31,734,674],bookcase:[10,14,437,634],window:[19,14,309,623],column:[24,8,285,626],pumpkins:[19,17,619,319]};
export const ART_ANCHORS={witch:{anchorX:.5654885655,anchorY:1},masked_wanderer:{anchorX:.4922600619,anchorY:1},pumpkin:{anchorX:(390-140)/493,anchorY:1},zombie:{anchorX:(445-49)/671,anchorY:1},vampire:{anchorX:(410-129)/517,anchorY:1},franken:{anchorX:(420-31)/710,anchorY:1}};
export const PLAYER_ATLAS={cell:256,columns:4,rows:4,anchorX:128,anchorY:238,contentHeight:218,directions:['down','left','right','up']};
// Generated original scenery is one shared transparent atlas plus four surface textures.
export const PALACE_ART = Object.freeze({
  cabinet:[8,0,447,350],armchair:[482,4,283,350],planter:[802,0,299,367],tapestry:[1115,4,326,343],
  writingDesk:[11,372,440,357],moonWindow:[459,347,320,381],candelabra:[842,358,225,354],armillary:[1146,376,270,334],
  chaise:[0,749,465,310],harvest:[455,741,375,337],palaceDoor:[822,705,302,372],palaceColumn:[1215,701,194,382],
});
export const PALACE_TEXTURES=Object.freeze({parquet:'parquet.webp',limestone:'limestone.webp',marble:'marble.webp',carpet:'carpet.webp',wallPanel:'wainscot-wall.webp'});
export const RPG_ART_CONCURRENT=4;
export const RPG_ART_TIMEOUT=14000;
export function loadArtImage(src,{timeout=RPG_ART_TIMEOUT,timers=globalThis,ImageClass=globalThis.Image,priority='low'}={}){return new Promise((resolve,reject)=>{const image=new ImageClass();let active=true;const finish=(error)=>{if(!active)return;active=false;timers.clearTimeout(timer);image.onload=image.onerror=null;if(error){image.removeAttribute?.('src');reject(error);}else resolve(image);};const timer=timers.setTimeout(()=>finish(new Error('Art image timed out')),timeout);image.onload=()=>finish();image.onerror=()=>finish(new Error('Art image failed'));image.decoding='async';image.fetchPriority=priority;image.src=src;});}
export function createArtLibrary({loadImage=loadArtImage,motionData=MONSTER_MOTION_DATA,loadPlayer=true,deferOptional=false,deferScene=false,concurrent=RPG_ART_CONCURRENT,attempts=2,timeout=RPG_ART_TIMEOUT,onChange=()=>{}}={}){
  if(!Number.isInteger(concurrent)||concurrent<1||concurrent>8||!Number.isInteger(attempts)||attempts<1||attempts>3||!Number.isFinite(timeout)||timeout<=0)throw new TypeError('Invalid RPG image loading budget');
  const images={},failures=[],monsterLayouts={},details=new Map(),definitions=new Map(),decoded=new Map(),pending=new Map(),queue=[];let version=0,playerLayout=null,playerOverride=false,running=0;
  const changed=()=>{try{onChange();}catch{/* Status observers cannot fail image loading. */}};
  const clearFailure=key=>{const index=failures.indexOf(key);if(index>=0)failures.splice(index,1);details.delete(key);};
  const obsolete=key=>key==='playerAtlas'&&playerOverride||!!monsterLayouts[key];
  function pump(){while(running<concurrent&&queue.length){const task=queue.shift();running++;Promise.resolve().then(task.load).then(task.resolve,task.reject).finally(()=>{running--;pump();});}}
  function schedule(load){return new Promise((resolve,reject)=>{queue.push({load,resolve,reject});pump();});}
  function run(definition){
    const {key,url,install,validate,priority='auto'}=definition;
    if(obsolete(key)){clearFailure(key);return Promise.resolve(images[key]?.image||images[key]||null);}
    if(pending.has(key))return pending.get(key);
    if(decoded.has(key))return Promise.resolve(decoded.get(key));
    const task=schedule(async()=>{
      if(obsolete(key)){clearFailure(key);return images[key]?.image||images[key]||null;}
      let error,requested=url;
      for(let attempt=0;attempt<attempts;attempt++){
        const address=new URL(url);if(attempt)address.searchParams.set('art-retry',String(attempt));requested=address.href;
        try{
          const image=await loadImage(requested,{timeout,priority});
          if(validate)validate(image);
          clearFailure(key);
          if(!obsolete(key)){install(image);decoded.set(key,image);version++;}
          changed();return image;
        }catch(failure){error=failure;if(obsolete(key)){clearFailure(key);changed();return images[key]?.image||images[key]||null;}}
      }
      if(!failures.includes(key))failures.push(key);
      details.set(key,{key,url:requested,reason:String(error?.message||error||'Image unavailable'),attempts});changed();return null;
    });
    pending.set(key,task);task.finally(()=>{if(pending.get(key)===task)pending.delete(key);});return task;
  }
  function request(definition){definitions.set(definition.key,definition);return run(definition);}
  const load=(key,file,environment=false)=>request({key,url:new URL(`./assets/rpg/${environment?'palace/':''}${file}`,import.meta.url).href,priority:['battle','bookcase','window','column','pumpkins','floor'].includes(key)?'low':'auto',install(image){images[key]=ART_BOUNDS[key]?{image,frame:ART_BOUNDS[key],width:ART_BOUNDS[key][2],height:ART_BOUNDS[key][3],...ART_ANCHORS[key]}:image;if(key==='palaceAtlas')for(const [name,frame]of Object.entries(PALACE_ART))images[name]={image,frame,width:frame[2],height:frame[3],anchorX:.5,anchorY:.97};}});
  const animatedIds=MONSTER_IDS.filter(id=>validMonsterLayout(motionData[id]));
  // Bound active image requests instead of starting all 22 low-priority decodes
  // against one eight-second clock on mobile. Only a failed image is retried.
  const optionalKeys=new Set(['battle','battleEclipse','battleEnergy','bookcase','window','column','pumpkins','floor']);
  // The optional throne character is requested at its encounter, rather than
  // competing with the owner, cat and first corridor on every entrance.
  const staticEntries=Object.entries(ART_FILES).filter(([key])=>!['battleEclipse','battleEnergy'].includes(key)&&!animatedIds.includes(key)&&(loadPlayer||key!=='playerAtlas')&&!(deferOptional&&key==='nameless_overlord'));
  const deferred=deferOptional?staticEntries.filter(([key])=>optionalKeys.has(key)):[];
  let remaining=null,finishRemaining;const remainingReady=new Promise(resolve=>finishRemaining=resolve);
  function loadRemaining(){return remaining??=Promise.all(deferred.map(([key,file])=>load(key,file))).then(()=>finishRemaining());}
  if(!deferOptional)void loadRemaining();
  let sceneTask,finishScene;const sceneReady=new Promise(resolve=>finishScene=resolve);
  function startScene(){return sceneTask??=(async()=>{
    const core=Promise.all([
      ...staticEntries.filter(([key])=>!deferOptional||!optionalKeys.has(key)).map(([key,file])=>load(key,file)),
      ...animatedIds.map(async id=>{const layout=motionData[id];const image=await request({key:id+'-motion',url:new URL(layout.src,import.meta.url).href,priority:'auto',validate(image){if(image.width!==layout.width||image.height!==layout.height)throw new Error('Monster atlas dimensions mismatch');},install(image){monsterLayouts[id]=layout;images[id]=motionSprite(image,layout,{motion:false});clearFailure(id);}});if(!image&&ART_FILES[id])await load(id,ART_FILES[id]);}),
    ]);
    const environment=Promise.all([
      load('palaceAtlas','props-atlas.webp',true),
      ...Object.entries(PALACE_TEXTURES).map(([key,file])=>load(key,file,true)),
    ]);
    await Promise.all([core,environment]);finishScene();
  })();}
  if(!deferScene)void startScene();
  const ready=Promise.all([sceneReady,remainingReady]).then(()=>undefined);
  function ensure(key){return Object.hasOwn(ART_FILES,key)?load(key,ART_FILES[key]):Promise.resolve(null);}
  async function retry(){const failed=[...failures];await Promise.all(failed.map(key=>{const definition=definitions.get(key);return definition?run(definition):null;}));return status();}
  function status(){return{loaded:Object.keys(images).length,pending:pending.size,active:running,queued:queue.length,failed:failures.length,failures:[...details.values()].map(detail=>({...detail}))};}
  return {images,monsterLayouts,failures,sceneReady,ready,loadRemaining,startScene,ensure,retry,status,get version(){return version;},get playerLayout(){return playerLayout;},setPlayerAtlas(image,layout=null){
    if(!image||!Number.isFinite(image.width)||!Number.isFinite(image.height)||image.width<=0||image.height<=0)throw new TypeError('A loaded player atlas image is required');
    playerOverride=true;images.playerAtlas=image;playerLayout=layout?{...layout}:null;clearFailure('playerAtlas');version++;changed();return version;
  }};
}
export function drawArtSprite(c,sprite,x,y,height,{alpha=1,flip=false,scaleX=1,scaleY=1,rotation=0}={}){
  if(!sprite)return false;
  const image=sprite.image||sprite,frame=sprite.frame||[0,0,image.width,image.height],drawHeight=height*(frame[3]/(sprite.contentHeight||frame[3])),width=drawHeight*(frame[2]/frame[3]);
  const ax=sprite.anchorX??.5,ay=sprite.anchorY??1;
  c.save();c.globalAlpha=alpha;c.translate(x,y);c.rotate(rotation);c.scale((flip?-1:1)*scaleX,scaleY);c.drawImage(image,...frame,-width*ax,-drawHeight*ay,width,drawHeight);c.restore();return true;
}
export function playerFrame(facing,walking,phase){const row=Math.max(0,PLAYER_ATLAS.directions.indexOf(facing)),column=walking?Math.floor(((phase%(Math.PI*2)+Math.PI*2)%(Math.PI*2))/(Math.PI*2)*4):0;return {row,column,frame:[column*256,row*256,256,256]};}
export function playerPose(art,facing,walking,phase,{battle=false,effect=null,time=0,motion=true}={}){
  const articulated=battle?art.rigs?.battle('owner:battle',{effect,time,motion,facing}):art.rigs?.get('owner');
  if(articulated)return articulated;
  if(!art.images.playerAtlas)return null;
  const image=art.images.playerAtlas,layout=art.playerLayout;
  if(!layout)return {image,...playerFrame(facing,walking,phase),contentHeight:PLAYER_ATLAS.contentHeight,anchorX:.5,anchorY:238/256};
  const directions=layout.directions||PLAYER_ATLAS.directions,row=Math.max(0,directions.indexOf(facing)),walkColumns=layout.walkColumns||[0,1,2,3];
  const progress=((phase%TAU)+TAU)%TAU/TAU,column=walking?walkColumns[Math.floor(progress*walkColumns.length)]:layout.idleColumn??0;
  const explicit=layout.frames?.[row]?.[column],cw=image.width/(layout.columns||4),ch=image.height/(layout.rows||4);
  return {image,row,column,frame:explicit?.frame||[column*cw,row*ch,cw,ch],anchorX:explicit?.anchorX??layout.anchorX??.5,anchorY:explicit?.anchorY??layout.anchorY??.93,contentHeight:explicit?.contentHeight??layout.contentHeight??ch*.85};
}
const TAU=Math.PI*2;
