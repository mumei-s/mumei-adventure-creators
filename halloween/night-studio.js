import {icons,nightIcons as halloweenNightIcons} from './halloween-icons.js?v=28.4.4';
import {studioIcons} from './spells.js?v=28.4.4';
const svg=b=>'<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'+b+'</svg>';
export const nightIcons=[
svg('<path d="M21 76V44C21 10 74 10 74 44v32L61 68 48 79 35 68z" fill="#defcff" stroke="#9291ff" stroke-width="2"/><path d="m18 31 14-9L44 4 65 24 79 32z" fill="#514087" stroke="#dacaff" stroke-width="2"/><path d="m43 15 4 6 7-1-4 5 2 7-6-3-6 4 1-8-5-4z" fill="#ffdb83"/><ellipse cx="37" cy="45" rx="4" ry="6" fill="#362953"/><ellipse cx="59" cy="45" rx="4" ry="6" fill="#362953"/><path d="M40 57q8 9 16 0" fill="none" stroke="#362953" stroke-width="3"/>'),
svg('<path d="M29 49 23 25 41 35M56 35l16-10-4 25" fill="#413452" stroke="#bd9fff" stroke-width="2"/><ellipse cx="48" cy="55" rx="27" ry="22" fill="#382d4a"/><path d="m28 27 8-6 9-16 14 20 10 3z" fill="#67559d"/><ellipse cx="37" cy="53" rx="7" ry="4" fill="#bcfff1"/><ellipse cx="59" cy="53" rx="7" ry="4" fill="#bcfff1"/><path d="m45 61 3 3 3-3m-3 3v5m-15 1 11 4 16-4" fill="none" stroke="#d4bcfa" stroke-width="2"/><path d="M28 66 7 61m22 11L7 74m61-8 21-5m-21 11 21 2" stroke="#aee6f4" stroke-width="2"/>'),
svg('<path d="m39 38-31-22 7 26L3 56l21 2 5 21 18-12 20 12 6-21 20-2-12-14 7-26-32 22" fill="#7160a8" stroke="#aebdff" stroke-width="2"/><path d="m38 37 1-17 11 13 11-13-1 17c17 28-2 38-11 36-12 0-29-13-11-36" fill="#393164"/><circle cx="43" cy="45" r="4" fill="#affff3"/><circle cx="57" cy="45" r="4" fill="#affff3"/>'),
svg('<path d="M39 24v-9q9-14 18 0v9" fill="none" stroke="#c9ae77" stroke-width="4"/><path d="m29 28 38 0-4 48H33z" fill="#8d6194" stroke="#e5bd86" stroke-width="3"/><path d="M37 36h22v31H37z" fill="#fbc778"/><path d="M48 40v21m-9-10h18" stroke="#d97d55" stroke-width="3"/><path d="m25 27 23-9 23 9-3 7H28zm6 50h34l5 9H26z" fill="#564363" stroke="#e5bd86" stroke-width="2"/>')];
export function currentHalloweenIcons(){return document.body.dataset.lights==='night'?nightIcons:icons;}
// Ordinary evenings use familiar night scenes, independently of Halloween's
// ghosts and monsters. These vectors are UI decoration, never drawing inputs.
export const everydayNightIcons=[
 svg('<path d="M62 10a35 35 0 1 0 22 58A31 31 0 0 1 62 10Z" fill="#ffedb2" stroke="#e2c17d" stroke-width="2"/><path d="m71 23 2 6 6 2-6 2-2 6-2-6-6-2 6-2Zm8 23 1 4 4 1-4 1-1 4-1-4-4-1 4-1Z" fill="#d4efff"/>'),
 svg('<path d="M12 63 33 25 60 49 83 17" fill="none" stroke="#9bcedd" stroke-width="2"/><g fill="#ecf8ff" stroke="#94c0d7" stroke-width="1"><circle cx="12" cy="63" r="5"/><circle cx="33" cy="25" r="7"/><circle cx="60" cy="49" r="5"/><circle cx="83" cy="17" r="6"/></g><path d="m49 73 2 5 6 2-6 2-2 5-2-5-6-2 6-2Z" fill="#ffe8a4"/>'),
 svg('<rect x="19" y="12" width="58" height="72" rx="5" fill="#233a4c" stroke="#b8d5de" stroke-width="3"/><rect x="26" y="20" width="44" height="53" rx="2" fill="#f3d499"/><path d="M48 20v53M26 46h44" stroke="#806b53" stroke-width="4"/><path d="M11 85h74" stroke="#9dc5cf" stroke-width="4"/><path d="m29 57 6-16 4 16m20 0 3-18 5 18" fill="none" stroke="#a88755" stroke-width="2"/>'),
 svg('<path d="M12 68q17-6 34 2V88q-17-8-34-2Zm34 2q17-8 34-2v18q-17-6-34 2Z" fill="#d2e6e7" stroke="#91bbc8" stroke-width="2"/><path d="M61 17h16l10 26H51Z" fill="#f7dea6" stroke="#c29b69" stroke-width="2"/><path d="M69 44v20M57 64h25" stroke="#bad1d5" stroke-width="4"/><path d="M18 76h21m14 0h19" stroke="#6b96a5" stroke-width="2"/>')
];
export function studioAppearance(collection='halloween',lights='day'){
 const everyday=collection==='everyday',night=lights==='night';
 const labels=everyday?(night?['月','星空','窓の灯り','本と灯り']:['太陽','花','カメラ','鉛筆']):(night?['おばけ','コウモリ','一つ目モンスター','スケルトン']:['おばけ','カボチャ','コウモリ','お菓子']);
 const gameLabels=everyday?labels:(night?['魔法使いのおばけ','黒猫','光るコウモリ','ランタン']:labels);
 return {everyday,night,icons:everyday?(night?everydayNightIcons:studioIcons):(night?halloweenNightIcons:icons),gameIcons:everyday?(night?everydayNightIcons:studioIcons):(night?nightIcons:icons),labels,gameLabels,heroIcons:night?(everyday?everydayNightIcons:nightIcons):[],gameTitle:everyday?(night?'夜のモチーフあつめ':'モチーフあつめ'):night?'夜の仲間あつめ':'おばけとお菓子集め',item:everyday?'モチーフ':night?'仲間':'お菓子'};
}
export function refreshNightStudio(){
 const cast=document.querySelector('.night-cast');if(!cast)return;
 const collection=document.body.dataset.collection||'halloween',lights=document.body.dataset.lights||'day',key=collection+':'+lights;
 if(cast.dataset.appearance===key)return;
 const appearance=studioAppearance(collection,lights);cast.dataset.appearance=key;cast.dataset.family=appearance.everyday?'everyday':'halloween';
 cast.innerHTML=appearance.heroIcons.map((art,i)=>'<span class="night-companion night-companion-'+i+'">'+art+'</span>').join('');
}
export function installNightStudio({refresh,sync}){
 const b=document.getElementById('light-play'),cast=document.createElement('div');cast.className='night-cast';cast.setAttribute('aria-hidden','true');document.querySelector('.studio-hero').append(cast);
 function update(on){document.body.dataset.lights=on?'night':'day';b.setAttribute('aria-pressed',String(on));document.getElementById('night-state').textContent=on?'ON ／ 昼へ':'OFF ／ 夜へ';b.setAttribute('aria-label',on?'夜モードをOFFにする':'夜モードをONにする');refreshNightStudio();refresh();sync();try{localStorage.setItem('halloween-night',on?'on':'off');}catch{}}
 let initial=false;try{initial=localStorage.getItem('halloween-night')==='on';}catch{}update(initial);b.addEventListener('click',()=>update(document.body.dataset.lights!=='night'));
}
