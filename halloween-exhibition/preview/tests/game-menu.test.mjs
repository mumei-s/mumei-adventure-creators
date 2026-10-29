import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {cameraDistanceLabel,nextCameraDistance} from '../camera-distance.js';

const sources={town:fs.readFileSync(new URL('../town/app.js',import.meta.url),'utf8'),maze:fs.readFileSync(new URL('../maze/app.js',import.meta.url),'utf8')};
function functionSource(source,name){
 const start=source.indexOf(`function ${name}(`);assert.ok(start>=0,`${name} exists`);
 const rest=source.slice(start),end=rest.slice(1).search(/\n(?:async )?function /);return end<0?rest:rest.slice(0,end+1);
}
function element(tag,text='',className=''){
 const attributes=new Map(),listeners=new Map();return {tag,textContent:text??'',className,children:[],dataset:{},disabled:false,parent:null,
  append(...children){for(const child of children){child.remove();child.parent=this;this.children.push(child);}},
  replaceChildren(...children){for(const child of [...this.children])child.remove();this.append(...children);},
  remove(){if(this.parent){this.parent.children=this.parent.children.filter(child=>child!==this);this.parent=null;}},
  setAttribute(key,value){attributes.set(key,String(value));},getAttribute:key=>attributes.get(key),
  addEventListener(type,listener){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(listener);},
  click(){if(this.disabled)return;this.onclick?.({target:this,currentTarget:this});for(const listener of listeners.get('click')||[])listener({target:this,currentTarget:this});},
  focus(){this.focused=true;},
  querySelector(selector){return this.querySelectorAll(selector)[0]??null;},
  querySelectorAll(selector){return flatten(this).slice(1).filter(node=>selector[0]==='.'?node.className.split(' ').includes(selector.slice(1)):selector[0]==='#'?node.id===selector.slice(1):node.tag===selector);},
 };
}
function flatten(node){return [node,...node.children.flatMap(flatten)];}
function harness(kind,{reward=false,lantern=true,cameraDistance='normal',failedScenery=false,failedArt=0}={}){
 const content=element('div'),close=element('button','閉じる','close'),reload=element('section'),padPosition=element('section'),display=element('section'),record={calls:[],panels:[],display:[],layouts:[],destroyed:{frame:0,layout:0}};
 reload.append(element('button','再読み込み'),element('p','変更を保存してから読み込み直します。'));
 display.append(element('label','旧画面設定'));for(const value of ['auto','phone','tablet','desktop']){const option=element('option','旧表示');option.value=value;display.append(option);}
 const state={position:{x:12,z:34},mapId:'creator-quarter',completed:['invitation'],hasKey:true},before=JSON.stringify(state);
 const recordCall=name=>()=>record.calls.push(name),context=vm.createContext({content,element,el:element,button:(text,onclick,className)=>Object.assign(element('button',text,className),{onclick}),
  settings:{lantern},lantern,cameraDistance,cameraDistanceLabel,motion:true,state,session:{snapshot:()=>({state})},readingProgress:()=>({title:'記事巡り 2/14'}),pageReload:{element:reload},rpgArt:{status:()=>({failed:failedArt})},
  beginPanel:(title,options)=>{context.displayPreferences?.destroy();context.displayPreferences=null;content.replaceChildren();record.panels.push({title,options});},title:(eyebrow,title)=>{content.replaceChildren();record.panels.push({title,eyebrow});},
  panel:{querySelector:selector=>selector==='.close'?close:null,close:recordCall('closePanel')},closePanel:recordCall('closePanel'),openPanel:recordCall('openPanel'),
  padPositionPreferences:{element:padPosition},displaySection:display,displayPreferences:null,scheduleResize:recordCall('resize'),
  initGameDisplay:options=>{record.display.push(options);return {destroy(){record.destroyed.frame++;}};},
  initDisplayMode:options=>{const section=element('section',undefined,'display-preferences'),select=element('select');section.setAttribute('aria-label','表示サイズ');for(const [value,label] of [['auto','自動'],['phone','スマホ用'],['tablet','タブレット用'],['desktop','PC用']]){const option=element('option',label);option.value=value;select.append(option);}section.append(element('label','表示サイズ'),select);options.controlsParent.append(section);record.layouts.push({options,section});return {destroy(){record.destroyed.layout++;section.remove();}};},
  rewardStore:{read:()=>reward},runId:'saved-run',renderer:failedScenery?{status:()=>({failed:['floor']}),retry:async()=>record.calls.push('retryScenery'),invalidate:recordCall('invalidate')}:null,notify:recordCall('notify'),
 });
 const callbacks=['showMap','showWalkingSpeed','showControlSettings','showSettings','showCreatorHomes','showVisitors','showJournal','showTownJournal','showInventory','showSave','showHelp','showCastleReturn','showLighting','showCatalog','showStory','showCreators','showResidents','showEncounters','meetOverlord','resetPosition','showEnding','retryRPGArt'];
 for(const name of callbacks)context[name]=recordCall(name);
 const camera=element('button'),pause=element('button');camera.onclick=()=>{context.cameraDistance=nextCameraDistance(context.cameraDistance);record.calls.push('camera');};pause.onclick=()=>{context.motion=!context.motion;context.updateMotion();};
 context.$=id=>id==='camera-distance'?camera:id==='pause'?pause:flatten(content).find(node=>node.id===id);
 context.toggleLantern=()=>{context.settings.lantern=!context.settings.lantern;context.lantern=!context.lantern;record.calls.push('toggleLantern');};
 context.updateMotion=()=>{const button=context.$('menu-motion-toggle'),status=context.$('menu-motion-status');if(button)button.textContent=context.motion?'演出を止める':'演出を再生';if(status)status.textContent=context.motion?'キャラクターの歩行・光の揺らぎ：再生中':'キャラクターの歩行・光の揺らぎ：停止中';};
 const menuName=kind==='town'?'showMenu':'showExploreMenu';
 vm.runInContext(`${functionSource(sources[kind],menuName)}\n${functionSource(sources[kind],'showMenuLayoutSettings')}\nglobalThis.run={menu:${menuName},layout:showMenuLayoutSettings};`,context);
 const menu=()=>content.children.find(node=>node.dataset.gameMenu==='true'),find=text=>flatten(content).find(node=>node.textContent===text);
 return {context,content,record,reload,padPosition,display,state,before,close,run:context.run,menu,find};
}
const firstSix=['地図','ランタン ON','歩く速さ','パッド・拡大縮小','明るさ・音・表示'];

