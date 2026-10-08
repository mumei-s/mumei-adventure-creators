import {candidateAvailability} from './compatibility.js?v=28.4.0';
import {automaticView} from './view-constraints.js?v=28.4.0';

export const automaticSelection=automaticView;
export function automaticCandidates(question){
 const preferred=(question.autoValues||question.groups.flatMap(group=>group.values)).filter(value=>!automaticSelection(value));
 return [...new Set(preferred.length?preferred:question.groups.flatMap(group=>group.values).filter(value=>!automaticSelection(value)))];
}
export function randomChoice(values,random=Math.random,{recent=[],offset=0}={}){
 if(!values.length)return undefined;
 const unseen=values.filter(value=>!recent.slice(-3).includes(value)),notLast=values.filter(value=>value!==recent.at(-1));
 const available=unseen.length?unseen:notLast.length?notLast:values;
 const draw=Number(random()),unit=Number.isFinite(draw)?Math.max(0,Math.min(1-Number.EPSILON,draw)):0;
 return available[(Math.floor(unit*available.length)+offset)%available.length];
}
export function selectionFingerprint(values,keys){
 // The unified scene owns its internal place. Hidden dialogue and a different
 // internal location must not make identical visible proposal cards look new.
 const active=values.sceneUnified?keys.filter(key=>!['place','line'].includes(key)):keys;
 return JSON.stringify(active.map(key=>[key,values[key]||'']));
}

// Sample against all explicit choices, including choices later in the form.
// AUTO sentinels are controls, not the sole option in an automatic pool.
export function sampleAutomaticSelections(questions,input,random,{recent=[],attempt=0}={}){
 const fixed=Object.fromEntries(questions.filter(q=>!automaticSelection(input[q.key])).map(q=>[q.key,input[q.key]])),resolved={};
 const noPerson=()=>/風景を主役|モチーフだけ|紋章・アイコン/.test((fixed.costume||resolved.costume)||'');
 for(const [index,q] of questions.entries()){
  if(Object.hasOwn(fixed,q.key)){resolved[q.key]=fixed[q.key];continue;}
  if(noPerson()&&['mood','pose'].includes(q.key)){resolved[q.key]=q.key==='pose'?'おまかせ':'毎回大胆に変える';continue;}
  const candidates=automaticCandidates(q).map(value=>({value,...candidateAvailability(q.key,value,{...fixed,...resolved})}));
  const compatible=candidates.filter(candidate=>candidate.enabled&&candidate.status==='compatible'),enabled=candidates.filter(candidate=>candidate.enabled);
  const available=compatible.length?compatible:enabled;
  // Retain a concrete failed candidate when no choice can satisfy the pinned
  // values. Existing selectionConflicts then carries its explanatory reason.
  const pool=(available.length?available:candidates).map(candidate=>candidate.value);
  resolved[q.key]=randomChoice(pool,random,{recent:recent.map(values=>values[q.key]),offset:attempt?attempt*(index+1):0})||'おまかせ';
 }
 return resolved;
}

export class RepeatedSelectionError extends Error{
 constructor(values,keys){
  super('固定した項目を保つと、新しい組み合わせの候補が不足しています。おまかせにする項目を増やすか、直近の組み合わせを使ってください。');
  this.name='RepeatedSelectionError';this.code='auto-candidates-exhausted';this.values=values;this.keys=keys;
  this.issues=[{severity:'warning',code:this.code,keys,reason:this.message}];
 }
}
