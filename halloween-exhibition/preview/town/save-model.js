import {initialTownState,restoreTownState} from './town-model.js?v=20261019-journey1';

// This namespace belongs only to the outside-town game. It never reads,
// rewrites or clears palace, exhibition, editor or adventure saves.
export const TOWN_SAVE_KEY='mumei:lantern-town:rpg:v1';
export const TOWN_SAVE_BACKUP_KEY=`${TOWN_SAVE_KEY}:recovery`;
export function exportTownState(state){return JSON.stringify({version:1,savedAt:Date.now(),state:restoreTownState(state)},null,2);}
export function importTownState(text){
  if(typeof text!=='string'||text.length>100000)return {ok:false,code:'invalid',notice:'街歩きの保存ファイルが大きすぎるか、形式が違う。'};
  let value;try{value=JSON.parse(text);}catch{return {ok:false,code:'corrupt',notice:'街歩きの保存ファイルを読み取れなかった。'};}
  const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  if(value?.version!==1||value.state?.version!==1||!record(value.state?.position)||!record(value.state?.flags)||!record(value.state?.inventory))return {ok:false,code:'version',notice:'この街歩きの保存形式には対応していない。'};
  return {ok:true,state:restoreTownState(value.state),savedAt:value.savedAt};
}
export function createTownStore(providedStorage){
  let blocked=null;
  function storage(){if(providedStorage!==undefined)return providedStorage;try{return globalThis.localStorage;}catch{return null;}}
  function load(){
    try{
      const source=storage();if(!source){blocked='unavailable';return {ok:false,state:initialTownState(),notice:'この端末では保存を読み込めない。街歩きは続けられる。',code:'unavailable'};}
      const text=source.getItem(TOWN_SAVE_KEY);if(text===null){blocked=null;return {ok:true,state:initialTownState(),empty:true};}
      const parsed=importTownState(text);
      if(!parsed.ok){blocked=parsed.code;return {...parsed,state:initialTownState(),notice:'街歩きの保存を読み込めなかった。元の保存は残してあるため、自動保存を止めている。'};}
      blocked=null;return parsed;
    }catch{blocked='unavailable';return {ok:false,state:initialTownState(),notice:'街歩きの保存を読み込めない。端末の保存設定を確認して。',code:'unavailable'};}
  }
  function save(state){
    if(blocked)return {ok:false,code:'protected',notice:'読み込めなかった元の保存を保護している。保存の書き出し、または新しい旅の開始で確認して。'};
    if(state?.version!==1)return {ok:false,notice:'街歩きの状態を保存できなかった。',code:'invalid'};
    try{
      const target=storage();if(!target)return {ok:false,notice:'この端末では街歩きを保存できない。画面を閉じると今回の続きは失われる。',code:'unavailable'};
      const clean=restoreTownState(state),savedAt=Date.now();
      target.setItem(TOWN_SAVE_KEY,JSON.stringify({version:1,savedAt,state:clean}));
      return {ok:true,savedAt};
    }catch(error){return {ok:false,notice:error?.name==='QuotaExceededError'?'端末の保存容量が足りない。街歩きの続きはまだ保存できていない。':'街歩きの続きを保存できなかった。この画面では遊びを続けられる。',code:error?.name==='QuotaExceededError'?'quota':'unavailable'};}
  }
  function readRaw(){try{return storage()?.getItem(TOWN_SAVE_KEY)??null;}catch{return null;}}
  function replace(state){
    if(state?.version!==1)return {ok:false,notice:'街歩きの状態を読み込めなかった。',code:'invalid'};
    try{const target=storage();if(!target)return {ok:false,notice:'この端末では保存できない。'};const old=target.getItem(TOWN_SAVE_KEY);if(old!==null)target.setItem(TOWN_SAVE_BACKUP_KEY,old);target.setItem(TOWN_SAVE_KEY,exportTownState(state));blocked=null;return {ok:true,savedAt:Date.now()};}catch{return {ok:false,notice:'街歩きの保存を置き換えられなかった。元の保存は残っている。'};}
  }
  function clear(){try{const target=storage();if(!target)return {ok:false,notice:'街歩きの保存を消去できなかった。'};target.removeItem(TOWN_SAVE_KEY);blocked=null;return {ok:true};}catch{return {ok:false,notice:'街歩きの保存を消去できなかった。'};}}
  return {load,save,clear,readRaw,replace};
}
export function loadTownState(storage){return createTownStore(storage).load();}
export function saveTownState(state,storage){return createTownStore(storage).save(state);}
