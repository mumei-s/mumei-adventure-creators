// Original, code-drawn teaching shapes. They supply framing only: no person,
// costume, setting or drawing style is a reference for the finished artwork.
const ink='#163a46',light='#b3dfda',mid='#59a49d',dark='#28726f',gold='#ef9b31';
const n=v=>Number(v.toFixed(3));
const pt=p=>p.map(n).join(',');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const label=(x,y,s,size=48)=>`<text x="${x}" y="${y}" font-family="sans-serif" font-size="${size}" font-weight="700" fill="${ink}">${esc(s)}</text>`;
const path=(d,fill='none',stroke=ink,width=8)=>`<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"/>`;
const vec=(a,b)=>a.map((x,i)=>x-b[i]);
const dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{const l=Math.hypot(...a);return a.map(x=>x/l);};
const rad=a=>a*Math.PI/180;
function view({pitch=0,yaw=0,distance=8,zoom=1,center=[475,410],targetZ=1.1}={}){
 const p=rad(pitch),y=rad(yaw),at=[distance*Math.sin(y)*Math.cos(p),-distance*Math.cos(y)*Math.cos(p),targetZ+distance*Math.sin(p)],target=[0,0,targetZ],forward=norm(vec(target,at));
 let right=norm(cross(forward,[0,0,1]));
 if(Math.abs(pitch)===90)right=[Math.cos(y),Math.sin(y),0];
 const up=norm(cross(right,forward));
 const project=v=>{const rel=vec(v,at),depth=dot(rel,forward),scale=1650*zoom/depth;return [center[0]+dot(rel,right)*scale,center[1]-dot(rel,up)*scale,depth];};
 return {project,forward};
}
function ellipsoid(center,radii,part,faces,latitudes=8,longitudes=14){
 const vertex=(i,j)=>{const a=-Math.PI/2+i*Math.PI/latitudes,b=j*2*Math.PI/longitudes;return center.map((v,k)=>v+radii[k]*[Math.cos(a)*Math.cos(b),Math.cos(a)*Math.sin(b),Math.sin(a)][k]);};
 for(let i=0;i<latitudes;i++)for(let j=0;j<longitudes;j++)faces.push({part,points:[vertex(i,j),vertex(i,j+1),vertex(i+1,j+1),vertex(i+1,j)]});
}
function tube(start,end,r0,r1,part,faces){
 const axis=norm(vec(end,start)),right=norm(cross(axis,Math.abs(axis[2])>.9?[0,1,0]:[0,0,1])),up=norm(cross(axis,right));
 const ring=(c,r,j)=>c.map((v,k)=>v+r*(right[k]*Math.cos(j*Math.PI/6)+up[k]*Math.sin(j*Math.PI/6)));
 for(let j=0;j<12;j++)faces.push({part,points:[ring(start,r0,j),ring(start,r0,j+1),ring(end,r1,j+1),ring(end,r1,j)]});
 faces.push({part,points:Array.from({length:12},(_,i)=>ring(start,r0,i))});
 faces.push({part,points:Array.from({length:12},(_,i)=>ring(end,r1,11-i))});
}
function modelFaces(){
 const faces=[];
 ellipsoid([0,0,1.9],[.19,.16,.25],'head',faces);
 tube([0,0,1.6],[0,0,1.75],.105,.105,'neck',faces);
 tube([0,0,1.09],[0,0,1.57],.2,.28,'torso',faces);
 ellipsoid([0,0,.99],[.22,.145,.15],'pelvis',faces,6,12);
 for(const side of [-1,1]){
  tube([side*.32,0,1.55],[side*.39,-.015,1.13],.105,.085,'upper-arm',faces);
  tube([side*.39,-.015,1.13],[side*.43,-.035,.81],.085,.065,'forearm',faces);
  ellipsoid([side*.43,-.04,.75],[.073,.058,.1],'hand',faces,5,10);
  tube([side*.115,0,.96],[side*.13,-.025,.51],.115,.09,'thigh',faces);
  tube([side*.13,-.025,.51],[side*.135,0,.13],.09,.065,'calf',faces);
  ellipsoid([side*.135,-.09,.065],[.085,.17,.065],'foot',faces,5,10);
 }
 // A front marker, not a costume: visibly distinguishes front and rear views.
 faces.push({part:'front-marker',points:[[-.065,-.246,1.49],[.065,-.246,1.49],[.065,-.237,1.34],[-.065,-.237,1.34]]});
 return faces;
}
function renderModel(camera,{offset=[0,0,0],size=1}={}){
 const projected=modelFaces().map(face=>{const points=face.points.map(p=>p.map((v,i)=>v*size+offset[i])),normal=norm(cross(vec(points[1],points[0]),vec(points[2],points[0])));return {...face,normal,screen:points.map(camera.project)};}).sort((a,b)=>b.screen.reduce((s,p)=>s+p[2],0)/b.screen.length-a.screen.reduce((s,p)=>s+p[2],0)/a.screen.length);
 return `<g class="preview-solid-mannequin" data-identity="none">${projected.map(face=>{const amount=dot(face.normal,norm([-.8,-1,1.5])),fill=face.part==='front-marker'?gold:amount>.3?light:amount>-.35?mid:dark;return `<polygon data-body-part="${face.part}" points="${face.screen.map(p=>pt(p.slice(0,2))).join(' ')}" fill="${fill}" stroke="${fill}" stroke-width="1.1"/>`;}).join('')}</g>`;
}
function floor(camera,{wide=false}={}){
 const poly=points=>`<polygon points="${points.map(camera.project).map(p=>pt(p.slice(0,2))).join(' ')}" fill="#eef2de" stroke="#91b4a0" stroke-width="4"/>`;
 const line=(a,b)=>{const p=camera.project(a),q=camera.project(b);return path(`M${pt(p.slice(0,2))}L${pt(q.slice(0,2))}`,'none','#b6ccb6',4);};
 let s=poly([[-3,-2,0],[3,-2,0],[3,4,0],[-3,4,0]]);
 for(let x=-3;x<=3;x+=wide?1:1.5)s+=line([x,-2,0],[x,4,0]);
 for(let y=-2;y<=4;y+=wide?1:1.5)s+=line([-3,y,0],[3,y,0]);
 return `<g class="preview-support-plane">${s}</g>`;
}
const badge=(s)=>`<rect x="690" y="20" width="275" height="88" rx="22" fill="#fff2d8" stroke="${gold}" stroke-width="5"/>${label(720,79,s,42)}`;
function scene(pitch=0,yaw=0,{wide=false,roll=0,bottom=false}={}){
 const camera=view({pitch,yaw,distance:wide?16:8,zoom:Math.abs(pitch)===90?2.1:Math.abs(pitch)===70?1.5:1,center:[500,420],targetZ:Math.abs(pitch)===90?1.1:1.05});
 // Below-view examples isolate the opaque volume against open space. A
 // continuous opaque floor viewed from below would hide the subject.
 const underside=bottom||pitch<0;
 let content=underside?'':floor(camera,{wide});
 if(wide){content+=renderModel(camera,{offset:[-1.8,2.5,0],size:.95})+renderModel(camera,{offset:[2.3,4.5,0],size:.8});}
 content+=renderModel(camera);
 if(underside)content=`<circle cx="500" cy="395" r="225" fill="#e4f5fa"/>`+content;
 return `<g class="preview-projection" data-pitch="${pitch}" data-yaw="${yaw}"${roll?` transform="rotate(${roll} 500 400)"`:''}>${content}</g>`;
}
function face({eyes=false,upper=false}={}){
 if(eyes)return `<g data-preview-subject="eyes">${path('M105 430Q280 240 460 405Q280 540 105 430Z',light)}${path('M540 405Q720 240 900 430Q720 540 540 405Z',light)}<ellipse cx="300" cy="398" rx="67" ry="100" fill="${dark}"/><ellipse cx="700" cy="398" rx="67" ry="100" fill="${dark}"/><circle cx="300" cy="398" r="31" fill="${ink}"/><circle cx="700" cy="398" r="31" fill="${ink}"/><circle cx="322" cy="368" r="16" fill="white"/><circle cx="722" cy="368" r="16" fill="white"/>${path('M155 235Q290 150 415 230','none',ink,21)}${path('M585 230Q710 150 855 235','none',ink,21)}${path('M480 370L460 615Q500 645 540 615','none',dark,11)}</g>`;
 const scale=upper?.68:1,x=upper?160:0,y=upper?70:0;
 const head=path('M300 210Q300 95 500 105Q700 95 700 210L675 435Q650 555 500 625Q350 555 325 435Z',light)+path('M345 285Q395 235 450 285','none',ink,13)+path('M550 285Q605 235 655 285','none',ink,13)+path('M350 350Q400 318 445 350Q400 387 350 350Z',mid)+path('M555 350Q600 318 650 350Q600 387 555 350Z',mid)+path('M500 345L480 450L520 450','none',dark,12)+path('M442 510Q500 535 558 510','none',dark,12);
 return `<g data-preview-subject="${upper?'upper-body':'face'}">${upper?path('M330 375L150 450L100 690L900 690L850 450L670 375L600 450L400 450Z',mid):''}<g transform="translate(${x} ${y}) scale(${scale})">${head}</g></g>`;
}
function hands(){return `<g data-preview-subject="hands">${path('M120 600L310 365L360 400L245 650Z',mid)}${path('M305 370Q325 335 358 305L412 245Q443 229 457 264L418 321L577 317Q621 320 621 357L589 510Q579 550 526 554L389 529Q340 501 331 441Z',light)}<rect x="516" y="268" width="185" height="260" rx="24" fill="#eed09b" stroke="${ink}" stroke-width="9"/>${path('M396 356L526 352Q560 352 560 381Q560 408 526 408L411 413',light)}${path('M407 415L521 414Q552 414 550 445Q548 473 516 473L425 471',light)}${path('M428 471L511 474Q539 478 535 502Q531 526 499 521L446 515',light)}<path d="M750 365L820 365L820 510" fill="none" stroke="${gold}" stroke-width="18" marker-end="url(#preview-arrow)"/></g>`;}
function feet(){return `<g data-preview-subject="feet"><path d="M80 596H920" stroke="${ink}" stroke-width="14"/><path d="M165 410L194 180L330 180L356 419L399 479Q419 538 379 575L135 575Q108 534 135 487Z" fill="${mid}" stroke="${ink}" stroke-width="9"/><path d="M598 180L746 180L782 429L839 486Q870 548 826 575L583 575Q549 527 583 482Z" fill="${light}" stroke="${ink}" stroke-width="9"/><path d="M137 575H378M584 575H826" stroke="${gold}" stroke-width="22"/><path d="M500 360V515" fill="none" stroke="${gold}" stroke-width="18" marker-end="url(#preview-arrow)"/></g>`;}
function lens(value){
 if(value==='魚眼の曲面遠近'){
  let grid='';for(const x of [125,300,500,700,875])grid+=path(`M${x} 105Q${500+(x-500)*1.9} 375 ${x} 650`,'none','#739c9c',7);for(const y of [160,310,490,615])grid+=path(`M75 ${y}Q500 ${375+(y-375)*1.7} 925 ${y}`,'none','#739c9c',7);
  return `<g data-preview-subject="fisheye"><ellipse cx="500" cy="385" rx="440" ry="275" fill="#e9f4ea" stroke="${ink}" stroke-width="10"/>${grid}${renderModel(view({distance:8,zoom:.83,center:[500,410]}))}</g>`;
 }
 const compressed=value==='望遠・奥行きを圧縮',camera=view({pitch:3,yaw:0,distance:compressed?24:5.5,zoom:compressed?2.9:.69,center:[500,435]});
 return `<g data-preview-subject="${compressed?'telephoto':'wide-angle'}">${floor(camera)}${renderModel(camera,{offset:[compressed?.6:1.6,compressed?3:5.5,0]})}${renderModel(camera,{offset:[compressed?-.6:-.8,compressed?0:-1.1,0]})}</g>`;
}
function layout(value){
 const main=renderModel(view({distance:9,zoom:1,center:[500,445]}));
 if(value==='遮蔽物の隙間から')return `<g data-preview-subject="occlusion">${scene(0,0)}<path d="M65 105H315V650H65ZM690 105H935V650H690Z" fill="${ink}"/></g>`;
 if(value==='水平線を低く配置'||value==='水平線を高く配置'){const low=value==='水平線を低く配置',y=low?555:220;return `<g data-preview-subject="${low?'low-horizon':'high-horizon'}"><rect x="65" y="105" width="870" height="545" fill="#e2f2f7"/><rect x="65" y="${y}" width="870" height="${650-y}" fill="#d4e3c7"/><path d="M65 ${y}H935" stroke="${gold}" stroke-width="16"/>${renderModel(view({distance:12,zoom:.8,center:[500,y+40],targetZ:.75}))}</g>`;}
 if(value==='対角線で奥へ導く')return `<g data-preview-subject="depth-diagonal"><path d="M80 650L760 130L920 130L670 650Z" fill="#d4e3c7" stroke="${ink}" stroke-width="10"/><path d="M365 650L820 130" stroke="${gold}" stroke-width="15"/>${renderModel(view({distance:12,zoom:1,center:[610,380]}))}</g>`;
 if(value==='鏡・水面越しの視点')return `<g data-preview-subject="reflection"><rect x="540" y="105" width="355" height="530" rx="15" fill="#ddebfa" stroke="${gold}" stroke-width="18"/>${renderModel(view({distance:8,zoom:.85,center:[307,410]}))}<g transform="translate(1018 0) scale(-1 1)">${renderModel(view({distance:8,zoom:.85,center:[307,410]}))}</g></g>`;
 if(value==='肩越しの視点')return `<g data-preview-subject="over-shoulder">${main}<path d="M40 650V380Q75 300 150 323Q220 300 260 380L265 438Q390 466 435 650Z" fill="${ink}"/></g>`;
 return `<g data-preview-subject="first-person">${renderModel(view({distance:7,zoom:1.1,center:[500,450],targetZ:1.25}))}<path d="M125 105H80V155M875 105H920V155M125 650H80V600M875 650H920V600" fill="none" stroke="${gold}" stroke-width="14"/></g>`;
}
function simpleCaption(item,spec){
 if(spec.axes.pitch!==undefined)return spec.axes.pitch===0?'目の高さから':spec.axes.pitch>0?'上から '+spec.axes.pitch+'°':'下から '+Math.abs(spec.axes.pitch)+'°';
 if(spec.axes.yaw!==undefined)return spec.axes.yaw===90?'真横から':spec.axes.yaw===45?'斜め前から':'背面斜め';
 if(spec.axes.roll!==undefined)return '画面全体 '+spec.axes.roll+'°';
 const map={'背面から見る':'背中側から','鳥の目・広い俯瞰':'高い所から広く','地面すれすれの視点':'地面の近くから','顔のクローズアップ':'顔を大きく','目元の超接写':'目だけを大きく','上半身の接写':'上半身を大きく','手元・動作の接写':'手と対象の接点','足元・接地の接写':'足と床の接点','全身・周囲も見せる':'頭から足まで','遠景・世界を主役に':'場所を広く見せる','超広角の遠近':'手前は大・奥は小','望遠・奥行きを圧縮':'前後の差を小さく','魚眼の曲面遠近':'周囲を丸く曲げる','主役に向き合う一人称':'自分の目の前','遮蔽物の隙間から':'手前の隙間越し','水平線を低く配置':'境目を低く','水平線を高く配置':'境目を高く','対角線で奥へ導く':'斜めの道で奥へ','鏡・水面越しの視点':'反射を通して見る','肩越しの視点':'手前の肩の向こう'};
 return map[item.value]||item.value;
}
function cameraRay(pitch){
 const target=[670,390],p=rad(pitch),at=[target[0]+220*Math.cos(p),target[1]-220*Math.sin(p)];
 return `<g class="preview-camera-position" data-pitch="${pitch}"><line id="preview-optical-axis" x1="${n(at[0])}" y1="${n(at[1])}" x2="${target[0]}" y2="${target[1]}" stroke="${gold}" stroke-width="13" marker-end="url(#preview-arrow)"/><g transform="translate(${pt(at)}) rotate(${-pitch})"><rect x="-22" y="-22" width="52" height="44" rx="9" fill="${gold}" stroke="${ink}" stroke-width="6"/><path d="M-22 -12L-41 -22V22L-22 12Z" fill="${gold}" stroke="${ink}" stroke-width="6"/></g></g>`;
}
export function renderAnglePreview(item,spec){
 let content='',angleBadge='';
 if(spec.axes.roll!==undefined){content=scene(0,0,{roll:spec.axes.roll});angleBadge=badge(spec.axes.roll+'°');}
 else if(spec.axes.pitch!==undefined){content=scene(spec.axes.pitch,0,{bottom:spec.axes.pitch===-90})+cameraRay(spec.axes.pitch);angleBadge=badge(Math.abs(spec.axes.pitch)+'°');}
 else if(spec.axes.yaw!==undefined){content=scene(0,spec.axes.yaw);angleBadge=badge(spec.axes.yaw+'°');}
 else if(spec.kind==='crop')content=spec.frame==='hands'?hands():spec.frame==='feet'?feet():face({eyes:spec.frame==='eyes',upper:spec.frame==='upper'});
 else if(spec.kind==='lens')content=lens(item.value);
 else if(item.value==='背面から見る')content=scene(0,180);
 else if(item.value==='鳥の目・広い俯瞰')content=scene(55,35,{wide:true});
 else if(item.value==='地面すれすれの視点')content=scene(-8,0);
 else if(spec.kind==='frame')content=scene(0,0,{wide:spec.frame==='wide'});
 else content=layout(item.value);
 const kind=spec.axes.roll!==undefined?'roll':spec.axes.pitch!==undefined?'pitch':spec.axes.yaw!==undefined?'yaw':spec.kind;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="760" viewBox="0 0 1000 760" role="img" aria-labelledby="preview-title preview-desc" data-diagram-kind="${kind}" data-preview-version="visual-v2"><title id="preview-title">${esc(item.value)}</title><desc id="preview-desc">${esc(item.text)}。色面を持つ無個性の形で、視点と切り取る範囲を説明する。下面の投影例は連続した床を置かず、空中にある形として下面を示す。完成作品の人物・衣装・場所・画風の見本ではありません。数値のカメラ配置は別の拡大技術図で確認できます。</desc><defs><clipPath id="preview-scene-clip"><rect x="45" y="115" width="910" height="540" rx="24"/></clipPath><marker id="preview-arrow" viewBox="0 0 20 20" refX="15" refY="10" markerWidth="3" markerHeight="3" orient="auto"><path d="M0 0L20 10L0 20Z" fill="${gold}"/></marker></defs><rect width="1000" height="760" rx="28" fill="#f8fcfa"/>${label(40,82,simpleCaption(item,spec),48)}${angleBadge}<rect x="45" y="115" width="910" height="540" rx="24" fill="#edf5f1" stroke="#698f8a" stroke-width="8"/><g class="preview-artwork" clip-path="url(#preview-scene-clip)">${content}</g>${label(55,725,'視点・切り取る範囲の見本',36)}</svg>\n`;
}
