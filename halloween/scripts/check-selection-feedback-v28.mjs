import assert from 'node:assert/strict';
import {candidateNotice,updateSelectionFeedback} from '../selection-feedback.js?v=28.4.0';
import {candidateAvailability,selectionConflicts,selectionWarnings} from '../compatibility.js?v=28.4.0';
import {questions} from '../catalog.js?v=28.4.0';

function node(tag='div',cls='',text=''){
 const n={tag,className:cls||'',textContent:text||'',dataset:{},attributes:{},children:[],listeners:{},hidden:false,append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];},addEventListener(k,fn){this.listeners[k]=fn;}};
 n.classList={toggle(c,on){const names=new Set(n.className.split(' ').filter(Boolean));on?names.add(c):names.delete(c);n.className=[...names].join(' ');}};return n;
}
const el=node,text=n=>[n.textContent,...n.children.map(text)].join(' '),panel=node(),choices=['mood','angle','pose','medium'].map(key=>{const n=node('button','choice');n.dataset.key=key;return n;}),opened=[];
const bad={mood:'ローアングル＋威嚇',angle:'真上から・90度',pose:'四つん這いで進む',medium:'発光幻想アニメ'},snapshot=structuredClone(bad);
const issues=values=>[...selectionConflicts(values).map(issue=>({...issue,status:'blocked'})),...selectionWarnings(values).map(issue=>({...issue,status:'warning'}))];
assert.ok(selectionConflicts(bad).length,'The reported camera combination is actually blocked');
updateSelectionFeedback({panel,choices,issues:issues(bad),questions,values:bad,el,onEdit:q=>opened.push(q.key)});
assert.equal(panel.hidden,false);assert.equal(panel.attributes.role,'alert');assert.match(text(panel),/ローアングル＋威嚇/);assert.match(text(panel),/真上から・90度/);
for(const key of ['mood','angle']){const choice=choices.find(n=>n.dataset.key===key);assert.match(choice.className,/choice-conflict/);assert.equal(choice.attributes['aria-describedby'],'selection-notice');}
assert.ok(!choices.find(n=>n.dataset.key==='medium').className.includes('choice-conflict'),'Unrelated art choice is not marked as conflicting');
const edit=panel.children.flatMap(row=>row.children).flatMap(row=>row.children||[]).find(n=>n.tag==='button'&&/アングル/.test(n.textContent));assert.ok(edit);edit.listeners.click();assert.deepEqual(opened,['angle']);assert.deepEqual(bad,snapshot,'Displaying and opening a remedy never rewrites a choice');
const oldChildren=panel.children;updateSelectionFeedback({panel,choices,issues:issues(bad),questions,values:bad,el,onEdit(){}});assert.equal(panel.children,oldChildren,'Repeated render does not reannounce unchanged warnings');
const candidate=node();candidateNotice(candidate,candidateAvailability('angle',bad.angle,bad),el);assert.equal(candidate.hidden,false);assert.equal(candidate.dataset.status,'blocked');assert.equal(candidate.attributes.role,'alert');assert.match(text(candidate),/真上|90|ローアングル/);
const acceptable={...bad,mood:'毎回大胆に変える',pose:'おまかせ',angle:'おまかせ'};
updateSelectionFeedback({panel,choices,issues:issues(acceptable),questions,values:acceptable,el,onEdit(){}});assert.equal(panel.hidden,true);for(const choice of choices){assert.ok(!choice.className.includes('choice-conflict'));assert.equal(choice.attributes['aria-describedby'],undefined);}
candidateNotice(candidate,{enabled:true,reason:'顔が支持面で隠れる可能性があります。'},el);assert.equal(candidate.dataset.status,'warning');assert.equal(candidate.attributes.role,'status');assert.equal(candidate.hidden,false);
candidateNotice(candidate,{enabled:true,reason:''},el);assert.equal(candidate.hidden,true);assert.equal(candidate.children.length,0);
console.log('PASS selection feedback: the reported camera conflict is visible on both fields and the candidate; edit actions open the correct field, values are preserved, unchanged issues stay quiet, and cleared/warning states do not leave stale blockers.');
