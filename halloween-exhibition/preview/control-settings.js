/** Compact, shared thumb and scene-size controls. */
export function createControlSettings({getMode,setMode,getZoom,setZoom}){
 const make=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;},section=make('section'),label=make('label','移動パッド'),select=make('select');section.className='control-settings';label.append(select);
 for(const [value,text]of[['slide','スライドパッド（おすすめ）'],['fixed','従来の十字キー']]){const option=make('option',text);option.value=value;select.append(option);}select.value=getMode();select.onchange=()=>setMode(select.value);
 const hint=make('p','パッドを触れた位置から滑らせて方向を変えます。枠から指がずれても操作でき、離すと止まります。');hint.className='subtle';
 const zoomLabel=make('label','ゲーム内の拡大・縮小'),range=make('input'),output=make('output');Object.assign(range,{type:'range',min:'.65',max:'1.4',step:'.05',value:String(getZoom())});range.setAttribute('aria-label','ゲーム内の拡大・縮小');
 const update=()=>{output.textContent=`${Math.round(getZoom()*100)}%`;range.setAttribute('aria-valuetext',output.textContent);};range.oninput=()=>{setZoom(Number(range.value));update();};update();zoomLabel.append(range,output);
 const reset=make('button','ゲーム倍率を戻す');reset.type='button';reset.onclick=()=>{setZoom(1);range.value='1';update();};
 section.append(label,hint,zoomLabel,make('p','探索画面を2本指で広げると拡大、狭めると縮小できます。文字やボタンも大きくなった場合は、ブラウザの拡大です。そのまま2本指で縮小できます。'),reset);return section;
}