for(const kind of ['town','maze'])test(`${kind}: actual menu keeps the same six primary controls and one reload cell`,()=>{
 const h=harness(kind);h.run.menu();const menu=h.menu();assert.ok(menu);assert.equal(menu.className,kind==='town'?'town-menu':'explore-menu');assert.equal(menu.getAttribute('aria-label'),'探索メニュー');
 assert.deepEqual(menu.children.slice(0,5).map(node=>node.textContent),firstSix);assert.equal(h.record.panels.at(-1).title,'メニュー');
 assert.equal(menu.children.filter(node=>node===h.reload).length,1);assert.equal(h.reload.children.length,2,'reload button and its status remain together');
 assert.equal(flatten(menu).includes(h.padPosition),false);assert.equal(flatten(menu).includes(h.display),false,'advanced layout controls do not crowd the initial menu');
 assert.equal(menu.children.at(-1).textContent,'探索に戻る');h.find('探索に戻る').click();assert.equal(h.record.calls.at(-1),'closePanel');assert.equal(JSON.stringify(h.state),h.before,'opening and dismissing a menu retains exploration progress and location');
});

for(const kind of ['town','maze'])test(`${kind}: primary controls invoke their existing actions and update toggle labels`,()=>{
 const h=harness(kind);h.run.menu();for(const [label,action] of [['地図','showMap'],['歩く速さ','showWalkingSpeed'],['パッド・拡大縮小','showControlSettings'],['明るさ・音・表示',kind==='town'?'showSettings':'showLighting']]){h.find(label).click();assert.equal(h.record.calls.at(-1),action);}
 const lantern=h.find('ランタン ON');assert.equal(lantern.getAttribute('aria-pressed'),'true');lantern.click();assert.equal(lantern.textContent,'ランタン OFF');assert.equal(lantern.getAttribute('aria-pressed'),'false');lantern.click();assert.equal(lantern.textContent,'ランタン ON');
 assert.equal(flatten(h.menu()).filter(node=>node.textContent.startsWith('視点：')).length,0,'viewpoint has a single dedicated exploration control');
 assert.equal(JSON.stringify(h.state),h.before);if(kind==='maze')assert.equal(h.close.focused,true,'subpanels retain close-button focus');
});

test('town: creator, story, backup, help and castle actions remain reachable after reordering',()=>{
 const h=harness('town');h.run.menu();
 for(const [label,action] of [['クリエイター宅を選ぶ','showCreatorHomes'],['街の仲間','showVisitors'],['物語の手帳','showJournal'],['街の依頼（寄り道）','showTownJournal'],['持ち物','showInventory'],['記録・バックアップ','showSave'],['操作と物語について','showHelp'],['城へ戻る','showCastleReturn']]){h.find(label).click();assert.equal(h.record.calls.at(-1),action);}
 const compare=h.find('キャラ見比べ');assert.equal(compare.href,'../characters/');assert.equal(compare.target,'_blank');assert.equal(compare.rel,'noopener noreferrer');assert.equal(h.menu().children.at(-2).textContent,'城へ戻る');
 h.find('画面レイアウト・パッド位置').click();assert.equal(h.record.panels.at(-1).title,'画面レイアウト・パッド位置');assert.equal(h.record.display.at(-1).page,'town');assert.equal(h.record.display.at(-1).controlsParent,h.content.children[0]);h.record.display.at(-1).onChange();assert.equal(h.record.calls.at(-1),'resize');
 const layout=h.record.layouts.at(-1);assert.equal(layout.options.page,'town');assert.equal(layout.options.controlsParent,h.content.children[0]);assert.ok(h.content.querySelector('.display-preferences'));assert.deepEqual(layout.section.querySelectorAll('option').map(node=>node.value),['auto','phone','tablet','desktop']);
 h.find('メニューに戻る').click();assert.deepEqual(h.record.destroyed,{frame:1,layout:1});assert.equal(layout.section.parent,null,'both controllers are cleaned up when leaving layout settings');assert.deepEqual(h.menu().children.slice(0,5).map(node=>node.textContent),firstSix);assert.equal(JSON.stringify(h.state),h.before);
});

