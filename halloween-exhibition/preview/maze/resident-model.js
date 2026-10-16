import {layoutProblem} from './creator-runtime.js?v=20261016-resident1';
export const RESIDENT_FICTION='宮殿の住人は、このゲームのために作られた架空の人物です。参加者とは別の登場人物です。';
export const RESIDENT_STORIES=Object.freeze({
 'resident-archivist':Object.freeze({label:'司書エルマ',role:'宮殿の司書',greeting:'おかえりなさい、無名S note。書庫の物語は、今夜もあなたの灯りを待っています。',topics:Object.freeze([
  {label:'書庫について',reply:'ここは、訪れた人の物語が出会う場所。青い額縁から展示記事を開けます。'},
  {label:'夜明けの鐘について',reply:'鐘に必要なのは六つのしるし。魔女や仮面の散歩者との腕試しは、夜明けの条件には含まれません。'},
 ])}),
 'resident-gardener':Object.freeze({label:'庭師オットー',role:'宮殿の庭師',greeting:'無名S note、夜の庭から帰ってきたところです。ランタンの灯りが見えると、ここが家だとわかります。',topics:Object.freeze([
  {label:'宮殿の仲間について',reply:'作品を持って集まった仲間と、ここで暮らす私たち。どちらにも、好きなときに話しかけてください。'},
  {label:'巡回のこと',reply:'私は花の手入れへ。モンスターたちは別の通りを歩いています。腕試しを始めるかは、あなたが選べます。'},
 ])}),
});
export function compileResidents(manifest){
 if(manifest?.schemaVersion!==1)return [];
 const used=new Set();return (Array.isArray(manifest.residents)?manifest.residents:[]).filter(npc=>{
  if(!npc||!RESIDENT_STORIES[npc.id]||used.has(npc.id)||npc.ready!==true||npc.animationReviewed!==true||npc.source?.kind!=='original-game-character'||layoutProblem(npc.asset))return false;
  if(!Number.isFinite(npc.x)||!Number.isFinite(npc.z))return false;used.add(npc.id);return true;
 }).map(npc=>({...npc,label:RESIDENT_STORIES[npc.id].label,name:RESIDENT_STORIES[npc.id].label,actorKind:'resident',groupId:npc.id,interactive:true,heightPx:86,heightWorld:2.35}));
}
