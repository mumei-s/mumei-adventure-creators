import {FAVORITE_LIMIT,favoriteKey} from './favorites.js?v=28.4.6';

// A collection-specific shelf of saved single-item choices. Applying a favorite
// is delegated to the app so it follows the same selection rules as the picker.
export function createFavoritesPanel({$,el,picker,questions,sampleNode,collection=()=>document.body.dataset.collection||'halloween',onPick}){
 const filters={};let select=null;
 function render(){
  const panel=$('favorite-library'),items=$('favorite-library-items'),status=$('favorite-library-status');if(!panel||!items||!status)return;
  const current=collection(),favorites=picker.getFavorites(),entries=questions.flatMap(question=>(favorites[favoriteKey(current,question.key)]||[]).map(value=>({question,value}))),filter=filters[current]||'all';
  if(!select){const label=el('label','favorite-library-filter');label.append(el('span',null,'分類'));select=el('select');select.id='favorite-library-filter';select.setAttribute('aria-label','お気に入りの分類');select.addEventListener('change',()=>{filters[collection()]=select.value;render();});label.append(select);items.before(label);}
  select.replaceChildren();const all=el('option',null,'すべての項目（'+entries.length+'）');all.value='all';select.append(all);
  for(const question of questions){const count=entries.filter(entry=>entry.question.key===question.key).length,option=el('option',null,question.name+'（'+count+'）');option.value=question.key;select.append(option);}
  select.value=questions.some(question=>question.key===filter)?filter:'all';filters[current]=select.value;
  status.setAttribute('aria-live','polite');status.textContent=(current==='everyday'?'普段使い':'Halloween')+'のお気に入り '+entries.length+'件。各項目'+FAVORITE_LIMIT+'件まで保存できます。';
  items.replaceChildren();const shown=entries.filter(entry=>select.value==='all'||entry.question.key===select.value);
  if(!shown.length){items.append(el('p','favorite-library-empty',entries.length?'この分類のお気に入りはまだありません。見本の☆から保存できます。':'各項目の見本にある☆で保存すると、ここからすぐ選べます。'));return;}
  for(const {question,value} of shown){
   const card=el('article','favorite-library-card');card.dataset.favoriteKey=question.key;card.dataset.value=value;
   const copy=el('div','favorite-library-copy');copy.append(el('span','favorite-library-category',question.name),el('b',null,value.split('｜')[0]));
   card.append(sampleNode(question.key,value),copy);
   const actions=el('div','favorite-library-actions'),pick=el('button','favorite-library-pick','選ぶ'),remove=el('button','favorite-library-remove','外す');pick.type=remove.type='button';
   pick.setAttribute('aria-label',question.name+'のお気に入り「'+value+'」を選ぶ');remove.setAttribute('aria-label',question.name+'の「'+value+'」をお気に入りから外す');
   pick.addEventListener('click',()=>onPick(question.key,value));remove.addEventListener('click',()=>{if(picker.removeFavorite(question.key,value,current))render();});actions.append(pick,remove);card.append(actions);items.append(card);
  }
 }
 return {render};
}