test('maze: catalog, story, resident, battle, reward and exit routes survive the compact menu',()=>{
 const h=harness('maze',{reward:true});h.run.menu();
 assert.equal(h.menu().children[5].id,'overlord-direct-open');assert.equal(h.menu().children[5].className,'primary');
 for(const [label,action] of [['覇王Sに会う・対戦','meetOverlord'],['記事一覧','showCatalog'],['冒険の物語','showStory'],['物語の仲間','showCreators'],['宮殿の住人','showResidents'],['モンスターと遊ぶ','showEncounters'],['クリア記念をもう一度見る','showEnding']]){h.find(label).click();assert.equal(h.record.calls.at(-1),action);}
 for(const [label,url] of [['キャラ見比べ','../characters/'],['クリア名鑑','./clear-gallery/'],['名鑑へ戻る','../?mode=halloween']])assert.equal(h.find(label).href,url);
 assert.equal(h.menu().children.at(-2).textContent,'名鑑へ戻る');h.find('地下の入口へ').click();assert.deepEqual(h.record.calls.slice(-2),['closePanel','resetPosition']);
 const fresh=harness('maze');fresh.run.menu();assert.equal(fresh.find('クリア記念をもう一度見る'),undefined,'reward replay remains conditional on a saved reward');
});

test('maze: motion status and existing layout controls remain accessible and reusable',()=>{
 const h=harness('maze');h.run.menu();const motion=h.context.$('menu-motion-toggle'),status=h.context.$('menu-motion-status');assert.equal(status.getAttribute('role'),'status');assert.equal(status.parent.tag,'details');assert.equal(status.parent.children[0].textContent,'演出の状態');motion.click();assert.match(status.textContent,/停止中/);assert.equal(motion.textContent,'演出を再生');
 h.find('画面レイアウト・パッド位置').click();assert.ok(h.content.children.includes(h.padPosition));assert.ok(h.content.children.includes(h.display));assert.equal(h.display.querySelector('label').textContent,'画面レイアウト');assert.deepEqual(h.display.querySelectorAll('option').map(node=>node.textContent),['自動','スマホ用','タブレット用','PC用']);
 h.find('メニューに戻る').click();h.find('画面レイアウト・パッド位置').click();assert.equal(h.content.children.filter(node=>node===h.display).length,1);assert.equal(h.content.children.filter(node=>node===h.padPosition).length,1);assert.equal(JSON.stringify(h.state),h.before);
});

test('saved lamp preferences remain reflected without a second viewpoint selector',()=>{
 for(const kind of ['town','maze']){const h=harness(kind,{lantern:false});h.run.menu();assert.equal(h.menu().children[1].textContent,'ランタン OFF');assert.equal(h.menu().children[1].getAttribute('aria-pressed'),'false');assert.equal(flatten(h.menu()).some(node=>node.textContent.startsWith('視点：')),false);}
});

for(const kind of ['town','maze'])test(`${kind}: on-scene lantern is hidden only in compact mode while the menu toggle still works`,()=>{
 const css=fs.readFileSync(new URL('../game-shell.css',import.meta.url),'utf8');
 const selector=kind==='town'?'#town-main[data-compact-viewpoint=true] #lantern-toggle':'#game[data-compact-viewpoint=true] #lantern';
 assert.ok(css.includes(selector),'only the exact on-scene lantern is targeted in compact mode');
 const compactRule=css.slice(css.lastIndexOf('/* All frames keep only the selector'));
 assert.match(compactRule,/\{display:none\}/);assert.doesNotMatch(compactRule,/data-game-menu|#menu-lantern/);
 const h=harness(kind);h.run.menu();const toggle=h.find('ランタン ON');assert.ok(toggle);
 toggle.click();assert.equal(toggle.textContent,'ランタン OFF');assert.equal(toggle.getAttribute('aria-pressed'),'false');
 toggle.click();assert.equal(toggle.textContent,'ランタン ON');assert.equal(toggle.getAttribute('aria-pressed'),'true');
 assert.equal(h.record.calls.filter(name=>name==='toggleLantern').length,2);assert.equal(JSON.stringify(h.state),h.before);
});

test('maze: only unresolved art adds a counted retry action without changing progress or growing the on-scene HUD',()=>{
 const healthy=harness('maze');healthy.run.menu();assert.equal(healthy.context.$('art-retry'),undefined);
 const failed=harness('maze',{failedArt:2});failed.run.menu();const retry=failed.context.$('art-retry');assert(retry);assert.equal(retry.textContent,'イラストを読み込み直す');assert.equal(retry.children[0].textContent,'未読込 2件');retry.click();assert.equal(failed.record.calls.at(-1),'retryRPGArt');assert.equal(JSON.stringify(failed.state),failed.before);
});
