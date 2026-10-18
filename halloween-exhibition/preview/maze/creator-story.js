import {creatorAvailable} from './creator-runtime.js?v=20261017-startup1';

export const CREATOR_STORY_GOAL=3;
export const CREATOR_STORY_FICTION='この寄り道はゲーム内の創作です。登場人物の会話は作者本人の発言ではありません。';
const id=value=>typeof value==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}$/.test(value);
const places={hall:'中央の灯りの交差廊',east:'東の鍵の間',west:'西の肖像の回廊',archive:'北の浮遊書庫'};

/** Encounter records belong to one adventure, separately from article visits and battle marks. */
export function normalizeCreatorStory(value,runId){
  const met=value&&value.runId===runId&&Array.isArray(value.metCreatorIds)?value.metCreatorIds:[];
  return {runId,metCreatorIds:[...new Set(met.filter(id))].slice(0,128)};
}

export function recordCreatorMeeting(value,npc,{runId,roster}={}){
  const record=normalizeCreatorStory(value,runId);
  const accepted=roster?.npcs?.find(item=>item.id===npc?.id&&item.creatorId===npc?.creatorId&&item.interactive!==false);
  if(!accepted||!id(accepted.creatorId)||accepted.creatorId==='ss_yr')return record;
  return {...record,metCreatorIds:[...new Set([...record.metCreatorIds,accepted.creatorId])]};
}

export function creatorStoryChapter({roster,progress,runId,state={}}={}){
  const record=normalizeCreatorStory(progress,runId),groups=new Map();
  for(const npc of roster?.npcs||[]){
    if(npc.interactive===false||npc.creatorId==='ss_yr'||!id(npc.creatorId)||!Number.isFinite(npc.x)||!Number.isFinite(npc.z))continue;
    if(!groups.has(npc.creatorId))groups.set(npc.creatorId,[]);groups.get(npc.creatorId).push(npc);
  }
  const people=[...groups].map(([creatorId,members])=>{
    const npc=members[0],location=places[npc.zone]||'宮殿の回廊',available=creatorAvailable(npc,state);
    return {creatorId,name:npc.name||npc.label,label:npc.label||npc.name,location,available,met:record.metCreatorIds.includes(creatorId),npc,
      hint:npc.needsKey&&!state.unlocked?'東の鍵で北の格子扉をひらくと会えます。':npc.needsCorridor&&!state.horrorAccepted?'西の扉から肖像の回廊へ入ると会えます。':location+'で待っています。'};
  });
  const met=people.filter(person=>person.met),total=people.length,goal=Math.min(CREATOR_STORY_GOAL,total),complete=goal>0&&met.length>=goal;
  const next=people.find(person=>!person.met&&person.available)||people.find(person=>!person.met)||null;
  const chapter=complete?{title:'寄り道 · 灯りをつなぐ出会い',summary:`${goal===3?'三':goal}組との出会いが、夜明けを待つ宮殿を少しにぎやかにした。しるしを探す旅の合間に、まだ会っていない仲間や、作者の本当の記事にも会いに行こう。`}:
    met.length===0?{title:'寄り道 · 最初の挨拶',summary:'消えないランタンを頼りに、まずは回廊に集まった創り手のキャラクターへ。顔と名前がつながると、書庫の一冊も少し身近になる。'}:
    met.length===1?{title:'寄り道 · 顔と名前がつながる',summary:'最初の挨拶が、静かな回廊に小さな灯を残した。次の相手にも会ってみよう。同じ夜に集まった物語にも、それぞれ違う入口がある。'}:
    {title:'寄り道 · 三つ目の灯を探して',summary:'二組との出会いが手帳に並んだ。もう一組へ挨拶を届けよう。北の書庫や西の回廊にも、道がひらくのを待つ仲間がいる。'};
  const short=next?String(next.label).slice(0,26):'';
  return {...chapter,record,people,met,total,goal,complete,next,active:total>0,
    objective:!total?'':complete?`出会いの灯 ${met.length}/${total}組。寄り道を達成。`:`出会いの灯 ${met.length}/${goal}：${short}（${next?.location||'回廊'}）に挨拶。`};
}

/** The journal names real registered authors while keeping its connective story fictional. */
export function renderCreatorStoryJournal(container,chapter,{element,onGuide}={}){
  const section=element('section',undefined,'creator-story-journal');section.append(element('h3',chapter.title),element('p',chapter.summary));
  if(!chapter.active){section.append(element('p','出会いの相手を準備中です。鍵と六つのしるしの冒険は、そのまま進められます。'));container.append(section);return;}
  const bar=element('progress');bar.max=chapter.goal;bar.value=Math.min(chapter.met.length,chapter.goal);bar.setAttribute('aria-label',`出会いの灯 ${bar.value}/${chapter.goal}`);
  section.append(bar,element('p',`この冒険で挨拶した作者 ${chapter.met.length}/${chapter.total}組。まずは${chapter.goal}組との出会いを、もう一つの小さな物語に。`));
  if(chapter.next)section.append(element('p',`次の出会い：${chapter.next.name} · ${chapter.next.location}。${chapter.next.hint}`,'creator-story-next'));
  for(const person of chapter.people){
    const row=element('section',undefined,'creator-npc-card');row.append(element('h4',person.name),element('p',`${person.met?'✦ 挨拶済み':'◇ まだ会っていない'} · ${person.location}`),element('p',person.hint,'subtle'));
    const guide=element('button',person.available?'会いに行く':'扉の手前へ案内');guide.onclick=()=>onGuide(person.npc);row.append(guide);section.append(row);
  }
  section.append(element('p','挨拶は会話をひらくと記録されます。元記事やプロフィールは、その会話から開けます。この寄り道は冒険クリアの必須条件ではありません。','subtle'),element('p',CREATOR_STORY_FICTION,'creator-fiction'));container.append(section);
}
