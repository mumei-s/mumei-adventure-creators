import {questions,visibleQuestions,AUTO,defaults,resolveSelections} from './catalog.js?v=28.2.0';
import {selectionConflicts} from './compatibility.js?v=28.2.0';
import {selectionFingerprint,RepeatedSelectionError} from './random-selections.js?v=28.2.0';
export const modeKeys={detail:visibleQuestions.map(q=>q.key),simple:['medium','theme','design','type','size'],auto:['size']};
export const modeCopy={detail:'作風・画材から、シーン・主役・動き・構図を決め、最後に形式・文字・サイズを選びます。',simple:'作風・画材、世界観・シーン、デザイン、文字、サイズの順に選びます。残りは場面に合わせておまかせ。',auto:'サイズを選んで「組み合わせを提案」。気に入った項目の組み合わせで制作します。'};
export function questionsForMode(mode){return (modeKeys[mode]||modeKeys.detail).map(key=>visibleQuestions.find(q=>q.key===key));}
export function initialSelections(){return Object.fromEntries(questions.map((q,i)=>[q.key,defaults[i]]));}
export function effectiveSelections(mode,values){return {...Object.fromEntries(questions.map(q=>[q.key,(q.key==='line'?modeKeys[mode].includes('type'):modeKeys[mode].includes(q.key))?values[q.key]:q.key==='mood'?'毎回大胆に変える':AUTO])),sceneUnified:true};}
export function propose(previous={},random=Math.random,{recent=[],requireFresh=true}={}){
 return resolveSelections({...initialSelections(),...previous,sceneUnified:true},random,{recent,requireFresh});
}
export function proposalBatch(previous={},random=Math.random,{recent=[],count=3}={}){
 const proposals=[],issues=[];
 for(let index=0;index<count;index++){
  let values;
  try{values=propose(previous,random,{recent:[...recent,...proposals]});}
  catch(error){if(error.code!=='auto-candidates-exhausted')throw error;issues.push(...error.issues);break;}
  const conflicts=selectionConflicts(values);
  if(conflicts.length){issues.push(...conflicts.map(issue=>({...issue,severity:'error',values})));break;}
  const keys=questions.map(q=>q.key),signature=selectionFingerprint(values,keys);
  if([...recent,...proposals].some(previous=>selectionFingerprint(previous,keys)===signature)){issues.push(...new RepeatedSelectionError(values,[]).issues);break;}
  proposals.push(values);
 }
 return {proposals,issues};
}
