import {questions,AUTO,defaults,resolveSelections} from './catalog.js?v=7';
export const modeKeys={detail:questions.map(q=>q.key),simple:['design','medium','theme','type','size'],auto:['size']};
export const modeCopy={detail:'10項目を、一つずつ。作例を見ながら細かく選べます。',simple:'形式・画風・テーマ・文字・サイズを選ぶだけ。残りは毎回おまかせ。',auto:'サイズを選んで「組み合わせを提案」。気に入った作例の組み合わせで制作します。'};
export function initialSelections(){return Object.fromEntries(questions.map((q,i)=>[q.key,defaults[i]]));}
export function effectiveSelections(mode,values){return Object.fromEntries(questions.map(q=>[q.key,modeKeys[mode].includes(q.key)?values[q.key]:q.key==='mood'?'毎回大胆に変える':AUTO]));}
export function propose(previous,random){
 const values=resolveSelections(initialSelections(),random);values.size=previous.size;values.mood='毎回大胆に変える';
 return values;
}
