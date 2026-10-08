// Display the same compatibility decisions used by selection and generation.
// No choice is rewritten here; edit buttons open the existing picker.
export function candidateNotice(panel,availability,el){
 const reason=availability?.reason||'';
 panel.hidden=!reason;panel.dataset.status=availability?.enabled===false?'blocked':'warning';
 panel.setAttribute('role',availability?.enabled===false?'alert':'status');
 panel.replaceChildren();
 if(reason)panel.append(el('b',null,availability.enabled===false?'この組み合わせは選べません':'組み合わせの確認点'),el('p',null,reason));
}
export function updateSelectionFeedback({panel,choices,issues=[],questions,values,el,onEdit}){
 for(const choice of choices){
  const relevant=issues.filter(issue=>issue.keys.includes(choice.dataset.key));
  const blocked=relevant.some(issue=>issue.status==='blocked');
  choice.classList.toggle('choice-conflict',blocked);choice.classList.toggle('choice-warning',!blocked&&relevant.length>0);
  let badge=[...choice.children].find(node=>node.className==='choice-issue');
  if(relevant.length&&!badge){badge=el('span','choice-issue');choice.append(badge);}
  if(badge){badge.hidden=!relevant.length;badge.textContent=blocked?'組み合わせを変更':'確認点あり';}
  if(relevant.length)choice.setAttribute('aria-describedby','selection-notice');else choice.removeAttribute('aria-describedby');
 }
 panel.hidden=!issues.length;
 const stamp=JSON.stringify(issues.map(issue=>[issue.status,issue.keys,issue.reason,issue.keys.map(key=>values[key])]));
 if(panel.dataset.stamp===stamp)return;panel.dataset.stamp=stamp;panel.replaceChildren();
 if(!issues.length)return;
 panel.setAttribute('role',issues.some(issue=>issue.status==='blocked')?'alert':'status');
 panel.append(el('b',null,issues.some(issue=>issue.status==='blocked')?'組み合わせを選び直してください':'この組み合わせの確認点'));
 for(const issue of issues){
  const row=el('div','selection-issue'),labels=issue.keys.map(key=>questions.find(q=>q.key===key)?.name||key);
  row.append(el('p','selection-issue-values',labels.map((label,i)=>label+'「'+(values[issue.keys[i]]||'おまかせ')+'」').join(' × ')),el('p',null,issue.reason));
  const actions=el('div','selection-issue-actions');
  for(const key of issue.keys){const question=questions.find(q=>q.key===key);if(!question||question.hidden)continue;const button=el('button','text-button',question.name+'を選び直す');button.type='button';button.addEventListener('click',()=>onEdit(question));actions.append(button);}
  row.append(actions);panel.append(row);
 }
}
