import { automaticVehicle, vehicleLabels } from '../../../tower/avatar-travel.js?v=20261119-scene';
import { creatorReference } from '../../../tower/prompt-play.js?v=20261119-handoff';
import { inspectImage, artworkMime } from '../../../tower/quality-assist.js?v=20261119-scene';
import { pendingMediaUrl, setArtworkSource } from '../../../tower/public-directory.js?v=20261119-review';
import { prepareSpotFile } from './spot-handoff.js?v=20261119-handoff';

export function bindSpotReferences(dialog, context, changed) {
  const el=id=>dialog.querySelector('#'+id);
  const message=el('spot-message');
  const person=el('spot-person'), item=el('spot-item');
  const slots=[
    {mode:person, input:el('spot-image'), preview:el('spot-image-preview'), wrap:el('spot-person-file'), clear:el('spot-reset-reference'), save:el('spot-save-reference'), label:'人物'},
    {mode:item, input:el('spot-item-image'), preview:el('spot-item-preview'), wrap:el('spot-item-file'), clear:el('spot-reset-item'), save:el('spot-save-item'), label:'乗り物・小物'},
  ];
  function clearFile(slot) {
    if(slot.url) URL.revokeObjectURL(slot.url);
    slot.input.value='';slot.url='';slot.issue='';slot.creator='';slot.file=null;
  }
  function reset() {
    for(const slot of slots){clearFile(slot);slot.mode.value='auto';}
  }
  function available() {
    const {spot,id}=context();
    return id && id===spot?.id && spot.occupied ? spot.vehicles || {} : {};
  }
  function recent() {
    const {id}=context();
    try{return sessionStorage.getItem('atelier-illustration-vehicle.'+id);}catch{return null;}
  }
  function selection() {
    const {spot,id}=context();
    const vehicles=available();
    const kind=item.value==='auto' ? automaticVehicle(vehicles,spot?.vehiclePlace,recent()) : item.value;
    const source=vehicles[kind];
    const sceneItem=spot?.vehiclePlace==='car'||spot?.vehiclePlace==='garage'||spot?.vehiclePlace==='parkingTower' ? '車' : vehicleLabels[spot?.vehiclePlace];
    const reference=person.value==='none' ? {referenceMode:'none'} : person.value==='attachment' ?
      {referenceMode:'attachment'} : creatorReference(id,spot?.id,spot?.avatarSource);
    const object=item.value==='attachment' ? {mode:'attachment'} : source ? {mode:'registered',label:vehicleLabels[kind],url:source,fallback:pendingMediaUrl(source)} : item.value==='none' ? {mode:'none'} : {mode:'chat',label:sceneItem};
    reference.selectedFile=Boolean(slots[0].file);
    object.selectedFile=Boolean(slots[1].file);
    return {reference,item:object,kind,sceneItem,issue:slots.find(s=>s.issue)?.issue||'',key:[reference.referenceMode,reference.referenceUrl,person.value,slots[0].url,object?.url,item.value,slots[1].url]};
  }
  let lastOptions='';
  function paint() {
    const vehicles=available(),keys=Object.keys(vehicles),signature=keys.join(',');
    if(signature!==lastOptions){
      const picked=item.value;
      for(const option of [...item.options])if(option.dataset.owned)option.remove();
      for(const kind of keys){
        const option=new Option('自分の'+vehicleLabels[kind],kind);option.dataset.owned='true';
        item.add(option,item.options[item.options.length-2]);
      }
      item.value=Object.hasOwn(vehicleLabels,picked) && !vehicles[picked] ? 'auto' : picked;
      lastOptions=signature;
    }
    const {spot,id}=context(), result=selection(), ref=result.reference, object=result.item;
    const saved=ref.referenceMode==='registered'||ref.referenceMode==='local';
    const auto=automaticVehicle(vehicles,spot?.vehiclePlace,recent());
    item.options[0].textContent=auto?'自動（自分の'+vehicleLabels[auto]+'）':'自動（同じチャットの'+(result.sceneItem||'物')+'があれば）';
    el('spot-reference-status').textContent=person.value==='none' ? '人物を描かず、場所や選んだ物を主役にします。' : ref.selectedFile ? '選んだ画像を、この場面の人物に使います。' : saved ?
      '@'+id+' の登録キャラを使います。'+(ref.referenceMode==='registered'?'画像の参照先がプロンプトに入ります。':'同じChatGPTチャットの元絵を使えます。') :
      '人物用には自分の絵・使用許可のある絵を添付するか、同じチャットで指定してください。';
    el('spot-item-status').textContent=object.selectedFile?'選んだ画像を、この場面の乗り物・小物に使います。':object?.mode==='registered'?'自分の'+object.label+'の参照先が入ります。ChatGPTが画像を開けないときだけ、下の保存ボタンで車両画像を添えてください。':
      object?.mode==='attachment'?'人物用とは別に、使いたい物を１枚添付できます。同じチャットで作った物は、その絵を指定しても使えます。':
      item.value==='none'?'この絵には自分の乗り物・小物を入れません。':'登録車両がないときは、同じChatGPTチャットで作った場面に合う自分の物が１つなら使います。別チャットで作った物は下の欄で指定できます。';
    for(const [i,slot] of slots.entries()){
      const registered=i===0 ? (saved ? spot.avatarSource : '') : object?.url;
      const source=slot.url||registered||'';
      slot.wrap.hidden=slot.mode.value==='none';
      slot.clear.hidden=slot.mode.value==='auto';
      slot.save.hidden=!registered;
      if(slot.preview.dataset.source!==source){
        slot.preview.dataset.source=source;
        if(source)setArtworkSource(slot.preview,source);else slot.preview.removeAttribute('src');
      }
      slot.preview.hidden=!source;
    }
    return result;
  }
  for(const [i,slot] of slots.entries()){
    slot.input.addEventListener('change',async()=>{
      const file=slot.input.files[0];
      if(slot.url)URL.revokeObjectURL(slot.url);
      slot.file=null;
      slot.url=file?URL.createObjectURL(file):'';
      slot.creator=context().id;slot.issue=file?slot.label+'の画像を検査中です。':'';
      slot.mode.value=file?'attachment':'auto';
      const chosen=slot.url;
      message.textContent=slot.issue;changed();
      if(!file)return;
      try{
        const review=await inspectImage(file,'reference');
        if(chosen!==slot.url)return;
        const error=review.errors.join(' ');
        if(!error){
          const ready=await prepareSpotFile(file,i===0?'person':'item');
          if(chosen!==slot.url)return;
          slot.file=ready;
        }
        slot.issue=error;
      }
      catch(error){if(chosen!==slot.url)return;slot.issue=error.message;}
      changed();message.textContent=selection().issue||slot.label+'の参照画像を渡せる状態になりました。';
    });
    slot.mode.addEventListener('change',()=>{
      clearFile(slot);
      if(i===1 && Object.hasOwn(available(),item.value)){
        try{sessionStorage.setItem('atelier-illustration-vehicle.'+context().id,item.value);}catch{}
      }
      changed();message.textContent='';
    });
    slot.clear.addEventListener('click',()=>{clearFile(slot);slot.mode.value='auto';changed();message.textContent='';});
    slot.preview.addEventListener('error',()=>{slot.preview.hidden=true;});
    slot.save.addEventListener('click',async()=>{
      const source=slot.preview.dataset.source;
      if(!source||slot.save.hidden)return;
      const owner=context().id, selected=selection(),kind=i===0?'avatar':selected.kind;
      const stillSelected=()=>slot.preview.dataset.source===source && context().id===owner && !slot.save.hidden;
      try{
        let response=await fetch(source);
        const pending=pendingMediaUrl(source);
        if(response.status===404 && pending)response=await fetch(pending);
        if(!response.ok)throw Error();
        const bytes=await response.blob();
        const mime=artworkMime(new Uint8Array(await bytes.slice(0,12).arrayBuffer()));
        if(!mime)throw Error();
        if(!stillSelected())return;
        const url=URL.createObjectURL(bytes.slice(0,bytes.size,mime)), download=document.createElement('a');
        download.href=url;download.download=owner+'-'+kind+'.'+mime.split('/')[1].replace('jpeg','jpg');download.click();
        setTimeout(()=>URL.revokeObjectURL(url),30000);
        message.textContent=slot.label+'の参照画像を保存しました。';
      }catch{
        if(!stillSelected())return;
        const original=document.createElement('a');original.href=slot.preview.currentSrc||source;
        original.textContent='元の画像を開く';original.target='_blank';original.rel='noopener';
        message.replaceChildren('画像を開いて長押しまたは右クリックで保存できます。 ',original);
      }
    });
  }
  window.addEventListener('pagehide',event=>{if(!event.persisted)reset();});
  function changeCreator(id){
    for(const slot of slots){
      if(slot.url && slot.creator && slot.creator!==id){clearFile(slot);slot.mode.value='auto';}
    }
  }
  function commitCreator(id){for(const slot of slots)if(slot.url&&!slot.creator)slot.creator=id;}
  return {paint,selection,reset,changeCreator,commitCreator,files:()=>slots.map(slot=>slot.file).filter(Boolean)};
}
