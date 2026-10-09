import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {angleItems} from '../angles.js?v=28.4.6';
import {angleConstraint} from '../view-constraints.js?v=28.4.6';
import {renderAnglePreview} from '../angle-preview-art.js?v=28.4.6';

const ink='#233a52',blue='#066e99',amber='#d38122',pale='#dce8f1',muted='#536b80';
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const n=v=>Math.abs(v)<1e-9?'0':Number(v.toFixed(6)).toString();
const pt=p=>p.map(n).join(',');
const text=(x,y,s,size=25,color=ink,anchor='start')=>`<text x="${n(x)}" y="${n(y)}" font-size="${size}" fill="${color}" text-anchor="${anchor}" font-family="sans-serif">${esc(s)}</text>`;
const line=(id,a,b,color=blue,dashed=false)=>`<line${id?` id="${id}"`:''} x1="${n(a[0])}" y1="${n(a[1])}" x2="${n(b[0])}" y2="${n(b[1])}" stroke="${color}" stroke-width="4"${dashed?' stroke-dasharray="9 7"':''}/>`;
const rect=(x,y,w,h,fill=pale,stroke=ink,id='')=>`<rect${id?` id="${id}"`:''} x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`;
const polygon=(id,points,fill=pale,stroke=ink)=>`<polygon${id?` id="${id}"`:''} points="${points.map(pt).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`;
const dot=(p,color=amber)=>`<circle cx="${n(p[0])}" cy="${n(p[1])}" r="7" fill="${color}"/>`;
const rad=d=>d*Math.PI/180;
const rotate=(p,c,degrees)=>{const a=rad(degrees),dx=p[0]-c[0],dy=p[1]-c[1];return [c[0]+dx*Math.cos(a)-dy*Math.sin(a),c[1]+dx*Math.sin(a)+dy*Math.cos(a)];};
function camera(at,rotation=0){return `<g class="camera-symbol" transform="translate(${n(at[0])} ${n(at[1])}) rotate(${n(rotation)})"><rect x="-20" y="-15" width="40" height="30" rx="5" fill="${blue}"/><path d="M-20 -7L-33 -15V15L-20 7Z" fill="${blue}"/></g>`;}
function arc(center,radius,start,end){const p=a=>[center[0]+radius*Math.cos(rad(a)),center[1]+radius*Math.sin(rad(a))];return `<path d="M${pt(p(start))}A${radius} ${radius} 0 ${Math.abs(end-start)>180?1:0} ${end>=start?1:0} ${pt(p(end))}" fill="none" stroke="${amber}" stroke-width="4"/>`;}
function pitchDiagram(pitch,id='optical-axis',fixed=true){
 const target=[390,365],radius=205,cameraAt=[target[0]+radius*Math.cos(rad(pitch)),target[1]-radius*Math.sin(rad(pitch))];
 return rect(330,315,120,100,pale,ink,'subject-shape')+line('',[240,365],[740,365],muted,true)+text(750,373,'水平',23,muted)+line(id,cameraAt,target)+dot(target)+camera(cameraAt,-pitch)+line('horizontal-reference',cameraAt,[cameraAt[0]-105,cameraAt[1]],muted,true)+(pitch?arc(cameraAt,65,180,180-pitch):'')+text(710,255,fixed?(pitch===0?'水平 0°':(pitch<0?'見上げ':'見下ろし')+' '+Math.abs(pitch)+'°'):'上方からの配置例',31,blue)+text(710,296,fixed?'横から見た光軸':'数値角度は未固定',24,muted)+text(325,450,'主題の形',23)+text(cameraAt[0]+37,cameraAt[1]+8,'カメラ',23,blue)+text(175,570,'注視点へ向く光軸と水平線のなす角',25)+text(175,610,'姿勢・接地・遮蔽は今回の選択条件で決める',23,muted);
}
function yawDiagram(yaw,{fixed=true,rear=false}={}){
 const target=[445,365],r=205,cameraAt=[target[0]+r*Math.sin(rad(yaw)),target[1]+r*Math.cos(rad(yaw))];
 return `<circle cx="445" cy="365" r="205" fill="none" stroke="${pale}" stroke-width="3"/>`+rect(385,315,120,100,pale,ink,'subject-shape')+line('subject-front-axis',target,[445,570],muted,true)+line(fixed?'azimuth-axis':'rear-view-axis',cameraAt,target)+dot(target)+camera(cameraAt,90-yaw)+text(385,440,'主題の正面',23)+text(430,285,'背面',23)+text(700,360,'側面',23)+text(680,200,fixed?'正面から '+yaw+'°':'背面側の配置例',30,blue)+text(680,242,fixed?'上から見た方位':'何度へ回るかは未固定',23,muted)+(fixed&&yaw?arc(target,145,90,90-yaw):'')+text(170,625,rear?'カメラは背面側。高さ・顔の向きは別条件':'高さや見上げ角はこの図では固定しない',23,muted);
}
function rollDiagram(degrees){
 const center=[500,365],corner=[[270,215],[730,215],[730,515],[270,515]].map(p=>rotate(p,center,degrees)),axis=[[300,420],[700,420]].map(p=>rotate(p,center,degrees)),subject=[[450,285],[550,285],[550,420],[450,420]].map(p=>rotate(p,center,degrees));
 return rect(270,215,460,300,'none',pale)+line('unrotated-reference',[220,365],[800,365],muted,true)+polygon('rotated-frame',corner,'#ffffff',blue)+polygon('subject-shape',subject,pale,ink)+line('screen-horizontal',axis[0],axis[1],amber)+line('frame-top-axis',corner[0],corner[1])+dot(center)+arc(center,105,0,degrees)+text(145,180,'画面軸まわり '+degrees+'°',30,blue)+text(155,590,'主題・支持面・背景を同じ画面軸で回す',25)+text(155,625,'カメラの高さ・方位は未固定',23,muted);
}
const sceneFrame=()=>rect(150,165,700,430,'#ffffff',ink,'image-frame');
function cropDiagram(frame){
 const areas={face:[215,220,130,105],eyes:[245,244,75,30],upper:[205,205,150,210],hands:[290,345,90,75],feet:[230,455,140,85]},area=areas[frame],labels={face:'顔に相当する範囲',eyes:'目元に相当する小範囲',upper:'主題の上部',hands:'部位と対象の接触点',feet:'支持部と接地点'};
 let shape=rect(190,195,180,365,pale,ink,'subject-shape')+rect(...area,'none',amber,'selected-crop')+line('',[area[0]+area[2],area[1]],[510,240],amber,true)+line('',[area[0]+area[2],area[1]+area[3]],[510,480],amber,true)+rect(510,240,290,240,'#ffffff',blue,'detail-frame');
 if(frame==='hands')shape+=rect(545,295,85,95,pale,ink)+rect(630,350,120,50,pale,ink)+dot([630,370]);
 else if(frame==='feet')shape+=rect(570,275,170,135,pale,ink)+line('',[535,410],[775,410],amber)+dot([650,410]);
 else shape+=rect(550,285,210,150,pale,ink);
 return shape+text(150,615,labels[frame]+'を大きく切り取る',25)+text(150,650,'箱は領域の説明用。顔・手足の作画見本ではない',23,muted);
}
function frameDiagram(wide=false){return sceneFrame()+rect(wide?475:400,wide?405:220,wide?60:200,wide?100:290,pale,ink,'subject-shape')+line('',[165,515],[835,515],muted)+(wide?rect(220,205,90,310,'#eaf0f6',muted)+rect(670,230,90,285,'#eaf0f6',muted):rect(180,195,640,370,'none',amber,'safe-area'))+text(170,630,wide?'主題を小さく置き、場所の広がりを見せる':'姿勢全体・支持面・外周の余白を収める',25);}
function lensDiagram(value){
 let content='';
 if(value==='超広角の遠近')content=rect(240,330,230,235,pale,ink,'near-shape')+rect(605,245,65,100,pale,ink,'far-shape')+line('',[180,585],[650,220],muted,true)+text(240,305,'近い形は大きく',25)+text(595,205,'奥は小さく',25);
 else if(value==='望遠・奥行きを圧縮')content=rect(305,275,155,245,pale,ink,'near-shape')+rect(470,260,140,225,'#eff4f8',ink,'far-shape')+text(265,225,'前後の大きさの差を抑える',25)+text(270,565,'重なりで距離層を分ける',23,muted);
 else {for(const x of [270,380,500,620,730])content+=`<path d="M${x} 190Q${500+(x-500)*.6} 365 ${x} 570" fill="none" stroke="${muted}" stroke-width="3"/>`;for(const y of [225,305,425,520])content+=`<path d="M180 ${y}Q500 ${365+(y-365)*1.5} 820 ${y}" fill="none" stroke="${muted}" stroke-width="3"/>`;content+=rect(450,305,100,120,pale,ink,'subject-shape');}
 return sceneFrame()+content+text(175,650,'投影・距離の説明。高さ・方位の数値は未固定',23,muted);
}
function layoutDiagram(value){
 let body=sceneFrame(),caption='';
 if(value==='遮蔽物の隙間から'){body+=rect(390,275,220,275,pale,ink,'subject-shape')+rect(190,165,170,430,ink,ink,'near-occluder-left')+rect(655,165,150,430,ink,ink,'near-occluder-right');caption='同じ場所の手前の縁から、奥の主題を見る';}
 else if(value==='水平線を低く配置'||value==='水平線を高く配置'){const y=value==='水平線を低く配置'?475:290;body+=rect(153,y,694,592-y,'#e5ecf2','none')+line('horizon',[155,y],[845,y],amber)+rect(435,y-110,110,110,pale,ink,'subject-shape');caption='水平線の画面内の高さ。数値ピッチは未固定';}
 else if(value==='対角線で奥へ導く'){body+=line('depth-diagonal',[195,570],[730,215],amber)+line('',[365,570],[730,215],muted)+line('',[555,570],[730,215],muted)+rect(575,330,95,105,pale,ink,'subject-shape');caption='場面内の線で奥へ導く。画面全体の傾斜とは別';}
 else{body+=line('reflection-plane',[500,200],[500,570],blue)+rect(250,270,130,165,pale,ink,'original-shape')+rect(620,270,130,165,'#edf3f8',muted,'reflected-shape')+line('',[380,350],[620,350],muted,true)+text(255,470,'対象',23)+text(620,470,'反射像',23)+text(460,235,'反射面',23,blue);caption='同じ場所の反射面と、対応する元の対象';}
 return body+text(150,650,caption,23,muted);
}
function specialDiagram(item,spec){
 if(item.value==='鳥の目・広い俯瞰')return pitchDiagram(50,'illustrative-optical-axis',false)+text(150,180,'広い範囲を見渡す',25);
 if(item.value==='地面すれすれの視点')return rect(620,260,125,300,pale,ink,'subject-shape')+line('support-surface',[170,560],[840,560],muted)+line('illustrative-optical-axis',[240,525],[680,410])+camera([240,525],-15)+text(190,610,'支持面近くにカメラ。数値の見上げ角は未固定',24);
 if(item.value==='肩越しの視点')return sceneFrame()+rect(490,255,180,275,pale,ink,'subject-shape')+rect(165,395,270,195,ink,ink,'foreground-edge')+line('',[280,540],[565,325],blue,true)+text(180,640,'手前の縁・奥の対象を同じ視線へつなぐ',25);
 if(spec.cameraFacing==='rear')return yawDiagram(180,{fixed:false,rear:true});
 if(spec.kind==='crop')return cropDiagram(spec.frame);
 if(spec.kind==='frame')return frameDiagram(spec.frame==='wide');
 if(spec.kind==='lens')return lensDiagram(item.value);
 if(spec.kind==='layout')return layoutDiagram(item.value);
 if(spec.kind==='subjective')return sceneFrame()+rect(360,205,280,365,pale,ink,'subject-shape')+text(180,640,'鑑賞者の目前に主題。未指定の手は追加しない',25);
 throw new Error('Unclassified angle diagram: '+item.value);
}
export function angleDiagramKind(item){const spec=angleConstraint(item.value);if(spec.axes.roll!==undefined)return 'roll';if(spec.axes.yaw!==undefined&&spec.axes.pitch===undefined)return 'yaw';if(spec.axes.pitch!==undefined)return 'pitch';return spec.kind;}
function levelFrontInset(){const target=[845,450],at=[845,535];return rect(730,385,235,160,'#ffffff',pale)+rect(825,425,40,40,pale,ink)+line('azimuth-axis',at,target)+camera(at,90)+text(743,413,'上面図：正面 0°',20,blue);}
export function renderTechnicalAngleDiagram(item){
 const spec=angleConstraint(item.value),kind=angleDiagramKind(item),subtitle=kind==='pitch'?'横から見たカメラ配置':kind==='yaw'?'上から見たカメラ配置':kind==='roll'?'画面軸の回転':spec.kind==='crop'?'接写する範囲の説明':spec.kind==='lens'?'遠近・投影の説明':'位置・画角・構造の説明';
 const body=(kind==='pitch'?pitchDiagram(spec.axes.pitch):kind==='yaw'?yawDiagram(spec.axes.yaw):kind==='roll'?rollDiagram(spec.axes.roll):specialDiagram(item,spec))+(kind==='pitch'&&spec.axes.yaw!==undefined?levelFrontInset():'');
 const fixed=Object.entries(spec.axes).map(([axis,value])=>axis+'='+value+'°').join(' / ')||'数値のカメラ軸は未固定';
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="760" viewBox="0 0 1000 760" role="img" aria-labelledby="diagram-title diagram-desc" data-diagram-kind="${kind}"><title id="diagram-title">${esc(item.value)}：${subtitle}</title><desc id="diagram-desc">カメラと構図の技術図。主題は箱で示す。${esc(fixed)}。人物・画風・完成投影の作画見本ではありません。</desc><rect width="1000" height="760" rx="18" fill="#f8fbfe"/>${text(38,52,item.value,31)}${text(38,92,subtitle+' / カメラ・構図の技術図',23,muted)}${body}${text(38,715,'箱は説明用の主題形。完成作品・人物・画風の見本ではありません。',23,muted)}</svg>\n`;
}
export function renderAngleDiagram(item){return renderAnglePreview(item,angleConstraint(item.value));}
export async function generateAngleDiagrams(){
 for(const item of angleItems){
  await fs.writeFile(new URL('../'+item.file,import.meta.url),renderAngleDiagram(item));
  await fs.writeFile(new URL('../'+item.detailFile,import.meta.url),renderTechnicalAngleDiagram(item));
 }
 return angleItems.length;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])console.log('Generated '+await generateAngleDiagrams()+' classified camera and composition diagrams.');
