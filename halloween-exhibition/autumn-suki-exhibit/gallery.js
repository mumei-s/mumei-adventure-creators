"use strict";
const $=s=>document.querySelector(s);
const grid=$("#grid"), search=$("#search"), more=$("#more"), status=$("#status"), random=$("#random"), screen=$("#screen"), theater=$("#theater"), swipe=$("#swipe"), featured=$("#featured"), featuredGrid=$("#featured-grid"), hostGrid=$("#host-grid");
const STEP=12, NORMALIZE=s=>s.normalize("NFKC").toLowerCase(), NOTE="https://note.com", CDN="https://assets.st-note.com/production/uploads/images/";
const viewAll=$("#view-all"), people=$("#all-people");
const seenKey="autumn-suki-2026:watched:v1", film=$("#film-track"), reduce=matchMedia("(prefers-reduced-motion: reduce)");
let namesOnly=false, watched=new Set(), byAuthor=new Map(), buttons=new Map();
function readSeen(raw){try{const a=JSON.parse(raw||"[]");return new Set(Array.isArray(a)?a.filter(s=>typeof s==="string"&&/^n[0-9a-f]+$/.test(s)):[]);}catch{return new Set();}}
function setSeen(keys){const all=keys.every(k=>watched.has(k));for(const k of keys)all?watched.delete(k):watched.add(k);try{localStorage.setItem(seenKey,JSON.stringify([...watched]));}catch{$("#seen-note").textContent="このブラウザは保存を許可していないため、「見たよ」はページを閉じると消えます。";}syncSeen();}
function paintSeen(btn){const {keys,title}=btn.seenInfo;const n=keys.filter(k=>watched.has(k)).length,all=n===keys.length;btn.textContent=keys.length>1?(all?"✓ 全件確認済":n?"見た "+n+"/"+keys.length:"全件見たよ"):(all?"✓ 見たよ":"見たよ");btn.setAttribute("aria-pressed",String(all));btn.setAttribute("aria-label",title+"："+(all?"見たよを外す":keys.length>1?"全記事を見たよにする":"見たよを付ける"));}
function updateSeenButton(btn,items,title){btn.seenInfo={keys:items.map(x=>x.key),title};paintSeen(btn);return btn;}
function seenButton(items,title){const b=el("button","seen-button");b.type="button";b.addEventListener("click",()=>setSeen(b.seenInfo.keys));return updateSeenButton(b,items,title);}
function syncSeen(){document.querySelectorAll(".seen-button").forEach(b=>{if(b.seenInfo)paintSeen(b)});}
try{watched=readSeen(localStorage.getItem(seenKey));}catch{}
window.addEventListener("storage",e=>{if(e.key===seenKey||e.key===null){watched=readSeen(e.newValue);syncSeen();}});
$("#screen-seen").addEventListener("click",e=>{if(e.currentTarget.seenInfo)setSeen(e.currentTarget.seenInfo.keys);});
function buildFilm(){const people=new Set();
const list=[...pinned,...entries].filter(x=>{if(people.has(x.handle))return false;people.add(x.handle);return true;});
const observer=typeof IntersectionObserver==="function"?new IntersectionObserver(es=>{for(const e of es){if(e.isIntersecting){addImage(e.target,e.target.dataset.cover,"eager");observer.unobserve(e.target);}}},{root:film,rootMargin:"0px 160px"}):null;
for(const x of list){const a=el("a","film-frame");a.href=x.url;a.setAttribute("aria-label",x.name+"の作品： "+x.title);a.append(el("span","film-fallback",x.name));film.append(a);if(x.cover&&observer){a.dataset.cover=x.cover;observer.observe(a);}else if(x.cover)addImage(a,x.cover);}
let visible=false, manualTill=0;
if(typeof IntersectionObserver==="function")new IntersectionObserver(es=>{visible=es[0].isIntersecting;}).observe(film);else visible=true;
for(const event of ["pointerdown","wheel","keydown"])film.addEventListener(event,()=>{manualTill=Date.now()+7000;},{passive:true});
const speeds={slow:36,normal:72,fast:130};
let last=0,nextX=null;
film.addEventListener("scrollend",()=>{if(Date.now()<manualTill)nextX=null;},{passive:true});
function advance(now){
const dt=last?Math.min(now-last,50):0;last=now;
const allowed=visible&&!document.hidden&&!theater.open&&!document.body.classList.contains("paused")&&!film.matches(":hover,:focus-within")&&Date.now()>=manualTill;
if(!allowed){nextX=null;}else{
if(nextX===null||Math.abs(nextX-film.scrollLeft)>5)nextX=film.scrollLeft;
const end=Math.max(0,film.scrollWidth-film.clientWidth);nextX+=dt*(speeds[$("#film-speed").value]||speeds.normal)/1000;
film.scrollLeft=nextX>=end?nextX=0:nextX;}
window.requestAnimationFrame(advance);}
window.requestAnimationFrame(advance);
}
let entries=[], pinned=[], shown=[], limit=STEP, picked="", room=[], pos=0, finger, previousFocus=null;
function el(tag,cls,value){const t=document.createElement(tag);if(cls)t.className=cls;if(value)t.textContent=value;return t}
function addImage(target,src,mode="lazy"){if(!src)return;const img=el("img");img.alt="";img.loading=mode;img.decoding="async";img.referrerPolicy="no-referrer";img.fetchPriority=mode==="lazy"?"low":"auto";img.addEventListener("error",()=>img.remove(),{once:true});img.src=src;target.append(img);}
function card(x,special=false){const a=el("a","card"+(picked===x.url?" picked":""));a.href=x.url;a.dataset.handle=x.handle;
const media=el("div","media");media.setAttribute("aria-hidden","true");addImage(media,x.cover);
const copy=el("div","card-copy");if(special)copy.append(el("span","badge",x.role));if(x.published){const date=el("time","date",new Intl.DateTimeFormat("ja-JP",{timeZone:"Asia/Tokyo",dateStyle:"medium"}).format(new Date(x.published)));date.setAttribute("datetime",x.published);copy.append(date);}copy.append(el("p","creator",x.name),el(special?"h4":"h3",null,x.title),el("small",null,"noteで作品を見る"));a.append(media,copy);const tile=el("div","tile");tile.append(a,seenButton([x],x.title));return tile;}
function namesView(keys){const list=keys.length?entries.filter(x=>keys.every(k=>x.index.includes(k))):[...pinned,...shown];
const seen=new Set(), groups=[["主催",[]],["神7",[]],["参加者",[]]];
for(const x of list){if(seen.has(x.handle))continue;seen.add(x.handle);groups[x.role==="主催"?0:x.role==="神7"?1:2][1].push(x);}
const frag=document.createDocumentFragment();
for(const [title,items] of groups){if(!items.length)continue;const section=el("section","name-group"),heading=el("h3",null,title),ul=el("ul","names-grid");for(const x of items){const item=el("li"),a=el("a",null,x.name);a.href=x.url;item.append(a,seenButton(byAuthor.get(x.handle)||[x],x.name));ul.append(item);}section.append(heading,ul);frag.append(section);}
people.replaceChildren(frag);status.textContent=seen.size?seen.size+"人を名前で表示中":"見つかりませんでした。名前やタイトルの一部でお試しください。";}
function update(reset=true){const keys=NORMALIZE(search.value).trim().split(/\s+/).filter(Boolean);
shown=(keys.length?entries:entries.filter(x=>!x.role)).filter(x=>keys.every(k=>x.index.includes(k)));
featured.hidden=namesOnly||keys.length>0||!pinned.length;$("#participants-head").hidden=namesOnly||keys.length>0;
grid.hidden=namesOnly;people.hidden=!namesOnly;
screen.disabled=random.disabled=!(shown.length||!keys.length&&pinned.length);
if(namesOnly){more.hidden=true;namesView(keys);return;}
if(reset)grid.replaceChildren();const batch=document.createDocumentFragment();for(const x of shown.slice(grid.children.length,limit))batch.append(card(x));grid.append(batch);
status.textContent=shown.length?(keys.length?shown.length+"件。":"作品一覧 ") + Math.min(limit,shown.length)+"件を表示中":"見つかりませんでした。名前やタイトルの一部でお試しください。";more.hidden=shown.length<=limit;screen.disabled=random.disabled=!(shown.length||!keys.length&&pinned.length);}
function currentPool(){return NORMALIZE(search.value).trim()?shown:[...pinned,...shown];}
function openScreen(pool,index){if(!pool.length)return;room=pool;pos=index;previousFocus=document.activeElement;renderFrame(0);theater.showModal();document.body.classList.add("in-theater");}
function renderFrame(direction){const x=room[pos];const media=$("#screen-media");media.replaceChildren();addImage(media,x.cover,"eager");$("#screen-name").textContent=x.name;$("#screen-title").textContent=x.title;$("#position").textContent=(pos+1)+" / "+room.length;$("#watch").href=x.url;updateSeenButton($("#screen-seen"),[x],x.title);
swipe.classList.remove("screen-forward","screen-back");if(direction){requestAnimationFrame(()=>{if(theater.open)swipe.classList.add(direction>0?"screen-forward":"screen-back")});}
$("#prev").disabled=pos===0;$("#next").disabled=pos===room.length-1;}
function step(d){const i=pos+d;if(i<0||i>=room.length)return;pos=i;renderFrame(d);}
function swipeDirection(dx,dy){return Math.abs(dx)>=48&&Math.abs(dx)>=Math.abs(dy)*1.35?(dx<0?1:-1):0}
swipe.addEventListener("pointerdown",e=>{if(e.isPrimary&&e.pointerType!=="mouse")finger={id:e.pointerId,x:e.clientX,y:e.clientY}});
swipe.addEventListener("pointerup",e=>{if(!finger||finger.id!==e.pointerId)return;const d=swipeDirection(e.clientX-finger.x,e.clientY-finger.y);finger=null;if(d)step(d)});
swipe.addEventListener("pointercancel",()=>{finger=null});
theater.addEventListener("keydown",e=>{if(e.key==="ArrowLeft"||e.key==="ArrowRight"){e.preventDefault();step(e.key==="ArrowRight"?1:-1)}});
theater.addEventListener("close",()=>{document.body.classList.remove("in-theater");previousFocus?.focus();finger=null;});
$("#close").addEventListener("click",()=>theater.close());$("#prev").addEventListener("click",()=>step(-1));$("#next").addEventListener("click",()=>step(1));
screen.addEventListener("click",()=>openScreen(currentPool(),0));
viewAll.addEventListener("click",()=>{namesOnly=!namesOnly;viewAll.setAttribute("aria-pressed",String(namesOnly));viewAll.textContent=namesOnly?"カードに戻す":"全員一覧";update();});
search.addEventListener("input",()=>{limit=STEP;picked="";update();});
more.addEventListener("click",()=>{const old=grid.children.length;limit+=STEP;update(false);grid.children[old]?.querySelector("a")?.focus();});
random.addEventListener("click",()=>{const pool=currentPool();const rest=pool.filter(x=>x.url!==picked);const options=rest.length?rest:pool;if(!options.length)return;const x=options[Math.floor(Math.random()*options.length)];picked=x.url;openScreen(pool,pool.indexOf(x));});
function start(){try{const data=JSON.parse($("#exhibit-data").textContent);const accounts=new Set();
entries=data.rows.filter(e=>Array.isArray(e)&&/^[\w.-]+$/.test(e[0])&&/^n[0-9a-f]+$/.test(e[1])&&!accounts.has(e[0])&&accounts.add(e[0])).map(([handle,key,name,title,cover])=>({handle,key,url:NOTE+"/"+handle+"/n/"+key,name,title,cover:/^\d+\/[\w.-]+\.(png|webp|jpe?g|gif)$/i.test(cover||"")?CDN+cover:"",index:NORMALIZE([name,handle,title].join(" "))}));
if(!entries.length)throw Error("empty");const mapRow=([handle,key,name,title,cover,published])=>({handle,key,url:NOTE+"/"+handle+"/n/"+key,name,title,cover:/^\d+\/[\w.-]+\.(png|webp|jpe?g|gif)$/i.test(cover||"")?CDN+cover:"",published,index:NORMALIZE([name,handle,title].join(" "))});
const hosts=data.host.map(mapRow).map(x=>({...x,role:"主催"}));entries=entries.filter(x=>x.handle!=="ai_naoyuki");
const byHandle=new Map(entries.map(x=>[x.handle,x]));const judges=data.pin.filter(([h])=>h!=="ai_naoyuki").map(([handle,role])=>byHandle.has(handle)?Object.assign(byHandle.get(handle),{role}):null).filter(Boolean);
pinned=[...hosts,...judges];entries=[...hosts,...entries];for(const x of entries){if(!byAuthor.has(x.handle))byAuthor.set(x.handle,[]);byAuthor.get(x.handle).push(x);}buildFilm();for(const x of hosts)hostGrid.append(card(x,true));for(const x of judges)featuredGrid.append(card(x,true));
$("#stats").textContent=new Set(entries.map(x=>x.handle)).size+"人・"+entries.length+"記事掲載";$("#snapshot").textContent="マガジン取得日（日本時間）："+new Intl.DateTimeFormat("ja-JP",{timeZone:"Asia/Tokyo",dateStyle:"medium"}).format(new Date(data.updated));$(".controls").hidden=false;update();
}catch{status.classList.add("error");const link=el("a",null,"企画マガジンで作品を見る");link.href=NOTE+"/ai_naoyuki/m/ma1a87b1b24ca";status.replaceChildren("一覧を読み込めませんでした。",link);}}
function rollHost(direction){const width=hostGrid.querySelector(".card")?.getBoundingClientRect().width||200;hostGrid.scrollBy({left:direction*(width+16),behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});}
$("#host-prev").addEventListener("click",()=>rollHost(-1));$("#host-next").addEventListener("click",()=>rollHost(1));
const motion=$("#motion"), layoutButtons=[...document.querySelectorAll(".layout-switch button")];
const layoutKey="autumn-suki-2026:layout:v1", speedKey="autumn-suki-2026:film-speed:v1";
function pref(key){try{return localStorage.getItem(key);}catch{return null;}}
function storePref(key,value){try{localStorage.setItem(key,value);}catch{}}
function chooseLayout(value,persist=false){if(!layoutButtons.some(btn=>btn.dataset.layout===value))value="auto";document.body.dataset.layout=value;for(const btn of layoutButtons)btn.setAttribute("aria-pressed",String(btn.dataset.layout===value));if(persist)storePref(layoutKey,value);}
for(const btn of layoutButtons)btn.addEventListener("click",()=>chooseLayout(btn.dataset.layout,true));
chooseLayout(pref(layoutKey));
const speed=$("#film-speed");const savedSpeed=pref(speedKey);if(["slow","normal","fast"].includes(savedSpeed))speed.value=savedSpeed;
speed.addEventListener("change",()=>storePref(speedKey,speed.value));
function setMotion(paused){document.body.classList.toggle("paused",paused);motion.setAttribute("aria-pressed",String(paused));motion.textContent=paused?"再生":"停止";motion.setAttribute("aria-label",paused?"フィルムを再生":"フィルムを停止");}
setMotion(reduce.matches);
motion.addEventListener("click",()=>setMotion(!document.body.classList.contains("paused")));
reduce.addEventListener?.("change",e=>setMotion(e.matches));
start();
