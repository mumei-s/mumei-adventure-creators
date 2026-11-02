/* Global Atelier theme controller: system/light/dark with persistent setting.
   Reuses the existing #light-play switch so the canvas, effects and workshop remain in sync. */
const THEME_KEY='atelier-global-appearance-v1';
const validModes=new Set(['system','light','dark']);
const buttons=[...document.querySelectorAll('[data-site-theme]')];
const hub=document.querySelector('[data-project-hub]');
const osDark=window.matchMedia('(prefers-color-scheme: dark)');
const oldSwitch=document.getElementById('light-play');
let mode='system';
let applying=false;
try{
  const stored=localStorage.getItem(THEME_KEY);
  if(validModes.has(stored)) mode=stored;
}catch{}
function applyMode(){
  const effectiveDark=mode==='dark'||(mode==='system'&&osDark.matches);
  const want=effectiveDark?'night':'day';
  document.documentElement.dataset.siteTheme=effectiveDark?'dark':'light';
  document.documentElement.style.colorScheme=effectiveDark?'dark':'light';
  document.body.dataset.globalAppearance=mode;
  if(document.body.dataset.lights!==want){
    // The old control also refreshes night artwork, panels and in-game effects.
    if(oldSwitch && document.body.dataset.lights){
      applying=true;
      try{oldSwitch.click();}finally{applying=false;}
    }else document.body.dataset.lights=want;
  }
  if(hub) hub.dataset.ppAppearance=effectiveDark?'dark':'light';
  const themeMeta=document.querySelector('meta[name="theme-color"]');
  if(themeMeta) themeMeta.content=effectiveDark?'#11182b':'#edf3fb';
  for(const button of buttons){
    const chosen=button.dataset.siteTheme===mode;
    button.setAttribute('aria-pressed',String(chosen));
    button.title=chosen?'選択中：'+button.textContent:'画面を'+button.textContent+'に切り替える';
  }
}
function setMode(next){
  if(!validModes.has(next))return;
  mode=next;
  try{localStorage.setItem(THEME_KEY,next);}catch{}
  applyMode();
}
buttons.forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.siteTheme)));
oldSwitch?.addEventListener('click',()=>{
  if(applying)return;
  // Keep the old workshop light switch functional and reflect manual changes.
  queueMicrotask(()=>{
    const actual=document.body.dataset.lights;
    if(actual==='night'||actual==='day')setMode(actual==='night'?'dark':'light');
  });
});
osDark.addEventListener?.('change',()=>{if(mode==='system')applyMode();});
applyMode();
// Module startup and restored drafts may initialize the old switch afterwards.
if(document.readyState!=='complete')window.addEventListener('load',applyMode,{once:true});
