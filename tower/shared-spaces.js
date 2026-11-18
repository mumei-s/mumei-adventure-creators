import { roomStage } from './world.js?v=20261118-spaces';
import { readTraveler, readWalkDraft, rememberWalker, TOWER_API, avatarImageUrl } from './avatar-travel.js?v=20261118';
import { hostPortrait, autoResidentWalker } from '../halloween-exhibition/preview/diorama-city/host-avatar.js?v=20261118-spaces';

export const sharedSpaces = {
  owner: { title:'オーナーズ・アトリエ', floor:14, image:'panorama-suite', note:'天空ラウンジのさらに上。無名S noteの作品と街の眺めを楽しめる最上階です。', scene:'天空ラウンジより上のオーナーズ・アトリエ。大きな窓と作品、運河都市のパノラマ。' },
  sky: { title:'天空ラウンジ', floor:13, image:'sky-lounge', note:'住居階の上に広がる大空間。窓辺の席と中央の広場を自由に歩けます。', scene:'吹き抜けの巨大な天空ラウンジ。窓一面に運河都市、真鍮の照明とゆったり集えるソファ。' },
  lobby: { title:'エントランス・ラウンジ', floor:1, image:'entrance-lounge', note:'自動ドアの先に広がる１階のラウンジ。管理人室と各階へつながっています。', scene:'自動ドアを抜けた高級タワーの大きなエントランス。ラウンジの奥にエレベーター、窓辺にゆったりしたソファ。' },
  concierge: { title:'管理人室', floor:1, image:'concierge', note:'防犯モニターでエントランス、車寄せ、地下駐車場、駐輪場のゲーム内風景を確認できます。', scene:'木と真鍮のコンシェルジュ室。防犯モニターにエントランスと地下駐車場の風景が映る。' },
  driveway: { title:'車寄せ', floor:0, image:'driveway', note:'街からタワーへ続く車寄せ。雨上がりの床に玄関の灯りが映っています。', scene:'ブルーアワーのタワー車寄せ。大きな庇と石床、ガラスのエントランス。' },
  bicycle: { title:'駐輪コート', floor:0, image:'bicycle-court', note:'号室ごとに自転車・バイクを置けます。画像は下の車両登録から選べます。', scene:'青い時間のガラスと青銅の駐輪コート。登録した自転車やバイクを号室の区画に置く。' },
  parking: { title:'地下駐車場', floor:-1, image:'garage', note:'号室と同じ番号の専用区画。車両画像を登録すると自分の区画に展示されます。', scene:'高級タワーの広い地下駐車場。間接照明、コンクリートの柱、号室に対応した専用区画。' },
  parkingTower: { title:'立体駐車場', floor:0, image:'driveway', note:'タワーの車寄せに面した立体駐車場。地下とは別に、号室ごとの車両を登録できます。', scene:'運河都市のタワーに併設された立体駐車場。青い時間の車寄せと、号室ごとの愛車。' },
  motorcycle: { title:'バイク置き場', floor:0, image:'bicycle-court', note:'自転車と分かれたバイクの専用区画。号室に合わせて愛車を置けます。', scene:'高級タワーの屋根付きバイク置き場。ガラスと青銅、足元の間接照明。' },
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

export function bindSharedSpaces({getCatalog,getOwner,loadOwner,loadFacilities,saveVehicle,setEngineer,visitRoom,illustrate,travel}) {
  const dialog=document.getElementById('shared-dialog');
  const content=document.getElementById('shared-content');
  const title=document.getElementById('shared-title');
  const details=document.getElementById('shared-details');
  const message=document.getElementById('shared-status');
  const dock=document.getElementById('shared-controls');
  const nav=document.getElementById('shared-nav');
  const doors=document.getElementById('entrance-doors');
  let controller, current='', doorTimer=0, facilities=[], facilitiesRequest=0, cachedActor=null;
  const getActor=()=>readTraveler()||(cachedActor?.id===getOwner()?.id?cachedActor:null);
  const announce=text=>{message.textContent=text;};

  function entrance(done) {
    clearTimeout(doorTimer);
    doors.hidden=false;
    doors.classList.remove('doors-open');
    requestAnimationFrame(()=>requestAnimationFrame(()=>doors.classList.add('doors-open')));
    doorTimer=setTimeout(()=>{doors.hidden=true;done?.();},matchMedia('(prefers-reduced-motion: reduce)').matches?60:850);
  }
  function guests(stage) {
    const catalog=getCatalog();
    const rooms=(catalog?.rooms??[]).filter(room=>room.avatarVersion||room.photo).slice(0,8);
    rooms.forEach((room,index)=>{
      const guest=make('span','lounge-guest');
      guest.style.left=`${12+index%4*25}%`;
      guest.style.top=`${65+Math.floor(index/4)*20}%`;
      const image=make('img');
      image.alt=room.name||room.noteId;
      image.src=room.avatarVersion ? avatarImageUrl(room.id,room.avatarVersion) : room.photo;
      if(room.avatarVersion)image.crossOrigin='anonymous';
      guest.append(image,make('small','',room.name||room.noteId));
      stage.append(guest);
      if(room.avatarVersion)autoResidentWalker(image,{atlas:room.world?.atlas===true})(0,false);
    });
    if(rooms.length)details.append(make('p','muted','住人の展示アバターです。名前から本当の部屋を訪ねられます。'));
    for(const room of rooms)details.append(action(`${parkingNumber(room.slot,catalog.perFloor)} · ${room.name||room.noteId}`,()=>{dialog.close();visitRoom(room.id);}));
  }
  function cameras(stage) {
    const bank=make('div','security-bank');
    const feeds=[['ENTRANCE','entrance-lounge'],['DRIVEWAY','driveway'],['B1 GARAGE','garage'],['BICYCLE','bicycle-court']];
    feeds.forEach(([name,image],index)=>{
      const panel=make('div','security-feed');
      const photo=make('img');photo.src=`./assets/${image}.webp`;photo.alt=name;
      const time=make('time');
      panel.append(photo,make('span','',name),time);
      bank.append(panel);
      const update=()=>{time.textContent=`REC ${new Date().toLocaleTimeString('ja-JP',{timeZone:'Asia/Tokyo'})}`;};
      update();const timer=setInterval(update,1000);controller.signal.addEventListener('abort',()=>clearInterval(timer),{once:true});
    });
    stage.append(bank);
    details.append(make('p','muted','ゲーム内の風景を使った防犯カメラ演出です。実際のカメラには接続しません。'));
  }
  function equipment(stage,id) {
    if(id==='boiler'){
      const gauges=make('div','plant-gauges');
      for(const [label,value] of [['給湯','62°C'],['循環','稼働中'],['空調','運転中']])gauges.append(make('span','',`${label} ${value}`));
      stage.append(gauges);
      for(const [label,text] of [['ボイラーを見る','給湯ボイラーでつくったお湯が断熱配管を通って住居階へ送られます。'],['配管をたどる','往きと戻りの配管が巡り、ポンプが循環を支えています。'],['空調を調べる','奥の熱交換器と空調機が共用部の空気を整えています。']])details.append(action(label,()=>announce(text)));
      const team=make('p','muted');
      team.textContent='タワー技術部 · '+(facilities.filter(person=>person.engineer).map(person=>person.name||person.noteId).join('、')||'参加者募集中');details.append(team);
      if(getOwner()?.id){
        let joined=facilities.find(person=>person.id===getOwner().id)?.engineer===true;
        const join=action(joined?'技術部から退部する':'タワー技術部に参加する',async()=>{
          join.disabled=true;
          try{const room=await loadOwner();const updated=await setEngineer(room,!joined);joined=updated.design.engineer===true;
            join.textContent=joined?'技術部から退部する':'タワー技術部に参加する';announce(joined?'タワー技術部に参加しました。ゲーム内の役割として表示されます。':'技術部から退部しました。');
            const person=facilities.find(item=>item.id===updated.id);if(person)person.engineer=joined;else facilities.push({id:updated.id,noteId:updated.noteId,name:updated.profile.name,slot:updated.slot,engineer:joined,transport:updated.design.transport});
            team.textContent='タワー技術部 · '+(facilities.filter(person=>person.engineer).map(person=>person.name||person.noteId).join('、')||'参加者募集中');
          }catch{announce('参加情報を保存できませんでした。部屋の鍵を確認してください。');}finally{join.disabled=false;}
        });details.append(join);
      }
    }else{
      details.append(action('免震の動きを見る',()=>{
        stage.classList.remove('isolation-demo');void stage.offsetWidth;stage.classList.add('isolation-demo');
        announce('地面側の揺れと、免震支承によってゆっくり動く建物側を比べる模型演出です。');
      }));
      const model=make('div','isolation-model');
      model.append(make('span','isolation-building','建物'),make('span','isolation-bearing'),make('span','isolation-ground','地盤'));
      stage.append(model);
    }
  }
  function parking(stage,id){
    const catalog=getCatalog(),owner=getOwner();
    const parkingSpace={parking:'garage',parkingTower:'parkingTower',bicycle:'bicycle',motorcycle:'motorcycle'}[id];
    const vehicleKind=id==='bicycle'?'bicycle':id==='motorcycle'?'motorcycle':'car';
    const list=make('div','parking-grid');
    const floors=make('select');floors.setAttribute('aria-label','駐車区画の階を選ぶ');
    for(let n=1;n<=(catalog?.floors??12);n++)floors.append(new Option(`${n}階の号室`,String(n)));
    let selected=(catalog?.rooms??[]).find(room=>room.id===owner?.id)?.slot;
    floors.value=String(selected?Math.ceil(selected/(catalog?.perFloor??12)):1);
    const draw=()=>{
      list.replaceChildren();stage.querySelectorAll('.parked-vehicle').forEach(item=>item.remove());
      const catalog=getCatalog();
      const per=catalog?.perFloor??12,start=(Number(floors.value)-1)*per+1;
      for(let slot=start;slot<start+per;slot++){
        const room=catalog?.rooms?.find(item=>item.slot===slot),number=parkingNumber(slot,per);
        const stored=facilities.find(item=>item.id===room?.id)?.transport?.[parkingSpace];
        const entries=stored?[stored]:[];
        const bay=make('div','parking-bay');
        bay.dataset.slot=String(slot);bay.append(make('strong','',`${number}号室`));
        if(entries.length)for(const item of entries){
          const image=make('img');image.src=vehicleImageUrl(room.id,parkingSpace,item.version);image.alt=`${number}号室の${kinds[item.kind]}`;image.loading='lazy';bay.append(image);
          const parked=make('img','parked-vehicle');parked.src=image.src;parked.alt=image.alt;
          parked.style.left=`${16+(slot-start)%4*22}%`;parked.style.top=`${65+Math.floor((slot-start)/4)*12}%`;
          stage.append(parked);
        }else bay.append(make('span','muted',room?'車両未登録':'空室'));
        list.append(bay);
      }
    };
    floors.addEventListener('change',draw);details.append(floors,list);draw();
    if(!owner?.id){details.append(make('p','muted','自分の部屋に入居すると、専用区画に車両画像を登録できます。'));return;}
    const form=make('form','vehicle-upload');
    const kind=make('select');kind.setAttribute('aria-label','登録する車両');
    kind.append(new Option(kinds[vehicleKind],parkingSpace));
    const label=make('label','','自分の車両画像（透過PNG推奨）');
    const file=make('input');file.type='file';file.accept='image/png,image/webp,image/jpeg';label.append(file);
    const save=make('button','button primary','号室の区画に保存');save.type='submit';
    const remove=action('選んだ車両を外す',()=>void store(null));
    form.append(kind,label,save,remove);details.append(form);
    let busy=false;
    async function store(image){
      if(busy)return;busy=true;save.disabled=remove.disabled=true;announce('車両を保存しています…');
      try{
        const room=await loadOwner();
        const updated=await saveVehicle(room,kind.value,image);
        const person=facilities.find(item=>item.id===updated.id);
        if(person)person.transport=updated.design.transport;
        else facilities.push({id:updated.id,slot:updated.slot,noteId:updated.noteId,transport:updated.design.transport,engineer:updated.design.engineer});
        if(!dialog.open||current!==id)return;
        announce(`${parkingNumber(updated.slot,getCatalog()?.perFloor)}号室の車両を保存しました。`);
        draw();
      }catch(error){announce(error.code==='conflict'?'部屋が更新されました。もう一度保存できます。':'車両を保存できませんでした。画像と部屋の鍵を確認してください。');}
      finally{busy=false;save.disabled=remove.disabled=false;}
    }
    form.addEventListener('submit',event=>{event.preventDefault();if(!file.files[0]){announce('保存する車両画像を選んでください。');return;}void store(file.files[0]);});
  }
  function render(id){
    const space=sharedSpaces[id];if(!space)return;
    controller?.abort();controller=new AbortController();current=id;
    const level=id==='sky'?(getCatalog()?.floors??12)+1:id==='owner'?(getCatalog()?.floors??12)+2:space.floor;
    travel.setFloor(level);
    title.textContent=`${floorLabel(level)} · ${space.title}`;
    details.replaceChildren(make('p','',space.note));announce('');
    const traveler=getActor();
    const room={id:'showroom',sharedSpace:id,profile:{name:space.title,articles:[]},
      design:{title:space.title,theme:'cinema',light:'natural',avatarMode:'resident'},draftInterior:{source:`./assets/${space.image}.webp`}};
    const scene=roomStage(room,hostPortrait,{traveler,signal:controller.signal,inputRoot:dialog});
    const stage=scene.querySelector('.world-stage');stage.classList.add('shared-stage');stage.dataset.space=id;
    if(getOwner()?.id&&!traveler){stage.querySelector('.world-resident').hidden=true;announce('登録済みアバターを読み込んでいます…');}
    const controls=scene.querySelector('.world-control-dock');
    dock.replaceChildren(controls);content.replaceChildren(scene);
    if(id==='lobby'||id==='sky')guests(stage);
    if(id==='concierge')cameras(stage);
    if(['parking','parkingTower','bicycle','motorcycle'].includes(id))parking(stage,id);
    if(id==='boiler'||id==='seismic')equipment(stage,id);
    const create=action('ここでイラスト・note記事をつくる',()=>{
      const draft=readWalkDraft(),actor=getActor(),owner=getOwner();
      const href=new URL(location.href);href.search='';href.searchParams.set('space',id);href.hash='';
      illustrate({label:space.title,scene:space.scene,href:href.href,id:actor?.noteId||draft?.noteId||owner?.noteId,
        avatarSource:actor?.source||draft?.avatar?.source,occupied:Boolean(owner?.id)});
    });
    details.append(create);
    if(id==='owner'){
      const link=make('a','button outline','無名S noteの作品を読む ↗');link.href='https://note.com/ss_yr';link.target='_blank';link.rel='noopener';details.append(link);
    }
    const url=new URL(location.href);url.searchParams.set('space',id);history.replaceState(history.state,'',url);
    if(!dialog.open)dialog.showModal();
  }
  function open(id,animate=true){
    const space=sharedSpaces[id];if(!space)return;
    const request=++facilitiesRequest;
    if(getOwner()?.id&&!getActor())void loadOwner().then(room=>{
      if(room.id!==getOwner()?.id)return;
      const custom=room.design.avatarMode==='custom'&&Boolean(room.avatarVersion);
      cachedActor={id:room.id,noteId:room.noteId,name:room.design.avatarName||room.profile.name,custom,
        atlas:custom&&room.design.world?.atlas===true,source:custom?avatarImageUrl(room.id,room.avatarVersion):room.design.avatarMode==='profile'?room.profile.photo:new URL('./assets/resident.webp',location.href).href};
      if(custom)rememberWalker(cachedActor);
      if(dialog.open&&current===id)render(id);
    }).catch(()=>{if(current===id)announce('登録済みアバターを読み込めませんでした。施設を開き直すと再試行できます。');});
    if(['parking','parkingTower','bicycle','motorcycle','boiler'].includes(id))void loadFacilities().then(data=>{if(request!==facilitiesRequest)return;facilities=data.residents??[];if(dialog.open&&current===id)render(id);}).catch(()=>{if(current===id)announce('車両と技術部の情報を読み込めませんでした。施設を開き直すと再試行できます。');});
    if(id==='lobby'&&animate){if(dialog.open)dialog.close();entrance(()=>render(id));return;}
    const level=id==='sky'?(getCatalog()?.floors??12)+1:id==='owner'?(getCatalog()?.floors??12)+2:space.floor;
    if(animate)travel(level,()=>render(id));else render(id);
  }
  for(const [id,space] of Object.entries(sharedSpaces))nav.append(action(`${floorLabel(space.floor)} ${space.title}`,()=>open(id),'shared-nav-button'));
  document.querySelectorAll('[data-space]').forEach(item=>item.addEventListener('click',()=>open(item.dataset.space)));
  document.getElementById('shared-back').addEventListener('click',()=>dialog.close());
  document.getElementById('shared-exit').addEventListener('click',()=>{dialog.close();entrance(()=>{
    const destination=new URL('../halloween-exhibition/preview/diorama-city/?arrival=tower',location.href);
    if(getOwner()?.id)destination.searchParams.set('resident',getOwner().id);
    else if(readWalkDraft())destination.searchParams.set('walker','draft');
    location.assign(destination);
  });});
  dialog.addEventListener('close',()=>{
    controller?.abort();
    const url=new URL(location.href);url.searchParams.delete('space');history.replaceState(history.state,'',url);
  });
  window.addEventListener('popstate',()=>{if(dialog.open)dialog.close();});
  const initial=new URL(location.href);
  if(Object.hasOwn(sharedSpaces,initial.searchParams.get('space')))open(initial.searchParams.get('space'),false);
  else if(initial.searchParams.get('from')==='diorama'&&!initial.searchParams.has('room')){
    const clean=new URL(initial);clean.searchParams.delete('from');history.replaceState(history.state,'',clean);open('lobby');
  }
  return {open,refresh(){if(dialog.open)render(current);}};
}
