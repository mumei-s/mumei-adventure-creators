import {questions,visibleQuestions,AUTO,defaults,resolveSelections} from './catalog.js?v=28.1.1';
export const modeKeys={detail:visibleQuestions.map(q=>q.key),simple:['medium','theme','design','type','size'],auto:['size']};
export const modeCopy={detail:'作風・画材から、シーン・主役・動き・構図を決め、最後に形式・文字・サイズを選びます。',simple:'作風・画材、世界観・シーン、デザイン、文字、サイズの順に選びます。残りは場面に合わせておまかせ。',auto:'サイズを選んで「組み合わせを提案」。気に入った項目の組み合わせで制作します。'};
export function questionsForMode(mode){return (modeKeys[mode]||modeKeys.detail).map(key=>visibleQuestions.find(q=>q.key===key));}
export function initialSelections(){return Object.fromEntries(questions.map((q,i)=>[q.key,defaults[i]]));}
export function effectiveSelections(mode,values){return {...Object.fromEntries(questions.map(q=>[q.key,(q.key==='line'?modeKeys[mode].includes('type'):modeKeys[mode].includes(q.key))?values[q.key]:q.key==='mood'?'毎回大胆に変える':AUTO])),sceneUnified:true};}
export function propose(previous,random){
 const values=resolveSelections({...initialSelections(),sceneUnified:true},random);values.size=previous.size;values.mood='毎回大胆に変える';
 return values;
}
