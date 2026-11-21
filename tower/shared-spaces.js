import { mediaUrl, setArtworkSource } from './public-directory.js?v=20261119-review';
import { residentWalkers } from './resident-walkers.js?v=20261119-scene';
import { displayVehicle, garageVehiclePose, vehicleBays } from './vehicle-display.js?v=20261121-garage-lines';
import { roomStage } from './world.js?v=20261119-scene';
import { facilityFloors, facilityActorHeight } from './facility-floors.js?v=20261118-city2';
import { visitor, residentTraveler, hasRoomKey, readWalkDraft, avatarImageUrl } from './avatar-travel.js?v=20261119-scene';
import { autoResidentWalker } from '../halloween-exhibition/preview/diorama-city/host-avatar.js?v=20261119-scene';

import { vehicleStudio } from './vehicle-studio.js?v=20261119-scene';

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
  return mediaUrl(room,kind,version);
}
const make=(tag,css='',text='')=>{const item=document.createElement(tag);item.className=css;item.textContent=text;return item;};
const action=(text,call,css='button outline')=>{const item=make('button',css,text);item.type='button';item.addEventListener('click',call);return item;};
const kinds={car:'車',motorcycle:'バイク',bicycle:'自転車'};

export function bindSharedSpaces({getCatalog,getOwner,getTraveler:getActor,loadPlayer,loadOwner,loadFacilities,saveVehicle,setEngineer,setManager,enterTower,visitRoom,illustrate,travel}) {
  const dialog=document.getElementById('shared-dialog');
  const content=document.getElementById('shared-content');
  const title=document.getElementById('shared-title');
  const details=document.getElementById('shared-details');
  const message=document.getElementById('shared-status');
  const dock=document.getElementById('shared-controls');
  const nav=document.getElementById('shared-nav');
  const doors=document.getElementById('entrance-doors');
  let controller, current='', doorTimer=0, facilities=[], session=null;
  const savedVersions=new Map();
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
    const person={id:room.id,slot:room.slot,name:room.profile.name,noteId:room.noteId,version:room.version,
      avatarMode:room.design.avatarMode,avatarVersion:room.avatarVersion,avatarName:room.design.avatarName,world:room.design.world,photo:room.profile.photo,
      engineer:room.design.engineer===true,manager:room.design.manager===true,transport:room.design.transport??{}};
    // A request begun before this write may still return its older public snapshot.
    if(session?.updates)session.updates.set(room.id,person);
    facilities=facilities.filter(item=>item.id!==room.id).concat(person);
    session?.refresh?.();
  }
  function guests(stage) {
    const links=make('div','guest-links');
    details.append(links);
    let lastCatalog,lastPlayer;
    return ()=>{
      const catalog=getCatalog(),playerId=getActor()?.id;
      if(catalog===lastCatalog && playerId===lastPlayer)return;
      lastCatalog=catalog;lastPlayer=playerId;
      stage.querySelectorAll('.lounge-guest').forEach(guest=>guest.remove());
      links.replaceChildren();
      const floor=facilityFloors[stage.dataset.space];
      const rooms=(catalog?.rooms??[]).filter(room=>(room.avatarVersion||room.photo)&&room.id!==playerId).slice(0,floor.guests.length);
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
        setArtworkSource(image,room.avatarVersion ? avatarImageUrl(room.id,room.avatarVersion) : room.photo);
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
  function viewer(titleText,returnText){
    const popup=make('dialog','facility-viewer');
    popup.setAttribute('aria-label',titleText);
    const heading=make('h3','',titleText),head=make('header');
    head.append(heading,action(returnText,()=>popup.close()));
    popup.append(head);dialog.append(popup);
    const signal=controller.signal,close=()=>popup.close();
    signal.addEventListener('abort',close,{once:true});
    popup.addEventListener('close',()=>{signal.removeEventListener('abort',close);popup.remove();},{once:true});
    return {popup,heading};
  }
  function rolePanel(stage,role){
    const spec=roles[role],view=session,owner=getOwner();
    const manager=role==='manager',floor=facilityFloors[view.id];
    const waypoints=manager?[
      [[.32,.72],[.43,.67]],[[.47,.69],[.56,.76]],[[.61,.79],[.74,.75]],
      [[.20,.85],[.38,.80]],[[.75,.90],[.88,.81]],
    ]:[
      [[.34,.76],[.53,.70]],[[.59,.73],[.78,.63]],[[.75,.68],[.90,.61]],
      [[.17,.87],[.35,.80]],[[.48,.84],[.65,.78]],[[.65,.93],[.87,.82]],
    ];
    const people=residentWalkers(stage,i=>waypoints[i],(node,x,y)=>{
      const h=facilityActorHeight(floor,y);
      node.style.left=x*100+'%';node.style.top=y*100+'%';node.style.height=h*100+'%';
      node.style.width=h*85/floor.aspect+'%';node.style.zIndex=String(21+Math.round(y*100));
    });
    let page=0,last='',busy=false,toggle,members=[],frame=0,previous=0,round=0;
    const panel=make('div','service-roster'),roster=make('p','muted'),pages=make('div','staff-pages');
    const pageText=make('span');
    const step=by=>{page+=by;round=0;paint();};
    pages.append(action('前の班',()=>step(-1)),pageText,action('次の班',()=>step(1)));
    panel.append(make('p','',manager?'管理人は5人まで。参加すると自分のアバターが管理人室を巡回し、来訪者にも見えます。':'技術部は人数制限なし。参加すると自分のアバターがこの設備室を巡回します。人数が増えると巡回する班が交代します。'),roster,pages);
    details.append(panel);
    function paint(){
      const playerId=getActor()?.id;
      const others=members.filter(person=>person.id!==playerId && person.appearanceReady);
      const pageCount=Math.max(1,Math.ceil(others.length/waypoints.length));
      page=(page%pageCount+pageCount)%pageCount;pages.hidden=pageCount===1;
      pageText.textContent=(page+1)+' / '+pageCount+' 班';
      people.set(others.slice(page*waypoints.length,(page+1)*waypoints.length));
      const self=stage.querySelector('.world-resident');let badge=self.querySelector('.role-self');
      if(members.some(person=>person.id===playerId)){
        if(!badge)self.append(make('small','role-self',manager?'管理人 · あなた':'技術部 · あなた'));
      }else badge?.remove();
    }
    function tick(now){
      if(controller?.signal.aborted||view!==session)return;
      if(now-previous>=60){
        const seconds=previous?Math.min(.2,(now-previous)/1000):0;previous=now;
        const moving=!document.hidden && document.body.dataset.gameMotion!=='reduced'&&!matchMedia('(prefers-reduced-motion: reduce)').matches
          && !dialog.querySelector('dialog[open]');
        if(moving){
          people.tick(seconds,true);
          if(!pages.hidden&&(round+=seconds)>=18){round=0;page++;paint();}
        }
      }
      frame=requestAnimationFrame(tick);
    }
    frame=requestAnimationFrame(tick);controller.signal.addEventListener('abort',()=>cancelAnimationFrame(frame),{once:true});
    function refresh(){
      const ready=view.facilityStatus==='ready',catalog=getCatalog();
      const byId=new Map((catalog?.rooms||[]).map(room=>[room.id,room]));
      members=facilities.filter(person=>person[role]).sort((a,b)=>a.slot-b.slot).map(person=>({...byId.get(person.id),...person,
        appearanceReady:byId.has(person.id)||Boolean(person.avatarMode||person.avatarVersion||person.photo)}));
      const names=members.map(person=>person.name||person.noteId).join('、');
      roster.textContent=spec.title+' · '+(ready?(manager?members.length+' / 5人':members.length+'人')+'　'+(names||'参加者募集中'):view.facilityStatus==='error'?'名簿を再確認しています':'名簿を確認中…');
      const playerId=getActor()?.id;
      const signature=JSON.stringify([playerId,members]);
      if(signature!==last){last=signature;paint();}
      if(toggle){
        const joined=members.some(person=>person.id===playerId),full=manager&&!joined&&members.length>=5;
        toggle.disabled=busy||!ready||full;
        toggle.textContent=joined?spec.leave:full?'管理人は満員です（5 / 5人）':spec.join;
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
          if(view===session){
            announce(error.code==='manager_full'?'管理人は5人までです。空きができると参加できます。':error.code==='conflict'?'部屋が更新されました。もう一度お試しください。':'参加情報を保存できませんでした。接続と部屋の鍵を確認してください。');
            void view.syncFacilities?.();
          }
        }finally{busy=false;if(view===session)refresh();}
      });details.append(toggle);
    }else{
      details.append(action(manager?'入居して管理人に参加':'入居して技術部に参加',()=>{hideSpace();removeSpaceFromUrl();enterTower();}));
    }
    return refresh;
  }
  function equipment(stage,id) {
    const viewport=stage.closest('.shared-viewport');
    if(id==='boiler'){
      const instruments=[
        ['ボイラーを見る','給湯ボイラー','銀色の給湯タンクで温めたお湯が、断熱配管を通って住居階へ送られます。','50% 40%'],
        ['配管をたどる','循環配管','天井の往きと戻りの配管をたどると、床の循環ポンプにつながります。','60% 13%'],
        ['空調を調べる','空調設備','左の熱交換器と空調機が、共用部の空気を整えています。','17% 48%'],
      ];
      function inspect(index){
        const {popup,heading}=viewer('ボイラー・設備室のイラスト','← 設備室に戻る');
        const frame=make('div','equipment-frame'),image=make('img','equipment-art'),description=make('p'),choices=make('div','equipment-choices');
        image.src=new URL('./assets/plant-room.webp',import.meta.url).href;
        frame.append(image);popup.append(frame,description,choices);
        function select(i){
          const [,title,copy,focus]=instruments[i];
          heading.textContent=title;image.alt='ボイラー・設備室の'+title;image.style.transformOrigin=focus;
          description.textContent=copy;
          [...choices.children].forEach((button,j)=>button.setAttribute('aria-pressed',String(i===j)));
        }
        instruments.forEach(([label],i)=>choices.append(action(label,()=>select(i))));
        select(index);popup.showModal();
      }
      const gauges=make('div','plant-gauges');
      for(const [label,value] of [['給湯','62°C'],['循環','稼働中'],['空調','運転中']])gauges.append(make('span','',label+' '+value));
      stage.append(gauges);
      viewport.append(action('設備のイラストを見る',()=>inspect(0),'facility-action'));
      instruments.forEach(([label],i)=>details.append(action(label,()=>inspect(i))));
      return rolePanel(stage,'engineer');
    }
    function showSeismicArt(){
      const {popup}=viewer('免震構造のイラスト','← 見学回廊に戻る');
      const imageName=sharedSpaces.seismic.image+'.webp';
      const full=new URL('./assets/'+imageName,import.meta.url);
      const preview=new URL('./assets/thumbs/'+imageName,import.meta.url);
      const frame=make('div','seismic-art-frame'),image=make('img','equipment-art');
      const description=make('p'),choices=make('div','equipment-choices');
      const status=make('p','seismic-art-status');status.setAttribute('role','status');
      const views=[
        ['回廊全景','ガラス越しに、柱を支える黒い積層ゴム支承と、その間をつなぐ水平のダンパーが見えます。','50% 50%'],
        ['積層ゴム支承','左手前の黒い円筒が積層ゴム支承です。建物の重さを支えながら、横方向に変形して揺れを伝わりにくくします。','16% 46%'],
        ['ダンパー','中央の水平な装置がダンパーです。建物と地盤の相対的な動きを抑え、揺れのエネルギーを吸収します。','47% 42%'],
      ];
      image.width=1536;image.height=1024;image.decoding='async';
      let variant;
      const loadFull=(retrying=false)=>{
        const source=new URL(full);
        if(retrying)source.searchParams.set('retry',String(Date.now()));
        variant='full';image.hidden=false;retry.hidden=true;
        status.textContent='イラストを読み込んでいます…';image.src=source.href;
      };
      const retry=action('イラストを再読み込み',()=>loadFull(true));
      image.addEventListener('load',()=>{
        status.textContent=variant==='preview'?'縮小版を表示しています。原寸版は再読み込みできます。':'';
        retry.hidden=variant!=='preview';
      });
      image.addEventListener('error',()=>{
        if(variant==='full'){
          variant='preview';status.textContent='縮小版を読み込んでいます…';image.src=preview.href;return;
        }
        image.hidden=true;retry.hidden=false;
        status.textContent='免震構造のイラストを読み込めませんでした。再読み込みできます。';
      });
      function select(index){
        const [label,caption,focus]=views[index];
        frame.dataset.focus=index===0?'overview':'detail';
        image.alt='免震見学回廊：'+label;image.style.transformOrigin=focus;
        description.textContent=caption;
        [...choices.children].forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
      }
      views.forEach(([label],i)=>choices.append(action(label,()=>select(i))));
      frame.append(image);popup.append(frame,description,choices,status,retry);
      select(0);loadFull();popup.showModal();
    }
    const overlay=make('div','seismic-tools'),model=make('div','isolation-model');
    model.hidden=true;model.setAttribute('aria-label','免震模型。建物側と地盤側の動きの違い');
    model.append(make('span','isolation-building','建物'),make('span','isolation-bearing','免震支承'),make('span','isolation-ground','地盤'));
    let timer=0;
    const play=action('免震の動きを見る',()=>{
      clearTimeout(timer);
      overlay.classList.remove('isolation-demo');model.hidden=false;void model.offsetWidth;
      overlay.classList.add('isolation-demo');play.textContent='もう一度再生';
      announce('下の地盤が大きく動き、支承が変形して上の建物の動きを小さくする模型です。');
      timer=setTimeout(()=>{overlay.classList.remove('isolation-demo');model.hidden=true;play.textContent='免震の動きをもう一度見る';},5200);
    },'facility-action');
    const seismicActions=make('div','seismic-actions');
    seismicActions.append(action('免震構造のイラストを見る',showSeismicArt,'facility-action'),play);
    overlay.append(seismicActions,model);viewport.append(overlay);
    controller.signal.addEventListener('abort',()=>clearTimeout(timer),{once:true});
  }
  function parking(stage,id){
    const owner=getOwner(),view=session;
    const parkingSpace={parking:'garage',parkingTower:'parkingTower',bicycle:'bicycle',motorcycle:'motorcycle'}[id];
    const vehicleKind=id==='bicycle'?'bicycle':id==='motorcycle'?'motorcycle':'car';
    const maker=make('details','vehicle-maker');
    maker.append(make('summary','','自分の'+kinds[vehicleKind]+'をつくる'),vehicleStudio(vehicleKind,{
      id:getActor()?.noteId,space:id,
      onRegister:()=>{maker.open=false;registration.scrollIntoView({block:'center'});registration.focus({preventScroll:true});},
    }));
    const registration=make('div','vehicle-registration');
    registration.id='vehicle-registration';registration.tabIndex=-1;
    details.append(maker);
    const list=make('div','parking-grid');
    const floors=make('select');floors.setAttribute('aria-label','駐車区画の階を選ぶ');
    const caption=make('p','parking-section');
    const tools=make('div','garage-tools'),all=action('みんなの車両を並べる',()=>{allRooms=true;featuredSlot=0;redraw();});
    const prev=action('前の展示区画',()=>changeGroup(-1)),next=action('次の展示区画',()=>changeGroup(1));
    tools.append(all,prev,next);
    let chosen=false,selectionRevision=0,ownLabel,featuredSlot=0,allRooms=true,entries=[],scope=[],per=12,signature='';
    const bays=vehicleBays[id];
    function currentGroup(){return Math.max(0,Math.floor(scope.findIndex(e=>e.slot===featuredSlot)/bays.length));}
    function changeGroup(by){
      const count=Math.ceil(scope.length/bays.length);
      if(!count)return;
      featuredSlot=scope[((currentGroup()+by+count)%count)*bays.length].slot;
      paintVehicles();
    }
    function enlarge(entry){
      featuredSlot=entry.slot;paintVehicles();
      const {popup,heading}=viewer('駐車車両の拡大展示','← 駐車区画に戻る');
      const photo=make('div','vehicle-portrait'),image=make('img'),nav=make('div','vehicle-switcher');
      photo.append(image);popup.append(photo,nav);
      let selected=entry;
      const display=person=>{
        selected=person;featuredSlot=person.slot;
        if(!scope.some(e=>e.slot===featuredSlot)){allRooms=true;redraw();}else paintVehicles();
        heading.textContent=parkingNumber(person.slot,per)+'号室 · '+person.name+'の'+kinds[vehicleKind];
        image.alt=heading.textContent;setArtworkSource(image,person.url);
        displayVehicle(person.url).then(src=>{if(selected===person)image.src=src;});
      };
      function step(by){const i=entries.findIndex(e=>e.slot===selected.slot);if(entries.length)display(entries[(i+by+entries.length)%entries.length]);}
      nav.append(action('← 前の車両',()=>step(-1)),action('次の車両 →',()=>step(1)));
      nav.hidden=entries.length<2;
      display(entry);popup.showModal();
    }
    function paintVehicles(){
      stage.querySelectorAll('.parked-vehicle').forEach(item=>item.remove());
      const group=currentGroup(),groupCount=Math.ceil(scope.length/bays.length);
      const sharing=scope.slice(group*bays.length,(group+1)*bays.length);
      prev.hidden=next.hidden=groupCount<2;
      all.setAttribute('aria-pressed',String(allRooms));
      caption.textContent=sharing.length?(allRooms?'全フロアの展示':'この階の展示')+'　'+sharing.map(e=>parkingNumber(e.slot,per)+'号室').join('・')+'　車両をタップすると拡大できます。':'この展示区画にはまだ車両がありません。';
      sharing.forEach((entry,index)=>{
        const parked=action('',event=>{event.stopPropagation();enlarge(entry);},'parked-vehicle');
        const label=parkingNumber(entry.slot,per)+'号室 · '+entry.name+'の'+kinds[vehicleKind];
        parked.setAttribute('aria-label',label+'を拡大');parked.title=label;parked.dataset.slot=entry.slot;
        const img=make('img');img.alt=label;img.draggable=false;
        const place=({u,v,width,flip})=>{
          parked.style.setProperty('--face',flip?'-1':'1');
          parked.style.left=u*100+'%';parked.style.top=v*100+'%';parked.style.width=width*100+'%';
          parked.style.zIndex=String(20+Math.round(v*100));
        };
        if(id==='parking'){
          const align=(ratio)=>{
            const pose=garageVehiclePose(index,entry.facing,entry.version,ratio);
            place(pose);
            parked.style.setProperty('--garage-axle-x',pose.anchorX*100+'%');
            parked.style.setProperty('--garage-axle-y',pose.anchorY*100+'%');
            parked.style.setProperty('--garage-skew',pose.skew+'deg');
          };
          align();
          img.addEventListener('load',()=>align(img.naturalHeight/img.naturalWidth),{once:true});
        }else{
          const [u,v,width,direction]=bays[index];
          place({u,v,width,flip:entry.facing!==direction});
        }
        parked.append(img);stage.append(parked);
        displayVehicle(entry.url).then(src=>{if(parked.isConnected)img.src=src;});
      });
      [...list.querySelectorAll('.bay-view')].forEach(button=>button.setAttribute('aria-pressed',String(sharing.some(e=>String(e.slot)===button.dataset.slot))));
    }
    let facing,faceSave;
    function redraw(){
      const catalog=getCatalog(),count=catalog?.floors??12;per=catalog?.perFloor??12;
      const ownSlot=catalog?.rooms?.find(room=>room.id===owner?.id)?.slot;
      if(ownLabel)ownLabel.textContent=ownSlot?'自分の'+parkingNumber(ownSlot,per)+'号室に登録':'自分の号室に登録';
      const prior=Number(floors.value)||1;
      if(floors.options.length!==count){
        floors.replaceChildren();
        for(let n=1;n<=count;n++)floors.append(new Option(n+'階の号室',String(n)));
      }
      floors.value=String(Math.min(count,!chosen&&ownSlot?Math.ceil(ownSlot/per):prior));
      const start=(Number(floors.value)-1)*per+1;
      entries=facilities.filter(person=>person.transport?.[parkingSpace]).map(person=>{
        const item=person.transport[parkingSpace];
        return {slot:person.slot,id:person.id,name:person.name||person.noteId,facing:item.facing||(vehicleKind==='car'?'left':'right'),version:item.version,url:vehicleImageUrl(person.id,parkingSpace,item.version)};
      }).sort((a,b)=>a.slot-b.slot);
      scope=allRooms?entries:entries.filter(e=>e.slot>=start&&e.slot<start+per);
      const own=entries.find(e=>e.id===owner?.id);
      if(facing&&facing.dataset.edited!=='true')facing.value=own?.facing||(vehicleKind==='car'?'left':'right');
      if(faceSave)faceSave.hidden=!own;
      list.replaceChildren();
      for(let slot=start;slot<start+per;slot++){
        const room=catalog?.rooms?.find(item=>item.slot===slot),number=parkingNumber(slot,per),entry=entries.find(e=>e.slot===slot);
        const bay=make('div','parking-bay');bay.dataset.slot=String(slot);bay.append(make('strong','',number+'号室'));
        if(entry){
          const img=make('img');img.alt=number+'号室の'+kinds[vehicleKind];setArtworkSource(img,entry.url);img.loading='lazy';
          const show=action('実景で見る・拡大',()=>enlarge(entry),'bay-view');show.dataset.slot=slot;
          show.setAttribute('aria-label',number+'号室の'+kinds[vehicleKind]+'を実景で見る・拡大');
          bay.append(img,make('span','vehicle-owner',entry.name),show);
        }else bay.append(make('span','muted',!catalog?'入居状況確認中':!room?'空室':view.facilityStatus==='ready'?'車両未登録':'車両確認中'));
        list.append(bay);
      }
      paintVehicles();
    }
    function draw(){
      const next=JSON.stringify([getCatalog()?.floors,getCatalog()?.rooms?.map(r=>[r.slot,r.id]),facilities.map(p=>[p.slot,p.name,p.transport?.[parkingSpace]]),view.facilityStatus,selectionRevision]);
      if(next!==signature){signature=next;redraw();}
    }
    floors.addEventListener('change',()=>{chosen=true;allRooms=false;featuredSlot=0;selectionRevision++;draw();});
    details.append(tools,floors,caption,list,registration);
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
    const faceLabel=make('label','','元画像で車両の前が向いている方向');
    facing=make('select');facing.append(new Option('左向き','left'),new Option('右向き','right'));faceLabel.append(facing);
    facing.addEventListener('change',()=>{facing.dataset.edited='true';});
    faceSave=action('登録済み車両の向きを更新',()=>void store(null,true));
    const remove=action('自分の区画から車両を外す',()=>void store(null));
    form.append(ownLabel,kind,label,faceLabel,save,faceSave,remove);registration.append(form);
    let busy=false;
    async function store(image,facingOnly=false){
      if(busy)return;
      const revision=selectionRevision;
      busy=true;save.disabled=remove.disabled=true;announce('車両を保存しています…');
      try{
        const room=await loadOwner();
        if(view!==session)return;
        if(getOwner()?.id!==room.id||!room.isOwner)throw new Error('owner_required');
        const updated=await saveVehicle(room,kind.value,image,facing.value,facingOnly);
        if(view===session){
          if(selectionRevision===revision){
            featuredSlot=updated.slot;chosen=false;allRooms=true;floors.value=String(Math.ceil(updated.slot/(getCatalog()?.perFloor??12)));
          }
          delete facing.dataset.edited;file.value='';
        }
        recordFacility(updated);
        if(view!==session)return;
        const number=parkingNumber(updated.slot,getCatalog()?.perFloor);
        announce(facingOnly?number+'号室の車両の向きを更新しました。':image?`${number}号室の車両を保存しました。`:`${number}号室の車両を外しました。`);
      }catch(error){if(view===session)announce(error.qualityMessage || (error.code==='conflict'?'部屋が更新されました。もう一度保存できます。':'車両を保存できませんでした。画像と部屋の鍵を確認してください。'));}
      finally{busy=false;save.disabled=remove.disabled=false;}
    }
    form.addEventListener('submit',event=>{event.preventDefault();if(!file.files[0]){announce('保存する車両画像を選んでください。');return;}void store(file.files[0]);});
    return draw;
  }
  function render(id,verifiedRoom){
    const space=sharedSpaces[id],view=session;
    const traveler=residentTraveler(verifiedRoom) || getActor();
    const room={id:'showroom',sharedSpace:id,profile:{name:space.title,articles:[]},
      design:{title:space.title,theme:'cinema',light:'natural',avatarMode:'resident'},draftInterior:{source:`./assets/${space.image}.webp`}};
    const loadTraveler=hasRoomKey(getOwner()) && !traveler ? async()=>residentTraveler(await loadPlayer()) || visitor : null;
    const onTraveler=actor=>{if(actor.id && view===session){illustrate.updateActor(actor);view.refresh?.();}};
    const scene=roomStage(room,visitor.source,{traveler:traveler || visitor,loadTraveler,onTraveler,signal:controller.signal,inputRoot:dialog,preparedInterior:view.interior});
    const stage=scene.querySelector('.world-stage');stage.classList.add('shared-stage');stage.dataset.space=id;
    details.replaceChildren(make('p','',space.note));
    const controls=scene.querySelector('.world-control-dock');
    dock.hidden=false;dock.replaceChildren(controls);content.replaceChildren(scene);

    if(id==='lobby'||id==='driveway'){
      const join=()=>{hideSpace();removeSpaceFromUrl();enterTower();};
      const entry=action('ここから入居する',join,'facility-action lobby-entry');
      stage.closest('.shared-viewport').append(entry);
      details.prepend(make('p','','「ここから入居する」でアバターと部屋を作れます。２枚ができたら空室を選び、本人確認に進みます。'));
    }
    if(id==='lobby'||id==='sky')view.refresh=guests(stage);
    if(id==='concierge'){cameras(stage);view.refresh=rolePanel(stage,'manager');}
    if(['parking','parkingTower','bicycle','motorcycle'].includes(id))view.refresh=parking(stage,id);
    if(id==='boiler'||id==='seismic')view.refresh=equipment(stage,id);
    view.refresh?.();
    if(location.hash==='#vehicle-registration' && details.querySelector('.vehicle-registration')){
      if(dialog.dataset.info==='closed')document.getElementById('shared-info').click();
      const registration=details.querySelector('.vehicle-registration');
      registration.focus({preventScroll:true});registration.scrollIntoView({block:'center'});
    }
    if(facilitySpaces.includes(id)){
      let pending=false;
      view.syncFacilities=()=>{
        if(!dialog.open||document.hidden||pending||session!==view)return;
        pending=true;view.updates.clear();
        return loadFacilities().then(data=>{
        if(view!==session)return;
        if(!Array.isArray(data.residents))throw new Error('invalid_facilities');
        const merged=new Map(data.residents.map(person=>[person.id,person]));
        for(const local of facilities){
          if(savedVersions.has(local.id)&&(merged.get(local.id)?.version??0)<savedVersions.get(local.id))merged.set(local.id,local);
          else if((merged.get(local.id)?.version??0)>=savedVersions.get(local.id))savedVersions.delete(local.id);
        }
        for(const local of view.updates.values())merged.set(local.id,local);
        facilities=[...merged.values()];
        view.facilityStatus='ready';view.refresh?.();
      }).catch(()=>{if(view===session){view.facilityStatus='error';view.refresh?.();announce('駐車区画・技術部の情報を取得できませんでした。しばらくすると自動で再試行します。');}}).finally(()=>{pending=false;});
      };
      void view.syncFacilities();
      const timer=setInterval(view.syncFacilities,20000);
      document.addEventListener('visibilitychange',view.syncFacilities,{signal:controller.signal});
      window.addEventListener('focus',view.syncFacilities,{signal:controller.signal});
      controller.signal.addEventListener('abort',()=>clearInterval(timer),{once:true});
    }
    const create=action('ここでイラスト・note記事をつくる',()=>{
      const actor=getActor();
      const href=new URL(location.href);href.search='';href.searchParams.set('space',id);href.hash='';
      illustrate({label:space.title,scene:space.scene,articleScene:space.scene,href:href.href,id:actor?.noteId,
        vehicles:actor?.vehicles,vehiclePlace:id==='parking'?'garage':id,
        avatarSource:actor?.custom||actor?.profile||actor?.host ? actor.source : undefined,
        backgroundUrl:new URL(`./assets/${space.image}.webp`,location.href).href,occupied:Boolean(actor?.id)});
    });
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
    if(!hasRoomKey(getOwner()) && readWalkDraft())destination.searchParams.set('walker','draft');
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
