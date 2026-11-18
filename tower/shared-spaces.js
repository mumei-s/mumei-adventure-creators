import { roomStage } from './world.js?v=20261118-speed';
import { facilityFloors, facilityActorHeight } from './facility-floors.js?v=20261118-city2';
import { readTraveler, readWalkDraft, rememberWalker, TOWER_API, avatarImageUrl } from './avatar-travel.js?v=20261118';
import { hostPortrait, autoResidentWalker } from '../halloween-exhibition/preview/diorama-city/host-avatar.js?v=202611181820';

import { vehicleStudio } from './vehicle-studio.js?v=20261118-speed';

export const sharedSpaces = {
  owner: { title:'オーナーズ・アトリエ', floor:14, image:'panorama-suite', note:'天空ラウンジの一つ上にある、タワーオーナーの専用室です。', scene:'天空ラウンジより上のオーナーズ・アトリエ。大きな窓と作品、運河都市のパノラマ。' },
  sky: { title:'天空ラウンジ', floor:13, image:'sky-lounge', note:'住居階の上に広がる大空間。窓辺の席と中央の広場を自由に歩けます。', scene:'吹き抜けの巨大な天空ラウンジ。窓一面に運河都市、真鍮の照明とゆったり集えるソファ。' },
  lobby: { title:'エントランス・ラウンジ', floor:1, image:'entrance-lounge', note:'自動ドアの先に広がる１階のラウンジ。管理人室と各階へつながっています。', scene:'自動ドアを抜けた高級タワーの大きなエントランス。ラウンジの奥にエレベーター、窓辺にゆったりしたソファ。' },
  concierge: { title:'管理人室', floor:1, image:'concierge', note:'防犯モニターでエントランス、車寄せ、地下駐車場、駐輪場のゲーム内風景を確認できます。', scene:'木と真鍮のコンシェルジュ室。防犯モニターにエントランスと地下駐車場の風景が映る。' },
  driveway: { title:'車寄せ', floor:0, image:'driveway', note:'街からタワーへ続く車寄せ。雨上がりの床に玄関の灯りが映っています。', scene:'ブルーアワーのタワー車寄せ。大きな庇と石床、ガラスのエントランス。' },
  bicycle: { title:'駐輪コート', floor:0, image:'bicycle-court', note:'号室ごとの自転車区画。ここで自分の自転車をつくって登録できます。', scene:'青い時間のガラスと青銅の駐輪コート。登録した自転車を号室の区画に置く。' },
  parking: { title:'地下駐車場', floor:-1, image:'garage', note:'号室と同じ番号の専用区画。車両画像を登録すると自分の区画に展示されます。', scene:'高級タワーの広い地下駐車場。間接照明、コンクリートの柱、号室に対応した専用区画。' },
  parkingTower: { title:'立体駐車場', floor:0, image:'parking-decks', note:'タワーの車寄せに面した立体駐車場。地下とは別に、号室ごとの車両を登録できます。', scene:'運河都市のタワーに併設された立体駐車場。青い時間の車寄せと、号室ごとの愛車。' },
  motorcycle: { title:'バイク置き場', floor:0, image:'motorcycle-bays', note:'自転車と分かれたバイクの専用区画。号室に合わせて愛車を置けます。', scene:'高級タワーの屋根付きバイク置き場。ガラスと青銅、足元の間接照明。' },
  boiler: { title:'ボイラー・設備室', floor:-2, image:'plant-room', note:'見学通路から給湯ボイラー、配管、空調設備を眺められます。案内ボタンで設備を調べられます。', scene:'タワー地下のボイラー室。ステンレスの配管と給湯タンクが並び、見学用の手すりから設備を眺める。' },
  seismic: { title:'免震構造・見学回廊', floor:-3, image:'seismic-gallery', note:'建物を支える免震層の見学回廊。積層ゴムとダンパーの動きを模型演出で確認できます。', scene:'地下免震層のガラス見学回廊。大きな積層ゴム支承とダンパー、連続する基礎構造。' },
};
export const floorLabel = floor => floor < 0 ? `B${-floor}` : floor === 0 ? 'G' : `${floor}F`;
export function parkingNumber(slot, perFloor=12) {
  return Number.isInteger(slot)&&slot>0 ? `${Math.floor((slot-1)/perFloor)+1}${String((slot-1)%perFloor+1).padStart(2,'0')}` : '';
}
export function vehicleImageUrl(room,kind,version) {
  const url=new URL(TOWER_API);
  url.search=new URLSearchParams({view:'vehicle',id:room,space:kind,v:version});
  return url.href;
}
const make=(tag,css='',text='')=>{const item=document.createElement(tag);item.className=css;item.textContent=text;return item;};
const action=(text,call,css='button outline')=>{const item=make('button',css,text);item.type='button';item.addEventListener('click',call);return item;};
const kinds={car:'車',motorcycle:'バイク',bicycle:'自転車'};

