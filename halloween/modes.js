import {questions,visibleQuestions,AUTO,defaults,resolveSelections} from './catalog.js?v=18.0.1';
export const modeKeys={detail:visibleQuestions.map(q=>q.key),simple:['design','medium','place','type','size'],auto:['size']};
export const modeCopy={detail:'10項目を、一つずつ。項目の名前と説明から細かく選べます。',simple:'形式・作風・舞台・文字・サイズを選ぶだけ。残りは場面に合わせておまかせ。',auto:'サイズを選んで「組み合わせを提案」。気に入った項目の組み合わせで制作します。'};
export function initialSelections(){return Object.fromEntries(questions.map((q,i)=>[q.key,defaults[i]]));}
export function effectiveSelections(mode,values){return Object.fromEntries(questions.map(q=>[q.key,(q.key==='line'?modeKeys[mode].includes('type'):modeKeys[mode].includes(q.key))?values[q.key]:q.key==='mood'?'毎回大胆に変える':AUTO]));}
export function propose(previous,random){
 const values=resolveSelections(initialSelections(),random);values.size=previous.size;values.mood='毎回大胆に変える';
 return values;
}
