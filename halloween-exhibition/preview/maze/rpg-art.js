// Original, locally bundled Halloween RPG art. No external/franchise art requests.
export const ART_FILES = {
  playerAtlas:'lantern-keeper-atlas.webp',pumpkin:'pumpkin.webp',ghost:'ghost.webp',bat:'bat.webp',zombie:'zombie.webp',vampire:'vampire.webp',battle:'battle-library.webp',
  bookcase:'bookcase.webp',window:'window.webp',column:'column.webp',pumpkins:'pumpkins.webp',floor:'floor.webp',
};
export const ART_BOUNDS={zombie:[106,34,330,443],vampire:[102,35,381,439],pumpkin:[41,28,441,457],ghost:[101,29,322,450],bat:[24,56,470,360],bookcase:[10,14,437,634],window:[19,14,309,623],column:[24,8,285,626],pumpkins:[19,17,619,319]};
export const ART_ANCHORS={zombie:{anchorX:(284-106)/330,anchorY:1},vampire:{anchorX:(285-102)/381,anchorY:1}};
export const PLAYER_ATLAS={cell:256,columns:4,rows:4,anchorX:128,anchorY:238,contentHeight:218,directions:['down','left','right','up']};
export function createArtLibrary({loadImage=src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=src;})}={}){
  const images={},failures=[];let version=0;
  const ready=Promise.all(Object.entries(ART_FILES).map(async([key,file])=>{try{const image=await loadImage(new URL(`./assets/rpg/${file}`,import.meta.url).href);images[key]=ART_BOUNDS[key]?{image,frame:ART_BOUNDS[key],width:ART_BOUNDS[key][2],height:ART_BOUNDS[key][3],...ART_ANCHORS[key]}:image;version++;}catch{failures.push(key);}}));
  return {images,failures,ready,get version(){return version;}};
}
export function drawArtSprite(c,sprite,x,y,height,{alpha=1,flip=false,scaleX=1,scaleY=1,rotation=0}={}){
  if(!sprite)return false;
  const image=sprite.image||sprite,frame=sprite.frame||[0,0,image.width,image.height],drawHeight=height*(frame[3]/(sprite.contentHeight||frame[3])),width=drawHeight*(frame[2]/frame[3]);
  const ax=sprite.anchorX??.5,ay=sprite.anchorY??1;
  c.save();c.globalAlpha=alpha;c.translate(x,y);c.rotate(rotation);c.scale((flip?-1:1)*scaleX,scaleY);c.drawImage(image,...frame,-width*ax,-drawHeight*ay,width,drawHeight);c.restore();return true;
}
export function playerFrame(facing,walking,phase){const row=Math.max(0,PLAYER_ATLAS.directions.indexOf(facing)),column=walking?Math.floor(((phase%(Math.PI*2)+Math.PI*2)%(Math.PI*2))/(Math.PI*2)*4):0;return {row,column,frame:[column*256,row*256,256,256]};}
export function playerPose(art,facing,walking,phase){if(!art.images.playerAtlas)return null;return {image:art.images.playerAtlas,...playerFrame(facing,walking,phase),contentHeight:PLAYER_ATLAS.contentHeight,anchorX:.5,anchorY:238/256};}
