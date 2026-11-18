import { roomStage } from './world.js?v=20261118-spaces-5';

function element(tag, css = '', title = '') {
  const item = document.createElement(tag);
  item.className = css;
  item.textContent = title;
  return item;
}

function numberRoom(slot,roomsPerFloor) {
  return `${Math.floor((slot - 1) / roomsPerFloor) + 1}${String((slot-1)%roomsPerFloor+1).padStart(2,'0')}`;
}

export function cutaway(container, catalog, demo, {avatar, visit, enter, space}) {
  const floors = catalog?.floors ?? 12;
  const roomsPerFloor = catalog?.perFloor ?? 12;
  const bySlot = new Map((catalog?.rooms ?? []).map(room=>[room.slot,room]));
  container.style.setProperty('--bays',String(roomsPerFloor));
  const building = element('div','sectioned-building');
  const roof = element('div','sectioned-roof');
  const sign = element('span','roof-mark','ATELIER');
  const terrace = element('div','roof-terrace');
  for(let i=0;i<7;i++) terrace.append(element('i','roof-light'));
  const model = element('button','bay occupied viewing-room');
  model.type='button';
  model.setAttribute('aria-label',space?'最上階のオーナーズ・アトリエを開く':'展望ラウンジの見学室を開く');
  model.append(roomStage(demo,avatar(demo),{mini:true}),element('span','bay-address',space?`${floors+2}F オーナーズ・アトリエ`:'展望ラウンジ'));
  model.addEventListener('click',()=>space?space('owner'):visit(demo));
  roof.append(sign,model,terrace);
  building.append(roof);
  function publicFloor(level,label,areas){
    const row=element('div','sectioned-floor public-floor');row.dataset.level=level;
    row.append(element('span','floor-marker',label));
    const bays=element('div','public-bays');
    for(const [id,title,image] of areas){
      const bay=element('button','bay public-bay');bay.type='button';bay.setAttribute('aria-label',title);
      const photo=element('img');photo.src=`./assets/${image}.webp`;photo.alt='';photo.loading='lazy';
      bay.append(photo,element('span','bay-address',title));bay.addEventListener('click',()=>space(id));bays.append(bay);
    }
    row.append(bays);return row;
  }
  if(space)building.append(publicFloor('sky',`${floors+1}F`,[['sky','天空ラウンジ','sky-lounge']]));
  for(let floor=floors;floor>=1;floor--){
    const row=element('div','sectioned-floor');
    row.dataset.level=String(floor);
    row.append(element('span','floor-marker',`${floor}F`));
    const bays=element('div','floor-bays');
    for(let unit=1;unit<=roomsPerFloor;unit++){
      const slot=(floor-1)*roomsPerFloor+unit;
      const number=numberRoom(slot,roomsPerFloor);
      const room=bySlot.get(slot);
      const bay=element('button',room?'bay occupied':'bay vacant');
      bay.type='button';
      const summary=room?.title||room?.name||(catalog?'空室':'入居情報を読み込み中');
      bay.setAttribute('aria-label',`${number}号室 ${summary}`);
      bay.title=`${number}号室 ${summary}`;
      if(room){
        const scene={
          id:room.id,noteId:room.noteId,avatarVersion:room.avatarVersion,
          profile:{photo:room.photo},
          design:{theme:room.theme,world:room.world,avatarMode:room.avatarMode,light:room.light},
        };
        bay.append(roomStage(scene,avatar(scene),{mini:true}));
        bay.addEventListener('click',()=>visit(room));
      } else {
        bay.dataset.variant=String((floor*7+unit*3)%5);
        bay.disabled=!catalog;
        bay.append(element('span','vacant-wall'),element('span','vacant-light'),element('span','vacant-floor'));
        bay.addEventListener('click',()=>enter(slot));
      }
      bay.append(element('span','bay-address',number));
      bays.append(bay);
    }
    row.append(bays);
    building.append(row);
  }
  if(space){
    building.append(publicFloor('lobby','1F 共用',[['lobby','エントランス・ラウンジ','entrance-lounge'],['concierge','管理人室','concierge']]));
    building.append(publicFloor('parking','B1',[['parking','地下駐車場','garage']]));
    building.append(publicFloor('boiler','B2',[['boiler','ボイラー・設備室','plant-room']]));
    building.append(publicFloor('seismic','B3',[['seismic','免震構造・見学回廊','seismic-gallery']]));
  }
  building.append(element('div','sectioned-foundation'));
  container.replaceChildren(building);
}

export function makeElevator(dialog) {
  const display=dialog.querySelector('#lift-floor');
  const label=dialog.querySelector('#lift-status');
  const skip=dialog.querySelector('#lift-skip');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  let current=1;
  let timer=0;
  let ride=null;

  function finish() {
    if(!ride) return;
    clearTimeout(timer);
    const {floor,arrive}=ride;
    ride=null;
    current=floor;
    dialog.close();
    arrive();
  }
  skip.addEventListener('click',finish);
  dialog.addEventListener('cancel',event=>{
    event.preventDefault();
    finish();
  });
  function travel(floor,arrive) {
    if(ride) return;
    if(reduce.matches||floor===current){ current=floor; arrive(); return; }
    const from=current;
    const direction=Math.sign(floor-from);
    const distance=Math.abs(floor-from);
    const interval=Math.min(355,1240/distance);
    let step=0;
    ride={floor,arrive};
    dialog.dataset.phase='closing';
    const labelFloor=n=>n<0?`B${-n}`:n===0?'G':`${n}F`;
    display.textContent=labelFloor(from);
    label.textContent=`${labelFloor(floor)}へ ${direction>0?'↑':'↓'}`;
    dialog.showModal();
    function advance() {
      if(step===0) dialog.dataset.phase='moving';
      step++;
      display.textContent=labelFloor(from+step*direction);
      if(step<distance){ timer=setTimeout(advance,interval); return; }
      label.textContent=`${labelFloor(floor)}に到着`;
      dialog.dataset.phase='opening';
      timer=setTimeout(finish,500);
    }
    timer=setTimeout(advance,520);
  }
  travel.setFloor=floor=>{if(!ride) current=floor;};
  return travel;
}

const stories=[
  {title:'風で飛んできたしおり',intro:'屋上の戸を開けると、古いしおりが一枚、足もとに落ちました。裏には「続きは本棚で」と書かれています。',arrival:'本棚をのぞいてみてください。しおりを挟みたくなる一文に出会えるかもしれません。'},
  {title:'最後まで灯っていた窓',intro:'雨が上がったあとも、一部屋だけ明かりが灯っています。エレベーターの行き先表示が、その階で止まりました。',arrival:'明かりの奥に、書き手が残したページがあります。部屋の本棚から一つ開けます。'},
  {title:'ロビーに落ちた一枚の切符',intro:'ロビーのマットに見慣れない切符が落ちています。印字されている行き先は、まだ訪ねたことのない扉です。',arrival:'切符の行き先に着きました。本棚の一冊を開いて、この部屋の書き手を訪ねてみます。'},
];
export function dailyStory(catalog, currentRoom) {
  const today=Math.floor((Date.now()+9*3600000)/86400000);
  const story=stories[today%stories.length];
  const available=(catalog?.rooms ?? []).filter(room=>room.id!==currentRoom)
    .sort((a,b)=>a.slot-b.slot);
  return {...story,room:available.length ? available[today%available.length] : null};
}