export function bindSharedSpaces({getCatalog,getOwner,loadOwner,loadFacilities,saveVehicle,setEngineer,setManager,enterTower,visitRoom,illustrate,travel}) {
  const dialog=document.getElementById('shared-dialog');
  const content=document.getElementById('shared-content');
  const title=document.getElementById('shared-title');
  const details=document.getElementById('shared-details');
  const message=document.getElementById('shared-status');
  const dock=document.getElementById('shared-controls');
  const nav=document.getElementById('shared-nav');
  const doors=document.getElementById('entrance-doors');
  let controller, current='', doorTimer=0, facilities=[], session=null, cachedActor=null;
  const savedVersions=new Map();
  function getActor(){
    const owner=getOwner(),traveler=readTraveler();
    if(traveler&&(!owner?.id||traveler.id===owner.id&&(!owner.noteId||traveler.noteId===owner.noteId)))return traveler;
    return cachedActor&&owner?.id===cachedActor.id?cachedActor:null;
  }
  const announce=text=>{message.textContent=text;};
  const levelFor=id=>id==='sky'?(getCatalog()?.floors??12)+1:id==='owner'?(getCatalog()?.floors??12)+2:sharedSpaces[id].floor;
  const facilitySpaces=['concierge','parking','parkingTower','bicycle','motorcycle','boiler'];
  function cancelDoors(){
    clearTimeout(doorTimer);
    doors.hidden=true;
  }
  function entrance(done) {
    cancelDoors();
    if(document.body.dataset.gameMotion==='reduced'||matchMedia('(prefers-reduced-motion: reduce)').matches){done();return;}
    doors.hidden=false;
    doors.classList.remove('doors-open');
    void doors.offsetWidth;
    doors.classList.add('doors-open');
    doorTimer=setTimeout(()=>{doors.hidden=true;done();},850);
  }
  function hideSpace(){
    session=null;
    cancelDoors();
    controller?.abort();
    controller=null;
    if(dialog.open)dialog.close();
  }
  function removeSpaceFromUrl(){
    const url=new URL(location.href);
    if(!url.searchParams.has('space'))return;
    url.searchParams.delete('space');
    const state={...history.state};
    delete state.towerSpace;
    history.replaceState(state,'',url);
  }
  function goBack(){
    const hasPreviousSpaceEntry=history.state?.towerSpace===true;
    hideSpace();
    if(hasPreviousSpaceEntry)history.back();
    else removeSpaceFromUrl();
  }
  function recordFacility(room){
    if((savedVersions.get(room.id)??0)>room.version)return;
    savedVersions.set(room.id,room.version);
    const person={id:room.id,slot:room.slot,name:room.profile.name,noteId:room.noteId,
      engineer:room.design.engineer===true,manager:room.design.manager===true,transport:room.design.transport??{}};
    // A request begun before this write may still return its older public snapshot.
    if(session?.updates)session.updates.set(room.id,person);
    facilities=facilities.filter(item=>item.id!==room.id).concat(person);
    session?.refresh?.();
  }
  function guests(stage) {
    const links=make('div','guest-links');
    details.append(links);
    let lastCatalog;
    return ()=>{
      const catalog=getCatalog();
      if(catalog===lastCatalog)return;
      lastCatalog=catalog;
      stage.querySelectorAll('.lounge-guest').forEach(guest=>guest.remove());
      links.replaceChildren();
      const actor=getActor();
      const floor=facilityFloors[stage.dataset.space];
      const rooms=(catalog?.rooms??[]).filter(room=>(room.avatarVersion||room.photo)&&room.id!==getOwner()?.id&&room.noteId!==actor?.noteId).slice(0,floor.guests.length);
      if(rooms.length)links.append(make('p','muted','名前を選ぶと、その住人の部屋を訪ねられます。'));
      rooms.forEach((room,index)=>{
        const guest=make('span','lounge-guest');
        const [u,v]=floor.guests[index],height=facilityActorHeight(floor,v);
        guest.style.left=`${100*u}%`;guest.style.top=`${100*v}%`;
        guest.style.height=`${100*height}%`;guest.style.width=`${100*height*.56/floor.aspect}%`;
        guest.style.zIndex=String(21+Math.round(v*100));
        const image=make('img');
        image.alt=room.name||room.noteId;
        if(room.avatarVersion)image.crossOrigin='anonymous';
        image.src=room.avatarVersion ? avatarImageUrl(room.id,room.avatarVersion) : room.photo;
        guest.append(image,make('small','',room.name||room.noteId));
        stage.append(guest);
        if(room.avatarVersion)autoResidentWalker(image,{atlas:room.world?.atlas===true})(0,false);
        links.append(action(`${parkingNumber(room.slot,catalog.perFloor)} · ${room.name||room.noteId}`,()=>{hideSpace();visitRoom(room.id);}));
      });
    };
  }
  function cameras(stage) {
    const feeds=[['エントランス','entrance-lounge'],['車寄せ','driveway'],['地下駐車場','garage'],['駐輪場','bicycle-court']];
    const wall=make('div','concierge-wall-screens');
    wall.setAttribute('aria-hidden','true');
    for(const [,image] of feeds){
      const screen=make('img');screen.alt='';screen.decoding='async';screen.src=`./assets/monitors/${image}.webp`;
      wall.append(screen);
    }
    stage.append(wall);
    const clocks=new Set();
    function makeFeeds(container,expanded=false){
      for(const [name,image] of feeds){
        const panel=make('span','security-feed');
        const photo=make('img');photo.alt=name;photo.decoding='async';photo.src=`./assets/${expanded?'':'monitors/'}${image}.webp`;
        const time=make('time');
        panel.append(photo,make('span','',name),time);
        container.append(panel);clocks.add(time);
      }
      update();
    }
    function update(){
      const stamp='REC '+new Date().toLocaleTimeString('ja-JP',{timeZone:'Asia/Tokyo'});
      for(const clock of clocks)clock.textContent=stamp;
    }
    function enlarge(){
      const viewer=make('dialog','camera-viewer');
      viewer.setAttribute('aria-label','管理人室の防犯モニター');
      const close=action('← 管理人室に戻る',()=>viewer.close());
      const grid=make('div','camera-grid');
      viewer.append(close,grid);dialog.append(viewer);
      makeFeeds(grid,true);viewer.showModal();
      const dismiss=()=>viewer.close();
      const signal=controller.signal;
      viewer.addEventListener('close',()=>{
        signal.removeEventListener('abort',dismiss);
        for(const clock of grid.querySelectorAll('time'))clocks.delete(clock);
        viewer.remove();
      },{once:true});
      signal.addEventListener('abort',dismiss,{once:true});
    }
    const bank=action('',event=>{event.stopPropagation();enlarge();},'security-bank');
    bank.setAttribute('aria-label','防犯モニター4画面を拡大');
    makeFeeds(bank);stage.closest('.shared-viewport').append(bank);
    const timer=setInterval(update,1000);controller.signal.addEventListener('abort',()=>clearInterval(timer),{once:true});
    details.append(action('防犯モニター4画面を拡大',enlarge),make('p','muted','ゲーム内の風景を使った防犯カメラ演出です。実際のカメラには接続しません。'));
  }
  const roles={
    manager:{title:'タワー管理人',join:'管理人になる',leave:'管理人を辞める',joined:'タワー管理人になりました。',left:'タワー管理人を辞めました。',save:setManager},
    engineer:{title:'タワー技術部',join:'タワー技術部に参加する',leave:'技術部から退部する',joined:'タワー技術部に参加しました。',left:'技術部から退部しました。',save:setEngineer},
  };
  function rolePanel(role){
    const spec=roles[role],view=session,owner=getOwner();
    const roster=make('p','muted');
    details.append(roster);
    let toggle,busy=false;
    function refresh(){
      const ready=view.facilityStatus==='ready';
      const members=facilities.filter(person=>person[role]).map(person=>person.name||person.noteId).join('、');
      roster.textContent=spec.title+' · '+(members||(ready?'参加者募集中':view.facilityStatus==='error'?'名簿を取得できませんでした':'名簿を確認中…'));
      if(toggle){
        const joined=Boolean(facilities.find(person=>person.id===owner.id)?.[role]);
        toggle.disabled=busy||!ready;
        toggle.textContent=joined?spec.leave:spec.join;
        toggle.setAttribute('aria-pressed',String(joined));
      }
    }
    if(owner?.id){
      toggle=action(spec.join,async()=>{
        if(busy||view!==session||view.facilityStatus!=='ready')return;
        const desired=!facilities.find(person=>person.id===owner.id)?.[role];
        busy=true;refresh();
        try{
          const room=await loadOwner();
          if(view!==session)return;
          if(getOwner()?.id!==room.id||!room.isOwner)throw new Error('owner_required');
          const updated=await spec.save(room,desired);
          recordFacility(updated);
          if(view===session)announce(updated.design[role]?spec.joined:spec.left);
        }catch(error){
          if(view===session)announce(error.code==='conflict'?'部屋が更新されました。もう一度お試しください。':'参加情報を保存できませんでした。接続と部屋の鍵を確認してください。');
        }finally{busy=false;if(view===session)refresh();}
      });details.append(toggle);
    }else{
      const text=role==='manager'?'入居して管理人に参加':'入居して技術部に参加';
      details.append(action(text,()=>{hideSpace();removeSpaceFromUrl();enterTower();}));
    }
    return refresh;
  }
  function equipment(stage,id) {
    if(id==='boiler'){
      const gauges=make('div','plant-gauges');
      for(const [label,value] of [['給湯','62°C'],['循環','稼働中'],['空調','運転中']])gauges.append(make('span','',`${label} ${value}`));
      stage.append(gauges);
      for(const [label,text] of [['ボイラーを見る','給湯ボイラーでつくったお湯が断熱配管を通って住居階へ送られます。'],['配管をたどる','往きと戻りの配管が巡り、ポンプが循環を支えています。'],['空調を調べる','奥の熱交換器と空調機が共用部の空気を整えています。']])details.append(action(label,()=>announce(text)));
      return rolePanel('engineer');
    }else{
      let timer=0;
      details.append(action('免震の動きを見る',()=>{
        stage.classList.remove('isolation-demo');void stage.offsetWidth;stage.classList.add('isolation-demo');
        model.hidden=false;clearTimeout(timer);timer=setTimeout(()=>{model.hidden=true;},4000);
        announce('地面側の揺れと、免震支承によってゆっくり動く建物側を比べる模型演出です。');
      }));
      const model=make('div','isolation-model');
      model.hidden=true;controller.signal.addEventListener('abort',()=>clearTimeout(timer),{once:true});
      model.append(make('span','isolation-building','建物'),make('span','isolation-bearing'),make('span','isolation-ground','地盤'));
      stage.append(model);
    }
  }
  function parking(stage,id){
    const owner=getOwner(),view=session;
    const parkingSpace={parking:'garage',parkingTower:'parkingTower',bicycle:'bicycle',motorcycle:'motorcycle'}[id];
    const vehicleKind=id==='bicycle'?'bicycle':id==='motorcycle'?'motorcycle':'car';
    const maker=make('details','vehicle-maker');
    maker.append(make('summary','','自分の'+kinds[vehicleKind]+'をつくる'),vehicleStudio(vehicleKind,{
      id:owner?.noteId || getActor()?.noteId,space:id,
      onRegister:()=>{maker.open=false;registration.scrollIntoView({block:'center'});registration.focus({preventScroll:true});},
    }));
    const registration=make('div','vehicle-registration');
    registration.id='vehicle-registration';registration.tabIndex=-1;
    details.append(maker);
    const list=make('div','parking-grid');
    const floors=make('select');floors.setAttribute('aria-label','駐車区画の階を選ぶ');
    const caption=make('p','parking-section');
    let chosen=false,selectionRevision=0,ownLabel,featuredSlot=0;
    const draw=()=>{
      const catalog=getCatalog(),count=catalog?.floors??12,per=catalog?.perFloor??12;
      const ownSlot=catalog?.rooms?.find(room=>room.id===owner?.id)?.slot;
      if(ownLabel)ownLabel.textContent=ownSlot?`自分の${parkingNumber(ownSlot,per)}号室に登録`:'自分の号室に登録';
      const prior=Number(floors.value)||1;
      if(floors.options.length!==count){
        floors.replaceChildren();
        for(let n=1;n<=count;n++)floors.append(new Option(`${n}階の号室`,String(n)));
      }
      floors.value=String(Math.min(count,!chosen&&ownSlot?Math.ceil(ownSlot/per):prior));
      const start=(Number(floors.value)-1)*per+1;
      const floor=facilityFloors[id],vehicles=[];
      list.replaceChildren();
      for(let slot=start;slot<start+per;slot++){
        const room=catalog?.rooms?.find(item=>item.slot===slot),number=parkingNumber(slot,per);
        const stored=facilities.find(item=>item.id===room?.id)?.transport?.[parkingSpace];
        const bay=make('div','parking-bay');
        bay.dataset.slot=String(slot);bay.append(make('strong','',`${number}号室`));
        if(stored){
          const item=stored;
          const image=make('img');image.src=vehicleImageUrl(room.id,parkingSpace,item.version);image.alt=`${number}号室の${kinds[item.kind]}`;image.loading='lazy';bay.append(image);
          const show=action('実景で見る',()=>{featuredSlot=slot;paintVehicles();},'bay-view');
          show.setAttribute('aria-label',`${number}号室の${kinds[item.kind]}を実景で見る`);
          bay.append(show);vehicles.push({slot,image,show});
        }else{
          const status=!catalog?'入居状況確認中':!room?'空室':view.facilityStatus==='ready'?'車両未登録':view.facilityStatus==='error'?'未確認':'車両確認中';
          bay.append(make('span','muted',status));
        }
        list.append(bay);
      }
      function paintVehicles(){
        stage.querySelectorAll('.parked-vehicle').forEach(item=>item.remove());
        caption.hidden=!vehicles.length;
        if(!vehicles.length)return;
        const chosenVehicle=vehicles.find(item=>item.slot===featuredSlot)??vehicles.find(item=>item.slot===ownSlot)??vehicles[0];
        const bays=floor.parking.length;
        const first=start+Math.floor((chosenVehicle.slot-start)/bays)*bays;
        const last=Math.min(first+bays-1,start+per-1);
        caption.textContent=`実景の区画　${parkingNumber(first,per)}〜${parkingNumber(last,per)}号室`;
        for(const {slot,image,show} of vehicles){
          const visible=slot>=first&&slot<=last;
          show.setAttribute('aria-pressed',String(visible));
          if(!visible)continue;
          const [u,v]=floor.parking[slot-first],height=facilityActorHeight(floor,v)*.84;
          const parked=make('img','parked-vehicle');parked.src=image.src;parked.alt=image.alt;
          parked.style.left=`${100*u}%`;parked.style.top=`${100*v}%`;
          parked.style.height=`${100*height}%`;parked.style.width=`${100*height*1.95/floor.aspect}%`;
          parked.style.zIndex=String(20+Math.round(v*100));stage.append(parked);
        }
      }
      paintVehicles();
    };
    floors.addEventListener('change',()=>{chosen=true;selectionRevision++;draw();});details.append(floors,caption,list,registration);
    if(!owner?.id){registration.append(make('p','muted','自分の部屋に入居すると、保存した画像を号室の区画に登録できます。'));
      const enter=make('a','button outline','自分の部屋をつくる');enter.href='./#prompt-play';registration.append(enter);
      return draw;}
    const form=make('form','vehicle-upload');
    ownLabel=make('strong','vehicle-slot-label');
    const kind=make('select');kind.setAttribute('aria-label','登録する車両');
    kind.append(new Option(kinds[vehicleKind],parkingSpace));
    const label=make('label','','自分の車両画像（透過PNG推奨）');
    const file=make('input');file.type='file';file.accept='image/png,image/webp,image/jpeg';label.append(file);
    const save=make('button','button primary','号室の区画に保存');save.type='submit';
    const remove=action('自分の区画から車両を外す',()=>void store(null));
    form.append(ownLabel,kind,label,save,remove);registration.append(form);
    let busy=false;
    async function store(image){
      if(busy)return;
      const revision=selectionRevision;
      busy=true;save.disabled=remove.disabled=true;announce('車両を保存しています…');
      try{
        const room=await loadOwner();
        if(view!==session)return;
        if(getOwner()?.id!==room.id||!room.isOwner)throw new Error('owner_required');
        const updated=await saveVehicle(room,kind.value,image);
        if(view===session){
          if(selectionRevision===revision){
            featuredSlot=updated.slot;chosen=false;floors.value=String(Math.ceil(updated.slot/(getCatalog()?.perFloor??12)));
          }
          file.value='';
        }
        recordFacility(updated);
        if(view!==session)return;
        const number=parkingNumber(updated.slot,getCatalog()?.perFloor);
        announce(image?`${number}号室の車両を保存しました。`:`${number}号室の車両を外しました。`);
      }catch(error){if(view===session)announce(error.code==='conflict'?'部屋が更新されました。もう一度保存できます。':'車両を保存できませんでした。画像と部屋の鍵を確認してください。');}
      finally{busy=false;save.disabled=remove.disabled=false;}
    }
    form.addEventListener('submit',event=>{event.preventDefault();if(!file.files[0]){announce('保存する車両画像を選んでください。');return;}void store(file.files[0]);});
    return draw;
  }
  function render(id,verifiedRoom){
    const space=sharedSpaces[id],view=session;
    const traveler=getActor();
    const room={id:'showroom',sharedSpace:id,profile:{name:space.title,articles:[]},
      design:{title:space.title,theme:'cinema',light:'natural',avatarMode:'resident'},draftInterior:{source:`./assets/${space.image}.webp`}};
    const scene=roomStage(room,hostPortrait,{traveler,signal:controller.signal,inputRoot:dialog,preparedInterior:view.interior});
    const stage=scene.querySelector('.world-stage');stage.classList.add('shared-stage');stage.dataset.space=id;
    details.replaceChildren(make('p','',space.note));
    const controls=scene.querySelector('.world-control-dock');
    dock.hidden=false;dock.replaceChildren(controls);content.replaceChildren(scene);
    let actorReady;
    if(getOwner()?.id&&!traveler){
      stage.querySelector('.world-resident').hidden=true;
      const loading=make('p','muted','登録済みアバターを読み込んでいます…');details.prepend(loading);
      actorReady=(verifiedRoom?Promise.resolve(verifiedRoom):loadOwner()).then(room=>{
        if(view!==session||getOwner()?.id!==room.id)return;
        if(!room.isOwner)throw new Error('owner_required');
        const custom=room.design.avatarMode==='custom'&&Boolean(room.avatarVersion);
        const profile=room.design.avatarMode==='profile'&&Boolean(room.profile.photo);
        cachedActor={id:room.id,noteId:room.noteId,name:room.design.avatarName||room.profile.name,custom,
          atlas:custom&&room.design.world?.atlas===true,profile,
          source:custom?avatarImageUrl(room.id,room.avatarVersion):profile?room.profile.photo:new URL('./assets/resident.webp',location.href).href};
        if(custom)rememberWalker(cachedActor);
        scene.setTraveler(cachedActor);
        loading.remove();
      }).catch(()=>{if(view===session)loading.textContent='登録済みアバターを読み込めませんでした。施設を開き直すと再試行できます。';});
    }
    if(id==='lobby'||id==='driveway'){
      const entry=make('a','button primary lobby-intake','入居の準備を始める');
      entry.href='../admission/tower/#prompt-play';
      scene.querySelector('.shared-viewport').append(entry);
      details.prepend(make('p','', 'アバターと部屋を作り、空室を選んでこの端末に保存できます。'));
    }
    if(id==='lobby'||id==='sky')view.refresh=guests(stage);
    if(id==='concierge'){cameras(stage);view.refresh=rolePanel('manager');}
    if(['parking','parkingTower','bicycle','motorcycle'].includes(id))view.refresh=parking(stage,id);
    if(id==='boiler'||id==='seismic')view.refresh=equipment(stage,id);
    view.refresh?.();
    if(location.hash==='#vehicle-registration' && details.querySelector('.vehicle-registration')){
      if(dialog.dataset.info==='closed')document.getElementById('shared-info').click();
      const registration=details.querySelector('.vehicle-registration');
      registration.focus({preventScroll:true});registration.scrollIntoView({block:'center'});
    }
    if(facilitySpaces.includes(id)){
      void loadFacilities().then(data=>{
        if(view!==session)return;
        if(!Array.isArray(data.residents))throw new Error('invalid_facilities');
        facilities=data.residents.filter(person=>!view.updates.has(person.id)).concat([...view.updates.values()]);
        view.facilityStatus='ready';view.refresh?.();
      }).catch(()=>{if(view===session){view.facilityStatus='error';view.refresh?.();announce('駐車区画・技術部の情報を取得できませんでした。施設を開き直すと再試行できます。');}});
    }
    const create=action('ここでイラスト・note記事をつくる',()=>{
      const owner=getOwner(),actor=getActor();
      const href=new URL(location.href);href.search='';href.searchParams.set('space',id);href.hash='';
      illustrate({label:space.title,scene:space.scene,articleScene:space.scene,href:href.href,id:actor?.noteId||owner?.noteId,
        avatarSource:actor?.custom||actor?.profile?actor.source:undefined,
        backgroundUrl:new URL(`./assets/${space.image}.webp`,location.href).href,occupied:Boolean(owner?.id)});
    });
    if(actorReady){create.disabled=true;void actorReady.finally(()=>{create.disabled=false;});}
    details.append(create);
    if(id==='owner'){
      const link=make('a','button outline','無名S noteの作品を読む ↗');link.href='https://note.com/ss_yr';link.target='_blank';link.rel='noopener';details.append(link);
    }
  }
  function open(id,animate=true,restore=false){
    if(!Object.hasOwn(sharedSpaces,id))return;
    cancelDoors();
    const view={id,arrived:false,facilityStatus:'loading',updates:new Map()};
    session=view;
    // Start the selected floor while the doors or lift are still moving.
    if(id!=='owner'){
      view.interior=new Image();
      view.interior.fetchPriority='high';
      view.interior.decoding='async';
      view.interior.src='./assets/'+sharedSpaces[id].image+'.webp';
      view.interior.decode().catch(()=>{});
    }
    const arrive=()=>{
      if(session!==view)return;
      controller?.abort();controller=new AbortController();current=id;view.arrived=true;
      const level=levelFor(id);
      travel.setFloor(level);
      title.textContent=`${floorLabel(level)} · ${sharedSpaces[id].title}`;announce('');
      for(const link of nav.children){
        if(link.dataset.destination===id)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');
      }
      if(!restore){
        const url=new URL(location.href);
        if(url.searchParams.get('space')!==id||url.searchParams.has('room')){
          url.searchParams.delete('room');
          url.searchParams.set('space',id);
          history.pushState({towerSpace:true},'',url);
        }
      }
      if(!dialog.open)dialog.showModal();
      content.closest('.shared-scroll').scrollTop=0;
      if(id!=='owner'){render(id);return;}
      // The server validates the resident's key before returning isOwner.
      const gate=make('div','owner-door');
      const notice=make('p','','ここから先はタワーオーナー専用です。');
      gate.append(notice,action('天空ラウンジへ戻る',()=>open('sky')));
      content.replaceChildren(gate);details.replaceChildren();dock.replaceChildren();dock.hidden=true;
      const owner=getOwner();
      if(!owner?.id||(owner.noteId&&owner.noteId!=='ss_yr'))return;
      notice.textContent='オーナーの鍵を確認しています…';
      void loadOwner().then(room=>{
        if(session!==view)return;
        if(room.isOwner===true&&room.id===getOwner()?.id&&room.noteId==='ss_yr'){
          render(id,room);
        }else notice.textContent='オーナーの鍵を確認できませんでした。';
      }).catch(()=>{if(session===view)notice.textContent='オーナーの鍵を確認できませんでした。接続を確かめて開き直してください。';});
    };
    if(id==='lobby'&&animate){if(dialog.open)dialog.close();entrance(arrive);}
    else if(animate)travel(levelFor(id),arrive);
    else arrive();
  }
  function refreshNav(){
    for(const item of nav.children){
      const id=item.dataset.destination;
      item.textContent=`${floorLabel(levelFor(id))} ${sharedSpaces[id].title}`;
    }
    if(session?.arrived)title.textContent=`${floorLabel(levelFor(current))} · ${sharedSpaces[current].title}`;
  }
  for(const id of Object.keys(sharedSpaces)){
    const item=action('',()=>open(id),'shared-nav-button');
    item.dataset.destination=id;nav.append(item);
  }
  refreshNav();
  document.querySelectorAll('[data-space]').forEach(item=>item.addEventListener('click',()=>open(item.dataset.space)));
  document.getElementById('shared-back').addEventListener('click',goBack);
  dialog.addEventListener('cancel',event=>{
    if(event.target!==dialog)return;
    event.preventDefault();
    goBack();
  });
  document.getElementById('shared-info').addEventListener('click',event=>{
    const open=dialog.dataset.info==='closed';dialog.dataset.info=open?'open':'closed';
    event.currentTarget.setAttribute('aria-expanded',String(open));event.currentTarget.textContent=open?'案内をしまう':'案内を開く';
  });
  document.getElementById('shared-exit').addEventListener('click',()=>{hideSpace();entrance(()=>{
    const destination=new URL('../halloween-exhibition/preview/diorama-city/?arrival=tower',location.href);
    if(getOwner()?.id)destination.searchParams.set('resident',getOwner().id);
    else if(readWalkDraft())destination.searchParams.set('walker','draft');
    location.assign(destination);
  });});
  function restoreSpace(){
    const url=new URL(location.href);
    const id=url.searchParams.get('space');
    if(!url.searchParams.has('room')&&Object.hasOwn(sharedSpaces,id)){
      if(!dialog.open||!session?.arrived||session.id!==id)open(id,false,true);
    }else hideSpace();
  }
  window.addEventListener('popstate',restoreSpace);
  window.addEventListener('pageshow',event=>{if(event.persisted)restoreSpace();});
  const initial=new URL(location.href);
  if(!initial.searchParams.has('room')&&Object.hasOwn(sharedSpaces,initial.searchParams.get('space')))restoreSpace();
  else if(initial.searchParams.get('from')==='diorama'&&!initial.searchParams.has('room')){
    const clean=new URL(initial);
    clean.searchParams.delete('from');
    history.replaceState(history.state,'',clean);
    if(!['#prompt-play','#prompt-import'].includes(initial.hash))open('lobby');
  }
  return {open,refresh(){refreshNav();if(dialog.open&&session?.arrived)session.refresh?.();}};
}
